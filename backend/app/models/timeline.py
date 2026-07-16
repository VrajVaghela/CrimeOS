import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UuidPkMixin


class TimelineEvent(UuidPkMixin, Base):
    """AI-synthesized and CCTV-derived case timeline events.

    Distinct from audit_events (system append-only log).
    These are human-readable intelligence events assembled by the Timeline Agent.
    """

    __tablename__ = "timeline_events"

    case_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cases.id"), nullable=False)

    # Real-world time of the event (not insertion time)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Event classification — used for color/icon routing in UI
    event_type: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        comment=(
            "One of: complaint_filed, entity_extracted, path_generated, "
            "step_completed, request_dispatched, response_received, "
            "cctv_frame, officer_note"
        ),
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Location — populated from CCTV analysis or officer input
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # AI confidence on this event (0.0–1.0); None for officer-entered events
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Back-link to the originating record — e.g. {"type": "audit_event", "id": "..."}
    # or {"type": "cctv_frame", "evidence_file_id": "..."}
    source_ref: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    # True for Gemini-synthesized or CCTV-derived events; False for officer notes
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Nullable FK to evidence_files — set for cctv_frame events
    evidence_file_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("evidence_files.id"), nullable=True
    )

    # Full CCTV analysis payload (persons, vehicles, forensic flags, etc.)
    cctv_analysis: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    case = relationship("Case", back_populates="timeline_events")
    evidence_file = relationship("EvidenceFile")
