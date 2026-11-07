import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    DateTime, Enum as SAEnum, Float, ForeignKey, Text, Uuid, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AnalysisStatus, EvidenceTier, FindingType


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    formulation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("formulations.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[AnalysisStatus] = mapped_column(
        SAEnum(AnalysisStatus, native_enum=False, length=32),
        default=AnalysisStatus.PENDING,
        index=True,
    )
    params: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    findings: Mapped[list["Finding"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[FindingType] = mapped_column(SAEnum(FindingType, native_enum=False, length=32))
    description: Mapped[str] = mapped_column(Text)
    score: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    compound_a_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("compounds.id", ondelete="SET NULL")
    )
    compound_b_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("compounds.id", ondelete="SET NULL")
    )
    target_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("targets.id", ondelete="SET NULL")
    )
    pathway_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pathways.id", ondelete="SET NULL")
    )
    evidence_tier: Mapped[EvidenceTier] = mapped_column(
        SAEnum(EvidenceTier, native_enum=False, length=32),
        default=EvidenceTier.INFERRED,
        nullable=False,
        index=True,
    )
    provenance: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    llm_interpretation: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    controls: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    run: Mapped["AnalysisRun"] = relationship(back_populates="findings")
