# Stage 2 · Checkpoint 4 — Status Tracking & Dashboard Aggregation

## Objective
Add a case-level aggregation endpoint that summarizes legal request status distribution (for the Dispatch Tracker frontend page in Stage 4), plus a per-request timeline view combining `legal_requests` + `dispatch_events` in one payload.

## Context
- Depends on Checkpoints 2 and 3.
- New endpoint not yet in `ARCHITECTURE.md` §1.5 — add it there as part of this checkpoint's documentation step.

## Step-by-Step Instructions
1. Create `internal/lers/aggregation.go`:
   - `func (r *Repository) StatusSummary(ctx context.Context, caseID uuid.UUID) (map[string]int, error)` — `SELECT status, COUNT(*) FROM legal_requests WHERE case_id=$1 GROUP BY status`.
   - `func (r *Repository) ListWithTimeline(ctx context.Context, caseID uuid.UUID) ([]model.LegalRequestWithEvents, error)` — one query for `legal_requests` filtered by case, then a second batched query for all their `dispatch_events` (avoid N+1 — use `WHERE legal_request_id = ANY($1)` with the collected IDs), assembled in Go.
2. Add `GET /api/v1/cases/{caseId}/legal-requests/summary` to `internal/handler/legal_request.go`:
   - Returns `200 {"by_status": {"DRAFTED": 2, "SENT": 5, "ACKNOWLEDGED": 3, "OVERDUE": 1}, "total": 11}`.
3. Add `GET /api/v1/cases/{caseId}/legal-requests/timeline`:
   - Returns `200 {"requests": [{"legal_request": {...}, "events": [...]}]}` — this is the primary data source for the Dispatch Tracker Gantt/timeline UI in Stage 4.
4. Add both endpoints to the router.
5. Write `internal/lers/aggregation_test.go` seeding a mix of statuses and asserting the summary counts match, and asserting the timeline query returns events correctly grouped per request (no cross-request event leakage — this is the bug class N+1-avoidance code is prone to).

## Verification Checkpoint
```bash
cd backend && go test ./internal/lers/... -run TestStatusSummary -v
cd backend && go test ./internal/lers/... -run TestListWithTimeline -v

curl -s http://localhost:8080/api/v1/cases/<caseId>/legal-requests/summary | jq
curl -s http://localhost:8080/api/v1/cases/<caseId>/legal-requests/timeline | jq
# manually verify no request's events array contains an event from a different legal_request_id
```

## Documentation Requirements
- `ARCHITECTURE.md` §1.5 (Legal Request Engine section): append the two new endpoint contracts — this is a documentation-editing step, not just a new-file step; use `str_replace` against the existing file to insert them in the correct section.
- `backend/API.md`: mirror the same additions.
- `internal/lers/doc.go`: note that `aggregation.go` exists specifically to serve dashboard/timeline UI needs without N+1 queries.
