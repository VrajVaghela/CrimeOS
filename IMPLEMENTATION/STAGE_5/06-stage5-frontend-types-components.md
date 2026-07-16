# Stage 5 of 6 — Frontend Types, API Wrapper, Components

Paste this whole file into your coding assistant. Assumes Stage 4's
endpoint (`GET /api/v1/cases/{caseId}/osint/{entityId}`) is already live.

```
You are implementing "OSINT & Breach Intelligence," a new module inside the
existing CrimeOS Digital Footprint codebase. Match existing conventions
exactly — do not introduce new frameworks, ORMs, or state management
libraries.

EXISTING ARCHITECTURE:
Frontend: React 19 + TypeScript + Vite, Tailwind CSS. Typed API wrappers in
src/api/, domain types in src/types/, reusable components in
src/components/. State is local/context based — no Redux/Zustand. The
dashboard uses a dark, professional law-enforcement theme.

The backend endpoint this stage consumes is:
  GET /api/v1/cases/{caseId}/osint/{entityId}
returning JSON shaped as:
  {
    "scan": { "id", "case_id", "entity_id", "entity_type", "entity_value",
              "status", "started_at", "completed_at", "error_message",
              "created_at", "updated_at" },
    "social_profiles": [ { "id", "scan_id", "platform", "username",
              "profile_url", "profile_picture_url", "bio",
              "follower_count", "is_verified", "exists_confidence",
              "discovered_at" } ],
    "breaches": [ { "id", "scan_id", "breach_name", "breach_domain",
              "leak_date", "exposed_data_classes", "record_count",
              "severity", "source_note", "discovered_at" } ],
    "risk_summary": { "total_breaches", "critical_breaches",
              "platforms_found", "overall_risk_level" }
  }
scan.status is one of PENDING | RUNNING | COMPLETED | FAILED.
Before writing code, inspect the actual JSON casing convention already
used elsewhere in src/types/ (the Go backend may serialize snake_case, and
the frontend may either keep snake_case or map to camelCase at the API
boundary) and match whatever's already standard — do not introduce a new
convention.

Before writing components, inspect an existing dashboard page (e.g.
AnalyticsDashboard) for exact Tailwind color/spacing/typography tokens
already in use for this dark theme, and reuse them rather than inventing
new ones. If lucide-react or another icon set is already a dependency,
use it for platform icons; otherwise use text badges.

This module is being built in stages — only build what THIS stage asks
for (types, API wrapper, and presentational components). Do NOT mount
anything into an existing page yet — that happens in Stage 6.

============================================================
STAGE 5 OF 6: TYPES, API WRAPPER, COMPONENTS
============================================================

--- FILE: frontend/src/types/osint.ts ---

TypeScript interfaces matching the JSON payload above field-for-field,
using whichever casing convention is already standard in this codebase:
  OsintScan, SocialProfile, DataBreach, RiskSummary, EntityScanResult
Plus a union type:
  export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
And a union type for confidence:
  export type ProfileConfidence = 'CONFIRMED' | 'LIKELY' | 'UNCERTAIN'
And severity:
  export type BreachSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

--- FILE: frontend/src/api/osint.ts ---

  export async function getEntityOsintResult(caseId: string, entityId: string): Promise<EntityScanResult>

Follow the exact fetch/error-handling/base-URL pattern already used by
other files in src/api/ (inspect one, e.g. the entities or legal-requests
API wrapper, and copy its structure exactly, including how it throws or
returns on non-2xx responses and how it handles a 404 specifically — the
caller needs to distinguish "no scan yet" from a real error).

--- FILE: frontend/src/components/osint/SocialProfileCard.tsx ---

Props: `{ profile: SocialProfile }`. Purely presentational. Renders:
- Circular profile picture; if profile_picture_url is null/empty, render a
  fallback initials avatar (derived from username) instead.
- Platform name plus a small icon or text badge.
- Username and a 2-line-clamped bio (use Tailwind line-clamp; add the
  plugin only if it's already available in this project, otherwise
  implement a CSS-only clamp).
- Follower count formatted with K/M suffixes (e.g. 12400 -> "12.4K").
- A verified badge shown only when is_verified is true.
- A confidence badge: CONFIRMED = solid green, LIKELY = amber outline,
  UNCERTAIN = gray outline.
- A "View Profile" link opening profile_url in a new tab with
  rel="noopener noreferrer" — hide this link entirely if profile_url is
  empty (this happens for Holehe-style email results).
- Dark theme styling: card background around bg-slate-900/60, border
  border-slate-700 with hover:border-slate-500 transition, primary text
  text-slate-100, secondary text text-slate-400 — but defer to whatever
  exact tokens you found already in use on AnalyticsDashboard if they
  differ from these defaults.

--- FILE: frontend/src/components/osint/SocialProfileGrid.tsx ---

Props: `{ profiles: SocialProfile[] }`. Responsive grid
(grid-cols-1 sm:grid-cols-2 lg:grid-cols-3, gap-4) of SocialProfileCard.
Empty state: centered muted message, "No public profiles discovered for
this identifier."

--- FILE: frontend/src/components/osint/BreachRiskTable.tsx ---

Props: `{ breaches: DataBreach[] }`. Table columns: Breach Name, Leak Date,
Exposed Data, Severity, Records.
- Sort rows by severity descending (CRITICAL, HIGH, MEDIUM, LOW) by
  default.
- Row highlighting: when exposed_data_classes includes "Passwords" OR
  "Financial Credentials", apply a critical highlight — deep red tinted
  row background (around bg-red-950/40) with a left accent border
  (border-l-4 border-red-600). Otherwise use standard alternating dark row
  styling consistent with the rest of the dashboard.
- Severity rendered as a colored pill: CRITICAL=red, HIGH=orange,
  MEDIUM=amber, LOW=slate.
- Exposed Data rendered as small chips, one per class; chips for
  "Passwords" and "Financial Credentials" get a distinct red-tinted chip
  style, all others neutral slate chips.
- Empty state: "No known breaches associated with this identifier."

--- FILE: frontend/src/components/osint/RiskSummaryBanner.tsx ---

Props: `{ summary: RiskSummary }`. Compact banner: overall_risk_level shown
as a large colored badge using the same severity color scale as the table,
plus three small stat blocks (Total Breaches, Critical Breaches, Platforms
Found).

Requirements for this stage:
- All five component files are purely presentational — no data fetching,
  no polling logic (that's Stage 6, in a container component).
- Match existing prop-typing conventions (interface vs inline type) used
  elsewhere in src/components/.
- Output complete file contents for all seven files (types, api wrapper,
  five components), ready to drop in.
```
