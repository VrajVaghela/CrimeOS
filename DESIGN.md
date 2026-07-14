---
name: Crime OS AI Design System (Ferrari Edition)
description: High-tech cyber-command console design system with carbon-black surfaces and high-signal Ferrari Red accents.
colors:
  primary: "#dc0000"
  background: "#0b0b0b"
  card: "#171717"
  surface-warm: "#23130f"
  foreground: "#fffaf0"
  secondary: "#e8dcc8"
  success: "#0f9d58"
  warn: "#ffd200"
  info: "#2d7ee9"
  danger: "#ff3b30"
  border: "#342a24"
  border-soft: "#241f1b"
typography:
  display:
    fontFamily: "Ferrari Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Ferrari Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
  lg: "14px"
  squircle: "12px"
  squircle-sm: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.squircle-sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "#c00000"
  card-container:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.squircle}"
    padding: "20px"
---

# Design System: Crime OS AI (Ferrari Edition)

## 1. Overview

**Creative North Star: "The Ferrari Cyber-Command Console"**

Crime OS AI is styled as a state-of-the-art threat intelligence console rather than a traditional government database form. It balances high-tech cyber-command aesthetics with immediate, low-friction task interfaces suitable for law enforcement officers in high-pressure situations. The layout utilizes carbon-black backgrounds (`#0b0b0b`), warm off-white text (`#fffaf0`), and Ferrari Red (`#dc0000`) as the single high-signal accent to present information command-center style.

The design aims to evoke feelings of authority, security, precision, and efficiency. It strictly avoids flat gray lists or generic bright SaaS designs.

**Key Characteristics:**
- **Dark-Mode-First Environment**: Deploys a deep carbon-black canvas (`#0b0b0b`) to keep screen glare low and command indicators high.
- **Ferrari Red Accent**: Used sparingly (at most twice per screen) for high-signal moments (primary CTAs and active indicators).
- **AI Transparency & Grounding**: Visually partitions AI-generated content with electric-blue borders, sparkle indicators, and popovers revealing source SOP texts.
- **Command Density**: High information density presenting lists, timelines, and action items in a compact, scannable format.

---

## 2. Colors

The color palette is built for status readability under low ambient light.

### Primary Accent
- **Ferrari Red** (`#dc0000` / `oklch(45% 0.18 30)`): Used at most twice per screen for primary action buttons, active indicators, and brand highlights.

### Semantic Accents
- **Secured Emerald** (`#0f9d58` / `oklch(55% 0.15 150)`): Indicates completed steps, verified items, and high confidence.
- **Warning Amber / Meta** (`#ffd200` / `oklch(85% 0.15 90)`): Highlights pending reviews, low confidence, and attention signals.
- **Info Blue** (`#2d7ee9` / `oklch(50% 0.12 240)`): Reserved for AI-generated content, source citations, and data viz.
- **Alert Red** (`#ff3b30` / `oklch(55% 0.18 30)`): Used strictly for errors and threat alerts.

### Neutral Colors
- **Carbon Black Canvas** (`#0b0b0b` / `oklch(4% 0.01 30)`): Main system background.
- **Surface Card** (`#171717` / `oklch(10% 0.01 30)`): Main surface background for cards and tabs.
- **Surface Warm** (`#23130f` / `oklch(9% 0.03 30)`): Used for summary cards and warm accent surfaces.
- **Primary Warm Text** (`#fffaf0` / `oklch(98% 0.01 80)`): High contrast primary body text and headings.
- **Secondary Warm Text** (`#e8dcc8` / `oklch(88% 0.02 80)`): Secondary text and descriptive copy.
- **Muted Gray Ink** (`#a89f91` / `oklch(65% 0.02 70)`): Labels, metadata, and placeholders.
- **Strong Border** (`#342a24` / `oklch(18% 0.02 40)`): Strong borders and hover outlines.
- **Soft Border** (`#241f1b` / `oklch(13% 0.02 40)`): Default subtle dividers.

**The Accent Red Rule.** Ferrari Red (`--accent`) is used at most twice per screen. Never use red as a background wash.
**The Blue Citation Rule.** All AI-generated suggestions and citations use `--info` (electric blue) to differentiate AI predictions from raw factual evidence.

### Gradients
- **Vertical Red-to-Blue Gradient** (`--gradient-accent-info-v`): Used for vertical lines, such as timeline connectors, representing flow from ingestion to legal resolution.
- **Horizontal Red-to-Blue Gradient** (`--gradient-accent-info-h`): Used for data-visualization paths, SVG charts, and horizontal progress paths.
- **Chart Fill Gradient** (`--gradient-graph-fill`): Subtle fade background fill for areas below SVG chart lines.

---

## 3. Typography

**Display Font:** Ferrari Sans (with Helvetica Neue, Arial fallback)
**Body Font:** Ferrari Sans (with Helvetica Neue, Arial fallback)
**Label/Mono Font:** SF Mono (with ui-monospace, Menlo fallback)

Ferrari Sans provides a geometric, high-tech structure for primary headings and UI elements, while SF Mono handles case numbers, timestamps, account numbers, and status codes.

### Hierarchy
- **Display** (Bold, `clamp(2rem, 5vw, 3.5rem)`, Line height `0.98`, Letter-spacing `-0.03em`): Page titles and hero headers.
- **Headline** (Semi-Bold, `text-lg` (18px), Line height `1.4`): Main card and container headers.
- **Title** (Medium, `text-sm` (14px), Line height `1.4`): Section headings.
- **Body** (Regular, `text-sm` (14px), Line height `1.5`): General descriptive text.
- **Label** (Medium, `text-xs` (12px), Letter-spacing `0.08em` for buttons, `0.06em` to `0.13em` for all-caps labels): Badges, statuses, audit trails, and data tags.

---

## 4. Elevation & Glass

The console uses flat, border-outlined structures at rest, relying on glow primitives and backdrop blur overrides rather than soft ambient shadows.

**The Glow-on-Demand Rule.** Surfaces are flat by default. Glow effects (`glow-primary` / `glow-success` / `glow-destructive`) appear only on hover/active states, or as permanent indicators on AI-generated or high-threat elements.

### Elevation Vocabulary
- **Interactive Hover Glow** (`box-shadow: 0 0 20px -4px rgba(220, 0, 0, 0.3)`): Appears on button scales and interactive cards.
- **Glass Shell** (`backdrop-filter: blur(12px)` + `color-mix(in oklch, var(--surface) 55%, transparent)` + `color-mix(in oklch, var(--accent) 30%, transparent)` border): Used for sticky top headers and overlays.

---

## 5. Components

### Buttons
- **Shape:** Squircle-sm (`8px` radius).
- **Primary:** Ferrari Red background with white text. Scales up by `1.05` and applies a red glow on hover.
- **Secondary:** Surface bg with soft border.
- **Destructive:** Solid Danger Red background. Used strictly for deletions or rejections, protected by confirmation alerts.

### Cards / Containers
- **Corner Style:** Squircle (`12px` radius).
- **Background:** Surface Card (`#171717`) with soft border (`#241f1b`).
- **Interactive States:** Lifted slightly (`-translate-y-0.5`) with a primary border glow on hover.
- **AI Suggested Cards:** Wrapped with an Info Blue left border (`2px`) and a subtle blue background tint.

### Inputs / Fields
- **Style:** Dark surface background with soft border.
- **Focus:** Border shifts to Ferrari Red with a focus ring (`0 0 0 4px rgba(220, 0, 0, 0.3)`).

---

## 6. Do's and Don'ts

### Do:
- **Do** wrap every AI recommendation or prediction in an `AiContentCard` with an explicit Sparkle badge and legal section citations using Info Blue elements.
- **Do** format all dates, account details, and numeric markers in `SF Mono` for optimal comparison.
- **Do** check text contrast ratios on carbon-black backdrops to ensure body text remains fully white/off-white.
- **Do** use soft, pulsing animations on loading states and live timelines.

### Don't:
- **Don't** use red as a background wash or decorative highlight.
- **Don't** use gradient text under any circumstances.
- **Don't** use warm, sand-colored, or beige backgrounds as a canvas.
- **Don't** use standard drop shadows; use border rings or hover-glows.
