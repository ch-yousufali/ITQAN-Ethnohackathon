import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import SessionDep
from app.api.v1.adapters import plant_to_frontend
from app.models.plant import Plant

router = APIRouter(prefix="/plants", tags=["plants"])


@router.get("")
async def list_plants(session: SessionDep, limit: int = 5000):
    rows = (await session.execute(
        select(Plant).order_by(Plant.canonical_name).limit(limit)
    )).scalars().all()
    return [await plant_to_frontend(session, p) for p in rows]


@router.get("/{plant_id}")
async def get_plant(plant_id: uuid.UUID, session: SessionDep):
    plant = await session.get(Plant, plant_id)
    if plant is None:
        raise HTTPException(status_code=404, detail="Plant not found")
    return await plant_to_frontend(session, plant)
