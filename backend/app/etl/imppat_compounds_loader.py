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

SOURCE_NAME = "IMPPAT_3.0"
SOURCE_VERSION = "3.0"
BATCH_SIZE = 500


class ImppatCompoundsLoader(BaseLoader):
    source_name = SOURCE_NAME
    source_version = SOURCE_VERSION

    async def load(self, session: AsyncSession, path: Path) -> LoaderResult:
        tsv = path / "Chemical_Information_IMPPAT_Phytochemicals.tsv"
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
            df = pd.read_csv(tsv, sep="\t", dtype=str, keep_default_na=False)
            rows = []
            seen_keys: set[str] = set()
            for _, r in df.iterrows():
                imppat_id = (r.get("IMPPAT_Phytochemical_identifier") or "").strip() or None
                inchikey = (r.get("InChIKey") or "").strip() or None
                pubchem_raw = (r.get("Pubchem_CID") or "").strip()
                pubchem_cid = None
                if pubchem_raw.startswith("CID_"):
                    try:
                        pubchem_cid = int(pubchem_raw.replace("CID_", ""))
                    except ValueError:
                        pubchem_cid = None

                dedup_key = inchikey or imppat_id
                if not dedup_key or dedup_key in seen_keys:
                    continue
                seen_keys.add(dedup_key)

                rows.append({
                    "id": uuid.uuid4(),
                    "name": (r.get("Phytochemical name_standardised") or "").strip()[:255] or "unknown",
                    "imppat_compound_id": imppat_id,
                    "inchikey": inchikey,
                    "pubchem_cid": pubchem_cid,
                    "chebi_id": (r.get("ChEBI") or "").strip() or None,
                    "smiles": (r.get("Canonical_SMILES") or "").strip() or None,
                })

            inserted = 0
            for i in range(0, len(rows), BATCH_SIZE):
                batch = rows[i:i+BATCH_SIZE]
                stmt = pg_insert(Compound).values(batch).on_conflict_do_nothing(
                    index_elements=["inchikey"]
                )
                result = await session.execute(stmt)
                inserted += result.rowcount if result.rowcount and result.rowcount > 0 else 0

            await session.commit()
            manifest = await session.get(DataManifestModel, mid)
            manifest.status = "success"
            manifest.row_count = inserted
            manifest.notes = {
                "compounds_inserted": inserted,
                "source_rows": int(len(df)),
                "unique_after_dedup": len(rows),
            }
            session.add(manifest)
            await session.commit()
            return LoaderResult(
                manifest=DataManifest(
                    source_name=SOURCE_NAME, source_version=SOURCE_VERSION,
                    file_path=str(tsv), row_count=inserted, notes=manifest.notes,
                ),
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
