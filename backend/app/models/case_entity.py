import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import UuidPkMixin


class CaseEntity(UuidPkMixin, Base):
    __tablename__ = "case_entities"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g., person, phone, account, ip, location
    canonical_value: Mapped[str] = mapped_column(String(255), nullable=False)
    display_value: Mapped[str] = mapped_column(String(255), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EntityRelationship(UuidPkMixin, Base):
    __tablename__ = "entity_relationships"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)
    source_entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("case_entities.id"), nullable=False)
    target_entity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("case_entities.id"), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(120), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    evidence_ref: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
