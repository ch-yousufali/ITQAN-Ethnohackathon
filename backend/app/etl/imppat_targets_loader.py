from __future__ import annotations

import uuid
from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.etl.base import BaseLoader, DataManifest, LoaderResult
from app.etl.data_manifest import DataManifest as DataManifestModel
from app.models.compound import Compound
from app.models.enums import EvidenceTier
from app.models.external_id import ExternalIdentifier
from app.models.target import CompoundTarget, Target

SOURCE_NAME = "IMPPAT_3.0"
SOURCE_VERSION = "3.0"
BATCH_SIZE = 500


class ImppatTargetsLoader(BaseLoader):
    source_name = SOURCE_NAME
    source_version = SOURCE_VERSION

    async def load(self, session: AsyncSession, path: Path) -> LoaderResult:
        tsv = path / "Target_IMPPAT_Phytochemicals.tsv"
        if not tsv.exists():
            return self._fail(path, f"missing {tsv.name}")

        manifest = DataManifestModel(
            source_name=SOURCE_NAME, source_version=SOURCE_VERSION,
            file_path=str(tsv), loader_name=self.__class__.__name__, status="pending",
        )
        session.add(manifest)
        await session.commit()
        await session.refresh(manifest)
        mid = manifest.id

        try:
            compound_map = await self._compound_id_map(session)
            target_map = await self._existing_targets_by_symbol(session)
            entrez_map = await self._existing_entrez_map(session)

            df = pd.read_csv(tsv, sep="\t", dtype=str, keep_default_na=False)
            targets_created, edges_created, unresolved = await self._load(
                session, df, mid, compound_map, target_map, entrez_map
            )
            await session.commit()

            manifest = await session.get(DataManifestModel, mid)
            manifest.status = "success"
            manifest.row_count = targets_created + edges_created
            manifest.notes = {
                "source_rows": int(len(df)),
                "targets_created": targets_created,
                "edges_created": edges_created,
                "skipped_unresolved_compound": unresolved,
            }
            session.add(manifest)
            await session.commit()
            return LoaderResult(
                manifest=DataManifest(source_name=SOURCE_NAME, source_version=SOURCE_VERSION,
                    file_path=str(tsv), row_count=manifest.row_count, notes=manifest.notes),
                inserted=manifest.row_count,
            )
        except Exception as exc:
            await session.rollback()
            manifest = await session.get(DataManifestModel, mid)
            manifest.status = "failed"
            manifest.notes = {"error": f"{type(exc).__name__}: {exc}"}
            session.add(manifest)
            await session.commit()
            raise

    async def _compound_id_map(self, session) -> dict[str, uuid.UUID]:
        rows = await session.execute(
            select(ExternalIdentifier.external_id, ExternalIdentifier.entity_id)
            .where(ExternalIdentifier.source == SOURCE_NAME)
            .where(ExternalIdentifier.entity_type == "compound")
        )
        return {ext: eid for ext, eid in rows.all()}

    async def _existing_targets_by_symbol(self, session) -> dict[str, uuid.UUID]:
        rows = await session.execute(
            select(Target.gene_symbol, Target.id).where(Target.gene_symbol.isnot(None))
        )
        return {sym.upper(): tid for sym, tid in rows.all()}

    async def _existing_entrez_map(self, session) -> dict[str, uuid.UUID]:
        rows = await session.execute(
            select(ExternalIdentifier.external_id, ExternalIdentifier.entity_id)
            .where(ExternalIdentifier.source == "entrez_gene")
            .where(ExternalIdentifier.entity_type == "target")
        )
        return {ext: eid for ext, eid in rows.all()}

    async def _load(self, session, df, manifest_id, compound_map, target_map, entrez_map):
        new_target_batch: list[dict] = []
        new_entrez_batch: list[dict] = []
        edge_batch: list[dict] = []
        targets_created = 0
        edges_created = 0
        unresolved = 0
        seen_edges: set = set()

        for _, row in df.iterrows():
            comp_ext = (row.get("IMPPAT_Phytochemical_identifier") or "").strip()
            hgnc = (row.get("HGNC_Symbol") or "").strip()
            entrez = (row.get("Gene_identifier") or "").strip()
            if not hgnc:
                continue

            compound_uuid = compound_map.get(comp_ext)
            if not compound_uuid:
                unresolved += 1
                continue

            target_key = hgnc.upper()
            target_uuid = target_map.get(target_key)
            if target_uuid is None:
                target_uuid = uuid.uuid4()
                target_map[target_key] = target_uuid
                r = await session.execute(
                    pg_insert(Target).values({
                        "id": target_uuid,
                        "name": hgnc[:255],
                        "gene_symbol": hgnc[:64],
                    }).on_conflict_do_nothing()
                )
                if r.rowcount and r.rowcount > 0:
                    targets_created += r.rowcount
                if entrez and entrez not in entrez_map:
                    await session.execute(
                        pg_insert(ExternalIdentifier).values({
                            "entity_type": "target",
                            "entity_id": target_uuid,
                            "source": "entrez_gene",
                            "external_id": entrez,
                        }).on_conflict_do_nothing(constraint="uq_extid_type_source_id")
                    )
                    entrez_map[entrez] = target_uuid

            edge_key = (str(compound_uuid), str(target_uuid))
            if edge_key in seen_edges:
                continue
            seen_edges.add(edge_key)

            edge_batch.append({
                "id": uuid.uuid4(),
                "compound_id": compound_uuid,
                "target_id": target_uuid,
                "source": "IMPPAT_Targets",
                "confidence": 1.0,
                "evidence_tier": EvidenceTier.MEASURED,
            })
            if len(edge_batch) >= BATCH_SIZE:
                for row in edge_batch:
                    r = await session.execute(
                        pg_insert(CompoundTarget).values(row).on_conflict_do_nothing()
                    )
                    if r.rowcount and r.rowcount > 0:
                        edges_created += r.rowcount
                edge_batch = []

        if new_target_batch:
            r = await session.execute(
                pg_insert(Target).values(new_target_batch).on_conflict_do_nothing()
            )
            if r.rowcount and r.rowcount > 0:
                targets_created += r.rowcount
        if new_entrez_batch:
            await session.execute(
                pg_insert(ExternalIdentifier).values(new_entrez_batch)
                .on_conflict_do_nothing(constraint="uq_extid_type_source_id")
            )
        if edge_batch:
            for row in edge_batch:
                r = await session.execute(
                    pg_insert(CompoundTarget).values(row).on_conflict_do_nothing()
                )
                if r.rowcount and r.rowcount > 0:
                    edges_created += r.rowcount
        return targets_created, edges_created, unresolved
