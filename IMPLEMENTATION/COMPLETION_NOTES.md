# Implementation Completion Notes

Retrospective log of checkpoints that deviated from their original prompts. Refer here when architecture docs and running code disagree.

## Stage 2 · Checkpoint 1 — LERS Template Engine

- **PDF rendering downgraded to HTML:** `internal/lers/pdf.go` implements `RenderToDocument` producing `.html` files instead of PDF, avoiding an extra PDF library dependency for hackathon scope. `rendered_doc_path` stores the HTML path.

## Stage 4 · Checkpoint 1 — API Client

- **`listProviders` alias:** Backend endpoint is `GET /api/v1/service-providers`; frontend exposes both `listServiceProviders()` and `listProviders()` as aliases.

## Stage 4 · Checkpoint 3 — Dispatch Timeline

- **Timeline event field name:** `GET /legal-requests/:id` returns `dispatch_events`, but `GET /cases/:caseId/legal-requests/timeline` returns `events`. Frontend type `LegalRequestWithEvents` accepts both; use `getDispatchEvents()` helper to normalize.

## Stage 4 · Checkpoint 4 — Upload Limit

- **`MAX_UPLOAD_BYTES`:** Frontend constant set to 25 MB matching `backend/internal/analytics/storage.go` `defaultMaxUploadBytes`. Not yet documented as a named constant in `backend/API.md` (only described as 413 response).

## Stage 4 · Checkpoint 4 — Intelligence Severity

- **No `CRITICAL` severity in backend:** Heuristics emit `HIGH`, `MEDIUM`, or `LOW` only. `IntelligenceFlagPanel` sorts `CRITICAL` first if present but backend never produces it in current heuristics.

## Stage 4 · Checkpoint 4 — E2E Backend Dependency

- **E2E requires live backend:** `full_pipeline.spec.ts` polls `/api/v1/health` and fails fast if backend is not running. Playwright config starts the frontend dev server only; backend must be started separately.
