# STAGE 4 — Frontend Investigation Dashboard

Precondition: Stage 3 complete, backend fully testable via curl/httpie against the running compose stack.

---

### CKPT-4.1 — Vite Scaffold, Upload Component & Progress Polling
```
Scaffold frontend/ with Vite + React + TypeScript + Tailwind CSS, cyberpunk-leaning dark theme (deep navy/black background, neon cyan/magenta accents for risk badges and interactive elements — define this as a small design tokens file, not scattered inline hex codes).

Implement src/api/client.ts with typed functions matching Stage 3's endpoints: uploadVideo(file: File): Promise<{case_id, task_id}>, pollStatus(task_id: string): Promise<StatusResponse>, getReport(case_id: string): Promise<ReportResponse>. Define matching TypeScript interfaces mirroring the backend Pydantic/SQLAlchemy shapes exactly (no `any`).

Implement a drag-and-drop upload component (src/components/VideoUploader.tsx): HTML5 drag-and-drop zone accepting the same extensions as ALLOWED_VIDEO_EXTENSIONS, client-side size pre-check against MAX_UPLOAD_SIZE_MB before attempting upload (fail fast with a clear message rather than letting the server reject it), an upload progress bar (via XMLHttpRequest or fetch with a ReadableStream reader for progress events, since plain fetch doesn't expose upload progress), and after upload completes, begins polling pollStatus every 2 seconds, rendering a live percentage and phase label until status is COMPLETED or FAILED.

Acceptance criteria:
- `npm run build` succeeds with zero TypeScript errors
- Dragging a valid file onto the zone triggers upload with a visible progress bar reaching 100%
- An oversized file is rejected client-side with a clear message before any network request is made
- Status polling correctly transitions through phase labels and stops polling once COMPLETED or FAILED
```

### CKPT-4.2 — Split-Screen Investigation Dashboard
```
Implement src/components/VideoTimelineViewer.tsx: a split-screen layout. Left pane: an HTML5 <video> element (ref-controlled, not a heavy third-party player) playing the originally uploaded video (serve it via a short-lived signed local URL or object URL retained client-side from the upload step — do not re-fetch the deleted Gemini-hosted copy, since Stage 2 deletes it from Google's storage). Right pane: a scrollable sidebar rendering ChronologicalLog rows from getReport(case_id) in sequence_order, each showing timestamp (MM:SS), description, and a color-coded risk badge (green=LOW, orange=MEDIUM, red=HIGH) using the design tokens from CKPT-4.1.

Also render, above the timeline, a summary card (VideoCase.summary, overall risk_evaluation badge, and a chain-of-custody indicator reflecting chain_valid from Stage 3's report endpoint — a clear visual pass/fail, not buried text).

Acceptance criteria:
- Given a seeded COMPLETED case, the dashboard renders the correct number of timeline rows in correct order with correct risk badge colors
- The chain-of-custody indicator correctly shows a failure state when chain_valid is false (test against a seeded tampered case)
```

### CKPT-4.3 — Timestamp-to-Video Seek Synchronization
```
Wire click handlers on each ChronologicalLog row in VideoTimelineViewer.tsx so clicking a row sets the video element's currentTime to that row's timestamp_seconds (from the backend, not a client-side re-parse of the MM:SS string, to avoid drift/parsing bugs) and calls .play() if the video is paused. Add a visual "currently active" highlight on the timeline row matching the video's current playback position (listen to the video's timeupdate event and find the row whose timestamp_seconds is the closest preceding value).

Acceptance criteria:
- Clicking a timeline row at "02:14" sets video currentTime to exactly 134 seconds and resumes playback
- As the video plays naturally, the corresponding timeline row highlights in sync without requiring a click
```
