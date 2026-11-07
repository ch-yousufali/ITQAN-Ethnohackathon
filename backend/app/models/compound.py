import uuid

from sqlalchemy import (
    Enum as SAEnum, Float, ForeignKey, Integer, String, UniqueConstraint, Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EvidenceTier


class Compound(Base):
    __tablename__ = "compounds"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), index=True)
    imppat_compound_id: Mapped[str | None] = mapped_column(String(32), unique=True, index=True)
    inchikey: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    pubchem_cid: Mapped[int | None] = mapped_column(Integer, index=True)
    chebi_id: Mapped[str | None] = mapped_column(String(32))
    smiles: Mapped[str | None] = mapped_column(String(2048))
    molecular_formula: Mapped[str | None] = mapped_column(String(128))
    molecular_weight: Mapped[float | None] = mapped_column(Float)

    plant_links: Mapped[list["PlantCompound"]] = relationship(back_populates="compound")
    target_links: Mapped[list["CompoundTarget"]] = relationship(back_populates="compound")


class PlantCompound(Base):
    __tablename__ = "plant_compounds"
    __table_args__ = (
        UniqueConstraint(
            "plant_id", "compound_id", "source", "plant_part",
            name="uq_plant_compound_source_part",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    plant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plants.id", ondelete="CASCADE"), index=True
    )
    compound_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("compounds.id", ondelete="CASCADE"), index=True
    )
    source: Mapped[str] = mapped_column(String(64), index=True)
    plant_part: Mapped[str | None] = mapped_column(String(128), index=True)
    source_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
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

    plant: Mapped["Plant"] = relationship(back_populates="compounds")
    compound: Mapped["Compound"] = relationship(back_populates="plant_links")
