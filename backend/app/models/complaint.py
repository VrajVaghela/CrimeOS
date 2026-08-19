import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin
from app.models.enums import SourceType


class Complaint(UuidPkMixin, Base):
    __tablename__ = "complaints"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    original_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    detected_language: Mapped[str | None] = mapped_column(String(64), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    translated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case", back_populates="complaints")
    entities = relationship("ExtractedEntity", back_populates="complaint")


class ExtractedEntity(UuidPkMixin, Base):
    __tablename__ = "extracted_entities"

    complaint_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("complaints.id"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    complaint = relationship("Complaint", back_populates="entities")
