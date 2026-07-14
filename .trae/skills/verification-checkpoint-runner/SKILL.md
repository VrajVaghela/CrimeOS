---
name: Verification Checkpoint Runner
description: Independently executes the exact commands listed under a checkpoint's "Verification Checkpoint" section and reports pass/fail with evidence, without trusting the generating agent's own self-report. Use this skill (ideally via a separate QA-Verification-Agent) after every checkpoint, before moving to the next one.
---

# Verification Checkpoint Runner

## Description
Every checkpoint `.md` file in `IMPLEMENTATION/STAGE_X/` ends with a **Verification Checkpoint** section containing exact `curl`, `go test`, `psql`, or `npm` commands. This skill exists so verification is treated as an independent, adversarial step — not something the same agent that wrote the code also grades — matching the checkpoint discipline in TRAE_SYSTEM_INSTRUCTIONS.md §8.

## When to Use
- After every single checkpoint, before starting the next one. This is non-negotiable — checkpoints have real dependencies (Stage 2 needs Stage 1's tables live and correct), and an unverified checkpoint compounds into a much harder bug to trace two stages later.
- Ideally invoked from a dedicated `QA-Verification-Agent` subagent (see the multi-agent setup) rather than the same agent/session that generated the code, to avoid confirmation bias.

## Instructions
1. **Extract every command** from the checkpoint file's `## Verification Checkpoint` section verbatim — do not paraphrase, substitute placeholder values without resolving them first (e.g. replace `<caseId>` with a real UUID from a prior step), or skip any command as "probably fine."
2. **Run each command for real** — actually execute `go test`, `curl`, `psql`, `npm run e2e`, etc. Do not simulate or predict the output from reading the code.
3. **Compare actual output against the stated expectation** in the checkpoint file (e.g. "expect 201 with request_number like LERS/2026/000001", "expect row_count_parsed: 1"). A command that runs without crashing but returns the wrong status code or wrong data is a FAIL, not a pass.
4. **Negative/boundary checks matter as much as happy-path ones** — many checkpoints include an explicit failure-mode check (e.g. "deliberately stop Postgres and re-curl `/api/v1/health` — response must be 503"). Skipping these because the happy path passed is not acceptable.
5. **Report format**:
   ```
   Checkpoint: <file path>
   Command: <exact command run>
   Expected: <from the .md file>
   Actual: <real output, truncated if long>
   Result: PASS | FAIL
   ```
   One block per command, in the order listed in the file.
6. **On any FAIL**: stop. Do not proceed to the next checkpoint. Report the failing command and actual output back to whichever agent (Backend-Go-Agent / Frontend-React-Agent) generated the code, with the specific mismatch — not a vague "something's wrong."
7. **On all PASS**: explicitly confirm the checkpoint is complete and state which checkpoint is next in sequence per the stage's file ordering.

## Example
```
Checkpoint: IMPLEMENTATION/STAGE_1_DATABASE_CORE_ENTITIES/02_postgres_schema_migrations.md
Command: psql "$POSTGRES_DSN" -c "\dt"
Expected: all 10 tables + schema_migrations listed
Actual: 8 tables listed — missing intelligence_flags, audit_log
Result: FAIL — migrations 0009 and 0010 did not apply; check migrate.go transaction handling
```
