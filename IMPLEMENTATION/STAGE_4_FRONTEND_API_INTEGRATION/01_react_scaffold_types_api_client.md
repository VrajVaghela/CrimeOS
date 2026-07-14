# Stage 4 · Checkpoint 1 — React Scaffold, TypeScript Types & API Client Layer

## Objective
Stand up the React + TypeScript frontend skeleton, mirror every backend DTO as a TypeScript interface, and build the typed `fetch` wrapper layer components will use — no component calls `fetch` directly, per `TRAE_SYSTEM_INSTRUCTIONS.md` §5.

## Context
- Full backend contract source: `backend/API.md` (accumulated through Stages 1-3) and `ARCHITECTURE.md` §1.5.
- Folder layout: `TRAE_SYSTEM_INSTRUCTIONS.md` §3.

## Step-by-Step Instructions
1. Scaffold with Vite: `npm create vite@latest frontend -- --template react-ts`, then `cd frontend && npm install`.
2. Install `axios` is NOT approved by default — use native `fetch` per zero-dependency policy; if pagination/query-string building gets unwieldy, a tiny hand-written `buildQuery(params)` helper is preferred over adding `qs`.
3. Create `/src/types/entity.ts`, `legalRequest.ts`, `dispatch.ts`, `analytics.ts`, `intelligence.ts` — one interface per backend model, field names matching JSON exactly (e.g. `entity_type`, not `entityType`, to avoid silent mapping bugs — cast at the API boundary only if the team later wants camelCase, not now).
4. Create `/src/api/client.ts`:
   - `const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'`.
   - `async function apiFetch<T>(path: string, options?: RequestInit): Promise<T>` — sets `Content-Type: application/json` for JSON bodies, attaches `X-Officer-Id` header from an auth context (stub for now — read from `localStorage` key `officer_id` seeded by a login placeholder), throws a typed `ApiError` (containing `code`, `message`, `status`) on non-2xx, parsing the standard error envelope from `ARCHITECTURE.md` §1.5.
5. Create `/src/api/entities.ts`, `legalRequests.ts`, `dispatch.ts`, `analytics.ts`, `intelligenceFlags.ts` — one typed function per backend endpoint (e.g. `extractEntities(caseId, sourceText)`, `listEntities(caseId, filters)`, `updateEntityStatus(entityId, status)`, and so on through every endpoint documented in `backend/API.md`). Every function is fully typed on both input and return using the interfaces from step 3.
6. Create `/src/context/AuthContext.tsx` — minimal context providing `{ officerId, policeStation }`, hardcoded/localStorage-backed for hackathon scope, with a clear TODO comment for real auth integration.
7. Create `/src/context/CaseContext.tsx` — holds the currently active `caseId` (read from route param or a case-selector dropdown), consumed by all pages.
8. Set up React Router (`react-router-dom` — approved, add to `TRAE_SYSTEM_INSTRUCTIONS.md` approved list if not already implicitly covered) with routes for the four pages built in later checkpoints: `/cases/:caseId/intake`, `/cases/:caseId/lers`, `/cases/:caseId/dispatch`, `/cases/:caseId/analytics`.
9. Write a smoke test (`src/api/client.test.ts` using `vitest`) mocking `fetch` and asserting `apiFetch` correctly throws `ApiError` on a 422 response with the standard envelope shape.

## Verification Checkpoint
```bash
cd frontend && npm run dev
# visually confirm the Vite dev server boots and the router renders an empty shell per route without console errors

npm run build
# must complete with zero TypeScript errors — this is the primary correctness gate for this checkpoint

npx vitest run src/api/client.test.ts
```

## Documentation Requirements
- `frontend/src/api/README.md`: one line per exported API function naming the backend endpoint it wraps, so drift between `backend/API.md` and the client is easy to spot during review.
- Comment at top of `AuthContext.tsx` and `CaseContext.tsx` marking hackathon-scope shortcuts explicitly.
