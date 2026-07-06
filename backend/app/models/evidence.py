import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import UuidPkMixin


class EvidenceFile(UuidPkMixin, Base):
    __tablename__ = "evidence_files"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    ai_tags: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
