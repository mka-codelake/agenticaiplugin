---
name: development-principles
description: Language-agnostic development principles (YAGNI, KISS, SRP, story traceability). Use PROACTIVELY when implementing features, refactoring code, or reviewing code quality. ALWAYS add story references (STORY-XXX) to implementation code.
---

Use this skill when writing code in any programming language. These are universal principles that apply regardless of tech stack.

## Core Principles

### YAGNI (You Aren't Gonna Need It)

**Only implement what's in the story acceptance criteria. No speculative features.**

✅ **Correct:**
- Story AC says "Send message via HTTP POST" → Implement exactly this
- Story AC says "Store in database" → Use database

❌ **Wrong:**
- Story says "HTTP POST" → Don't add WebSocket support "just in case"
- No caching in AC → Don't add Redis caching preemptively
- No settings requirement → Don't implement preferences system

**If you think a feature would be useful but it's not in story:**
1. Discuss with user
2. Create new story for it
3. Then implement in that story

---

### KISS (Keep It Simple, Stupid)

**Choose the simplest solution that meets the acceptance criteria.**

✅ **Correct:**
- Need to store data? Use standard ORM/database library
- Need to validate input? Use built-in validation
- Need date formatting? Use standard library

❌ **Wrong:**
- Creating custom ORM layer when standard exists
- Building complex validation framework when simple validation works
- Implementing custom serialization when library exists

**Complexity is only justified when:**
- Acceptance criteria explicitly demand it
- Simple solution cannot meet criteria
- User explicitly approves it

---

### Single Responsibility Principle

**One class, one responsibility. One method, one thing.**

✅ **Correct:**
```
MessageService → only message sending logic
MessageRepository → only persistence
MessageValidator → only validation
```

❌ **Wrong:**
```
MessageService → sending, validation, persistence, logging, caching, email...
```

---

## Code Size Guidelines

### Methods
- **Preferred:** <20 lines
- **Maximum:** 50 lines
- **Longer than 50 lines?** Extract helper methods

**Why:** Long methods are hard to understand, test, and maintain.

### Classes
- **Preferred:** <200 lines
- **Maximum:** 500 lines
- **Longer than 500 lines?** Split responsibilities into multiple classes

**Why:** Large classes usually violate Single Responsibility.

---

## Story Traceability

**Every business logic method/class should reference its story or acceptance criterion.**

### In Code Comments
```
// STORY-012 AC: User email must be valid format
if (!validateEmail(email)) {
    throw new InvalidEmailException();
}

// STORY-042 AC: Failed messages sent to DLQ after 3 retries
for (int retry = 0; retry < 3; retry++) { ... }
```

### In Documentation Comments
```
/**
 * Validates email format.
 * Implements STORY-012 AC: User email must be valid format
 */
public boolean validateEmail(String email) { ... }
```

### Class-Level References
```
/**
 * Service for managing Dead Letter Queue.
 *
 * Implements STORY-042: Dead Letter Queue Feature
 * - AC1: Failed messages sent to DLQ after 3 retries
 * - AC2: DLQ messages logged with error details
 * - AC3: DLQ has separate topic
 */
public class DeadLetterQueueService { ... }
```

**Why:** Enables tracing from code to story, helps understand WHY code exists.

---

## Dependency Management

**Only add external libraries/packages that are:**
1. Already in project tech stack
2. Required for story acceptance criteria
3. Explicitly approved by user

✅ **Allowed:**
- Library already used in project
- Library needed for story AC
- User explicitly said "use library X"

❌ **Not Allowed Without Approval:**
- Random utility libraries "that might be useful"
- Alternative to existing library (e.g., different JSON parser)
- Libraries for speculative features

**If you need a new dependency:**
Ask user: "Story X requires [functionality]. I recommend [library]. Shall I add it?"

**Don't:** Silently add dependencies.

---

## Security Best Practices

### Never Hardcode Credentials
- Use environment variables
- Use configuration files (not committed to git)
- Use secret management systems

### Always Validate User Input
- Check for null/empty
- Validate format (email, phone, etc.)
- Sanitize input (prevent injection attacks)
- Use validation libraries

### Use Parameterized Queries
- No string concatenation in SQL/queries
- Use prepared statements
- Use ORM parameter binding

### Follow OWASP Guidelines
- Prevent injection attacks
- Validate and sanitize all external input
- Use HTTPS for sensitive data

---

## Performance Guidelines

**Don't optimize prematurely. Simple code first.**

### When to Optimize

**Only when:**
1. Story has performance acceptance criterion (e.g., "Response <500ms")
2. Actual performance doesn't meet criterion
3. Profiling shows specific bottleneck

**Example:**

❌ **Premature Optimization:**
```
Story AC: "User can search products"
Developer: "I'll implement distributed caching and CDN!"
```

✅ **Simple First:**
```
Story AC: "User can search products"
Developer: "I'll implement simple database query."

[Performance test shows: 2 seconds, AC requires <500ms]
Developer: "Now I add index/caching."
```

**Why:** Premature optimization:
- Adds complexity
- Harder to maintain
- Often optimizes wrong things
- Wastes time on non-issues

---

## Logging Guidelines

### Log Levels (Universal)

**ERROR:** Errors requiring immediate attention
- System failures
- Data corruption
- External service failures

**WARN:** Recoverable issues, potential problems
- Retry attempts
- Deprecated feature usage
- Configuration issues

**INFO:** Important business events
- User actions (created, updated, deleted)
- System state changes
- Integration points

**DEBUG:** Troubleshooting details
- Variable values
- Flow control
- Performance metrics

### Logging Best Practices

**Do:**
- Log with context (IDs, values)
- Use structured logging (key-value pairs)
- Log exceptions with stack traces
- Use appropriate log level

**Don't:**
- Log sensitive data (passwords, tokens, credit cards, PII)
- Log in hot loops (performance impact)
- Use print statements for logging
- Swallow exceptions without logging

---

## Comments Guidelines

**Code should be self-documenting. Comments explain WHY, not WHAT.**

### Good Comments (WHY)

```
// STORY-012 AC: Email validation per RFC 5322
pattern = "^[A-Za-z0-9+_.-]+@(.+)$"

// Retry 3 times for transient network failures (STORY-042 AC)
for retry in range(3):
    ...

// Library X requires this callback for cleanup
def on_cleanup():
    ...
```

### Bad Comments (WHAT - obvious from code)

```
// Loop through messages
for msg in messages:
    ...

// Set value to 42
value = 42

// Get user by ID
def get_user_by_id(user_id):
    ...
```

### When to Comment

**Do comment:**
- Business logic reasons (WHY this logic exists)
- Story/AC references
- Non-obvious technical decisions
- Workarounds or temporary solutions
- Complex algorithms

**Don't comment:**
- Obvious code
- Self-explanatory method names
- Standard patterns

---

## Progressive Disclosure

For detailed examples, refactoring strategies, and comprehensive guidelines, see `reference.md`.

Only load `reference.md` when user asks for detailed help with principles or best practices.

---

**This skill activates automatically when writing code in any language: java, python, javascript, typescript, go, rust, etc.**
