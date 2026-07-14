# Stage 2 · Checkpoint 2 — Legal Request Creation & Approval API

## Objective
Build the service and handler layer that turns confirmed entities into a persisted, rendered `legal_requests` row, plus the draft→approve workflow gate before dispatch.

## Context
- Depends on Stage 1 Checkpoint 4 (`digital_entities` with `CONFIRMED` status) and Stage 2 Checkpoint 1 (`internal/lers`).
- Endpoints: `GET /api/v1/service-providers`, `POST /api/v1/cases/{caseId}/legal-requests`, `GET /api/v1/legal-requests/{id}`, `POST /api/v1/legal-requests/{id}/approve` — contracts in `ARCHITECTURE.md` §1.5.

## Step-by-Step Instructions
1. Create `internal/lers/repository.go`:
   - `ListProviders(ctx, category *string) ([]model.ServiceProvider, error)`.
   - `NextRequestSequence(ctx, tx pgx.Tx, year int) (int, error)` — `SELECT COUNT(*) + 1 FROM legal_requests WHERE request_number LIKE $1` inside the same transaction as the insert, to avoid race duplication (acceptable for hackathon scale; document the theoretical race under high concurrency and the production fix — a dedicated Postgres `SEQUENCE` per year — as a code comment).
   - `Insert(ctx, tx pgx.Tx, req model.LegalRequest) (model.LegalRequest, error)`.
   - `GetByID(ctx, id uuid.UUID) (model.LegalRequest, []model.DispatchEvent, error)` — joins `dispatch_events`.
   - `UpdateStatus(ctx, id uuid.UUID, newStatus string, extra map[string]any) (model.LegalRequest, error)`.
2. Create `internal/lers/service.go`:
   - `func (s *Service) CreateRequest(ctx context.Context, caseID uuid.UUID, providerID uuid.UUID, templateType string, linkedEntityIDs []uuid.UUID, draftedBy string) (model.LegalRequest, error)`:
     a. Fetch the linked entities; validate ALL are `status = CONFIRMED` and belong to `caseID` — return a typed `ErrEntityNotConfirmed` (maps to `422`) if not.
     b. Fetch the provider; validate `active = true` — `404`/`409` if not found/inactive.
     c. Begin a transaction; generate `request_number` via `NextRequestSequence`; compute `sla_due_at = now() + provider.SLAHours hours`.
     d. Call `lers.Engine.Render(...)` then `RenderToDocument(...)`, storing the resulting path as `rendered_doc_path`.
     e. Insert the row with `status = DRAFTED`; commit.
3. Create `internal/handler/legal_request.go`:
   - `ListProviders` — `200 {providers, total}`, supports `?category=`.
   - `CreateLegalRequest` — parses body, calls `service.CreateRequest`, wraps with `AuditWrap("LEGAL_REQUEST_DRAFTED", "legal_requests")`, returns `201`.
   - `GetLegalRequest` — `200 {legal_request, dispatch_events}`, `404` if missing.
   - `ApproveLegalRequest` — validates current `status == DRAFTED`, transitions to `QUEUED`, records `approved_by`, wraps with `AuditWrap("LEGAL_REQUEST_APPROVED", "legal_requests")`, returns `200`. Return `409` if status is not `DRAFTED` (cannot approve twice or approve a dispatched request).
4. Wire the four new routes into the router.
5. Write `internal/lers/service_test.go` covering: happy path creation, rejection when an entity is not confirmed, rejection when provider inactive, request-number format correctness, and idempotent-safe sequence generation under a simulated concurrent-insert test (spin two goroutines calling `CreateRequest` in the same year, assert both get unique `request_number`s — flag as a known race-risk area per the comment in step 1).

## Verification Checkpoint
```bash
cd backend && go test ./internal/lers/... ./internal/handler/... -v

curl -s http://localhost:8080/api/v1/service-providers?category=TELECOM | jq

curl -s -X POST http://localhost:8080/api/v1/cases/<caseId>/legal-requests \
  -H "Content-Type: application/json" -H "X-Officer-Id: officer_007" \
  -d '{"provider_id":"<providerId>","template_type":"CDR_REQUEST","linked_entity_ids":["<entityId>"],"drafted_by":"officer_007"}' | jq
# expect 201 with request_number like LERS/2026/000001

curl -s -X POST http://localhost:8080/api/v1/legal-requests/<id>/approve \
  -H "Content-Type: application/json" -d '{"approved_by":"supervisor_001"}' | jq
# expect status: QUEUED

curl -s -X POST http://localhost:8080/api/v1/legal-requests/<id>/approve \
  -H "Content-Type: application/json" -d '{"approved_by":"supervisor_001"}' -w "\n%{http_code}\n"
# second call expect 409
```

## Documentation Requirements
- `backend/API.md`: append all four endpoints with full request/response/error examples.
- Code comment on `NextRequestSequence` explicitly flagging the concurrency caveat and the production-grade fix.
- `internal/lers/doc.go`: update to describe the full draft→approve lifecycle now that service.go exists.
