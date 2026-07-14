import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin
from app.models.enums import StepStatus


class InvestigationPath(UuidPkMixin, Base):
    __tablename__ = "investigation_paths"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)
    parent_path_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("investigation_paths.id"), nullable=True)
    revision_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(64), default="complaint", nullable=False)  # "complaint", "entities_verified", "evidence", "provider_response", "manual"
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    model_used: Mapped[str] = mapped_column(String(120), nullable=False)

    steps = relationship("PathStep", back_populates="path")
    parent_path = relationship("InvestigationPath", remote_side="InvestigationPath.id")


class PathStep(UuidPkMixin, Base):
    __tablename__ = "path_steps"

    path_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("investigation_paths.id"), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sop_citation: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[StepStatus] = mapped_column(Enum(StepStatus), default=StepStatus.PENDING, nullable=False)
    suggested_action_type: Mapped[str | None] = mapped_column(String(80), nullable=True)

    path = relationship("InvestigationPath", back_populates="steps")
