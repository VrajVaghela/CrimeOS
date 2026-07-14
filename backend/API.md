
# Digital Footprint Module API

## Endpoint Contract Format
All endpoints follow this structure:

### `METHOD /path`
**Description:** One-line summary.  
**Request:** Optional JSON schema or form params.  
**Response (200 OK):** JSON schema.  
**Response (400/401/403/404/500):** Standard error envelope: `{"error": "message"}`.

---

### `GET /api/v1/health`
**Description:** Health check for PostgreSQL and MongoDB connections.  
**Request:** None.  
**Response (200 OK):**
```json
{
  "status": "ok",
  "postgres": "up",
  "mongo": "up"
}
```
**Response (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "postgres": "down",
  "mongo": "up"
}
```

---

### `POST /api/v1/cases/{caseId}/entities/extract`
**Description:** Extract digital entities (IP, email, phone, UPI, social handle) from provided text.  
**Request:**
```json
{
  "source_text": "string (required)",
  "complaint_ref_id": "uuid (optional)"
}
```
**Response (201 Created):**
```json
{
  "entities": [
    {
      "id": "uuid",
      "case_id": "uuid",
      "complaint_ref_id": "uuid or null",
      "entity_type": "IP_ADDRESS|EMAIL|PHONE|UPI_ID|SOCIAL_HANDLE",
      "raw_value": "string",
      "normalized_value": "string",
      "source_text_offset": [number, number],
      "confidence_score": 1.0,
      "status": "EXTRACTED",
      "extracted_by": "string",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```
**Response (400 Bad Request):** Invalid input.

---

### `GET /api/v1/cases/{caseId}/entities`
**Description:** List digital entities for a case, optionally filtered by status or entity type.  
**Request Query Params:** `?status=EXTRACTED&type=EMAIL`  
**Response (200 OK):**
```json
{
  "entities": [ /* same as above */ ],
  "total": 123
}
```

---

### `PATCH /api/v1/entities/{entityId}`
**Description:** Update status of a digital entity (confirm/reject).  
**Request:**
```json
{
  "status": "CONFIRMED|REJECTED"
}
```
**Response (200 OK):**
```json
{
  "entity": { /* same as above */ }
}
```
**Response (404 Not Found):** Entity not found.  
**Response (422 Unprocessable Entity):** Invalid status transition (e.g., can't go back to EXTRACTED from CONFIRMED).

---

### `GET /api/v1/service-providers`
**Description:** List service providers (banks, ISPs, telecoms, social platforms), optionally filtered by category.  
**Request Query Params:** `?category=TELECOM`  
**Response (200 OK):**
```json
{
  "providers": [
    {
      "id": "uuid",
      "name": "string",
      "provider_category": "TELECOM|BANK|SOCIAL_PLATFORM|ISP",
      "nodal_officer_email": "string",
      "nodal_officer_phone": "string",
      "sla_hours": 240,
      "active": true,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "total": 7
}
```

---

### `POST /api/v1/cases/{caseId}/legal-requests`
**Description:** Create a new drafted legal request.  
**Request:**
```json
{
  "provider_id": "uuid (required)",
  "template_type": "IP_LOG_REQUEST|CDR_REQUEST|KYC_REQUEST|ACCOUNT_FREEZE_REQUEST|SUBSCRIBER_DETAILS_REQUEST|BANK_STATEMENT_REQUEST (required)",
  "linked_entity_ids": ["uuid (required)"],
  "drafted_by": "string (required)",
  "issuing_officer_name": "string (required)",
  "issuing_officer_designation": "string (required)",
  "police_station": "string (required)",
  "legal_basis": "string (required)"
}
```
**Response (201 Created):**
```json
{
  "legal_request": {
    "id": "uuid",
    "case_id": "uuid",
    "request_number": "LERS/2025/000001",
    "provider_id": "uuid",
    "template_type": "string",
    "linked_entity_ids": ["uuid"],
    "status": "DRAFTED",
    "rendered_doc_path": "string or null",
    "drafted_by": "string",
    "approved_by": "string or null",
    "sla_due_at": "timestamp",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```
**Response (400 Bad Request):** Invalid input.
**Response (422 Unprocessable Entity):** One or more entities not confirmed.
**Response (409 Conflict):** Provider is inactive.

---

### `GET /api/v1/legal-requests/{id}`
**Description:** Get a single legal request with its dispatch events.
**Response (200 OK):**
```json
{
  "legal_request": { /* same as above */ },
  "dispatch_events": [
    {
      "id": "uuid",
      "legal_request_id": "uuid",
      "event_name": "QUEUED|SMTP_SENT|SMTP_FAILED|ACK_RECEIVED|OVERDUE_MARKED|REJECTED_BY_PROVIDER",
      "details": {"smtp_response": "250 OK"},
      "created_at": "timestamp"
    }
  ]
}
```
**Response (404 Not Found):** Request not found.

---

### `POST /api/v1/legal-requests/{id}/approve`
**Description:** Approve a drafted legal request, moving it to QUEUED status.
**Request:**
```json
{
  "approved_by": "string (required)"
}
```
**Response (200 OK):**
```json
{
  "legal_request": { /* same as above, status now QUEUED */ }
}
```
**Response (400 Bad Request):** Invalid input.
**Response (404 Not Found):** Request not found.
**Response (409 Conflict):** Request is not in DRAFTED state.

---

### `POST /api/v1/legal-requests/{id}/dispatch`
**Description:** Enqueue a QUEUED request for dispatch.
**Response (202 Accepted):**
```json
{
  "message": "request queued for dispatch",
  "legal_request_id": "uuid"
}
```
**Response (400 Bad Request):** Invalid ID.
**Response (404 Not Found):** Request not found.
**Response (409 Conflict):** Request is not in QUEUED state.
**Response (503 Service Unavailable):** Dispatch queue full.

---

### `GET /api/v1/legal-requests/{id}/dispatch-events`
**Description:** Get all dispatch events for a legal request.
**Response (200 OK):**
```json
{
  "events": [ /* same as above */ ]
}
```
**Response (400 Bad Request):** Invalid ID.
**Response (404 Not Found):** Request not found.

---

### `GET /api/v1/cases/{caseId}/legal-requests`
**Description:** List legal requests for a case, optionally filtered by status.
**Request Query Params:** `?status=SENT`
**Response (200 OK):**
```json
{
  "legal_requests": [ /* same as legal_request objects above */ ]
}
```

---

### `GET /api/v1/cases/{caseId}/legal-requests/summary`
**Description:** Get status summary of legal requests for a case.
**Response (200 OK):**
```json
{
  "by_status": {"DRAFTED": 2, "SENT": 5, "ACKNOWLEDGED": 3, "OVERDUE": 1},
  "total": 11
}
```

---

### `GET /api/v1/cases/{caseId}/legal-requests/timeline`
**Description:** Get legal requests for a case with their full event timelines.
**Response (200 OK):**
```json
{
  "requests": [
    {
      "legal_request": { /* same as above */ },
      "events": [ /* same as above */ ]
    }
  ]
}
```

---

### `POST /api/v1/legal-requests/{id}/responses`
**Description:** Upload a provider response dump.
**Content-Type:** multipart/form-data (form field "file").
**Upload limit:** 25 MB (`MAX_UPLOAD_BYTES` / `defaultMaxUploadBytes`).
**Response (202 Accepted):**
```json
{
  "dump_id": "<mongo-object-id>",
  "parse_status": "PENDING"
}
```
**Response (400 Bad Request):** Invalid file type or missing file.
**Response (404 Not Found):** Legal request not found.
**Response (413 Request Entity Too Large):** File too big.

---

### `GET /api/v1/legal-requests/{id}/responses/{dumpId}`
**Description:** Get parse status and metadata for a response dump.
**Response (200 OK):**
```json
{
  "_id": "<object-id>",
  "legal_request_id": "<uuid>",
  "case_id": "<uuid>",
  "file_meta": { ... },
  "parse_status": "PENDING|PARSED|FAILED",
  "row_count_detected": 100,
  "row_count_parsed": 99,
  "parse_errors": [ ... ],
  "uploaded_by": "officer_123",
  "uploaded_at": "<timestamp>"
}
```
**Response (404 Not Found):** Dump not found.

---

### `GET /api/v1/cases/{caseId}/intelligence-flags`
**Description:** List intelligence flags for a case, optionally filtered by severity.
**Request Query Params:** `?severity=HIGH|MEDIUM|LOW`
**Response (200 OK):**
```json
{
  "flags": [
    {
      "id": "<uuid>",
      "case_id": "<uuid>",
      "legal_request_id": "<uuid>",
      "flag_type": "VPN_PROXY_IP|REPEATED_COUNTERPARTY|TOWER_LOCATION_CLUSTER|HIGH_VALUE_TRANSACTION",
      "severity": "HIGH|MEDIUM|LOW",
      "summary": "<text>",
      "raw_row_refs": ["<mongo-object-id>", ...],
      "record_ids": ["<uuid>", ...],
      "created_at": "<timestamp>"
    }
  ]
}
```

---

### `GET /api/v1/legal-requests/{id}/cdr-records`
**Description:** List paginated CDR records for a legal request.
**Request Query Params:** `?page=<int>&limit=<int>` (limit defaults to 50, max 200)
**Response (200 OK):**
```json
{
  "records": [
    {
      "id": "<uuid>",
      "legal_request_id": "<uuid>",
      "caller_number": "<string>",
      "callee_number": "<string>",
      "call_type": "<string>",
      "call_start": "<timestamp>",
      "duration_seconds": <int>,
      "cell_tower_id": "<string>|null",
      "imei": "<string>|null",
      "imsi": "<string>|null",
      "raw_row_ref": "<mongo-object-id>",
      "created_at": "<timestamp>"
    }
  ],
  "total": <int>
}
```

---

### `GET /api/v1/legal-requests/{id}/ip-session-records`
**Description:** List paginated IP session records for a legal request.
**Request Query Params:** `?page=<int>&limit=<int>` (limit defaults to 50, max 200)
**Response (200 OK):**
```json
{
  "records": [
    {
      "id": "<uuid>",
      "legal_request_id": "<uuid>",
      "ip_address": "<string>",
      "account_identifier": "<string>",
      "session_start": "<timestamp>|null",
      "session_end": "<timestamp>|null",
      "port_number": "<string>|null",
      "raw_row_ref": "<mongo-object-id>",
      "created_at": "<timestamp>"
    }
  ],
  "total": <int>
}
```

---

### `GET /api/v1/legal-requests/{id}/bank-transaction-records`
**Description:** List paginated bank transaction records for a legal request.
**Request Query Params:** `?page=<int>&limit=<int>` (limit defaults to 50, max 200)
**Response (200 OK):**
```json
{
  "records": [
    {
      "id": "<uuid>",
      "legal_request_id": "<uuid>",
      "txn_ref": "<string>",
      "txn_date": "<timestamp>",
      "amount": "<string>",
      "txn_type": "<string>",
      "counterparty_account": "<string>|null",
      "counterparty_upi": "<string>|null",
      "narration": "<string>|null",
      "raw_row_ref": "<mongo-object-id>",
      "created_at": "<timestamp>"
    }
  ],
  "total": <int>
}
```
