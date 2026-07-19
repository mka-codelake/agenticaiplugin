---
description: Guidance for writing good tests, applied WHILE creating or modifying tests. Use when writing, adding, or modifying tests or test files — e.g. "schreib Tests dafür", "add tests", "unit test for this", "write a test", "Testfälle ergänzen", "cover this with tests". Language-agnostic; captures the test-writing rules Claude does not already apply by default.
model: haiku
effort: low
---

# Writing Tests

Applies when you are creating or changing tests. These are the points that are **not**
already default behavior — keep them in mind while writing tests.

## Test YOUR code, not THE code

Test business logic, algorithms, validators, custom queries, and custom infrastructure
(e.g. retry/fallback logic). Do **not** test framework code, framework configuration,
generated code (ORM/codegen/boilerplate), or third-party libraries — that is testing
someone else's code.

When you intentionally skip a test, document why inline: `// No test: [reason]`.

## Test through the public API — never widen it for testability

- Test only through the public API of the unit under test.
- Do **not** widen the API surface just to make something testable (no making private
  members package-private/protected/public, no test-only accessors or getters).
- If internal logic is complex enough to need its own tests, that is a design signal:
  extract it into its own unit with its own public API, then test *that*.

## Related

- **qa** — analyzes existing test *coverage* and requirement→test traceability (a
  "Quality Square"); this skill is about *writing* the tests themselves — no overlap.
- **code-review** — finds bugs and reviews changes; run it after implementing.
