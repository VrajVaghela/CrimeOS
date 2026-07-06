import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin


class ProviderResponse(UuidPkMixin, Base):
    __tablename__ = "provider_responses"

    legal_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("legal_requests.id"), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parsed_data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    ai_insights: Mapped[str] = mapped_column(Text, nullable=False)

    legal_request = relationship("LegalRequest", back_populates="responses")
