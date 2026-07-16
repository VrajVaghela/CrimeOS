# Stage 6 of 6 — Container Component, Page Integration, Tests, Docs

Paste this whole file into your coding assistant. Assumes Stage 5's types,
API wrapper, and presentational components already exist.

```
You are implementing "OSINT & Breach Intelligence," a new module inside the
existing CrimeOS Digital Footprint codebase. Match existing conventions
exactly — do not introduce new frameworks, ORMs, or state management
libraries.

The following already exist from previous stages and should be reused, not
recreated — inspect each before writing this stage's code:
  frontend/src/types/osint.ts
  frontend/src/api/osint.ts        (getEntityOsintResult(caseId, entityId))
  frontend/src/components/osint/SocialProfileCard.tsx
  frontend/src/components/osint/SocialProfileGrid.tsx
  frontend/src/components/osint/BreachRiskTable.tsx
  frontend/src/components/osint/RiskSummaryBanner.tsx

This is the final stage — only build what's listed below.

============================================================
STAGE 6 OF 6: CONTAINER COMPONENT + PAGE INTEGRATION + TESTS + DOCS
============================================================

--- FILE: frontend/src/components/osint/OsintPanel.tsx ---

Props: `{ caseId: string; entityId: string }`. This is the stateful
container that ties everything together:

- On mount, call getEntityOsintResult(caseId, entityId).
- If the call fails with a 404 ("no scan yet" — inspect how Stage 5's API
  wrapper surfaces this), render a neutral empty state (not styled as an
  error) explaining the entity hasn't been scanned yet — this is expected
  for entities not yet confirmed, or where the worker hasn't picked up the
  job yet.
- If the fetched scan.status is PENDING or RUNNING, show a "Running OSINT
  enrichment…" indicator with a subtle pulse/skeleton animation, and poll
  the same endpoint every 3 seconds. Clear the interval on unmount and as
  soon as status becomes COMPLETED or FAILED.
- If scan.status is FAILED, show an error state displaying
  scan.error_message, with a "Retry" action that simply re-triggers the
  same fetch (do not call any new/different endpoint — there is no
  separate retry endpoint).
- If scan.status is COMPLETED, render in order: RiskSummaryBanner, then a
  labeled "Breach Exposure" section wrapping BreachRiskTable, then a
  labeled "Public Profiles" section wrapping SocialProfileGrid.
- For any other fetch error (non-404), show a distinct generic error state
  ("Failed to load OSINT results") separate from the FAILED-scan state
  above — a network/parse error is not the same thing as a completed scan
  that failed.
- All states (loading, empty, error, failed, completed) must match the
  dark law-enforcement dashboard's existing spacing/typography conventions
  — inspect AnalyticsDashboard for section-header style, padding, and font
  sizing and reuse it rather than inventing new patterns.
- Clean up the polling interval correctly on unmount to avoid state
  updates after unmount / memory leaks.

--- MODIFY: an existing page/component (locate it first) ---

Inspect src/components/ and the case detail pages for wherever a confirmed
entity is currently displayed in detail (likely inside IntakeReview's
entity table, or a dedicated entity detail view, or AnalyticsDashboard —
find the actual component, do not assume a filename). Mount `OsintPanel`
there, gated so it only renders when the entity's status is CONFIRMED
(entities that are EXTRACTED, REJECTED, or MERGED should not show the
panel at all). Pass caseId and entityId from whatever context/props are
already available at that point in the component tree — do not introduce
new routing or fetch extra data just to get these IDs if they're already
in scope.

--- NEW FILE: frontend/src/components/osint/BreachRiskTable.test.tsx ---

A minimal test using whatever test runner/library is already configured
in this repo (Vitest + React Testing Library, or similar — inspect an
existing *.test.tsx file first and match its setup/imports/assertion
style exactly). Cover:
- Given a breach with exposed_data_classes including "Passwords", the
  rendered row includes the critical-highlight class/styling.
- Given a breach with exposed_data_classes that does NOT include
  "Passwords" or "Financial Credentials", the row does NOT get the
  critical-highlight styling.
- Empty breaches array renders the "No known breaches..." empty state.

--- MODIFY: ARCHITECTURE.md (append only, do not rewrite existing content) ---

Append a new "## OSINT & Breach Intelligence" section, matching the
existing document's tone, heading level, and table formatting exactly
(inspect the existing "## Backend" and "## Storage Model" sections for the
table style to copy). Cover:
- One sentence describing the module's purpose.
- A small table listing the new package (internal/osint) and its
  responsibility, formatted the same way as the existing "Important
  packages" table.
- A row added conceptually to the existing "Runtime Workers" description
  (describe in prose that a fourth worker, the OSINT worker, now runs
  alongside the existing three — do not reformat the existing table, just
  add a short paragraph noting the addition since the existing table
  isn't being touched by this stage).
- A one-line note that all OSINT/breach data is currently simulated
  (mock), consistent with the existing document's "Legal request dispatch
  is simulated" note style under "Security And Audit Notes".

Requirements for this stage:
- Do not modify any file from Stages 1–5 beyond the one page-integration
  edit and the ARCHITECTURE.md append described above.
- Output complete file contents for OsintPanel.tsx and the new test file,
  a unified diff or clear before/after for the page-integration edit, and
  the exact markdown text being appended to ARCHITECTURE.md.
```
