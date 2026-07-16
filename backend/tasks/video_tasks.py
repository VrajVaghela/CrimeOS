"""
Video Analysis Tasks — Celery Task Pipeline for Gemini Video Processing
=========================================================================
Implements the full asynchronous video analysis pipeline as a Celery task:

    Phase A — Upload & Poll:
        Upload video to Google Gemini, poll for ACTIVE status with
        exponential backoff, handle timeouts and transient errors.

    Phase B — Prompted Generation:
        Send the active video to Gemini with a structured prompt requesting
        incident timeline, risk evaluation, and entity detection. Parse
        the response into the IncidentReport Pydantic model.

    Phase C — Context Caching (Long Videos):
        For videos > 600 seconds, create a Gemini context cache to reduce
        cost and improve latency on subsequent operations.

    Phase D — Erasure & Close-Out:
        Delete the video from Gemini storage, clean up local temp files,
        and finalize the tamper-evident ledger chain.

Progress Tracking:
    The task updates Celery state with progress percentages at each phase
    transition, enabling real-time progress polling via the status endpoint.

Error Handling:
    - Transient errors (rate limits, timeouts) → exponential backoff retry
    - Parsing failures → one retry with corrective prompt before FAILED
    - Deletion failures → logged but don't undo completed analysis
    - All state transitions recorded in the tamper-evident ledger
"""

import asyncio
import json
import logging
import os
import subprocess
import time
from typing import Optional

from celery import states

from tasks import celery_app
from tasks.schemas import IncidentReport

logger = logging.getLogger("video-incident-analyzer.tasks")


def _get_video_duration(filepath: str) -> Optional[float]:
    """Extract video duration in seconds using ffprobe.

    Uses ffprobe (bundled with ffmpeg) to read the video container
    metadata without decoding the full stream.

    Args:
        filepath: Absolute path to the video file.

    Returns:
        float | None: Duration in seconds, or None if extraction fails.

    Note:
        Does not log the full ffprobe command to avoid leaking file paths
        in production logs. Only logs success/failure status.
    """
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                filepath,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            duration = float(data["format"]["duration"])
            logger.info(f"Video duration extracted: {duration:.1f}s")
            return duration
    except Exception as e:
        logger.warning(f"Failed to extract video duration: {type(e).__name__}")
    return None


def _parse_timestamp_to_seconds(timestamp: str) -> float:
    """Convert MM:SS timestamp string to seconds.

    Args:
        timestamp: Timestamp in MM:SS format (already validated by Pydantic).

    Returns:
        float: The timestamp as total seconds.

    Example:
        >>> _parse_timestamp_to_seconds("02:14")
        134.0
    """
    parts = timestamp.split(":")
    return float(int(parts[0]) * 60 + int(parts[1]))


_worker_loop = None

def _run_async(coro):
    """Run an async coroutine from synchronous Celery task context.

    Reuses a single event loop per worker process to maintain compatibility
    with SQLAlchemy's async engine connection pooling.

    Args:
        coro: The coroutine to execute.

    Returns:
        The result of the coroutine.
    """
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_worker_loop)
    return _worker_loop.run_until_complete(coro)


@celery_app.task(
    bind=True,
    name="tasks.analyze_video",
    max_retries=0,  # We handle retries internally, not via Celery's retry mechanism
    acks_late=True,  # Acknowledge after completion (crash safety)
)
def analyze_video(self, case_id: str, filepath: str) -> dict:
    """Main video analysis pipeline task.

    Orchestrates the full analysis lifecycle: upload to Gemini, wait for
    processing, extract incident timeline via structured prompting, persist
    results, and clean up uploaded files.

    Args:
        self: Celery task instance (bound task for state updates).
        case_id: UUID of the VideoCase to analyze.
        filepath: Absolute path to the uploaded video file on disk.

    Returns:
        dict: Completion summary with keys:
            - case_id (str): The analyzed case UUID
            - status (str): Final status ("COMPLETED" or "FAILED")
            - summary (str | None): Brief result summary

    Raises:
        SoftTimeLimitExceeded: If the task exceeds the soft time limit.
    """
    logger.info(f"Starting analysis for case {case_id}")

    # ── Phase 0: Setup ───────────────────────────────────────────────────
    self.update_state(
        state="PROGRESS",
        meta={"phase": "INITIALIZING", "progress": 0, "case_id": case_id},
    )

    try:
        _run_async(_async_analyze_video(self, case_id, filepath))
        return {"case_id": case_id, "status": "COMPLETED"}
    except Exception as e:
        logger.error(f"Analysis failed for case {case_id}: {e}", exc_info=True)
        _run_async(_mark_case_failed(case_id, str(e)))
        raise e


async def _mark_case_failed(case_id: str, reason: str) -> None:
    """Mark a video case as FAILED and record the failure in the ledger.

    Args:
        case_id: UUID of the video case.
        reason: Human-readable failure reason.
    """
    from database.connection import get_db_session
    from database.models import CaseStatus, VideoCase
    from utils.crypto import LedgerService

    try:
        async with get_db_session() as session:
            from sqlalchemy import update

            await session.execute(
                update(VideoCase)
                .where(VideoCase.id == case_id)
                .values(status=CaseStatus.FAILED)
            )

            ledger = LedgerService()
            await ledger.append_ledger_event(
                session=session,
                case_id=case_id,
                event_type="ANALYSIS_FAILED",
                payload={"reason": reason[:500]},  # Truncate long error messages
            )
    except Exception as e:
        logger.error(f"Failed to mark case {case_id} as FAILED: {e}")


async def _async_analyze_video(task, case_id: str, filepath: str) -> None:
    """Async implementation of the video analysis pipeline.

    Separated from the Celery task to allow async database and SDK operations.

    Args:
        task: Celery task instance for state updates.
        case_id: UUID of the VideoCase.
        filepath: Path to the video file.
    """
    from database.connection import get_db_session
    from database.models import (
        CaseStatus,
        ChronologicalLog,
        RiskLevel,
        VideoCase,
    )
    from utils.crypto import LedgerService
    from config import get_settings
    from sqlalchemy import update

    settings = get_settings()
    ledger = LedgerService()

    # ── Extract duration via ffprobe ─────────────────────────────────────
    duration = _get_video_duration(filepath)

    # ── Update case to PROCESSING and store duration ─────────────────────
    async with get_db_session() as session:
        await session.execute(
            update(VideoCase)
            .where(VideoCase.id == case_id)
            .values(
                status=CaseStatus.PROCESSING,
                duration_seconds=duration,
            )
        )
        await ledger.append_ledger_event(
            session=session,
            case_id=case_id,
            event_type="ANALYSIS_STARTED",
            payload={
                "filepath_hash": case_id,  # Don't log actual paths
                "duration_seconds": duration,
            },
        )

    task.update_state(
        state="PROGRESS",
        meta={"phase": "UPLOADING", "progress": 10, "case_id": case_id},
    )

    # ══════════════════════════════════════════════════════════════════════
    # PHASE A — Upload to Gemini & Poll for ACTIVE status
    # ══════════════════════════════════════════════════════════════════════
    from google import genai

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Upload the video file
    logger.info(f"Uploading video to Gemini for case {case_id}")
    try:
        gemini_file = client.files.upload(file=filepath)
    except Exception as e:
        raise RuntimeError(f"Gemini upload failed: {type(e).__name__}") from e

    gemini_file_uri = gemini_file.name

    # Record upload in ledger
    async with get_db_session() as session:
        await session.execute(
            update(VideoCase)
            .where(VideoCase.id == case_id)
            .values(gemini_file_uri=gemini_file_uri)
        )
        await ledger.append_ledger_event(
            session=session,
            case_id=case_id,
            event_type="GEMINI_UPLOAD_COMPLETE",
            payload={"gemini_file_uri": gemini_file_uri},
        )

    task.update_state(
        state="PROGRESS",
        meta={"phase": "PROCESSING_UPLOAD", "progress": 25, "case_id": case_id},
    )

    # ── Poll for ACTIVE status with exponential backoff ──────────────────
    poll_interval = settings.GEMINI_POLL_INTERVAL_SECONDS
    max_interval = settings.GEMINI_POLL_MAX_INTERVAL_SECONDS
    max_wait = settings.GEMINI_POLL_MAX_WAIT_SECONDS
    elapsed = 0

    while elapsed < max_wait:
        try:
            gemini_file = client.files.get(name=gemini_file_uri)
        except Exception as e:
            # Transient error — apply backoff and retry
            logger.warning(
                f"Transient error polling Gemini file status: {type(e).__name__}. "
                f"Retrying in {poll_interval}s..."
            )
            time.sleep(poll_interval)
            elapsed += poll_interval
            poll_interval = min(poll_interval * 2, max_interval)
            continue

        state = gemini_file.state
        logger.info(f"Gemini file state for case {case_id}: {state}")

        if hasattr(state, "name"):
            state_name = state.name
        else:
            state_name = str(state)

        if state_name == "ACTIVE":
            break
        elif state_name == "FAILED":
            raise RuntimeError("Gemini file processing failed — file rejected")

        # Still PROCESSING — wait and poll again
        time.sleep(poll_interval)
        elapsed += poll_interval
        poll_interval = min(poll_interval * 2, max_interval)

        # Update progress proportionally during polling
        poll_progress = min(25 + int((elapsed / max_wait) * 25), 49)
        task.update_state(
            state="PROGRESS",
            meta={
                "phase": "WAITING_GEMINI",
                "progress": poll_progress,
                "case_id": case_id,
            },
        )
    else:
        raise RuntimeError(
            f"Gemini file processing timed out after {max_wait} seconds"
        )

    # ── Update case to ACTIVE_ANALYSIS ───────────────────────────────────
    async with get_db_session() as session:
        await session.execute(
            update(VideoCase)
            .where(VideoCase.id == case_id)
            .values(status=CaseStatus.ACTIVE_ANALYSIS)
        )

    task.update_state(
        state="PROGRESS",
        meta={"phase": "ANALYZING", "progress": 50, "case_id": case_id},
    )

    # ══════════════════════════════════════════════════════════════════════
    # PHASE C — Context Caching for Long Videos (before Phase B)
    # ══════════════════════════════════════════════════════════════════════
    cache_handle = None
    use_cache = duration is not None and duration > 600

    if use_cache:
        logger.info(
            f"Video duration {duration:.0f}s exceeds 600s — using context cache"
        )
        try:
            cache = client.caches.create(
                model=settings.GEMINI_MODEL,
                contents=[gemini_file],
                config={
                    "ttl": f"{min(int(duration * 2), 3600)}s",
                    "display_name": f"case-{case_id[:8]}",
                },
            )
            cache_handle = cache
            logger.info(f"Context cache created for case {case_id}")
        except Exception as e:
            logger.warning(
                f"Context cache creation failed, falling back to direct: "
                f"{type(e).__name__}"
            )
            use_cache = False

    # Record caching decision in ledger
    async with get_db_session() as session:
        await ledger.append_ledger_event(
            session=session,
            case_id=case_id,
            event_type="ANALYSIS_STARTED",
            payload={
                "model": settings.GEMINI_MODEL,
                "cached": use_cache,
                "duration_seconds": duration,
            },
        )

    # ══════════════════════════════════════════════════════════════════════
    # PHASE B — Prompted Analysis with Structured Output
    # ══════════════════════════════════════════════════════════════════════
    analysis_prompt = """You are a forensic video analyst for law enforcement. Analyze this video thoroughly and provide:

1. **Executive Summary**: A concise summary of the entire video content, focusing on any incidents, suspicious activities, or noteworthy events.

2. **Crime Summary**: A specific summary of any crime that occurred in the video. If no crime occurred, this should be null.

3. **Risk Evaluation**: Assess the overall risk level as exactly one of: LOW, MEDIUM, or HIGH.
   - LOW: No threats, routine activity, no concerns
   - MEDIUM: Potential threats, suspicious behavior, requires attention
   - HIGH: Active threats, criminal activity, weapons visible, immediate danger

3. **Chronological Timeline**: Provide a strict chronological timeline of events with timestamps in MM:SS format. Each entry should describe what is happening at that specific moment. Include ALL significant events, even if they seem minor.

4. **Entities Detected**: List all specific entities you can identify including:
   - Vehicle types, makes, models, and colors
   - License plate numbers (even partial)
   - Weapons or dangerous objects
   - Persons of interest (describe by appearance/clothing)
   - Locations, signage, or landmarks visible

Be precise with timestamps. Every timestamp MUST be in MM:SS format (e.g., 00:05, 02:14, 10:30). Do not use single-digit formats like 2:5."""

    report: Optional[IncidentReport] = None
    retry_count = 0
    max_retries = 1

    while retry_count <= max_retries:
        try:
            # Build generation config
            generation_config = {
                "response_mime_type": "application/json",
                "response_schema": IncidentReport,
            }

            if use_cache and cache_handle:
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=[analysis_prompt],
                    config={
                        **generation_config,
                        "cached_content": cache_handle.name,
                    },
                )
            else:
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=[gemini_file, analysis_prompt],
                    config=generation_config,
                )

            # Parse the structured response
            response_text = response.text
            report = IncidentReport.model_validate_json(response_text)
            logger.info(
                f"Successfully parsed incident report for case {case_id}: "
                f"{len(report.timeline)} timeline entries"
            )
            break

        except Exception as e:
            retry_count += 1
            if retry_count > max_retries:
                raise RuntimeError(
                    f"Failed to parse Gemini response after {max_retries + 1} "
                    f"attempts: {type(e).__name__}: {str(e)[:200]}"
                ) from e

            logger.warning(
                f"Gemini response parse failed (attempt {retry_count}), "
                f"retrying with corrective prompt: {e}"
            )
            analysis_prompt = f"""The previous response had formatting issues. Please try again with these strict requirements:

1. Respond with VALID JSON only, no markdown or explanation outside the JSON.
2. All timestamps MUST be in MM:SS format with exactly 2 digits for each part (e.g., "02:14", NOT "2:14").
3. risk_evaluation MUST be exactly one of: "LOW", "MEDIUM", "HIGH".
4. Include summary, crime_summary (or null), risk_evaluation, timeline (array of objects with timestamp and description), and entities_detected (array of strings).

Previous error: {str(e)[:200]}

Analyze the video again following these rules precisely."""

    task.update_state(
        state="PROGRESS",
        meta={"phase": "PERSISTING", "progress": 75, "case_id": case_id},
    )

    # ══════════════════════════════════════════════════════════════════════
    # Persist the parsed report to the database
    # ══════════════════════════════════════════════════════════════════════
    async with get_db_session() as session:
        # Create ChronologicalLog entries from timeline
        for idx, entry in enumerate(report.timeline):
            log_entry = ChronologicalLog(
                case_id=case_id,
                timestamp_in_video=entry.timestamp,
                timestamp_seconds=_parse_timestamp_to_seconds(entry.timestamp),
                description=entry.description,
                entities_detected=report.entities_detected if idx == 0 else [],
                risk_level=RiskLevel(report.risk_evaluation),
                sequence_order=idx,
            )
            session.add(log_entry)

        # Update VideoCase with summary and risk
        await session.execute(
            update(VideoCase)
            .where(VideoCase.id == case_id)
            .values(
                summary=report.summary,
                crime_summary=report.crime_summary,
                risk_evaluation=RiskLevel(report.risk_evaluation),
                status=CaseStatus.COMPLETED,
            )
        )

        # Record the full report in the ledger
        await ledger.append_ledger_event(
            session=session,
            case_id=case_id,
            event_type="INCIDENT_REPORT_GENERATED",
            payload={
                "summary": report.summary,
                "crime_summary": report.crime_summary,
                "risk_evaluation": report.risk_evaluation,
                "timeline_count": len(report.timeline),
                "entities_detected": report.entities_detected,
                "full_report": report.model_dump(),
            },
        )

    task.update_state(
        state="PROGRESS",
        meta={"phase": "CLEANING_UP", "progress": 85, "case_id": case_id},
    )

    # ══════════════════════════════════════════════════════════════════════
    # PHASE D — Erasure & Final Ledger Close-Out
    # ══════════════════════════════════════════════════════════════════════

    # Delete from Gemini storage
    deletion_success = True
    try:
        client.files.delete(name=gemini_file_uri)
        logger.info(f"Deleted Gemini file {gemini_file_uri} for case {case_id}")
    except Exception as e:
        deletion_success = False
        logger.error(
            f"Failed to delete Gemini file {gemini_file_uri}: "
            f"{type(e).__name__}: {e}"
        )

    # Record deletion in ledger
    async with get_db_session() as session:
        if deletion_success:
            await session.execute(
                update(VideoCase)
                .where(VideoCase.id == case_id)
                .values(gemini_file_uri=None)
            )
            await ledger.append_ledger_event(
                session=session,
                case_id=case_id,
                event_type="GEMINI_FILE_DELETED",
                payload={
                    "gemini_file_uri": gemini_file_uri,
                    "deletion_successful": True,
                },
            )
        else:
            # Record failure but don't undo the completed analysis
            await ledger.append_ledger_event(
                session=session,
                case_id=case_id,
                event_type="GEMINI_FILE_DELETED",
                payload={
                    "gemini_file_uri": gemini_file_uri,
                    "deletion_successful": False,
                    "note": "Deletion failed — requires manual cleanup or retry job",
                },
            )

    # Delete local temp file
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Deleted local temp file for case {case_id}")
    except Exception as e:
        logger.error(f"Failed to delete local temp file: {type(e).__name__}: {e}")

    # ── Final ledger close-out ───────────────────────────────────────────
    async with get_db_session() as session:
        await ledger.append_ledger_event(
            session=session,
            case_id=case_id,
            event_type="ANALYSIS_COMPLETED",
            payload={
                "case_id": case_id,
                "gemini_file_deleted": deletion_success,
                "local_file_deleted": not os.path.exists(filepath),
            },
        )

    # Verify the chain one final time
    async with get_db_session() as session:
        chain_valid = await ledger.verify_case_chain(session, case_id)
        if not chain_valid:
            logger.error(
                f"CRITICAL: Chain verification failed after analysis completion "
                f"for case {case_id}"
            )

    task.update_state(
        state=states.SUCCESS,
        meta={
            "phase": "COMPLETED",
            "progress": 100,
            "case_id": case_id,
            "chain_valid": chain_valid,
        },
    )

    logger.info(f"Analysis completed successfully for case {case_id}")
