import os
import uuid
import hashlib
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import AuthorizationError
from app.models import User, UserRole, Case, EvidenceFile, EvidenceMarker
from app.schemas.video import UploadResponse, StatusResponse, ReportResponse, TimelineEntryResponse
from app.services.video_service import LedgerService, analyze_video_task

logger = logging.getLogger("crime_os.routers.video")

router = APIRouter(prefix="/video", tags=["video-incident-analyzer"])

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}
MAGIC_BYTE_READ_SIZE = 32


def _ensure_case_access(case: Case | None, current_user: User) -> Case:
    if not case:
        raise HTTPException(status_code=404, detail="Video case not found")
    if current_user.role == UserRole.IO and case.created_by != current_user.id:
        raise AuthorizationError("You do not have access to this case")
    return case

def _is_valid_video_signature(header: bytes) -> bool:
    """Check if file header bytes match known video signatures."""
    if b"ftyp" in header[:32]:
        return True
    if header[:4] == b"RIFF" and b"AVI" in header[:12]:
        return True
    # Quick MOV/MP4 fallback signatures
    if header[:4] in (b"\x00\x00\x00\x18", b"\x00\x00\x00\x1c", b"\x00\x00\x00\x20", b"\x00\x00\x00\x14"):
        return True
    return False


@router.post("/analyze", response_model=UploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    case_id: str = Form(..., description="UUID of the parent case"),
    file: UploadFile = File(..., description="Video file to analyze"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a video file for background forensic incident analysis."""
    # 1. Validate parent case
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid case ID format")
        
    _ensure_case_access(db.get(Case, case_uuid), current_user)

    # 2. Validate file extension
    filename = file.filename or "unknown.mp4"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
        )

    # 3. Stream to disk and compute SHA-256
    max_upload_size_mb = getattr(settings, "MAX_UPLOAD_SIZE_MB", 2000)
    max_bytes = max_upload_size_mb * 1024 * 1024
    
    # Save in standard uploads directory
    evidence_dir = os.path.join(settings.UPLOAD_DIR, "evidence", str(case_uuid))
    os.makedirs(evidence_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4()}{ext}"
    temp_filepath = os.path.join(evidence_dir, stored_name)

    sha256_hash = hashlib.sha256()
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

                # Validate magic bytes on first chunk
                if not header_validated:
                    header_bytes += chunk
                    if len(header_bytes) >= MAGIC_BYTE_READ_SIZE:
                        if not _is_valid_video_signature(header_bytes[:MAGIC_BYTE_READ_SIZE]):
                            f.close()
                            if os.path.exists(temp_filepath):
                                os.remove(temp_filepath)
                            raise HTTPException(
                                status_code=415,
                                detail="Invalid video signature. Suspicious/spoofed extension detected."
                            )
                        header_validated = True

                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    f.close()
                    if os.path.exists(temp_filepath):
                        os.remove(temp_filepath)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum size limit of {max_upload_size_mb} MB"
                    )

                f.write(chunk)
                sha256_hash.update(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        logger.error(f"Failed during file streaming: {e}")
        raise HTTPException(status_code=500, detail="Failed to write file to disk")

    original_sha256 = sha256_hash.hexdigest()
    relative_path = os.path.join("uploads", "evidence", str(case_uuid), stored_name).replace("\\", "/")

    # 4. Create EvidenceFile record with UPLOADED state in ai_tags
    evidence_record = EvidenceFile(
        case_id=case_uuid,
        file_path=relative_path,
        file_type="video",
        ai_tags={
            "video_status": "UPLOADED",
            "progress_percentage": 0,
            "error_detail": None,
            "original_sha256": original_sha256,
            "description": f"Video evidence: {filename} (awaiting AI analysis)",
            "summary": None,
            "crime_summary": None,
            "risk_evaluation": None,
            "confidence": 0.0,
            "tags": ["video", "cctv"],
            "timeline": []
        }
    )
    db.add(evidence_record)
    db.flush()

    evidence_id = evidence_record.id

    # 5. Append first ledger/audit event
    ledger = LedgerService()
    ledger.append_ledger_event(
        db=db,
        case_id=case_uuid,
        event_type="FILE_UPLOADED",
        payload={
            "evidence_id": str(evidence_id),
            "filename": filename,
            "original_sha256": original_sha256,
            "file_size_bytes": bytes_written
        },
        user_id=current_user.id,
    )
    db.commit()

    # 6. Dispatch background analysis task via FastAPI BackgroundTasks
    background_tasks.add_task(analyze_video_task, evidence_id=evidence_id, filepath=temp_filepath, actor_id=current_user.id)
    
    # Return response matching the schema
    return UploadResponse(
        case_id=str(evidence_id),
        task_id=str(evidence_id),
        status="UPLOADED"
    )


@router.get("/status/{task_id}", response_model=StatusResponse)
async def get_status(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StatusResponse:
    """Poll the current progress and status of the video analysis task."""
    evidence = db.get(EvidenceFile, task_id)
    if not evidence or evidence.file_type != "video":
        raise HTTPException(
            status_code=404,
            detail=f"No video analysis task found with ID '{task_id}'"
        )
    _ensure_case_access(db.get(Case, evidence.case_id), current_user)

    ai_tags = evidence.ai_tags or {}
    video_status = ai_tags.get("video_status", "UPLOADED")
    progress = ai_tags.get("progress_percentage", 0)
    error_detail = ai_tags.get("error_detail")

    processing_state = "processing"
    if video_status == "UPLOADED":
        processing_state = "queued"
    if video_status == "COMPLETED":
        processing_state = "completed"
        progress = 100
    elif video_status == "FAILED":
        processing_state = "failed"
        progress = 100

    return StatusResponse(
        task_id=str(task_id),
        case_id=str(task_id),
        processing_state=processing_state,
        video_case_status=video_status,
        progress_percentage=progress,
        error_detail=error_detail
    )


@router.get("/report/{case_id}", response_model=ReportResponse)
async def get_report(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReportResponse | JSONResponse:
    """Retrieve the completed video analysis report with chain-of-custody validation."""
    evidence = db.get(EvidenceFile, case_id)
    if not evidence or evidence.file_type != "video":
        raise HTTPException(
            status_code=404,
            detail=f"Video evidence file '{case_id}' not found"
        )
    _ensure_case_access(db.get(Case, evidence.case_id), current_user)

    ai_tags = evidence.ai_tags or {}
    status = ai_tags.get("video_status", "UPLOADED")

    if status not in ("COMPLETED", "FAILED"):
        return JSONResponse(
            status_code=425,
            content={
                "detail": f"Analysis is in progress. Current status: {status}.",
                "case_id": str(case_id),
                "status": status
            }
        )

    # Fetch markers for timeline
    markers = db.scalars(
        select(EvidenceMarker)
        .where(
            EvidenceMarker.evidence_file_id == case_id,
            EvidenceMarker.marker_type == "video_timestamp"
        )
        .order_by(EvidenceMarker.start_ms.asc())
    ).all()

    timeline = []
    if markers:
        for idx, m in enumerate(markers):
            timestamp_seconds = (m.start_ms or 0) / 1000.0
            minutes = int(timestamp_seconds // 60)
            seconds = int(timestamp_seconds % 60)
            timestamp_str = f"{minutes:02d}:{seconds:02d}"
            timeline.append(TimelineEntryResponse(
                timestamp_in_video=timestamp_str,
                timestamp_seconds=timestamp_seconds,
                description=m.transcript_text or "",
                entities_detected=ai_tags.get("entities_detected", []) if idx == 0 else [],
                risk_level=ai_tags.get("risk_evaluation", "MEDIUM"),
                sequence_order=idx
            ))
    elif "timeline" in ai_tags and isinstance(ai_tags["timeline"], list):
        for idx, entry in enumerate(ai_tags["timeline"]):
            if isinstance(entry, dict):
                t_str = entry.get("timestamp_in_video") or entry.get("timestamp") or "00:00"
                t_sec = entry.get("timestamp_seconds")
                if t_sec is None:
                    try:
                        parts = t_str.split(":")
                        if len(parts) == 2:
                            t_sec = float(int(parts[0]) * 60 + int(parts[1]))
                        elif len(parts) == 3:
                            t_sec = float(int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2]))
                        else:
                            t_sec = 0.0
                    except Exception:
                        t_sec = 0.0
                timeline.append(TimelineEntryResponse(
                    timestamp_in_video=t_str,
                    timestamp_seconds=float(t_sec),
                    description=entry.get("description", ""),
                    entities_detected=ai_tags.get("entities_detected", []) if idx == 0 else [],
                    risk_level=ai_tags.get("risk_evaluation", "MEDIUM"),
                    sequence_order=idx
                ))

    # Verify chain of custody
    ledger = LedgerService()
    chain_valid = ledger.verify_case_chain(db, evidence.case_id)

    # Get clean original filename
    full_path = evidence.file_path
    filename = os.path.basename(full_path)
    # Check if there is a prefix UUID
    if "_" in filename:
        filename = filename.split("_", 1)[1]

    # Calculate file size
    file_size = 0
    local_path = os.path.join(settings.UPLOAD_DIR, full_path.replace("uploads/", ""))
    if os.path.exists(local_path):
        file_size = os.path.getsize(local_path)

    return ReportResponse(
        case_id=str(evidence.id),
        filename=filename,
        original_sha256=ai_tags.get("original_sha256", ""),
        duration_seconds=ai_tags.get("duration_seconds"),
        file_size_bytes=file_size,
        status=status,
        risk_evaluation=ai_tags.get("risk_evaluation"),
        summary=ai_tags.get("summary"),
        crime_summary=ai_tags.get("crime_summary"),
        created_at=evidence.uploaded_at.isoformat(),
        timeline=timeline,
        chain_valid=chain_valid
    )
