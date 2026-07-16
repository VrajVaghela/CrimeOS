# Data Flow

This document describes how data moves through the Digital Footprint module from complaint intake to intelligence output.

## End-To-End Flow

```mermaid
sequenceDiagram
  participant O as Officer
  participant FE as React Frontend
  participant API as Go API
  participant PG as PostgreSQL
  participant M as MongoDB
  participant FS as Upload Storage
  participant W as Background Workers

  O->>FE: Paste complaint text
  FE->>API: POST /cases/:caseId/entities/extract
  API->>PG: Insert extracted digital_entities
  API-->>FE: Extracted entities

  O->>FE: Confirm entities
  FE->>API: PATCH /entities/:entityId
  API->>PG: Update entity status
  API->>W: Enqueue OSINT scan for confirmed entity
  W->>PG: Create pending osint_scans entry
  W->>W: Process pending OSINT scans
  W->>PG: Persist breach and profile intelligence
  W->>M: Save raw OSINT snapshot for debugging

  O->>FE: Draft legal request
  FE->>API: POST /cases/:caseId/legal-requests
  API->>PG: Insert legal_requests row
  API-->>FE: DRAFTED request

  O->>FE: Approve request
  FE->>API: POST /legal-requests/:id/approve
  API->>PG: status = QUEUED

  O->>FE: Dispatch queued request
  FE->>API: POST /legal-requests/:id/dispatch
  API->>W: Enqueue dispatch job
  W->>PG: status = SENT, ACKNOWLEDGED; insert dispatch_events
  FE->>API: Poll timeline/events
  API-->>FE: Updated timeline

  O->>FE: Upload provider response
  FE->>API: POST /legal-requests/:id/responses
  API->>FS: Save uploaded file
  API->>M: Insert raw_response_dumps document
  API->>W: Enqueue parse job
  W->>M: Update parse status
  W->>PG: Insert normalized records and intelligence_flags
  FE->>API: Poll response dump, fetch records and flags
```

## Entity Intake

Input:

- Free-text complaint text.
- Case ID from the route.
- Optional complaint reference ID.

Processing:

- `internal/entity` extracts digital artifacts and normalizes them.
- Results are stored as `digital_entities` with `EXTRACTED` status.
- Officer review changes status to `CONFIRMED` or `REJECTED`.
- Confirmed entities enqueue OSINT enrichment jobs for social/breach intelligence.

Output:

- Confirmed entities become eligible for LERS request creation and OSINT enrichment.

## LERS Request Creation

Input:

- Case ID.
- Active service provider.
- One of six template types.
- One or more confirmed entity IDs.
- Officer metadata and legal basis.

Processing:

- `internal/lers` validates provider and entity status.
- Request number is generated.
- Template is rendered to a stored document path.
- `legal_requests` row is created as `DRAFTED`.

Output:

- Draft request shown on `/cases/:caseId/lers`.
- Approval moves it to `QUEUED`.

## Dispatch Tracking

Input:

- Approved legal request in `QUEUED` state.

Processing:

- `POST /legal-requests/:id/dispatch` enqueues the request.
- Dispatch worker simulates provider delivery and acknowledgement.
- `dispatch_events` stores append-only state changes.
- Status summary and timeline endpoints feed the tracker UI.

Output:

- Timeline maps request status to `QUEUED -> SENT -> ACKNOWLEDGED -> RESPONDED`.
- Overdue requests show a distinct overdue state.

## Response Upload And Parsing

Input:

- Uploaded `.csv`, `.xlsx`, or `.pdf` provider response.
- Legal request ID.

Processing:

- File is size checked and saved to local upload storage.
- MongoDB `raw_response_dumps` tracks file metadata and parse status.
- Parse worker selects parser by request template type.
- Normalized rows are inserted into one of:
  - `cdr_records`
  - `ip_session_records`
  - `bank_transaction_records`

Output:

- Upload form polls parse status until `PARSED` or `FAILED`.
- Dashboard renders the matching normalized record table.
- Parse errors are shown as row-numbered expandable feedback.

## Intelligence Flags

Input:

- Parsed CDR/IP/bank records.

Processing:

- `internal/analytics` heuristics generate flags such as repeated counterparties, VPN/proxy indicators, tower clustering, and high-value transactions.
- Flags are stored in `intelligence_flags`.
- Case log publisher writes derived case-log events for downstream consumption.

Output:

- `/cases/:caseId/analytics` groups flags by severity.
- Linked record IDs point to visible record rows where possible.

## Persistence Summary

| Data | Primary Store | Notes |
| --- | --- | --- |
| Extracted entities | PostgreSQL `digital_entities` | Human review status is stored here. |
| Service providers | PostgreSQL `service_providers` | Seeded by migrations. |
| Legal requests | PostgreSQL `legal_requests` | Includes template type, status, SLA, and rendered document path. |
| Dispatch history | PostgreSQL `dispatch_events` | Drives timeline UI. |
| Uploaded file metadata | MongoDB `raw_response_dumps` | Tracks parse status and errors. |
| Uploaded bytes | Local filesystem | `UPLOAD_DEST_DIR`, default `uploads`. |
| Parsed records | PostgreSQL record tables | CDR, IP session, and bank transaction tables. |
| Intelligence | PostgreSQL `intelligence_flags` and case log outbox | Flags are shown in analytics dashboard. |

