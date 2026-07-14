
# API Wrappers

This directory contains fully typed API client functions for the CrimeOS Digital Footprint backend.

## Wrappers

### `entities.ts` — consumed by **IntakeReview**
- `extractEntities(caseId, data)` — POST `/api/v1/cases/:caseId/entities/extract`
- `listEntities(caseId, filters)` — GET `/api/v1/cases/:caseId/entities`
- `updateEntityStatus(entityId, data)` — PATCH `/api/v1/entities/:entityId`

### `legalRequests.ts` — consumed by **LersConsole**, **DispatchTracker**, **AnalyticsDashboard**
- `listServiceProviders()` / `listProviders()` — GET `/api/v1/service-providers`
- `createLegalRequest(caseId, data)` — POST `/api/v1/cases/:caseId/legal-requests`
- `getLegalRequest(id)` — GET `/api/v1/legal-requests/:id`
- `approveLegalRequest(id, data)` — POST `/api/v1/legal-requests/:id/approve`
- `getStatusSummary(caseId)` / `statusSummary(caseId)` — GET `/api/v1/cases/:caseId/legal-requests/summary`
- `getTimeline(caseId)` / `listWithTimeline(caseId)` — GET `/api/v1/cases/:caseId/legal-requests/timeline`

### `dispatch.ts` — consumed by **LersConsole**, **DispatchTracker**, **AnalyticsDashboard**
- `dispatchLegalRequest(id)` — POST `/api/v1/legal-requests/:id/dispatch`
- `listDispatchEvents(id)` — GET `/api/v1/legal-requests/:id/dispatch-events`
- `listLegalRequestsByStatus(caseId, status)` — GET `/api/v1/cases/:caseId/legal-requests`

### `analytics.ts` — consumed by **AnalyticsDashboard**
- `uploadResponse(legalRequestId, file)` — POST `/api/v1/legal-requests/:id/responses`
- `getResponseDump(legalRequestId, dumpId)` — GET `/api/v1/legal-requests/:id/responses/:dumpId`
- `listCDRRecords(legalRequestId, options)` / `listCdrRecords(...)` — GET `/api/v1/legal-requests/:id/cdr-records`
- `listIPSessionRecords(legalRequestId, options)` / `listIpSessionRecords(...)` — GET `/api/v1/legal-requests/:id/ip-session-records`
- `listBankTransactionRecords(legalRequestId, options)` — GET `/api/v1/legal-requests/:id/bank-transaction-records`

### `intelligenceFlags.ts` — consumed by **AnalyticsDashboard**
- `listIntelligenceFlags(caseId, severity)` — GET `/api/v1/cases/:caseId/intelligence-flags`

All functions above are wired to a page and backed by a real backend endpoint.
