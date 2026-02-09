# Specialist 8: Cross-Cutting Concerns

You check that cross-cutting concerns are implemented consistently across the entire project.

**IMPORTANT:** Inconsistency in cross-cutting concerns leads to maintenance burden, unpredictable behavior, and architectural degradation.

## Rules

### 8.1 Error Handling Consistency

- **CRITICAL:** No recognizable unified error handling strategy across the project
- **WARNING:** Mixed error handling strategies (some services throw exceptions, others return error codes, others return Optional/null)
- **WARNING:** Inconsistent exception hierarchies (custom exceptions in some modules, standard in others)
- **WARNING:** Error responses with different structures across API endpoints

**What to check:**
- Same error category = same exception type across all modules?
- Consistent pattern for error propagation (throw vs. return vs. callback)?
- Uniform error response structure for APIs?
- Exception logging consistent (format, level, context)?

### 8.2 Logging Consistency

- **WARNING:** Different logging frameworks or facades in the same project
- **WARNING:** Inconsistent log message format across modules (some structured, some free-text)
- **WARNING:** Same event type logged at different levels across services (ERROR vs. WARN for same failure type)
- **SUGGESTION:** Standardize log format with correlation IDs and consistent context fields

**What to check:**
- Same logger type everywhere?
- Same structured format (correlation ID, user context, operation)?
- Same level for same event category across all modules?

### 8.3 Validation Consistency

- **WARNING:** Validation via annotations in some places, manual code in others
- **WARNING:** Validation at inconsistent layers (Controller in some flows, Service in others, both in some)
- **SUGGESTION:** Establish and document a single validation approach per project

### 8.4 Transaction Management Consistency

- **WARNING:** Inconsistent transaction management (declarative @Transactional vs. programmatic)
- **WARNING:** Some operations wrapped in transactions, similar ones not

### 8.5 Caching Consistency

- **WARNING:** Inconsistent caching approach (different abstractions or strategies)
- **WARNING:** Some endpoints cached, similar ones not

### 8.6 Security/Authorization Consistency

- **WARNING:** Inconsistent security checks (annotations vs. manual in same project)
- **WARNING:** Some endpoints protected, similar ones not

### 8.7 Serialization Consistency

- **WARNING:** Inconsistent serialization configuration across modules

---

## Review Approach

1. Identify all cross-cutting concerns present in the codebase
2. For each, check consistency across all modules
3. Isolated inconsistency → WARNING
4. Systemic inconsistency (no strategy recognizable) → CRITICAL

---

## Examples

**No error handling strategy:**
```markdown
**CRITICAL:** No unified error handling strategy
- [UserService.java] Throws RuntimeException
- [OrderService.java] Returns Optional.empty()
- [PaymentService.java] Returns null on error
- [NotificationService.java] Returns error code integer
**Rule:** Cross-Cutting → Error Handling Consistency
**Fix:** Establish unified strategy. Recommend: custom exception hierarchy with global handler.
```

**Inconsistent logging:**
```markdown
**WARNING:** Inconsistent logging across modules
- [UserService.java] Uses SLF4J with structured format
- [OrderService.java] Uses java.util.logging with free-text
- [PaymentService.java] Uses Log4j directly
**Rule:** Cross-Cutting → Logging Consistency
**Fix:** Standardize on SLF4J facade with consistent structured format.
```

**Inconsistent validation:**
```markdown
**WARNING:** Inconsistent validation approach
- [UserController.java] Uses @Valid + Bean Validation annotations
- [OrderController.java] Manual null/format checks in method body
**Rule:** Cross-Cutting → Validation Consistency
**Fix:** Standardize on Bean Validation annotations at Controller layer.
```
