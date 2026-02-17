# ID Conventions

## Format

### Default Format (first-run, no existing IDs)

| Artifact | Pattern | Example |
|----------|---------|---------|
| Requirement | `REQ-NNN` | REQ-001, REQ-042 |
| Test Case | `TC-NNN` | TC-001, TC-042 |

- Zero-padded, 3 digits (expandable to 4 when exceeding 999)
- Auto-incrementing within each artifact type

### Existing IDs (migration from pre-existing files)

When migrating an existing requirements or test-cases file, **preserve the original IDs** instead of renumbering to REQ-NNN / TC-NNN. This avoids breaking code-side references (comments like `// DB-01`, `// ST-ERR-02`, etc.).

Accepted existing ID patterns:
- Component-prefixed: `DB-01`, `ST-ERR-02`, `CLI-17`, `MG-01`
- Test-case-prefixed: `TC-CLI-01`, `TC-ST-12`, `TC-SE-18`
- Any `PREFIX-NNN` or `PREFIX-SUBPREFIX-NNN` pattern

For **new entries** added in subsequent runs after migration, continue the existing scheme if the pattern is clear (e.g., next after `DB-15` is `DB-16`). If ambiguous, fall back to `REQ-NNN` / `TC-NNN`.

## Rules

1. **Immutable** — once assigned, an ID never changes meaning
2. **Never recycled** — retired IDs are preserved with Status: RETIRED
3. **Sequential** — new IDs = max existing ID + 1
4. **First run** — start at 001 (or preserve existing IDs if migrating)
5. **Subsequent run** — continue from highest existing ID + 1
6. **Never rename** — do not convert existing IDs to a different format (e.g., DB-01 → REQ-001)

## Retirement

When a requirement or test case becomes obsolete:
- Set Status to `RETIRED`
- Keep the row in the catalog (preserves audit trail)
- Never reassign the ID to a new artifact
