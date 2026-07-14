# How To Run The Project

This guide runs the Digital Footprint module locally with PostgreSQL, MongoDB, the Go backend, and the React frontend.

## Prerequisites

Install:

- Go 1.22 or newer.
- Node.js 18 or newer.
- npm.
- Docker, if you want the quickest local PostgreSQL and MongoDB setup.

## 1. Start Databases

Using Docker:

```bash
docker run -d --name crimeos-pg \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_DB=crimeos \
  -p 5432:5432 \
  postgres:16

docker run -d --name crimeos-mongo \
  -p 27017:27017 \
  mongo:7
```

If containers already exist:

```bash
docker start crimeos-pg
docker start crimeos-mongo
```

## 2. Configure Backend

The backend reads environment variables directly from the process environment. You can copy `backend/.env.example` for reference, but `go run ./cmd/server` does not auto-load `.env` files by itself.

PowerShell example:

```powershell
$env:POSTGRES_DSN="postgres://user:pass@localhost:5432/crimeos?sslmode=disable"
$env:MONGO_URI="mongodb://localhost:27017"
$env:MONGO_DB_NAME="crimeos_digitalfootprint"
$env:PORT="8080"
$env:UPLOAD_DEST_DIR="uploads"
```

Bash example:

```env
export POSTGRES_DSN="postgres://user:pass@localhost:5432/crimeos?sslmode=disable"
export MONGO_URI="mongodb://localhost:27017"
export MONGO_DB_NAME="crimeos_digitalfootprint"
export PORT="8080"
export UPLOAD_DEST_DIR="uploads"
```

Required:

- `POSTGRES_DSN`
- `MONGO_URI`

Optional:

- `MONGO_DB_NAME`, default `crimeos_digitalfootprint`
- `PORT`, default `8080`
- `UPLOAD_DEST_DIR`, default `uploads`

## 3. Run Backend

From the repository root:

```bash
cd backend
go run ./cmd/server
```

The server runs migrations on startup from `backend/migrations`.

Health check:

```bash
curl http://localhost:8080/api/v1/health
```

Expected healthy response:

```json
{
  "status": "ok",
  "postgres": "up",
  "mongo": "up"
}
```

## 4. Configure Frontend

Create `frontend/.env.local` if the backend is not at the default URL:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## 5. Install Frontend Dependencies

```bash
cd frontend
npm install
```

For Playwright E2E on a new machine:

```bash
npx playwright install chromium
```

On Linux CI or fresh Linux machines, use:

```bash
npx playwright install --with-deps chromium
```

## 6. Run Frontend

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173/cases/550e8400-e29b-41d4-a716-446655440000/intake
```

Any UUID-like case ID can be used for local testing.

## 7. Main Local Workflow

1. Open `/cases/:caseId/intake`.
2. Paste complaint text containing phones, emails, IPs, UPI IDs, or social handles.
3. Extract and confirm entities.
4. Go to `/cases/:caseId/lers`.
5. Draft a legal request using confirmed entities.
6. Approve the request.
7. Go to `/cases/:caseId/dispatch`.
8. Dispatch the queued request and watch timeline updates.
9. Go to `/cases/:caseId/analytics`.
10. Upload a matching provider response file and wait for parse status.
11. Review normalized records and intelligence flags.

## 8. Tests And Verification

Backend:

```bash
cd backend
go test ./...
```

Frontend unit tests:

```bash
cd frontend
npm run test
```

Frontend production build:

```bash
cd frontend
npm run build
```

Playwright E2E:

```bash
cd frontend
npm run e2e
```

Visible browser debugging:

```bash
cd frontend
npm run e2e:headed
```

The E2E test requires:

- PostgreSQL running.
- MongoDB running.
- Backend running at `VITE_API_BASE_URL` or `http://localhost:8080`.
- Frontend dev server. Playwright config can start it automatically with `npm run dev`.

## 9. Useful Commands

```bash
# Backend health
curl http://localhost:8080/api/v1/health

# Frontend lint
cd frontend && npm run lint

# Frontend preview after build
cd frontend && npm run preview
```

## 10. Common Issues

### Backend exits with `POSTGRES_DSN is required`

Set `POSTGRES_DSN` in the same terminal before running `go run ./cmd/server`.

### Health is degraded

Check that PostgreSQL and MongoDB are running and reachable on the configured ports.

### Frontend cannot reach API

Set `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Restart the Vite dev server after changing env files.

### E2E cannot find browsers

Run:

```bash
cd frontend
npx playwright install chromium
```
