# Stage 2 of 6 — Go Backend Core (Models + Repository)

Paste this whole file into your coding assistant. Assumes Stage 1's
migration is already merged.

```
You are implementing "OSINT & Breach Intelligence," a new module inside the
existing CrimeOS Digital Footprint codebase. Match existing conventions
exactly — do not introduce new frameworks, ORMs, or state management
libraries.

EXISTING ARCHITECTURE:
Backend: Go modular monolith, `chi` router, PostgreSQL via `pgx` (raw SQL,
no ORM), MongoDB for raw/unstructured response data, background workers
started from `backend/cmd/server/main.go` following the pattern used by
`dispatch.RunWorker` and `analytics.RunParseWorker`. Mutating routes are
wrapped by `internal/audit` middleware. Handlers live in `internal/handler`,
domain logic in per-feature packages (`internal/entity`, `internal/lers`,
`internal/dispatch`, `internal/analytics`).

The database schema for this module (osint_scans, social_profiles,
data_breaches) already exists — inspect the migration file in
backend/internal/db/migrations/ before writing any Go code so your struct
fields and queries match the actual column names/types exactly.

Before writing code, inspect an existing repository file (e.g.
internal/lers/repository.go or internal/dispatch's repository) and copy its
connection-pool-injection pattern, transaction style, and error-wrapping
conventions exactly. This module is being built in stages — only build what
THIS stage asks for.

============================================================
STAGE 2 OF 6: MODELS + REPOSITORY LAYER
============================================================

Create package backend/internal/osint/ with two files:

--- FILE: backend/internal/osint/models.go ---

Define Go structs mirroring the osint_scans / social_profiles /
data_breaches schema, with `db` and `json` tags consistent with the tag
style used in internal/entity and internal/lers (inspect those first).

Required types:
- `Scan` struct — all osint_scans columns
- `SocialProfile` struct — all social_profiles columns
- `DataBreach` struct — all data_breaches columns, ExposedDataClasses as
  []string mapped to the Postgres TEXT[] column (match however array
  columns are already handled elsewhere in this codebase, e.g. pgx's
  native array support — check an existing example first)
- `ScanStatus` string type with constants: `PendingStatus`, `RunningStatus`,
  `CompletedStatus`, `FailedStatus`
- `EntityScanResult` — the aggregate response shape:

  type EntityScanResult struct {
      Scan           Scan            `json:"scan"`
      SocialProfiles []SocialProfile `json:"social_profiles"`
      Breaches       []DataBreach    `json:"breaches"`
      RiskSummary    RiskSummary     `json:"risk_summary"`
  }

  type RiskSummary struct {
      TotalBreaches    int    `json:"total_breaches"`
      CriticalBreaches int    `json:"critical_breaches"`
      PlatformsFound   int    `json:"platforms_found"`
      OverallRiskLevel string `json:"overall_risk_level"` // CRITICAL/HIGH/MEDIUM/LOW
  }

--- FILE: backend/internal/osint/repository.go ---

Implement a `Repository` struct wrapping the shared pgx pool (match however
other repositories in this codebase receive/store their pool — constructor
injection vs package-level var, copy whatever's already standard) with
these methods:

- `CreateScan(ctx context.Context, entityID, caseID uuid.UUID, entityType, entityValue string) (Scan, error)`
  Inserts a PENDING scan row, returns the created row.

- `UpdateScanStatus(ctx context.Context, scanID uuid.UUID, status ScanStatus, errMsg *string) error`
  Updates status, and started_at/completed_at as appropriate (set
  started_at when transitioning to RUNNING, completed_at when transitioning
  to COMPLETED or FAILED). Also bumps updated_at.

- `InsertSocialProfiles(ctx context.Context, scanID uuid.UUID, profiles []SocialProfile) error`
  Batch insert (use whatever batch-insert pattern — pgx.Batch, multi-row
  INSERT, or COPY — is already used elsewhere in this codebase; if none
  exists, use a simple multi-row INSERT with parameterized placeholders).

- `InsertBreaches(ctx context.Context, scanID uuid.UUID, breaches []DataBreach) error`
  Same batching approach as above.

- `GetLatestScanForEntity(ctx context.Context, entityID uuid.UUID) (Scan, error)`
  Returns the most recent scan row for an entity, or a typed "not found"
  error (match the not-found error pattern already used in this codebase,
  e.g. a sentinel error or wrapping pgx.ErrNoRows) if none exists.

- `GetFullResult(ctx context.Context, entityID uuid.UUID) (EntityScanResult, error)`
  Fetches the latest scan, its social_profiles, its data_breaches, and
  computes RiskSummary:
    - TotalBreaches = len(breaches)
    - CriticalBreaches = count where severity == 'CRITICAL'
    - PlatformsFound = len(social_profiles)
    - OverallRiskLevel = 'CRITICAL' if any CRITICAL breach exists,
      else 'HIGH' if any HIGH breach exists,
      else 'MEDIUM' if any MEDIUM breach or 3+ platforms found,
      else 'LOW'
  Return the same not-found error as GetLatestScanForEntity if no scan
  exists yet for this entity (do not return a zero-value EntityScanResult
  silently).

- `ClaimPendingScans(ctx context.Context, limit int) ([]Scan, error)`
  Uses `SELECT ... FOR UPDATE SKIP LOCKED` within a transaction to claim up
  to `limit` PENDING scans, flips them to RUNNING (setting started_at),
  commits, and returns the claimed rows. This must be safe against multiple
  API/worker instances running concurrently — mirror however the dispatch
  queue's claim logic already handles this, if such a method exists;
  otherwise implement it cleanly with an explicit transaction and row
  locking.

Requirements:
- All queries parameterized ($1, $2, ...) — never string concatenation.
- Every method wraps underlying errors with context using `%w` and a
  descriptive message (e.g. "osint: insert social profiles: %w").
- Add package-level doc comment at the top of models.go describing the
  module's purpose and noting that scan execution (Sherlock/Holehe/breach
  lookups) lives in later files, not here.
- Do not implement the worker, scanners, or HTTP handlers in this stage —
  repository and models only.
- Output complete file contents for both files, ready to drop in.
```
