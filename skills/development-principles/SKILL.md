---
description: Project conventions for story traceability, code size limits, and dependency approval. Use PROACTIVELY when implementing features or reviewing code. ALWAYS add story references (STORY-XXX) to implementation code.
user-invocable: false
---

## Story Traceability

**Every business logic method/class must reference its story or acceptance criterion.**

### In Code Comments

```
// STORY-012 AC-1: Email validation per RFC 5322
if (!validateEmail(email)) {
    throw new InvalidEmailException();
}

// STORY-042 AC-3: Failed messages sent to DLQ after 3 retries
for (int retry = 0; retry < 3; retry++) { ... }
```

### Class-Level References

```
/**
 * Implements STORY-042: Dead Letter Queue Feature
 * - AC-1: Failed messages sent to DLQ after 3 retries
 * - AC-2: DLQ messages logged with error details
 * - AC-3: DLQ has separate topic
 */
public class DeadLetterQueueService { ... }
```

---

## Code Size Limits

| Scope | Preferred | Maximum |
|-------|-----------|---------|
| Method | <20 lines | 50 lines |
| Class | <200 lines | 500 lines |

Exceeding maximum → extract helper methods or split class.

---

## Dependency Management

**Only add dependencies that are:**
1. Already in the project tech stack
2. Required for story acceptance criteria
3. Explicitly approved by user

**Before adding a new dependency:**
Ask user: "Story X requires [functionality]. I recommend [library]. Shall I add it?"
