---
name: Go Table-Driven Tests
description: Writes Go table-driven unit tests matching this project's mandatory testing style (see TRAE_SYSTEM_INSTRUCTIONS.md §4). Use for every service function with business logic — extraction regexes, parsers, status transitions, heuristics.
---

# Go Table-Driven Tests

## Description
Nearly every checkpoint in this project ends with "write a table-driven test covering X, Y, Z boundary cases." This skill standardizes the test shape so every `_test.go` file in the codebase looks the same, making it easy to scan for coverage gaps.

## When to Use
- Any function in `internal/entity`, `internal/lers`, `internal/dispatch`, `internal/analytics` that contains branching business logic (parsing, validation, state transitions, scoring/heuristics).
- Do NOT use for pure HTTP handler tests (those use `httptest` — see the audit-wrapped-handler skill) or trivial getters/setters.

## Instructions
1. **File naming**: `<source_file>_test.go` in the same package, same directory.
2. **Struct shape**:
   ```go
   func TestFunctionName(t *testing.T) {
       tests := []struct {
           name    string
           input   InputType
           want    OutputType
           wantErr bool
       }{
           {name: "descriptive case name", input: ..., want: ..., wantErr: false},
       }
       for _, tt := range tests {
           t.Run(tt.name, func(t *testing.T) {
               got, err := FunctionUnderTest(tt.input)
               if (err != nil) != tt.wantErr {
                   t.Fatalf("unexpected error state: %v", err)
               }
               if !reflect.DeepEqual(got, tt.want) {
                   t.Errorf("got %+v, want %+v", got, tt.want)
               }
           })
       }
   }
   ```
3. **Case naming convention**: `name` field describes the scenario in plain English ("overlapping UPI and email spans resolve to UPI", "amount field non-numeric returns row error"), not a generic "case 1" / "case 2".
4. **Always include boundary cases**, not just happy paths:
   - Off-by-one thresholds (e.g. exactly 2 vs exactly 3 repeated transactions in the heuristics engine — one must NOT trigger, the other must).
   - Malformed/partial input that should degrade gracefully (bad date in one CSV row must not abort the whole file).
   - Empty input.
   - The specific false-positive/false-negative traps called out in that checkpoint's prompt (e.g. `999.999.999.999` must not match as a valid IP).
5. **One bad row/case must never corrupt or drop a subsequent good one** — where the function under test processes a collection (CSV rows, batch entity extraction), always include a mixed-validity fixture and assert the good items are unaffected by the bad ones.
6. **No shared mutable state between subtests** — each `t.Run` gets fresh input; never reuse a package-level variable that a previous subtest mutated.
7. **Database-backed tests** (repository-layer functions): gate behind an env var, e.g. `TEST_POSTGRES_DSN`, and `t.Skip()` cleanly if unset — never fail CI/local runs just because no test DB is configured, per the pattern established in Stage 1 Checkpoint 4.
8. **Run and confirm**: `go test ./internal/<package>/... -v` shows every subtest name and a clean PASS before the checkpoint is considered complete.

## Example
For `internal/entity/extractor_test.go`, minimum required cases per the Stage 1 Checkpoint 3 spec:
- one-of-each-entity-type paragraph → all 5 found with correct type + normalized value
- UPI-shaped string must not double-classify as EMAIL or SOCIAL
- `999.999.999.999` must not match as IP
- confidence scores fall within the documented bands per type
