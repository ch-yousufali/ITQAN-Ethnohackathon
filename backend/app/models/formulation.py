import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, Uuid, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ResolutionStatus, Tradition


class Formulation(Base):
    __tablename__ = "formulations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), index=True)
    imppat_formulation_id: Mapped[str | None] = mapped_column(String(32), unique=True, index=True)
    name_in_afi: Mapped[str | None] = mapped_column(String(255))
    tradition: Mapped[Tradition] = mapped_column(SAEnum(Tradition, native_enum=False, length=32))
    era: Mapped[str | None] = mapped_column(String(128))
    source_text: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    ingredients: Mapped[list["FormulationIngredient"]] = relationship(
        back_populates="formulation",
        cascade="all, delete-orphan",
        order_by="FormulationIngredient.order_index",
    )


class FormulationIngredient(Base):
    __tablename__ = "formulation_ingredients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    formulation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("formulations.id", ondelete="CASCADE"), index=True
    )
    raw_name: Mapped[str] = mapped_column(String(255))
    standardized_plant_name: Mapped[str | None] = mapped_column(String(255))
    plant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plants.id", ondelete="SET NULL"), index=True
    )
    part_used: Mapped[str | None] = mapped_column(String(128))
    quantity: Mapped[str | None] = mapped_column(String(128))
    processing: Mapped[str | None] = mapped_column(String(255))
    resolution_status: Mapped[ResolutionStatus] = mapped_column(
        SAEnum(ResolutionStatus, native_enum=False, length=32),
        default=ResolutionStatus.UNRESOLVED,
        index=True,
    )
    resolution_confidence: Mapped[float | None] = mapped_column(Float)
    resolution_provenance: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    formulation: Mapped["Formulation"] = relationship(back_populates="ingredients")
