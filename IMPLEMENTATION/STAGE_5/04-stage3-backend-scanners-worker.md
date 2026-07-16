# Stage 3 of 6 — Mock Scanners + Background Worker

Paste this whole file into your coding assistant. Assumes Stages 1–2 are
already merged (schema + models/repository exist).

```
You are implementing "OSINT & Breach Intelligence," a new module inside the
existing CrimeOS Digital Footprint codebase. Match existing conventions
exactly — do not introduce new frameworks, ORMs, or state management
libraries.

EXISTING ARCHITECTURE:
Backend: Go modular monolith, `chi` router, PostgreSQL via `pgx` (raw SQL,
no ORM), MongoDB for raw/unstructured response data, background workers
started from `backend/cmd/server/main.go` following the pattern used by
`dispatch.RunWorker` and `analytics.RunParseWorker`. Domain logic lives in
per-feature packages.

The package backend/internal/osint/ already contains models.go and
repository.go from a previous stage — inspect them before writing this
stage's code so signatures match exactly (struct field names, ScanStatus
constants, Repository method signatures).

All lookups in this module are SIMULATED — deterministic mock data
generated in-process, no real third-party HTTP calls. Structure each
scanner behind a small interface so a real provider can be swapped in
later without touching the worker.

Before writing code, inspect dispatch.RunWorker (or the closest equivalent)
to copy its ticker/shutdown/logging structure exactly. This module is being
built in stages — only build what THIS stage asks for.

============================================================
STAGE 3 OF 6: MOCK SCANNERS + WORKER
============================================================

Add these files to backend/internal/osint/:

--- FILE: backend/internal/osint/sherlock.go ---

  type UsernameScanner interface {
      ScanUsername(ctx context.Context, username string) ([]SocialProfile, error)
  }

Implement `MockSherlockScanner` satisfying this interface:
- Static list of ~12 target platforms: Instagram, X/Twitter, GitHub,
  Reddit, TikTok, Facebook, LinkedIn, Telegram, YouTube, Pinterest,
  Snapchat, Discord.
- Deterministically hash `username + platform` (use Go's `hash/fnv`) to
  decide per-platform whether a profile is "found" — same username must
  always produce the same result set across runs, so investigators see
  stable results.
- For "found" platforms generate a realistic mock profile_url (matching
  each platform's real URL shape, e.g. https://github.com/{username}),
  bio (short, generic, plausible), follower_count (weighted toward small
  numbers via the hash, with an occasional high outlier), is_verified
  (rare true, e.g. <5% via hash), and exists_confidence
  (mostly LIKELY, sometimes CONFIRMED, rarely UNCERTAIN).
- Simulate latency with a small randomized time.Sleep per platform check
  (e.g. 50–200ms) and respect ctx.Done() for early cancellation between
  platform checks.
- Add a doc comment stating clearly this is a MOCK implementation
  simulating Sherlock-style enumeration, and marking this file as the
  interface swap point for a future live OSINT provider.

--- FILE: backend/internal/osint/holehe.go ---

  type EmailRegistrationScanner interface {
      ScanEmail(ctx context.Context, email string) ([]SocialProfile, error)
  }

Implement `MockHoleheScanner`:
- Reuses the same deterministic-hash approach as sherlock.go against a
  distinct static list of services typically checked by Holehe-style
  tools (e.g. a generic set of consumer platforms/services known for
  email-registration checks).
- Reuses the `SocialProfile` struct, but per a comment: profile_url may be
  empty string (registration checks don't confirm a public profile page),
  and exists_confidence should generally be LIKELY or UNCERTAIN — never
  CONFIRMED, since this is a registration check, not content verification.
- Same latency-simulation and ctx cancellation behavior as sherlock.go.
- Doc comment marking it as a MOCK Holehe-style implementation.

--- FILE: backend/internal/osint/breach.go ---

  type BreachLookupService interface {
      LookupBreaches(ctx context.Context, identifier, identifierType string) ([]DataBreach, error)
  }

Implement `MockBreachService`:
- Maintain a static seed table of 10–15 fictionalized breach entries (do
  NOT use real HaveIBeenPwned breach names/data — invent plausible-sounding
  names like "DataVault Leak 2021", "ShopSphere Exposure 2020" — to avoid
  implying this is real HIBP data), each with breach_domain, leak_date,
  exposed_data_classes (drawn from a small vocabulary: Emails, Passwords,
  Phone Numbers, Physical Address, Financial Credentials, Government ID,
  Dates of Birth, IP Addresses), record_count, and source_note.
- Deterministically select a subset of the seed table per identifier using
  the same FNV-hash approach as sherlock.go, for reproducibility.
- Severity assignment rule (implement as a small pure function so it's
  independently testable):
    CRITICAL if exposed_data_classes includes "Passwords" AND
      ("Financial Credentials" OR "Government ID")
    HIGH if exposed_data_classes includes "Passwords" alone
    MEDIUM if exposed_data_classes includes "Phone Numbers" or
      "Physical Address" without "Passwords"
    LOW otherwise
- Doc comment marking it as a MOCK HaveIBeenPwned-style implementation.

--- FILE: backend/internal/osint/worker.go ---

  func RunWorker(ctx context.Context, repo *Repository, mongoDB *mongo.Database, interval time.Duration, concurrency int)

Mirror dispatch.RunWorker's structure precisely: ticker loop on `interval`,
graceful shutdown on ctx.Done(), structured logging each cycle (cycle
start, scans claimed, cycle duration).

Each cycle:
1. Call `repo.ClaimPendingScans(ctx, batchSize)` (small batch, e.g. 5).
2. Process claimed scans through a bounded worker pool sized by
   `concurrency` (semaphore or buffered-channel pattern — do not spawn
   unbounded goroutines).
3. For each claimed scan, in its own goroutine:
   - Wrap the work in a deferred recover that, on panic, marks the scan
     FAILED with a generic error_message and logs the panic — a scan must
     never stay stuck in RUNNING.
   - Dispatch by scan.EntityType:
     - "USERNAME" -> MockSherlockScanner.ScanUsername
     - "EMAIL" -> MockHoleheScanner.ScanEmail AND MockBreachService.LookupBreaches(identifierType="EMAIL")
     - "PHONE" -> MockBreachService.LookupBreaches(identifierType="PHONE") only
     - any other type -> mark scan FAILED with a clear "unsupported entity
       type for OSINT scan" error_message, do not attempt lookups
   - Persist results via repo.InsertSocialProfiles / repo.InsertBreaches.
   - Write a raw result snapshot (scan ID, entity value, raw
     profiles/breaches as fetched) to a MongoDB collection named
     `osint_raw_results`, mirroring the pattern used for
     `raw_response_dumps` in internal/analytics — this is for audit/
     debugging only, never read by the API path built in a later stage.
   - On success, call repo.UpdateScanStatus(..., CompletedStatus, nil).
     On any lookup/persist error, call
     repo.UpdateScanStatus(..., FailedStatus, &errMsg) instead of
     propagating a panic or crashing the worker loop.
   - Log outcome and duration for the scan.

Also add:

  func EnqueueScanForEntity(ctx context.Context, repo *Repository, entityID, caseID uuid.UUID, entityType, entityValue string) error

Thin wrapper around repo.CreateScan — a single fast INSERT, no external
calls, safe to call synchronously from an HTTP handler without risking
request latency. Wrap and return any error with context.

Requirements:
- Read `OSINT_WORKER_CONCURRENCY` (default 4) the same way other numeric
  env vars are already read/parsed in main.go or a shared config file —
  inspect that pattern first (this stage should still accept `concurrency`
  as a parameter; wiring the env var into main.go happens in Stage 4).
- No real external HTTP calls anywhere in this stage.
- Output complete file contents for all four files, ready to drop in.
```
