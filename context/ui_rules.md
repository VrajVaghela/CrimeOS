# UI Rules — Crime OS AI (Ferrari Edition)

Audience: **non-technical police officers** — but the presentation is a **dark, high-tech Ferrari cyber-command aesthetic**. The tension resolves as: futuristic looks, dead-simple interactions.

## 1. Global Principles

1. **The Accent Red Rule**: Ferrari Red (`--accent`) is used at most twice per screen: typically one primary CTA + one active indicator. Never use red as a background wash.
2. **The Blue Citation Rule**: Blue (`--info`) is reserved for AI-generated content, source citations, data visualization, and informational labels.
3. **The Amber attention Rule**: Yellow (`--warn`) signals attention-needed states: low-confidence entity extraction, pending approvals.
4. **The Emerald Done Rule**: Green (`--success`) indicates completed steps, high confidence, and positive status.
5. **Neutral Dominance**: Neutrals (carbon black `#0b0b0b`, card surface `#171717`, warm gray) make up 85%+ of the visual surface.
6. **No Blank Screens**: Every list has an empty state (icon + CTA on dot-pattern), every async view has skeletons, every failure shows a retry alert.
7. **Single Active Language (supersedes the old "Bilingual Labels" rule, Phase 14)**: Exactly one language is displayed at a time — the one selected in the language toggle. Hardcoded bilingual pairs such as `New Complaint / नई शिकायत` are **forbidden**: they showed Hindi to officers working in Gujarati. Every user-facing string — including `aria-label`, `title`, and `placeholder` — resolves through `t()`; dates and numbers go through `lib/format.ts`; AI-generated content is translated or generated in the active language. No Devanagari or Gujarati literal may appear in a `.tsx` file outside `lib/i18n/`.
8. **Dark Mode Only**: No theme toggle.

---

## 2. Layout & Spacing Rules

### 2.1 Layout Architecture
- **App Shell Grid**: `grid-template-columns: 248px minmax(0, 1fr)` (collapses to vertical layout at 760px).
- **Case Hero**: 2-column layout `1.3fr 0.7fr` (collapses to 1-column at 1080px).
- **Signal Grid**: 4-column layout `repeat(4, 1fr)` (collapses to 2-column at 760px, 1-column at 360px).
- **Work Grid**: 2-column layout `minmax(0, 1fr) minmax(310px, 0.76fr)` (collapses to 1-column at 1080px).
- **Lower Grid**: 2-column layout `minmax(0, 1.1fr) minmax(300px, 0.9fr)` (collapses to 1-column at 1080px).

### 2.2 Border Radius Rules
- **Squircle (`12px`)**: Panels, case-hero, summary card.
- **Squircle-sm (`8px`)**: Buttons, signals, entities, inputs, tabs, badges.
- **Radius-sm (`4px`)**: Small UI details.
- **Radius-pill (`9999px`)**: Avatars/pills only.

### 2.3 Spacing Rules
- Base unit is 8px. Gaps allowed: `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-5` (20px), `--space-6` (24px), `--space-8` (32px), `--space-12` (48px).

---

## 3. Component Style Rules

### 3.1 Sidebar & Topbar
- **Sidebar**: Fixed width `248px` (narrows to `214px` at 1080px). Brand lockup at top, vertical navigation stack, and profile at the bottom.
- **Topbar**: Height `68px`. Contains breadcrumbs, full case search bar (max width `280px`), notifications, and help icons.

### 3.2 Case Hero & Signal Cards
- **Case Hero**: Rounded card showing Case ID, category, complainants, and an AI summary inside a full info-blue bordered block.
- **Signal Cards**: Metric cards showing values (e.g. Case Confidence `86/100`, Extracted Entities `18 fields`). Values animate from 0 on viewport entry.

### 3.3 Buttons
- **Primary**: Red background, white text, `rounded-squircle-sm`. Hover darkens to 90% opacity, active to 80%.
- **Secondary**: Surface bg with soft border (`#241f1b`), hover border transitions to strong border (`#342a24`).
- **Destructive / Danger**: Danger Red (`#ff3b30`) background, used for critical deletions/rejections.

### 3.4 Entity List
- Each entity row: `108px label | value (truncated) | confidence badge`.
- Confidence >= 85% → Green; < 85% and >= 70% → Yellow; < 70% → Amber border around input.

### 3.5 Timeline & Stepper
- **Audit Log / Timeline Connector**: The vertical timeline connection line uses the vertical red-to-blue gradient (`--gradient-accent-info-v`) or solid soft border when inactive.
- **Stepper**: Completed steps connected by lines that can transition via the red-to-blue gradient. Current step marked with glass background and red accent border. Citation buttons styled with Info Blue (`#2d7ee9`) badges.
- **SVG Timeline Charts**: The main graph line uses the horizontal red-to-blue gradient (`--gradient-accent-info-h`) for a glowing, cyber-threat visualization. The filled area underneath uses the gradient graph fill (`--gradient-graph-fill`). Dash grids and hover points are overlayed cleanly.

---

## 4. Motion & Animation Rules

- **Hover Transitions**: Button scale (105%) and card lift (`-translate-y-0.5` + border-glow) transitions set to `--motion-fast` (130ms) with `ease-out`.
- **Toast/Panel Transitions**: Set to `--motion-base` (220ms) or 240ms for slide-ins.
- **Entry Reveal**: Content cards fade and slide up (`translate-y-18px` → `0px`, opacity 0 → 1) using standard standard ease-out curve (`cubic-bezier(0.16, 1, 0.3, 1)`), staggered by 80ms.
- **Count-up**: Signal values animate over 800ms when entering viewport.
- **Reduced Motion**: Mandatory `@media (prefers-reduced-motion: reduce)` block to eliminate scale/glow animations and instant transitions.
