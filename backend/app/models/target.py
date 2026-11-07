import uuid

from sqlalchemy import Enum as SAEnum, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EvidenceTier


class Target(Base):
    __tablename__ = "targets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), index=True)
    gene_symbol: Mapped[str | None] = mapped_column(String(64), index=True)
    uniprot_id: Mapped[str | None] = mapped_column(String(32), index=True)
    kegg_id: Mapped[str | None] = mapped_column(String(32))

    compound_links: Mapped[list["CompoundTarget"]] = relationship(back_populates="target")
    pathway_links: Mapped[list["TargetPathway"]] = relationship(back_populates="target")


class CompoundTarget(Base):
    __tablename__ = "compound_targets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    compound_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("compounds.id", ondelete="CASCADE"), index=True
    )
    target_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("targets.id", ondelete="CASCADE"), index=True
    )
    activity_type: Mapped[str | None] = mapped_column(String(64))
    activity_value: Mapped[float | None] = mapped_column(Float)
    activity_unit: Mapped[str | None] = mapped_column(String(32))
    source: Mapped[str] = mapped_column(String(64), index=True)
    source_count: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    evidence_tier: Mapped[EvidenceTier] = mapped_column(
        SAEnum(EvidenceTier, native_enum=False, length=32),
        default=EvidenceTier.MEASURED,
        nullable=False,
        index=True,
    )
    manifest_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("data_manifests.id", ondelete="SET NULL"), index=True
    )

    compound: Mapped["Compound"] = relationship(back_populates="target_links")
    target: Mapped["Target"] = relationship(back_populates="compound_links")


class Pathway(Base):
    __tablename__ = "pathways"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), index=True)
    external_id: Mapped[str | None] = mapped_column(String(64))
    source: Mapped[str] = mapped_column(String(64))

    target_links: Mapped[list["TargetPathway"]] = relationship(back_populates="pathway")


class TargetPathway(Base):
    __tablename__ = "target_pathways"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    target_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("targets.id", ondelete="CASCADE"), index=True
    )
    pathway_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pathways.id", ondelete="CASCADE"), index=True
    )
    source: Mapped[str] = mapped_column(String(64))
    evidence_tier: Mapped[EvidenceTier] = mapped_column(
        SAEnum(EvidenceTier, native_enum=False, length=32),
        default=EvidenceTier.INFERRED,
        nullable=False,
        index=True,
    )

    target: Mapped["Target"] = relationship(back_populates="pathway_links")
    pathway: Mapped["Pathway"] = relationship(back_populates="target_links")
