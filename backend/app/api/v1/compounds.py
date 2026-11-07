import uuid

from fastapi import APIRouter, HTTPException

from app.api.deps import SessionDep
from app.api.v1.adapters import compound_to_frontend
from app.models.compound import Compound

router = APIRouter(prefix="/compounds", tags=["compounds"])


@router.get("/{compound_id}")
async def get_compound(compound_id: uuid.UUID, session: SessionDep):
    compound = await session.get(Compound, compound_id)
    if compound is None:
        raise HTTPException(status_code=404, detail="Compound not found")
    return await compound_to_frontend(session, compound)
