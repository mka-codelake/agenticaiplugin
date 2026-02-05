---
name: architecture-decisions
description: Creates and manages Architectural Decision Records (ADRs). Use PROACTIVELY when user mentions "ADR", "architecture decision", "design decision", "why did we choose", or discusses significant technical choices. ALWAYS document major architectural decisions.
user-invocable: false
---

Use this skill when creating or managing Architectural Decision Records (ADRs) to document important architectural and design decisions.

---

## What are ADRs?

**Architectural Decision Records (ADRs)** are lightweight documents that capture:
- **What** architectural decision was made
- **Why** it was made (context and problem)
- **What alternatives** were considered
- **What consequences** (positive and negative) result from the decision

ADRs provide a historical record of architectural thinking, making it easier for teams to understand past decisions and adapt to future changes.

---

## ADR File Structure

All ADRs are stored in the `claudedocs/` directory:

```
claudedocs/
└── adrs/          # Architectural Decision Records (ADR-XXX-description.md)
```

**Important:** The `claudedocs/adrs/` folder is automatically created if it doesn't exist.

---

## File Naming Convention

**Format:** `ADR-[ID]-[description].md`

- **IDs:** Zero-padded numbers (001, 002, 003, ...)
- **Description:** lowercase-with-dashes
- **Examples:**
  - `ADR-001-database-selection.md`
  - `ADR-002-api-architecture.md`
  - `ADR-003-authentication-strategy.md`

**Always use forward slashes (/) in paths, even on Windows.**

---

## ADR Creation

**When to use:** User says "create ADR", "document decision", "architecture decision", "design decision"

**Template:** `templates/adr.md.j2`

**Required fields:**
- **ID** (auto-increment: ADR-001, ADR-002, ...)
- **Title** (clear decision statement, e.g., "Use PostgreSQL for User Data Storage")
- **Status** (Proposed, Accepted, Deprecated, Superseded)
- **Date** (ISO format: YYYY-MM-DD)
- **Context** (problem statement, background, why this decision is needed)
- **Decision** (the specific architectural choice made)
- **Consequences:**
  - **Positive** (benefits of the decision)
  - **Negative** (tradeoffs, costs, limitations)
  - **Neutral** (other impacts, optional)
- **Alternatives Considered** (other options evaluated, with pros/cons)

**Optional fields:**
- **Related Stories** (links to `claudedocs/stories/`)
- **Related Epics** (links to `claudedocs/epics/`)
- **Related Decisions** (links to other ADRs)
- **Implementation Notes** (technical details, optional)
- **Review Date** (when to retrospectively review the decision)

**File location:** `claudedocs/adrs/ADR-[ID]-[description].md`

---

## ADR Numbering Logic

**Auto-increment:**
1. Scan `claudedocs/adrs/` for existing ADR files
2. Find highest ADR number (e.g., ADR-003)
3. New ADR number = highest + 1 (e.g., ADR-004)
4. If no ADRs exist, start with ADR-001

**Example:**
```
Existing ADRs:
- ADR-001-database-selection.md
- ADR-002-api-architecture.md
- ADR-003-authentication-strategy.md

Next ADR: ADR-004
```

---

## ADR Status Lifecycle

ADRs follow a status lifecycle to track their evolution:

### 1. Proposed

**When:** Decision is being considered but not yet finalized

**Characteristics:**
- Discussion ongoing
- Alternatives still being evaluated
- Team has not committed to decision

**Transition:** Proposed → Accepted (when decision is finalized and approved)

### 2. Accepted

**When:** Decision is finalized and approved for implementation

**Characteristics:**
- Decision is official
- Implementation can proceed
- This is the "active" status for most ADRs

**Transition:**
- Accepted → Deprecated (decision no longer recommended but still in use)
- Accepted → Superseded (decision replaced by newer ADR)

### 3. Deprecated

**When:** Decision is no longer recommended but still exists in codebase

**Characteristics:**
- Decision was valid but is now outdated
- Code using this decision still exists but should be migrated
- New code should NOT follow this decision

**Example:** "Use REST API" deprecated in favor of "Use GraphQL" but REST endpoints still exist

**Transition:** Deprecated → (eventually removed when all code migrated)

### 4. Superseded

**When:** Decision is replaced by a new ADR

**Characteristics:**
- A new ADR replaces this one
- Link to superseding ADR (ADR-XXX supersedes this ADR)
- This ADR is kept for historical reference

**Example:** ADR-001 "Use MySQL" superseded by ADR-005 "Use PostgreSQL"

**In ADR file:**
```markdown
# ADR-001: Use MySQL for User Data

**Status:** Superseded
**Superseded by:** [ADR-005](ADR-005-use-postgresql.md)
```

---

## When to Create ADRs

Create an ADR when making decisions that:

**1. Have long-term impact**
- Database selection (PostgreSQL vs. MySQL vs. MongoDB)
- Framework choice (Spring Boot vs. Micronaut vs. Quarkus)
- Architecture pattern (Microservices vs. Monolith vs. Modular Monolith)
- Authentication strategy (JWT vs. Session vs. OAuth)

**2. Are hard to reverse**
- Cloud provider selection (AWS vs. Azure vs. GCP)
- Programming language choice
- Data storage format (SQL vs. NoSQL)
- API style (REST vs. GraphQL vs. gRPC)

**3. Affect multiple teams/components**
- Cross-cutting concerns (logging, monitoring, security)
- Shared infrastructure decisions
- Integration patterns

**4. Have significant tradeoffs**
- Performance vs. maintainability
- Cost vs. scalability
- Complexity vs. flexibility

**Don't create ADRs for:**
- ❌ Trivial decisions (naming conventions, code formatting)
- ❌ Obvious choices (use version control, write tests)
- ❌ Implementation details (specific algorithms, data structures)
- ❌ Temporary workarounds

---

## ADR Template Usage

**Use the Jinja2 template** `templates/adr.md.j2` for consistency.

**Example rendering:**

```python
template_data = {
    "id": "001",
    "title": "Use PostgreSQL for User Data Storage",
    "status": "Accepted",
    "date": "2025-01-15",
    "context": "We need a relational database for user data with strong ACID guarantees...",
    "decision": "We will use PostgreSQL 15 as our primary database for user data.",
    "positive_consequences": [
        "Strong ACID compliance ensures data integrity",
        "Rich ecosystem of extensions (PostGIS, pg_trgm, etc.)",
        "Excellent performance for complex queries"
    ],
    "negative_consequences": [
        "Higher operational complexity than managed services",
        "Requires PostgreSQL expertise on team"
    ],
    "alternatives": [
        {
            "name": "MySQL",
            "description": "Popular open-source relational database",
            "pros": ["Simpler replication", "Larger community"],
            "cons": ["Weaker transaction support", "Less advanced features"]
        },
        {
            "name": "MongoDB",
            "description": "Document-oriented NoSQL database",
            "pros": ["Schema flexibility", "Horizontal scaling"],
            "cons": ["No ACID across documents", "Eventual consistency"]
        }
    ]
}
```

---

## Integration with Agile Workflow

ADRs integrate with Stories and Epics:

### From Stories

**Stories can reference ADRs** in their "Design Decisions" section:

```markdown
## Design Decisions

This story implements the authentication strategy defined in:
- [ADR-003](../adrs/ADR-003-authentication-strategy.md) - Use JWT for stateless authentication
```

### From ADRs

**ADRs can reference Stories/Epics** that triggered the decision:

```markdown
## Related Stories

- [STORY-012](../stories/STORY-012-user-authentication.md) - User Authentication
- [STORY-015](../stories/STORY-015-api-security.md) - API Security
```

### Workflow

1. **During Story Implementation:** Architectural question arises
2. **Create ADR:** Document decision, context, alternatives
3. **Link ADR from Story:** Reference ADR in story's Design Decisions section
4. **Implement Story:** Follow the decision documented in ADR

---

## Superseding ADRs

When an architectural decision changes, **supersede** the old ADR rather than editing it:

**Steps:**

1. **Create new ADR** with updated decision:
   - Status: "Proposed" or "Accepted"
   - Supersedes: `[ADR-001](ADR-001-old-decision.md)`

2. **Update old ADR** status:
   - Status: "Superseded"
   - Superseded by: `[ADR-005](ADR-005-new-decision.md)`

**Example:**

**ADR-001-use-mysql.md** (old):
```markdown
# ADR-001: Use MySQL for User Data

**Status:** Superseded
**Superseded by:** [ADR-005](ADR-005-use-postgresql.md)
**Date:** 2024-06-01

## Context
We chose MySQL for its simplicity and community support.

## Decision
Use MySQL 8.0 for user data storage.

[...rest of ADR...]
```

**ADR-005-use-postgresql.md** (new):
```markdown
# ADR-005: Use PostgreSQL for User Data

**Status:** Accepted
**Supersedes:** [ADR-001](ADR-001-use-mysql.md)
**Date:** 2025-01-15

## Context
After 6 months with MySQL, we encountered limitations with complex queries
and need better JSON support. PostgreSQL addresses these issues.

## Decision
Migrate from MySQL to PostgreSQL 15 for user data storage.

[...rest of ADR...]
```

**Why not edit the original ADR?**
- Preserves historical context (why MySQL was chosen initially)
- Shows evolution of architectural thinking
- Explains why the decision changed

---

## Progressive Disclosure

For detailed guidance on ADR best practices, examples, and anti-patterns, see `reference.md`.

Only load `reference.md` when user asks for:
- "ADR best practices"
- "ADR examples"
- "How to write good ADRs?"
- "When should I create an ADR?"
- Detailed guidance on superseding/deprecating ADRs

Otherwise, keep context lean.

---

**This skill activates automatically when user mentions: ADR, architecture decision, architectural decision, design decision, document decision, create ADR.**
