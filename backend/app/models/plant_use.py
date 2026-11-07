import uuid

from sqlalchemy import Float, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlantUse(Base):
    """
    Ethnobotanical use records.
    Universal across traditions: Ayurvedic, TCM, Unani, African, Andean
    uses are all rows here, distinguished by tradition/source/region.
    """
    __tablename__ = "plant_uses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    plant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("plants.id", ondelete="CASCADE"), index=True
    )
    use_description: Mapped[str] = mapped_column(Text)
    use_category: Mapped[str | None] = mapped_column(String(64), index=True)
    tradition: Mapped[str | None] = mapped_column(String(64), index=True)
    region: Mapped[str | None] = mapped_column(String(128))
    part_used: Mapped[str | None] = mapped_column(String(128))
    source: Mapped[str] = mapped_column(String(64), index=True)
    confidence: Mapped[float | None] = mapped_column(Float)
    manifest_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("data_manifests.id", ondelete="SET NULL"), index=True
    )
