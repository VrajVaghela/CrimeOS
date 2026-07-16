"""
Tasks Package — Celery Application Instance
=============================================
Configures the Celery distributed task queue against Redis as both
broker and result backend.

Configuration:
    - Broker: Redis (from REDIS_URL environment variable)
    - Result Backend: Redis (same instance)
    - Serialization: JSON for task payloads and results
    - Task Tracking: Enabled (task_track_started=True)
    - Result Expiry: 24 hours (86400 seconds)
    - Timezone: UTC

Usage:
    # From Celery worker command:
    celery -A tasks worker --loglevel=info

    # From application code:
    from tasks.video_tasks import analyze_video
    result = analyze_video.delay(case_id="...", filepath="...")
"""

import os

from celery import Celery

# ── Redis URL from environment ───────────────────────────────────────────────
# Falls back to localhost for local development without Docker
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# ── Celery Application Instance ─────────────────────────────────────────────
celery_app = Celery(
    "video_incident_analyzer",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks.video_tasks", "tasks.cleanup"],
)

# ── Celery Configuration ─────────────────────────────────────────────────────
celery_app.conf.update(
    # Serialization: use JSON for human-readable, debuggable payloads
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Task tracking: report STARTED state so frontend can show progress
    task_track_started=True,

    # Result expiry: clean up results after 24 hours
    result_expires=86400,

    # Timezone: use UTC for consistency across deployments
    timezone="UTC",
    enable_utc=True,

    # Worker: prefetch 1 task at a time (video analysis is CPU/IO heavy)
    worker_prefetch_multiplier=1,

    # Soft/hard time limits for tasks (seconds)
    # Soft limit raises SoftTimeLimitExceeded; hard limit terminates the worker
    task_soft_time_limit=900,   # 15 minutes soft
    task_time_limit=1200,       # 20 minutes hard

    # Celery Beat schedule for periodic cleanup tasks
    beat_schedule={
        "cleanup-orphaned-temp-files": {
            "task": "tasks.cleanup_orphaned_files",
            "schedule": 3600.0,  # Run every hour
            "options": {"expires": 1800},  # Expire if not picked up within 30 min
        },
    },
)
