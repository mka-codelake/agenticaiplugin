# ID Conventions

## Format

| Artifact | Pattern | Example |
|----------|---------|---------|
| Requirement | `REQ-NNN` | REQ-001, REQ-042 |
| Test Case | `TC-NNN` | TC-001, TC-042 |

- Zero-padded, 3 digits (expandable to 4 when exceeding 999)
- Auto-incrementing within each artifact type

## Rules

1. **Immutable** — once assigned, an ID never changes meaning
2. **Never recycled** — retired IDs are preserved with Status: RETIRED
3. **Sequential** — new IDs = max existing ID + 1
4. **First run** — start at 001
5. **Subsequent run** — continue from highest existing ID + 1

## Retirement

When a requirement or test case becomes obsolete:
- Set Status to `RETIRED`
- Keep the row in the catalog (preserves audit trail)
- Never reassign the ID to a new artifact
