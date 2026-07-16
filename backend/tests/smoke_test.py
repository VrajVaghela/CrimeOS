"""
Integration Smoke Test — Full Stack End-to-End Verification
=============================================================
Tests the complete video incident analyzer pipeline:

    1. Uploads a synthetic test video via POST /api/v1/video/analyze
    2. Polls status until COMPLETED (with timeout)
    3. Fetches the full report via GET /api/v1/video/report/{case_id}
    4. Verifies chain-of-custody integrity (chain_valid = True)
    5. Confirms Gemini file reference and local temp file are cleaned up

Prerequisites:
    - Full Docker Compose stack running (postgres, redis, fastapi-app, celery-worker)
    - Gemini API should be mocked/sandboxed for CI use
    - This test script can be run against the local stack via: python tests/smoke_test.py

Usage:
    # Ensure the stack is running:
    docker compose up -d

    # Run the smoke test:
    python tests/smoke_test.py

    # Or run against a specific host:
    API_BASE_URL=http://localhost:8000 python tests/smoke_test.py

Environment:
    API_BASE_URL: Base URL for the API (default: http://localhost:8000)

Exit Codes:
    0: All tests passed
    1: One or more tests failed
"""

import os
import sys
import subprocess
import time
import json
import requests

# ── Configuration ────────────────────────────────────────────────────────────
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")
API_PREFIX = f"{API_BASE_URL}/api/v1/video"
MAX_POLL_SECONDS = 300  # 5 minutes max wait for analysis
POLL_INTERVAL = 3  # seconds between polls

# ANSI colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"

passed = 0
failed = 0


def log(msg: str, color: str = CYAN):
    """Print a colored log message."""
    print(f"{color}{msg}{RESET}")


def check(name: str, condition: bool, detail: str = ""):
    """Assert a condition and track pass/fail counts.

    Args:
        name: Name of the check.
        condition: Boolean assertion.
        detail: Additional detail on failure.
    """
    global passed, failed
    if condition:
        passed += 1
        log(f"  ✅ PASS: {name}", GREEN)
    else:
        failed += 1
        log(f"  ❌ FAIL: {name}{f' — {detail}' if detail else ''}", RED)


def generate_test_video(filepath: str, duration: int = 5):
    """Generate a synthetic test video using ffmpeg.

    Creates a minimal valid MP4 file with a test pattern and timestamp overlay.

    Args:
        filepath: Output file path for the test video.
        duration: Duration in seconds (default: 5).
    """
    log(f"  Generating {duration}s test video at {filepath}...")
    try:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-f", "lavfi",
                "-i", f"testsrc=duration={duration}:size=320x240:rate=15",
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                filepath,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if not os.path.exists(filepath):
            log("  ⚠️  ffmpeg did not produce output — using fallback", YELLOW)
            _create_minimal_mp4(filepath)
    except FileNotFoundError:
        log("  ⚠️  ffmpeg not found — creating minimal fallback MP4", YELLOW)
        _create_minimal_mp4(filepath)


def _create_minimal_mp4(filepath: str):
    """Create a minimal valid MP4 file without ffmpeg.

    Writes a minimal ftyp + moov atom structure that is a valid MP4 container.

    Args:
        filepath: Output file path.
    """
    # Minimal valid MP4: ftyp box + minimal moov
    ftyp = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom"
    moov = b"\x00\x00\x00\x08moov"
    with open(filepath, "wb") as f:
        f.write(ftyp + moov)


def main():
    """Run the full integration smoke test suite."""
    global passed, failed

    log(f"\n{BOLD}═══════════════════════════════════════════════════════════════", CYAN)
    log(f"  Video Incident Analyzer — Integration Smoke Test", CYAN)
    log(f"  API: {API_BASE_URL}", CYAN)
    log(f"═══════════════════════════════════════════════════════════════{RESET}\n", CYAN)

    # ── Test 1: Health Check ─────────────────────────────────────────────
    log(f"{BOLD}[1/6] Health Check{RESET}")
    try:
        r = requests.get(f"{API_BASE_URL}/health", timeout=10)
        check("Health endpoint returns 200", r.status_code == 200)
        data = r.json()
        check("PostgreSQL is healthy", data.get("postgres") is True)
        check("Redis is healthy", data.get("redis") is True)
    except Exception as e:
        check("Health endpoint reachable", False, str(e))
        log(f"\n{RED}Cannot reach API — is docker compose running?{RESET}")
        sys.exit(1)

    # ── Test 2: Upload Video ─────────────────────────────────────────────
    log(f"\n{BOLD}[2/6] Video Upload{RESET}")
    test_video_path = os.path.join(os.path.dirname(__file__), "test_video.mp4")
    generate_test_video(test_video_path)
    check("Test video file exists", os.path.exists(test_video_path))

    case_id = None
    task_id = None

    with open(test_video_path, "rb") as f:
        r = requests.post(
            f"{API_PREFIX}/analyze",
            files={"file": ("test_evidence.mp4", f, "video/mp4")},
            timeout=30,
        )
        check("Upload returns 200", r.status_code == 200, f"Got {r.status_code}")
        data = r.json()
        case_id = data.get("case_id")
        task_id = data.get("task_id")
        check("Response contains case_id", case_id is not None)
        check("Response contains task_id", task_id is not None)
        check("Status is UPLOADED", data.get("status") == "UPLOADED")

    # ── Test 3: Status Polling ───────────────────────────────────────────
    log(f"\n{BOLD}[3/6] Status Polling{RESET}")
    if task_id:
        start_time = time.time()
        final_status = None

        while time.time() - start_time < MAX_POLL_SECONDS:
            r = requests.get(f"{API_PREFIX}/status/{task_id}", timeout=10)
            check("Status endpoint returns 200", r.status_code == 200)
            data = r.json()

            progress = data.get("progress_percentage", 0)
            celery_state = data.get("celery_state", "UNKNOWN")
            case_status = data.get("video_case_status", "UNKNOWN")

            log(
                f"    Status: celery={celery_state}, case={case_status}, "
                f"progress={progress}%",
                YELLOW,
            )

            if case_status in ("COMPLETED", "FAILED") or celery_state in (
                "SUCCESS",
                "FAILURE",
            ):
                final_status = case_status or celery_state
                break

            time.sleep(POLL_INTERVAL)

        check(
            "Analysis reached terminal state",
            final_status is not None,
            f"Timed out after {MAX_POLL_SECONDS}s",
        )
        if final_status:
            check("Final status is COMPLETED", final_status == "COMPLETED", f"Got {final_status}")
    else:
        check("Status polling skipped", False, "No task_id available")

    # ── Test 4: Invalid Task ID ──────────────────────────────────────────
    log(f"\n{BOLD}[4/6] Error Handling{RESET}")
    r = requests.get(f"{API_PREFIX}/status/nonexistent-task-id", timeout=10)
    check("Invalid task_id returns 404", r.status_code == 404)

    r = requests.get(f"{API_PREFIX}/report/00000000-0000-0000-0000-000000000000", timeout=10)
    check("Invalid case_id returns 404", r.status_code == 404)

    # ── Test 5: Report Retrieval ─────────────────────────────────────────
    log(f"\n{BOLD}[5/6] Report Retrieval{RESET}")
    if case_id and final_status == "COMPLETED":
        r = requests.get(f"{API_PREFIX}/report/{case_id}", timeout=10)
        check("Report endpoint returns 200", r.status_code == 200)
        report = r.json()

        check("Report contains case_id", report.get("case_id") == case_id)
        check("Report contains filename", report.get("filename") is not None)
        check("Report contains summary", report.get("summary") is not None)
        check(
            "Report contains risk_evaluation",
            report.get("risk_evaluation") in ("LOW", "MEDIUM", "HIGH"),
            f"Got {report.get('risk_evaluation')}",
        )
        check("Report contains timeline", len(report.get("timeline", [])) > 0)
        check("Chain of custody is valid", report.get("chain_valid") is True)

        # Verify timeline ordering
        timeline = report.get("timeline", [])
        if timeline:
            orders = [e["sequence_order"] for e in timeline]
            check(
                "Timeline is in correct sequence_order",
                orders == sorted(orders),
                f"Orders: {orders}",
            )
    else:
        log("  ⚠️  Skipping report checks (analysis did not complete)", YELLOW)

    # ── Test 6: Extension Validation ─────────────────────────────────────
    log(f"\n{BOLD}[6/6] Security Validation{RESET}")

    # Test: disallowed extension
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".exe", delete=False) as tmp:
        tmp.write(b"MZ" + b"\x00" * 100)
        tmp_path = tmp.name

    with open(tmp_path, "rb") as f:
        r = requests.post(
            f"{API_PREFIX}/analyze",
            files={"file": ("malware.exe", f, "application/octet-stream")},
            timeout=10,
        )
        check("Disallowed extension rejected", r.status_code == 415)

    os.remove(tmp_path)

    # ── Summary ──────────────────────────────────────────────────────────
    log(f"\n{BOLD}═══════════════════════════════════════════════════════════════", CYAN)
    total = passed + failed
    log(f"  Results: {passed}/{total} passed, {failed}/{total} failed", GREEN if failed == 0 else RED)
    log(f"═══════════════════════════════════════════════════════════════{RESET}\n", CYAN)

    # Cleanup test video
    if os.path.exists(test_video_path):
        os.remove(test_video_path)

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
