# Stage 1 · Checkpoint 1 — Go Project Scaffold & Dual DB Connections

## Objective
Stand up the `/backend` Go module skeleton, wire a `pgx`-based PostgreSQL connection pool and a `mongo-driver` client, and expose a `/api/v1/health` endpoint that verifies both connections are alive. This is the load-bearing checkpoint every later stage depends on.

## Context
- Reference `ARCHITECTURE.md` §1.1 for the package layout.
- Reference `TRAE_SYSTEM_INSTRUCTIONS.md` §3 (folder structure) and §4 (approved deps: `chi`, `pgx/v5`, `mongo-driver`, `google/uuid`).
- Environment variables expected: `POSTGRES_DSN`, `MONGO_URI`, `MONGO_DB_NAME`, `PORT` (default 8080).

## Step-by-Step Instructions
1. Initialize the module: `cd backend && go mod init crimeos/digitalfootprint`.
2. Add dependencies: `go get github.com/go-chi/chi/v5 github.com/jackc/pgx/v5/pgxpool go.mongodb.org/mongo-driver/mongo github.com/google/uuid`.
3. Create `internal/db/postgres.go`:
   - Export `func NewPostgresPool(ctx context.Context, dsn string) (*pgxpool.Pool, error)`.
   - Configure `MaxConns: 10`, `MinConns: 2`, a 5s connect timeout.
   - On success, run `pool.Ping(ctx)` before returning.
4. Create `internal/db/mongo.go`:
   - Export `func NewMongoClient(ctx context.Context, uri string) (*mongo.Client, error)`.
   - Use `options.Client().ApplyURI(uri)` with a 5s `serverSelectionTimeout`.
   - Ping via `client.Ping(ctx, readpref.Primary())` before returning.
5. Create `internal/model/config.go` with a `Config` struct (`PostgresDSN`, `MongoURI`, `MongoDBName`, `Port`) and a `LoadConfig() (*Config, error)` that reads from `os.Getenv`, erroring clearly if `POSTGRES_DSN` or `MONGO_URI` is unset.
6. Create `internal/middleware/logging.go` implementing a `chi` middleware using `log/slog` that logs method, path, status, duration, and a generated `request_id` (uuid) per request, injected into `context.Context`.
7. Create `internal/middleware/recovery.go` implementing panic recovery that logs the stack trace via `slog` and returns the standard error envelope with `500`.
8. Create `internal/handler/health.go`:
   - `func HealthHandler(pg *pgxpool.Pool, mg *mongo.Client) http.HandlerFunc` that pings both, returns `200 {"status":"ok","postgres":"up","mongo":"up"}` or `503` with whichever failed named in the body.
9. Create `cmd/server/main.go` wiring: load config → connect Postgres → connect Mongo → build chi router → mount logging + recovery middleware → mount `GET /api/v1/health` → `http.ListenAndServe`.
10. Create `.env.example` listing all four env vars with placeholder values.
11. Create `backend/API.md` (if absent) and add the `/api/v1/health` entry per the contract format in `ARCHITECTURE.md` §1.5.

## Verification Checkpoint
```bash
# with a local postgres and mongo running (or docker-compose services)
export POSTGRES_DSN="postgres://user:pass@localhost:5432/crimeos?sslmode=disable"
export MONGO_URI="mongodb://localhost:27017"
export MONGO_DB_NAME="crimeos_digitalfootprint"
cd backend && go run ./cmd/server

# in a second terminal:
curl -i http://localhost:8080/api/v1/health
# expect: HTTP/1.1 200 OK
# {"status":"ok","postgres":"up","mongo":"up"}

go vet ./...
go build ./...
```
Deliberately stop Postgres and re-curl `/api/v1/health` — response must be `503` naming `postgres` as the failing dependency, proving the health check is real, not hardcoded.

## Documentation Requirements
- `internal/db/doc.go`: package comment explaining this package owns connection lifecycle for both datastores and nothing else (no query logic here).
- `backend/API.md`: health endpoint entry.
- Inline comment on `Config` struct fields stating which are required vs optional.
