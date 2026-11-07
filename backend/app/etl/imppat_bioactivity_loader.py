from __future__ import annotations

import re
import uuid
from pathlib import Path

import pandas as pd
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.etl.base import BaseLoader, DataManifest, LoaderResult
from app.etl.data_manifest import DataManifest as DataManifestModel
from app.models.enums import EvidenceTier
from app.models.external_id import ExternalIdentifier
from app.models.target import CompoundTarget, Target

SOURCE_NAME = "IMPPAT_3.0"
SOURCE_VERSION = "3.0"

_UNIT_MULT = {"nm": 1.0, "um": 1000.0, "mm": 1000000.0, "m": 1000000000.0}
_ACT_RE = re.compile(r"^([0-9.]+(?:[eE][+-]?[0-9]+)?)\s*([a-zA-Z0-9./\-]*)")
_UNIPROT_SPLIT = re.compile(r"[|/]")
_UNIPROT_LIST_RE = re.compile(r"^[A-Z0-9]{6,10}([/|][A-Z0-9]{6,10})+$")


def _parse_activity(raw):
    if not raw or not str(raw).strip():
        return None, None
    first = str(raw).split("|")[0].strip()
    if not first:
        return None, None
    op = ""
    if first.startswith(">"):
        op, first = "gt", first[1:].strip()
    elif first.startswith("<"):
        op, first = "lt", first[1:].strip()
    elif first.startswith("="):
        first = first[1:].strip()
    m = _ACT_RE.match(first)
    if not m:
        return None, None
    try:
        val = float(m.group(1))
    except ValueError:
        return None, None
    unit = m.group(2).strip().lower()
    if unit not in _UNIT_MULT:
        return None, None
    return val * _UNIT_MULT[unit], "nM" + ("_" + op if op else "")


def _pick_activity(row):
    for t in ("Ki", "IC50", "EC50", "Kd"):
        v, u = _parse_activity(row.get(t, ""))
        if v is not None:
            return t, v, u
    return None, None, None


def _safe_uniprot(raw):
    """First UniProt ID from pipe/slash list, capped at 32 chars."""
    if not raw:
        return None
    for part in _UNIPROT_SPLIT.split(str(raw)):
        part = part.strip()
        if part:
            return part[:32]
    return None


def _safe_name(raw, fallback="unnamed target"):
    """Clean name. If it's just a UniProt ID list, use fallback."""
    if not raw:
        return fallback
    val = str(raw).strip()
    if not val:
        return fallback
    if _UNIPROT_LIST_RE.match(val):
        return fallback
    return val[:255]


class ImppatBioactivityLoader(BaseLoader):
    source_name = SOURCE_NAME
    source_version = SOURCE_VERSION

    async def load(self, session: AsyncSession, path: Path) -> LoaderResult:
        tsv = path / "Bioactivity_IMPPAT_Phytochemicals.tsv"
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
            compound_map = await self._compound_map(session)
            by_name, by_uniprot = await self._target_maps(session)

            existing_rows = await session.execute(
                select(CompoundTarget.compound_id, CompoundTarget.target_id, CompoundTarget.id)
                .where(CompoundTarget.source == "IMPPAT_Targets")
            )
            existing = {(str(c), str(t)): eid for c, t, eid in existing_rows.all()}
            seen_new: set = set()

            stats = {"source_rows": int(len(df)), "edges_inserted": 0, "edges_updated": 0,
                     "skipped_unresolved_compound": 0, "skipped_non_human": 0,
                     "skipped_no_activity": 0, "new_targets_created": 0}

            for _, row in df.iterrows():
                compound_ext = (row.get("IMPPAT_Phytochemical_identifier") or "").strip()
                organism = (row.get("Target_organism") or "").strip()

                if organism and "sapiens" not in organism.lower():
                    stats["skipped_non_human"] += 1
                    continue

                activity_type, activity_value, activity_unit = _pick_activity(row)
                if not activity_type:
                    stats["skipped_no_activity"] += 1
                    continue

                compound_uuid = compound_map.get(compound_ext)
                if not compound_uuid:
                    stats["skipped_unresolved_compound"] += 1
                    continue

                safe_uniprot = _safe_uniprot((row.get("UniProt_identifier") or "").strip())
                safe_name = _safe_name((row.get("Target_name") or "").strip())

                target_uuid = None
                if safe_uniprot and safe_uniprot in by_uniprot:
                    target_uuid = by_uniprot[safe_uniprot]
                elif safe_name.lower() in by_name:
                    target_uuid = by_name[safe_name.lower()]

                if target_uuid is None:
                    target_uuid = uuid.uuid4()
                    r = await session.execute(
                        pg_insert(Target).values({
                            "id": target_uuid, "name": safe_name, "uniprot_id": safe_uniprot,
                        }).on_conflict_do_nothing()
                    )
                    by_name[safe_name.lower()] = target_uuid
                    if safe_uniprot:
                        by_uniprot[safe_uniprot] = target_uuid
                    if r.rowcount and r.rowcount > 0:
                        stats["new_targets_created"] += 1

                key = (str(compound_uuid), str(target_uuid))
                if key in seen_new:
                    continue

                if key in existing:
                    await session.execute(
                        CompoundTarget.__table__.update()
                        .where(CompoundTarget.id == existing[key])
                        .values(activity_type=activity_type, activity_value=activity_value,
                                activity_unit=activity_unit)
                    )
                    stats["edges_updated"] += 1
                else:
                    await session.execute(
                        pg_insert(CompoundTarget).values({
                            "id": uuid.uuid4(), "compound_id": compound_uuid,
                            "target_id": target_uuid, "activity_type": activity_type,
                            "activity_value": activity_value, "activity_unit": activity_unit,
                            "source": "IMPPAT_Bioactivity", "source_count": 1,
                            "confidence": 1.0, "evidence_tier": EvidenceTier.MEASURED,
                            "manifest_id": mid,
                        })
                    )
                    seen_new.add(key)
                    stats["edges_inserted"] += 1

            await session.execute(
                text("UPDATE compound_targets SET manifest_id = :mid WHERE manifest_id IS NULL"),
                {"mid": mid}
            )
            await session.execute(text("""
                UPDATE compound_targets ct SET source_count = sub.c
                FROM (SELECT compound_id, target_id, COUNT(DISTINCT source) AS c
                      FROM compound_targets GROUP BY compound_id, target_id) sub
                WHERE ct.compound_id = sub.compound_id AND ct.target_id = sub.target_id
            """))
            await session.commit()

            manifest = await session.get(DataManifestModel, mid)
            manifest.status = "success"
            manifest.row_count = stats["edges_inserted"] + stats["edges_updated"]
            manifest.notes = stats
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

    async def _compound_map(self, session):
        rows = await session.execute(
            select(ExternalIdentifier.external_id, ExternalIdentifier.entity_id)
            .where(ExternalIdentifier.source == SOURCE_NAME)
            .where(ExternalIdentifier.entity_type == "compound")
        )
        return {ext: eid for ext, eid in rows.all()}

    async def _target_maps(self, session):
        rows = await session.execute(select(Target.name, Target.uniprot_id, Target.id))
        by_name, by_uniprot = {}, {}
        for name, uniprot, tid in rows.all():
            if name:
                by_name[name.lower()] = tid
            if uniprot:
                by_uniprot[uniprot] = tid
        return by_name, by_uniprot
