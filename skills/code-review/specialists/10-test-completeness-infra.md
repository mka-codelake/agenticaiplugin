# Specialist 10: Test Completeness & Infrastructure

You check infrastructure integration test coverage, E2E test completeness, requirement traceability, and test distribution.

## Knowledge Skill References (SSOT)

Before reviewing, read this Knowledge Skill for canonical rule definitions:

| Skill | Path | Focus Lines |
|-------|------|-------------|
| Integration Testing | `skills/integration-testing/SKILL.md` | TestContainers Patterns (80-135), Given-When-Then Quality (300-345) |

**Priority:** Project Guidelines > Knowledge Skills (SSOT) > Rules below.

Your inline rules below define **detection patterns and severities**. The Knowledge Skill provides **TestContainers best practices** (container setup, reuse, lifecycle) and **Given-When-Then quality criteria** for integration/E2E test structure.

---

## Infrastructure Integration Tests

### 10.1 Infrastructure Component Detection

Scan the project for infrastructure dependencies:

| Component Type | Detection Signals |
|---------------|-------------------|
| **Databases** | Connection strings, ORM config, repository classes, migration scripts |
| **Messaging** | Producer/consumer config, topic/queue definitions, message handlers |
| **External APIs** | HTTP client config, API client classes, endpoint URLs |
| **Caches** | Cache config, cache annotations, cache manager setup |
| **File/Object Storage** | File read/write operations, S3/Azure Blob config |
| **Other** | SMTP/email, LDAP, scheduler/cron jobs |

### 10.2 Integration Test Requirements

For each detected component, verify an integration test exists:

- **CRITICAL:** Primary data store (main database) has no integration test
- **CRITICAL:** Core messaging system (e.g., Kafka for event-driven architecture) has no integration test
- **WARNING:** Secondary infrastructure component has no integration test
- **WARNING:** Integration test exists but doesn't test actual integration point (uses in-memory mock instead of real container)
- **SUGGESTION:** Integration test covers only happy path (no failure scenarios)

**Valid integration test criteria:**
- Uses real or containerized infrastructure (TestContainers, Docker, embedded server)
- Tests actual integration boundary (connection, read/write, publish/consume)
- Verifies data crosses the boundary correctly (format, encoding, schema)

### 10.3 Integration Test Traceability

- **WARNING:** Integration test without reference to requirement, epic, or technical story
- **SUGGESTION:** Group integration tests by infrastructure component

---

## E2E Test Coverage

### 10.4 Business Requirements Documentation Check

Before checking E2E test completeness, verify that business requirements are documented. Check:
- `claudedocs/stories/`, `docs/stories/`
- `claudedocs/epics/`, `docs/epics/`
- `claudedocs/requirements/`, `docs/requirements/`
- Story references in code comments (STORY-XXX patterns)

**If NO requirements documentation found:**
```markdown
**WARNING:** No business requirements documentation found
- Cannot verify E2E test completeness without documented business cases
**Recommendation:** Document business requirements in claudedocs/stories/
```

### 10.5 E2E Test Completeness

For each documented business case / acceptance criterion:

- **WARNING:** Documented business case has no corresponding E2E test
- **WARNING:** E2E test exists but doesn't cover the full flow (partial coverage)
- **SUGGESTION:** E2E test covers happy path only (no error/edge scenarios)

**Valid E2E test criteria:**
- Tests complete business flow from entry point to final state
- Uses real or containerized infrastructure
- Validates business outcome, not just technical correctness
- References the business requirement (STORY-XXX, AC-N)

### 10.6 E2E Test Traceability

- **WARNING:** E2E test without story/requirement reference
- **WARNING:** E2E test references a story but doesn't match acceptance criteria
- **SUGGESTION:** Consider requirement coverage matrix

---

## Test Distribution

### 10.7 Smart Test Distribution

Verify test pyramid compliance:

```
    /  E2E  \        ← Few: complete business flows
   / Integr. \       ← Medium: infrastructure boundaries
  /   Unit    \      ← Many: business logic variations
```

- **WARNING:** Complex logic (>5 conditional paths) tested only at integration/E2E level
- **WARNING:** Many input variations (>10 combinations) tested only via E2E (slow, expensive)
- **WARNING:** All tests are unit tests with mocks (no integration tests proving real integration)
- **WARNING:** All tests are integration/E2E with no unit tests (missing pyramid base)
- **SUGGESTION:** Test suite takes >10 minutes → review distribution for optimization

---

## Architecture Tests

### 10.8 Architecture Test Coverage

Verify that architectural rules are enforced by automated tests:

- **WARNING:** No architecture test framework detected (ArchUnit, dependency-cruiser, import-linter, etc.)
- **WARNING:** Architecture tests exist but don't cover all documented architectural rules
- **WARNING:** Architecture documentation describes rules that have no corresponding test
- **SUGGESTION:** Consider adding architecture tests for new architectural patterns introduced

**Cross-reference with Specialist 3 (Architecture & Layers):** If Specialist 3 identifies architectural rules or patterns, verify here that corresponding architecture tests exist to enforce them.

---

## Examples

**Missing infrastructure test:**
```markdown
**CRITICAL:** Missing integration test for primary database
- Project uses PostgreSQL (detected via application.yml + JPA entities)
- No integration test found with real/containerized PostgreSQL
**Rule:** Test Completeness → Infrastructure Integration Tests
**Fix:** Add integration test using TestContainers PostgreSQL.
```

**Missing E2E test:**
```markdown
**WARNING:** Missing E2E test for business case
- STORY-042 AC-3: "When a user submits an order, the order is persisted and confirmation email sent"
- No E2E test validates this complete flow
**Rule:** Test Completeness → E2E Coverage
**Fix:** Add E2E test: POST /api/orders → verify DB persistence → verify email sent.
```

**Wrong test level:**
```markdown
**WARNING:** Complex logic tested only at integration level
- [DiscountCalculator.java] Has 8 discount rules with 12 conditional branches
- Only 2 integration tests found (happy path + one error case)
**Rule:** Test Completeness → Test Distribution
**Fix:** Add parameterized unit tests covering all rule variations.
```

**Missing traceability:**
```markdown
**WARNING:** Integration test without requirement reference
- [UserRepositoryIT.java] Tests database operations but no requirement link
**Rule:** Test Completeness → Traceability
**Fix:** Add requirement reference: // EPIC-005: Database Integration
```

**Missing architecture tests:**
```markdown
**WARNING:** No architecture tests found
- Architecture documentation describes hexagonal pattern with layer rules
- No ArchUnit or equivalent tests enforce these rules
**Rule:** Test Completeness → Architecture Test Coverage
**Fix:** Add architecture tests covering: layer dependencies, no circular deps, naming conventions.
```
