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

### 7. Code Quality
- **WARNING:** Duplicated code (DRY violation)
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

## Review Process

When reviewing source code:

1. **Check Security First** - CRITICAL findings
2. **Check YAGNI** - No speculative features
3. **Check Requirements Traceability** - Story references present
4. **Check Code Quality** - DRY, naming, size
5. **Check Correctness** - Logic, edge cases, errors

**Remember:** Only flag issues based on requirements. Don't demand features not in the story.
