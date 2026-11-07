from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import AnalysisRun, Finding
from app.models.compound import PlantCompound
from app.models.enums import AnalysisStatus, EvidenceTier, FindingType
from app.models.formulation import FormulationIngredient
from app.models.target import CompoundTarget

MIN_PLANTS_PER_TARGET = 2
MAX_TARGET_FRACTION = 0.05
MAX_FINDINGS_PER_TARGET = 20
MAX_TOTAL_FINDINGS = 500


async def analyze_formulation(
    session: AsyncSession, run_id: uuid.UUID, params: dict[str, Any] | None = None
) -> dict[str, Any]:
    params = params or {}
    min_plants = params.get("min_plants_per_target", MIN_PLANTS_PER_TARGET)
    max_fraction = params.get("max_target_fraction", MAX_TARGET_FRACTION)

    run = await session.get(AnalysisRun, run_id)
    if not run:
        raise ValueError(f"AnalysisRun {run_id} not found")

    run.status = AnalysisStatus.RUNNING
    run.started_at = datetime.now(timezone.utc)
    await session.commit()

    try:
        ingredients = (await session.execute(
            select(FormulationIngredient).where(
                FormulationIngredient.formulation_id == run.formulation_id
            )
        )).scalars().all()
        plant_ids = {ing.plant_id for ing in ingredients if ing.plant_id}

        target_name_rows = await session.execute(select(CompoundTarget.__table__).limit(0))
        from app.models.target import Target as TargetModel
        tnames = await session.execute(select(TargetModel.id, TargetModel.name))
        target_names = {tid: name for tid, name in tnames.all()}

        if len(plant_ids) < 2:
            run.status = AnalysisStatus.COMPLETED
            run.finished_at = datetime.now(timezone.utc)
            run.params = {**run.params, "error": "fewer than 2 plants resolved"}
            await session.commit()
            return {"findings": 0, "reason": "insufficient_plants"}

        rows = await session.execute(
            select(PlantCompound.plant_id, PlantCompound.compound_id)
            .where(PlantCompound.plant_id.in_(plant_ids))
        )
        plant_to_compounds = defaultdict(set)
        all_compound_ids: set = set()
        for pid, cid in rows.all():
            plant_to_compounds[pid].add(cid)
            all_compound_ids.add(cid)

        ct_rows = await session.execute(
            select(CompoundTarget.compound_id, CompoundTarget.target_id,
                   CompoundTarget.activity_value)
            .where(CompoundTarget.compound_id.in_(all_compound_ids))
        )
        compound_to_targets = defaultdict(dict)
        for cid, tid, act in ct_rows.all():
            if tid not in compound_to_targets[cid]:
                compound_to_targets[cid][tid] = act
            else:
                cur = compound_to_targets[cid][tid]
                if act is not None and (cur is None or act < cur):
                    compound_to_targets[cid][tid] = act

        plants_with_targets = {
            pid for pid in plant_ids
            if any(compound_to_targets.get(c) for c in plant_to_compounds.get(pid, set()))
        }
        coverage = len(plants_with_targets) / len(plant_ids) if plant_ids else 0.0

        target_binders = defaultdict(list)
        for pid in plants_with_targets:
            for cid in plant_to_compounds[pid]:
                for tid, act in compound_to_targets.get(cid, {}).items():
                    target_binders[tid].append((pid, cid, act))

        n_compounds = len(all_compound_ids)
        filtered: dict = {}
        for tid, binders in target_binders.items():
            if _is_noise_target(target_names.get(tid)):
                continue
            n_plants = len({p for p, _, _ in binders})
            if n_plants < min_plants:
                continue
            if n_compounds and len(binders) > n_compounds * max_fraction:
                continue
            filtered[tid] = binders

        candidates: list = []
        for tid, binders in filtered.items():
            by_plant = defaultdict(list)
            for pid, cid, act in binders:
                by_plant[pid].append((cid, act))
            plist = list(by_plant.keys())
            pairs: list = []
            for i, p1 in enumerate(plist):
                for p2 in plist[i + 1:]:
                    for c1, a1 in by_plant[p1]:
                        for c2, a2 in by_plant[p2]:
                            if c1 == c2:
                                continue
                            pairs.append({
                                "target_id": tid,
                                "compound_a": c1,
                                "compound_b": c2,
                                "plant_a": p1,
                                "plant_b": p2,
                                "act_a": a1,
                                "act_b": a2,
                                "score": _score(a1, a2),
                            })
            pairs.sort(key=lambda x: -x["score"])
            candidates.extend(pairs[:MAX_FINDINGS_PER_TARGET])

        # Dedupe: keep the highest-scoring finding per (compound_a, compound_b) pair.
        # This collapses "pair X hits target 1, 2, 3, 4, 5" into ONE finding whose
        # provenance lists all shared targets. Scientifically honest: 5 pathways
        # is one interaction, not five.
        pair_best: dict = {}
        pair_targets: dict = {}
        for c in candidates:
            key = tuple(sorted([str(c["compound_a"]), str(c["compound_b"])]))
            pair_targets.setdefault(key, []).append(c["target_id"])
            if key not in pair_best or c["score"] > pair_best[key]["score"]:
                pair_best[key] = c

        candidates = list(pair_best.values())
        for c in candidates:
            key = tuple(sorted([str(c["compound_a"]), str(c["compound_b"])]))
            c["shared_target_count"] = len(set(pair_targets[key]))

        candidates.sort(key=lambda x: (-x["score"], -x.get("shared_target_count", 0)))
        candidates = candidates[:MAX_TOTAL_FINDINGS]

        for fd in candidates:
            session.add(Finding(
                run_id=run.id,
                type=FindingType.SHARED_TARGET,
                description=f"Cross-plant shared target (target_id={fd['target_id']})",
                score=fd["score"],
                compound_a_id=fd["compound_a"],
                compound_b_id=fd["compound_b"],
                target_id=fd["target_id"],
                evidence_tier=EvidenceTier.MEASURED,
                provenance={
                    "plant_a_id": str(fd["plant_a"]),
                    "plant_b_id": str(fd["plant_b"]),
                    "target_name": target_names.get(fd["target_id"]),
                    "activity_a_nM": fd["act_a"],
                    "activity_b_nM": fd["act_b"],
                    "shared_target_count": fd.get("shared_target_count", 1),
                },
                controls={"coverage": coverage, "permutation_baseline": None},
            ))

        run.status = AnalysisStatus.COMPLETED
        run.finished_at = datetime.now(timezone.utc)
        run.params = {
            **run.params,
            "resolved_plants": len(plant_ids),
            "plants_with_targets": len(plants_with_targets),
            "coverage": round(coverage, 3),
            "candidate_targets": len(target_binders),
            "filtered_targets": len(filtered),
            "findings_written": len(candidates),
        }
        await session.commit()
        return {
            "findings": len(candidates),
            "coverage": round(coverage, 3),
            "plants": len(plant_ids),
            "plants_with_targets": len(plants_with_targets),
            "filtered_targets": len(filtered),
        }
    except Exception as exc:
        await session.rollback()
        run = await session.get(AnalysisRun, run_id)
        run.status = AnalysisStatus.FAILED
        run.error = f"{type(exc).__name__}: {exc}"
        run.finished_at = datetime.now(timezone.utc)
        await session.commit()
        raise


def _score(a1, a2):
    score = 1.0
    for a in (a1, a2):
        if a is not None:
            if a < 100:
                score += 1.0
            elif a < 1000:
                score += 0.7
            elif a < 10000:
                score += 0.4
            else:
                score += 0.1
    return round(score, 2)


_CELL_LINE_EXACT = {"KB", "DU-145", "A549", "HELA", "PC-3", "P388",
                    "HL-60", "JURKAT", "THP-1", "NON-PROTEIN TARGET"}
_CELL_LINE_PREFIXES = ("DU-", "MCF-", "HCT-", "A-549", "A-431", "A-375",
                       "HEP-G2", "HEPG2", "HEP-2", "SK-BR-3", "SK-OV-3",
                       "U-87", "U-251", "MDA-MB", "MDA-", "CACO-", "CACO2",
                       "HEK-293", "HEK")


def _is_noise_target(name: str | None) -> bool:
    if not name:
        return True
    u = name.upper().strip()
    if u in _CELL_LINE_EXACT:
        return True
    if u.startswith("NON-PROTEIN") or u.startswith("UNKNOWN"):
        return True
    for prefix in _CELL_LINE_PREFIXES:
        if u.startswith(prefix):
            return True
    return False
