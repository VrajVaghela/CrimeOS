---
name: Audit-Wrapped Go Handler
description: Scaffolds a new HTTP handler in internal/handler that follows this project's mandatory audit-middleware, error-envelope, and thin-handler conventions. Use for every new mutating (POST/PATCH/DELETE) endpoint.
---

# Audit-Wrapped Go Handler

## Description
TRAE_SYSTEM_INSTRUCTIONS.md §2 makes audit logging non-negotiable for every mutating endpoint, and §3 requires handlers to stay thin (validation + service call only, no business logic or inline SQL). This skill is the checklist that keeps every new handler across Stages 1-3 identical in shape, so a reviewer (or QA-Verification-Agent) can scan any handler file and know exactly what to expect.

## When to Use
- Any checkpoint that adds a `POST`, `PATCH`, or `DELETE` route.
- Read-only (`GET`) endpoints do NOT need audit wrapping — skip this skill for those, just validate + call the service + return JSON.

## Instructions
1. **File location**: `internal/handler/<domain>.go` (e.g. `entity.go`, `legal_request.go`, `dispatch.go`) — never create a handler file outside `internal/handler`.
2. **Signature pattern**:
   ```go
   func <Action><Resource>(svc *domain.Service, auditRepo *audit.Repository) http.HandlerFunc {
       return func(w http.ResponseWriter, r *http.Request) {
           // step 3-6 below
       }
   }
   ```
3. **Parse & validate input first.** Path params via `chi.URLParam`, body via `json.NewDecoder(r.Body).Decode`. On any validation failure, write the standard error envelope and return immediately — never proceed with partially-valid input.
   ```go
   type errorEnvelope struct {
       Error struct {
           Code    string         `json:"code"`
           Message string         `json:"message"`
           Details map[string]any `json:"details,omitempty"`
       } `json:"error"`
   }
   ```
4. **Capture before-state** if the operation mutates an existing resource (skip for pure creates).
5. **Call exactly one service method.** No SQL, no multi-step orchestration inline in the handler — that belongs in `internal/<domain>/service.go`.
6. **On success (2xx only)**, call `auditRepo.Record(ctx, actorID, action, resourceType, &resourceID, before, after, ipAddress)` — `actorID` comes from the `X-Officer-Id` header (documented TODO for real JWT auth). Never log an audit entry for a failed operation as if it succeeded; failed attempts get a separate `*_FAILED` action string if the checkpoint calls for it.
7. **Response status codes**: `201` create, `200` read/update, `202` async-accepted, `4xx` per the specific validation/conflict rule in that checkpoint's contract — never default to `200` for everything.
8. **Register the route** in the router file, grouped with other routes for the same resource.
9. **Write the handler test** (`_test.go`, `httptest`) covering the happy path and at least one error path (400/404/409/422 as applicable).
10. **Append the endpoint to `backend/API.md`** in the exact contract format from ARCHITECTURE.md §1.5 (method, path, request body, response body, status codes) — do this in the same commit/turn as the handler, not as a follow-up.

## Example skeleton
```go
// UpdateEntityStatus confirms or rejects a digital entity following officer review.
func UpdateEntityStatus(repo *entity.Repository, auditRepo *audit.Repository) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        entityID, err := uuid.Parse(chi.URLParam(r, "entityId"))
        if err != nil {
            writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid entity id")
            return
        }
        var body struct{ Status string `json:"status"` }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
            writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid body")
            return
        }
        before, err := repo.GetByID(r.Context(), entityID)
        if err != nil {
            writeError(w, http.StatusNotFound, "NOT_FOUND", "entity not found")
            return
        }
        after, err := repo.UpdateStatus(r.Context(), entityID, body.Status)
        if err != nil {
            // map typed errors to 422/409 as appropriate
            writeError(w, http.StatusUnprocessableEntity, "INVALID_TRANSITION", err.Error())
            return
        }
        _ = auditRepo.Record(r.Context(), officerID(r), "ENTITY_STATUS_UPDATED", "digital_entities", &entityID, before, after, r.RemoteAddr)
        writeJSON(w, http.StatusOK, map[string]any{"entity": after})
    }
}
```
