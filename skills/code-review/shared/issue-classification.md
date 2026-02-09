# Issue Classification Guide

Guidelines for classifying review findings by severity: Critical, Warning, or Suggestion.

---

## Critical Issues

**Definition:** Issues that MUST be fixed before deployment. These represent serious risks to security, correctness, or requirements compliance.

### When to Flag as CRITICAL

1. **Security Vulnerabilities**
   - Hardcoded credentials (passwords, API keys, secrets, tokens)
   - SQL injection risks (string concatenation in queries)
   - XSS vulnerabilities (unsanitized user input in output)
   - Missing critical input validation

2. **YAGNI Violations**
   - Code implementing features NOT in story acceptance criteria
   - Speculative features ("just in case" logic)
   - Violations of "only implement what's required" principle

3. **Framework Testing Violations**
   - Testing framework code (Spring Boot, JPA, Jackson, etc.)
   - Testing generated code (Lombok getters/setters)
   - Testing library functionality

4. **Logic Errors**
   - Incorrect algorithm implementation
   - Off-by-one errors in critical paths
   - Wrong calculation formulas

5. **Data Loss Risks**
   - Potential for data corruption
   - Missing transaction boundaries for critical operations
   - No error handling for destructive operations

6. **Layer Violations (Architecture)**
   - Controller calling Repository directly (bypassing Service)
   - Circular dependencies between packages
   - Reverse dependencies (lower layer calling higher layer)

7. **Cross-Cutting Concern Chaos**
   - No recognizable unified error handling strategy across the project
   - Same problem (error handling, validation, logging) solved in fundamentally incompatible ways

8. **Behavioral Regressions**
   - Changed return type of public method without updating all callers
   - Changed exception type that callers may be catching specifically

9. **Design Pattern Inconsistency**
   - Same problem solved 3+ completely different ways across the codebase (no strategy recognizable)
   - God Class with >10 dependencies accumulating unrelated responsibilities

10. **Missing Critical Infrastructure Tests**
    - Primary data store (main database) has no integration test
    - Core messaging system (e.g., Kafka in event-driven architecture) has no integration test

11. **Severely Outdated Dependencies**
    - Dependency 2+ major versions behind (likely missing critical security patches)
    - Known security vulnerability (CVE) in current dependency version

### CRITICAL Finding Format

```markdown
**CRITICAL:** [Short description]
- [File.java:line] Specific location and details
**Rule:** [Guideline source]
**Fix:** Clear, actionable fix description
```

### Example

```markdown
**CRITICAL:** Hardcoded API key
- [ApiClient.java:12] API_KEY = "sk_live_12345"
**Rule:** development-principles → Security
**Fix:** Move to environment variable. Use System.getenv("API_KEY").
```

---

## Warnings

**Definition:** Issues that SHOULD be fixed but don't represent immediate critical risks. These impact code quality, maintainability, or best practices adherence.

### When to Flag as WARNING

1. **Code Quality Issues**
   - Methods exceeding 50 lines
   - Classes exceeding 300 lines
   - Magic numbers (use constants)
   - Poor naming conventions

2. **Code Duplication (DRY Violations)**
   - **WARNING:** 2 occurrences of large code blocks (10+ lines)
   - **WARNING:** Medium code blocks (5-10 lines) duplicated
   - **CRITICAL:** 3+ occurrences of large duplicated blocks
   - **CRITICAL:** Duplication of critical business logic

3. **Unused & Dead Code**
   - Unused private methods (no callers within class)
   - Unused classes or interfaces (not referenced in codebase)
   - Unused packages/modules (no external imports)
   - @Deprecated elements with zero remaining callers
   - Calls to @Deprecated code (should migrate to alternative)
   - Unreachable code (after return/throw/break)
   - Commented-out code blocks

4. **Missing Requirements Traceability**
   - Business logic without story references
   - Missing WHY explanations in comments

5. **Test Coverage Gaps**
   - Business logic methods without tests
   - Missing edge case tests (null, empty, boundary)
   - Missing error case tests

6. **Test Quality Issues**
   - Tests without AAA structure (Arrange-Act-Assert)
   - Multiple unrelated assertions per test
   - Unclear test names
   - Tests with dependencies (not independent)

7. **Architecture Issues**
   - Business logic in wrong layer (e.g., in Controller)
   - ADR violations (if ADRs exist)
   - Non-RESTful API design (when REST is standard)
   - Breaking API changes without versioning

8. **Dependency Issues**
   - New dependencies without justification
   - Wrong test placement (unit test in integration directory)

9. **SOLID Violations (beyond SRP)**
   - OCP: Long switch/if-else chains on type requiring modification for each new variant
   - LSP: Subclass throwing UnsupportedOperationException for inherited methods
   - ISP: Fat interface where implementors leave methods empty
   - DIP: Business logic directly instantiating concrete infrastructure classes

10. **Cross-Cutting Concern Inconsistency**
    - Mixed error handling strategies across modules (exceptions vs. error codes vs. Optional)
    - Different logging frameworks or inconsistent formats in the same project
    - Validation approach inconsistent across layers/modules

11. **Code Smells (Fowler)**
    - Feature Envy: method uses another object's data more than its own
    - God Class: >7 dependencies, generic name, unrelated methods
    - Message Chains: >3 levels deep (Law of Demeter violation)
    - Data Clumps: same 3+ parameters in 3+ method signatures
    - Shotgun Surgery: one change requires >5 unrelated file modifications

12. **Cohesion & Coupling Issues**
    - Low cohesion: class methods operate on unrelated data subsets
    - High coupling: >10 project-internal imports, bidirectional dependencies

13. **Naming Inconsistency**
    - Inconsistent suffixes for same-layer types (Service + Manager + Handler)
    - Inconsistent verbs for same operation type (get + fetch + retrieve + load)

14. **Behavioral Changes**
    - Changed default values affecting existing behavior
    - Changed method signatures (parameter order, types, nullability)
    - Changed visibility modifiers

15. **Immutability Issues**
    - Mutable internal state exposed via getters (returning live collections)
    - Shared mutable state between threads without synchronization

16. **Infrastructure Test Gaps**
    - Secondary infrastructure component (cache, external API, file storage) has no integration test
    - Integration test uses mocks instead of real/containerized infrastructure

17. **E2E Test & Traceability Gaps**
    - Documented business case has no corresponding E2E test
    - E2E test without story/requirement reference
    - No business requirements documentation found (can't verify E2E completeness)

18. **Test Distribution Issues**
    - Complex logic (>5 conditional paths) tested only at integration/E2E level
    - Many input variations tested only via E2E tests (slow, expensive)
    - All tests are unit tests with mocks (no integration tests proving real integration works)
    - Integration/E2E tests without requirement traceability

19. **Dependency & Framework Issues**
    - Dependency 1 major version behind (stable for >6 months)
    - Dependency significantly behind on minor/patch versions
    - Code uses deprecated/legacy framework pattern when modern alternative exists
    - Inconsistent framework usage (some files modernized, others still legacy)

### WARNING Finding Format

```markdown
**WARNING:** [Short description]
- [File.java:line] Specific location and details
**Rule:** [Guideline source]
**Impact:** Why this matters
**Fix:** Recommended fix
```

### Example

```markdown
**WARNING:** Method exceeds size limit
- [UserService.java:42] Method processUser() has 67 lines (limit: 50)
**Rule:** development-principles → Code Size
**Impact:** Harder to understand and test
**Fix:** Extract validation logic to separate method validateUser()
```

---

## Suggestions

**Definition:** Optional improvements that CAN be considered but aren't required. These are nice-to-haves that might improve code but have low priority.

### When to Flag as SUGGESTION

1. **Style Preferences**
   - Alternative code organization
   - Optional refactoring for clarity
   - Preference for different design patterns

2. **Nice-to-Have Enhancements**
   - Additional documentation
   - More descriptive variable names (when current is acceptable)
   - Optional design pattern introduction

3. **Minor Improvements**
   - Cyclomatic complexity slightly elevated
   - Could extract method for small duplication
   - Alternative approaches worth considering

4. **Code Optimizations**
   - Performance improvements (when not required by story)
   - Memory optimizations (when not problematic)
   - Readability enhancements

### SUGGESTION Finding Format

```markdown
**SUGGESTION:** [Short description]
- [File.java:line] Location
**Benefit:** What would improve
**Fix (optional):** Possible approach
```

### Example

```markdown
**SUGGESTION:** Consider extracting constant
- [DiscountCalculator.java:15] Hardcoded 0.2 (20% discount rate)
**Benefit:** More readable and easier to change if discount changes
**Fix (optional):** Extract to PREMIUM_DISCOUNT_RATE = 0.2
```

---

## Classification Decision Tree

```
Is it a security vulnerability, YAGNI violation, or data loss risk?
    YES → CRITICAL
    NO  ↓

Does it violate framework testing rules or create layer violations?
    YES → CRITICAL
    NO  ↓

Is there no recognizable strategy for a cross-cutting concern (error handling, logging)?
    YES → CRITICAL
    NO  ↓

Is the same problem solved 3+ inconsistent ways, or is there a behavioral regression?
    YES → CRITICAL
    NO  ↓

Is a critical infrastructure component (primary DB, core messaging) missing integration tests?
    YES → CRITICAL
    NO  ↓

Is a dependency 2+ major versions behind or has a known CVE?
    YES → CRITICAL
    NO  ↓

Does it violate SOLID principles, show code smells, or create inconsistent cross-cutting concerns?
    YES → WARNING
    NO  ↓

Are there infrastructure test gaps, E2E coverage gaps, test distribution issues, or outdated dependencies?
    YES → WARNING
    NO  ↓

Does it impact code quality, test coverage, naming consistency, or architecture?
    YES → WARNING
    NO  ↓

Is it a nice-to-have improvement, optional pattern, or style preference?
    YES → SUGGESTION
```

---

## Special Cases

### When in Doubt

If uncertain between severities:
1. Consider impact: Would this cause production issues? → CRITICAL
2. Consider best practices: Does this violate well-known principles? → WARNING
3. Consider benefit: Is this just a preference? → SUGGESTION

### Escalation

You can escalate severity if:
- Project guidelines explicitly mark something as CRITICAL
- Security concerns warrant higher severity
- Story requirements make something mandatory

### De-escalation

You can lower severity if:
- Context justifies the approach
- Project guidelines allow exception
- Alternative solution equally valid

---

## Examples by Category

### Code Review Findings

| Issue | Severity | Rationale |
|-------|----------|-----------|
| Hardcoded password | CRITICAL | Security vulnerability |
| Large code block duplicated 3+ times | CRITICAL | Severe DRY violation |
| Large code block duplicated 2 times | WARNING | DRY violation |
| Unused private method | WARNING | Dead code, maintenance burden |
| Unused class | WARNING | Dead code, YAGNI violation |
| Unused package/module | WARNING | Dead code, entire component unused |
| @Deprecated with no callers | WARNING | Should be removed |
| Call to @Deprecated method | WARNING | Should migrate to alternative |
| Unreachable code | WARNING | Logic error or dead code |
| Commented-out code | WARNING | Should be removed |
| Method 67 lines | WARNING | Code quality issue |
| Magic number | WARNING | Code quality issue |
| Unused public method | SUGGESTION | May use reflection |
| Unused imports | SUGGESTION | Minor cleanup |
| Small pattern repeated | SUGGESTION | Minor DRY issue |
| Could extract constant | SUGGESTION | Nice-to-have |
| No error handling strategy recognizable | CRITICAL | Cross-cutting chaos |
| Same problem solved 3+ different ways | CRITICAL | Design pattern inconsistency |
| God Class >10 dependencies | CRITICAL | Severe code smell |
| Changed return type without caller update | CRITICAL | Behavioral regression |
| OCP violation (switch on type) | WARNING | SOLID violation |
| LSP violation (disabled inherited method) | WARNING | SOLID violation |
| ISP violation (fat interface) | WARNING | SOLID violation |
| Feature Envy | WARNING | Code smell |
| God Class >7 dependencies | WARNING | Code smell |
| Message chain >3 levels | WARNING | Code smell |
| Data Clumps (same params 3+ methods) | WARNING | Code smell |
| Mixed error handling strategies | WARNING | Cross-cutting inconsistency |
| Inconsistent logging format/levels | WARNING | Cross-cutting inconsistency |
| Inconsistent naming suffixes in layer | WARNING | Naming inconsistency |
| Changed default values | WARNING | Behavioral change |
| Mutable state exposed via getter | WARNING | Immutability issue |
| Low cohesion (unrelated methods) | WARNING | Cohesion issue |
| >10 project-internal imports | WARNING | Coupling issue |
| Primitive obsession | SUGGESTION | Code smell |
| Could use Builder pattern | SUGGESTION | Optional improvement |
| Dependency 2+ major versions behind | CRITICAL | Severely outdated, security risk |
| Known CVE in dependency | CRITICAL | Security vulnerability |
| Dependency 1 major version behind | WARNING | Outdated dependency |
| Legacy framework pattern in use | WARNING | Framework modernization needed |
| Inconsistent old/new framework patterns | WARNING | Partial migration |
| Newer minor/patch version available | SUGGESTION | Routine update |

### Test Review Findings

| Issue | Severity | Rationale |
|-------|----------|-----------|
| Testing JPA save() | CRITICAL | Framework testing violation |
| Missing tests for business logic | WARNING | Test coverage gap |
| Unclear test name | WARNING | Test quality issue |
| Could use better assertion | SUGGESTION | Optional improvement |
| Primary DB has no integration test | CRITICAL | Missing critical infrastructure test |
| Core messaging has no integration test | CRITICAL | Missing critical infrastructure test |
| Secondary infra has no integration test | WARNING | Infrastructure test gap |
| Documented business case has no E2E test | WARNING | E2E coverage gap |
| E2E test without requirement reference | WARNING | Missing traceability |
| No requirements documentation found | WARNING | Cannot verify E2E completeness |
| Complex logic only at integration/E2E | WARNING | Wrong test level |
| Many variations only at E2E level | WARNING | Test distribution issue |
| Integration test without requirement ref | WARNING | Missing traceability |

### Architecture Review Findings

| Issue | Severity | Rationale |
|-------|----------|-----------|
| Controller calls Repository | CRITICAL | Layer violation |
| Business logic in Controller | WARNING | Wrong layer responsibility |
| ADR violation | WARNING | Architecture compliance |
| Same problem solved 3+ ways | CRITICAL | Pattern inconsistency |
| Unnecessary Singleton/pattern | WARNING | Over-engineering |
| Missing Strategy pattern (clear trigger) | WARNING | Pattern opportunity |
| Missing Template Method (clear trigger) | WARNING | Pattern opportunity |
| Could use Factory pattern | SUGGESTION | Optional pattern introduction |
| Could use Builder pattern | SUGGESTION | Optional pattern introduction |

---

## Reporting Guidelines

### Grouping Findings

In the review report, group findings by:
1. **Severity first** (Critical → Warning → Suggestion)
2. **Review type second** (Code Review / Test Review / Architecture Review)

### Example Report Structure

```markdown
## Critical Issues

### Code Review
- [Finding 1]
- [Finding 2]

### Test Review
- [Finding 3]

## Warnings

### Code Review
- [Finding 4]

### Architecture Review
- [Finding 5]

## Suggestions

### Code Review
- [Finding 6]
```

---

## Remember

- **CRITICAL** = Must fix (security, YAGNI, framework testing, layer violations, cross-cutting chaos, behavioral regressions, pattern inconsistency 3+ ways, missing critical infrastructure tests, severely outdated dependencies/CVEs)
- **WARNING** = Should fix (SOLID violations, code smells, cross-cutting inconsistency, cohesion/coupling, naming inconsistency, behavioral changes, infrastructure/E2E test gaps, test distribution issues, outdated dependencies, legacy framework patterns, code quality, coverage, architecture)
- **SUGGESTION** = Can fix (optional patterns, primitive obsession, routine dependency updates, nice-to-haves, style preferences)

When in doubt, err on the side of lower severity and provide clear justification for the classification.
