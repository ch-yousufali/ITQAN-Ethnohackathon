from __future__ import annotations

import uuid
from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.etl.base import BaseLoader, DataManifest, LoaderResult
from app.etl.data_manifest import DataManifest as DataManifestModel
from app.models.plant import Plant, PlantAlias
from app.utils.text_norm import normalize_name

SOURCE_NAME = "IMPPAT_3.0"
SOURCE_VERSION = "3.0"
SOURCE_URL = "https://cb.imsc.res.in/imppat/download"
BATCH_SIZE = 500


class ImppatPlantsLoader(BaseLoader):
    source_name = SOURCE_NAME
    source_version = SOURCE_VERSION

    async def load(self, session: AsyncSession, path: Path) -> LoaderResult:
        tsv = path / "Plant_Information_IMPPAT.tsv"
        if not tsv.exists():
            return self._fail(path, f"missing {tsv.name}")

        manifest = DataManifestModel(
            source_name=SOURCE_NAME, source_version=SOURCE_VERSION,
            source_url=SOURCE_URL, file_path=str(tsv),
            loader_name=self.__class__.__name__, status="pending",
        )
        session.add(manifest)
        await session.commit()
        await session.refresh(manifest)
        mid = manifest.id

        try:
            df = pd.read_csv(tsv, sep="\t", dtype=str, keep_default_na=False)
            plants_n = await self._upsert_plants(session, df)
            aliases_n = await self._upsert_aliases(session, df, mid)
            await session.commit()

            manifest = await session.get(DataManifestModel, mid)
            manifest.status = "success"
            manifest.row_count = plants_n + aliases_n
            manifest.notes = {"plants_inserted": plants_n, "aliases_inserted": aliases_n, "source_rows": int(len(df))}
            session.add(manifest)
            await session.commit()
            return LoaderResult(
                manifest=DataManifest(source_name=SOURCE_NAME, source_version=SOURCE_VERSION,
                    source_url=SOURCE_URL, file_path=str(tsv),
                    row_count=manifest.row_count, notes=manifest.notes),
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

    async def _upsert_plants(self, session, df) -> int:
        existing = await session.execute(select(Plant.canonical_name))
        existing_names = {r[0] for r in existing.all()}
        rows = []
        for _, row in df.iterrows():
            name = (row.get("Indian_Medicinal_plant") or "").strip()
            if not name or name in existing_names:
                continue
            existing_names.add(name)
            parts = name.split()
            rows.append({
                "id": uuid.uuid4(), "canonical_name": name,
                "imppat_id": (row.get("Plant_identifier") or "").strip() or None,
                "family": (row.get("Family") or "").strip() or None,
                "genus": parts[0] if parts else None,
                "species": parts[1] if len(parts) > 1 else None,
                "plant_group": (row.get("Group") or "").strip() or None,
                "system_of_medicine": (row.get("System_of_Medicine") or "").strip() or None,
                "iucn_status": (row.get("IUCN_Red_List_Category") or "").strip() or None,
                "taxonomy_source": SOURCE_NAME,
            })
        if not rows:
            return 0
        inserted = 0
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i+BATCH_SIZE]
            result = await session.execute(
                pg_insert(Plant).values(batch).on_conflict_do_nothing(
                    index_elements=["canonical_name"]
                ).returning(Plant.id)
            )
            inserted += len(result.all())
        return inserted

    async def _upsert_aliases(self, session, df, manifest_id) -> int:
        result = await session.execute(select(Plant.canonical_name, Plant.id))
        name_to_id = {r[0]: r[1] for r in result.all()}
        rows: list[dict] = []
        seen: set[tuple] = set()
        for _, row in df.iterrows():
            name = (row.get("Indian_Medicinal_plant") or "").strip()
            plant_id = name_to_id.get(name)
            if not plant_id:
                continue
            for syn in (row.get("Synonymous names") or "").split("|"):
                syn = syn.strip()
                if not syn:
                    continue
                norm = normalize_name(syn)
                if not norm:
                    continue
                key = (str(plant_id), norm)
                if key in seen:
                    continue
                seen.add(key)
                rows.append({"id": uuid.uuid4(), "plant_id": plant_id, "alias": syn,
                    "normalized_alias": norm, "language": "la", "source": SOURCE_NAME,
                    "confidence": 1.0, "manifest_id": manifest_id})
            common = (row.get("Common_name") or "").strip()
            if common:
                norm = normalize_name(common)
                if norm:
                    key = (str(plant_id), norm)
                    if key not in seen:
                        seen.add(key)
                        rows.append({"id": uuid.uuid4(), "plant_id": plant_id, "alias": common,
                            "normalized_alias": norm, "language": "en", "source": SOURCE_NAME,
                            "confidence": 1.0, "manifest_id": manifest_id})
        inserted = 0
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i+BATCH_SIZE]
            r = await session.execute(
                pg_insert(PlantAlias).values(batch).on_conflict_do_nothing(
                    constraint="uq_plant_alias_norm_source"
                ).returning(PlantAlias.id)
            )
            inserted += len(r.all())
        return inserted
