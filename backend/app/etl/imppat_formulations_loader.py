from __future__ import annotations

import uuid
from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.etl.base import BaseLoader, DataManifest, LoaderResult
from app.etl.data_manifest import DataManifest as DataManifestModel
from app.models.enums import ResolutionStatus, Tradition
from app.models.formulation import Formulation, FormulationIngredient
from app.models.plant import Plant

SOURCE_NAME = "IMPPAT_3.0"
SOURCE_VERSION = "3.0"
SOURCE_URL = "https://cb.imsc.res.in/imppat/download"
BATCH_SIZE = 500


class ImppatFormulationsLoader(BaseLoader):
    source_name = SOURCE_NAME
    source_version = SOURCE_VERSION

    async def load(self, session: AsyncSession, path: Path) -> LoaderResult:
        tsv = path / "IMPPAT_PolyHerbalFormulations.tsv"
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
            form_n, ing_n = await self._load(session, df)
            await session.commit()
            manifest = await session.get(DataManifestModel, mid)
            manifest.status = "success"
            manifest.row_count = form_n + ing_n
            manifest.notes = {"formulations_inserted": form_n, "ingredients_inserted": ing_n, "source_rows": int(len(df))}
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

    async def _load(self, session, df) -> tuple[int, int]:
        existing = await session.execute(select(Formulation.imppat_formulation_id))
        existing_fids = {r[0] for r in existing.all() if r[0]}
        plants_result = await session.execute(select(Plant.canonical_name, Plant.id))
        name_to_id = {r[0]: r[1] for r in plants_result.all()}
        by_fid: dict[str, dict] = {}
        for _, row in df.iterrows():
            fid = (row.get("Formulation_identifier") or "").strip()
            if not fid:
                continue
            if fid not in by_fid:
                by_fid[fid] = {
                    "name": (row.get("Formulation name_in_AFI_original") or "").strip() or f"Formulation {fid}",
                    "ingredients": [],
                }
            ing_raw = (row.get("Ingredient name in AFI_original") or "").strip()
            if ing_raw:
                by_fid[fid]["ingredients"].append({
                    "raw_name": ing_raw,
                    "std_plant": (row.get("Plant_name_standardised") or "").strip() or None,
                    "part": (row.get("Plant_part_standardised") or "").strip() or None,
                })
        form_rows = []
        for fid, data in by_fid.items():
            if fid in existing_fids:
                continue
            form_rows.append({
                "id": uuid.uuid4(),
                "name": data["name"][:255],
                "imppat_formulation_id": fid,
                "name_in_afi": data["name"][:255],
                "tradition": Tradition.AYURVEDA,
                "era": "AFI-classical",
                "source_text": "The Ayurvedic Formulary of India",
            })
        new_fids: set[str] = set()
        form_n = 0
        for i in range(0, len(form_rows), BATCH_SIZE):
            batch = form_rows[i:i+BATCH_SIZE]
            result = await session.execute(
                pg_insert(Formulation).values(batch).on_conflict_do_nothing(
                    index_elements=["imppat_formulation_id"]
                ).returning(Formulation.id, Formulation.imppat_formulation_id)
            )
            for row in result.all():
                new_fids.add(row.imppat_formulation_id)
            form_n += len(batch)
        if new_fids:
            fid_result = await session.execute(
                select(Formulation.imppat_formulation_id, Formulation.id).where(
                    Formulation.imppat_formulation_id.in_(list(new_fids))
                )
            )
            fid_to_id = {r[0]: r[1] for r in fid_result.all()}
        else:
            fid_to_id = {}
        ing_rows = []
        for fid in new_fids:
            form_uuid = fid_to_id.get(fid)
            if not form_uuid:
                continue
            data = by_fid[fid]
            for idx, ing in enumerate(data["ingredients"]):
                std = ing["std_plant"]
                plant_uuid = name_to_id.get(std) if std else None
                ing_rows.append({
                    "id": uuid.uuid4(),
                    "formulation_id": form_uuid,
                    "raw_name": ing["raw_name"][:255],
                    "standardized_plant_name": (std[:255] if std else None),
                    "plant_id": plant_uuid,
                    "part_used": (ing["part"][:128] if ing["part"] else None),
                    "resolution_status": ResolutionStatus.RESOLVED if plant_uuid else ResolutionStatus.UNRESOLVED,
                    "resolution_confidence": 1.0 if plant_uuid else None,
                    "resolution_provenance": {"stage": "imppat_curated", "source": SOURCE_NAME} if plant_uuid else None,
                    "order_index": idx,
                })
        ing_n = 0
        for i in range(0, len(ing_rows), BATCH_SIZE):
            batch = ing_rows[i:i+BATCH_SIZE]
            result = await session.execute(
                pg_insert(FormulationIngredient).values(batch).returning(FormulationIngredient.id)
            )
            ing_n += len(result.all())
        return form_n, ing_n
