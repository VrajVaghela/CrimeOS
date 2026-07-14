# Stage 4 · Checkpoint 4 — Response Analytics Dashboard, Upload UI & End-to-End Walkthrough

## Objective
Build `/cases/:caseId/analytics`: response file upload UI, parse-status feedback, paginated normalized-record tables, and an intelligence-flags panel — then write one full end-to-end walkthrough test proving the entire pipeline (intake → LERS → dispatch → upload → parse → flags) works as a connected system.

## Context
- API: `uploadResponse`, `getResponseDump`, `listCdrRecords`, `listIpSessionRecords`, `listBankTransactionRecords`, `listIntelligenceFlags` from `/src/api/analytics.ts` and `intelligenceFlags.ts`.
- This is the final integration checkpoint for the module — treat the E2E test as the acceptance gate for the whole hackathon build.

## Step-by-Step Instructions
1. Create `/src/components/ResponseUploadForm.tsx`:
   - File input restricted via `accept=".csv,.xlsx,.pdf"`; client-side size pre-check against the same limit the backend enforces (read from a constant, keep in sync with `MAX_UPLOAD_BYTES` documented in `backend/API.md`).
   - On submit, calls `uploadResponse(legalRequestId, file)`, then polls `getResponseDump(legalRequestId, dumpId)` every 1.5s until `parse_status` is `PARSED` or `FAILED`, showing a progress indicator.
   - On `FAILED` or partial `parse_errors`, render an expandable error list (row number + reason) so the officer can see exactly what didn't parse.
2. Create `/src/components/RecordTable.tsx` — generic paginated table component (props: `columns`, `fetchPage(page, limit)`, `rowKey`) reused for CDR/IP/bank record listings to avoid three near-duplicate table implementations.
3. Create `/src/components/IntelligenceFlagPanel.tsx` — lists flags grouped by severity (`CRITICAL`/`HIGH` visually prioritized at top), each showing `flag_type`, `summary`, and a link to the linked entities/records where feasible.
4. Create `/src/pages/AnalyticsDashboard.tsx`:
   - A legal-request selector (only `SENT`/`ACKNOWLEDGED`/`RESPONDED` requests are eligible for upload — filter accordingly).
   - `ResponseUploadForm` for the selected request.
   - Below it, tabs or sections for CDR / IP / Bank `RecordTable` instances (render only the table relevant to the selected request's `template_type`).
   - `IntelligenceFlagPanel` for the whole case (not just the selected request) at the bottom.
5. Write `/e2e/full_pipeline.spec.ts` using Playwright (approved for this checkpoint only — add to dependencies with justification: browser-driven E2E cannot be done with vitest/RTL alone):
   - Seeds a case via a direct API call (or a fixture endpoint if one exists), then drives the UI: paste complaint text → extract → confirm all entities → draft a legal request → approve → dispatch → wait for ACKNOWLEDGED → upload a fixture CSV matching the request's template type → wait for PARSED → assert at least one record appears in the relevant `RecordTable` → assert the flags panel is reachable (flag presence depends on fixture data crossing a heuristic threshold — assert conditionally or use a fixture deliberately crafted to trigger one, e.g. 3 identical-UPI transactions for `REPEATED_COUNTERPARTY`).
6. Add an `npm run e2e` script wired to Playwright config, headless by default, with a `--headed` flag documented for local debugging.

## Verification Checkpoint
```bash
cd frontend && npm run dev &
cd backend && go run ./cmd/server &

cd frontend && npx playwright install --with-deps chromium
npm run e2e
# expect the full_pipeline.spec.ts scenario to pass end-to-end without manual intervention

npm run build   # final TS gate across the whole frontend
```
Manual sanity pass: as a human, repeat the same walkthrough by hand in the browser once, since an E2E test can pass while still "feeling" wrong in ways automated assertions miss (spacing, confusing copy, unclear error states) — note any UX rough edges as follow-up items rather than blocking the hackathon submission on them.

## Documentation Requirements
- `frontend/README.md`: full "How to run this module locally" section — env vars, `docker-compose` services needed (Postgres + Mongo), backend start command, frontend start command, and how to run the E2E suite.
- `frontend/src/api/README.md`: finalize by confirming every function listed in the file maps to a real, tested backend endpoint — flag and remove any that were scaffolded but never wired to a page.
- Top-level `IMPLEMENTATION/COMPLETION_NOTES.md` (new file): a short retrospective log of any checkpoint that deviated from its original prompt (e.g., PDF rendering downgraded to HTML in Stage 2 Checkpoint 1) so the next developer isn't confused by architecture-doc-vs-code drift.
