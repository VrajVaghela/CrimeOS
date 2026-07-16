# API Endpoints

Base URL: `http://localhost:8080`

All current backend routes are mounted under `/api/v1` in `backend/cmd/server/main.go`.

## Health

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Check PostgreSQL and MongoDB connectivity. |

## Entities

| Method | Path | Purpose | Frontend Use |
| --- | --- | --- | --- |
| `POST` | `/api/v1/cases/{caseId}/entities/extract` | Extract digital entities from complaint text. | Intake review |
| `GET` | `/api/v1/cases/{caseId}/entities` | List case entities, optionally filtered by `status` or `type`. | Intake review, LERS form |
| `GET` | `/api/v1/cases/{caseId}/osint/{entityId}` | Fetch the latest OSINT enrichment for a confirmed entity. | Intake review OSINT panel |
| `PATCH` | `/api/v1/entities/{entityId}` | Confirm or reject an extracted entity. | Intake review |

### Extract Entities Request

```json
{
  "source_text": "Victim received calls from +919876543210...",
  "complaint_ref_id": "optional-uuid"
}
```

### Update Entity Request

```json
{
  "status": "CONFIRMED"
}
```

Valid statuses include `EXTRACTED`, `CONFIRMED`, `REJECTED`, and `MERGED`.

## Service Providers And Legal Requests

| Method | Path | Purpose | Frontend Use |
| --- | --- | --- | --- |
| `GET` | `/api/v1/service-providers` | List active/inactive LERS providers. Supports `category`. | LERS console |
| `POST` | `/api/v1/cases/{caseId}/legal-requests` | Create a drafted legal request. | LERS console |
| `GET` | `/api/v1/legal-requests/{id}` | Get one legal request with dispatch events. | Request details / API wrapper |
| `POST` | `/api/v1/legal-requests/{id}/approve` | Approve a drafted request and move it to `QUEUED`. | LERS console |
| `GET` | `/api/v1/cases/{caseId}/legal-requests` | List legal requests, optionally filtered by `status`. | LERS console, analytics |
| `GET` | `/api/v1/cases/{caseId}/legal-requests/summary` | Count requests by status. | Dispatch tracker |
| `GET` | `/api/v1/cases/{caseId}/legal-requests/timeline` | List requests with dispatch timelines. | Dispatch tracker |

### Create Legal Request Request

```json
{
  "provider_id": "uuid",
  "template_type": "CDR_REQUEST",
  "linked_entity_ids": ["uuid"],
  "drafted_by": "officer_123",
  "issuing_officer_name": "officer_123",
  "issuing_officer_designation": "Investigating Officer",
  "police_station": "Central Police Station",
  "legal_basis": "Section 91 CrPC"
}
```

Valid template types:

- `IP_LOG_REQUEST`
- `CDR_REQUEST`
- `KYC_REQUEST`
- `ACCOUNT_FREEZE_REQUEST`
- `SUBSCRIBER_DETAILS_REQUEST`
- `BANK_STATEMENT_REQUEST`

### Approve Legal Request Request

```json
{
  "approved_by": "officer_123"
}
```

## Dispatch

| Method | Path | Purpose | Frontend Use |
| --- | --- | --- | --- |
| `POST` | `/api/v1/legal-requests/{id}/dispatch` | Enqueue a `QUEUED` legal request for dispatch simulation. | Dispatch tracker |
| `GET` | `/api/v1/legal-requests/{id}/dispatch-events` | List dispatch events for one request. | Dispatch tracker polling |

Dispatch timeline statuses:

| Request Status | Timeline Rendering |
| --- | --- |
| `DRAFTED` | All steps pending. |
| `QUEUED` | `QUEUED` current. |
| `SENT` | `QUEUED` completed, `SENT` current. |
| `ACKNOWLEDGED` | `QUEUED` and `SENT` completed, `ACKNOWLEDGED` current. |
| `RESPONDED` | Completed through `ACKNOWLEDGED`, `RESPONDED` current. |
| `OVERDUE` | Overdue badge instead of happy-path tracker. |
| `REJECTED_BY_PROVIDER` | All steps pending as terminal failure. |

## Response Analytics

| Method | Path | Purpose | Frontend Use |
| --- | --- | --- | --- |
| `POST` | `/api/v1/legal-requests/{id}/responses` | Upload a provider response file. | Analytics dashboard |
| `GET` | `/api/v1/legal-requests/{id}/responses/{dumpId}` | Poll parse status and parse errors. | Upload form |
| `GET` | `/api/v1/legal-requests/{id}/cdr-records` | List paginated CDR records. | Analytics dashboard |
| `GET` | `/api/v1/legal-requests/{id}/ip-session-records` | List paginated IP session records. | Analytics dashboard |
| `GET` | `/api/v1/legal-requests/{id}/bank-transaction-records` | List paginated bank transaction records. | Analytics dashboard |
| `GET` | `/api/v1/cases/{caseId}/intelligence-flags` | List case intelligence flags, optionally filtered by severity. | Analytics dashboard |

### Upload Provider Response

Request:

- Content type: `multipart/form-data`
- Form field: `file`
- Accepted extensions in frontend: `.csv`, `.xlsx`, `.pdf`
- Max upload size: 25 MB

Response:

```json
{
  "dump_id": "mongo-object-id",
  "parse_status": "PENDING"
}
```

### Record Pagination

Record list endpoints accept:

| Query | Description |
| --- | --- |
| `page` | 1-based page number. |
| `limit` | Page size. Defaults to backend handler value; frontend uses 10. |

Response shape:

```json
{
  "records": [],
  "total": 0
}
```

### Intelligence Flags

Optional query:

```text
?severity=HIGH
```

Current backend severities are `HIGH`, `MEDIUM`, and `LOW`. The frontend sorts `CRITICAL` first if a future backend emits it.

## Standard Error Behavior

Handlers generally return HTTP status codes with a JSON error message. Common cases:

| Status | Meaning |
| --- | --- |
| `400` | Invalid input or invalid ID. |
| `404` | Requested entity, legal request, or dump not found. |
| `409` | Invalid state transition or inactive provider. |
| `413` | Uploaded file exceeds limit. |
| `422` | Semantic validation failure, such as non-confirmed entities. |
| `503` | Health degraded or dispatch queue unavailable. |

