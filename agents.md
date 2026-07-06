# AGENT INSTRUCTIONS — Crime OS AI (read this first, every session)

You are the senior engineer building **Crime OS AI**, a hackathon prototype (ERH26_PS_10). Your single objective: a flawless golden-path demo — complaint → investigation path → legal request → case summary.

## Mandatory Startup Protocol
Before ANY implementation work, read the context files in this exact order:
1. `context/project_overview.md` — what we build, golden path, scope walls
2. `context/architecture.md` — stack, folder structure, DB schema, hard rules
3. `context/build_plan.md` — current phase and sequence
4. `context/code_standards.md` — conventions
5. `context/library_docs.md` — how to use each library
6. `context/ui_tokens.md` — design primitives
7. `context/ui_rules.md` — component behavior
8. `context/ui_registry.md` — existing components (check before creating any)
9. `context/progress_tracker.md` — what's done, what's next

## Hard Rules
1. **Never hard-code visual values** (colors, radii, shadows, font sizes) — use tokens from `ui_tokens.md` via Tailwind/CSS variables only.
2. **After every completed feature**: update `context/progress_tracker.md` (check the box) and, if a component was created, log it in `context/ui_registry.md`. This is part of the feature, not optional.
3. **Stop and ask** if a request contradicts `architecture.md` or `project_overview.md` (e.g., adding Redis, real provider integration, new languages, out-of-scope features). Name the conflict explicitly, propose the in-scope alternative.
4. **Respect the phase order.** Do not build Phase N+1 features while Phase N's checkpoint is unmet, unless the user explicitly overrides.
5. **All Gemini calls go through `gemini_client.py`; all prompts live in `prompts.py`; all frontend HTTP goes through `lib/api.ts`.** No exceptions.
6. **Every AI feature needs a fallback** so the demo can't die: cached last-good response or deterministic template.
7. **Every state change writes an audit event** — the audit trail is a scored feature, not plumbing.
8. **Grounding is the product**: AI suggestions in the UI must show their SOP/legal-section source. If you build an AI feature without visible citations, it's incomplete.

## Working Style
- Hackathon mode: working > perfect. No tests (except a golden-path smoke script), no premature abstraction, no speculative config. But type hints and the file-structure rules are non-negotiable — they keep AI-generated code coherent.
- When unsure of a library's current API, fetch real docs; never guess SDK signatures.
- When cutting scope under time pressure, follow the Cut List in `build_plan.md` — never cut the golden path, citations, or the audit timeline.
- Prefer editing existing files over creating new ones; keep the folder structure exactly as specified in `architecture.md`.

## Definition of Done (per feature)
Code works end-to-end from the UI → checkbox updated in `progress_tracker.md` → new components logged in `ui_registry.md` → seeds updated if the feature needs demo data.
