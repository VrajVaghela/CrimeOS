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

### EntityPivotPanel — REMOVED (Phase 23)
- Was: components/entity-pivot-panel.tsx
- Replaced by: `app/(authenticated)/cases/[id]/osint/page.tsx` (OSINT & Entity Intelligence section)
- Reason: entity intelligence was a collapsible panel bolted to the bottom of the case overview, with the OSINT report crammed into its narrow third column. It is now a first-class case section with a master-detail layout.
- Do not re-create it — extend the OSINT section page instead.
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

### OsintEnrichmentPanel — BUILT (Phase 10B), UPGRADED (Phase 23)
- Path: components/osint-enrichment-panel.tsx
- Purpose: case-entity OSINT risk summary with social profiles, breach exposure, risk level banners, and unconfirmed pivots
- Props: `caseId: string`, `entity: CaseEntityOut`, `onPivotAction: () => Promise<void>`
- Also exports: `isOsintSupported(entityType)`, `OSINT_SUPPORTED_TYPES` — the single source of truth for which identifiers the scanners accept
- Used in: `app/(authenticated)/cases/[id]/osint/page.tsx`

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

### EntityPivotPanel — REMOVED (Phase 23)
- Was: components/entity-pivot-panel.tsx
- Replaced by: `app/(authenticated)/cases/[id]/osint/page.tsx` (OSINT & Entity Intelligence section)
- Reason: entity intelligence was a collapsible panel bolted to the bottom of the case overview, with the OSINT report crammed into its narrow third column. It is now a first-class case section with a master-detail layout.
- Do not re-create it — extend the OSINT section page instead.
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

### OsintEnrichmentPanel — BUILT (Phase 10B), UPGRADED (Phase 23)
- Path: components/osint-enrichment-panel.tsx
- Purpose: case-entity OSINT risk summary with social profiles, breach exposure, risk level banners, and unconfirmed pivots
- Props: `caseId: string`, `entity: CaseEntityOut`, `onPivotAction: () => Promise<void>`
- Also exports: `isOsintSupported(entityType)`, `OSINT_SUPPORTED_TYPES` — the single source of truth for which identifiers the scanners accept
- Used in: `app/(authenticated)/cases/[id]/osint/page.tsx`

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

### MapLibreHeatmap — ADDED (Crime Heatmap Command Dashboard, Phase 20)
**File:** `components/heatmap/MapLibreHeatmap.tsx`
**Type:** Client-only MapLibre GL JS GPU heatmap component (`dynamic()` SSR false)
**Purpose:** Real-time geospatial map rendering GPU accelerated heatmap density layer, zoom-visible point markers with interactive popups, Surat police station markers, telemetry HUD, intensity multipliers, camera flyTo, and OpenFreeMap dark basemap style.
**Props:** `points: HeatmapPoint[]`, `zones?: RiskZone[]`, `selectedLocation?: [number, number] | null`, `onPointClick?: (point: HeatmapPoint) => void`, `className?: string`
**Used in:** `app/(authenticated)/heatmap/page.tsx`

### HeatmapIntelligenceRail — ADDED (Crime Heatmap Command Dashboard, Phase 20)
**File:** `components/heatmap/HeatmapIntelligenceRail.tsx`
**Purpose:** Right operational rail featuring 24h delta hotspot counts, zone intensity distribution bars (Critical/High/Moderate/Safe), interactive offense filters, and grounded AI Tactical Insight panel citing SOP-GUJ-PATROL-04.
**Props:** `points: HeatmapPoint[]`, `zones: RiskZone[]`, `clusters: CrimeCluster[]`, `selectedCrimeType: string`, `onSelectCrimeType: (crimeType: string) => void`, `insight?: HeatmapAiInsight`, `className?: string`
**Used in:** `app/(authenticated)/heatmap/page.tsx`

### RankedHotspotsTable — ADDED (Crime Heatmap Command Dashboard, Phase 20)
**File:** `components/heatmap/RankedHotspotsTable.tsx`
**Purpose:** Data table ranking Surat sectors by composite risk score with classification badges, dominant crime categories, coordinates, and "Focus" map camera flyTo triggers.
**Props:** `zones: RiskZone[]`, `clusters: CrimeCluster[]`, `onSelectZone: (coords: [number, number]) => void`, `className?: string`
**Used in:** `app/(authenticated)/heatmap/page.tsx`

### TrendAnalysisChart — ADDED (Crime Heatmap Command Dashboard, Phase 20)
**File:** `components/heatmap/TrendAnalysisChart.tsx`
**Purpose:** 7-Day temporal incident trend area sparkline chart with day-by-day metrics, peak period callout, and weekly comparison indicators.
**Props:** `clusters: CrimeCluster[]`, `className?: string`
**Used in:** `app/(authenticated)/heatmap/page.tsx`

---

## Phase 22 — Full Frontend Layout, Accessibility & Token Harmonization (Phase 22 Upgrades)

### EvidenceReviewWorkspace — UPGRADED (Phase 22)
- Replaced raw form labels with canonical `@/components/ui/label` primitive.
- Standardized file type icons (`getFileIcon`) to neutral `text-muted-foreground` to preserve semantic colors.
- Standardized buttons to `@/components/ui/button` variants (`outline`, `default`, `ghost`) with `rounded-squircle-sm`.
- Standardized marker cards with uniform `p-3.5` padding, concentric squircle radii, and `focus-visible:ring-primary`.

### VideoEvidenceWorkspace — UPGRADED (Phase 22)
- Replaced hardcoded text contrast issues (`text-secondary` -> `text-secondary-foreground`).
- Standardized telemetry pipeline container to `bg-surface-alt/50 border-border/40`.
- Integrated collapsible `<details>` disclosure with `ChevronDown` animation for SHA-256 Checksum and blockchain Chain of Custody verification.
- Added full keyboard accessibility (`role="button" tabIndex={0}` + Enter/Space handlers) and `focus-visible:ring-primary` on video timeline items.
- Removed redundant `animate-pulse` loops from static incident markers.

### OsintEnrichmentPanel — UPGRADED (Phase 22)
- Replaced raw spans and un-tokened buttons with canonical `<Badge>` and `<Button>` components.
- Eliminated `animate-pulse` loops from static risk banners, location updates, and bio badges; kept pulse exclusively on active scanning states (`PENDING`/`RUNNING`).
- Standardized all cards to concentric squircle radii (`rounded-squircle`, `rounded-squircle-sm`) and token-compliant borders.

### NotificationsPopover — UPGRADED (Phase 22)
- Added Escape key listener for keyboard dismissal.
- Standardized concentric squircle radii across popover container and individual rows.
- Replaced `.workspace-scroll` with clean default scrollbars.
- Made notification rows keyboard accessible (`role="button" tabIndex={0}` with Enter/Space handling) and added focus-visible styling to all interactive actions.

### CopilotDrawer & CopilotPanel — UPGRADED (Phase 22)
- In `copilot-drawer.tsx`: Added Escape key event listener to close drawer; configured semantic z-index layering (`z-30` launcher button, `z-40` backdrop, `z-50` dialog panel).
- In `copilot-panel.tsx`: Harmonized quick question chips and send button with Ferrari command design tokens (`rounded-squircle-sm`, `focus-visible:ring-primary`).

### AlertCenterPage & AlertCard — UPGRADED (Phase 22)
- Differentiated read state using `border-border/40 bg-card/60` and `text-muted-foreground` instead of `opacity-70`.
- Standardized severity indicators to canonical `<Badge variant="...">` (`CRITICAL` -> `destructive`, `HIGH` -> `warning`, `MEDIUM` -> `info`, `LOW` -> `success`).
- Replaced `animate-ping` with `animate-ping-slow` on live indicator dot.
- Standardized responsive title truncation (`max-w-xs md:max-w-md truncate`).

---

## Phase 23 — OSINT promoted to its own case section

### OsintPage — ADDED (Phase 23)
**File:** `app/(authenticated)/cases/[id]/osint/page.tsx`
**Route:** `/cases/[id]/osint` — a case workspace section alongside Ingestion, Path, Requests, and Responses (case tab rail, `group: "work"`, `Fingerprint` icon).
**Purpose:** Entity intelligence and open-source enrichment as one piece of investigative work: normalized case identifiers, their relationships, cross-case matches, and the OSINT dossier for the selected identifier.
**Layout:** `PageHeader` (section level, Sync entities action) → `MetricStrip` (identifiers / scannable / cross-case matches) → `lg:grid-cols-12` master-detail: identifier rail at `lg:col-span-4`, selected-identifier pane at `lg:col-span-8` (identity card → `OsintEnrichmentPanel` → relationships + related cases at `xl:grid-cols-2`).
**Behaviour:**
- Rail groups identifiers by entity type, orders OSINT-scannable types first, and tags those groups `osint.scannable`.
- Preselects the first scannable identifier so the section opens on actionable work; selection survives a re-sync.
- Low-confidence (<70%) rows keep the amber attention border and `ShieldAlert` marker from the old pivot panel.
- Related cases link through to `/cases/[other-id]`.
**Data source:** `getCaseEntities`, `getEntityRelationships`, `getRelatedCases`, `syncEntities` (no new endpoints).
**i18n keys added:** `tab.osint`, `nav.osint`, and the `osint.section_*` / `osint.metric_*` / `osint.unsupported_type` / `osint.unconfirmed_hint` group in en/hi/gu, plus `entity.transaction`, `entity.amount_label`, `entity.call_duration`.
**Keys removed:** `command_center.pivot_panel`, `sync_entities`, `no_synced_entities`, `select_entity`, `entity_intelligence_title`, `entity_intelligence_sub` (the panel they labelled no longer exists).

### OsintEnrichmentPanel — UPGRADED (Phase 23)
- Laid out for a content pane instead of a 310px rail: social matches and breaches are `xl:grid-cols-2` card grids, and all three `max-h-[220px] overflow-y-auto` peepholes are gone (the page scrolls).
- Export dossier and Re-run scan moved from the bottom of the panel into the panel header, next to the scan status they act on.
- Scan status now renders through `useEnumLabel().statusLabel()` rather than raw `PENDING`/`RUNNING` enum text.
- Localized every remaining hardcoded English string (unsupported entity type, scanner progress, follower counts, breach note, confirm-pivot action).
- Added an explicit amber note for unconfirmed pivots, which the backend refuses to scan, replacing a silent 400.
- Social profile cards now surface `profile_url` as an external link (the field was fetched but never rendered).

### CaseCommandCenter — UPGRADED (Phase 23)
- Dropped the `EntityPivotPanel` block and with it the `getEntityRelationships` / `getRelatedCases` / `syncEntities` calls and `handleSyncEntities`; the overview still loads `getCaseEntities` for the confidence and extracted-details metrics.

---

## Phase 24 — Live Analyzer Card Rules Conformance

### StatusBadge — UPGRADED (Phase 24)
- Path: `components/status-badge.tsx`
- Added a **live in-flight bucket**: `running`, `active_analysis`, `uploaded` → Info Blue + **pulsing** dot. `dispatched` / `in_progress` keep the **static** dot (underway, but not observably ticking).
- Named `queued` / `pending` / `draft` in the neutral fall-through so the intent is documented rather than incidental.
- This component now owns the "still working" pulse for the whole app. A polling card must **not** add its own `animate-ping` ring, an `animate-pulse` decorative icon, or a `Loader2` spinner — see the Badge-Owns-The-Pulse rule in `DESIGN.md` §5 and `ui_rules.md` §5.
- New `status.*` keys in en/hi/gu: `queued`, `uploaded`, `active_analysis`.

### VideoEvidenceWorkspace — UPGRADED (Phase 24)
- Path: `components/video-evidence-workspace.tsx`
- Scope: the **active-processing state** (the live analyzer card shown while `video_status` is not `COMPLETED`/`FAILED`), plus same-file violations in the completed state.

**Misleading state fixed (the reason for the pass):**
- Pipeline rows were driven by invented thresholds (0/25/60/85) while the backend commits 0 → 15 → 35 → 55 → 60 → 75 → 100. At 35% the card claimed "Computer Vision & Object Tracking — RUNNING" while the caption said Gemini was still ingesting. `PIPELINE_STEPS` is now module-level (no longer rebuilt on every 2s poll) and each row owns the band that *ends* at its `doneAt` (15 / 55 / 75 / 100), derived through a single `runningIndex`, so exactly one row can be running and it always matches the caption.
- `PHASE_LABELS` carried `ANALYZING`, `PERSISTING`, and `CLEANING_UP` — three phases **no backend code path ever writes**. Replaced by `PHASE_CAPTION_KEYS` covering only the five real statuses, with a `phase_unknown` fallback.
- `errorDetail` was read from the poll response and never rendered. Now surfaces as an amber attention note (Amber = attention-needed per §1.3; the run has not failed, so not red).

**Localization (rule §1.7):**
- 21 hardcoded English strings removed: `PHASE_LABELS`, all eight step label/detail strings, "AI Forensic Engine", "Live Telemetry Pipeline", the ledger and auto-refresh footer, and the `DONE`/`RUNNING`/`QUEUED` chips.
- The raw enum `ACTIVE_ANALYSIS` was rendering verbatim in the header pill. Now resolves through `StatusBadge` → `useEnumLabel().statusLabel()`.
- Step keys are typed as `TranslationKey`, so a missing dictionary key is a **compile error** rather than a runtime key-echo.
- Removed `truncate` from step labels and details: Hindi/Gujarati run appreciably longer than the English source and were clipping.

**Accessibility:**
- Progress bar is now `role="progressbar"` with `aria-valuenow/min/max` + `aria-label`, and the value is clamped to 0–100.
- Phase caption is an `aria-live="polite"` region; the error note is `role="status"`.
- The evidence ID moved **out of** the `<h2>` (it was polluting the accessible heading name) into its own mono line under the status badge.
- Pipeline is a semantic `<ol>`/`<li>`; every decorative icon carries `aria-hidden="true"`.
- Queued rows no longer use `opacity-60` / `text-muted-foreground/60` (both below the `#a89f91` floor) — differentiated by border/surface tone and badge instead, matching the Phase 22 read-state precedent.

**Design system drift:**
- Six `text-[11px]` off-ramp values → documented steps (`text-[10px]` labels, `text-xs` detail, `text-sm` row labels).
- `text-xl md:text-2xl` heading → `text-lg` (Headline step), removing a Fixed-Scale Rule violation.
- Deleted the "AI FORENSIC ENGINE" eyebrow badge sitting above the real heading (banned kicker pattern, and redundant with the Sparkles mark + blue border that already declare the surface AI-authored).
- Motion cut from **four** loops (`animate-pulse` ×2, `animate-ping`, `animate-spin`) to **one** — the `StatusBadge` pulse. Row transitions moved to `duration-[130ms]`, bar width to `duration-[220ms]` (was an undocumented 500ms; `transition-all duration-300` on rows was also undocumented).
- Dropped the bordered sub-panel that wrapped only the progress label + percentage + bar (nested-card pattern); the bar now sits on the card and is full width.
- Progress track `bg-background` → `bg-muted` (a canvas-coloured track inside a card reads as a hole).
- Card no longer re-declares `rounded-squircle p-5` that `Card` already provides.
- Prose taken out of `font-mono` (step details, phase caption, footer). Mono is retained for the ID, the percentage, and the uppercase data labels.

**Same-file cleanups (completed state):**
- `h-4.5 w-4.5` ×2 → `h-4 w-4`. Tailwind has no `4.5` step and this project does not extend it, so those icons were silently rendering at natural size.
- Emoji-as-icons `⏱️` ×2 and `📦` replaced with `Clock` and `HardDrive` from `lucide-react`.
- `text-[11px]` in the chain-of-custody summary → `text-[10px]`.
- Removed dead code: `isPlaying` state plus its `play`/`pause` listeners (set, never read), and unused imports `Play`, `Pause`, `Tag`, `Calendar`, `ExternalLink`, `RefreshCw`, `Loader2`, `CheckCircle2`, `Separator`.

**New i18n keys** (en/hi/gu): `video.analysis_id`, `video.pipeline_title`, `video.ledger_active`, `video.auto_refreshing`, `video.phase_{uploaded,processing,active_analysis,completed,failed,unknown}`, `video.step_{ingest,cv,legal,ledger}` and their `_detail` pairs.
**Keys removed:** none.

> **Housekeeping note (not fixed in this pass):** this registry currently contains a duplicated block — the entries from `StatusBadge` through `CaseCommandCenter Signal Cards` appear twice (once around the top, once again mid-file). Since the file's stated purpose is "search this file before building any new component," the duplication is worth a dedicated cleanup commit; it was left alone here to keep this diff scoped to the analyzer card.

