# UI/UX Improvement Plan — Crime OS AI
_Created: 2026-07-25 | Status: COMPLETED_

## Executive Summary

The design system and token set are solid. The problems are in **application** — the tokens are used too liberally, creating visual noise rather than signal. Real officers need to scan fast and act confidently. The current UI asks them to parse too much chrome before reaching the content.

Three root causes drive most of the clutter:

1. **Accent overuse** — 6 different accent colors appear on the tab bar alone, violating the "at most twice per screen" rule from `ui_rules.md`.
2. **Eyebrow label proliferation** — `text-[10px] uppercase tracking-wider font-mono font-bold` appears on every signal card, every metadata row, every section header. The pattern that should signal "important label" now signals nothing.
3. **Density without hierarchy** — the case header + tab bar + command center hero stack ~400px of chrome before any work content appears. Everything competes at the same visual weight.

Two independent analysis agents reviewed all 30+ frontend files. Their findings are synthesized below alongside direct code analysis.

---

## Priority Levels

- **P0** — Breaks usability or professionalism for real users. Fix first.
- **P1** — Significant clutter or confusion. Fix in the main pass.
- **P2** — Polish and refinement. Fix after P0/P1.

---

## P0 — Critical Fixes

### P0-1: Rainbow Tab Bar (case layout)
**File:** `frontend/app/(authenticated)/cases/[id]/layout.tsx` lines 39–49, 170–258

**Problem:** Each of the 9 tabs has a distinct color class (`text-info`, `text-violet`, `text-accent`, `text-success`, `text-primary`, `text-rose`). The active state overrides all of them with `bg-primary/10 text-primary` anyway — so the per-tab colors serve no semantic purpose and just create a rainbow of competing accents on a single nav bar.

**Fix:**
- Remove all per-tab `color` fields from the `TABS` array.
- Standardize all inactive tabs to `text-muted-foreground hover:text-foreground hover:bg-secondary/40`.
- Active tab: `bg-primary/10 text-primary border border-primary/20` (already correct, just make it the only variant).
- Keep the group dividers (`Work / Evidence / Record`) — they provide useful structure — but drop the `text-[10px] uppercase` group labels in favor of a simple `|` separator or a slightly taller divider line.

---

### P0-2: Case Header Density
**File:** `frontend/app/(authenticated)/cases/[id]/layout.tsx` lines 117–167

**Problem:** The case header stacks: back button → active tab label → Shield icon → case number → status badge → case title → crime type + date → CCTNS button. That is 8 distinct elements before the tab bar. The `activeTabMeta` color label (line 137–141) adds a colored text label that duplicates what the active tab already shows.

**Fix:**
- Remove the `activeTabMeta` label from the header entirely — the active tab in the nav already communicates this.
- Consolidate the meta row: `[case_number] · [crime_type] · [date]` on one line, `[StatusBadge]` inline.
- Move the CCTNS sync button to the Overview tab's command center, not the persistent header. It's a one-time action, not a persistent control.
- Result: header becomes 3 lines max (back button / title / meta+status).

---

### P0-3: Command Center Eyebrow Overload
**File:** `frontend/components/case-command-center.tsx` lines 344–413

**Problem:** Every signal card uses `text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-bold` as a label. This is the exact "tiny uppercase tracked eyebrow above every section" anti-pattern. When every element uses the same treatment, none of them stand out.

**Fix:**
- Signal card labels: use `text-xs text-muted-foreground` (no uppercase, no tracking). The number below it provides the hierarchy.
- Reserve `uppercase tracking-wider font-mono` for truly system-level identifiers (case numbers, timestamps, status codes) — not descriptive labels.
- The hero card right column metadata rows (lines 284–319) have the same issue: 3 rows each with `text-[10px] uppercase tracking-wider font-mono font-bold`. Change to `text-xs text-muted-foreground` labels with `text-sm font-medium text-foreground` values.

---

### P0-4: Bilingual Text in Headings
**File:** `frontend/components/case-command-center.tsx` line 219, 557

**Problem:** `"Case Command Center / केस कमांड सेंटर"` and `"Recent Case Log / हालिया गतिविधि"` embed Hindi directly in heading text. This creates visual noise in the heading hierarchy and makes the English text harder to scan. The bilingual principle from `ui_rules.md` is meant for **labels and primary actions**, not headings.

**Fix:**
- Headings: English only. `"Case Command Center"`, `"Recent Case Log"`.
- Add the Hindi/Gujarati translation as a `text-xs text-muted-foreground` subtitle line below, or as a `title` attribute tooltip.
- Apply the same fix to any other heading that embeds `/ हिंदी` inline (audit the full component set).

---

### P0-5: Decorative Gradient Stripes and Icon Backgrounds
**File:** `frontend/app/(authenticated)/cases/[id]/ingestion/page.tsx` lines 140–141, 164, 167–168

**Problem:**
- Line 140: `bg-gradient-to-br from-info to-violet` on the step header icon — a decorative gradient that serves no semantic purpose.
- Line 164: `absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-info via-violet to-primary` — a rainbow top-border stripe on the upload card. This is decorative noise and uses 3 accent colors simultaneously.
- Line 167: `bg-gradient-to-br from-info/20 to-violet/20` on the upload icon background.

**Fix:**
- Replace gradient icon backgrounds with a single flat tint: `bg-info/10` or `bg-primary/10`.
- Remove the rainbow top-border stripe entirely. The card's border and content provide sufficient structure.
- Apply the same audit to all other pages — search for `bg-gradient-to-` in components.

---

## P1 — High Priority

### P1-1: Dashboard Role Badge in H1
**File:** `frontend/app/(authenticated)/dashboard/page.tsx` lines 113–123

**Problem:** The `"SHO Command Mode"` and `"Legal Advisory Mode"` badges are rendered inline inside the `<h1>` element. This breaks the heading's typographic rhythm and makes the page title feel cluttered.

**Fix:**
- Move role badges to a separate line below the h1, styled as a status chip: `text-xs font-mono uppercase` in a `flex items-center gap-2 mt-1` row alongside the "Logged in as" text.

---

### P1-2: Signal Card Count-Up on Every Metric
**File:** `frontend/components/case-command-center.tsx` lines 43–77, 351, 383, 403

**Problem:** `AnimatedMetric` count-up runs on all 4 signal cards simultaneously on every page load. When all numbers animate at once, the effect loses meaning — it reads as "everything is loading" rather than "this number is significant."

**Fix:**
- Reserve count-up animation for the single most important metric (Case Confidence %).
- The other 3 cards (Extracted Details, Legal Requests, Timeline Events) should render their values immediately.
- This also reduces motion load for users who may be sensitive to simultaneous animations.

---

### P1-3: Tab Bar Group Labels as Eyebrows
**File:** `frontend/app/(authenticated)/cases/[id]/layout.tsx` lines 187, 212, 237

**Problem:** `"Work:"`, `"Evidence:"`, `"Record:"` group labels use `text-[10px] text-muted-foreground/60 uppercase font-semibold` — the eyebrow pattern applied to navigation groups. They add visual weight without adding clarity (the tab icons already communicate the group).

**Fix:**
- Replace text group labels with a simple `1px` vertical divider (`h-4 w-px bg-border/40`) between groups.
- If grouping labels are needed for accessibility, use `aria-label` on the wrapping `<div>` instead of visible text.

---

### P1-4: Workflow Spine Node Size
**File:** `frontend/components/workflow-spine.tsx` lines 53–59

**Problem:** The workflow nodes are `w-11 h-11 rounded-full` (44px circles). For a 6-stage horizontal stepper, this creates a very heavy visual bar. The `Loader2 animate-spin` on the active node adds motion to an already-dense element.

**Fix:**
- Reduce nodes to `w-8 h-8` (32px).
- For completed stages, use a smaller checkmark icon (`h-3 w-3`).
- The spinning loader on the active node is appropriate — keep it, but ensure it's the only animated element in the stepper at any time.

---

### P1-5: Invisible Scrollbars
**File:** `frontend/app/globals.css` lines 175–196

**Problem:** `scrollbar-width: none` is applied globally to `*`. This means every scrollable panel — the case workspace, the entity list, the timeline — has no scroll indicator. Users cannot tell if content is cut off below the fold.

**Fix:**
- Remove `scrollbar-width: none` from the global `*` rule.
- Keep it only on `.scrollbar-none` and `.workspace-scroll` utility classes where it's intentional.
- Add a thin, subtle scrollbar to the main workspace: `scrollbar-width: thin; scrollbar-color: hsl(var(--border)) transparent;`

---

### P1-6: Case Command Center — Two Sections in One Card
**File:** `frontend/components/case-command-center.tsx` lines 483–543

**Problem:** The "Dispatched Requests" summary and "Latest Provider Response Insight" are both inside a single `<Card>` separated by a `border-t`. This creates a card that does two different jobs, making it hard to scan.

**Fix:**
- Split into two separate cards: `"Legal Requests"` and `"Latest Response"`.
- Each card gets a clear single-purpose header.
- This also makes the layout more flexible — the response card can be hidden when there are no responses.

---

### P1-7: Ingestion Page — Redundant "AI-suggested" Badges
**File:** `frontend/app/(authenticated)/cases/[id]/ingestion/page.tsx` lines 192–204, 238–239, 268–270

**Problem:** The `<Badge variant="info">AI-suggested</Badge>` appears 3 times on the same screen: in the meta badges row, on the translation card header, and in the entities section header. The first occurrence is sufficient — repeating it adds noise without adding information.

**Fix:**
- Keep the single `<Badge variant="info">AI-generated via Gemini</Badge>` in the meta badges row after upload.
- Remove the duplicate badges from the translation card header and entities section header.
- The `border-info/40` on the translation card already signals AI content per the Blue Citation Rule.

---

### P1-8: Dashboard StatCard Labels Too Verbose
**File:** `frontend/app/(authenticated)/dashboard/page.tsx` lines 143–145

**Problem:** Labels read `"Total cases in station"`, `"Awaiting SHO Approval"`, `"System audit logs"` — full sentences as metric labels. These are too long for the compact stat card format and wrap awkwardly on smaller screens.

**Fix:**
- Shorten to: `"Total Cases"`, `"Pending Approvals"`, `"Audit Events"`.
- Add the longer description as a `title` tooltip if needed.

---

## P2 — Polish

### P2-1: Login Page — Triple LockKeyhole Icon
**File:** `frontend/app/login/page.tsx` lines 6, 82, 122

**Problem:** The `LockKeyhole` icon appears 3 times: imported but used in the form header icon box (line 82), and in the submit button (line 122). The icon box next to the "Sign in" heading and the button icon are redundant.

**Fix:**
- Remove the `LockKeyhole` icon box from the card header (line 82). The heading "Sign in" is sufficient.
- Keep the icon in the submit button only.

---

### P2-2: Sidebar "Navigation" Eyebrow Label
**File:** `frontend/app/(authenticated)/layout.tsx` line 155

**Problem:** `"Navigation"` as a `text-[10px] font-mono uppercase tracking-widest` label above 2 nav links is unnecessary — the sidebar context makes it obvious these are navigation links.

**Fix:**
- Remove the "Navigation" label entirely.
- The space it occupied improves breathing room between the brand lockup and the nav links.

---

### P2-3: Topbar Icon Buttons — Settings and Help Are Non-Functional
**File:** `frontend/app/(authenticated)/layout.tsx` lines 276–293

**Problem:** The Settings and Help icon buttons in the topbar have no `onClick` handlers and no `href`. They appear interactive but do nothing, which is confusing for real users.

**Fix:**
- Either wire them to real destinations, or remove them from the topbar.
- If keeping them for demo purposes, add `aria-disabled="true"` and a `title="Coming soon"` tooltip so users understand they're placeholders.

---

### P2-4: Case List Items — Inconsistent Hover State
**File:** `frontend/app/(authenticated)/dashboard/page.tsx` line 274

**Problem:** Case list items use `hover:border-primary/40` but no background change on hover. The border-only hover is subtle to the point of being imperceptible on a dark surface.

**Fix:**
- Add `hover:bg-primary/[0.03]` alongside the border change for a more perceptible hover state.

---

### P2-5: Workflow Spine — Desktop Label Overflow
**File:** `frontend/components/workflow-spine.tsx` lines 65–78

**Problem:** Stage labels use `md:absolute md:top-12 md:left-1/2 md:-translate-x-1/2 md:w-32` — absolutely positioned below the node. With 6 stages, the `w-32` (128px) labels can overlap on screens narrower than ~900px.

**Fix:**
- Reduce label width to `w-24` (96px) and add `text-center overflow-hidden text-ellipsis whitespace-nowrap` to prevent overlap.
- Or switch to a tooltip-on-hover pattern for the Hindi subtitle, keeping only the English label visible.

---

### P2-6: Copilot Launcher Z-Index
**File:** `frontend/components/copilot-drawer.tsx` (to be audited)

**Problem:** The floating copilot launcher button sits in the bottom-right corner. Verify it uses a semantic z-index value from the scale (not an arbitrary `z-50` or `z-[999]`) and doesn't overlap the tab bar on mobile.

**Fix:**
- Audit and assign `z-index` from the semantic scale: `dropdown(10) → sticky(20) → modal-backdrop(30) → modal(40) → toast(50) → tooltip(60)`.
- The launcher should sit at the `toast` level (50) so it floats above content but below modals.

---

## Implementation Order

```
Phase A — P0 (do first, highest impact):
  1. P0-1: Normalize tab bar colors
  2. P0-2: Simplify case header
  3. P0-3: Fix eyebrow label overuse in command center
  4. P0-4: Move bilingual text out of headings
  5. P0-5: Remove decorative gradient stripes/icon backgrounds

Phase B — P1 (main pass):
  6. P1-1: Dashboard role badge placement
  7. P1-2: Limit count-up to one metric
  8. P1-3: Replace tab group text labels with dividers
  9. P1-4: Reduce workflow spine node size
  10. P1-5: Restore subtle scrollbars
  11. P1-6: Split dual-purpose command center card
  12. P1-7: Remove duplicate AI-suggested badges
  13. P1-8: Shorten stat card labels

Phase C — P2 (polish pass):
  14. P2-1 through P2-6 in any order
```

---

## Files Requiring Changes (summary)

| File | Priority | Changes |
|---|---|---|
| `app/(authenticated)/cases/[id]/layout.tsx` | P0, P1 | Tab colors, header density, group labels |
| `components/case-command-center.tsx` | P0, P1 | Eyebrows, bilingual headings, count-up, card split |
| `app/(authenticated)/cases/[id]/ingestion/page.tsx` | P0, P1 | Gradient removal, duplicate badges |
| `app/globals.css` | P1 | Scrollbar visibility |
| `app/(authenticated)/dashboard/page.tsx` | P1, P2 | Role badge, stat labels, hover state |
| `components/workflow-spine.tsx` | P1, P2 | Node size, label overflow |
| `app/(authenticated)/layout.tsx` | P2 | Nav label, non-functional buttons |
| `app/login/page.tsx` | P2 | Triple icon |
| `components/copilot-drawer.tsx` | P2 | Z-index audit |

---

## Additional Confirmed Findings (from full-codebase analysis)

These were confirmed by reading every file — they reinforce or extend the items above.

### Staggered per-item `animate-fade-up` on every list (P1)
**Files:** `dashboard/page.tsx` lines 182, 275; `cases/page.tsx` line 231; `requests/page.tsx` line 328

Every list in the app animates each row in with `animationDelay: ${Math.min(idx, 8) * 35}ms`. Up to 9 rows × 35ms = 315ms before the last row appears. This is a consumer marketing pattern. It makes the UI feel slow and playful rather than fast and authoritative. None of these stagger blocks have a `prefers-reduced-motion` guard.

**Fix:** Remove per-item stagger delays from all list rows. Keep a single `animate-fade-up` on the list container only. The `prefers-reduced-motion` block in `globals.css` already handles the global case — the inline `style` prop bypasses it.

---

### `hover:glow-primary hover:-translate-y-0.5` on case list rows (P1)
**File:** `cases/page.tsx` line 231

A colored glow + lift on hover for police case records is the wrong register. It signals "product card in a shop" not "case file in an investigation system." The same treatment is on the New Case button (line 151), removing any hierarchy between the primary CTA and every list row.

**Fix:** Replace with `hover:bg-primary/[0.04] hover:border-primary/30` — a subtle tint + border shift. No glow, no lift. Reserve `glow-primary` for the active workflow step only.

---

### Demo scaffolding visible in officer-facing UI (P0)
**File:** `requests/page.tsx` lines 250–253

The note `"In demo mode, emails route to vrajv83@gmail.com"` and the `"Trigger Mock Response"` button (line 453, styled as a prominent `variant="success"` button) are exposed directly in the officer-facing form. This is the single most unprofessional element in the app — it exposes a personal email address and test mechanics to real users.

**Fix:**
- Remove the demo email note from the visible form entirely.
- Move "Trigger Mock Response" behind a dev/demo flag or into a collapsed `<details>` section labeled "Demo controls" with muted styling (`variant="ghost"`, `text-xs`).

---

### `animate-pulse-glow` on every dispatched request card (P1)
**File:** `requests/page.tsx` line 332

Every dispatched request card has a continuously pulsing left border glow. With multiple dispatched requests, the list has several simultaneously pulsing elements — the opposite of "calm authority."

**Fix:** Remove `animate-pulse-glow` from the left status bar. Use a static colored left border (`border-l-2 border-success`) to indicate dispatched status without motion.

---

### Path stepper: triple simultaneous animation on active step (P1)
**File:** `components/path-stepper.tsx` lines 19, 71, 81

The active step runs: `animate-glow-pulse` on the node + `glass glow-primary` on the card + `animate-pulse` dot in the title. Three simultaneous glow/pulse treatments on one element. The `glass` background also violates the "glassmorphism as default" ban.

**Fix:**
- Active step: keep `border-primary/60` border on the card. Remove `glass` and `glow-primary` from the card background.
- Node: keep the `bg-primary/10 border-primary` ring. Remove `animate-glow-pulse`.
- Title dot: keep the static `bg-primary` dot. Remove `animate-pulse`.
- One subtle motion signal per active step is enough.

---

### Broken indentation in path-stepper (P2)
**File:** `components/path-stepper.tsx` lines 47–50, 71–73, 127

Ternary branches are dedented to column 0, breaking out of surrounding JSX indentation. Visible in code review and signals unreviewed edits.

**Fix:** Re-indent to match surrounding JSX structure.

---

### Native `<select>` for step status in path stepper (P1)
**File:** `components/path-stepper.tsx` lines 92–102

A raw `<select>` with ALL-CAPS option text (`"PENDING"`, `"IN PROGRESS"`, `"DONE"`, `"SKIPPED"`) sits inside a glowing card. Inconsistent with the rest of the polished UI and gives no explanation of what each status means.

**Fix:** Replace with a small `<DropdownMenu>` using the existing Radix primitive, with human-readable labels and semantic status colors matching `StatusBadge`.

---

### `focus:outline-none` with no replacement on workflow spine buttons (P1)
**File:** `components/workflow-spine.tsx` line 49

Keyboard focus is invisible on all stage nodes.

**Fix:** Replace `focus:outline-none` with `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`.

---

### Dead imports and dead code throughout (P2)
- `dashboard/page.tsx` lines 6–22: `Gavel`, `Users`, `Database` imported but never used.
- `cases/page.tsx` line 25: `CASE_COLORS` constant defined but never referenced.
- `requests/page.tsx` lines 16–17: `X` and `Plus` imported but never used.
- `workflow-spine.tsx` lines 25–26: `hasConnectedLine`/`nextStage` computed but never used.
- `dashboard/page.tsx` lines 308–313: `glow: ""` dead key in every `STAT_COLORS` entry.

**Fix:** Remove all dead imports and dead constants in a single cleanup pass.

---

### `aria-current="page"` missing on active tabs (P1)
**File:** `app/(authenticated)/cases/[id]/layout.tsx` lines 171–258

Active tab state is conveyed by color + background only. Screen readers get no active-state signal.

**Fix:** Add `aria-current={activeTab === tab.href ? "page" : undefined}` to each tab `<Link>`.

---

### Touch targets below 44px on tab bar and clear button (P1)
**Files:** `layout.tsx` tabs (`py-1.5 px-2.5` ≈ 28px tall); `cases/page.tsx` X clear button (`h-3.5 w-3.5` = 14px icon, no padding)

**Fix:**
- Tab items: increase to `py-2 px-3` (≥ 36px, acceptable for a dense nav bar).
- Clear button: wrap in a `h-9 w-9` touch target with `flex items-center justify-center`.

---

## Record / Evidence Tabs & Heavy Components (from full-codebase analysis)

### P0-7: Hardcoded localhost URL in Responses download (P0)
**File:** `responses/page.tsx` lines 219–229

The evidence download link points to a hardcoded `http://localhost:8000/` URL, exposed in the rendered DOM. Broken in any non-dev environment.

**Fix:** Use the `lib/api.ts` base URL / env config for the download href, matching how the rest of the app resolves the backend.

---

### P0-8: One-off rainbow colors outside the token system (P0)
**Files:** `evidence/page.tsx` lines 109–132 (`getFileTypeBadge`, `getFileThumbIcon`); `timeline-workspace.tsx` lines 43–103 (`EVENT_META`, 8 color combos)

Evidence uses `bg-sky-500`, `bg-emerald-500`, `bg-purple-500`, `bg-indigo-500`, `bg-amber-500` — raw Tailwind palette colors that bypass the design tokens entirely, creating a rainbow of unrelated accents. The timeline defines 8 distinct dot/border/badge color combos.

**Fix:**
- Map file types and event types to the existing semantic tokens (`info`, `success`, `warn`, `muted`) — a maximum of 3–4 colors total.
- Never use raw `*-500` Tailwind palette classes; always route through the token system.

---

### P0-9: Emoji in professional forensic UI (P0)
**File:** `components/video-evidence-workspace.tsx` lines 296–300, 336–341

`⏱️`, `📦`, `💡` emoji are used as bullet/metadata prefixes. Incongruous with the icon-based system used everywhere else and unprofessional for a forensic tool.

**Fix:** Replace all emoji with Lucide icons (`Clock`, `HardDrive`, `Lightbulb` or `Info`) sized `h-3.5 w-3.5` to match the rest of the app.

---

### P1-16: `animate-pulse` proliferation (P1)
**Files:** `osint-enrichment-panel.tsx` (5+ instances: lines 226, 255, 280, 405, 414); `entity-pivot-panel.tsx` line 149; `timeline-workspace.tsx` line 92; `video-evidence-workspace.tsx` lines 278, 391; `response-correlation-panel.tsx` line 67

`animate-pulse` is used as a generic "this is important" signal in 12+ locations — status badges, risk icons, location/bio-changed chips, CCTV dots, crime callouts, processing labels, panel headers, low-confidence entities. When everything pulses, nothing is urgent. Also confusing on FAILED states (pulse implies activity, not error).

**Fix:**
- Remove `animate-pulse` from all static/historical indicators (CCTV dots, low-confidence badges, bio/location chips, crime callouts, panel header icons).
- Keep pulse ONLY on genuinely live/in-progress states (active scan running, active workflow step) — and even then, one per screen.
- Never pulse a FAILED/error state.

---

### P1-17: Clickable `<div>` elements not keyboard accessible (P1)
**Files:** `audit/page.tsx` lines 178–184; `evidence/page.tsx` lines 235–319; `video-evidence-workspace.tsx` lines 418–450; `entity-pivot-panel.tsx` lines 128–138; `timeline` rows

Multiple interactive cards/rows use `<div onClick>` with no `role="button"`, `tabIndex`, or keyboard handler. Not operable by keyboard.

**Fix:** Convert to `<button>` elements, or add `role="button" tabIndex={0}` + `onKeyDown` (Enter/Space) handlers. Prefer real `<button>` where layout allows.

---

### P1-18: Selection state not exposed to screen readers (P1)
**Files:** `summary/page.tsx` lines 134–158 (version selector); `responses/page.tsx` lines 139–165 (response selector)

Sidebar selector buttons convey selected state via `bg-primary/10 border-primary` visual only — no `aria-pressed` / `aria-current`.

**Fix:** Add `aria-current={isSelected ? "true" : undefined}` (or `aria-pressed`) to selector buttons.

---

### P1-19: Selector list items lack differentiating content (P1)
**Files:** `summary/page.tsx` lines 131–159; `responses/page.tsx` lines 154–165

Version items show only "Version N" + timestamp; response items show "Response #N" + truncated path + date. Officers can't tell items apart without clicking each.

**Fix:**
- Version items: add a one-line content excerpt or a "current/latest" tag.
- Response items: add provider name + response type + status badge.

---

### P1-20: Irreversible "Promote to Case" with no confirmation (P1)
**File:** `components/response-correlation-panel.tsx` lines 160–178

One-click action writes a record to the official case diary with no confirmation or undo.

**Fix:** Add a confirmation step (inline confirm or dialog) before promoting, and a success toast confirming what was added.

---

### P1-21: Technical jargon in officer-facing copy (P1)
**Files:** `responses/page.tsx` line 233 ("Running correlation engine..."); `response-correlation-panel.tsx` lines 66, 76–91 ("AI Correlation Engine", "Grounding"); `path/page.tsx` lines 193, 278 ("Crime OS RAG", "Model: gemini-…"); `command-center` line 234 ("Refresh Control"); raw JSON keys shown as labels in `audit/page.tsx` lines 212–235 and `response-correlation-panel.tsx` lines 120–127

Non-technical officers are shown ML/system internals: "RAG", "grounding", model names, "correlation engine", raw snake_case keys.

**Fix:**
- Replace jargon with plain language: "Analyzing responses…", "AI Findings", "Matched to", "Refresh".
- Hide model names from officer view (keep in audit/debug only).
- Map raw JSON keys to human-readable labels (`call_duration` → "Call Duration", `account_no` → "Account Number").

---

### P2-7: `<pre>` used for AI prose summary (P2)
**File:** `summary/page.tsx` line 199

`<pre>` renders natural-language summary text; screen readers announce it as preformatted/code, and it disables text wrapping semantics.

**Fix:** Render markdown/prose in a normal prose container (`<div className="prose">` or styled `<p>` blocks), not `<pre>`.

---

### P2-8: Redundant duplicated data (P2)
**Files:** `summary/page.tsx` line 191 (`v{version}` badge next to "Version {version}" heading); `response-correlation-panel.tsx` lines 58–62 (`{percentage}% - {label}` where percentage already implies the label); `command-center` — same `completion_percentage` shown twice (hero "Completion" + signal card "Timeline Progress")

**Fix:** Show each datum once. Drop the duplicate version badge, drop the redundant confidence label, and give the two command-center progress readouts distinct meanings or remove one.

---

### P2-9: SHA-256 hash + chain-of-custody in primary view (P2)
**File:** `components/video-evidence-workspace.tsx` lines 344–357

The SHA-256 integrity hash with copy button sits in the main video metadata area — technical detail dominating the primary view.

**Fix:** Move into a collapsible "Chain of Custody" section, shown on demand.

---

### P2-10: Copilot drawer focus trap + backdrop (P2)
**File:** `components/copilot-drawer.tsx` lines 33–57

`role="dialog" aria-modal="true"` but focus isn't trapped — keyboard users can tab behind the backdrop. Backdrop `bg-background/70` is nearly invisible on dark theme.

**Fix:** Use the Radix `Dialog`/`Drawer` primitive (already a dependency) for proper focus trapping, or add a focus trap. Darken the backdrop to `bg-black/50`.

---

### P2-11: Duplicate progress bars in video processing (P2)
**File:** `components/video-evidence-workspace.tsx` lines 265–269, 288–292

Two progress bars (`h-1.5` at card top, `h-2.5` in body) show the same processing state.

**Fix:** Keep one progress bar.

---

### P2-12: Inline "How it works" documentation in timeline (P2)
**File:** `components/timeline-workspace.tsx` lines 688–693

A 3-step numbered "How it works" block takes significant vertical space in the CCTV card.

**Fix:** Move to a tooltip/popover on a help icon, or remove — the UI should be self-explanatory after the P1 clarity fixes.

---

## What NOT to Change

- The color token system (`globals.css` variables) — it's correct and well-structured.
- The dark-mode-only approach — right for the use case.
- The Ferrari Red accent rule itself — the problem is violation of it, not the rule.
- The bilingual label principle for primary actions — keep Hindi/Gujarati on buttons and key CTAs.
- The `animate-fade-up` entry animations — they're fast (220ms) and appropriate for a product register.
- The `AnimatedMetric` component itself — just limit its use to one card.
- The glass/glow utilities — they're well-implemented; the issue is overuse, not the primitives.
