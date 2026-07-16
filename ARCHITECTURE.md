# Digital Footprint & Automated Legal Workflows — Architecture Spec
### Module of Crime OS AI (Platform for Intelligence-led Investigations)

---

## 1.1 High-Level System Design

```
                         ┌────────────────────────────────────────────────────────┐
                         │                    REACT.JS FRONTEND                     │
                         │  Complaint Intake · Entity Review · LERS Console ·        │
                         │  Dispatch Tracker · Response Analytics Dashboard          │
                         └───────────────┬────────────────────────────────────────-┘
                                         │ REST/JSON (JWT bearer)
                                         ▼
                         ┌────────────────────────────────────────────────────────┐
                         │                   GO API GATEWAY (chi/gin)               │
                         │  AuthN/Z · Rate Limit · Request Validation · Audit Hook  │
                         └───┬───────────┬───────────┬───────────┬────────────────┘
                             │           │           │           │
                 ┌───────────┘   ┌───────┘   ┌───────┘   ┌───────┘
                 ▼               ▼           ▼           ▼
     ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐
     │ ENTITY EXTRACT │ │ LERS TEMPLATE  │ │ DISPATCH SIM   │ │ RESPONSE ANALYTICS │
     │ SERVICE         │ │ ENGINE         │ │ (Email Worker) │ │ PARSER SERVICE     │
     │ (regex+NLP)     │ │ (Go templates) │ │ (async queue)  │ │ (CDR/IP/Bank)       │
     └───────┬────────┘ └───────┬────────┘ └───────┬───────┘ └─────────┬──────────┘
             │                  │                   │                   │
             └────────┬─────────┴─────────┬─────────┴─────────┬─────────┘
                       ▼                   ▼                   ▼
             ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
             │   PostgreSQL      │  │  MongoDB           │  │  Object Storage      │
             │  (relational,     │  │ (unstructured raw  │  │  (raw uploaded dumps │
             │   audit-grade)    │  │  response dumps)   │  │   - local FS/MinIO)  │
             └──────────────────┘  └──────────────────┘  └──────────────────────┘
                       ▲
                       │  every write path passes through AUDIT MIDDLEWARE
                       │  (immutable append-only audit_log table)
                       ▼
             ┌──────────────────────────────────────────────────────────────┐
             │        GLOBAL CASE LOG / INTELLIGENCE SUMMARY (Crime OS core) │
             │  Cross-module event bus — this module PUBLISHES intel events │
             └──────────────────────────────────────────────────────────────┘
```

**Service decomposition (Go, modular monolith for hackathon speed, cleanly separable into microservices later):**

| Internal Package | Responsibility |
|---|---|
| `internal/entity` | Regex/NLP extraction of IP, email, phone, UPI, social handles from free text complaints |
| `internal/lers` | Legal Enforcement Request System template engine — binds entities + case metadata into provider-specific legal notice documents |
| `internal/dispatch` | Simulated email automation, status state machine (`DRAFTED → QUEUED → SENT → ACK → RESPONDED → CLOSED`) |
| `internal/analytics` | Parses returned CDR/IP-log/bank-statement dumps (CSV/PDF/XLSX), normalizes into intelligence records |
| `internal/audit` | Middleware + service that writes every mutating action to `audit_log` |
| `internal/caselog` | Publishes structured intelligence events to the shared case timeline |

---

## 1.2 Low-Level Data Flow (step-by-step)

1. **Ingestion** — Officer submits/​uploads complaint text (or it's pulled from the core Crime OS complaint record via `case_id`).
2. **Entity Extraction** — `internal/entity` runs extraction pipeline (regex first pass for IP/email/phone/UPI, handle-pattern match for socials); results persisted to `digital_entities` with `status = EXTRACTED`, confidence score, and byte-offset provenance into source text.
3. **Officer Review** — Frontend renders extracted entities for human-in-the-loop confirm/edit/reject (mandatory for legal defensibility — nothing auto-dispatches without confirmation). Confirmed entities flip to `status = CONFIRMED`.
4. **Legal Request Formulation** — Officer selects confirmed entities + target service provider (from `service_providers` master table) + LERS template type (e.g., `IP_LOG_REQUEST`, `CDR_REQUEST`, `KYC_REQUEST`, `ACCOUNT_FREEZE_REQUEST`). `internal/lers` renders the template into a stored document (`legal_requests` row + rendered PDF/HTML blob).
5. **Dispatch Simulation** — `internal/dispatch` enqueues the request (in-process channel or Redis-backed queue), simulates SMTP send to the provider's registered nodal-officer email, and transitions status. Every transition is audit-logged and timestamped.
6. **Status Tracking** — Frontend polls/subscribes to `legal_requests.status`; simulated provider "responses" (for demo) or real uploaded response files move status to `RESPONDED`.
7. **Response Ingestion** — Officer (or simulated provider webhook) uploads a raw response file (CDR CSV, IP log CSV, bank statement CSV/XLSX). Raw bytes go to object storage + a mirror doc in MongoDB `raw_response_dumps` for traceability.
8. **Parsing & Normalization** — `internal/analytics` picks the correct parser strategy based on `legal_requests.template_type`, extracts structured rows (call records, IP sessions, transactions), writes normalized rows into PostgreSQL (`cdr_records`, `ip_session_records`, `bank_transaction_records`) linked back to `legal_request_id`.
9. **Intelligence Extraction** — Post-parse heuristics flag actionable items (e.g., IP resolves to known VPN/proxy range, repeated UPI counter-party, tower-location clustering) into `intelligence_flags`.
10. **Case Log Feed** — `internal/caselog` publishes a normalized `IntelEvent{case_id, source, summary, severity, linked_entity_ids}` to the shared case timeline table/event bus that the rest of Crime OS AI consumes.

---

## 1.3 PostgreSQL Schema (DDL)

```sql
-- ============================================================
-- EXTENSION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- CASES (assumed shared core table — referenced, not owned here)
-- ============================================================
-- CREATE TABLE cases ( id UUID PRIMARY KEY, case_number TEXT, ... ) -- owned by core module

-- ============================================================
-- DIGITAL ENTITIES
-- ============================================================
CREATE TABLE digital_entities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID NOT NULL,
    complaint_ref_id    UUID,                       -- FK to core complaint table
    entity_type         TEXT NOT NULL CHECK (entity_type IN
                          ('IP_ADDRESS','EMAIL','PHONE','UPI_ID','SOCIAL_HANDLE','BANK_ACCOUNT')),
    raw_value           TEXT NOT NULL,
    normalized_value     TEXT NOT NULL,               -- lowercased/E.164/etc.
    source_text_offset  INT4RANGE,                    -- provenance span in source complaint
    confidence_score    NUMERIC(4,3) NOT NULL DEFAULT 1.000,
    status              TEXT NOT NULL DEFAULT 'EXTRACTED' CHECK (status IN
                          ('EXTRACTED','CONFIRMED','REJECTED','MERGED')),
    extracted_by        TEXT NOT NULL DEFAULT 'AUTO', -- AUTO | officer_id
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_digital_entities_case_id ON digital_entities(case_id);
CREATE INDEX idx_digital_entities_type_status ON digital_entities(entity_type, status);
CREATE INDEX idx_digital_entities_normalized ON digital_entities(normalized_value);
CREATE UNIQUE INDEX uq_entity_case_norm ON digital_entities(case_id, entity_type, normalized_value);

-- ============================================================
-- SERVICE PROVIDERS (Telecom / Bank / Platform master data)
-- ============================================================
CREATE TABLE service_providers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    provider_category   TEXT NOT NULL CHECK (provider_category IN
                          ('TELECOM','BANK','SOCIAL_PLATFORM','ISP','FINTECH','OTHER')),
    nodal_officer_email TEXT NOT NULL,
    nodal_officer_phone TEXT,
    lers_portal_url     TEXT,
    sla_hours           INT NOT NULL DEFAULT 168,     -- default 7 days
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_providers_category ON service_providers(provider_category);

-- ============================================================
-- LEGAL REQUESTS (LERS)
-- ============================================================
CREATE TABLE legal_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID NOT NULL,
    provider_id         UUID NOT NULL REFERENCES service_providers(id),
    template_type       TEXT NOT NULL CHECK (template_type IN
                          ('IP_LOG_REQUEST','CDR_REQUEST','KYC_REQUEST',
                           'ACCOUNT_FREEZE_REQUEST','SUBSCRIBER_DETAILS_REQUEST',
                           'BANK_STATEMENT_REQUEST')),
    linked_entity_ids   UUID[] NOT NULL,               -- digital_entities.id array
    request_number      TEXT NOT NULL UNIQUE,           -- e.g. LERS/2026/000123
    rendered_doc_path   TEXT,                            -- object storage path (PDF)
    status              TEXT NOT NULL DEFAULT 'DRAFTED' CHECK (status IN
                          ('DRAFTED','QUEUED','SENT','ACKNOWLEDGED','RESPONDED',
                           'OVERDUE','CLOSED','REJECTED_BY_PROVIDER')),
    drafted_by          TEXT NOT NULL,                   -- officer_id
    approved_by         TEXT,                            -- supervising officer_id
    dispatched_at       TIMESTAMPTZ,
    sla_due_at          TIMESTAMPTZ,
    responded_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_legal_requests_case_id ON legal_requests(case_id);
CREATE INDEX idx_legal_requests_status ON legal_requests(status);
CREATE INDEX idx_legal_requests_provider ON legal_requests(provider_id);
CREATE INDEX idx_legal_requests_sla_due ON legal_requests(sla_due_at) WHERE status NOT IN ('CLOSED');

-- ============================================================
-- DISPATCH LOG (email automation simulation, append-only)
-- ============================================================
CREATE TABLE dispatch_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_request_id    UUID NOT NULL REFERENCES legal_requests(id),
    event_type          TEXT NOT NULL CHECK (event_type IN
                          ('QUEUED','SMTP_SENT','SMTP_FAILED','ACK_RECEIVED','BOUNCED')),
    detail              JSONB,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dispatch_events_request ON dispatch_events(legal_request_id);

-- ============================================================
-- NORMALIZED RESPONSE INTELLIGENCE TABLES
-- ============================================================
CREATE TABLE cdr_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_request_id    UUID NOT NULL REFERENCES legal_requests(id),
    caller_number       TEXT NOT NULL,
    callee_number       TEXT NOT NULL,
    call_type           TEXT CHECK (call_type IN ('VOICE','SMS','DATA')),
    call_start          TIMESTAMPTZ NOT NULL,
    duration_seconds    INT,
    cell_tower_id       TEXT,
    imei                TEXT,
    imsi                TEXT,
    raw_row_ref         TEXT,                            -- pointer to mongo doc _id
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cdr_request ON cdr_records(legal_request_id);
CREATE INDEX idx_cdr_caller ON cdr_records(caller_number);
CREATE INDEX idx_cdr_callee ON cdr_records(callee_number);
CREATE INDEX idx_cdr_tower ON cdr_records(cell_tower_id);

CREATE TABLE ip_session_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_request_id    UUID NOT NULL REFERENCES legal_requests(id),
    ip_address          INET NOT NULL,
    session_start       TIMESTAMPTZ,
    session_end         TIMESTAMPTZ,
    account_identifier  TEXT,                            -- subscriber/user id at provider
    port_number         TEXT,
    raw_row_ref         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ip_session_request ON ip_session_records(legal_request_id);
CREATE INDEX idx_ip_session_ip ON ip_session_records(ip_address);

CREATE TABLE bank_transaction_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_request_id    UUID NOT NULL REFERENCES legal_requests(id),
    txn_ref             TEXT NOT NULL,
    txn_date            TIMESTAMPTZ NOT NULL,
    amount              NUMERIC(14,2) NOT NULL,
    txn_type            TEXT CHECK (txn_type IN ('CREDIT','DEBIT')),
    counterparty_account TEXT,
    counterparty_upi    TEXT,
    narration           TEXT,
    raw_row_ref         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bank_txn_request ON bank_transaction_records(legal_request_id);
CREATE INDEX idx_bank_txn_counterparty_upi ON bank_transaction_records(counterparty_upi);
CREATE INDEX idx_bank_txn_date ON bank_transaction_records(txn_date);

-- ============================================================
-- INTELLIGENCE FLAGS (derived actionable signals)
-- ============================================================
CREATE TABLE intelligence_flags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID NOT NULL,
    legal_request_id    UUID REFERENCES legal_requests(id),
    flag_type           TEXT NOT NULL,                    -- e.g. VPN_PROXY_IP, REPEATED_COUNTERPARTY
    severity            TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    summary             TEXT NOT NULL,
    linked_entity_ids   UUID[],
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_intel_flags_case ON intelligence_flags(case_id);
CREATE INDEX idx_intel_flags_severity ON intelligence_flags(severity);

-- ============================================================
-- AUDIT LOG (append-only, immutable — no UPDATE/DELETE grants in app role)
-- ============================================================
CREATE TABLE audit_log (
    id                  BIGSERIAL PRIMARY KEY,
    actor_id            TEXT NOT NULL,
    action              TEXT NOT NULL,                    -- e.g. LEGAL_REQUEST_DISPATCHED
    resource_type       TEXT NOT NULL,
    resource_id         UUID,
    before_state        JSONB,
    after_state         JSONB,
    ip_address          TEXT,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_occurred_at ON audit_log(occurred_at DESC);
```

---

## 1.4 MongoDB Collection Structures

```jsonc
// db: crimeos_digitalfootprint
// collection: raw_response_dumps
{
  "_id": "ObjectId",
  "legal_request_id": "uuid-string",      // FK to Postgres legal_requests.id
  "case_id": "uuid-string",
  "file_meta": {
    "original_filename": "airtel_cdr_2026_07.csv",
    "mime_type": "text/csv",
    "size_bytes": 482113,
    "storage_path": "objectstore://dumps/2026/07/<uuid>.csv",
    "sha256": "..."
  },
  "parse_status": "PENDING | PARSING | PARSED | FAILED",
  "parser_used": "cdr_parser_v1",
  "row_count_detected": 4210,
  "row_count_parsed": 4198,
  "parse_errors": [
    { "row": 55, "reason": "invalid timestamp format", "raw": "..." }
  ],
  "uploaded_by": "officer_id",
  "uploaded_at": "ISODate",
  "parsed_at": "ISODate"
}

// collection: unstructured_intel_snippets
// (free-text / semi-structured content that doesn't fit relational schema,
//  e.g. platform takedown notices, KYC document text extraction)
{
  "_id": "ObjectId",
  "legal_request_id": "uuid-string",
  "case_id": "uuid-string",
  "snippet_type": "KYC_DOCUMENT_TEXT | PLATFORM_NOTICE | OCR_EXTRACT",
  "content": "raw extracted text...",
  "extracted_entities": ["email:x@y.com", "phone:+91..."],
  "confidence": 0.87,
  "created_at": "ISODate"
}
```

**Indexes (Mongo):**
```js
db.raw_response_dumps.createIndex({ legal_request_id: 1 });
db.raw_response_dumps.createIndex({ case_id: 1, uploaded_at: -1 });
db.raw_response_dumps.createIndex({ parse_status: 1 });
db.unstructured_intel_snippets.createIndex({ case_id: 1 });
db.unstructured_intel_snippets.createIndex({ legal_request_id: 1 });
```

---

## 1.5 API Endpoint Contract

### Entity Extraction
```
POST /api/v1/cases/{caseId}/entities/extract
Body:    { "source_text": "string", "complaint_ref_id": "uuid" }
Resp 201:{ "entities": [ { "id": "uuid", "entity_type": "EMAIL", "raw_value": "...", "normalized_value": "...", "confidence_score": 0.95, "status": "EXTRACTED" } ] }

GET /api/v1/cases/{caseId}/entities?status=EXTRACTED&type=IP_ADDRESS
Resp 200:{ "entities": [ ... ], "total": 12 }

PATCH /api/v1/entities/{entityId}
Body:    { "status": "CONFIRMED" | "REJECTED", "normalized_value": "optional override" }
Resp 200:{ "entity": { ... } }
```

### Legal Request Engine
```
GET /api/v1/service-providers?category=TELECOM
Resp 200:{ "providers": [ { "id": "uuid", "name": "Airtel", "provider_category": "TELECOM", "sla_hours": 168 } ] }

POST /api/v1/cases/{caseId}/legal-requests
Body:    { "provider_id": "uuid", "template_type": "CDR_REQUEST", "linked_entity_ids": ["uuid", "uuid"], "drafted_by": "officer_id", ... }
Resp 201:{ "legal_request": { "id": "uuid", "request_number": "LERS/2026/000123", "status": "DRAFTED", "rendered_doc_path": "..." } }
Errors:  400 invalid template/entity combo, 404 provider not found

GET /api/v1/legal-requests/{id}
Resp 200:{ "legal_request": { ...full record... }, "dispatch_events": [ ... ] }

POST /api/v1/legal-requests/{id}/approve
Body:    { "approved_by": "officer_id" }
Resp 200:{ "legal_request": { "status": "QUEUED" } }

GET /api/v1/cases/{caseId}/legal-requests/summary
Resp 200:{ "by_status": {"DRAFTED": 2, "SENT":5}, "total":7 }

GET /api/v1/cases/{caseId}/legal-requests/timeline
Resp 200:{ "requests": [ {"legal_request": ..., "events": [...]} ] }
```

### Dispatch Simulation
```
POST /api/v1/legal-requests/{id}/dispatch
Resp 202:{ "message": "dispatch queued", "legal_request_id": "uuid" }

GET /api/v1/legal-requests/{id}/dispatch-events
Resp 200:{ "events": [ { "event_type": "SMTP_SENT", "occurred_at": "..." } ] }

GET /api/v1/cases/{caseId}/legal-requests?status=OVERDUE
Resp 200:{ "legal_requests": [ ... ] }
```

### Response Analytics
```
POST /api/v1/legal-requests/{id}/responses
Content-Type: multipart/form-data (file upload)
Resp 202:{ "dump_id": "mongo-objectid", "parse_status": "PENDING" }

GET /api/v1/legal-requests/{id}/responses/{dumpId}
Resp 200:{ "parse_status": "PARSED", "row_count_parsed": 4198, "parse_errors": [...] }

GET /api/v1/legal-requests/{id}/cdr-records?page=1&limit=50
Resp 200:{ "records": [ ... ], "total": 4198 }

GET /api/v1/cases/{caseId}/intelligence-flags?severity=HIGH
Resp 200:{ "flags": [ { "flag_type": "VPN_PROXY_IP", "severity": "HIGH", "summary": "..." } ] }
```

### Audit
```
GET /api/v1/audit-log?resource_type=legal_requests&resource_id={id}
Resp 200:{ "entries": [ ... ] }
```

**Standard error envelope for all endpoints:**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "human readable", "details": {} } }
```
**Status code conventions:** `200` read/update ok · `201` created · `202` accepted/async · `400` validation · `401` unauth · `403` forbidden · `404` not found · `409` conflict (e.g., duplicate request_number) · `422` semantic validation (e.g., entity not CONFIRMED) · `500` internal.

## OSINT & Breach Intelligence

The OSINT module enriches confirmed digital entities with simulated open-source profile and breach exposure intelligence.

| Internal Package | Responsibility |
|---|---|
| `internal/osint` | Enqueues confirmed entities for enrichment, executes mock social/breach scans, and aggregates results for frontend analysis |

A dedicated OSINT worker now runs alongside the existing dispatch, overdue sweeper, and analytics parse workers. It polls for pending scans, claims them safely, performs deterministic mock Sherlock/Holehe/breach enumeration, and writes the results back into PostgreSQL and MongoDB. All OSINT/breach data is currently simulated for demo purposes.
