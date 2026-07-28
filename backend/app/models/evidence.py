import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin


class EvidenceFile(UuidPkMixin, Base):
    __tablename__ = "evidence_files"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # image, audio, video, document
    transcript: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    translation: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    ai_tags: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    markers = relationship("EvidenceMarker", back_populates="evidence_file", cascade="all, delete-orphan")


class EvidenceMarker(UuidPkMixin, Base):
    __tablename__ = "evidence_markers"

    evidence_file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("evidence_files.id", ondelete="CASCADE"), nullable=False
    )
    marker_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., image_bounding_box, transcript_segment, audio_timestamp
    start_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript_text: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    linked_entity_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)  # list of case entity IDs
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    evidence_file = relationship("EvidenceFile", back_populates="markers")

