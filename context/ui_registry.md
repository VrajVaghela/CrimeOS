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
- Purpose: wrapper marking AI-generated content with glowing left border and Sparkles badge
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
- Used in: `CaseCommandCenter`

### RequestReadinessChecklist
- Path: components/request-readiness-checklist.tsx
- Purpose: pre-dispatch validation checklist with missing-data links and approval state
- Props: `readiness: RequestReadinessOut`, `onResolve: (item) => void`
- Used in: `app/cases/[id]/requests/page.tsx`

### ResponseCorrelationPanel
- Path: components/response-correlation-panel.tsx
- Purpose: explains flagged provider rows and links them to entities, evidence, and investigation steps
- Props: `correlations: ResponseCorrelationOut[]`, `onPromote: (correlationId) => Promise<void>`
- Used in: `app/cases/[id]/responses/page.tsx`
