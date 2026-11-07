import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ResolutionStatus, Tradition


class IngredientCreate(BaseModel):
    raw_name: str = Field(min_length=1, max_length=255)
    part_used: str | None = None
    quantity: str | None = None
    processing: str | None = None


class IngredientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    raw_name: str
    plant_id: uuid.UUID | None
    part_used: str | None
    quantity: str | None
    processing: str | None
    resolution_status: ResolutionStatus
    resolution_confidence: float | None
    order_index: int


class FormulationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    tradition: Tradition
    era: str | None = None
    source_text: str | None = None
    notes: str | None = None
    ingredients: list[IngredientCreate] = Field(default_factory=list)


class FormulationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    tradition: Tradition | None = None
    era: str | None = None
    source_text: str | None = None
    notes: str | None = None


class FormulationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    tradition: Tradition
    era: str | None
    source_text: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    ingredients: list[IngredientRead]
