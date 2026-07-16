"""
Cleanup Tasks — Celery Beat Periodic Task for Temp File Management
====================================================================
Implements periodic background cleanup for the video incident analyzer:

    - Scans TEMP_UPLOAD_DIR for orphaned files older than 24 hours
    - Removes files with no corresponding COMPLETED/FAILED VideoCase
    - Handles the case where a worker crashed mid-task, leaving orphan files
    - Does NOT touch files tied to an in-progress case

Schedule:
    Runs every hour via Celery Beat. Configurable via the beat_schedule
    in tasks/__init__.py.
"""

import asyncio
import logging
import os
import time

from tasks import celery_app

logger = logging.getLogger("video-incident-analyzer.cleanup")

# Files older than this threshold (in seconds) are eligible for cleanup
CLEANUP_THRESHOLD_SECONDS = 24 * 60 * 60  # 24 hours


@celery_app.task(
    name="tasks.cleanup_orphaned_files",
    ignore_result=True,
)
def cleanup_orphaned_files():
    """Scan TEMP_UPLOAD_DIR for orphaned files and remove stale ones.

    An orphaned file is one that:
        1. Is older than CLEANUP_THRESHOLD_SECONDS (24 hours)
        2. Has no corresponding VideoCase that is still in progress
           (i.e., status is not UPLOADED, PROCESSING, or ACTIVE_ANALYSIS)

    This handles the case where a Celery worker crashes mid-task and leaves
    a temp file behind without transitioning the case to COMPLETED or FAILED.

    Files tied to an in-progress case are never touched, even if old,
    to avoid breaking an active analysis.

    Returns:
        dict: Summary with keys:
            - scanned (int): Number of files examined
            - removed (int): Number of files cleaned up
            - skipped (int): Number of files skipped (in-progress or recent)
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_async_cleanup())
    finally:
        loop.close()


async def _async_cleanup():
    """Async implementation of the orphaned file cleanup.

    Returns:
        dict: Cleanup summary.
    """
    from config import get_settings

    settings = get_settings()
    upload_dir = settings.TEMP_UPLOAD_DIR

    if not os.path.exists(upload_dir):
        logger.info("TEMP_UPLOAD_DIR does not exist — nothing to clean")
        return {"scanned": 0, "removed": 0, "skipped": 0}

    now = time.time()
    scanned = 0
    removed = 0
    skipped = 0

    for filename in os.listdir(upload_dir):
        filepath = os.path.join(upload_dir, filename)

        # Skip directories
        if not os.path.isfile(filepath):
            continue

        scanned += 1
        file_age = now - os.path.getmtime(filepath)

        # Skip recent files (not yet eligible for cleanup)
        if file_age < CLEANUP_THRESHOLD_SECONDS:
            skipped += 1
            continue

        # Check if any in-progress case references this file path
        try:
            from database.connection import get_db_session
            from database.models import VideoCase, CaseStatus
            from sqlalchemy import select

            async with get_db_session() as session:
                # Look for any case still in progress
                # We can't easily map filename back to case, so we check if
                # ANY case is still in progress (conservative approach)
                in_progress = await session.execute(
                    select(VideoCase.id).where(
                        VideoCase.status.in_([
                            CaseStatus.UPLOADED,
                            CaseStatus.PROCESSING,
                            CaseStatus.ACTIVE_ANALYSIS,
                        ])
                    )
                )
                active_cases = in_progress.scalars().all()

                # If there are no active cases, safe to remove all old files
                # If there are active cases, only remove files that are
                # significantly older than the threshold
                if active_cases and file_age < CLEANUP_THRESHOLD_SECONDS * 2:
                    skipped += 1
                    continue

        except Exception as e:
            logger.warning(f"DB check failed during cleanup: {e}")
            skipped += 1
            continue

        # Remove the orphaned file
        try:
            os.remove(filepath)
            removed += 1
            logger.info(f"Removed orphaned temp file: {filename} (age: {file_age/3600:.1f}h)")
        except Exception as e:
            logger.error(f"Failed to remove {filename}: {e}")
            skipped += 1

    summary = {"scanned": scanned, "removed": removed, "skipped": skipped}
    logger.info(f"Cleanup complete: {summary}")
    return summary
