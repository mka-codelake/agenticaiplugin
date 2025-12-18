# Code Review Criteria

Review criteria for source code files (*.java, *.py, *.js, *.ts, *.go, *.kt, *.scala, etc.).

## Focus Areas

### 1. Correctness
- Logic errors and bugs
- Edge case handling (null, empty, boundary values)
- Error handling (exceptions, error codes)
- Data integrity

### 2. Security
- **CRITICAL:** Hardcoded credentials (passwords, API keys, secrets, tokens)
- **CRITICAL:** SQL injection risks (string concatenation in queries)
- **CRITICAL:** XSS vulnerabilities (unsanitized user input in output)
- **CRITICAL:** Missing input validation
- **WARNING:** Weak encryption/hashing
- **WARNING:** Insecure defaults

### 3. YAGNI (You Aren't Gonna Need It)
- **CRITICAL:** Code implementing features NOT in story acceptance criteria
- **CRITICAL:** "Just in case" logic not required by current story
- **CRITICAL:** Speculative abstractions without current use case
- **WARNING:** Overly complex solutions for simple requirements

**Rule:** Only implement what's in the story. No speculative features.

### 4. Single Responsibility Principle
- **WARNING:** Methods doing multiple unrelated things
- **WARNING:** Classes with mixed responsibilities
- **SUGGESTION:** Extract helper methods for clarity

### 5. Code Size & Complexity
- **WARNING:** Methods exceeding 50 lines
- **WARNING:** Classes exceeding 300 lines
- **SUGGESTION:** Cyclomatic complexity > 10
- **SUGGESTION:** Deeply nested conditions (>3 levels)

### 6. Requirements Traceability
- **WARNING:** Business logic methods without story references
- **SUGGESTION:** Missing WHY explanations in comments

**Expected Format:**
```java
// STORY-042 AC: User can login with email and password
public boolean authenticate(String email, String password) {
    // WHY: Passwords must be hashed for security
    String hashedPassword = bcrypt.hash(password);
    ...
}
```

### 7. Code Duplication (DRY Principle)

**IMPORTANT:** Code duplication is a high-priority review item. Actively search for duplicated code blocks.

| Duplication Type | Severity | Threshold |
|------------------|----------|-----------|
| **Large code blocks** (10+ lines, same or very similar) | **WARNING/CRITICAL** | 2+ occurrences |
| **Medium code blocks** (5-10 lines) | **WARNING** | 2+ occurrences |
| **Small patterns** (<5 lines) | **SUGGESTION** | 3+ occurrences |

**Severity Escalation:**
- 2 occurrences of large block → WARNING
- 3+ occurrences of large block → CRITICAL
- Duplication across multiple files → WARNING minimum

**What to look for:**
- Copy-pasted methods with minor variations
- Repeated validation logic
- Similar exception handling blocks
- Duplicated business calculations
- Repeated mapping/transformation code

**Always suggest refactoring:**
- Extract to shared method/function
- Create utility class
- Use template method pattern
- Introduce inheritance/composition where appropriate

### 8. Other Code Quality
- **WARNING:** Magic numbers (use constants)
- **WARNING:** Poor naming (unclear variable/method names)
- **SUGGESTION:** Missing documentation for public APIs
- **SUGGESTION:** Commented-out code

---

## YAGNI Violations - Detailed Examples

### CRITICAL: Speculative Features

**Bad Example:**
```java
// Story: User can login
public class UserService {
    // YAGNI violation: Story doesn't require password reset
    public void resetPassword(String email) { ... }

    // YAGNI violation: Story doesn't require user roles
    public void assignRole(User user, Role role) { ... }
}
```

**Good Example:**
```java
// Story: User can login
public class UserService {
    // STORY-042 AC: Authenticate user with email and password
    public boolean authenticate(String email, String password) { ... }
}
```

**Review Finding:**
```markdown
**CRITICAL:** YAGNI violation
- [UserService.java:12] resetPassword() not in story requirements
- [UserService.java:17] assignRole() not in story requirements
**Rule:** development-principles → YAGNI
**Fix:** Remove methods not required by STORY-042. Create separate stories if these features are needed later.
```

---

## Security Violations - Detailed Examples

### CRITICAL: Hardcoded Credentials

**Bad Example:**
```java
public class ApiClient {
    private static final String API_KEY = "sk_live_12345abcdef";  // CRITICAL
}
```

**Good Example:**
```java
public class ApiClient {
    private final String apiKey;

    public ApiClient() {
        this.apiKey = System.getenv("API_KEY");  // From environment
    }
}
```

### CRITICAL: SQL Injection

**Bad Example:**
```java
String query = "SELECT * FROM users WHERE email = '" + email + "'";  // CRITICAL
```

**Good Example:**
```java
PreparedStatement stmt = connection.prepareStatement(
    "SELECT * FROM users WHERE email = ?"
);
stmt.setString(1, email);
```

### CRITICAL: Missing Input Validation

**Bad Example:**
```java
public void updateUser(String userId, String name) {
    // No validation - XSS risk, injection risk
    jdbcTemplate.update("UPDATE users SET name = ? WHERE id = ?", name, userId);
}
```

**Good Example:**
```java
public void updateUser(String userId, String name) {
    // Validation
    if (userId == null || !userId.matches("^[0-9]+$")) {
        throw new IllegalArgumentException("Invalid user ID");
    }
    if (name == null || name.isEmpty() || name.length() > 100) {
        throw new IllegalArgumentException("Invalid name");
    }

    jdbcTemplate.update("UPDATE users SET name = ? WHERE id = ?", name, userId);
}
```

---

## Requirements Traceability

### WARNING: Missing Story References

**Bad Example:**
```java
public class OrderService {
    public void processOrder(Order order) {
        // No comment explaining WHY or linking to story
        validateOrder(order);
        calculateTotal(order);
        sendConfirmation(order);
    }
}
```

**Good Example:**
```java
public class OrderService {
    // STORY-123 AC: Process order with validation, total calculation, and email confirmation
    public void processOrder(Order order) {
        // WHY: Ensure order is valid before processing
        validateOrder(order);

        // STORY-123 AC: Calculate total including tax and shipping
        calculateTotal(order);

        // STORY-123 AC: Send confirmation email within 2 seconds
        sendConfirmation(order);
    }
}
```

---

## Code Quality Issues

### WARNING: Magic Numbers

**Bad Example:**
```java
if (user.getAge() < 18) {  // What does 18 mean?
    throw new ValidationException("Too young");
}
```

**Good Example:**
```java
private static final int MINIMUM_AGE = 18;

if (user.getAge() < MINIMUM_AGE) {
    throw new ValidationException("User must be at least " + MINIMUM_AGE);
}
```

### WARNING: Poor Naming

**Bad Example:**
```java
public void proc(Data d) {  // Unclear
    int x = d.getVal();  // Unclear
    if (x > 0) { ... }
}
```

**Good Example:**
```java
public void processUserData(UserData userData) {
    int accountBalance = userData.getAccountBalance();
    if (accountBalance > 0) { ... }
}
```

### WARNING: Method Too Long

**Detection:** Method exceeds 50 lines

**Recommendation:** Extract sub-methods with clear names

---

## Code Duplication - Detailed Examples

### WARNING/CRITICAL: Large Duplicated Code Blocks

**Bad Example - Duplicated validation across files:**

```java
// UserService.java
public void createUser(UserRequest request) {
    if (request.getEmail() == null || request.getEmail().isEmpty()) {
        throw new ValidationException("Email is required");
    }
    if (!request.getEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
        throw new ValidationException("Invalid email format");
    }
    if (request.getName() == null || request.getName().length() < 2) {
        throw new ValidationException("Name must be at least 2 characters");
    }
    // ... business logic
}

// OrderService.java - SAME CODE DUPLICATED
public void createOrder(OrderRequest request) {
    if (request.getEmail() == null || request.getEmail().isEmpty()) {
        throw new ValidationException("Email is required");
    }
    if (!request.getEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
        throw new ValidationException("Invalid email format");
    }
    if (request.getName() == null || request.getName().length() < 2) {
        throw new ValidationException("Name must be at least 2 characters");
    }
    // ... business logic
}
```

**Review Finding:**
```markdown
**WARNING:** Code duplication detected (DRY violation)
- [UserService.java:5-14] Email and name validation logic
- [OrderService.java:5-14] Same validation logic duplicated
**Lines:** ~10 lines duplicated across 2 files
**Rule:** development-principles → DRY (Don't Repeat Yourself)
**Fix:** Extract to shared ValidationUtils class:
  - ValidationUtils.validateEmail(String email)
  - ValidationUtils.validateName(String name)
```

**Good Example - Extracted to shared utility:**

```java
// ValidationUtils.java
public class ValidationUtils {
    public static void validateEmail(String email) {
        if (email == null || email.isEmpty()) {
            throw new ValidationException("Email is required");
        }
        if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new ValidationException("Invalid email format");
        }
    }

    public static void validateName(String name, int minLength) {
        if (name == null || name.length() < minLength) {
            throw new ValidationException("Name must be at least " + minLength + " characters");
        }
    }
}

// UserService.java - uses shared utility
public void createUser(UserRequest request) {
    ValidationUtils.validateEmail(request.getEmail());
    ValidationUtils.validateName(request.getName(), 2);
    // ... business logic
}

// OrderService.java - uses shared utility
public void createOrder(OrderRequest request) {
    ValidationUtils.validateEmail(request.getEmail());
    ValidationUtils.validateName(request.getName(), 2);
    // ... business logic
}
```

### CRITICAL: Same Logic in 3+ Places

**Example - Critical duplication:**
```markdown
**CRITICAL:** Severe code duplication (DRY violation)
- [UserController.java:25-40] Error handling block
- [OrderController.java:30-45] Same error handling block
- [PaymentController.java:20-35] Same error handling block
**Occurrences:** 3 (threshold for CRITICAL: 3+)
**Lines:** 15 lines duplicated in 3 files
**Rule:** development-principles → DRY
**Fix:** Create shared ExceptionHandler using @ControllerAdvice:
  - GlobalExceptionHandler.handleValidationException()
  - GlobalExceptionHandler.handleBusinessException()
```

### SUGGESTION: Minor Repetition

**Example - Small pattern, acceptable:**
```markdown
**SUGGESTION:** Minor code pattern repetition
- [UserService.java:42] log.info("Processing user: {}", userId)
- [OrderService.java:38] log.info("Processing order: {}", orderId)
- [PaymentService.java:55] log.info("Processing payment: {}", paymentId)
**Note:** Similar logging pattern but context-specific. May be acceptable.
**Fix (optional):** If logging requirements are identical, consider AOP logging aspect.
```

---

## Review Process

When reviewing source code:

1. **Check Security First** - CRITICAL findings
2. **Check YAGNI** - No speculative features
3. **Check Code Duplication** - Actively search for duplicated code blocks
   - Compare similar classes (Services, Controllers, etc.)
   - Look for copy-pasted validation, error handling, mapping logic
   - Flag large duplications as WARNING/CRITICAL
4. **Check Requirements Traceability** - Story references present
5. **Check Code Quality** - Naming, size, complexity
6. **Check Correctness** - Logic, edge cases, errors

**IMPORTANT:** Code duplication detection is a HIGH PRIORITY item. Do not just passively notice it - actively search for it across the codebase being reviewed.

**Remember:** Only flag issues based on requirements. Don't demand features not in the story.
