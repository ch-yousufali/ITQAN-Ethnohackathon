import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Manuscript(Base):
    __tablename__ = "manuscripts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(64))
    file_path: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(16), default="processing", index=True)
    error: Mapped[str | None] = mapped_column(Text)
    ocr_text: Mapped[str | None] = mapped_column(Text)
    ocr_confidence: Mapped[float | None] = mapped_column(Float)
    ocr_model: Mapped[str | None] = mapped_column(String(64))
    formulation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("formulations.id", ondelete="SET NULL"), index=True
    )
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ingredients: Mapped[list["ManuscriptIngredient"]] = relationship(
        back_populates="manuscript", cascade="all, delete-orphan", order_by="ManuscriptIngredient.order_index"
    )


class ManuscriptIngredient(Base):
    __tablename__ = "manuscript_ingredients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    manuscript_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("manuscripts.id", ondelete="CASCADE"), index=True
    )
    traditional_name: Mapped[str] = mapped_column(String(255))
    plant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plants.id", ondelete="SET NULL"), index=True
    )
    botanical_name: Mapped[str | None] = mapped_column(String(255))
    confidence: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(16), default="unmapped")
    rationale: Mapped[str | None] = mapped_column(Text)
    candidates: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    order_index: Mapped[int] = mapped_column(default=0)

    manuscript: Mapped["Manuscript"] = relationship(back_populates="ingredients")
