# STAGE 5 — Hardening & Full Integration

Precondition: Stage 4 complete, dashboard functional against the running stack.

---

### CKPT-5.1 — Error Handling, Cleanup & Rate-Limit Coverage
```
Audit backend/api/video_analysis.py and backend/tasks/video_tasks.py end-to-end:

- Add a global FastAPI exception handler in main.py logging full detail server-side but returning sanitized error bodies to clients (no raw tracebacks, no leaked file paths or internal config in responses).
- Add slowapi rate limiting to POST /api/v1/video/analyze (e.g. 5 uploads/minute per IP — video analysis is expensive, tune stricter than typical read endpoints).
- Add a Celery periodic cleanup task (Celery Beat) that scans TEMP_UPLOAD_DIR for files older than 24 hours with no corresponding COMPLETED/FAILED VideoCase resolution and removes them, handling the case where a worker crashed mid-task and left an orphaned temp file.
- Add explicit timeout wrapping (asyncio.wait_for or Celery soft/hard time limits) around every external Gemini SDK call, so a hung API call cannot hang a worker indefinitely — cap at a config-driven maximum with the value already established in CKPT-2.3.
- Ensure GEMINI_API_KEY is never logged, even at debug level — check ffprobe/SDK error messages don't leak it into ledger payload_snapshot or application logs.

Acceptance criteria:
- Simulated Gemini API hang is cleanly terminated at the configured timeout, task marked FAILED, no hung worker process
- A forced unhandled exception in the upload endpoint returns a sanitized 500 body with no traceback or internal paths
- Orphaned temp files older than the cleanup threshold are removed by the periodic task; files tied to an in-progress case are not touched
- A grep across logs and ledger payload_snapshot after a full test run finds zero occurrences of the raw GEMINI_API_KEY value
```

### CKPT-5.2 — Full Stack Smoke Test
```
Write an integration smoke test (tests/smoke_test.py or a shell script) that: brings up the full docker compose stack, uploads a short real (or synthetic, ffmpeg-generated) test video through POST /api/v1/video/analyze against a mocked/sandboxed Gemini response (do not hit the real Gemini API in CI — inject a test double), polls status to COMPLETED, fetches the report, verifies verify_case_chain returns True, and confirms the local temp file and Gemini file reference were both cleaned up per Stage 2.5.

Then, using Antigravity's /browser capability, navigate to the running frontend at localhost:5173, perform a real drag-and-drop upload through the UI, wait for the dashboard to populate, and verify that clicking a timeline row correctly seeks the video element (confirm via reading the video element's currentTime property through the browser automation).

Acceptance criteria:
- Full backend smoke test passes end-to-end with zero manual intervention
- Browser-driven UI test confirms upload → dashboard render → timestamp click → correct video seek, observed directly in the headless browser session
```
