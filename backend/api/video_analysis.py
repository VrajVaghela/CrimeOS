"""
Video Analysis API Router — REST Endpoints
============================================
Provides the core API endpoints for the video incident analyzer:

    POST /api/v1/video/analyze    — Upload a video file for analysis (CKPT-3.1)
    GET  /api/v1/video/status/{task_id} — Poll analysis progress (CKPT-3.2)
    GET  /api/v1/video/report/{case_id} — Retrieve completed report (CKPT-3.3)

Security:
    - File extension validation against ALLOWED_VIDEO_EXTENSIONS
    - Magic byte (file signature) validation to prevent extension spoofing
    - Streaming size check against MAX_UPLOAD_SIZE_MB (rejects before full buffer)
    - MD5 checksum computed during streaming (no full-file memory load)
    - All file operations confined to TEMP_UPLOAD_DIR

Upload Flow:
    1. Validate extension and magic bytes
    2. Stream to disk while checking size and computing MD5
    3. Create VideoCase row (status=UPLOADED)
    4. Append FILE_UPLOADED ledger event
    5. Enqueue analyze_video Celery task
    6. Return case_id + task_id
"""

import hashlib
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database.connection import get_db
from database.models import (
    CaseStatus,
    ChronologicalLog,
    RiskLevel,
    VideoCase,
)
from utils.crypto import LedgerService

logger = logging.getLogger("video-incident-analyzer.api")

router = APIRouter()

# ── Known video file magic bytes (file signatures) ──────────────────────────
# Used to validate actual file content regardless of reported extension
VIDEO_MAGIC_BYTES = {
    # MP4 / MOV / M4V (ftyp box)
    b"\x00\x00\x00\x18ftypmp4",
    b"\x00\x00\x00\x18ftypisom",
    b"\x00\x00\x00\x1cftypisom",
    b"\x00\x00\x00\x20ftypisom",
    b"\x00\x00\x00\x18ftypMSNV",
    b"\x00\x00\x00\x1cftypmp42",
    b"\x00\x00\x00\x14ftypisom",
    b"\x00\x00\x00\x1cftypMSNV",
    # AVI (RIFF....AVI)
    b"RIFF",
    # MOV (various ftyp)
    b"\x00\x00\x00\x14ftypqt",
}

# Minimum prefix bytes to check for magic byte identification
MAGIC_BYTE_READ_SIZE = 32


def _is_valid_video_signature(header: bytes) -> bool:
    """Check if file header bytes match known video format signatures.

    Validates the actual file content to prevent extension spoofing
    (e.g., an .exe renamed to .mp4 with a spoofed content-type).

    Args:
        header: First 32 bytes of the file.

    Returns:
        bool: True if the header matches a known video format signature.
    """
    # Check for ftyp box (MP4/MOV family) — variable position
    if b"ftyp" in header[:32]:
        return True
    # Check for RIFF header (AVI)
    if header[:4] == b"RIFF" and b"AVI" in header[:12]:
        return True
    return False


# ── Response Models ──────────────────────────────────────────────────────────
class UploadResponse(BaseModel):
    """Response from a successful video upload.

    Attributes:
        case_id: UUID of the created VideoCase.
        task_id: Celery task ID for status polling.
        status: Initial status (always "UPLOADED").
    """
    case_id: str
    task_id: str
    status: str = "UPLOADED"


class StatusResponse(BaseModel):
    """Response from the status polling endpoint.

    Attributes:
        task_id: The Celery task ID being polled.
        case_id: The associated VideoCase UUID.
        celery_state: Current Celery task state.
        video_case_status: Current VideoCase status from the database.
        progress_percentage: Completion percentage (0-100).
        error_detail: Error message if the task/case has failed.
    """
    task_id: str
    case_id: Optional[str] = None
    celery_state: str
    video_case_status: Optional[str] = None
    progress_percentage: int = 0
    error_detail: Optional[str] = None


class TimelineEntryResponse(BaseModel):
    """A single timeline entry in the report response.

    Attributes:
        timestamp_in_video: Display timestamp (MM:SS format).
        timestamp_seconds: Numeric seconds for video seeking.
        description: Incident description at this timestamp.
        entities_detected: List of detected entities.
        risk_level: Risk assessment for this entry.
        sequence_order: Display ordering integer.
    """
    timestamp_in_video: str
    timestamp_seconds: float
    description: str
    entities_detected: Optional[list] = None
    risk_level: str
    sequence_order: int


class ReportResponse(BaseModel):
    """Full report response including case details, timeline, and chain validity.

    Attributes:
        case_id: UUID of the video case.
        filename: Original uploaded filename.
        original_md5: MD5 checksum of the uploaded file.
        duration_seconds: Video duration in seconds.
        file_size_bytes: File size in bytes.
        status: Current case status.
        risk_evaluation: Overall risk assessment.
        summary: AI-generated executive summary.
        created_at: Case creation timestamp.
        timeline: Ordered list of chronological log entries.
        chain_valid: True if the tamper-evident chain is intact.
    """
    case_id: str
    filename: str
    original_md5: str
    duration_seconds: Optional[float] = None
    file_size_bytes: int
    status: str
    risk_evaluation: Optional[str] = None
    summary: Optional[str] = None
    crime_summary: Optional[str] = None
    created_at: str
    timeline: list[TimelineEntryResponse]
    chain_valid: bool


# ══════════════════════════════════════════════════════════════════════════════
# CKPT-3.1 — Upload Endpoint
# ══════════════════════════════════════════════════════════════════════════════
@router.post(
    "/analyze",
    response_model=UploadResponse,
    status_code=200,
    summary="Upload a video file for AI-powered incident analysis",
    responses={
        413: {"description": "File exceeds maximum upload size"},
        415: {"description": "Unsupported file type or spoofed extension"},
        429: {"description": "Rate limit exceeded (5 uploads/minute per IP)"},
    },
)
async def upload_video(
    request: Request,
    file: UploadFile = File(..., description="Video file to analyze"),
    db: AsyncSession = Depends(get_db),
):
    """Upload a video file and enqueue it for AI-powered analysis.

    Performs streaming validation of file size, extension, and magic bytes
    before creating a database record and dispatching the analysis task.

    The file is streamed to disk (not loaded into memory) while computing
    an MD5 checksum incrementally.

    Args:
        file: The uploaded video file (multipart/form-data).
        db: Injected database session.

    Returns:
        UploadResponse: Contains case_id, task_id, and initial status.

    Raises:
        HTTPException(413): If file exceeds MAX_UPLOAD_SIZE_MB.
        HTTPException(415): If file extension is disallowed or magic bytes don't match.
    """
    settings = get_settings()

    # ── Validate file extension ──────────────────────────────────────────
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                f"File extension '{ext}' is not allowed. "
                f"Accepted formats: {', '.join(settings.ALLOWED_VIDEO_EXTENSIONS)}"
            ),
        )

    # ── Stream to disk with size check and MD5 computation ───────────────
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    upload_dir = settings.TEMP_UPLOAD_DIR
    os.makedirs(upload_dir, mode=0o700, exist_ok=True)

    # Generate a unique filename to avoid collisions
    import uuid

    temp_filename = f"{uuid.uuid4().hex}{ext}"
    temp_filepath = os.path.join(upload_dir, temp_filename)

    md5_hash = hashlib.md5()
    bytes_written = 0
    header_bytes = b""
    header_validated = False

    try:
        with open(temp_filepath, "wb") as f:
            chunk_size = 64 * 1024  # 64KB chunks

            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break

                # ── Validate magic bytes on first chunk ──────────────
                if not header_validated:
                    header_bytes += chunk
                    if len(header_bytes) >= MAGIC_BYTE_READ_SIZE:
                        if not _is_valid_video_signature(header_bytes[:MAGIC_BYTE_READ_SIZE]):
                            # Clean up and reject
                            f.close()
                            os.remove(temp_filepath)
                            raise HTTPException(
                                status_code=415,
                                detail=(
                                    "File content does not match a valid video format. "
                                    "The file may have a spoofed extension."
                                ),
                            )
                        header_validated = True

                bytes_written += len(chunk)

                # ── Reject oversized uploads before fully buffering ──
                if bytes_written > max_bytes:
                    f.close()
                    os.remove(temp_filepath)
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"File exceeds maximum upload size of "
                            f"{settings.MAX_UPLOAD_SIZE_MB} MB. Upload rejected."
                        ),
                    )

                f.write(chunk)
                md5_hash.update(chunk)

    except HTTPException:
        raise
    except Exception as e:
        # Clean up on any unexpected error
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        logger.error(f"Upload failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

    original_md5 = md5_hash.hexdigest()

    # ── Create VideoCase record ──────────────────────────────────────────
    case = VideoCase(
        filename=filename,
        original_md5=original_md5,
        file_size_bytes=bytes_written,
        status=CaseStatus.UPLOADED,
    )
    db.add(case)
    await db.flush()  # Assign the server-generated UUID

    case_id = str(case.id)

    # ── Append FILE_UPLOADED ledger event ────────────────────────────────
    ledger = LedgerService()
    await ledger.append_ledger_event(
        session=db,
        case_id=case_id,
        event_type="FILE_UPLOADED",
        payload={
            "filename": filename,
            "original_md5": original_md5,
            "file_size_bytes": bytes_written,
        },
    )

    # ── Enqueue Celery analysis task ─────────────────────────────────────
    from tasks.video_tasks import analyze_video

    result = analyze_video.delay(case_id=case_id, filepath=temp_filepath)
    task_id = result.id

    # Store task_id on the case for cross-referencing
    await db.execute(
        update(VideoCase)
        .where(VideoCase.id == case_id)
        .values(celery_task_id=task_id)
    )

    logger.info(
        f"Video uploaded: case={case_id}, task={task_id}, "
        f"file={filename}, size={bytes_written}, md5={original_md5}"
    )

    return UploadResponse(case_id=case_id, task_id=task_id)


# ══════════════════════════════════════════════════════════════════════════════
# CKPT-3.2 — Status Polling Endpoint
# ══════════════════════════════════════════════════════════════════════════════
@router.get(
    "/status/{task_id}",
    response_model=StatusResponse,
    summary="Poll the status of a video analysis task",
    responses={
        404: {"description": "Task ID not found"},
    },
)
async def get_status(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Poll the progress of a video analysis task.

    Cross-references Celery's AsyncResult with the VideoCase database record
    to provide comprehensive status including phase, progress percentage,
    and error details if the task has failed.

    Args:
        task_id: The Celery task ID returned by the upload endpoint.
        db: Injected database session.

    Returns:
        StatusResponse: Current task and case status with progress details.

    Raises:
        HTTPException(404): If no VideoCase exists with this task_id.
    """
    from celery.result import AsyncResult
    from tasks import celery_app

    # ── Query Celery for task state ──────────────────────────────────────
    result = AsyncResult(task_id, app=celery_app)
    try:
        celery_state = result.state
    except ValueError as e:
        if "Exception information" in str(e):
            celery_state = "FAILURE"
        else:
            raise

    # ── Look up the VideoCase by task_id ─────────────────────────────────
    case_result = await db.execute(
        select(VideoCase)
        .where(VideoCase.celery_task_id == task_id)
    )
    case = case_result.scalar_one_or_none()

    if case is None and celery_state == "PENDING":
        # Task doesn't exist at all (not just pending)
        raise HTTPException(
            status_code=404,
            detail=f"No analysis task found with ID '{task_id}'"
        )

    # ── Extract progress from Celery task meta ───────────────────────────
    progress = 0
    error_detail = None
    case_id = str(case.id) if case else None
    case_status = case.status.value if case else None

    if celery_state == "PROGRESS":
        meta = result.info or {}
        progress = meta.get("progress", 0)
    elif celery_state == "SUCCESS":
        progress = 100
    elif celery_state == "FAILURE":
        try:
            error_info = result.info
        except ValueError:
            error_info = None
        if isinstance(error_info, dict):
            error_detail = error_info.get("error", str(error_info))
        elif isinstance(error_info, Exception):
            error_detail = str(error_info)
        else:
            error_detail = str(error_info) if error_info else "Unknown error"

    # Also check ledger for FAILED cases error detail
    if case and case.status == CaseStatus.FAILED and not error_detail:
        from database.models import LedgerEntry, LedgerEventType

        failed_event = await db.execute(
            select(LedgerEntry)
            .where(
                LedgerEntry.case_id == case.id,
                LedgerEntry.event_type == LedgerEventType.ANALYSIS_FAILED,
            )
            .order_by(LedgerEntry.id.desc())
            .limit(1)
        )
        failed_entry = failed_event.scalar_one_or_none()
        if failed_entry and failed_entry.payload_snapshot:
            error_detail = failed_entry.payload_snapshot.get("reason", "Unknown failure")

    return StatusResponse(
        task_id=task_id,
        case_id=case_id,
        celery_state=celery_state,
        video_case_status=case_status,
        progress_percentage=progress,
        error_detail=error_detail,
    )


# ══════════════════════════════════════════════════════════════════════════════
# CKPT-3.3 — Report Retrieval Endpoint
# ══════════════════════════════════════════════════════════════════════════════
@router.get(
    "/report/{case_id}",
    response_model=ReportResponse,
    summary="Retrieve the completed analysis report with chain-of-custody status",
    responses={
        404: {"description": "Case ID not found"},
        425: {"description": "Analysis not yet completed (Too Early)"},
    },
)
async def get_report(
    case_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the full analysis report for a completed video case.

    Returns the VideoCase metadata, ordered ChronologicalLog timeline entries,
    and the result of chain-of-custody verification. If the case exists but
    analysis is not yet complete, returns 425 (Too Early) to distinguish from
    a hard error.

    Args:
        case_id: UUID of the VideoCase to retrieve.
        db: Injected database session.

    Returns:
        ReportResponse: Full report with timeline and chain validity.

    Raises:
        HTTPException(404): If case_id doesn't exist.
        HTTPException(425): If analysis is still in progress (not COMPLETED).
    """
    # ── Fetch the VideoCase ──────────────────────────────────────────────
    case_result = await db.execute(
        select(VideoCase).where(VideoCase.id == case_id)
    )
    case = case_result.scalar_one_or_none()

    if case is None:
        raise HTTPException(
            status_code=404,
            detail=f"No video case found with ID '{case_id}'"
        )

    # ── Check completion status ──────────────────────────────────────────
    if case.status not in (CaseStatus.COMPLETED, CaseStatus.FAILED):
        return JSONResponse(
            status_code=425,
            content={
                "detail": (
                    f"Analysis is not yet complete. Current status: "
                    f"{case.status.value}. Please poll the status endpoint."
                ),
                "case_id": case_id,
                "status": case.status.value,
            },
        )

    # ── Fetch ordered timeline entries ───────────────────────────────────
    timeline_result = await db.execute(
        select(ChronologicalLog)
        .where(ChronologicalLog.case_id == case_id)
        .order_by(ChronologicalLog.sequence_order.asc())
    )
    timeline_rows = timeline_result.scalars().all()

    # ── Verify chain-of-custody ──────────────────────────────────────────
    ledger = LedgerService()
    chain_valid = await ledger.verify_case_chain(db, case_id)

    # ── Build response ───────────────────────────────────────────────────
    timeline = [
        TimelineEntryResponse(
            timestamp_in_video=row.timestamp_in_video,
            timestamp_seconds=row.timestamp_seconds,
            description=row.description,
            entities_detected=row.entities_detected,
            risk_level=row.risk_level.value if isinstance(row.risk_level, RiskLevel) else row.risk_level,
            sequence_order=row.sequence_order,
        )
        for row in timeline_rows
    ]

    return ReportResponse(
        case_id=str(case.id),
        filename=case.filename,
        original_md5=case.original_md5,
        duration_seconds=case.duration_seconds,
        file_size_bytes=case.file_size_bytes,
        status=case.status.value,
        risk_evaluation=case.risk_evaluation.value if case.risk_evaluation else None,
        summary=case.summary,
        crime_summary=case.crime_summary,
        created_at=case.created_at.isoformat(),
        timeline=timeline,
        chain_valid=chain_valid,
    )
