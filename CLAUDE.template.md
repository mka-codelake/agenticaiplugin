# Project Instructions for Claude Code

This file contains project-specific instructions for Claude Code when using the AgenticAI Plugin.

## Automatic Code Review After Task Completion

After completing any self-contained implementation task (Story, Feature, Bug-Fix, etc.), you MUST automatically perform a code review before reporting completion to the user.

### When to Trigger Code Review

Perform automatic code review when:
- ✅ You have completed a full story/task implementation
- ✅ All tests are passing (green)
- ✅ The code is functionally complete
- ✅ You would normally tell the user "I'm done"

Do NOT trigger if:
- ❌ User explicitly said "skip review" or "no review"
- ❌ Only reading/analyzing code (no changes made)
- ❌ Only documentation changes
- ❌ Partial/incomplete implementation

### Code Review Process

**1. Identify Changed Files**

Track all code files you created or modified during the task:
- Include: .java, .kt, .scala, .py, .js, .ts, .go, etc.
- Include: Test files
- Exclude: Configuration files (unless specifically reviewing config)

**2. Invoke the code-reviewer Agent**

Use the Task tool to launch the code-reviewer agent:

```
Task(
  subagent_type: "code-reviewer",
  description: "Review implementation",
  prompt: "
    Review the following files for code quality issues:

    Files:
    - {list all modified files}

    Instructions:
    1. Load all project guidelines from claudedocs/guidelines/*.md
    2. Activate relevant development skills (development-principles, java-best-practices, spring-boot-best-practices, etc.)
    3. Review each file against all applicable rules
    4. Remember: Project guidelines override skill guidelines when conflicts occur
    5. Generate a structured finding report with Critical/Warning/Suggestion categories
    6. Include specific file:line references and rule sources for each finding

    Provide only the finding report, no code fixes.
  "
)
```

**3. Process the Finding Report**

After receiving the report from the code-reviewer agent:

1. **Analyze findings in context:**
   - Understand each issue
   - Consider the specific implementation context
   - Evaluate if the finding is valid for this situation

2. **Make decisions:**
   - **Critical issues:** Almost always fix (unless exceptionally justified)
   - **Warnings:** Fix if reasonable, or document why it's acceptable
   - **Suggestions:** Use judgment - fix if it improves code quality

3. **You have final authority:**
   - If a finding doesn't make sense in context, you can skip it
   - Always provide a brief justification if skipping Critical/Warning items
   - Example: "Skipping 'method too long' warning - complex business logic requires this structure for clarity"

**4. Apply Fixes**

For findings you decide to address:
- Fix the issues in the code
- Use Edit tool for modifications
- Ensure tests still pass after fixes

**5. Complete Review Cycle**

Important: **ONE review round only** (not iterative)

- Fix the issues you've identified
- Do NOT trigger another review automatically
- Report to user with summary

**6. Report to User**

Only after code review is complete, inform the user:

```
Task completed successfully.

Code review performed:
- Files reviewed: {count}
- Critical issues: {count} (all fixed)
- Warnings: {count} ({fixed} fixed, {skipped} justified)
- Suggestions: {count} (applied {count})

{If any issues were skipped, briefly explain why}

Ready for commit/next steps.
```

### Example Workflow

```
User: "Implement Story-42: Add user authentication"

You:
  [Implement UserService.java]
  [Implement UserController.java]
  [Write tests]
  [Run tests - all pass]

  [Internal decision: Task complete, trigger code review]

  [Launch code-reviewer agent]
  [Receive findings:
    - Critical: Missing ErrorCode in exception
    - Warning: Log level should be DEBUG
  ]

  [Evaluate: Both valid, will fix]
  [Fix UserService.java line 42 - add ErrorCode]
  [Fix UserController.java line 23 - change log level]
  [Tests still pass]

  [Now report to user]

You → User:
  "Story-42 implementation completed.

  Code review performed:
  - 2 files reviewed
  - 1 Critical issue fixed (ErrorCode)
  - 1 Warning addressed (log level)

  Ready for commit."
```

### Important Principles

1. **One review round:** Fix issues once, don't loop infinitely
2. **Context matters:** You can override findings if contextually justified
3. **Always explain skips:** If you skip a Critical/Warning, briefly say why
4. **Silent to user:** Don't mention "starting code review" - just do it before reporting completion
5. **Project guidelines win:** The code-reviewer knows this, trust its priority logic

### Manual Review

Users can also trigger reviews manually:
```
cc-code-review <file>
```

This is independent of automatic reviews and doesn't require you to do anything special.

---

## Project-Specific Guidelines

If this project has custom coding guidelines, they should be placed in:

```
claudedocs/guidelines/
```

Any `.md` files in that directory will be loaded by the code-reviewer agent and applied during reviews.

**Priority:** Project guidelines ALWAYS override generic skill guidelines when conflicts occur.

Examples of guideline files:
- `exception-handling.md` - Custom exception patterns
- `logging-standards.md` - Project logging rules
- `code-style.md` - Project-specific style beyond language standards
- `architecture-patterns.md` - Architectural rules and patterns

The code-reviewer agent automatically discovers and applies all guidelines in that directory.

---

## CRITICAL: Protected Test Directories

⛔ **NEVER modify tests in these directories unless you are the test-engineer agent:**

```
src/test/java/integration/**
src/test/java/system/**
src/test/java/e2e/**
```

Or equivalent paths for other languages:
```
src/test/python/integration/**
src/test/python/system/**
src/test/python/e2e/**
```

### Rules for Developer Agent

If you are implementing features (not the test-engineer agent):

**❌ FORBIDDEN:**
- Modify any file in `integration/`, `system/`, or `e2e/` directories
- Delete integration/system/E2E test files
- "Fix" failing integration tests by changing test code
- Refactor integration test structure
- Change assertions in integration tests

**✅ ALLOWED:**
- READ integration tests to understand requirements
- RUN integration tests to verify implementation
- Fix implementation code to make tests pass
- Write unit tests in `src/test/java/unit/` directory

### Why This Rule Exists

Integration/System/E2E tests represent **user requirements** and are written by the test-engineer agent with a **separate context** from your implementation. These tests must remain immutable to ensure:

1. **Requirements Integrity:** Tests define what "done" means
2. **Context Separation:** Test-engineer reflects user understanding, not implementation details
3. **TDD Workflow:** Tests written first (Red) → Implementation makes them pass (Green)

### If Integration Tests Fail

**Correct Response:**
```
Integration tests are failing. I need to fix the IMPLEMENTATION, not the tests.

Analysis:
- Test: shouldCreateUserWithActiveStatus() expects status=ACTIVE
- Issue: My implementation sets status=PENDING
- Fix: Change UserService.createUser() to set ACTIVE status
```

**Incorrect Response (DO NOT DO THIS):**
```
Integration test expects ACTIVE but I implemented PENDING.
Let me change the test to expect PENDING instead...  ❌ WRONG!
```

### Test Responsibilities

| Test Type | Location | Owner | You Can Modify? |
|-----------|----------|-------|----------------|
| **Integration Tests** | `integration/` | test-engineer | ❌ NO |
| **System Tests** | `system/` | test-engineer | ❌ NO |
| **E2E Tests** | `e2e/` | test-engineer | ❌ NO |
| **Unit Tests** | `unit/` | developer-agent | ✅ YES |

---

## CRITICAL: Protected User Configuration

⛔ **NEVER modify files in these directories:**

```
claudedocs/testspecs/**
claudedocs/guidelines/**
```

### Rules for ALL Agents

**❌ FORBIDDEN:**
- Modify any file in `claudedocs/testspecs/`
- Modify any file in `claudedocs/guidelines/`
- Delete files from these directories
- Rename or move files in these directories
- Add files to these directories (user does this manually)

**✅ ALLOWED:**
- READ files from these directories
- Apply rules from these files
- Reference these files in code comments

### Why This Rule Exists

These directories contain **user-provided** configuration and requirements:

1. **claudedocs/testspecs/**
   - User-defined test scenarios
   - Expected inputs/outputs
   - Explicit test specifications
   - **Test-engineer reads these to write tests**

2. **claudedocs/guidelines/**
   - Project-specific coding rules
   - Custom exception patterns
   - Logging standards
   - Architecture decisions
   - **Code-reviewer reads these to validate code**

**These are user requirements, not code. Agents execute them, never modify them.**

### If Guidelines Conflict with Your Knowledge

**Correct Response:**
```
Project guideline (exception-handling.md) requires ErrorCode as first parameter.
My default pattern uses ErrorCode as second parameter.

Decision: Project guidelines override my defaults. Following project pattern.
```

**Incorrect Response (DO NOT DO THIS):**
```
Project guideline seems inefficient. Let me update the guideline file to match modern best practices... ❌ WRONG!
```

### Priority Hierarchy

When rules conflict:

1. **Highest:** `claudedocs/guidelines/*.md` (Project-specific rules)
2. **Medium:** `claudedocs/testspecs/*.md` (Test specifications)
3. **Lowest:** Skill guidelines (Generic best practices)

---

## Customization

You can customize this file for your specific project needs:

- Add project-specific context or background
- Define additional trigger conditions for code review
- Specify priority rules for your domain
- Add team conventions or preferences
- Include links to external documentation

This template is provided by the AgenticAI Plugin. Modify it to fit your project's workflow.
