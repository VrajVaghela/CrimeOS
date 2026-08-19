import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin
from app.models.enums import ProviderType, RequestStatus


class LegalRequest(UuidPkMixin, Base):
    __tablename__ = "legal_requests"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)
    path_step_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("path_steps.id"), nullable=True)
    provider_type: Mapped[ProviderType] = mapped_column(Enum(ProviderType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    provider_name: Mapped[str] = mapped_column(String(160), nullable=False)
    template_used: Mapped[str] = mapped_column(String(120), nullable=False)
    generated_body: Mapped[str] = mapped_column(Text, nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus, values_callable=lambda obj: [e.value for e in obj]), default=RequestStatus.DRAFT, nullable=False)
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    responses = relationship("ProviderResponse", back_populates="legal_request")
