# STAGE 3 — FastAPI Endpoints

Precondition: Stage 2 complete (Celery pipeline tests passing against a mocked Gemini client).

---

### CKPT-3.1 — Upload Endpoint
```
Implement backend/api/video_analysis.py, POST /api/v1/video/analyze:

Accepts multipart/form-data with a single video file field. Validate: extension against ALLOWED_VIDEO_EXTENSIONS, size against MAX_UPLOAD_SIZE_MB (reject oversized uploads with 413 before fully buffering to disk — stream and check size incrementally, don't trust Content-Length alone). Compute MD5 checksum while streaming to TEMP_UPLOAD_DIR (do not load the full file into memory to hash it). Create a VideoCase row (status=UPLOADED, original_md5, filename, file_size_bytes). Append a FILE_UPLOADED ledger event (case_id, filename, original_md5 — not the file content). Enqueue the analyze_video Celery task from Stage 2 with case_id and the saved filepath. Return {case_id, task_id, status: "UPLOADED"}.

Register this router in main.py (replacing the Stage 0 stub).

Acceptance criteria:
- Test: uploading a valid small MP4 returns 200 with case_id and task_id, and a VideoCase row exists with status=UPLOADED
- Test: uploading a file exceeding MAX_UPLOAD_SIZE_MB is rejected with 413 before the full file is written to disk (verify via a mocked oversized stream, not by actually uploading a huge file)
- Test: uploading a disallowed extension (e.g. .exe renamed to .mp4 content-type spoofed) is rejected — validate actual file signature/magic bytes, not just the extension, since extension alone is trivially spoofable
```

### CKPT-3.2 — Status Polling Endpoint
```
Implement GET /api/v1/video/status/{task_id}: queries Celery's AsyncResult for the task, and additionally cross-references VideoCase.status (looked up via a task_id-to-case_id mapping — add this mapping either as a VideoCase column or a small lookup table, since Celery's result backend alone won't durably tell you which case a task_id belongs to after a worker restart). Returns {task_id, case_id, celery_state, video_case_status, progress_percentage, error_detail (if failed)}. progress_percentage should reflect the update_state calls from CKPT-2.3/2.4, not be hardcoded.

Acceptance criteria:
- Test: polling a task mid-processing (mocked) returns increasing progress_percentage across successive polls matching the phase transitions
- Test: polling a task_id that doesn't exist returns 404, not a 500 or an empty 200
- Test: polling a FAILED case surfaces the error_detail captured in the ANALYSIS_FAILED ledger event
```

### CKPT-3.3 — Report Retrieval Endpoint
```
Implement GET /api/v1/video/report/{case_id}: returns the full VideoCase record plus its ordered ChronologicalLog rows (sorted by sequence_order) plus the result of verify_case_chain(case_id) from Stage 1, so the frontend can display both the report and its chain-of-custody validity inline. Return 404 if case_id doesn't exist, 425 (Too Early) if status is not COMPLETED yet (distinct from a hard error, since the frontend will poll this while status transitions).

Acceptance criteria:
- Test: fetching a COMPLETED case returns the full report with timeline rows in correct sequence_order and chain_valid: true
- Test: fetching a case still PROCESSING returns 425, not a partial/empty 200
- Test: fetching a case whose ledger was deliberately tampered with (test-only) returns chain_valid: false while still returning the report data — the frontend should be able to show "report present but integrity check failed" rather than nothing at all
```
