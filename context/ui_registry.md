# UI Component Registry — Crime OS AI (living document)

Every reusable component created in `frontend/components/` MUST be logged here immediately after creation. **Before building any new component, search this file** — if something similar exists, extend it instead of duplicating.

## Format
```
### ComponentName
- Path: components/<file>.tsx
- Purpose: one line
- Props: key props only
- Used in: pages/components consuming it
```

---

## Base (shadcn/ui — installed, do not re-log individually)
`button, card, input, label, table, tabs, badge, dialog, alert, toast, skeleton, select, textarea, separator, avatar` — under `components/ui/`. Never modify these directly; wrap them in domain components.

## Domain Components
_(log below as built — expected roster from build plan, update statuses)_

### StatusBadge
- Path: components/status-badge.tsx
- Purpose: maps any entity status string → semantic-colored Badge per ui_tokens table
- Props: `status: string`
- Used in: `app/dashboard/page.tsx`

Last updated: 2026-07-05

| Property | Class |
| --- | --- |
| Background | `bg-success`, `bg-accent`, `bg-destructive`, `bg-muted` |
| Border | none |
| Border radius | `rounded-full` |
| Text primary | `text-success-foreground`, `text-accent-foreground`, `text-destructive-foreground`, `text-muted-foreground` |
| Text secondary | none |
| Spacing | `px-2 py-0.5` |
| Hover state | none |
| Shadow | none |
| Accent usage | semantic status token mapping |

**Pattern notes:** Status badges must stay token-driven and uppercase with `font-mono`; do not introduce raw color classes for statuses.

### AiContentCard — BUILT (Phase 3)
- Path: components/ai-content-card.tsx
- Purpose: wrapper marking AI-generated content with a full info-blue border, tinted surface, and Sparkles badge
- Props: `children: React.ReactNode`, `title?: string`
- Used in: `app/cases/[id]/path/page.tsx`

### CitationDialog — BUILT (Phase 3)
- Path: components/citation-dialog.tsx
- Purpose: shows SOP chunk grounding text inside a modal dialog upon clicking the citation trigger button
- Props: `title: string`, `sourceText: string`, `triggerLabel?: string`
- Used in: `components/path-stepper.tsx`

### PathStepper — BUILT (Phase 3)
- Path: components/path-stepper.tsx
- Purpose: vertical investigation path stepper displaying steps, status selectors, citations, and action triggers
- Props: `steps: PathStepOut[]`, `caseId: string`, `onStatusChange: (stepId: string, status: StepStatus) => Promise<void>`
- Used in: `app/cases/[id]/path/page.tsx`


### FileUploadZone — BUILT (Phase 2)
- Path: components/file-upload-zone.tsx
- Purpose: drag-drop upload for PDF/image/audio with type/size validation, file preview, and Gujarati/Hindi/English hints
- Props: `accept` (auto-configured), `onUpload: (file: File) => void`, `disabled?: boolean`
- Used in: `app/cases/[id]/ingestion/page.tsx`

### ProcessingCard — BUILT (Phase 2)
- Path: components/processing-card.tsx
- Purpose: polling skeleton card with elapsed-time counter and step progress dots for async AI ops
- Props: `label: string`, `startedAt: Date`
- Used in: `app/cases/[id]/ingestion/page.tsx`

### EntityReviewField — BUILT (Phase 2)
- Path: components/entity-review-field.tsx
- Purpose: editable extracted-entity input with confidence chip + low-confidence amber ring
- Props: `entity: ExtractedEntityOut`, `onChange: (entityId, value) => Promise<void>`
- Used in: `app/cases/[id]/ingestion/page.tsx`

### RoleGuard — BUILT (Phase 6)
- Path: components/role-guard.tsx
- Purpose: renders children only for allowed user roles (e.g. IO, SHO, LEGAL) with optional custom fallback
- Props: `allowedRoles: UserRole[]`, `fallback?: React.ReactNode`, `children: React.ReactNode`
- Used in: `app/dashboard/page.tsx`

### AuditTimeline — BUILT (Phase 5, inline in audit page)
- Path: app/cases/[id]/audit/page.tsx (inline, not a shared component)
- Purpose: vertical append-only audit event timeline with per-action icons, relative timestamps, click-to-expand detail, latest-event highlight
- Props: N/A (reads from API directly)
- Used in: `app/cases/[id]/audit/page.tsx`

### SummaryVersionList — BUILT (Phase 5, inline in summary page)
- Path: app/cases/[id]/summary/page.tsx (inline, not a shared component)
- Purpose: sidebar version selector + AI summary prose panel with version badge; supports regenerate with spinner
- Props: N/A (reads from API directly)
- Used in: `app/cases/[id]/summary/page.tsx`

### CaseCommandCenter — BUILT (Phase 8A)
- Path: components/case-command-center.tsx
- Purpose: case overview projection showing workflow spine, blockers, next-best action, key entities, active requests, latest insight, and recent activity
- Props: `caseId: string`
- Used in: `app/cases/[id]/page.tsx`

### WorkflowSpine — BUILT (Phase 8A)
- Path: components/workflow-spine.tsx
- Purpose: compact Ingest → Verify → Investigate → Request → Analyze → Summarize progress indicator with accessible stage labels
- Props: `stages: WorkflowStageOut[]`, `currentStage: string`, `onStageSelect?: (stage) => void`
- Used in: `CaseCommandCenter`

### NextBestAction — BUILT (Phase 8A)
- Path: components/next-best-action.tsx
- Purpose: single prioritized action with blocker explanation and direct route/mutation callback
- Props: `actionType: string | null`, `actionLabel: string | null`, `blockerCodes: string[]`, `onAction: (actionType: string) => void`, `disabled?: boolean`
- Used in: `CaseCommandCenter`

### SourceChip — BUILT (Phase 8B)
- Path: components/source-chip.tsx
- Purpose: compact provenance link showing source type, label, locator, and confidence
- Props: `sourceType: string`, `sourceLabel: string`, `locator?: string`, `confidence?: number`
- Used in: AI content cards, entity pivots

### PathRevisionList — BUILT (Phase 8B)
- Path: components/path-revision-list.tsx
- Purpose: active and superseded adaptive investigation-path revisions with trigger and change explanation
- Props: `revisions: InvestigationPathOut[]`, `activeRevisionId: string | null`, `onSelectRevision: (revision: InvestigationPathOut) => void`, `selectedRevisionId: string | null`
- Used in: `app/cases/[id]/path/page.tsx`

### EntityPivotPanel — BUILT (Phase 8B)
- Path: components/entity-pivot-panel.tsx
- Purpose: grouped case entities with confidence, source links, related cases, and evidence/request pivots
- Props: `entities: CaseEntityOut[]`, `relationships: EntityRelationshipOut[]`, `relatedCases: RelatedCaseOut[]`, `onSync: () => Promise<void>`
- Used in: `CaseCommandCenter`, `app/cases/[id]/page.tsx`
### EvidenceReviewWorkspace — BUILT (Phase 8C)
- Path: components/evidence-review-workspace.tsx
- Purpose: original media/transcript/translation review with timestamp markers and explicit add-to-case actions
- Props: `evidence: EvidenceOut`, `onRefresh: () => void`
- Used in: `app/cases/[id]/evidence/page.tsx`

## Planned Phase 8 components
These entries define the intended reusable surfaces. Mark them BUILT and add concrete usage after implementation; do not create duplicates with different names.

### CopilotPanel — BUILT (Phase 8D)
- Path: components/copilot-panel.tsx
- Purpose: case-scoped read-only assistant with grounded answers, source chips, fallback state, and audited prompts
- Props: `caseId: string`
- Used in: `CopilotDrawer`

### CopilotDrawer — BUILT (Phase 9)
- Path: components/copilot-drawer.tsx
- Purpose: persistent right-edge AI trigger that opens the case-scoped copilot in an off-canvas drawer
- Props: `caseId: string`
- Used in: `app/cases/[id]/layout.tsx`

**Pattern notes:** Keep the launcher compact and icon-first. The drawer owns the only intentional full-height overlay and reuses `CopilotPanel` so citations, fallback states, and read-only behavior stay consistent.

### RequestReadinessChecklist — BUILT (Phase 8E)
- Path: components/request-readiness-checklist.tsx
- Purpose: pre-dispatch validation checklist with missing-data links and approval state
- Props: `readiness: RequestReadinessOut`, `onEditClick?: () => void`, `onRoleApprovalClick?: () => void`
- Used in: `app/cases/[id]/requests/page.tsx`

### ResponseCorrelationPanel — BUILT (Phase 8E)
- Path: components/response-correlation-panel.tsx
- Purpose: explains flagged provider rows and links them to entities, evidence, and investigation steps
- Props: `correlations: ResponseCorrelationOut[]`, `onPromote: (rowIndex: number) => Promise<void>`
- Used in: `app/cases/[id]/requests/page.tsx`

## Planned Phase 10 Components

### CctvIntelPanel — BUILT (Phase 8C)
- Path: app/cases/[id]/timeline/page.tsx (inline component, exported as CctvPanel)
- Purpose: drag-drop CCTV frame uploader that calls Gemini Vision, shows analysis result (OSD timestamp, location, persons, vehicles, forensic flags), and pins a timeline event on success
- Props: `caseId: string`, `onPinned: (result: CctvPinOut) => void`
- Used in: `app/cases/[id]/timeline/page.tsx`

### LanguageToggle — BUILT (manan/multilingual)
- Path: components/language-toggle.tsx
- Purpose: compact 3-button EN / हिंदी / ગુજ language switcher; reads/writes lang to LanguageContext + localStorage; uses design tokens only (no hardcoded colors)
- Props: none (reads `useLanguage()` internally)
- Used in: `app/dashboard/page.tsx`, `app/login/page.tsx`

### TimelineWorkspace — BUILT (Phase 10A)
- Path: components/timeline-workspace.tsx
- Purpose: chronological AI/officer timeline with CCTV pins, source references, confidence, and note actions
- Props: `caseId: string`, `events: TimelineEventOut[]`, callbacks for note/CCTV actions
- Used in: `app/(authenticated)/cases/[id]/timeline/page.tsx`

### OsintEnrichmentPanel — BUILT (Phase 10B)
- Path: components/osint-enrichment-panel.tsx
- Purpose: case-entity OSINT risk summary with social profiles, breach exposure, risk level banners, and unconfirmed pivots
- Props: `caseId: string`, `entity: CaseEntityOut`, `onPivotAction: () => Promise<void>`
- Used in: `EntityPivotPanel` (`components/entity-pivot-panel.tsx`)

### VideoEvidenceWorkspace — BUILT (Phase 10C)
- Path: components/video-evidence-workspace.tsx
- Purpose: secure video upload/progress plus native video playback synchronized to timestamped incident events
- Props: `evidence: EvidenceOut`, `onRefresh: () => void`
- Used in: `app/(authenticated)/cases/[id]/evidence/page.tsx`

## Phase 9 — Ferrari Design Upgrades (not new components, updated existing)

### PathStepper — UPGRADED (Phase 9D)
- Connector lines now use `var(--gradient-accent-info-v)` (red→blue) for done steps
- Active step card uses `.glass` with `border-primary/60 glow-primary`  
- Step cards use `rounded-[12px]` squircle radius
- Citation button uses info-blue style

### CitationDialog — UPGRADED (Phase 9D/9E)
- Trigger uses info-blue border/text
- Dialog content uses `.glass-strong` panel with `rounded-[12px]`
- Content block uses a full info-blue border with a tinted surface

### SummaryPage — UPGRADED (Phase 9E)
- Summary card uses `var(--surface-warm)` (#23130f) background
- Blue AI icon header with rounded-[8px] container
- Red primary CTA button; hover darkens to primary/90, no scale or glow
- Info-blue left-bordered content block

### Dialog (UI) — UPGRADED (Phase 9E)
- Backdrop: `bg-[#0b0b0b]/85 backdrop-blur-xl`
- Content: `bg-[#171717]/90 backdrop-blur-xl rounded-[12px]`

### Button (UI) — UPGRADED (Phase 9E)
- Base transition: `duration-[130ms]` (130ms per Ferrari spec)
- Default/destructive/success variants: `hover:scale-105` (previously scale-[1.02])

### AuditPage — UPGRADED (Phase 9D)
- Timeline vertical line: `var(--gradient-accent-info-v)` red→blue gradient
- Event cards: `rounded-[12px]` squircle; latest card gets `glow-primary`

### CaseCommandCenter Signal Cards — UPGRADED (Phase 9D)
- All 4 signal cards: `rounded-[12px]` squircle, `bg-[#171717]`, `duration-[130ms]`
| Shadow | none |
| Accent usage | semantic status token mapping |

**Pattern notes:** Status badges must stay token-driven and uppercase with `font-mono`; do not introduce raw color classes for statuses.

### AiContentCard — BUILT (Phase 3)
- Path: components/ai-content-card.tsx
- Purpose: wrapper marking AI-generated content with a full info-blue border, tinted surface, and Sparkles badge
- Props: `children: React.ReactNode`, `title?: string`
- Used in: `app/cases/[id]/path/page.tsx`

### CitationDialog — BUILT (Phase 3)
- Path: components/citation-dialog.tsx
- Purpose: shows SOP chunk grounding text inside a modal dialog upon clicking the citation trigger button
- Props: `title: string`, `sourceText: string`, `triggerLabel?: string`
- Used in: `components/path-stepper.tsx`

### PathStepper — BUILT (Phase 3)
- Path: components/path-stepper.tsx
- Purpose: vertical investigation path stepper displaying steps, status selectors, citations, and action triggers
- Props: `steps: PathStepOut[]`, `caseId: string`, `onStatusChange: (stepId: string, status: StepStatus) => Promise<void>`
- Used in: `app/cases/[id]/path/page.tsx`


### FileUploadZone — BUILT (Phase 2)
- Path: components/file-upload-zone.tsx
- Purpose: drag-drop upload for PDF/image/audio with type/size validation, file preview, and Gujarati/Hindi/English hints
- Props: `accept` (auto-configured), `onUpload: (file: File) => void`, `disabled?: boolean`
- Used in: `app/cases/[id]/ingestion/page.tsx`

### ProcessingCard — BUILT (Phase 2)
- Path: components/processing-card.tsx
- Purpose: polling skeleton card with elapsed-time counter and step progress dots for async AI ops
- Props: `label: string`, `startedAt: Date`
- Used in: `app/cases/[id]/ingestion/page.tsx`

### EntityReviewField — BUILT (Phase 2)
- Path: components/entity-review-field.tsx
- Purpose: editable extracted-entity input with confidence chip + low-confidence amber ring
- Props: `entity: ExtractedEntityOut`, `onChange: (entityId, value) => Promise<void>`
- Used in: `app/cases/[id]/ingestion/page.tsx`

### RoleGuard — BUILT (Phase 6)
- Path: components/role-guard.tsx
- Purpose: renders children only for allowed user roles (e.g. IO, SHO, LEGAL) with optional custom fallback
- Props: `allowedRoles: UserRole[]`, `fallback?: React.ReactNode`, `children: React.ReactNode`
- Used in: `app/dashboard/page.tsx`

### AuditTimeline — BUILT (Phase 5, inline in audit page)
- Path: app/cases/[id]/audit/page.tsx (inline, not a shared component)
- Purpose: vertical append-only audit event timeline with per-action icons, relative timestamps, click-to-expand detail, latest-event highlight
- Props: N/A (reads from API directly)
- Used in: `app/cases/[id]/audit/page.tsx`

### SummaryVersionList — BUILT (Phase 5, inline in summary page)
- Path: app/cases/[id]/summary/page.tsx (inline, not a shared component)
- Purpose: sidebar version selector + AI summary prose panel with version badge; supports regenerate with spinner
- Props: N/A (reads from API directly)
- Used in: `app/cases/[id]/summary/page.tsx`

### CaseCommandCenter — BUILT (Phase 8A)
- Path: components/case-command-center.tsx
- Purpose: case overview projection showing workflow spine, blockers, next-best action, key entities, active requests, latest insight, and recent activity
- Props: `caseId: string`
- Used in: `app/cases/[id]/page.tsx`

### WorkflowSpine — BUILT (Phase 8A)
- Path: components/workflow-spine.tsx
- Purpose: compact Ingest → Verify → Investigate → Request → Analyze → Summarize progress indicator with accessible stage labels
- Props: `stages: WorkflowStageOut[]`, `currentStage: string`, `onStageSelect?: (stage) => void`
- Used in: `CaseCommandCenter`

### NextBestAction — BUILT (Phase 8A)
- Path: components/next-best-action.tsx
- Purpose: single prioritized action with blocker explanation and direct route/mutation callback
- Props: `actionType: string | null`, `actionLabel: string | null`, `blockerCodes: string[]`, `onAction: (actionType: string) => void`, `disabled?: boolean`
- Used in: `CaseCommandCenter`

### SourceChip — BUILT (Phase 8B)
- Path: components/source-chip.tsx
- Purpose: compact provenance link showing source type, label, locator, and confidence
- Props: `sourceType: string`, `sourceLabel: string`, `locator?: string`, `confidence?: number`
- Used in: AI content cards, entity pivots

### PathRevisionList — BUILT (Phase 8B)
- Path: components/path-revision-list.tsx
- Purpose: active and superseded adaptive investigation-path revisions with trigger and change explanation
- Props: `revisions: InvestigationPathOut[]`, `activeRevisionId: string | null`, `onSelectRevision: (revision: InvestigationPathOut) => void`, `selectedRevisionId: string | null`
- Used in: `app/cases/[id]/path/page.tsx`

### EntityPivotPanel — BUILT (Phase 8B)
- Path: components/entity-pivot-panel.tsx
- Purpose: grouped case entities with confidence, source links, related cases, and evidence/request pivots
- Props: `entities: CaseEntityOut[]`, `relationships: EntityRelationshipOut[]`, `relatedCases: RelatedCaseOut[]`, `onSync: () => Promise<void>`
- Used in: `CaseCommandCenter`, `app/cases/[id]/page.tsx`
### EvidenceReviewWorkspace — BUILT (Phase 8C)
- Path: components/evidence-review-workspace.tsx
- Purpose: original media/transcript/translation review with timestamp markers and explicit add-to-case actions
- Props: `evidence: EvidenceOut`, `onRefresh: () => void`
- Used in: `app/cases/[id]/evidence/page.tsx`

## Planned Phase 8 components
These entries define the intended reusable surfaces. Mark them BUILT and add concrete usage after implementation; do not create duplicates with different names.

### CopilotPanel — BUILT (Phase 8D)
- Path: components/copilot-panel.tsx
- Purpose: case-scoped read-only assistant with grounded answers, source chips, fallback state, and audited prompts
- Props: `caseId: string`
- Used in: `CopilotDrawer`

### CopilotDrawer — BUILT (Phase 9)
- Path: components/copilot-drawer.tsx
- Purpose: persistent right-edge AI trigger that opens the case-scoped copilot in an off-canvas drawer
- Props: `caseId: string`
- Used in: `app/cases/[id]/layout.tsx`

**Pattern notes:** Keep the launcher compact and icon-first. The drawer owns the only intentional full-height overlay and reuses `CopilotPanel` so citations, fallback states, and read-only behavior stay consistent.

### RequestReadinessChecklist — BUILT (Phase 8E)
- Path: components/request-readiness-checklist.tsx
- Purpose: pre-dispatch validation checklist with missing-data links and approval state
- Props: `readiness: RequestReadinessOut`, `onEditClick?: () => void`, `onRoleApprovalClick?: () => void`
- Used in: `app/cases/[id]/requests/page.tsx`

### ResponseCorrelationPanel — BUILT (Phase 8E)
- Path: components/response-correlation-panel.tsx
- Purpose: explains flagged provider rows and links them to entities, evidence, and investigation steps
- Props: `correlations: ResponseCorrelationOut[]`, `onPromote: (rowIndex: number) => Promise<void>`
- Used in: `app/cases/[id]/requests/page.tsx`

## Planned Phase 10 Components

### CctvIntelPanel — BUILT (Phase 8C)
- Path: app/cases/[id]/timeline/page.tsx (inline component, exported as CctvPanel)
- Purpose: drag-drop CCTV frame uploader that calls Gemini Vision, shows analysis result (OSD timestamp, location, persons, vehicles, forensic flags), and pins a timeline event on success
- Props: `caseId: string`, `onPinned: (result: CctvPinOut) => void`
- Used in: `app/cases/[id]/timeline/page.tsx`

### LanguageToggle — BUILT (manan/multilingual)
- Path: components/language-toggle.tsx
- Purpose: compact 3-button EN / हिंदी / ગુજ language switcher; reads/writes lang to LanguageContext + localStorage; uses design tokens only (no hardcoded colors)
- Props: none (reads `useLanguage()` internally)
- Used in: `app/dashboard/page.tsx`, `app/login/page.tsx`

### TimelineWorkspace — BUILT (Phase 10A)
- Path: components/timeline-workspace.tsx
- Purpose: chronological AI/officer timeline with CCTV pins, source references, confidence, and note actions
- Props: `caseId: string`, `events: TimelineEventOut[]`, callbacks for note/CCTV actions
- Used in: `app/(authenticated)/cases/[id]/timeline/page.tsx`

### OsintEnrichmentPanel — BUILT (Phase 10B)
- Path: components/osint-enrichment-panel.tsx
- Purpose: case-entity OSINT risk summary with social profiles, breach exposure, risk level banners, and unconfirmed pivots
- Props: `caseId: string`, `entity: CaseEntityOut`, `onPivotAction: () => Promise<void>`
- Used in: `EntityPivotPanel` (`components/entity-pivot-panel.tsx`)

### VideoEvidenceWorkspace — BUILT (Phase 10C)
- Path: components/video-evidence-workspace.tsx
- Purpose: secure video upload/progress plus native video playback synchronized to timestamped incident events
- Props: `evidence: EvidenceOut`, `onRefresh: () => void`
- Used in: `app/(authenticated)/cases/[id]/evidence/page.tsx`

## Phase 9 — Ferrari Design Upgrades (not new components, updated existing)

### PathStepper — UPGRADED (Phase 9D)
- Connector lines now use `var(--gradient-accent-info-v)` (red→blue) for done steps
- Active step card uses `.glass` with `border-primary/60 glow-primary`  
- Step cards use `rounded-[12px]` squircle radius
- Citation button uses info-blue style

### CitationDialog — UPGRADED (Phase 9D/9E)
- Trigger uses info-blue border/text
- Dialog content uses `.glass-strong` panel with `rounded-[12px]`
- Content block uses a full info-blue border with a tinted surface

### SummaryPage — UPGRADED (Phase 9E)
- Summary card uses `var(--surface-warm)` (#23130f) background
- Blue AI icon header with rounded-[8px] container
- Red primary CTA button; hover darkens to primary/90, no scale or glow
- Info-blue left-bordered content block

### Dialog (UI) — UPGRADED (Phase 9E)
- Backdrop: `bg-[#0b0b0b]/85 backdrop-blur-xl`
- Content: `bg-[#171717]/90 backdrop-blur-xl rounded-[12px]`

### Button (UI) — UPGRADED (Phase 9E)
- Base transition: `duration-[130ms]` (130ms per Ferrari spec)
- Default/destructive/success variants: `hover:scale-105` (previously scale-[1.02])

### AuditPage — UPGRADED (Phase 9D)
- Timeline vertical line: `var(--gradient-accent-info-v)` red→blue gradient
- Event cards: `rounded-[12px]` squircle; latest card gets `glow-primary`

### CaseCommandCenter Signal Cards — UPGRADED (Phase 9D)
- All 4 signal cards: `rounded-[12px]` squircle, `bg-[#171717]`, `duration-[130ms]`

### Root Layout SVG Defs — ADDED (Phase 9F)
- Global `<svg>` element with `linearGradient` defs for gradient IDs:
  `#gradient-accent-info-h`, `#gradient-accent-info-v`, `#gradient-graph-fill`

### HeatmapPage & HeatmapCanvas — ADDED (Phase 15/Bonus)
- HeatmapCanvas: Custom `<canvas>` based high-performance density visualizer. Uses token colors (`#ff3b30`, `#ff9500`, `#2d7ee9`, `#0f9d58`).
- Hover states: Glow and pulse animations via `requestAnimationFrame` and Hit-testing.
- Container: `rounded-squircle` border-border.
- `ClusterCard`: Stat display with 130ms transition and color-coded top borders.

### AlertCenterPage & AlertCard — ADDED (Real-Time Alert Center)
- AlertCenterPage: Dynamic dashboard route (`/alert-center`) with KPI summary metrics, active alert feed, and severity filtering dropdown.
- AlertCard: Interactive alert card component supporting mark-as-read toggling, dismiss removal transition (`duration-[220ms]`), and color-coded severity styling (CRITICAL: `#ef4444`, HIGH: `#f59e0b`, MEDIUM: `#3b82f6`, LOW: `#0f9d58`).
- KpiCard: Metric summary component with squircle borders (`rounded-[12px]`), tabular-nums typography, and channel indicator badges.

### RepeatOffendersPage & RiskBadge — ADDED (Repeat Offender Intelligence)
- RepeatOffendersPage: Master-Detail dashboard route (`/repeat-offenders`) with Offender Registry data table, risk level dropdown filter, and Behavioral Profile inspector panel.
- RiskBadge: Color-coded risk level pill component using dark-mode command center tokens (CRITICAL: dark red `#3f1218`/`#ef4444`, HIGH: dark orange `#3b220b`/`#f59e0b`, MEDIUM: dark blue `#0e2a4a`/`#3b82f6`, LOW: dark green `#063326`/`#10b981`).
- Offender Registry Data Table: Interactive table with horizontal progress bar for recidivism score, crime counts, and selected row highlight (`#132238` backdrop with blue border accent).
- Behavioral Profile Inspector Panel: Detailed side-panel showcasing selected offender details, KPI score cards, active sector location, and chronological crime timeline.

### CriminalNetworkGraph — ADDED (Criminal Network Intelligence, Phase 18)
**File:** `components/criminal-network-graph.tsx`
**Type:** Client-only D3 SVG visualization component (no SSR, `dynamic()` required)
**Props:** `nodes: NetworkNode[]`, `edges: NetworkEdge[]`, `onSelect?: (n: NetworkNode) => void`
**Behaviour:**
- D3 `forceSimulation` with link-force (distance 90), many-body charge (−240), center, and collision forces.
- Nodes rendered as translucent ring + inner solid dot; CRITICAL nodes display a pulsing `<animate>` ring.
- Edge color-coding: red = `gang_link`, amber = `financial`, dark-blue = `communication`/`associate`.
- Full drag (pin/unpin), zoom + pan via `d3.zoom`, responsive width via `ResizeObserver` + `useState`.
- Mono label below each node showing first name only.
- SVG bg: `#0c0c0c` with `border-border` and `rounded-squircle`.

### CriminalNetworkPage — ADDED (Criminal Network Intelligence, Phase 18)
**File:** `app/(authenticated)/criminal-network/page.tsx`
**Route:** `/criminal-network`
**Layout:** Full-height authenticated route — no nested case tabs.
**Sections:**
1. Page header with `Network` lucide icon, title, subtitle.
2. KPI strip (3 cards): Node count, Connection count, Gang network count.
3. Main 4-col grid: `CriminalNetworkGraph` (col-span-3) + right panel (Node Profile + Central Influencers).
4. Gang Structures grid: 8 gang community cards with per-gang risk tinted backgrounds.
5. Graph Legend bar: edge-type swatches + risk dot guide.
**Data source:** `lib/criminalNetworkData.ts` (purely static mock; no API calls).
**i18n keys added:** `nav.criminal_network`, `criminal_network.*` in en/hi/gu.

### HeatmapCanvas — ADDED (AI Crime Heatmap Engine, Phase 19)
**File:** `components/heatmap/HeatmapCanvas.tsx`
**Purpose:** Two-tier SVG geospatial visualization component rendering micro-scatter dots (background) and concentric glassmorphic cluster rings (foreground).
**Props:** `points: HeatmapPoint[]`, `zones: RiskZone[]`
**Used in:** `app/(authenticated)/heatmap/page.tsx`

### ClusterRing — ADDED (AI Crime Heatmap Engine, Phase 19)
**File:** `components/heatmap/ClusterRing.tsx`
**Purpose:** Concentric glassmorphic ring component for risk zones with animated pulse effect for CRITICAL/HIGH zones and centered text labels.
**Props:** `zone: RiskZone`, `cx: number`, `cy: number`, `color: string`
**Used in:** `HeatmapCanvas`

### ClusterCard — ADDED (AI Crime Heatmap Engine, Phase 19)
**File:** `components/heatmap/ClusterCard.tsx`
**Purpose:** Active crime cluster card with 7-day trend SVG sparkline, count, and crime category pill.
**Props:** `cluster: CrimeCluster`
**Used in:** `app/(authenticated)/heatmap/page.tsx`


