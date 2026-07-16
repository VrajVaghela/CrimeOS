import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin
from app.models.enums import StepStatus


class InvestigationPath(UuidPkMixin, Base):
    __tablename__ = "investigation_paths"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    model_used: Mapped[str] = mapped_column(String(120), nullable=False)

    steps = relationship("PathStep", back_populates="path")


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
