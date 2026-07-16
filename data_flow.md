# Data Flow: Video Processing Pipeline

This document traces the lifecycle of a video file and its metadata through the E-Rakshak system.

## 1. Ingestion Phase
1. **Client Action**: User drags and drops a video file into the React dashboard.
2. **Client Validation**: Frontend checks file extension (`.mp4`, `.avi`, `.mov`) and size (<= 500MB).
3. **Upload**: File is sent via POST to `/api/v1/video/analyze`.
4. **Server Validation**: FastAPI reads the first 32 bytes to verify the magic byte signature (preventing spoofed extensions).
5. **Streaming to Disk**: The file is streamed to `TEMP_UPLOAD_DIR` in chunks. MD5 hash is computed incrementally. Size is verified dynamically.
6. **Database Init**: A `VideoCase` record is created with status `UPLOADED`.
7. **Ledger Init**: A `FILE_UPLOADED` event is appended to the tamper-evident ledger, sealing the original MD5.
8. **Queue**: A Celery task (`analyze_video`) is enqueued, and `case_id` + `task_id` are returned to the client.

## 2. Analysis Phase (Celery Worker)
1. **Task Startup**: Worker picks up the task and updates state to `PROGRESS`.
2. **Ledger Update**: Appends `ANALYSIS_STARTED`.
3. **Gemini Upload**: Video is uploaded to Google's generative AI storage via `genai.upload_file`.
4. **Polling**: Worker polls Gemini until the file state is `ACTIVE`.
5. **Caching (Optional)**: If the video > 600s, a Gemini Context Cache is created to optimize prompt processing.
6. **Prompt Execution**: Worker sends the video reference and a strict JSON-schema prompt to Gemini.
7. **Retries**: If Gemini returns malformed output, the worker retries up to 3 times.

## 3. Persistence Phase
1. **Parsing**: Gemini's JSON response (timeline, risk, summary) is parsed into Pydantic models.
2. **Database Update**: Timeline events are inserted into `ChronologicalLog`. `VideoCase` status becomes `COMPLETED`.
3. **Ledger Update**: Appends `ANALYSIS_COMPLETED` containing a cryptographic hash of the extracted timeline.

## 4. Cleanup Phase
1. **Local Cleanup**: The local file in `TEMP_UPLOAD_DIR` is deleted.
2. **Remote Cleanup**: The file is deleted from Gemini's servers via `genai.delete_file`.
3. **Error Handling**: If any phase fails, the ledger records `ANALYSIS_FAILED` and cleanup is still enforced.

## 5. Retrieval Phase
1. **Client Polling**: While phases 2-4 happen, the frontend polls `/api/v1/video/status/{task_id}`.
2. **Completion**: Once status is `COMPLETED`, frontend fetches the final report.
3. **Verification**: FastAPI reads the ledger for the requested case, recomputes all hashes in the chain, verifies the HMAC signatures, and returns `chain_valid = True` along with the timeline data.
