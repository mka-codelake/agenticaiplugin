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

Does it impact code quality, test coverage, or architecture significantly?
    YES → WARNING
    NO  ↓

Is it a nice-to-have improvement or style preference?
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

### Test Review Findings

| Issue | Severity | Rationale |
|-------|----------|-----------|
| Testing JPA save() | CRITICAL | Framework testing violation |
| Missing tests for business logic | WARNING | Test coverage gap |
| Unclear test name | WARNING | Test quality issue |
| Could use better assertion | SUGGESTION | Optional improvement |

### Architecture Review Findings

| Issue | Severity | Rationale |
|-------|----------|-----------|
| Controller calls Repository | CRITICAL | Layer violation |
| Business logic in Controller | WARNING | Wrong layer responsibility |
| ADR violation | WARNING | Architecture compliance |
| Could use Factory pattern | SUGGESTION | Optional pattern introduction |

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

- **CRITICAL** = Must fix (security, YAGNI, framework testing, layer violations)
- **WARNING** = Should fix (code quality, coverage, architecture)
- **SUGGESTION** = Can fix (nice-to-haves, style preferences)

When in doubt, err on the side of lower severity and provide clear justification for the classification.
