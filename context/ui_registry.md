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

### RoleGuard — PLANNED
- Path: components/role-guard.tsx
- Purpose: renders children only for allowed roles (bonus phase)
- Props: `roles: Role[]`

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
