"""Pydantic schemas for the Timeline Agent feature."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Gemini output schemas (used with generate_json — must be Pydantic models)
# ---------------------------------------------------------------------------


class CctvAnalysisOut(BaseModel):
    """Structured output from the CCTV_ANALYSIS_PROMPT Gemini call."""

    model_config = ConfigDict(from_attributes=True)

    detected_timestamp: str = Field(
        description="OSD timestamp if visible, or 'Not visible in frame'"
    )
    location_description: str = Field(
        description="Physical environment description with any identifiable location cues"
    )
    persons_detected: list[str] = Field(
        default_factory=list,
        description="Description of each visible person",
    )
    vehicles_detected: list[str] = Field(
        default_factory=list,
        description="Description of each visible vehicle with partial plate if readable",
    )
    forensic_flags: list[str] = Field(
        default_factory=list,
        description="Noteworthy forensic observations",
    )
    confidence: float = Field(ge=0.0, le=1.0, description="Overall analysis confidence")


class SynthesizedEventItem(BaseModel):
    """A single event from the TIMELINE_SYNTHESIS_PROMPT Gemini call."""

    occurred_at: str = Field(description="ISO 8601 datetime string")
    event_type: str = Field(
        description=(
            "One of: complaint_filed, entity_extracted, path_generated, "
            "step_completed, request_dispatched, response_received"
        )
    )
    title: str = Field(max_length=80)
    description: str
    location: str | None = None


class TimelineSynthesisOut(BaseModel):
    """Structured output from TIMELINE_SYNTHESIS_PROMPT Gemini call."""

    events: list[SynthesizedEventItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# API response schemas
# ---------------------------------------------------------------------------


class TimelineEventOut(BaseModel):
    """Serialized timeline event returned to the frontend."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    case_id: uuid.UUID
    occurred_at: datetime
    event_type: str
    title: str
    description: str
    location: str | None
    confidence: float | None
    source_ref: dict[str, Any]
    ai_generated: bool
    evidence_file_id: uuid.UUID | None
    cctv_analysis: dict[str, Any] | None
    created_at: datetime


class CctvPinOut(BaseModel):
    """Response for a CCTV upload + pin operation."""

    model_config = ConfigDict(from_attributes=True)

    event: TimelineEventOut
    analysis: CctvAnalysisOut


# ---------------------------------------------------------------------------
# Request body schemas
# ---------------------------------------------------------------------------


class OfficerNoteIn(BaseModel):
    """Body for adding an officer note to the timeline."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    occurred_at: datetime
    location: str | None = None
