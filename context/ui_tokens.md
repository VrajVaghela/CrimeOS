# UI Tokens — Crime OS AI

Theme intent: **high-tech, secure, trustworthy — cyber-command aesthetic**. Dark-mode-first UI (standard for cyber/security tech) with high-contrast glowing accents, grid/node motifs, and glassmorphism on cards. The app must feel like a modern threat-intelligence platform, not a legacy government form. Defined as CSS variables in `globals.css` consumed by Tailwind/shadcn — components must reference tokens, never raw hex.

## Colors (dark is the default `:root`, HSL, shadcn variable convention)
```css
:root {
  /* Deep Midnight Blue #0B0F19 */
  --background: 223 39% 7%;
  --foreground: 0 0% 100%;            /* white primary text */

  /* Dark Slate surface #1A1F2C */
  --card: 223 26% 14%;
  --card-foreground: 0 0% 100%;

  /* Electric Blue #3B82F6 — primary buttons, active states, links */
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;

  --secondary: 223 26% 18%;            /* raised slate for secondary buttons/rows */
  --secondary-foreground: 0 0% 100%;

  /* Emerald Green #10B981 — secure/done/success indicators, charts */
  --success: 160 84% 39%;
  --success-foreground: 0 0% 100%;

  /* Amber — pending/attention/AI-generated markers (kept from domain needs) */
  --accent: 38 92% 55%;
  --accent-foreground: 26 83% 14%;

  /* Alert Red #EF4444 — threats, rejections, failures. Use sparingly. */
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;

  --muted: 223 26% 12%;
  --muted-foreground: 215 20% 65%;     /* Slate Gray #94A3B8 — subtitles, body-secondary */

  --border: 0 0% 100% / 0.1;           /* subtle white borders rgba(255,255,255,0.1) */
  --input: 223 26% 18%;
  --ring: 217 91% 60%;
  --radius: 0.75rem;                    /* 12px cards; 8px (rounded-lg) for buttons/inputs */
}
```
Light mode: NOT supported. The app is dark-only — remove the theme toggle; `.dark` class is permanently on `<html>`.

## Glow & Glass primitives (define as Tailwind utilities in globals.css)
```css
.glow-primary   { box-shadow: 0 0 20px -4px hsl(217 91% 60% / 0.5); }   /* hover on primary buttons/cards */
.glow-success   { box-shadow: 0 0 16px -4px hsl(160 84% 39% / 0.5); }
.glow-destructive { box-shadow: 0 0 16px -4px hsl(0 84% 60% / 0.5); }   /* threat visualizations only */
.glass          { background: hsl(223 26% 14% / 0.7); backdrop-filter: blur(12px);
                  border: 1px solid hsl(0 0% 100% / 0.1); }              /* sticky headers, overlay cards */
.grid-bg        { background-image: linear-gradient(hsl(0 0% 100% / 0.04) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(0 0% 100% / 0.04) 1px, transparent 1px);
                  background-size: 40px 40px; }                          /* hero/section backdrops */
```

## Semantic status colors (badges, timelines, steppers)
| Status | Token |
|---|---|
| draft / pending | `muted` bg, `muted-foreground` text |
| processing / awaiting response | `accent` (amber) + pulse animation |
| dispatched / in_progress | `primary` (electric blue) |
| done / responded / approved / secure | `success` (emerald) |
| failed / rejected / threat | `destructive` (red, sparingly) |
| AI-generated content marker | `primary` left-border glow + sparkle icon |

## Typography
- **Headings:** `Space Grotesk` (700/800) via `next/font` — tech-forward geometric sans.
- **Body:** `Inter` (400/500).
- **Code/Data:** `JetBrains Mono` — case numbers, phone numbers, account numbers, section codes, log output.
- **Indic scripts:** keep `Noto Sans Devanagari` + `Noto Sans Gujarati` in the fallback chain of BOTH heading and body fonts — Gujarati/Hindi must never render as tofu.
- Scale (Tailwind classes only):
  - `text-3xl md:text-4xl font-bold font-heading` — page/hero titles (Space Grotesk)
  - `text-lg font-semibold font-heading` — card/section titles
  - `text-sm` — body default (dense, data-heavy app); secondary copy `text-muted-foreground`
  - `text-xs text-muted-foreground` — metadata, timestamps, confidence scores
  - `font-mono text-sm` — all identifiers and numeric data

## Spacing & Layout
- Base unit 4px. Allowed gaps: `gap-2 / gap-4 / gap-6`; page padding `p-6`; card padding `p-5`.
- Max content width `max-w-7xl mx-auto`; sidebar nav fixed `w-64` on dark slate with border-r.
- Radius: cards `rounded-xl` (12px), buttons/inputs `rounded-lg` (8px), badges/avatars `rounded-full`. Nothing else.
- Elevation: cards use the 1px white/10 border + `.glass` where overlapping; glows replace drop shadows — no gray box-shadows.

## Iconography
- **lucide-react only**, line-based, `h-4 w-4` (inline) / `h-6 w-6` (feature cards).
- Key motif icons: `Shield`, `ShieldCheck`, `Lock`, `Server`, `Network`, `Radar`, `Crosshair`, `Activity`, `FileSearch`, `Sparkles` (AI marker).
