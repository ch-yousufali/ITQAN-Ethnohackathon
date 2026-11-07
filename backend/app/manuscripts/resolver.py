"""Lightweight ingredient-name resolver for manuscripts.
Returns top candidates from plant_aliases using normalized + fuzzy matching."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from rapidfuzz import process, fuzz

from app.models.plant import Plant, PlantAlias
from app.utils.text_norm import normalize_name


async def resolve_ingredient_name(
    session: AsyncSession, traditional_name: str, limit: int = 5
) -> list[dict]:
    normalized = normalize_name(traditional_name)
    if not normalized:
        return []

    # Exact normalized match first
    exact = await session.execute(
        select(PlantAlias.normalized_alias, PlantAlias.alias, Plant.canonical_name, Plant.id)
        .join(Plant, Plant.id == PlantAlias.plant_id)
        .where(PlantAlias.normalized_alias == normalized)
        .limit(limit)
    )
    exact_rows = exact.all()
    if exact_rows:
        return [
            {"plant_id": str(pid), "botanical_name": cname, "confidence": 1.0}
            for _, _, cname, pid in exact_rows
        ]

    # Fuzzy: pull all aliases once per request (SQLite/PG handles fine for ~10k rows)
    all_rows = await session.execute(
        select(PlantAlias.normalized_alias, Plant.canonical_name, Plant.id)
        .join(Plant, Plant.id == PlantAlias.plant_id)
    )
    rows = all_rows.all()
    if not rows:
        return []

    choices = [r[0] for r in rows if r[0]]
    matches = process.extract(normalized, choices, scorer=fuzz.token_set_ratio, limit=limit)

    out: list[dict] = []
    seen_plants: set[str] = set()
    for match_norm, score, idx in matches:
        if score < 70:
            continue
        _, cname, pid = rows[idx]
        pid_str = str(pid)
        if pid_str in seen_plants:
            continue
        seen_plants.add(pid_str)
        out.append({
            "plant_id": pid_str,
            "botanical_name": cname,
            "confidence": round(score / 100.0, 3),
        })
    return out
