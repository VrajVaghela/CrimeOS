from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import UuidPkMixin


class FallbackCache(UuidPkMixin, Base):
    __tablename__ = "fallback_cache"
    __table_args__ = (UniqueConstraint("purpose", "input_hash", name="uq_fallback_cache_key"),)

    purpose: Mapped[str] = mapped_column(String(120), nullable=False)
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    response_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
