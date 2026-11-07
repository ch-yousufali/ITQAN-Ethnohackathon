from __future__ import annotations

import uuid
from pathlib import Path

import pandas as pd
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.etl.base import BaseLoader, DataManifest, LoaderResult
from app.etl.data_manifest import DataManifest as DataManifestModel
from app.models.compound import PlantCompound
from app.models.enums import EvidenceTier
from app.models.external_id import ExternalIdentifier

SOURCE_NAME = "IMPPAT_3.0"
SOURCE_VERSION = "3.0"
BATCH_SIZE = 500


class ImppatAssociationsLoader(BaseLoader):
    source_name = SOURCE_NAME
    source_version = SOURCE_VERSION

    async def load(self, session: AsyncSession, path: Path) -> LoaderResult:
        tsv = path / "IMPPAT_Phytochemical_Plant_Association.tsv"
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
            plant_map, compound_map = await self._load_id_maps(session)
            existing = await self._load_existing_triples(session)

            df = pd.read_csv(tsv, sep="\t", dtype=str, keep_default_na=False)
            inserted, skipped_unresolved, skipped_existing = await self._insert_edges(
                session, df, mid, plant_map, compound_map, existing
            )
            await self._recompute_source_counts(session)
            await session.commit()

            manifest = await session.get(DataManifestModel, mid)
            manifest.status = "success"
            manifest.row_count = inserted
            manifest.notes = {
                "source_rows": int(len(df)),
                "inserted": inserted,
                "skipped_unresolved": skipped_unresolved,
                "skipped_already_exists": skipped_existing,
            }
            session.add(manifest)
            await session.commit()
            return LoaderResult(
                manifest=DataManifest(source_name=SOURCE_NAME, source_version=SOURCE_VERSION,
                    file_path=str(tsv), row_count=inserted, notes=manifest.notes),
                inserted=inserted,
            )
        except Exception as exc:
            await session.rollback()
            manifest = await session.get(DataManifestModel, mid)
            manifest.status = "failed"
            manifest.notes = {"error": f"{type(exc).__name__}: {exc}"}
            session.add(manifest)
            await session.commit()
            raise

    async def _load_id_maps(self, session):
        rows = await session.execute(
            select(ExternalIdentifier.external_id, ExternalIdentifier.entity_id, ExternalIdentifier.entity_type)
            .where(ExternalIdentifier.source == SOURCE_NAME)
            .where(ExternalIdentifier.entity_type.in_(["plant", "compound"]))
        )
        plants, compounds = {}, {}
        for ext_id, entity_id, etype in rows.all():
            if etype == "plant":
                plants[ext_id] = entity_id
            else:
                compounds[ext_id] = entity_id
        return plants, compounds

    async def _load_existing_triples(self, session) -> set:
        rows = await session.execute(
            select(PlantCompound.plant_id, PlantCompound.compound_id, PlantCompound.plant_part)
            .where(PlantCompound.source == SOURCE_NAME)
        )
        return {(str(p), str(c), part or "") for p, c, part in rows.all()}

    async def _insert_edges(self, session, df, manifest_id, plant_map, compound_map, existing) -> tuple:
        batch: list[dict] = []
        inserted = 0
        skipped_unresolved = 0
        skipped_existing = 0

        for _, row in df.iterrows():
            plant_ext = (row.get("Plant_identifier") or "").strip()
            compound_ext = (row.get("IMPPAT_Phytochemical_identifier") or "").strip()
            part_raw = (row.get("Plant_part") or "").strip()
            part = part_raw[:128] if part_raw else None

            plant_uuid = plant_map.get(plant_ext)
            compound_uuid = compound_map.get(compound_ext)
            if not plant_uuid or not compound_uuid:
                skipped_unresolved += 1
                continue

            key = (str(plant_uuid), str(compound_uuid), part or "")
            if key in existing:
                skipped_existing += 1
                continue
            existing.add(key)

            batch.append({
                "id": uuid.uuid4(),
                "plant_id": plant_uuid,
                "compound_id": compound_uuid,
                "source": SOURCE_NAME,
                "plant_part": part,
                "source_count": 1,
                "confidence": 1.0,
                "evidence_tier": EvidenceTier.MEASURED,
                "manifest_id": manifest_id,
            })

            if len(batch) >= BATCH_SIZE:
                result = await session.execute(
                    pg_insert(PlantCompound).values(batch).on_conflict_do_nothing()
                )
                if result.rowcount and result.rowcount > 0:
                    inserted += result.rowcount
                batch = []

        if batch:
            result = await session.execute(
                pg_insert(PlantCompound).values(batch).on_conflict_do_nothing()
            )
            if result.rowcount and result.rowcount > 0:
                inserted += result.rowcount

        return inserted, skipped_unresolved, skipped_existing

    async def _recompute_source_counts(self, session):
        await session.execute(text("""
            UPDATE plant_compounds pc
            SET source_count = sub.c
            FROM (
                SELECT plant_id, compound_id,
                       COALESCE(plant_part, '') AS part_key,
                       COUNT(DISTINCT source) AS c
                FROM plant_compounds
                GROUP BY plant_id, compound_id, COALESCE(plant_part, '')
            ) sub
            WHERE pc.plant_id = sub.plant_id
              AND pc.compound_id = sub.compound_id
              AND COALESCE(pc.plant_part, '') = sub.part_key
        """))
