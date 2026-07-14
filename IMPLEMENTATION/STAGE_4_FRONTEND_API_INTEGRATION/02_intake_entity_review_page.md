# Stage 4 · Checkpoint 2 — Complaint Intake & Entity Review Page

## Objective
Build the `/cases/:caseId/intake` page: a textarea for pasting complaint text, an "Extract Entities" action, and a review table where officers confirm/reject each extracted entity — the human-in-the-loop gate required before any legal request can reference an entity.

## Context
- API: `extractEntities`, `listEntities`, `updateEntityStatus` from Checkpoint 1's `/src/api/entities.ts`.
- Backend enforces `CONFIRMED`-only linkage at request-creation time (Stage 2 Checkpoint 2) — the UI must make this constraint visible and easy to act on, not just handle the eventual 422.

## Step-by-Step Instructions
1. Create `/src/hooks/useEntities.ts`:
   - `function useEntities(caseId: string)` returning `{ entities, loading, error, refetch, extract, confirm, reject }` — wraps the three API calls, manages loading/error state locally, and optimistically updates the local list on confirm/reject with rollback on API failure.
2. Create `/src/components/EntityBadge.tsx` — small presentational component rendering an entity's type as a colored pill (distinct color per `entity_type`) plus its `normalized_value`, and a confidence indicator (e.g., a subtle percentage or a low-confidence warning icon when `confidence_score < 0.8`).
3. Create `/src/components/EntityReviewTable.tsx`:
   - Props: `entities: DigitalEntity[]`, `onConfirm(id)`, `onReject(id)`.
   - Renders sortable/filterable table (client-side filter by `entity_type` and `status` — no need for a table library, plain controlled `<select>` + array `.filter()`).
   - Each `EXTRACTED` row shows Confirm/Reject buttons; `CONFIRMED`/`REJECTED` rows show a static status chip instead of buttons (matches backend's no-backward-transition rule from Stage 1 Checkpoint 4 — UI should not offer an action the API will reject).
4. Create `/src/pages/IntakeReview.tsx`:
   - Textarea + "Extract Entities" button calling `extract(sourceText)`; disable the button while `loading`; show a toast/inline message on `ApiError` (e.g., empty text → surfaces the backend's 400 validation message verbatim).
   - Renders `EntityReviewTable` below, wired to `confirm`/`reject`.
   - A persistent summary strip: "X confirmed · Y pending · Z rejected" computed from the entities array.
5. Add loading skeleton and empty-state ("No entities extracted yet — paste complaint text above") per `TRAE_SYSTEM_INSTRUCTIONS.md` §5 mandatory states.
6. Write `src/pages/IntakeReview.test.tsx` (vitest + React Testing Library) covering: extract button disabled during loading, confirm button removed after status flips to CONFIRMED, error message rendered on a mocked 400 response.

## Verification Checkpoint
```bash
cd frontend && npm run dev
# manual UI check: navigate to /cases/<realCaseId>/intake, paste a sample complaint containing
# an IP, email, phone, UPI, and social handle; click Extract; confirm 3 of 5, reject 1, leave 1 pending;
# confirm the summary strip counts update live and match backend state via:
curl -s "http://localhost:8080/api/v1/cases/<caseId>/entities" | jq '.entities | group_by(.status) | map({status: .[0].status, count: length})'

npx vitest run src/pages/IntakeReview.test.tsx
npm run build   # zero TS errors gate
```

## Documentation Requirements
- Component-level JSDoc comment on `EntityReviewTable` documenting the props contract and the no-backward-transition UI rule it enforces.
- `frontend/src/api/README.md`: mark `extractEntities`, `listEntities`, `updateEntityStatus` as "consumed by IntakeReview page".
