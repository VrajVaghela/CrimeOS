# UI Tokens — Crime OS AI (Ferrari Edition)

Theme intent: **high-tech, secure, trustworthy — Ferrari cyber-command aesthetic**. Dark-mode-first UI with carbon-black backgrounds, warm off-white text, and Ferrari Red as the single high-signal accent. Defined as CSS custom properties on `:root` in `globals.css` consumed by Tailwind and shadcn components.

## Root Tokens (CSS Custom Properties)

```css
:root {
  /* Backgrounds */
  --bg: #0b0b0b;                  /* Carbon Black */
  --surface: #171717;             /* Card/Panel surface */
  --surface-warm: #23130f;        /* Summary Card, warm accents */

  /* Text */
  --fg: #fffaf0;                  /* Warm off-white primary text */
  --fg-2: #e8dcc8;                /* Warm off-white secondary text */
  --muted: #a89f91;               /* Labels, metadata, placeholders */

  /* Accent colors */
  --meta: #ffd200;                /* Yellow metadata highlights */
  --accent: #dc0000;              /* Ferrari Red primary accent */
  --accent-on: #ffffff;
  --accent-hover: color-mix(in oklab, var(--accent), black 8%);
  --accent-active: color-mix(in oklab, var(--accent), black 14%);

  /* Semantic colors */
  --success: #0f9d58;             /* Green - completed/high confidence */
  --warn: #ffd200;                /* Yellow - pending review/attention */
  --danger: #ff3b30;              /* Red - error/threat alerts */
  --info: #2d7ee9;                /* Info Blue - AI content, citations */
  --info-on: #ffffff;

  /* Borders */
  --border: #342a24;              /* Strong border, hover states */
  --border-soft: #241f1b;         /* Default soft border */

  /* Font stacks */
  --font-display: "Ferrari Sans", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Ferrari Sans", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "SF Mono", ui-monospace, Menlo, monospace;

  /* Type scale */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 19px;
  --text-xl: 26px;
  --text-2xl: 40px;
  --text-3xl: 62px;
  --text-4xl: 88px;

  /* Line heights */
  --leading-body: 1.5;
  --leading-tight: 0.98;

  /* Letter spacing */
  --tracking-display: -0.03em;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 14px;
  --radius-pill: 9999px;
  --radius-squircle: 12px;
  --radius-squircle-sm: 8px;

  /* Elevation */
  --elev-flat: none;
  --elev-ring: 0 0 0 1px var(--border);
  --elev-raised: 0 26px 80px rgba(0, 0, 0, 0.48);
  --focus-ring: 0 0 0 4px rgba(220, 0, 0, 0.30);

  /* Glass effects */
  --glass-bg: color-mix(in oklch, var(--surface) 55%, transparent);
  --glass-border: color-mix(in oklch, var(--accent) 30%, transparent);

  /* Gradients */
  --gradient-accent-info-v: linear-gradient(180deg, var(--accent) 0%, var(--info) 100%); /* Vertical red-to-blue */
  --gradient-accent-info-h: linear-gradient(90deg, var(--accent) 0%, var(--info) 100%);  /* Horizontal red-to-blue */
  --gradient-graph-fill: linear-gradient(180deg, color-mix(in oklab, var(--accent) 15%, transparent) 0%, color-mix(in oklab, var(--info) 2%, transparent) 100%);

  /* Motion */
  --motion-fast: 130ms;
  --motion-base: 220ms;
  --ease-standard: cubic-bezier(0.16, 1, 0.3, 1);
}
```

## Mapping for Tailwind/shadcn components (HSL equivalents for tailwind config)

To support tailwind base, the following variables will be defined in HSL format for tailwind extending:

```css
:root {
  --background: 0 0% 4%;        /* #0b0b0b */
  --foreground: 40 100% 97%;    /* #fffaf0 */
  --card: 0 0% 9%;              /* #171717 */
  --card-foreground: 40 100% 97%;
  --primary: 0 100% 43%;        /* #dc0000 Ferrari Red */
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 9%;         /* Card surface */
  --secondary-foreground: 38 39% 85%; /* #e8dcc8 */
  --success: 151 83% 34%;       /* #0f9d58 */
  --accent: 0 100% 43%;         /* Same as primary */
  --accent-foreground: 0 0% 100%;
  --destructive: 3 100% 60%;    /* #ff3b30 */
  --muted: 24 15% 12%;          /* Soft border bg */
  --muted-foreground: 36 12% 61%; /* #a89f91 */
  --border: 24 18% 17%;         /* #342a24 */
  --input: 24 15% 12%;
  --ring: 0 100% 43%;
  --info: 214 82% 54%;          /* #2d7ee9 Info Blue */
  --warn: 49 100% 50%;          /* #ffd200 */
}
```

## Glow & Glass Primitives

```css
.glow-primary {
  box-shadow: 0 0 20px -4px rgba(220, 0, 0, 0.3);
}
.glow-success {
  box-shadow: 0 0 16px -4px rgba(15, 157, 88, 0.4);
}
.glow-destructive {
  box-shadow: 0 0 16px -4px rgba(255, 59, 48, 0.4);
}
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
}
```

## Typography Rules

- **Display Headings:** Ferrari Sans, size `--text-3xl` or `--text-4xl`, letter spacing `--tracking-display`, line height `--leading-tight`.
- **UI Labels/Headers:** Ferrari Sans, uppercase with letter-spacing `0.06em` to `0.13em`.
- **Identifiers / Numbers:** SF Mono, monospace.
