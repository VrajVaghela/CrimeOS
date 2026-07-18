import re
import uuid
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, field_validator


# Compiled regex for MM:SS format (e.g. 02:14)
TIMESTAMP_PATTERN = re.compile(r"^\d{2,}:\d{2}$")


class TimelineEntry(BaseModel):
    """A single timestamped event in the video analysis timeline."""
    timestamp: str
    description: str

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp_format(cls, v: str) -> str:
        if not TIMESTAMP_PATTERN.match(v):
            raise ValueError(
                f"Timestamp '{v}' does not match required MM:SS format (e.g., '02:14')."
            )
        parts = v.split(":")
        seconds = int(parts[1])
        if seconds >= 60:
            raise ValueError(
                f"Timestamp '{v}' has invalid seconds value {seconds}. Must be 00–59."
            )
        return v


class IncidentReport(BaseModel):
    """Complete AI-generated incident analysis report schema."""
    summary: str
    crime_summary: Optional[str] = None
    risk_evaluation: Literal["LOW", "MEDIUM", "HIGH"]
    timeline: List[TimelineEntry]
    entities_detected: List[str]


class UploadResponse(BaseModel):
    """Response from a successful video upload."""
    case_id: str
    task_id: str
    status: str = "UPLOADED"


ProcessingState = Literal["queued", "processing", "completed", "failed"]


class StatusResponse(BaseModel):
    """Response from the status polling endpoint."""
    task_id: str
    case_id: Optional[str] = None
    processing_state: ProcessingState
    video_case_status: Optional[str] = None
    progress_percentage: int = 0
    error_detail: Optional[str] = None


class TimelineEntryResponse(BaseModel):
    """A single timeline entry in the report response."""
    timestamp_in_video: str
    timestamp_seconds: float
    description: str
    entities_detected: Optional[List[str]] = None
    risk_level: str
    sequence_order: int


class ReportResponse(BaseModel):
    """Full report response including case details, timeline, and chain validity."""
    case_id: str
    filename: str
    original_sha256: str
    duration_seconds: Optional[float] = None
    file_size_bytes: int
    status: str
    risk_evaluation: Optional[str] = None
    summary: Optional[str] = None
    crime_summary: Optional[str] = None
    created_at: str
    timeline: List[TimelineEntryResponse]
    chain_valid: bool
