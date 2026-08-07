# Memory — Phase 13 End-to-End Audit & Remediation Complete

Last updated: 2026-08-06 23:35 IST

## Latest Update — Phase 13 End-to-End Audit & Remediation (2026-08-06)
- **Hardcoded Localhost API Download URL**: Exported `API_URL` from `lib/api.ts` and replaced hardcoded `http://localhost:8000` download link in `responses/page.tsx`.
- **Premature Dispatch Button Enablement**: Fixed readiness condition in `requests/page.tsx` using `!readinessMap[req.id]?.is_ready`.
- **RAM Exhaustion on Ingestion & Evidence Uploads**: Refactored `ingestion.py`, `evidence.py`, `ingestion_service.py`, and `evidence_service.py` to stream files directly to disk using `shutil.copyfileobj`.
- **Brittle Active Tab Matching**: Updated `layout.tsx` to extract sub-route segments using exact case ID splitting (`pathname.split('/cases/${caseId}')[1]`).
- **Non-RESTful State Mutator Query Parameters**: Converted `PATCH /paths/sections/{section_id}/status` to accept a proper JSON request body (`SectionStatusUpdateIn`).
- **Missing Validation on Legal Request Draft Edits**: Added Pydantic `Field(..., min_length=10)` validation to `LegalRequestUpdateIn`.
- **Dangling Search Debounce Promises**: Added `AbortController` request cancellation and unmount cleanup to `cases/page.tsx`.
- **Fragile Mock CCTNS FIR Number Parsing**: Refactored FIR number generation in `mock_cctns.py` using regex numeric extraction.
- **Verification**: `next build` compiled 14 static/dynamic routes cleanly with zero errors, and `python -m compileall app` passed cleanly.

**Phase 10D — Integration Verification and Handoff.** All tasks completed:

1. **Frontend build verified** — `npx next build` compiled 14 routes cleanly with zero errors.
   - Routes: `/`, `/_not-found`, `/cases`, `/cases/[id]`, `/cases/[id]/audit`, `/cases/[id]/evidence`, `/cases/[id]/ingestion`, `/cases/[id]/path`, `/cases/[id]/requests`, `/cases/[id]/responses`, `/cases/[id]/summary`, `/cases/[id]/timeline`, `/dashboard`, `/login`

2. **TypeScript clean** — `npx tsc --noEmit` produced zero errors.

3. **Backend imports clean** — `python -c "import app.main; print('ok')"` succeeded.

4. **Raw fetch() audit** — All `fetch()` calls are inside `lib/api.ts` only (the generic `request()` wrapper and the OSINT dossier `exportDossier()` function). Zero raw fetches in page components.

5. **Phase 10 seed data added** (`backend/app/seeds/run.py`):
   - 6 timeline events for Case 2: complaint_filed, entity_extracted, request_dispatched, response_received, officer_note, cctv_frame (with CCTV analysis payload)
   - 1 seeded CCTV evidence image fixture for the CCTV timeline event
   - 1 seeded video evidence record (COMPLETED status, 3 timestamped events) so the VideoEvidenceWorkspace report is demonstrable from fresh seed without uploading a real MP4

6. **DEMO_SCRIPT.md updated** — Added Part 10 with:
   - 10A: Timeline Agent & CCTV Pinning walkthrough
   - 10B: OSINT Digital Footprint Enrichment walkthrough
   - 10C: Video Evidence Analysis walkthrough
   - Fresh-seed smoke test checklist (11 checks)

7. **progress_tracker.md updated** — 10D marked `[x]` with full verification summary.

8. **ui_registry.md** — Phase 10 components already marked BUILT in previous sessions (TimelineWorkspace, OsintEnrichmentPanel, VideoEvidenceWorkspace).

## Decisions made

- Phase 10D does NOT modify any source code — it is a verification + docs phase only.
- Video evidence seeded as a static `ai_tags` fixture (COMPLETED state); no actual MP4 file is expected in `uploads/` for the seed, but the report view renders from `ai_tags` data.
- The CCTV timeline event references a seeded `evidence_files` record (`file_path="uploads/evidence/demo_cctv_frame.jpg"`) — this file does not need to exist on disk since the frontend renders the event from timeline metadata, not the file.
- The seed `import` for `TimelineEvent` is done inline inside the `main()` function (not at module top) to avoid circular import risk — this is consistent with how `OsintScan` etc. were previously seeded.

## Problems solved

- None in 10D (it is a verification phase; all 10A/B/C implementations were done in previous sessions).
- Confirmed that `uploadVideo()` in `api.ts` correctly uses `/video/analyze` which matches the router prefix `prefix="/video"` in `backend/app/routers/video.py` (flattened from the old `/api/v1/video` in Phase 11A).
- Confirmed that both raw `fetch()` calls in `api.ts` are within the file (not in page components), satisfying the provenance rule.

## Current state

**All 10 phases complete.** The project is in a clean, demo-ready state:
- Fresh seed works: `python -m app.seeds.run` from `backend/`
- Frontend dev server: `npm run dev` from `frontend/`
- Backend dev server: `uvicorn app.main:app --reload` from `backend/`
- Golden path: Case 1 → Ingestion → Path → Requests → Responses → Summary → Audit
- Phase 10 intelligence: Case 2 → Timeline + OSINT + Video

## Next session starts with

Nothing required — the project is complete. If continuing:
- Run `python -m app.seeds.run` from `backend/` to reset seed
- Run both servers and rehearse the golden path + intelligence moments per `DEMO_SCRIPT.md`
- If any Phase 10 component is missing from the UI (unlikely), check `frontend/components/` for `timeline-workspace.tsx`, `osint-enrichment-panel.tsx`, and `video-evidence-workspace.tsx`

## Open questions

None. Phase 10D checkpoint has passed.
