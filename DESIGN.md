---
name: Crime OS AI Design System
description: High-tech cyber-command console design system with glow accents and glassmorphism.
colors:
  primary: "#3B82F6"
  background: "#0B0F19"
  card: "#1A1F2C"
  secondary: "#212836"
  success: "#10B981"
  accent: "#F59E0B"
  accent-foreground: "#2D1602"
  destructive: "#EF4444"
  muted-bg: "#161C2A"
  muted-foreground: "#94A3B8"
typography:
  display:
    fontFamily: "Space Grotesk, Noto Sans Devanagari, Noto Sans Gujarati, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, Noto Sans Devanagari, Noto Sans Gujarati, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "#1D4ED8"
  card-container:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: Crime OS AI

## 1. Overview

**Creative North Star: "The Cyber-Command Console"**

Crime OS AI is styled as a state-of-the-art threat intelligence console rather than a traditional government database form. It balances high-tech cyber-command aesthetics with immediate, low-friction task interfaces suitable for law enforcement officers in high-pressure situations. The layout utilizes dark, deeply saturated navy blue backgrounds, clean borders, glass headers, and neon status indicators to present information command-center style.

The design aims to evoke feelings of authority, security, precision, and efficiency. It strictly avoids flat gray lists or generic bright SaaS designs.

**Key Characteristics:**
- **Dark-Mode-First Environment**: Deploys a deep navy/slate canvas (`#0B0F19`) to keep screen glare low and command indicators high.
- **AI Transparency & Grounding**: Visually partitions AI-generated content with electric-blue borders, sparkle indicators, and popovers revealing source SOP texts.
- **Command Density**: High information density presenting lists, timelines, and action items in a compact, scannable format.

---

## 2. Colors

The color palette is built for status readability under low ambient light.

### Primary
- **Electric Command Blue** (`#3B82F6`): Used for primary action buttons, active navigation states, interactive links, and AI-suggested containers.

### Secondary
- **Raised Slate** (`#212836`): Used for inputs, secondary action buttons, table rows, and secondary layout containers.

### Neutral
- **Midnight Canvas** (`#0B0F19`): Main system background.
- **Command Card** (`#1A1F2C`): Main surface background for cards and tabs.
- **Border White/10** (`rgba(255,255,255,0.1)`): Standard divider and card outline.
- **Slate Gray Ink** (`#94A3B8`): Muted secondary body text and metadata labels.

### Semantic Accents
- **Secured Emerald** (`#10B981`): Indicates completed steps, verified items, active security status, and mock API approvals.
- **Warning Amber** (`#F59E0B`): Highlights processing states, low-confidence extractions, and sections needing review.
- **Alert Red** (`#EF4444`): Highlights system threats, errors, deletion prompts, and suspicious transaction highlights.

**The One Voice Rule.** The primary Electric Command Blue is used on ≤10% of any given screen. Its rarity is key to drawing focus.
**The Amber Border Rule.** Low-confidence extracted entities (<70% score) must get a Warning Amber border to pull the officer's attention.

---

## 3. Typography

**Display Font:** Space Grotesk (with Noto Sans Devanagari and Noto Sans Gujarati fallback)
**Body Font:** Inter (with Noto Sans Devanagari and Noto Sans Gujarati fallback)
**Label/Mono Font:** JetBrains Mono

Space Grotesk provides a geometric, high-tech structure for primary headings, while Inter handles body text and forms with neutral density. JetBrains Mono is used for case numbers, timestamps, account numbers, and status codes.

### Hierarchy
- **Display** (Bold, `clamp(2rem, 5vw, 3.5rem)`, Line height `1.2`): Page titles and hero headers.
- **Headline** (Semi-Bold, `text-lg` (18px), Line height `1.4`): Main card and container headers.
- **Title** (Medium, `text-sm` (14px), Line height `1.4`): Section headings.
- **Body** (Regular, `text-sm` (14px), Line height `1.5`): General descriptive text. Line length is capped at `75ch` to preserve readability.
- **Label** (Medium, `text-xs` (12px), Letter-spacing `0.05em`): Badges, statuses, audit trails, and data tags.

**The Case Number Rule.** All database keys, case reference numbers, phone numbers, and bank account numbers must render in `JetBrains Mono` for maximum optical spacing and comparison.

---

## 4. Elevation

The console uses flat, border-outlined structures at rest, relying on glow primitives and backdrop blur overrides rather than soft ambient shadows.

**The Glow-on-Demand Rule.** Surfaces are flat by default and avoid standard drop shadows. Glow effects (`glow-primary` / `glow-success` / `glow-destructive`) appear only on hover/active states, or as permanent indicators on AI-generated or high-threat elements.

### Elevation Vocabulary
- **Interactive Hover Glow** (`box-shadow: 0 0 20px -4px rgba(59, 130, 246, 0.5)`): Appears on button scales and interactive cards.
- **Glass Shell** (`backdrop-filter: blur(12px)` + `rgba(26, 31, 44, 0.7)` + `1px white/10` border): Used for sticky top headers and overlays.

---

## 5. Components

### Buttons
- **Shape:** Soft-cornered rectangles (`8px` radius).
- **Primary:** Electric Command Blue background with white text. Scales up by `1.05` and applies a primary glow on hover.
- **Secondary:** Transparent background with a `1px` Electric Blue border. Fills with `rgba(59, 130, 246, 0.1)` on hover.
- **Destructive:** Solid Alert Red background. Used strictly for deletions or rejections, protected by confirmation alerts.

### Cards / Containers
- **Corner Style:** Rounded corners (`12px` radius).
- **Background:** Command Card (`#1A1F2C`) with a subtle `1px` border (`rgba(255, 255, 255, 0.1)`).
- **Interactive States:** Lifted slightly (`-translate-y-0.5`) with a primary border glow on hover.
- **AI Suggested Cards:** Wrapped with an Electric Blue left border (`2px`) and a subtle blue background tint.

### Inputs / Fields
- **Style:** Dark slate background (`#212836`) with a `1px` border. Text renders in high contrast.
- **Focus:** Border shifts to Electric Blue with an active ring glow.

### Navigation
- **Sidebar Nav:** Fixed vertical panel (`256px` wide) on a dark command card surface. Active routes show an Electric Blue background bar and high-contrast text.

---

## 6. Do's and Don'ts

### Do:
- **Do** wrap every AI recommendation or prediction in an `AiContentCard` with an explicit Sparkle badge and legal section citations.
- **Do** format all dates, account details, and numeric markers in `JetBrains Mono` for optimal comparison.
- **Do** check text contrast ratios on midnight backdrops to ensure body text remains fully white or high-contrast slate.
- **Do** use soft, pulsing animations on loading states and live timelines.

### Don't:
- **Don't** use side-stripe borders (e.g. `border-left-width` > 1px) on non-AI cards or general alerts.
- **Don't** use gradient text under any circumstances.
- **Don't** use warm, sand-colored, or beige backgrounds (avoid all warm-tinted neutral variables like `--paper` or `--linen`).
- **Don't** deploy tiny, tracked all-caps kicker eyebrows above headers.
- **Don't** use sketchy or hand-drawn SVG illustrations; keep graphics clean, line-based, and modern.
