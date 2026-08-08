import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin


class AiCitation(UuidPkMixin, Base):
    __tablename__ = "ai_citations"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    output_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 'copilot_message', 'path_step'
    output_id: Mapped[uuid.UUID] = mapped_column(nullable=False)  # polymorphic ID
    source_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 'sop_chunk', 'legal_section', 'complaint'
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)  # source identifier
    excerpt: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    locator: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case")


class CopilotMessage(UuidPkMixin, Base):
    __tablename__ = "copilot_messages"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # 'user', 'assistant'
    # Authoritative English text. The audit trail and any downstream legal record
    # read this column, never the localized one (Phase 14D decision A2).
    message: Mapped[str] = mapped_column(String(10000), nullable=False)
    # Display copy in the officer's selected language. NULL when lang == 'en' or
    # when the model returned only English. Never fed back into case artifacts.
    message_localized: Mapped[str | None] = mapped_column(String(10000), nullable=True)
    # Language the message was produced for: 'en' | 'hi' | 'gu'.
    lang: Mapped[str] = mapped_column(String(2), default="en", server_default="en", nullable=False)
    cited_source_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)  # list of ai_citation IDs
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case")
    user = relationship("User")
