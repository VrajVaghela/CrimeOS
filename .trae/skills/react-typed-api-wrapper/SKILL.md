---
name: React Typed API Wrapper
description: Adds a new typed fetch-wrapper function to /frontend/src/api/*.ts against a documented backend endpoint, plus the matching TypeScript interface and README entry. Use for every Stage 4 checkpoint that consumes a new or existing backend endpoint.
---

# React Typed API Wrapper

## Description
TRAE_SYSTEM_INSTRUCTIONS.md §5 bans components from calling `fetch` directly — every backend call goes through a typed function in `/src/api/`. This skill keeps that boundary consistent across all of Stage 4 and prevents `any`-typed API responses from leaking into components.

## When to Use
- A Stage 4 checkpoint's component needs data from an endpoint documented in `backend/API.md`.
- Do NOT use this skill to invent a new backend behavior — if the endpoint doesn't exist yet in `API.md`, that's a backend checkpoint gap, flag it rather than mocking a fake client function.

## Instructions
1. **Locate the endpoint's exact contract** in `backend/API.md` (method, path, request body, response body, error cases) — copy field names verbatim, do not camelCase them at this layer.
2. **Interface first**: if a TypeScript interface for the request/response shape doesn't already exist in `/src/types/`, create it there, matching JSON field names exactly (`entity_type`, not `entityType`).
3. **Function shape** in `/src/api/<domain>.ts`:
   ```ts
   export async function actionResource(
     pathParam: string,
     body?: RequestType
   ): Promise<ResponseType> {
     return apiFetch<ResponseType>(`/api/v1/...${pathParam}...`, {
       method: 'POST', // or GET/PATCH per the contract
       body: body ? JSON.stringify(body) : undefined,
     });
   }
   ```
4. **Always route through `apiFetch`** (`/src/api/client.ts`) — never a bare `fetch` call, so the `X-Officer-Id` header and standard error-envelope parsing stay centralized.
5. **Query params**: for list endpoints with filters (`?status=`, `?page=&limit=`), accept a typed options object and build the query string with the project's hand-written `buildQuery` helper — no `qs` dependency.
6. **Error handling stays in the caller (hook/component), not in the wrapper** — the wrapper's only job is to call `apiFetch` and return/throw; don't swallow errors here.
7. **Update `/src/api/README.md`**: one line per function naming the backend endpoint it wraps and which page/hook consumes it (mark "consumed by: <PageName>" once wired) — mandatory per Stage 4 Checkpoint 1's documentation requirement.
8. **Verify**: `npm run build` must pass with zero TypeScript errors after adding the function — this is the primary correctness gate, since a mismatched interface will surface as a compile error here before it ever reaches a runtime bug.

## Example
```ts
// /src/api/legalRequests.ts
export async function approveLegalRequest(
  id: string,
  approvedBy: string
): Promise<{ legal_request: LegalRequest }> {
  return apiFetch(`/api/v1/legal-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approved_by: approvedBy }),
  });
}
```
README line: `approveLegalRequest — POST /api/v1/legal-requests/{id}/approve — consumed by: LersConsole`
