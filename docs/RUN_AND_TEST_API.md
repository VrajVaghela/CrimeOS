# Run and API Test Instructions

## Run the project

### 1. Start databases
Use Docker or your local database services.

Example using Docker:

```powershell
docker run -d --name crimeos-pg -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=crimeos -p 5432:5432 postgres:16
docker run -d --name crimeos-mongo -p 27017:27017 mongo:7
```

### 2. Configure backend
Create `backend/.env` from `backend/.env.example` and set:

```env
POSTGRES_DSN=postgres://user:pass@localhost:5432/crimeos?sslmode=disable
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=crimeos_digitalfootprint
PORT=8080
```

### 3. Run the backend

```powershell
cd backend
go run ./cmd/server
```

The backend should listen on:

`http://localhost:8080`

### 4. Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open in browser:

`http://localhost:5173`

If desired, set `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

---

## Test all endpoints from `docs/ENDPOINTS.md`

Use `curl`, Postman, or any REST client. Replace placeholders like `{caseId}`, `{entityId}`, `{id}`, and `{dumpId}` with actual values returned by previous calls.

### Base API

`http://localhost:8080/api/v1`

---

### 1. Health

Check service readiness:

```bash
curl http://localhost:8080/api/v1/health
```

---

### 2. Entities

#### Extract entities

```bash
curl -X POST http://localhost:8080/api/v1/cases/{caseId}/entities/extract \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "Victim received calls from +919876543210 and email from attacker@example.com",
    "complaint_ref_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

#### List case entities

```bash
curl "http://localhost:8080/api/v1/cases/{caseId}/entities"
```

Optional filters:

```bash
curl "http://localhost:8080/api/v1/cases/{caseId}/entities?status=EXTRACTED&type=PHONE_NUMBER"
```

#### Confirm or reject an entity

```bash
curl -X PATCH http://localhost:8080/api/v1/entities/{entityId} \
  -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED"}'
```

Valid statuses:
- `EXTRACTED`
- `CONFIRMED`
- `REJECTED`
- `MERGED`

---

### 3. Service providers and legal requests

#### List service providers

```bash
curl http://localhost:8080/api/v1/service-providers
```

Filter by category:

```bash
curl "http://localhost:8080/api/v1/service-providers?category=MOBILE"
```

#### Create a legal request

```bash
curl -X POST http://localhost:8080/api/v1/cases/{caseId}/legal-requests \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": "provider-uuid",
    "template_type": "CDR_REQUEST",
    "linked_entity_ids": ["entity-uuid-1"],
    "drafted_by": "officer_123",
    "issuing_officer_name": "Officer A",
    "issuing_officer_designation": "Investigating Officer",
    "police_station": "Central Police Station",
    "legal_basis": "Section 91 CrPC"
  }'
```

Valid `template_type` values:
- `IP_LOG_REQUEST`
- `CDR_REQUEST`
- `KYC_REQUEST`
- `ACCOUNT_FREEZE_REQUEST`
- `SUBSCRIBER_DETAILS_REQUEST`
- `BANK_STATEMENT_REQUEST`

#### Get legal request details

```bash
curl http://localhost:8080/api/v1/legal-requests/{id}
```

#### Approve a legal request

```bash
curl -X POST http://localhost:8080/api/v1/legal-requests/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{"approved_by":"officer_123"}'
```

#### List legal requests for a case

```bash
curl http://localhost:8080/api/v1/cases/{caseId}/legal-requests
```

Filter by status:

```bash
curl "http://localhost:8080/api/v1/cases/{caseId}/legal-requests?status=QUEUED"
```

#### Summary counts by status

```bash
curl http://localhost:8080/api/v1/cases/{caseId}/legal-requests/summary
```

#### Timeline for requests

```bash
curl http://localhost:8080/api/v1/cases/{caseId}/legal-requests/timeline
```

---

### 4. Dispatch

#### Enqueue a legal request for dispatch

```bash
curl -X POST http://localhost:8080/api/v1/legal-requests/{id}/dispatch
```

#### Get dispatch events for one request

```bash
curl http://localhost:8080/api/v1/legal-requests/{id}/dispatch-events
```

---

### 5. Response analytics

#### Upload a provider response file
Use multipart form upload:

```bash
curl -X POST http://localhost:8080/api/v1/legal-requests/{id}/responses \
  -F "file=@C:/path/to/response.csv"
```

Response should include:
- `dump_id`
- `parse_status`

#### Poll parse status

```bash
curl http://localhost:8080/api/v1/legal-requests/{id}/responses/{dumpId}
```

#### List parsed records

CDR records:

```bash
curl "http://localhost:8080/api/v1/legal-requests/{id}/cdr-records?page=1&limit=10"
```

IP session records:

```bash
curl "http://localhost:8080/api/v1/legal-requests/{id}/ip-session-records?page=1&limit=10"
```

Bank transaction records:

```bash
curl "http://localhost:8080/api/v1/legal-requests/{id}/bank-transaction-records?page=1&limit=10"
```

Each returns:

```json
{
  "records": [],
  "total": 0
}
```

---

### 6. Intelligence flags

#### List intelligence flags for a case

```bash
curl http://localhost:8080/api/v1/cases/{caseId}/intelligence-flags
```

Optional severity filter:

```bash
curl "http://localhost:8080/api/v1/cases/{caseId}/intelligence-flags?severity=HIGH"
```

---

## Notes

- Use actual IDs returned from entity extraction and request creation for `{entityId}`, `{id}`, and `{dumpId}`.
- If upload exceeds 25 MB, the API returns `413`.
- Invalid inputs return standard errors like `400`, `404`, `409`, `422`, or `503`.
