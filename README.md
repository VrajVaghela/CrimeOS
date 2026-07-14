# CrimeOS Digital Footprint

Digital Footprint is a CrimeOS investigation module for extracting digital evidence from complaints, drafting legal enforcement requests, tracking dispatch, ingesting provider responses, and surfacing intelligence flags.

## Documentation

| Document | Purpose |
| --- | --- |
| [Architecture](docs/ARCHITECTURE.md) | Current frontend/backend architecture, packages, workers, storage, and lifecycle. |
| [Data Flow](docs/DATAFLOW.md) | End-to-end data movement from complaint intake to parsed records and intelligence flags. |
| [API Endpoints](docs/ENDPOINTS.md) | Current backend routes grouped by domain with request/response notes. |
| [How To Run](docs/RUN.md) | Local setup, environment variables, run commands, tests, and troubleshooting. |

## Quick Start

Start databases, backend, and frontend:

```bash
# Terminal 1
docker start crimeos-pg crimeos-mongo

# Terminal 2
cd backend
go run ./cmd/server

# Terminal 3
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173/cases/550e8400-e29b-41d4-a716-446655440000/intake
```

See [How To Run](docs/RUN.md) for complete setup details.

