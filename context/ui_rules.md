# UI Rules — Crime OS AI

Audience: **non-technical police officers** (explicit evaluation criterion) — but the presentation is a **dark, high-tech cyber-command aesthetic** (see `ui_tokens.md`). The tension resolves as: futuristic looks, dead-simple interactions. One obvious action per screen, plain language, statuses visible at a glance — wrapped in glass, glow, and grid motifs that make judges feel they're looking at a real threat-intelligence platform.

## Global Principles
1. One primary action per screen, rendered as the single `primary` (electric blue) button. Everything else is `secondary`/`ghost`/outline.
2. **AI content is always labeled and sourced.** Anything Gemini generated gets: electric-blue left border with subtle glow, `Sparkles` icon + "AI-suggested" badge, and (where applicable) a citation popover showing the SOP/legal-section text it came from. Judges must never wonder "is this hardcoded?"
3. No blank screens ever: every list has an empty state (icon + CTA on grid-bg), every async view has skeletons, every failure shows a retry alert.
4. Bilingual labels where cheap: key nav/actions show Hindi under English (`New Complaint / नई शिकायत`). Do not build full i18n.
5. Dark mode ONLY — no theme toggle. Verify contrast: amber and slate-gray text on midnight backgrounds must pass at `text-sm`.

## Components
### Cards
- `bg-card border rounded-xl p-5` (1px white/10 border, no gray shadows). Title `text-lg font-semibold font-heading` + optional StatusBadge right-aligned.
- Interactive cards: on hover, elevate `-translate-y-0.5` + border shifts to `border-primary/50` + `.glow-primary`. `transition-all duration-200`.
- Overlapping/floating cards (dashboard stat cards, dispatch preview) use `.glass`.

### Buttons
- **Primary:** solid electric blue, white text, `rounded-lg h-10 px-4`; hover = `scale-105` + `.glow-primary`. Loading state = spinner + disabled + label stays ("Dispatching…"). Never allow double-submit.
- **Secondary:** transparent bg, `border border-primary/60 text-foreground`; hover = `bg-primary/10`.
- **Destructive:** solid red, only for reject/delete, always behind a confirm `Dialog`; hover glow `.glow-destructive`.
- Icon + label always (lucide, `h-4 w-4`) — icon-only buttons need `title`.

### Inputs & Forms
- shadcn `Input`/`Textarea`/`Select` on `--input` slate bg with white/10 border; focus ring = electric blue glow (`focus-visible:ring-ring`). Visible `Label` above (no placeholder-as-label). Errors `text-destructive text-xs` under the field.
- Extracted-entity review fields: pre-filled, editable, with confidence chip (`font-mono text-xs`) — low confidence (<0.7) gets amber ring to draw the officer's eye.

### Badges
- `rounded-full px-2 py-0.5 text-xs font-medium`, colors strictly from the semantic status table in `ui_tokens.md`. Status dots pulse when state is live (processing/awaiting). Role badges: IO=primary, SHO=accent, LEGAL=secondary.

### Modals (Dialog)
- `.glass` panel over a darkened blurred backdrop. Use only for: confirmations, dispatch preview, citation display. Max `max-w-2xl`. Never nest modals. Esc + overlay-click close (except mid-dispatch).

### Tables
- shadcn `Table`, `text-sm`, `font-mono` for numbers/IDs, sticky header (`.glass`) if scrolling. Row hover `bg-primary/5`. Provider response tables highlight AI-flagged rows with `bg-destructive/10` + left red border + tooltip explaining why (threat-visualization pattern — red used sparingly, only on flagged rows).

### Timeline (audit trail / case log)
- Vertical line (`border-primary/30`) + glowing dot per event (dot color = semantic status, live states pulse); each entry: action (`text-sm font-medium`), actor + timestamp (`text-xs text-muted-foreground font-mono`). Newest first.

### Stepper (investigation path)
- Numbered nodes connected by a data-stream line (`border-primary/30`; completed segments solid emerald). Status controls per step (`pending → in progress → done / skip`); citation link per step opens SOP popover; steps with `suggested_action_type` render an inline primary button ("Generate CDR Request →") with hover glow — this is the money moment of the demo, make it prominent.

### Page/Section backdrops
- Dashboard and case-overview headers sit on `.grid-bg` with a radial fade — subtle, never behind dense tables/forms.
- Sticky top bar: transparent over grid hero, transitions to `.glass` on scroll.

## Motion & Interaction Behaviors
- **On-load:** page content fades up (`opacity-0 translate-y-2 → visible`, 300ms ease-out, stagger 50ms per card). Use CSS/`tailwindcss-animate` — no heavy animation libs (Framer Motion allowed if already installed for the stepper).
- **Hover micro-interactions:** buttons `scale-105`, cards lift + glow (see above). `transition-all duration-200` standard.
- **Live pulses:** processing badges, "awaiting response" dots, and the active stepper node pulse continuously (`animate-pulse` or a soft glow keyframe) — sells "real-time system" to judges.
- Async AI operations: `.glass` "Processing…" card with skeleton + poll; show elapsed time after 5s ("Analyzing complaint… 8s") so judges see it's live, not canned.
- Toasts (bottom-right, `.glass`) for success ("Request dispatched to Airtel Nodal Officer"); alerts inline for errors.
- Scroll reveal ONLY on marketing/landing surfaces (if a landing page is built) — app screens render instantly, no scroll-gating of data.
- Keyboard: forms submit on Enter; dialogs trap focus (shadcn default is fine).
- Respect `prefers-reduced-motion`: disable pulses/lifts, keep opacity fades.
