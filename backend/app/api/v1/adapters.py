"""
Contract adapters: transform internal ORM objects into the JSON shapes
the frontend's Zod schemas expect. This is the single source of truth
for the API contract.
"""
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.formulation import Formulation
from app.models.plant import Plant

_RESOLUTION_MAP = {
    "unresolved": "unmapped",
    "needs_review": "uncertain",
    "resolved": "confirmed",
}


def _v(x) -> str:
    return x.value if hasattr(x, "value") else str(x)


async def formulation_to_frontend(
    session: AsyncSession, formulation: Formulation
) -> dict[str, Any]:
    return (await formulations_to_frontend(session, [formulation]))[0]


async def formulations_to_frontend(
    session: AsyncSession, formulations: list[Formulation]
) -> list[dict[str, Any]]:
    """Bulk version: two queries total instead of one per formulation."""
    from app.models.manuscript import Manuscript

    plant_ids = {i.plant_id for f in formulations for i in f.ingredients if i.plant_id}
    plant_map: dict[uuid.UUID, str] = {}
    if plant_ids:
        rows = await session.execute(
            select(Plant.id, Plant.canonical_name).where(Plant.id.in_(plant_ids))
        )
        plant_map = {row.id: row.canonical_name for row in rows}

    manuscript_map: dict[uuid.UUID, uuid.UUID] = {}
    f_ids = [f.id for f in formulations]
    if f_ids:
        rows = await session.execute(
            select(Manuscript.formulation_id, Manuscript.id)
            .where(Manuscript.formulation_id.in_(f_ids))
        )
        manuscript_map = {fid: mid for fid, mid in rows.all()}

    return [_formulation_dict(f, plant_map, manuscript_map) for f in formulations]


def _formulation_dict(
    formulation: Formulation,
    plant_map: dict[uuid.UUID, str],
    manuscript_map: dict[uuid.UUID, uuid.UUID],
) -> dict[str, Any]:
    ingredients = []
    for ing in formulation.ingredients:
        botanical_name = (
            plant_map.get(ing.plant_id) if ing.plant_id else ing.standardized_plant_name
        )
        ingredients.append({
            "id": str(ing.id),
            "traditional_name": ing.raw_name,
            "plant_id": str(ing.plant_id) if ing.plant_id else None,
            "botanical_name": botanical_name,
            "part_used": ing.part_used,
            "quantity": ing.quantity,
            "status": _RESOLUTION_MAP.get(_v(ing.resolution_status), "unmapped"),
        })

    return {
        "id": str(formulation.id),
        "name": formulation.name,
        "tradition": _v(formulation.tradition),
        "period": formulation.era or "",
        "description": formulation.notes,
        "source_note": formulation.source_text,
        "manuscript_id": (
            str(manuscript_map[formulation.id]) if formulation.id in manuscript_map else None
        ),
        "ingredients": ingredients,
        "updated_at": (
            formulation.updated_at.isoformat()
            if formulation.updated_at
            else formulation.created_at.isoformat()
        ),
    }


async def plant_to_frontend(session, plant) -> dict[str, Any]:
    return (await plants_to_frontend(session, [plant]))[0]


async def plants_to_frontend(session, plants: list) -> list[dict[str, Any]]:
    """Bulk version: a fixed number of queries regardless of how many plants.

    plant_compounds holds one row per (plant, compound, part), so compounds are
    de-duplicated here; otherwise a compound found in three parts is listed three times.
    """
    from collections import defaultdict

    from sqlalchemy import func, true
    from app.models.compound import Compound, PlantCompound
    from app.models.plant import PlantAlias
    from app.models.target import CompoundTarget

    if not plants:
        return []
    ids = [p.id for p in plants]
    # Very large IN lists are slower than scanning; for a full listing, skip the filter.
    filt = (lambda col: col.in_(ids)) if len(ids) <= 1000 else (lambda col: true())

    common: dict = defaultdict(list)
    traditional: dict = defaultdict(list)
    for pid, alias, lang in (await session.execute(
        select(PlantAlias.plant_id, PlantAlias.alias, PlantAlias.language)
        .where(filt(PlantAlias.plant_id))
    )).all():
        if lang in ("en", None):
            common[pid].append(alias)
        elif lang == "sa":
            traditional[pid].append(alias)

    parts: dict = defaultdict(list)
    for pid, part in (await session.execute(
        select(PlantCompound.plant_id, PlantCompound.plant_part)
        .where(filt(PlantCompound.plant_id), PlantCompound.plant_part.isnot(None))
        .distinct()
        .order_by(PlantCompound.plant_id, PlantCompound.plant_part)
    )).all():
        parts[pid].append(part)

    target_counts = (
        select(CompoundTarget.compound_id, func.count(func.distinct(CompoundTarget.target_id)).label("n"))
        .group_by(CompoundTarget.compound_id)
        .subquery()
    )
    compounds: dict = defaultdict(list)
    for pid, cid, cname, formula, n in (await session.execute(
        select(PlantCompound.plant_id, Compound.id, Compound.name,
               Compound.molecular_formula, func.coalesce(target_counts.c.n, 0))
        .join(Compound, Compound.id == PlantCompound.compound_id)
        .outerjoin(target_counts, target_counts.c.compound_id == Compound.id)
        .where(filt(PlantCompound.plant_id))
        .distinct()
        .order_by(PlantCompound.plant_id, Compound.name, Compound.id)
    )).all():
        compounds[pid].append({
            "id": str(cid), "name": cname, "formula": formula, "target_count": int(n),
        })

    return [
        {
            "id": str(plant.id),
            "botanical_name": plant.canonical_name,
            "family": plant.family,
            "common_names": common.get(plant.id, []),
            "traditional_names": traditional.get(plant.id, []),
            "parts_used": parts.get(plant.id, []),
            "description": None,
            "references": [{
                "id": f"imppat:{plant.imppat_id or plant.id}",
                "database": "IMPPAT_3.0",
                "accession": plant.imppat_id or str(plant.id)[:8],
                "title": None,
                "year": None,
                "url": "https://cb.imsc.res.in/imppat/",
            }],
            "compounds": compounds.get(plant.id, []),
        }
        for plant in plants
    ]


async def compound_to_frontend(session, compound) -> dict[str, Any]:
    from app.models.compound import PlantCompound
    from app.models.target import CompoundTarget, Target

    plant_ids = (await session.execute(
        select(PlantCompound.plant_id).where(PlantCompound.compound_id == compound.id).distinct()
    )).scalars().all()

    target_rows = (await session.execute(
        select(CompoundTarget, Target)
        .join(Target, Target.id == CompoundTarget.target_id)
        .where(CompoundTarget.compound_id == compound.id)
    )).all()

    targets_list = []
    for ct, t in target_rows:
        category = ct.evidence_tier.name if hasattr(ct.evidence_tier, "name") else str(ct.evidence_tier).upper()
        targets_list.append({
            "id": str(t.id),
            "symbol": t.gene_symbol or t.name,
            "name": t.name,
            "action": ct.activity_type,
            "category": category,
            "sources": [{
                "id": str(ct.id),
                "database": ct.source or "IMPPAT_3.0",
                "accession": str(ct.id)[:8],
                "title": None,
                "year": None,
                "url": None,
            }],
        })

    return {
        "id": str(compound.id),
        "name": compound.name,
        "formula": compound.molecular_formula,
        "molecular_weight": compound.molecular_weight,
        "smiles": compound.smiles,
        "plant_ids": [str(pid) for pid in plant_ids],
        "references": [{
            "id": str(compound.id),
            "database": "IMPPAT_3.0",
            "accession": compound.inchikey or str(compound.id)[:8],
            "title": None,
            "year": None,
            "url": f"https://pubchem.ncbi.nlm.nih.gov/compound/{compound.pubchem_cid}" if compound.pubchem_cid else None,
        }],
        "targets": targets_list,
    }


_ANALYSIS_STATUS_MAP = {
    "PENDING": "queued",
    "RUNNING": "running",
    "COMPLETED": "completed",
    "FAILED": "failed",
}


async def analysis_to_frontend(session, run) -> dict[str, Any]:
    from sqlalchemy import func
    from app.models.analysis import Finding
    from app.models.formulation import FormulationIngredient

    formulation = await session.get(Formulation, run.formulation_id)
    formulation_name = formulation.name if formulation else "Unknown formulation"

    total = (await session.execute(
        select(func.count(FormulationIngredient.id))
        .where(FormulationIngredient.formulation_id == run.formulation_id)
    )).scalar() or 0

    mapped = (await session.execute(
        select(func.count(FormulationIngredient.id))
        .where(FormulationIngredient.formulation_id == run.formulation_id)
        .where(FormulationIngredient.plant_id.isnot(None))
    )).scalar() or 0

    findings_count = (await session.execute(
        select(func.count(Finding.id)).where(Finding.run_id == run.id)
    )).scalar() or 0

    params = run.params or {}
    status = _ANALYSIS_STATUS_MAP.get(_v(run.status).upper(), "queued")
    coverage = None
    # Coverage only exists once the engine has run; reporting it for queued runs
    # showed a misleading "Only 0% of ingredients had molecular target data".
    if status == "completed":
        ratio = min(max(float(params.get("coverage", 0.0)), 0.0), 1.0)
        warnings: list[str] = list(params.get("warnings") or [])
        resolved = int(params.get("resolved_plants", mapped))
        if resolved == 0:
            warnings.append("No ingredients could be resolved to a botanical species.")
        elif ratio < 0.5:
            warnings.append(f"Only {round(ratio * 100)}% of matched plants had molecular target data.")
        if total > mapped:
            warnings.append(f"{total - mapped} of {total} ingredients are not matched to a plant.")
        coverage = {
            "ingredients_total": total,
            "ingredients_mapped": mapped,
            "plants_with_compounds": int(params.get("plants_with_targets", 0)),
            "compounds_total": int(params.get("compounds_total", 0)),
            "compounds_with_targets": int(params.get("compounds_with_targets", 0)),
            "ratio": ratio,
            "warnings": warnings,
        }

    return {
        "id": str(run.id),
        "formulation_id": str(run.formulation_id),
        "formulation_name": formulation_name,
        "status": status,
        "error": run.error,
        "started_at": run.created_at.isoformat(),
        "completed_at": run.finished_at.isoformat() if run.finished_at else None,
        "coverage": coverage,
        "findings_count": findings_count,
    }


async def finding_to_frontend(session, finding, rank: int = 1) -> dict[str, Any]:
    from app.models.compound import Compound
    from app.models.target import Target

    prov = finding.provenance or {}
    needed = [c for c in (finding.compound_a_id, finding.compound_b_id) if c]
    compound_rows = (await session.execute(
        select(Compound).where(Compound.id.in_(needed))
    )).scalars().all()
    cmap = {c.id: c for c in compound_rows}

    pa_id = uuid.UUID(prov["plant_a_id"]) if prov.get("plant_a_id") else None
    pb_id = uuid.UUID(prov["plant_b_id"]) if prov.get("plant_b_id") else None
    plant_ids = [p for p in (pa_id, pb_id) if p]
    pmap: dict = {}
    if plant_ids:
        prows = (await session.execute(
            select(Plant).where(Plant.id.in_(plant_ids))
        )).scalars().all()
        pmap = {p.id: p for p in prows}

    target = await session.get(Target, finding.target_id) if finding.target_id else None
    ca = cmap.get(finding.compound_a_id)
    cb = cmap.get(finding.compound_b_id)
    pa = pmap.get(pa_id) if pa_id else None
    pb = pmap.get(pb_id) if pb_id else None

    aa = prov.get("activity_a_nM")
    ab = prov.get("activity_b_nM")
    if aa and aa < 1000 and ab and ab < 1000:
        conf = 0.9
    elif (aa and aa < 1000) or (ab and ab < 1000):
        conf = 0.6
    elif aa or ab:
        conf = 0.4
    else:
        conf = None

    src = {"id": str(finding.id), "database": "IMPPAT_3.0",
           "accession": str(finding.id)[:8], "title": None, "year": None,
           "url": "https://cb.imsc.res.in/imppat/"}

    cat = finding.evidence_tier.name if hasattr(finding.evidence_tier, "name") else str(finding.evidence_tier).upper()

    missing = []
    if not aa:
        missing.append("No measured activity for compound A")
    if not ab:
        missing.append("No measured activity for compound B")

    return {
        "id": str(finding.id),
        "analysis_id": str(finding.run_id),
        "rank": rank,
        "score": finding.score,
        "compound_a": {"id": str(ca.id) if ca else str(finding.compound_a_id),
                       "name": ca.name if ca else "Unknown",
                       "plant_id": str(pa.id) if pa else (str(pa_id) if pa_id else ""),
                       "botanical_name": pa.canonical_name if pa else ""},
        "compound_b": {"id": str(cb.id) if cb else str(finding.compound_b_id),
                       "name": cb.name if cb else "Unknown",
                       "plant_id": str(pb.id) if pb else (str(pb_id) if pb_id else ""),
                       "botanical_name": pb.canonical_name if pb else ""},
        "target": {"id": str(target.id) if target else str(finding.target_id),
                   "symbol": (target.gene_symbol or target.name) if target else (prov.get("target_name") or "Unknown"),
                   "name": target.name if target else (prov.get("target_name") or "Unknown")},
        "pathways": [],
        "interaction_type": finding.type.value if hasattr(finding.type, "value") else str(finding.type),
        "category": cat,
        "confidence": conf,
        "evidence": [{"id": str(finding.id), "category": cat,
                      "statement": f"{ca.name if ca else 'A'} and {cb.name if cb else 'B'} both recorded against {target.name if target else 'target'}.",
                      "subject": "shared biological target", "method": None, "value": None,
                      "confidence": conf, "sources": [src]}],
        "missing_data": missing,
    }
