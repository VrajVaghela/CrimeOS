# Phase 14 — Full Localization Plan (UI + AI Voice)

Created: 2026-08-07. Planning source for Phase 14 in `progress_tracker.md`.
Supersedes the "out of scope" note left by Phase 12 (`multilingual_merge_plan.md`).

> **STATUS: IMPLEMENTED 2026-08-08.** All six work packages (14A–14F) landed;
> defects D1–D9 below are fixed. See the Phase 14 section of
> `progress_tracker.md` for the as-built record and verification evidence.
> Deviations from this plan, all deliberate:
> - Added `lib/i18n/endonyms.ts` (not in the original plan) as the single
>   sanctioned home for native language names. Without it the audit could not
>   forbid Indic literals in `.tsx` outright, since the language switcher must
>   legitimately render "ગુજરાતી".
> - `useTranslatedContents(texts[])` was replaced by a per-tick request
>   coalescer inside `use-translated-content.ts`. Same goal (one HTTP call per
>   page of AI blocks), but it needs no call-site changes, so existing
>   `TranslatedTextBlock` usages batch automatically.
> - Copilot chat history stores `lang` per message and replays each message in
>   the language it was generated for, rather than re-translating on read.

## 1. Requirement

> When a language is chosen, **everything** must be in that language — including
> the AI assistant. If Gujarati is selected, the copilot must speak Gujarati.

Today the app is only partially localized, and the copilot is always English.

## 2. Observed defects (verified in code, 2026-08-07)

| # | Defect | Evidence |
|---|--------|----------|
| D1 | Copilot answers are always English regardless of selected language | `backend/app/services/copilot_service.py:149` — `ask_copilot()` takes no `lang`; `COPILOT_*_PROMPT` in `prompts.py:223+` never states an output language |
| D2 | Hardcoded bilingual `"English / हिंदी"` labels leak Hindi into the Gujarati UI | `components/copilot-panel.tsx:150,201`, `case-command-center.tsx:223`, `entity-pivot-panel.tsx:204,272`, `evidence-review-workspace.tsx:291,300`, `path-revision-list.tsx:23`, `cases/page.tsx:166`, `cases/[id]/evidence/page.tsx:144,196` — this is the exact bug in the user's screenshot |
| D3 | Copilot chrome is not keyed at all: quick-question chips, input placeholder, loading/error text, citation source labels, empty state, timestamps | `components/copilot-panel.tsx:107-113, 167, 175, 209-224, 234, 246, 287` |
| D4 | Dictionaries cover only 10 sections (Phase 1–7 surfaces). No keys exist for Phase 8–13 UI | `lib/i18n/en.ts` sections: common, nav, login, dashboard, cases, command_center, ingestion, path, requests, responses, summary, audit, timeline, evidence |
| D5 | 17 components never call `t()` — they render English literals | `copilot-drawer`, `notifications-popover`, `osint-enrichment-panel`, `video-evidence-workspace`, `evidence-review-workspace`, `request-readiness-checklist`, `path-revision-list`, `processing-card`, `citation-dialog`, `ai-content-card`, `entity-review-field`, `source-chip`, `status-badge`, `role-guard`, `workflow-spine`, `login/page.tsx` (partial), `copilot-panel` (2 keys only) |
| D6 | Backend ships a hardcoded bilingual pair for workflow stages — no Gujarati path exists | `schemas/command_center.py:10` `label_hi`; rendered at `components/workflow-spine.tsx:76` |
| D7 | Status/enum text is raw DB values | `components/status-badge.tsx` renders `status.replace(/_/g, " ")` |
| D8 | Dates/times/numbers hardcode `en-IN` | e.g. `copilot-panel.tsx:234` `toLocaleTimeString("en-IN", …)` |
| D9 | `<html lang="en">` is static and the body font never switches to an Indic face | `app/layout.tsx:54` |
| D10 | Tier-2 AI-content translation is inconsistent — some blocks auto-translate, others need a manual "Translate" click, so a Gujarati session shows mixed languages | `autoTranslate` passed only in `path-stepper`, `timeline-workspace`, `audit`, `path/page`; omitted in `ingestion` (raw + translated text) and `responses` (`ai_insights`) |
| D11 | Translation cache is process-memory only; a backend reload re-bills every string | `services/translate_service.py` `_cache` dict; `fallback_cache` table exists but is unused by translate |
| D12 | Free-text questions in Hindi/Gujarati break copilot prompt routing (English keyword match on `question.lower()`) | `copilot_service.py:168-186` |

Good news: `hi.ts` and `gu.ts` are **key-complete** against `en.ts` today (verified by
key diff — zero missing leaves). The gap is missing *sections*, not missing translations.

## 3. Target behaviour

One selected language governs: navigation chrome, labels, enum/status text, dates,
numbers, AI-generated case content, and the copilot's conversational voice.
Never-translated (per existing `TRANSLATION_PROMPT` rules): case/FIR numbers,
BNS/BNSS/BSA citations, names, phone/account/IP/IMEI, amounts, IDs, URLs.

## 4. Architecture decisions

**A1 — Three tiers, explicit ownership.**
- *Tier 1 — static UI strings* → `lib/i18n/{en,hi,gu}.ts` via `t()`. No network. Instant.
- *Tier 2 — stored AI artifacts* (summaries, `ai_insights`, path step titles/descriptions,
  `ai_reasoning`, timeline events, evidence tags) → English in DB, translated at display
  time through `POST /translate`. Becomes **automatic** whenever `lang !== "en"`.
- *Tier 3 — conversational AI (copilot)* → generated **directly in the target language**
  by Gemini in the same call. Better quality than translate-after-the-fact and avoids a
  second round trip.

**A2 — Copilot keeps English authoritative without a second Gemini call.**
`GeminiCopilotResponse` gains `answer_localized`. One structured call returns both
`answer` (English, authoritative → audit event + `copilot_messages.message`) and
`answer_localized` (display → new `message_localized` + `lang` columns). When
`lang == "en"`, `answer_localized` mirrors `answer`. This preserves the project rule
that the DB holds authoritative English while the officer sees Gujarati.

**A3 — Language travels on the request, not in every call site.**
`lib/api.ts` gets `setActiveLang(lang)`; `LanguageProvider` calls it on mount and on
change; the shared `request()` wrapper attaches an `X-Lang` header. Backend adds a
`get_lang()` FastAPI dependency (validates against `{en,hi,gu}`, defaults `en`) so any
AI endpoint can localize later without a contract change.

**A4 — Intent-based copilot routing (fixes D12).**
`CopilotAskIn` gains optional `intent: Literal["next_action","missing_facts","evidence",
"legal_basis","provider_response"] | None`. Quick-question chips send the canonical
`intent` plus the localized display text; free text sends `intent=None` and falls through
to the generic prompt (Gemini handles Hindi/Gujarati input natively). English keyword
sniffing is kept only as a fallback when `intent` is absent.

**A5 — Localized deterministic fallbacks.**
The five hardcoded `fallback_answer` strings move to `prompts.py` as a
`COPILOT_FALLBACKS: dict[str, dict[str, str]]` (intent → lang → text) so a Gemini outage
still answers in Gujarati instead of silently reverting to English.

**A6 — Kill bilingual concatenation (fixes D2/D6).**
No `"English / हिंदी"` literal may exist in a component. Workflow stages resolve through
`t("workflow.stage.<enum>")`; `label_hi` stays in the schema for API compatibility but the
frontend stops rendering it (delete the second `<span>` in `workflow-spine.tsx`).

**A7 — Locale-aware formatting + enum labels.**
New `lib/format.ts` (`formatDate`, `formatTime`, `formatDateTime`, `formatNumber`,
`formatRelative`) mapping `en→en-IN`, `hi→hi-IN`, `gu→gu-IN`. New `lib/i18n/enums.ts`
mapping case status / request status / step status / evidence type / severity to
dictionary keys; `StatusBadge` takes its label from there.

**A8 — Document language + font switch (fixes D9).**
`LanguageProvider` sets `document.documentElement.lang` and `data-lang`. `globals.css`
adds `[data-lang="hi"] body { font-family: var(--font-noto-devanagari), … }` and the
Gujarati equivalent, so Indic text renders in its proper face without per-node classes.

**A9 — Durable translation cache (fixes D11).**
`translate_service` writes through to the existing `fallback_cache` table
(`purpose="translate_<lang>"`, `input_hash=sha256(text)`), read before any Gemini call.
Adds `POST /translate/batch` (`{items: [{id, text}], target_lang}`, cap 25 items /
20k chars total) so a page with 12 AI blocks makes one request, not twelve.

**A10 — Guardrails so this cannot regress.**
- `t()` logs `console.warn` once per missing key when `NODE_ENV !== "production"`.
- `frontend/scripts/i18n-audit.mjs` fails on (a) any key present in `en.ts` but absent
  from `hi.ts`/`gu.ts`, (b) any Devanagari/Gujarati literal in a `.tsx` outside
  `lib/i18n/`, (c) hardcoded `"en-IN"` outside `lib/format.ts`. Wired as `npm run i18n:audit`.

## 5. Work breakdown

### 14A — Language plumbing (foundation, no visible change)
- `lib/api.ts`: `setActiveLang()` + `X-Lang` header in `request()`.
- `lib/language-context.tsx`: call `setActiveLang`, set `documentElement.lang`/`data-lang`,
  dev-mode missing-key warning.
- `app/globals.css`: `[data-lang]` font rules.
- `lib/format.ts`, `lib/i18n/enums.ts` (new).
- `backend/app/dependencies.py`: `get_lang()` dependency.

### 14B — Dictionary expansion (Tier 1)
Add sections to `en.ts`, then mirror into `hi.ts` and `gu.ts` (key-complete, no English
leftovers): `copilot`, `notifications`, `osint`, `video`, `evidence_workspace`,
`workflow` (stage labels), `status` (all enums), `roles`, `readiness`, `revisions`,
`citations`, `entity`, plus additions to `common` (relative time units, retry, download,
expand/collapse, copy, dismiss) and `command_center`.

### 14C — Component sweep (Tier 1 application)
Replace every user-facing literal with `t()` in the 17 files from D5, plus remove the 9
bilingual concatenations from D2 and the `en-IN` literals from D8. `aria-label`s, `title`s,
and `placeholder`s count as user-facing.

### 14D — Copilot localization (the headline fix)
- Backend: `lang`/`intent` on `CopilotAskIn`; `answer_localized` on the Gemini schema;
  `COPILOT_SYSTEM_PROMPT` gains an explicit output-language instruction plus the
  do-not-translate identifier list; `COPILOT_FALLBACKS` per language; migration adding
  `copilot_messages.message_localized` (nullable text) and `lang` (varchar(2), default `"en"`).
- Router returns `message` (localized when present, else English) + `message_en` + `lang`.
- Frontend: `copilot-panel.tsx` fully keyed, chips send `intent`, timestamps via
  `formatTime`, citation source labels via `t("citations.<source_type>")`, history renders
  each message in the language it was generated in.

### 14E — Tier-2 auto-translation consistency
- `TranslatedTextBlock`: `autoTranslate` defaults to `true`; keep the manual button only
  for the ingestion raw-complaint pane (officers must see the original verbatim there).
- Add the missing `autoTranslate` at `responses/page.tsx:202` (`ai_insights`) and the
  command-center AI summary.
- Batch endpoint + write-through cache per A9; `use-translated-content.ts` gains a
  `useTranslatedContents(texts[])` variant that uses it.

### 14F — Verification
- `npm run i18n:audit` clean; `tsc --noEmit` clean; `next build` clean.
- `python -m compileall app` clean; `import app.main` OK; Alembic migration up/down.
- Manual matrix, run once per language (en, hi, gu) across all 14 routes: zero English
  leftovers in chrome, zero Hindi text while Gujarati is active, copilot answers in the
  selected language, chips work, free-text Gujarati question answered in Gujarati,
  Gemini-outage fallback still localized, dates/numbers in the right locale.

## 6. Checkpoint (Phase 14 is DONE only when all pass)

1. Select Gujarati → every visible string in the copilot panel is Gujarati, including
   the header, chips, placeholder, citation labels, and timestamp format.
2. Ask a question in Gujarati → the answer is Gujarati with citations intact and legal
   identifiers unchanged.
3. Reload the page → chat history still renders in Gujarati (persisted `message_localized`).
4. Kill the Gemini key → the copilot's fallback answer is still Gujarati.
5. Grep for Devanagari/Gujarati literals outside `lib/i18n/` returns nothing.
6. `hi.ts`/`gu.ts` are key-complete against `en.ts`.

## 7. Risks and mitigations

- **Latency/quota from auto-translating every AI block** → batch endpoint, durable
  `fallback_cache` write-through, and pre-warm Cases 1–2 before any demo.
- **Legal-identifier corruption in translated output** → existing `TRANSLATION_PROMPT`
  verbatim rules, repeated in `COPILOT_SYSTEM_PROMPT`; spot-check BNS section numbers.
- **Audit integrity** → the audit event and `copilot_messages.message` stay English (A2);
  localized text is display-only, never fed back into case artifacts.
- **`ui_rules.md` rule 7 ("Bilingual Labels") directly caused D2** → that rule is revised
  in this phase to forbid hardcoded bilingual pairs.

## 8. Non-goals

No additional languages beyond en/hi/gu. No URL-based locale routing (`/gu/...`). No
localized SSR `metadata`. No translation of seeded legal-section titles or SOP source
text (statutory text stays verbatim by design).

## 9. Sequencing

14A → 14B → (14C ∥ 14D) → 14E → 14F. 14D is the user's stated priority; it depends only
on 14A plus the `copilot` dictionary section of 14B, so it can start as soon as those land.
