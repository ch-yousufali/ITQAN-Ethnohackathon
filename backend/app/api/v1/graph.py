"""Knowledge graph: GET /graph?analysis_id=

The graph is built from analysis findings rather than the whole database: a single
plant can have hundreds of compounds and thousands of targets, which is unreadable
in a force layout. With an `analysis_id` the graph covers that run; without one it
merges the latest completed run of each formulation, capped at MAX_FINDINGS.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy import and_, select

from app.api.deps import SessionDep
from app.models.analysis import AnalysisRun, Finding
from app.models.compound import Compound
from app.models.enums import AnalysisStatus
from app.models.formulation import Formulation, FormulationIngredient
from app.models.plant import Plant
from app.models.target import CompoundTarget, Target

router = APIRouter(tags=["graph"])

MAX_FINDINGS = 300


def _source(row_id: uuid.UUID, database: str | None) -> dict[str, Any]:
    return {
        "id": str(row_id),
        "database": database or "IMPPAT_3.0",
        "accession": str(row_id)[:8],
        "title": None,
        "year": None,
        "url": "https://cb.imsc.res.in/imppat/",
    }


@router.get("/graph")
async def get_graph(session: SessionDep, analysis_id: uuid.UUID | None = None):
    if analysis_id is not None:
        run = await session.get(AnalysisRun, analysis_id)
        if run is None:
            raise HTTPException(status_code=404, detail="Analysis run not found")
        runs = [run]
    else:
        completed = (await session.execute(
            select(AnalysisRun)
            .where(AnalysisRun.status == AnalysisStatus.COMPLETED)
            .order_by(AnalysisRun.created_at.desc())
        )).scalars().all()
        latest: dict[uuid.UUID, AnalysisRun] = {}
        for r in completed:
            latest.setdefault(r.formulation_id, r)
        runs = list(latest.values())

    if not runs:
        return {"nodes": [], "links": []}

    findings = (await session.execute(
        select(Finding)
        .where(Finding.run_id.in_([r.id for r in runs]))
        .order_by(Finding.score.desc(), Finding.id)
        .limit(MAX_FINDINGS)
    )).scalars().all()

    formulation_ids = {r.formulation_id for r in runs}
    nodes: dict[str, dict[str, Any]] = {}
    links: dict[str, dict[str, Any]] = {}

    def node(nid: uuid.UUID, ntype: str, label: str, href: str | None) -> str:
        key = str(nid)
        nodes.setdefault(key, {"id": key, "type": ntype, "label": label, "href": href})
        return key

    def link(src: str, dst: str, relation: str, category: str | None, sources: list) -> None:
        lid = f"{src}->{dst}"
        links.setdefault(lid, {
            "id": lid, "source": src, "target": dst, "relation": relation,
            "category": category, "sources": sources,
        })

    # Formulation -> plant, from the formulation's own ingredient list.
    for f in (await session.execute(
        select(Formulation).where(Formulation.id.in_(formulation_ids))
    )).scalars().all():
        node(f.id, "formulation", f.name, f"/formulations/{f.id}")
    ing_rows = (await session.execute(
        select(FormulationIngredient.formulation_id, Plant.id, Plant.canonical_name)
        .join(Plant, Plant.id == FormulationIngredient.plant_id)
        .where(FormulationIngredient.formulation_id.in_(formulation_ids))
    )).all()
    for fid, pid, pname in ing_rows:
        link(node(fid, "formulation", "", None), node(pid, "plant", pname, f"/plants/{pid}"),
             "contains", None, [])

    # Plant -> compound -> target, from the findings.
    compound_ids = {c for f in findings for c in (f.compound_a_id, f.compound_b_id) if c}
    target_ids = {f.target_id for f in findings if f.target_id}
    compounds = {c.id: c for c in (await session.execute(
        select(Compound).where(Compound.id.in_(compound_ids))
    )).scalars().all()} if compound_ids else {}
    targets = {t.id: t for t in (await session.execute(
        select(Target).where(Target.id.in_(target_ids))
    )).scalars().all()} if target_ids else {}
    edges: dict[tuple, CompoundTarget] = {}
    if compound_ids and target_ids:
        for ct in (await session.execute(
            select(CompoundTarget).where(and_(
                CompoundTarget.compound_id.in_(compound_ids),
                CompoundTarget.target_id.in_(target_ids),
            ))
        )).scalars().all():
            edges[(ct.compound_id, ct.target_id)] = ct

    for f in findings:
        prov = f.provenance or {}
        target = targets.get(f.target_id)
        if target is None:
            continue
        tnode = node(target.id, "target", target.gene_symbol or target.name, None)
        for cid, plant_key in ((f.compound_a_id, "plant_a_id"), (f.compound_b_id, "plant_b_id")):
            compound = compounds.get(cid)
            if compound is None:
                continue
            cnode = node(compound.id, "compound", compound.name, f"/compounds/{compound.id}")
            pid = prov.get(plant_key)
            if pid and pid in nodes:
                link(pid, cnode, "contains compound", None, [_source(compound.id, "IMPPAT_3.0")])
            ct = edges.get((compound.id, target.id))
            if ct is not None:
                category = getattr(ct.evidence_tier, "name", str(ct.evidence_tier).upper())
                link(cnode, tnode, ct.activity_type or "acts on", category,
                     [_source(ct.id, ct.source)])

    return {"nodes": list(nodes.values()), "links": list(links.values())}
