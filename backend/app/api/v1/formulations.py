import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.api.v1.adapters import formulation_to_frontend
from app.models.enums import ResolutionStatus, Tradition
from app.models.formulation import Formulation, FormulationIngredient

router = APIRouter(prefix="/formulations", tags=["formulations"])


class IngredientInput(BaseModel):
    traditional_name: str = Field(min_length=1, max_length=255)
    plant_id: uuid.UUID | None = None
    part_used: str | None = None
    quantity: str | None = None


class FormulationInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    tradition: str
    period: str = ""
    description: str | None = None
    source_note: str | None = None
    ingredients: list[IngredientInput] = Field(default_factory=list)


def _tradition(raw: str) -> Tradition:
    try:
        return Tradition(raw.lower())
    except ValueError:
        return Tradition.OTHER


async def _get_loaded(session, formulation_id: uuid.UUID):
    result = await session.execute(
        select(Formulation)
        .where(Formulation.id == formulation_id)
        .options(selectinload(Formulation.ingredients))
    )
    return result.scalar_one_or_none()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_formulation(payload: FormulationInput, session: SessionDep):
    formulation = Formulation(
        name=payload.name,
        tradition=_tradition(payload.tradition),
        era=payload.period or None,
        source_text=payload.source_note,
        notes=payload.description,
        ingredients=[
            FormulationIngredient(
                raw_name=i.traditional_name,
                plant_id=i.plant_id,
                part_used=i.part_used,
                quantity=i.quantity,
                resolution_status=(
                    ResolutionStatus.RESOLVED if i.plant_id else ResolutionStatus.UNRESOLVED
                ),
                order_index=idx,
            )
            for idx, i in enumerate(payload.ingredients)
        ],
    )
    session.add(formulation)
    await session.commit()
    formulation = await _get_loaded(session, formulation.id)
    return await formulation_to_frontend(session, formulation)


@router.get("")
async def list_formulations(session: SessionDep):
    result = await session.execute(
        select(Formulation)
        .options(selectinload(Formulation.ingredients))
        .order_by(Formulation.created_at.desc())
    )
    rows = result.scalars().unique().all()
    return [await formulation_to_frontend(session, f) for f in rows]


@router.get("/{formulation_id}")
async def get_formulation(formulation_id: uuid.UUID, session: SessionDep):
    formulation = await _get_loaded(session, formulation_id)
    if formulation is None:
        raise HTTPException(status_code=404, detail="Formulation not found")
    return await formulation_to_frontend(session, formulation)


@router.put("/{formulation_id}")
async def update_formulation(
    formulation_id: uuid.UUID, payload: FormulationInput, session: SessionDep
):
    formulation = await _get_loaded(session, formulation_id)
    if formulation is None:
        raise HTTPException(status_code=404, detail="Formulation not found")

    formulation.name = payload.name
    formulation.tradition = _tradition(payload.tradition)
    formulation.era = payload.period or None
    formulation.source_text = payload.source_note
    formulation.notes = payload.description

    for old in list(formulation.ingredients):
        await session.delete(old)
    await session.flush()

    for idx, i in enumerate(payload.ingredients):
        session.add(FormulationIngredient(
            formulation_id=formulation.id,
            raw_name=i.traditional_name,
            plant_id=i.plant_id,
            part_used=i.part_used,
            quantity=i.quantity,
            resolution_status=(
                ResolutionStatus.RESOLVED if i.plant_id else ResolutionStatus.UNRESOLVED
            ),
            order_index=idx,
        ))

    await session.commit()
    formulation = await _get_loaded(session, formulation_id)
    return await formulation_to_frontend(session, formulation)


@router.patch("/{formulation_id}")
async def patch_formulation(
    formulation_id: uuid.UUID, payload: FormulationInput, session: SessionDep
):
    return await update_formulation(formulation_id, payload, session)


@router.delete("/{formulation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_formulation(formulation_id: uuid.UUID, session: SessionDep):
    formulation = await _get_loaded(session, formulation_id)
    if formulation is None:
        raise HTTPException(status_code=404, detail="Formulation not found")
    await session.delete(formulation)
    await session.commit()
