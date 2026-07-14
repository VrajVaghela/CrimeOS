import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CaseWorkflowState(Base):
    __tablename__ = "case_workflow_state"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True)
    current_stage: Mapped[str] = mapped_column(String(64), nullable=False)
    blocker_codes: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    next_action_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    next_action_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    case = relationship("Case", back_populates="workflow_state")
