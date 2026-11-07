import uuid

from sqlalchemy import Float, ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Plant(Base):
    __tablename__ = "plants"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    canonical_name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    imppat_id: Mapped[str | None] = mapped_column(String(32), unique=True, index=True)
    family: Mapped[str | None] = mapped_column(String(128))
    genus: Mapped[str | None] = mapped_column(String(128), index=True)
    species: Mapped[str | None] = mapped_column(String(128))
    plant_group: Mapped[str | None] = mapped_column(String(64))
    system_of_medicine: Mapped[str | None] = mapped_column(String(255), index=True)
    iucn_status: Mapped[str | None] = mapped_column(String(64))
    taxonomy_source: Mapped[str | None] = mapped_column(String(64))

    aliases: Mapped[list["PlantAlias"]] = relationship(
        back_populates="plant", cascade="all, delete-orphan"
    )
    compounds: Mapped[list["PlantCompound"]] = relationship(back_populates="plant")


class PlantAlias(Base):
    __tablename__ = "plant_aliases"
    __table_args__ = (
        UniqueConstraint("plant_id", "normalized_alias", "source", name="uq_plant_alias_norm_source"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    plant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plants.id", ondelete="CASCADE"), index=True
    )
    alias: Mapped[str] = mapped_column(String(255), index=True)
    normalized_alias: Mapped[str] = mapped_column(String(255), index=True)
    language: Mapped[str | None] = mapped_column(String(32))
    source: Mapped[str] = mapped_column(String(64), index=True)
    confidence: Mapped[float | None] = mapped_column(Float)
    manifest_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("data_manifests.id", ondelete="SET NULL"), index=True
    )

    plant: Mapped["Plant"] = relationship(back_populates="aliases")
