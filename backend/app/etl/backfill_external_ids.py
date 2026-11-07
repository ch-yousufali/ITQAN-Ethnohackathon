"""
One-shot backfill: copy legacy IMPPAT ID columns into external_identifiers.
Batched to stay under PostgreSQL's 65,535-parameter query limit.
Idempotent: uses ON CONFLICT DO NOTHING.
"""
import asyncio
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.session import SessionLocal
from app.models.compound import Compound
from app.models.external_id import ExternalIdentifier
from app.models.formulation import Formulation
from app.models.plant import Plant

BATCH_SIZE = 500


async def backfill() -> None:
    async with SessionLocal() as session:
        sources = [
            ("plant", Plant, Plant.id, Plant.imppat_id),
            ("compound", Compound, Compound.id, Compound.imppat_compound_id),
            ("formulation", Formulation, Formulation.id, Formulation.imppat_formulation_id),
        ]
        grand_total = 0
        for entity_type, model, id_col, ext_col in sources:
            rows = await session.execute(
                select(id_col, ext_col).where(ext_col.isnot(None))
            )
            batch: list[dict] = []
            inserted_for_type = 0
            for entity_id, ext_id in rows.all():
                batch.append({
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "source": "IMPPAT_3.0",
                    "external_id": ext_id,
                })
                if len(batch) >= BATCH_SIZE:
                    stmt = pg_insert(ExternalIdentifier).values(batch).on_conflict_do_nothing(
                        constraint="uq_extid_type_source_id"
                    )
                    result = await session.execute(stmt)
                    if result.rowcount and result.rowcount > 0:
                        inserted_for_type += result.rowcount
                    batch = []
            if batch:
                stmt = pg_insert(ExternalIdentifier).values(batch).on_conflict_do_nothing(
                    constraint="uq_extid_type_source_id"
                )
                result = await session.execute(stmt)
                if result.rowcount and result.rowcount > 0:
                    inserted_for_type += result.rowcount
            await session.commit()
            print(f"  {entity_type}: {inserted_for_type} inserted")
            grand_total += inserted_for_type
        print(f"BACKFILL COMPLETE: {grand_total} total rows")


if __name__ == "__main__":
    asyncio.run(backfill())
