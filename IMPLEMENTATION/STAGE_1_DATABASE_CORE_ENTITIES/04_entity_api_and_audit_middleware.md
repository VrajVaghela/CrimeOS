# Stage 1 · Checkpoint 4 — Entity API Handlers & Audit Middleware

## Objective
Expose the entity extraction pipeline over HTTP, implement the officer confirm/reject workflow, and build the audit middleware that every future mutating endpoint (Stage 2+) will reuse.

## Context
- Depends on Checkpoint 3 (`internal/entity/service.go`).
- Endpoints to implement: `POST /api/v1/cases/{caseId}/entities/extract`, `GET /api/v1/cases/{caseId}/entities`, `PATCH /api/v1/entities/{entityId}` — exact contracts in `ARCHITECTURE.md` §1.5.
- Audit table: `audit_log` (Checkpoint 2).

## Step-by-Step Instructions
1. Create `internal/audit/repository.go`:
   - `func (r *Repository) Record(ctx context.Context, actorID, action, resourceType string, resourceID *uuid.UUID, before, after any, ipAddress string) error` — marshals `before`/`after` to JSONB and inserts one row into `audit_log`. Never update or delete.
2. Create `internal/middleware/audit.go`:
   - `func AuditWrap(auditRepo *audit.Repository, action, resourceType string) func(http.Handler) http.Handler` — a decorator that, for handlers explicitly wrapped with it, extracts `actor_id` from request context (set by an auth middleware stub — for hackathon scope, read an `X-Officer-Id` header if no JWT middleware exists yet; document this as a TODO for real auth) and logs the action AFTER the wrapped handler completes successfully (2xx status only — do not log failed attempts as successful actions, log them as a separate `*_FAILED` action instead).
3. Create `internal/handler/entity.go` with three handlers:
   - `ExtractEntities(svc *entity.Service, auditRepo *audit.Repository) http.HandlerFunc` — parses `{caseId}` path param and JSON body `{source_text, complaint_ref_id}`, calls `svc.ExtractAndPersist`, returns `201` with the entities array per contract. Validate `source_text` is non-empty (400 if not).
   - `ListEntities(repo *entity.Repository) http.HandlerFunc` — parses `status` and `type` query params as optional filters, calls a new `repo.ListByCaseFiltered(ctx, caseID, status, entityType)`, returns `200` with `{entities, total}`.
   - `UpdateEntityStatus(repo *entity.Repository, auditRepo *audit.Repository) http.HandlerFunc` — parses `{entityId}`, validates body `status` is one of `CONFIRMED`/`REJECTED`, loads the before-state, applies the update, records an audit entry with before/after JSON, returns `200` with updated entity. Return `422` if the entity is already `CONFIRMED` and the request tries to move it to `EXTRACTED` (no backward transitions except to `REJECTED`).
4. Add `repo.ListByCaseFiltered` and `repo.UpdateStatus` to `internal/entity/repository.go` using parameterized SQL with dynamic but injection-safe filter building (build a `WHERE` clause with a slice of args, never string-interpolate values).
5. Wire routes in `cmd/server/main.go` (or a new `internal/handler/router.go` if the file is getting large):
   ```
   r.Post("/api/v1/cases/{caseId}/entities/extract", handler.ExtractEntities(entitySvc, auditRepo))
   r.Get("/api/v1/cases/{caseId}/entities", handler.ListEntities(entityRepo))
   r.Patch("/api/v1/entities/{entityId}", handler.UpdateEntityStatus(entityRepo, auditRepo))
   ```
6. Write `internal/handler/entity_test.go` using `httptest` — cover the 201/200/400/422 paths with a mocked or test-database-backed repository (prefer a real test Postgres via `pgxpool` pointed at a `_test` schema/database if `TEST_POSTGRES_DSN` env var is set; otherwise skip with `t.Skip`).

## Verification Checkpoint
```bash
cd backend && go test ./internal/handler/... ./internal/audit/... -v

# end-to-end with running server:
curl -s -X POST http://localhost:8080/api/v1/cases/<uuid>/entities/extract \
  -H "Content-Type: application/json" -H "X-Officer-Id: officer_007" \
  -d '{"source_text":"Contact scammer at fraud@gmail.com or +919876543210"}' | jq

curl -s "http://localhost:8080/api/v1/cases/<uuid>/entities?status=EXTRACTED" | jq

curl -s -X PATCH http://localhost:8080/api/v1/entities/<entityId> \
  -H "Content-Type: application/json" -H "X-Officer-Id: officer_007" \
  -d '{"status":"CONFIRMED"}' | jq

psql "$POSTGRES_DSN" -c "SELECT actor_id, action, resource_type FROM audit_log ORDER BY occurred_at DESC LIMIT 5;"
# expect the CONFIRM action recorded with officer_007 as actor
```

## Documentation Requirements
- `internal/audit/doc.go`: explains append-only guarantee and that `Record` is the ONLY write path into `audit_log`.
- `backend/API.md`: append entries for all three endpoints matching the exact contract in `ARCHITECTURE.md` §1.5, including error cases.
- Inline TODO comment in `middleware/audit.go` marking the `X-Officer-Id` header as a placeholder pending real JWT-based auth integration with the core platform.
