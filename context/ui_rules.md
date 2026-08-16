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

### 2.2 Border Radius Rules & Concentricity
- **Squircle (`12px` / `--radius-squircle`)**: Outer surface containers, panels, dialogs, main cards, and `AiContentCard`.
- **Squircle-sm (`8px` / `--radius-squircle-sm`)**: Inner elements, buttons, input fields, child preview blocks, and table containers.
- **Radius-sm (`4px` / `--radius-sm`)**: Smallest data badges, tags, and micro-chips.
- **Radius-pill (`9999px`)**: Status dots, avatars, and floating pill chips only.
- **The Concentric Radius Rule (Anti-Slop)**: When a container with rounded corners contains child elements with borders/fills, the inner radius MUST be strictly smaller than the outer container radius (`R_inner <= R_outer - padding`). A squared or unrounded child box inside a 12px squircle outer card produces an amateur "AI slop" appearance and is strictly forbidden.

### 2.3 Spacing & Padding Rules
- Base unit is 4px/8px. Standard paddings:
  - **Outer Page Containers**: `p-6 lg:p-8`
  - **Major Cards & Panels**: `p-5` (never `p-8` or `p-10` for routine containers)
  - **Compact Cards & Inner Sections**: `p-3.5` or `p-4`
  - **Table Cells & List Rows**: `px-4 py-3`
  - **Controls & Input Fields**: `h-9 px-3 py-1.5` or `h-10 px-3.5`
- Gaps allowed: `gap-1.5` (6px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-5` (20px), `gap-6` (24px).

### 2.4 Column Sizing & Balanced Grids
- **No Over-Crammed Micro-Grids**: Never use `grid-cols-6`, `grid-cols-8`, or more than 4 columns for interactive content cards (e.g. gang structures or criminal network cards). Cards must have a minimum width of `160px` to prevent typography truncation and cluttered badges.
- **Master-Detail Workspace Proportions**:
  - Dense tabular data (e.g. Repeat Offenders registry): `lg:col-span-8` table vs `lg:col-span-4` inspector.
  - Multi-item selectors (e.g. Provider Responses, Version Summaries): `lg:col-span-4` rail vs `lg:col-span-8` content pane.
  - Media + Inspector (e.g. Video Evidence): `lg:col-span-7` player vs `lg:col-span-5` forensic report & timeline.
- **Prose Measure Constraint**: Longform AI text, summaries, and legal descriptions must maintain a readable line length (`max-w-[70ch]`), preventing single-line paragraphs from stretching across wide monitors.

### 2.5 Scrollbox & Card Height Hygiene
- **No Nested Scrollboxes Inside Cards Inside Rails**: Avoid embedding `max-h-24 overflow-y-auto` scrollboxes inside already scrollable sidebars (such as Legal Grounding). Use clear progressive disclosure (collapsible accordions or modals) instead of miniature scroll panes.
- **Compact Readiness & Action Cards**: Multi-step lists (e.g. Legal Request drafts) must default to scannable summary rows with expandable drawer/dialog details rather than rendering 600px tall expanded blocks for every item.

---

## 3. Component Style Rules

### 3.1 Sidebar & Topbar
- **Sidebar**: Fixed width `248px` (narrows to `214px` at 1080px). Brand lockup at top, vertical navigation stack, and profile at the bottom.
- **Topbar**: Height `64px` (h-16). Contains breadcrumbs, full case search bar (max width `280px`), language selector, notifications popover, and profile menu.

### 3.2 Case Hero & Signal Cards
- **Case Hero**: Standardized header showing Case ID, category, timestamps, and status badge without redundant hero wrapper boxes.
- **Signal Cards & Metrics**: Always consume the standardized `MetricStrip` and `Metric` primitives (`border-border/80 bg-border/60` with `gap-px` layout). Custom floating KPI boxes with hover transforms are strictly prohibited.

### 3.3 Buttons
- **Primary**: Ferrari Red (`#dc0000`) background, white text, `rounded-squircle-sm`. Hover darkens to 90% opacity, active to 80%. No geometric scaling or glow.
- **Secondary**: Surface bg (`#171717`) with soft border (`#241f1b`), hover border transitions to strong border (`#342a24`).
- **Destructive / Danger**: Danger Red (`#ff3b30`) background, used for critical deletions/rejections.

### 3.4 AI Content Surfaces
- **Single Source of Truth (`AiContentCard`)**: All machine-generated content, legal suggestions, and AI summaries MUST be wrapped in `AiContentCard` (or standard `border-info/30 bg-info/[0.04]` squircle styling).
- **No Raw `#000` / `#0c0c0c`**: Surfaces must use design tokens (`bg-background` `#0b0b0b`, `bg-card` `#171717`, `bg-surface-alt` `#0f0f0f`), never arbitrary pure-black fills.
- **Clean Text Blocks**: AI-generated text inside `AiContentCard` renders via `TranslatedTextBlock` directly within the tinted container without unnecessary extra nested borders or square background patches.

### 3.5 Entity List
- Each entity row: `108px label | value (truncated) | confidence badge`.
- Confidence >= 85% → Green; < 85% and >= 70% → Yellow; < 70% → Amber border around input.

### 3.6 Timeline & Stepper
- **Audit Log / Timeline Connector**: The vertical timeline connection line uses the vertical red-to-blue gradient (`--gradient-accent-info-v`) or solid soft border when inactive.
- **Stepper**: Completed steps connected by lines that can transition via the red-to-blue gradient. Current step marked with glass background and red accent border. Citation buttons styled with Info Blue (`#2d7ee9`) badges.
- **SVG Timeline Charts**: The main graph line uses the horizontal red-to-blue gradient (`--gradient-accent-info-h`) for a glowing, cyber-threat visualization. The filled area underneath uses the gradient graph fill (`--gradient-graph-fill`). Dash grids and hover points are overlayed cleanly.

### 3.7 Progress & Live Polling Surfaces (Phase 24)
- **Progress bars are `role="progressbar"`**: a determinate bar carries `aria-valuenow` / `aria-valuemin` / `aria-valuemax` and an `aria-label`. A bare `<div>` whose width changes is invisible to a screen reader. Clamp the value (`Math.min(100, Math.max(0, …))`) so a bad payload cannot paint past the track.
- **The Live Caption Rule**: text that a polling interval rewrites in place sits in an `aria-live="polite"` region. Without it, a card that visibly advances for two minutes announces nothing.
- **Progress width transitions use `--motion-base` (220ms)**: the only documented timings are 130ms (hover/border), 220ms (panel/state), and 800ms (signal count-up). A bar is a state change, not a count-up.
- **Track fill is `bg-muted`**: the same `#241f1b` recess inputs use. Never `bg-background` — punching the page canvas through an elevated card reads as a hole, not a track.
- **No Sub-Panel For A Label And A Bar**: a bordered, tinted box wrapping nothing but a caption, a percentage, and a progress bar is a nested card. Set those three directly on the parent surface.
- **Step state comes from real backend checkpoints**: rows in a pipeline/telemetry list must be keyed to progress values the backend actually commits. Invented thresholds put the RUNNING marker on a row that contradicts the phase caption — misleading state, the most serious class of UI defect here. Model each row as the band that *ends* at its threshold so exactly one row can ever be running.

---

## 4. Typography & Contrast Rules

- **The Mono-Is-For-Data Rule**: `font-mono` is for case numbers, timestamps, hashes, IDs, percentages, and status codes — things an officer scans down a column to compare. **Prose is never mono.** A localized English sentence set in IBM Plex Mono is a costume, and it breaks outright in Hindi and Gujarati: Plex Mono has no Devanagari or Gujarati coverage, so a mono sentence falls back mid-string. `globals.css` states the intent — "identifiers stay in IBM Plex Mono in every language."
- **Only Documented Type Steps**: author against the Tailwind scale (`text-xs` … `text-4xl`) plus the `text-[10px]` label step. Arbitrary values such as `text-[11px]` and `text-[13px]` are forbidden; the design hook flags them.
- **No Viewport-Flexing Type** (Fixed-Scale Rule): `text-xl md:text-2xl` and `clamp()` are forbidden. Responsiveness here is structural — restack, collapse, scroll. A heading that shrinks inside a panel looks worse, not better.
- **Never Dim Body Text With Opacity**: `opacity-60` on a row, or `text-muted-foreground/60`, drops below the `#a89f91` contrast floor. De-emphasize a row by its **border and surface tone plus its status badge**, and keep the label at full `text-foreground`. (Phase 22 already established this for read-state alerts; it applies everywhere.)
- **Verify Tailwind Steps Exist**: `h-4.5` / `w-4.5` are not in the scale and this project does not extend it, so they compile to nothing and the icon silently renders at its natural size. Use `h-4 w-4` or `h-3.5 w-3.5`.

---

## 5. Motion & Animation Rules

- **Hover Transitions**: Button color shift and border transitions set to `--motion-fast` (130ms) with `ease-out`. **No scale transform (`scale-105`) and no card lift (`-translate-y-0.5`)** on idle or hover states (Flat-at-Rest rule).
- **Toast/Panel Transitions**: Set to `--motion-base` (220ms) or 240ms for slide-ins.
- **Entry Reveal**: Content cards fade and slide up (`translate-y-18px` → `0px`, opacity 0 → 1) using standard ease-out curve (`cubic-bezier(0.16, 1, 0.3, 1)`), staggered by 80ms.
- **Count-up**: Signal values animate over 800ms when entering viewport.
- **One Live Loop Per Surface (Phase 24)**: a card may carry exactly **one** looping animation, and it must report state. The live signal belongs to `StatusBadge`'s pulsing dot (`animate-ping-slow`, 2s) — a card that renders it must not also pulse a decorative `Sparkles`/`Activity` icon or wrap its own `animate-ping` ring. Four loops saying "still working" is noise, not feedback.
- **Never `animate-ping`**: use the project's `animate-ping-slow` (2s). Tailwind's default `animate-ping` (1s) is too aggressive for a console an officer watches for minutes.
- **Spinners Only Inside Buttons**: `Loader2` is permitted in a button that is submitting. A spinner in a status chip, a list row, or a card header is forbidden — use a `StatusBadge` pulsing dot for a live row and `animate-skeleton` for a loading content region.
- **Icons Are Drawn, Never Typed**: no Unicode glyphs or emoji (`⏱️`, `📦`, `✅`) standing in for an icon. `lucide-react` is already a dependency; every icon comes from it at a consistent stroke and size, with `aria-hidden="true"` when a text label sits beside it.
- **Reduced Motion**: Mandatory `@media (prefers-reduced-motion: reduce)` block to eliminate animations and enforce instant transitions.

