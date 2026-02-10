# Review Best Practices

Guidelines for conducting high-quality, effective code reviews.

---

## 1. Accuracy

### Be Precise

**Always provide:**
- Exact file names (not "the controller" but "UserController.java")
- Exact line numbers ([UserController.java:42])
- Specific code references (quote actual code when relevant)

**Bad Example:**
```markdown
The controller has a security issue.
```

**Good Example:**
```markdown
**CRITICAL:** Hardcoded API key
- [UserController.java:15] API_KEY = "sk_live_12345"
```

### Cite Sources

**Always reference:**
- Specialist rules and project guidelines
- Project guidelines (claudedocs/guidelines/exception-handling.md)
- Skill sources

**Bad Example:**
```markdown
This violates best practices.
```

**Good Example:**
```markdown
**Rule:** Code Quality → YAGNI (Rule 6.1)
**Source:** claudedocs/guidelines/coding-standards.md → Section 2.3
```

### Verify Before Flagging

**Check:**
- File actually exists at specified path
- Line number is correct
- Issue actually exists (not a false positive)
- Guideline actually says what you claim

---

## 2. Context Awareness

### Understand Design Decisions

**Consider:**
- Why might developer have chosen this approach?
- Are there valid tradeoffs?
- Is this a conscious decision vs. oversight?

**Bad Example:**
```markdown
**WARNING:** Not using Stream API
- [UserService.java:42] Uses for-loop instead of Stream
```

**Good Example:**
```markdown
**SUGGESTION:** Consider Stream API for readability
- [UserService.java:42] Traditional for-loop works but Stream might be more readable
**Note:** Performance difference negligible for this use case
**Fix (optional):** items.stream().filter(...).collect(...)
```

### Consider Broader Context

**Look at:**
- Surrounding code
- Related classes
- Project conventions
- Story requirements

**Don't:**
- Review in isolation without understanding purpose
- Apply rules mechanically without context
- Ignore project-specific conventions

### Respect Story Scope

**Remember:**
- Only flag missing features if they're in story requirements
- Don't demand features not in acceptance criteria
- Respect YAGNI principle yourself

**Bad Example:**
```markdown
**WARNING:** Missing password reset functionality
```

**Good Example (only if in story):**
```markdown
**WARNING:** Missing required password reset
- [Story AC-3] "Users can reset password via email"
- No reset functionality implemented
```

---

## 3. Actionability

### Describe the Issue Clearly

**Explain:**
- **WHAT** is wrong
- **WHY** it's a problem
- **HOW** to fix it

**Bad Example:**
```markdown
Bad code here.
```

**Good Example:**
```markdown
**CRITICAL:** SQL injection vulnerability
- [UserController.java:25] String concatenation in SQL query
**WHY:** Allows attackers to inject malicious SQL
**HOW:** User input "'; DROP TABLE users; --" would execute
**Fix:** Use PreparedStatement with parameterized query
```

### Provide Specific Fixes

**Give:**
- Concrete code examples when helpful
- Step-by-step fix instructions
- Alternative approaches if multiple solutions exist

**Bad Example:**
```markdown
Fix the validation.
```

**Good Example:**
```markdown
**Fix:** Add null check and length validation:
```java
if (email == null || email.isEmpty()) {
    throw new IllegalArgumentException("Email required");
}
if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
    throw new IllegalArgumentException("Invalid email format");
}
```
```

### Explain Impact

**For Warnings and Suggestions:**
- Explain WHY this matters
- Describe consequences if not fixed
- Quantify impact when possible

**Example:**
```markdown
**WARNING:** Method exceeds size limit
- [UserService.java:42] processUser() has 67 lines (limit: 50)
**Impact:**
- Harder to understand (cognitive load)
- Harder to test (many paths)
- Harder to maintain (multiple responsibilities)
**Fix:** Extract validation to validateUser(), calculation to calculateDiscount()
```

---

## 4. Conciseness

### One Finding Per Issue

**Don't combine multiple issues:**

**Bad:**
```markdown
**WARNING:** Multiple issues in UserService
- Method too long
- Missing validation
- Poor naming
- No comments
```

**Good:**
```markdown
**WARNING:** Method exceeds size limit
- [UserService.java:42] processUser() has 67 lines

**WARNING:** Missing input validation
- [UserService.java:45] No null check for email parameter

**SUGGESTION:** Unclear method name
- [UserService.java:42] processUser() doesn't convey what processing occurs
```

### Group Related Issues

**When appropriate, group related findings:**

```markdown
**WARNING:** Multiple SQL injection risks in UserController
- [UserController.java:25] searchUsers() concatenates SQL
- [UserController.java:42] filterUsers() concatenates SQL
- [UserController.java:58] sortUsers() concatenates SQL
**Fix:** All three methods need PreparedStatement conversion
```

### Focus on Important Problems

**Prioritize:**
- Security issues over style
- Correctness over preferences
- Requirements violations over nice-to-haves

**Don't:**
- Nitpick every minor style choice
- Flag 50 suggestions when 3 critical issues exist
- Overwhelm with low-value findings

**Balance:**
- 5-10 findings total is usually sufficient
- More Criticals = fewer Suggestions
- Focus on teachable moments

---

## 5. Professional Tone

### Be Respectful

**Use neutral, professional language:**

**Bad:**
```markdown
This is terrible code. What were you thinking?
```

**Good:**
```markdown
**WARNING:** This approach has security risks. Consider using PreparedStatement instead.
```

### Be Constructive

**Focus on improvement:**

**Bad:**
```markdown
You clearly don't understand Spring Boot.
```

**Good:**
```markdown
**INFO:** Spring Boot provides built-in validation. See @Valid annotation.
**Benefit:** Less code, standard approach, better error messages
```

### Assume Good Intent

**Remember:**
- Developer likely had reasons for approach
- Time pressure may have influenced decisions
- Learning opportunities benefit everyone

---

## 6. Guideline Priority

### Project Guidelines Override Skills

**Always prioritize:**
1. **Highest:** `claudedocs/guidelines/*.md` (project-specific rules)
2. **High:** `claudedocs/adrs/*.md` (documented architecture decisions)
3. **Medium:** Story acceptance criteria
4. **Lowest:** Skill guidelines (generic best practices)

**When conflict:**
```markdown
**Note:** This violates generic best practice but follows project guideline (exception-handling.md). No issue.
```

**When ADR conflict:**
```markdown
**Note:** This contradicts ADR-003 (Event Sourcing for Orders). Flagged as WARNING.
```

### Cite Correctly

**When project guideline exists:**
```markdown
**Rule:** claudedocs/guidelines/exception-handling.md → ErrorCode First
```

**When ADR exists:**
```markdown
**Rule:** claudedocs/adrs/ADR-003-event-sourcing.md → Event Sourcing for Order Domain
```

**When only skill guideline:**
```markdown
**Rule:** SOLID → SRP (Rule 5.1)
```

**When both apply:**
```markdown
**Rule:** claudedocs/guidelines/coding-standards.md (overrides skill)
```

---

## 7. What NOT to Do

### Don't Review Code You Don't Understand

**If unsure:**
- Ask clarifying questions
- State assumptions explicitly
- Lower severity (SUGGESTION vs WARNING)

### Don't Enforce Personal Preferences

**Unless:**
- It's in project guidelines
- It's a well-established best practice
- It impacts security/correctness

### Don't Demand Perfection

**Remember:**
- Code doesn't need to be perfect
- Some tradeoffs are acceptable
- Story requirements are the standard

### Don't Overwhelm

**Limit:**
- Total findings to 10-15 maximum
- Focus on high-value issues
- Group related issues

---

## Example: Good vs Bad Review

### Bad Review

```markdown
## Code Review

Your code has problems.

- UserService is bad
- Tests are wrong
- You're not following best practices
- Fix everything
```

### Good Review

```markdown
## Code Review Report

**Files Reviewed:** 3
**Review Types:** Code Review, Test Review
**Findings:** 2 Critical, 3 Warnings, 1 Suggestion

---

### Critical Issues

#### Code Review
**CRITICAL:** SQL injection vulnerability
- [UserController.java:25] String concatenation in query: "SELECT * FROM users WHERE email = '" + email + "'"
**Rule:** Security & Data Safety (Specialist 02)
**Fix:** Use PreparedStatement:
```java
PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE email = ?");
stmt.setString(1, email);
```

#### Test Review
**CRITICAL:** Testing framework code
- [UserServiceTest.java:15] Testing JPA save() method
**Rule:** Test Quality → Framework Testing (Rule 9.1)
**Fix:** Remove test. JPA save is tested by Hibernate team.

---

### Warnings

**WARNING:** Method exceeds size limit
- [UserService.java:42] processUser() has 67 lines (limit: 50)
**Rule:** Code Quality → Code Size (Rule 6.2)
**Impact:** Harder to understand and test
**Fix:** Extract validation to validateUser(), discount calculation to calculateDiscount()

[... more findings ...]

---

### Summary
- **Critical:** 2 issues requiring immediate fixes
- **Warnings:** 3 items needing attention
- **Suggestions:** 1 optional improvement
```

---

## Summary Checklist

Before submitting review:

- [ ] All findings have exact file names and line numbers
- [ ] All findings cite specific guidelines/rules
- [ ] Critical issues have clear, actionable fixes
- [ ] Warnings explain impact
- [ ] Suggestions note they're optional
- [ ] No personal preferences without justification
- [ ] Findings respect story scope (no YAGNI violations in review itself)
- [ ] Professional, respectful tone throughout
- [ ] Focus on high-value issues (not overwhelmed with nitpicks)
- [ ] Project guidelines respected over skill guidelines
