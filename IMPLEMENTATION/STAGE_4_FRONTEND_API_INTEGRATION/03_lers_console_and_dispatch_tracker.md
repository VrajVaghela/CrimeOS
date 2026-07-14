# Stage 4 · Checkpoint 3 — LERS Console & Dispatch Tracker Pages

## Objective
Build `/cases/:caseId/lers` (draft, review, and approve legal requests from confirmed entities) and `/cases/:caseId/dispatch` (visualize dispatch state machine progress and SLA countdown per request, consuming Stage 2 Checkpoint 4's summary/timeline endpoints).

## Context
- API: `listProviders`, `createLegalRequest`, `getLegalRequest`, `approveLegalRequest`, `dispatchLegalRequest`, `listDispatchEvents`, `statusSummary`, `listWithTimeline` — all should already exist in `/src/api/legalRequests.ts` and `/src/api/dispatch.ts` from Checkpoint 1 (extend those files now if any endpoint was missed).

## Step-by-Step Instructions
1. Create `/src/hooks/useLegalRequests.ts` — list/create/approve/dispatch operations with the same optimistic-update-with-rollback pattern as `useEntities`.
2. Create `/src/components/LersRequestForm.tsx`:
   - Provider `<select>` grouped by `provider_category` (populate via `listProviders`).
   - Template type `<select>` restricted to the six enum values, each with a one-line description tooltip (pull descriptions from a small local constant map, not the backend).
   - Multi-select checklist of `CONFIRMED` entities only (fetch via `listEntities(caseId, {status: 'CONFIRMED'})`) — if zero confirmed entities exist, disable the form and show a link back to the Intake page.
   - Submit calls `createLegalRequest`; on success, navigate to or highlight the new request in the list below.
3. Create `/src/components/LersRequestCard.tsx` — shows request number, provider, template type, status chip (color per status), SLA due countdown (computed client-side from `sla_due_at`), and an "Approve" button visible only when `status === 'DRAFTED'`.
4. Create `/src/pages/LersConsole.tsx` combining the form and a list of `LersRequestCard`s for the case, sorted newest-first.
5. Create `/src/components/DispatchTimeline.tsx`:
   - Props: a single request + its `dispatch_events` array.
   - Renders a horizontal step tracker: `QUEUED → SENT → ACKNOWLEDGED → RESPONDED`, with completed steps filled and the current step pulsing/highlighted; if `status === 'OVERDUE'`, render a distinct overdue badge instead of continuing the happy-path steps.
6. Create `/src/pages/DispatchTracker.tsx`:
   - Fetches `statusSummary` for a header stat-bar (counts per status as colored badges).
   - Fetches `listWithTimeline`, renders one `DispatchTimeline` per request.
   - A "Dispatch" button on any `QUEUED` request card, calling `dispatchLegalRequest` and re-polling that request's events every 2s for ~10s after click (since dispatch is async — matches the backend worker's simulated ack delay from Stage 2 Checkpoint 3) to show live progression without a full manual refresh.
7. Write `src/components/DispatchTimeline.test.tsx` asserting correct step-highlighting logic for each possible status value including `OVERDUE`.

## Verification Checkpoint
```bash
cd frontend && npm run dev
# manual flow: from LersConsole, draft a CDR_REQUEST against 1-2 confirmed entities and a telecom provider;
# approve it; navigate to DispatchTracker; click Dispatch; watch the timeline progress from
# QUEUED -> SENT -> ACKNOWLEDGED within ~10 seconds without a manual page refresh

npx vitest run src/components/DispatchTimeline.test.tsx
npm run build
```

## Documentation Requirements
- JSDoc on `DispatchTimeline` documenting the exact status→step mapping so a future contributor doesn't have to reverse-engineer it from CSS classes.
- `frontend/src/api/README.md`: mark all consumed endpoints against "LersConsole" / "DispatchTracker".
