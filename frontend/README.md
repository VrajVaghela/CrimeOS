# CrimeOS Digital Footprint — Frontend

React + TypeScript frontend for the Digital Footprint investigation module.

Project-level docs:

- [Architecture](../docs/ARCHITECTURE.md)
- [Data Flow](../docs/DATAFLOW.md)
- [API Endpoints](../docs/ENDPOINTS.md)
- [How To Run](../docs/RUN.md)

## Prerequisites

- Node.js 18+
- PostgreSQL and MongoDB running (see backend setup)
- Backend API running on port 8080

## Environment Variables

Create `frontend/.env.local` (optional):

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Database Services

Start PostgreSQL and MongoDB locally. Example using Docker:

```bash
docker run -d --name crimeos-pg -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=crimeos -p 5432:5432 postgres:16
docker run -d --name crimeos-mongo -p 27017:27017 mongo:7
```

Apply backend migrations (from the `backend` directory):

```bash
cd backend
go run ./cmd/server  # migrations run on startup
```

Configure backend env (copy `backend/.env.example` to `backend/.env`):

```env
POSTGRES_DSN=postgres://user:pass@localhost:5432/crimeos?sslmode=disable
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=crimeos_digitalfootprint
PORT=8080
```

## Run Locally

**Terminal 1 — Backend:**

```bash
cd backend
go run ./cmd/server
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open any case route, e.g. `http://localhost:5173/cases/550e8400-e29b-41d4-a716-446655440000/intake`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run test` | Run Vitest unit tests |
| `npm run e2e` | Run Playwright E2E suite (headless) |
| `npm run e2e:headed` | Run E2E with visible browser (local debugging) |

## End-to-End Tests

Playwright is included for browser-driven acceptance testing (`full_pipeline.spec.ts`). Vitest/RTL alone cannot drive the full multi-page workflow.

**First-time setup:**

```bash
cd frontend
npm install
npx playwright install --with-deps chromium
```

**Run (requires backend + frontend):**

```bash
# Terminal 1
cd backend && go run ./cmd/server

# Terminal 2
cd frontend && npm run e2e
```

Use `npm run e2e:headed` to watch the browser during debugging.

## Pages

| Route | Purpose |
|-------|---------|
| `/cases/:caseId/intake` | Complaint intake & entity review |
| `/cases/:caseId/lers` | LERS console — draft & approve requests |
| `/cases/:caseId/dispatch` | Dispatch tracker & SLA timeline |
| `/cases/:caseId/analytics` | Response upload, records & intelligence flags |
