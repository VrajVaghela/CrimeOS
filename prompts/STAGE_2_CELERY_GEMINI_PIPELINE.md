# STAGE 2 — Celery Worker & Google GenAI Video Pipeline

Precondition: Stage 1 complete (models + ledger tests passing).

---

### CKPT-2.1 — Celery App Setup
```
Implement backend/tasks/__init__.py with a Celery app instance configured against REDIS_URL as both broker and result backend, task_serializer=json, task_track_started=True, and a result expiry of 24 hours. Wire this celery-worker service in docker-compose.yml to actually run it (was stubbed in Stage 0).

Acceptance criteria:
- `celery -A backend.tasks inspect ping` returns a successful response against the running redis container
- A trivial test task (e.g. add(1,2)) enqueued from a script completes and its result is retrievable via task_id
```

### CKPT-2.2 — Pydantic IncidentReport Schema
```
Implement backend/tasks/schemas.py (or add to video_tasks.py) with a strict Pydantic model:

IncidentReport:
- summary: str (concise executive summary)
- risk_evaluation: Literal["LOW","MEDIUM","HIGH"]
- timeline: list[TimelineEntry] where TimelineEntry has timestamp: str (MM:SS format, validated via regex) and description: str
- entities_detected: list[str]

Add a field_validator on TimelineEntry.timestamp enforcing the MM:SS format strictly (reject malformed timestamps rather than silently accepting them, since these drive frontend video seeking later).

Acceptance criteria:
- Test: valid IncidentReport JSON parses correctly
- Test: a timestamp like "2:5" or "abc" fails validation with a clear error
- Test: an unexpected risk_evaluation value (e.g. "CRITICAL") is rejected, not silently coerced
```

### CKPT-2.3 — Gemini Upload & Polling Loop
```
Implement backend/tasks/video_tasks.py with a Celery task analyze_video(case_id: str, filepath: str):

Phase A — Upload & poll:
Use the Google GenAI Python SDK to call client.files.upload() with the local filepath. Append a GEMINI_UPLOAD_COMPLETE ledger event (via LedgerService from Stage 1) once upload starts, including the gemini_file_uri. Implement a non-blocking polling loop (Celery task itself can block since it's a background worker, but must not busy-loop) checking myfile.state every 2 seconds with exponential backoff on transient errors (rate limits, timeouts), capped at 30 seconds between polls and a maximum total wait of 10 minutes before marking the case FAILED. On myfile.state == "ACTIVE", proceed to Phase B. On "FAILED" or timeout, update VideoCase.status = FAILED, append an ANALYSIS_FAILED ledger event with the failure reason, and stop.

Update VideoCase.status to PROCESSING at task start and ACTIVE_ANALYSIS once the Gemini file becomes active. Update Celery task state (self.update_state) with progress percentages at each phase transition so GET /status/{task_id} (Stage 3) can report real progress, not a fake percentage.

Acceptance criteria:
- Test (mocked Gemini client): a file that transitions PROCESSING → ACTIVE within a few polls completes and reaches Phase B
- Test (mocked): a file that stays in PROCESSING past the timeout marks the case FAILED with a clear ledger reason, and does not hang the worker indefinitely
- Test (mocked): a simulated rate-limit error on one poll attempt is retried with backoff rather than immediately failing the task
```

### CKPT-2.4 — Prompted Analysis, Cost Optimization & Context Caching
```
Continue video_tasks.py, Phase B onward:

Phase B — Prompted generation:
Call the Gemini model (config-driven model name, default "gemini-2.5-flash") with the active file reference, media_resolution="LOW", response_mime_type="application/json", and response_schema set to the IncidentReport Pydantic model from CKPT-2.2 (use the SDK's structured output support). Construct the prompt to explicitly request: an executive summary, an overall risk_evaluation, a strict chronological timeline with MM:SS timestamps, and specific entities_detected (vehicle models, license plates, weapons, subjects of interest) — write the actual prompt text, not a placeholder. Parse the response into IncidentReport; if parsing fails, retry once with a corrective follow-up prompt before marking the case FAILED.

Phase C — Context caching for long videos:
Before Phase B, check VideoCase.duration_seconds (extract via ffprobe on the local file before upload, store on VideoCase). If duration exceeds 600 seconds, call client.caches.create with the uploaded file reference and a TTL matching the expected processing window, and use the cache handle for the Phase B generation call instead of the raw file reference. Log which path was taken (cached vs direct) in the ANALYSIS_STARTED ledger event payload.

Persist the parsed IncidentReport: create ChronologicalLog rows from timeline (converting MM:SS to timestamp_seconds, setting sequence_order by list position), update VideoCase.summary, risk_evaluation, status = COMPLETED. Append an INCIDENT_REPORT_GENERATED ledger event containing the full parsed report as payload_snapshot.

Acceptance criteria:
- Test (mocked Gemini): a well-formed structured response correctly populates VideoCase and ChronologicalLog rows with correct sequence_order and timestamp_seconds conversion
- Test (mocked): a malformed first response triggers exactly one retry before failing the case on a second bad response
- Test: a video with duration_seconds > 600 triggers the caches.create code path (verify via the mocked client call args), and one under 600 does not
```

### CKPT-2.5 — Data Erasure & Final Ledger Close-Out
```
Continue video_tasks.py, final phase:

Phase D — Erasure:
After successful persistence in CKPT-2.4, call client.files.delete() to remove the uploaded video from Google's storage, and clear VideoCase.gemini_file_uri. Append a GEMINI_FILE_DELETED ledger event. Also delete the local temp file from TEMP_UPLOAD_DIR at this point (not before — it may be needed for a retry on failure). Wrap the deletion calls in try/except so a deletion failure doesn't undo the completed analysis, but does append an event noting the deletion failed (so a cleanup job can retry it later) rather than silently succeeding.

Append a final ANALYSIS_COMPLETED ledger event once all of the above succeeds, and confirm VideoCase.final_ledger_hash matches the latest chain hash.

Acceptance criteria:
- Test (mocked): successful completion results in gemini_file_uri = null, local temp file removed, and a GEMINI_FILE_DELETED + ANALYSIS_COMPLETED event pair in the ledger
- Test (mocked): a forced deletion failure still leaves VideoCase.status = COMPLETED (the analysis itself succeeded) but logs the deletion failure distinctly for later retry
- Test: verify_case_chain(case_id) returns True at the end of a full successful run
```
