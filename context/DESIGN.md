---
name: eRakshak Crime OS AI Design System (Ferrari Edition)
description: High-tech cyber-command console design system with carbon-black surfaces and high-signal Ferrari Red accents.
colors:
  primary: "#dc0000"
  background: "#0b0b0b"
  sidebar: "#0f0f0f"
  card: "#171717"
  surface-warm: "#23130f"
  surface-elevated: "#1f1f1f"
  foreground: "#fffaf0"
  secondary: "#e8dcc8"
  muted: "#a89f91"
  success: "#0f9d58"
  warn: "#ffd200"
  info: "#2d7ee9"
  danger: "#ff3b30"
  border: "#342a24"
  border-soft: "#241f1b"
typography:
  display:
    fontFamily: "IBM Plex Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.111
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "IBM Plex Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "normal"
  title:
    fontFamily: "IBM Plex Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.428
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "0.025em"
rounded:
  sm: "4px"
  md: "8px"
  squircle-sm: "8px"
  lg: "12px"
  squircle: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.squircle-sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "#c60000"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.squircle-sm}"
    padding: "0 16px"
    height: "40px"
  card-container:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.squircle}"
    padding: "20px"
  input-field:
    backgroundColor: "#241f1b"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "40px"
  ai-content-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.squircle}"
    padding: "20px"
---

# Design System: eRakshak Crime OS AI (Ferrari Edition)

## 1. Overview

**Creative North Star: "The Ferrari Cyber-Command Console"**

eRakshak is styled as a state-of-the-art threat intelligence console rather than a traditional government database form. It balances a high-tech command-center aesthetic with immediate, low-friction task interfaces for law enforcement officers working under time pressure. The canvas is carbon black (`#0b0b0b`), the text is warm off-white (`#fffaf0`), and Ferrari Red (`#dc0000`) is the single high-signal accent.

The system evokes authority, security, precision, and efficiency. It explicitly rejects the three anti-references named in PRODUCT.md: legacy government search forms and cluttered database portals, saturated cream/sand/beige SaaS palettes, and weak flat hierarchies built on low-contrast gray text.

Because officers are in a task rather than reading a page, this is a **product register** system. Type is a fixed rem scale (never fluid clamps), motion is 130–260 ms and conveys state only, and consistency across screens outranks surprise.

**Key Characteristics:**
- **Dark-mode-only environment.** `color-scheme: dark` is declared globally; there is no light theme. The deep carbon canvas keeps glare low and status indicators high.
- **Ferrari Red as scarcity.** Used at most twice per screen, for primary actions and active indicators. Its rarity is the signal.
- **AI transparency.** AI-generated content is partitioned in Info Blue with a Sparkles mark and citations back to the source SOP or legal text.
- **Command density.** Lists, timelines, and action queues are compact and scannable rather than airy.
- **Shell-owned scroll.** The app shell owns the only page-level scroll position; scrollbars are visually suppressed via `.workspace-scroll`.

---

## 2. Colors

A status-first palette tuned for readability under low ambient light. Strategy is **Restrained**: tinted near-black neutrals carry the surface, and saturated color appears only where it means something.

### Primary
- **Ferrari Red** (`#dc0000` / `oklch(52.3% 0.219 29.2)`): Primary action buttons, the active navigation indicator, focus rings, and selection highlight. Capped at two appearances per screen.

### Secondary
- **Info Blue** (`#2d7ee9` / `oklch(60.4% 0.169 255.6)`): Reserved exclusively for AI-generated suggestions, source citations, and data-visualization strokes. Never used for a primary action, so that "blue" reads as "the machine said this."

### Tertiary
- **Secured Emerald** (`#0f9d58` / `oklch(60.2% 0.155 155.9)`): Completed steps, verified items, high-confidence signals.
- **Warning Amber** (`#ffd200` / `oklch(87.4% 0.181 96.2)`): Pending review, low confidence, attention markers.
- **Alert Red** (`#ff3b30` / `oklch(64.5% 0.223 30.1)`): Errors and threat alerts only. Distinct from Ferrari Red by lightness, not hue.

### Neutral
- **Carbon Black Canvas** (`#0b0b0b`): The system background.
- **Sidebar Black** (`#0f0f0f`): Navigation rail and alternate surfaces, one step above the canvas.
- **Surface Card** (`#171717`): Cards, panels, toolbars, and tab strips.
- **Surface Elevated** (`#1f1f1f`): Menus and raised overlays.
- **Surface Warm** (`#23130f`): Summary cards and warm accent surfaces; the only neutral with meaningful red chroma.
- **Primary Warm Text** (`#fffaf0`): Headings and body copy. 18.9:1 on the canvas.
- **Secondary Warm Text** (`#e8dcc8`): Descriptive copy and de-emphasized labels.
- **Muted Gray Ink** (`#a89f91`): Metadata, timestamps, placeholders. 7.5:1 on the canvas and 6.9:1 on card surface, so it clears AA as true body text rather than decoration.
- **Strong Border** (`#342a24`): Card outlines and hover borders.
- **Soft Border** (`#241f1b`): Dividers and input fills.

### Named Rules

**The Twice-Per-Screen Rule.** Ferrari Red appears at most twice on any given screen. Never as a background wash, never as decoration. If a third red element wants to exist, one of the first two was not important.

**The Blue Means Machine Rule.** Info Blue is load-bearing semantics, not a color choice. Every blue-bordered surface is AI-generated and must carry a Sparkles mark plus a citation. Never style a human-authored or raw-evidence surface in blue.

**The Red-Text Floor Rule.** Ferrari Red on carbon black measures 3.8:1. It clears AA for large text (≥18px, or ≥14px bold) and fails it for small body copy. Red text is therefore permitted only at heading scale or bold; for small red status labels, use Alert Red (`#ff3b30`, 5.9:1) instead.

**The Chroma-Toward-Red Rule.** Every tinted neutral leans toward the brand's own hue (borders at hue ~40, warm text at hue ~80). Never tint toward a generic warm beige. Cream, sand, and parchment canvases are prohibited by name.

### Gradients
- **Vertical Red-to-Blue** (`--gradient-accent-info-v`): Timeline connectors, representing flow from ingestion to legal resolution.
- **Horizontal Red-to-Blue** (`--gradient-accent-info-h`): SVG chart strokes and horizontal progress paths.
- **Chart Fill** (`--gradient-graph-fill`): A fade from 15% red to 2% blue, filling the area under chart lines.

Gradients are for **data paths only**. Applying one to text is prohibited.

---

## 3. Typography

**Display / Body Font:** IBM Plex Sans, falling back to Helvetica Neue and Arial
**Label / Mono Font:** IBM Plex Mono, falling back to ui-monospace and Menlo
**Multilingual:** Noto Sans Devanagari (Hindi) and Noto Sans Gujarati (Gujarati)

**Character:** One family carries headings, labels, body, and data. Product UI does not need a display/body pairing, and a second family here would read as noise across dense screens.

**Load reality — read before changing type.** All four families are genuinely bundled through `next/font/google` in `app/layout.tsx`; nothing in the stack is an unbacked declaration. IBM Plex Sans carries Latin UI text and IBM Plex Mono carries labels, IDs, and tabular figures, both exposed as `--font-plex-sans` / `--font-plex-mono` and consumed via `--font-heading`, `--font-body`, and `--font-mono` in `app/globals.css:37-39`. Noto Sans Devanagari and Noto Sans Gujarati sit in the fallback chain for `font-heading` and `font-sans` so Hindi and Gujarati strings render correctly.

Ferrari Sans and SF Mono were the **previous** declared stack and were never bundled — no font files, no import — so the Latin UI silently rendered as Helvetica Neue on macOS and Arial on Windows. Plex replaces them because it is a licensed, self-hostable pair that keeps the technical-instrument register the console needs, and its mono is a true companion to its sans rather than a platform accident. Do not reintroduce a font name here without a matching `next/font` import; a declared-but-absent family is invisible in review and only shows up as shifted metrics on other machines.

**Two scales exist; one is live.** Tailwind's `fontSize` scale (`text-xs` 0.75rem through `text-4xl` 2.25rem, ratio ~1.2) is what components actually use. The `--text-*` custom properties in `globals.css` (12px → 88px) are a legacy parallel scale that no component consumes. **Author against the Tailwind scale.** The `--text-*` variables are slated for removal; do not add new references to them.

### Hierarchy
- **Display** (Bold 700, `2.25rem` / `text-4xl`, tracking `-0.03em`): Page titles. Fixed, never a fluid clamp — a heading that shrinks inside a panel looks worse, not better.
- **Headline** (Semi-Bold 600, `1.125rem` / `text-lg`, line-height 1.333): Card and container headers, via `CardTitle`.
- **Title** (Medium 500, `0.875rem` / `text-sm`): Section headings and grouping labels.
- **Body** (Regular 400, `0.875rem` / `text-sm`, line-height 1.5): The base size, set on `body`. General descriptive copy.
- **Label** (Semi-Bold 600, `0.625rem` / `text-[10px]`, uppercase, tracking `0.025em`, mono): Status badges, audit trails, data tags.

### Named Rules

**The Mono-for-Comparison Rule.** Case numbers, timestamps, IP addresses, account numbers, hashes, and status codes are set in the mono stack. Anything an officer might scan down a column to compare must have fixed-width digits.

**The Fixed-Scale Rule.** Product type does not flex with the viewport. Responsive behavior here is structural — collapse the sidebar, restack the grid, scroll the table — never fluid type.

---

## 4. Elevation

This system is **flat by default and ring-based**. It uses no ambient drop shadows anywhere in the component layer; depth comes from tonal layering (canvas `#0b0b0b` → sidebar `#0f0f0f` → card `#171717` → elevated `#1f1f1f`) and from 1px outlines. What the codebase calls a "glow" is in fact a **hairline colored ring**, not a blur.

### Shadow Vocabulary
- **Ring** (`box-shadow: 0 0 0 1px var(--border)`): The default outline for a resting surface.
- **Colored Rings** (`.glow-primary` / `.glow-success` / `.glow-warning` / `.glow-destructive` / `.glow-info`, each `box-shadow: 0 0 0 1px color-mix(in oklab, <token> 35%, transparent)`): Semantic outlines marking a surface as active, verified, pending, failed, or AI-generated.
- **Focus Ring** (`--focus-ring: 0 0 0 4px rgba(220, 0, 0, 0.30)`): The token for keyboard focus. Components currently express this via Tailwind's `ring-2` + `ring-offset` utilities rather than consuming the variable directly; both render red.
- **Raised** (`--elev-raised: 0 26px 80px rgba(0, 0, 0, 0.48)`): Defined for full-screen overlays. Used sparingly; a card must never take it.
- **Pulse Glow** (`animate-pulse-glow`, a 12px→28px red blur): The one true blurred shadow, reserved for live/breathing status indicators.

### Named Rules

**The Flat-at-Rest Rule.** Surfaces are flat when idle. Color and outline respond to state — hover, active, focus, AI-authored, threat — and to nothing else. If a card is glowing for decoration, delete the glow.

**The 2014 Test.** If a surface looks like a 2014 app, the shadow is too dark and the blur is too small. This system's answer is to use no shadow at all and shift the border instead.

---

## 5. Components

Every interactive component ships all seven states: default, hover, focus-visible, active, disabled, loading, error. Half a set is not a component.

### Buttons
- **Shape:** Squircle-sm (`8px` radius), height `40px` default, `32px` small, `48px` large.
- **Primary:** Ferrari Red fill, white text. Hover darkens to 90% opacity, active to 80%. **No scale transform and no glow** — the color shift is the whole feedback.
- **Secondary:** Transparent fill with a 60%-opacity red border; hover raises the border to 80% and washes the fill to `primary/10`.
- **Ghost:** Transparent with muted text; hover tints `primary/10` and lifts text to full foreground.
- **Outline:** Neutral border on transparent, for low-emphasis actions in dense toolbars.
- **Destructive:** Solid Alert Red. Reserved for deletion and rejection, always behind a confirmation.
- **Focus:** 2px red ring offset 2px from the background.
- **Loading:** A spinning SVG replaces nothing — it prepends to the label, and the button self-disables.

### Cards / Containers
- **Corner Style:** Squircle (`12px`).
- **Background:** Surface Card (`#171717`) with an 80%-opacity strong border.
- **Internal Padding:** `20px`.
- **Accent variants:** `primary` / `success` / `warning` / `destructive` each apply a 30%-opacity border of that hue plus a 3%-opacity fill wash.
- **Interactive State:** Opt-in via `hover`, which transitions **border-color only** over 200 ms. Cards do not lift and do not glow on hover.
- **Footer:** Separated by a 30%-opacity top border with `16px` of padding above.

### Inputs / Fields
- **Style:** Soft-border fill (`#241f1b`), `12px` radius, `40px` tall.
- **Focus:** 2px red ring with a 1px offset.
- **Error / Success:** Border shifts to 60%-opacity Alert Red or Emerald, and the focus ring follows the same hue.
- **Disabled:** 50% opacity, muted fill, `not-allowed` cursor.
- **Placeholder:** Muted Gray Ink, which clears 4.5:1 — never a lighter gray.

### Navigation
- Persistent left rail on the sidebar surface (`#0f0f0f`), with the active route marked in Ferrari Red. Nav labels carry Hindi/Gujarati helper text per PRODUCT.md's bilingual requirement.

### AI Content Card (signature)
The system's most important component. It wraps every AI suggestion, prediction, or drafted legal request.

- **Border:** A **full 1px Info Blue border at 30% opacity** over a 4%-opacity blue fill. Hover raises the border to 50%.
- **Mark:** A 16px Sparkles glyph in Info Blue, paired with an "AI-Suggested" badge in the same hue.
- **Citation:** Source SOP or legal section text is reachable inline or via `CitationDialog`.
- **Explicitly not a left stripe.** Earlier revisions of this document specified a 2px blue left border. That is a side-stripe accent and is prohibited; the shipped component correctly uses a full border, and it stays that way.

### Status Badge (signature)
Maps a raw status string to the semantic palette, set in uppercase mono at `10px`.
- Emerald: `done`, `responded`, `approved`, `synced`, `secure`
- Amber + pulsing dot: `processing`, `awaiting`, `awaiting_response`
- Info Blue + **pulsing** dot: `running`, `active_analysis`, `uploaded` — work a background task is doing *right now*
- Info Blue + **static** dot: `dispatched`, `in_progress` — underway but not observably ticking
- Alert Red: `failed`, `rejected`, `threat`
- Neutral: anything unrecognized, including `queued`, `pending`, and `draft`

**The Badge-Owns-The-Pulse Rule.** A polling surface gets its "still alive" signal from this component and nowhere else. A card that renders `StatusBadge` must not also add its own `animate-ping` wrapper, an `animate-pulse` on a decorative icon, or a `Loader2` spinner — those stack into three or four competing loops that report the same single fact. Add a status string to the pulsing bucket above instead of animating the container.

### Loading & Empty States
- **Skeletons, not spinners,** for content regions: `animate-skeleton` sweeps a 1.5 s gradient between `#171717` and `#23130f`. Spinners are permitted only inside a button.
- **Empty states teach the interface.** State what the surface will hold and give the action that fills it. "No results" alone is a failure.

---

## 6. Do's and Don'ts

### Do:
- **Do** wrap every AI recommendation, prediction, or drafted request in `AiContentCard` with its Sparkles mark and a citation to the source SOP or legal section.
- **Do** set every case number, timestamp, account detail, and status code in the mono stack so columns compare cleanly.
- **Do** keep Ferrari Red to two appearances per screen, and reach for Alert Red (`#ff3b30`) when a small red label needs to clear 4.5:1.
- **Do** author type against the Tailwind scale (`text-xs` … `text-4xl`), not the legacy `--text-*` variables.
- **Do** give every interactive element all seven states, and pair every animation with a `prefers-reduced-motion` fallback — the global reduce block in `globals.css` is the safety net, not a substitute for designing the reduced case.
- **Do** use skeletons for content loading and spinners only inside buttons.
- **Do** keep transitions in the 130–260 ms band on `transform` and `opacity`, using `cubic-bezier(0.16, 1, 0.3, 1)`.

### Don't:
- **Don't** use red as a background wash or a decorative highlight.
- **Don't** use gradient text under any circumstances. Gradients belong on data paths — timeline connectors, chart strokes, progress lines — and nowhere else.
- **Don't** use warm, sand-, cream-, or beige-colored backgrounds as a canvas. This is a named anti-reference in PRODUCT.md and applies to every surface.
- **Don't** build anything that reads like a legacy government search form or a cluttered database portal — the other named anti-reference.
- **Don't** ship low-contrast gray body text. Muted Gray Ink (`#a89f91`) is the floor, not a starting point to lighten from.
- **Don't** use `border-left` or `border-right` above 1px as a colored accent stripe on any card, list item, callout, or alert.
- **Don't** add drop shadows. Shift the border or apply a semantic ring instead.
- **Don't** apply Info Blue to anything a human authored, and don't ship an AI surface without a citation.
- **Don't** scale or lift components on hover. This system's hover vocabulary is color and border, not geometry.
- **Don't** use fluid `clamp()` type. Responsiveness here is structural.
- **Don't** reach for a modal first. Exhaust inline and progressive alternatives; modals in an investigation flow interrupt the officer's task.
- **Don't** introduce a second typeface, and don't set UI labels or data in a display face.
