"""
Incident Report Schema — Pydantic Models for Gemini Structured Output
=======================================================================
Defines the strict Pydantic models that Gemini's structured output
must conform to. These models serve dual purpose:
    1. Response schema for the Gemini SDK's structured output support
    2. Validation layer ensuring data integrity before database persistence

Models:
    - TimelineEntry: A single timestamped event with MM:SS validation
    - IncidentReport: Complete analysis output including summary, risk, and timeline

Validation:
    - TimelineEntry.timestamp: Strictly validated MM:SS format via regex
    - IncidentReport.risk_evaluation: Restricted to LOW/MEDIUM/HIGH literal
    - Malformed timestamps or unexpected values are rejected with clear errors

Usage:
    from tasks.schemas import IncidentReport

    # Parse Gemini response
    report = IncidentReport.model_validate_json(gemini_response_text)

    # Use as Gemini SDK response_schema
    model.generate_content(..., response_schema=IncidentReport)
"""

import re
from typing import List, Literal

from pydantic import BaseModel, field_validator


# ── Compiled regex for MM:SS format ──────────────────────────────────────────
# Matches 00:00 through 99:59 (allows 2+ digit minutes for long videos)
TIMESTAMP_PATTERN = re.compile(r"^\d{2,}:\d{2}$")


class TimelineEntry(BaseModel):
    """A single timestamped event in the video analysis timeline.

    Attributes:
        timestamp: Video timestamp in strict MM:SS format (e.g., "02:14").
            Validated to reject malformed formats since this drives
            frontend video seeking.
        description: Detailed description of the detected incident
            or activity at this timestamp.

    Example:
        >>> entry = TimelineEntry(timestamp="02:14", description="Vehicle enters frame")
        >>> entry.timestamp
        '02:14'
    """

    timestamp: str
    description: str

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp_format(cls, v: str) -> str:
        """Enforce strict MM:SS timestamp format.

        Rejects malformed timestamps rather than silently accepting them,
        since these values drive frontend video seeking. A bad timestamp
        would cause the video player to seek to an incorrect position.

        Args:
            v: The timestamp string to validate.

        Returns:
            str: The validated timestamp in MM:SS format.

        Raises:
            ValueError: If the timestamp doesn't match MM:SS pattern,
                or if seconds >= 60.

        Examples:
            Valid:   "00:00", "02:14", "120:59"
            Invalid: "2:5", "abc", "02:60", "", "2:05"
        """
        if not TIMESTAMP_PATTERN.match(v):
            raise ValueError(
                f"Timestamp '{v}' does not match required MM:SS format "
                f"(e.g., '02:14'). Minutes and seconds must each be at "
                f"least 2 digits."
            )

        # Validate seconds < 60
        parts = v.split(":")
        seconds = int(parts[1])
        if seconds >= 60:
            raise ValueError(
                f"Timestamp '{v}' has invalid seconds value {seconds}. "
                f"Seconds must be 00–59."
            )

        return v


class IncidentReport(BaseModel):
    """Complete AI-generated incident analysis report.

    Produced by the Gemini model's structured output and validated
    before persistence to the database. Serves as the contract between
    the Gemini response and the ChronologicalLog/VideoCase database models.

    Attributes:
        summary: Concise executive summary of the entire video content,
            suitable for display in the investigation dashboard header.
        risk_evaluation: Overall risk assessment. Must be exactly one of
            "LOW", "MEDIUM", or "HIGH" — unexpected values like "CRITICAL"
            are rejected, not silently coerced.
        timeline: Ordered list of timestamped incidents. Each entry maps
            to a ChronologicalLog row in the database.
        entities_detected: List of specific entities identified in the video
            (e.g., vehicle models, license plates, weapons, subjects of interest).

    Example:
        >>> report = IncidentReport(
        ...     summary="Traffic violation at intersection",
        ...     risk_evaluation="MEDIUM",
        ...     timeline=[
        ...         TimelineEntry(timestamp="00:05", description="Vehicle approaches"),
        ...         TimelineEntry(timestamp="00:12", description="Red light violation"),
        ...     ],
        ...     entities_detected=["White sedan", "License: ABC-1234"],
        ... )
    """

    summary: str
    crime_summary: str | None = None
    risk_evaluation: Literal["LOW", "MEDIUM", "HIGH"]
    timeline: List[TimelineEntry]
    entities_detected: List[str]
