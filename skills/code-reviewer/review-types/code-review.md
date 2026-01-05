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

### 9. Unused & Dead Code Detection

**IMPORTANT:** Actively search for unused code. Dead code increases maintenance burden and violates YAGNI.

| Code Type | Severity | Detection |
|-----------|----------|-----------|
| **Unused private methods** | **WARNING** | No callers within class |
| **Unused classes/interfaces** | **WARNING** | Not referenced in codebase |
| **Unused packages/modules** | **WARNING** | Entire package with no external references |
| **@Deprecated without usage** | **WARNING** | Deprecated elements with zero callers |
| **Calls to @Deprecated code** | **WARNING** | Code calling deprecated methods/classes |
| **Unreachable code** | **WARNING** | Code after return/throw/break |
| **Commented-out code** | **WARNING** | Any commented-out code blocks |
| **Unused public methods** | **SUGGESTION** | No visible callers (may use reflection) |
| **Unused imports** | **SUGGESTION** | Import statements for unused types |
| **Unused variables/parameters** | **SUGGESTION** | Declared but never read |

**Severity Escalation:**
- Unused business logic (methods/classes) → WARNING
- Unused infrastructure code (utilities) → WARNING
- Unused imports/variables → SUGGESTION
- Unreachable code in critical paths → WARNING

**What to look for:**
- Private methods with no callers within the class
- Classes only instantiated in removed/commented code
- Entire packages/modules with no imports from other packages
- `@Deprecated` annotations on code that has no remaining callers
- Code that CALLS `@Deprecated` methods/classes (should migrate to alternative)
- Unreachable branches after return statements
- Commented-out code blocks (refactoring leftovers)
- Variables assigned but never read
- Parameters that are never used in method body

**Special considerations:**
- Public methods: Use caution - may be called via reflection, frameworks, or external modules
- Test code: Unused test helpers may indicate incomplete test coverage
- Interfaces: May be implemented externally - verify before flagging
- Packages: Check for internal-only usage vs. external API packages
- @Deprecated calls: Check if alternative is documented, suggest migration path

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

## Unused & Dead Code - Detailed Examples

### WARNING: Unused Private Method

**Bad Example:**
```java
public class OrderService {
    public void processOrder(Order order) {
        validateOrder(order);
        calculateTotal(order);
    }

    // WARNING: Never called - dead code
    private void sendNotification(Order order) {
        emailService.send(order.getEmail(), "Order processed");
    }
}
```

**Review Finding:**
```markdown
**WARNING:** Unused code detected
- [OrderService.java:42] Private method sendNotification() has no callers
**Rule:** development-principles → YAGNI (dead code)
**Fix:** Remove unused method or implement if required by story
```

### WARNING: Deprecated Code Without Callers

**Bad Example:**
```java
public class UserRepository {
    @Deprecated
    public User findByUsername(String username) {
        // Old implementation - no longer called anywhere
    }

    public User findByEmail(String email) {
        // New implementation used everywhere
    }
}
```

**Review Finding:**
```markdown
**WARNING:** Deprecated code should be removed
- [UserRepository.java:15] @Deprecated findByUsername() has no remaining callers
**Rule:** development-principles → YAGNI
**Fix:** Remove deprecated method - migration complete
```

### WARNING: Unused Class

**Bad Example:**
```java
// WARNING: This class is not referenced anywhere in the codebase
public class LegacyPaymentProcessor implements PaymentProcessor {
    // 200 lines of unused code
}
```

**Review Finding:**
```markdown
**WARNING:** Unused class detected
- [LegacyPaymentProcessor.java] Class not referenced in codebase
**Rule:** development-principles → YAGNI
**Fix:** Remove unused class or verify if needed for external/reflection usage
```

### WARNING: Commented-Out Code

**Bad Example:**
```java
public class PaymentService {
    public void processPayment(Payment payment) {
        validatePayment(payment);

        // Old implementation - commented out during refactoring
        // if (payment.getAmount() > 1000) {
        //     requireManagerApproval(payment);
        //     sendNotificationToManager(payment);
        //     logHighValueTransaction(payment);
        // }

        chargeCard(payment);
    }
}
```

**Review Finding:**
```markdown
**WARNING:** Commented-out code should be removed
- [PaymentService.java:8-13] Large block of commented-out code
**Rule:** development-principles → Keep code clean
**Fix:** Remove commented code. Use version control to retrieve if needed.
```

### SUGGESTION: Unused Public Method

**Example:**
```java
public class UserService {
    // SUGGESTION: No visible callers - verify if used via reflection/framework
    public void refreshUserCache(String userId) {
        // Implementation
    }
}
```

**Review Finding:**
```markdown
**SUGGESTION:** Potentially unused public method
- [UserService.java:25] Public method refreshUserCache() has no visible callers
**Note:** May be called via reflection, @Scheduled, or external modules
**Fix (optional):** Verify usage. If unused, remove. If used externally, add comment.
```

### WARNING: Calls to Deprecated Code

**Bad Example:**
```java
public class AuthenticationService {
    private final UserRepository userRepository;

    public User authenticate(String username, String password) {
        // WARNING: Calling deprecated method - should use findByEmail()
        User user = userRepository.findByUsername(username);
        if (user != null && passwordEncoder.matches(password, user.getPassword())) {
            return user;
        }
        return null;
    }
}
```

**Review Finding:**
```markdown
**WARNING:** Call to deprecated code
- [AuthenticationService.java:8] Calling deprecated method findByUsername()
**Rule:** development-principles → Migrate away from deprecated APIs
**Impact:** Deprecated code may be removed in future versions
**Fix:** Migrate to findByEmail() as documented in @Deprecated annotation
```

### WARNING: Unused Package/Module

**Bad Example:**
```
src/main/java/com/example/
├── core/                    # Used by other packages
├── api/                     # Used by other packages
├── legacy/                  # WARNING: No imports from other packages
│   ├── OldPaymentService.java
│   ├── LegacyOrderMapper.java
│   └── DeprecatedUtils.java
└── util/                    # Used by other packages
```

**Review Finding:**
```markdown
**WARNING:** Unused package detected
- [com.example.legacy] Package has no imports from other packages
**Rule:** development-principles → YAGNI
**Impact:** Entire package appears to be dead code (3 classes, ~500 lines)
**Fix:** Verify no external usage, then remove entire package
```

---

### 10. Additional Dead Code Patterns

#### Pass-Only Functions (WARNING)

Functions that only contain `pass`, `return None`, or just a docstring with no implementation.

**Bad Example:**
```python
def process_data(data):
    pass

def validate_input(input):
    """Validates input."""
    pass

def get_default_value():
    return None
```

**Review Finding:**
```markdown
**WARNING:** Pass-only function detected
- [utils.py:42] Function process_data() contains only 'pass'
**Rule:** development-principles → YAGNI
**Fix:** Remove unused placeholder or implement the function
```

**Exclude:**
- Abstract methods in base classes (intended to be overridden)
- Interface placeholder methods with `@abstractmethod`
- Protocol stubs for type checking

---

#### Unused Class Attributes (WARNING)

Attributes assigned in `__init__` or class body but never read anywhere in the class.

**Bad Example:**
```python
class OrderProcessor:
    def __init__(self, config):
        self.config = config
        self.debug_mode = True  # WARNING: Never read
        self.cache = {}  # WARNING: Never read

    def process(self, order):
        # Only uses self.config
        return self.config.process(order)
```

**Review Finding:**
```markdown
**WARNING:** Unused class attribute detected
- [OrderProcessor:5] Attribute debug_mode assigned but never read
- [OrderProcessor:6] Attribute cache assigned but never read
**Rule:** development-principles → YAGNI
**Fix:** Remove unused attributes or implement their usage
```

**Exclude:**
- Attributes used in templates/UI via reflection
- Serialization attributes (@JsonProperty, @dataclass fields)
- Attributes accessed via `getattr()` dynamically

---

#### TODO/FIXME Markers (SUGGESTION)

Code markers indicating incomplete or temporary implementation.

**Detection Patterns:**
- `# TODO:`, `// TODO:`
- `# FIXME:`, `// FIXME:`
- `# XXX:`, `// XXX:`
- `# HACK:`, `// HACK:`

**Review Finding:**
```markdown
**SUGGESTION:** Technical debt markers found
- [PaymentService.java:42] TODO: Add retry logic for failed payments
- [UserService.java:88] FIXME: This validation is incomplete
- [OrderController.java:15] HACK: Temporary workaround for API bug
**Note:** These indicate incomplete implementations. Consider addressing or creating tickets.
```

**Important:** Report only, do not auto-remove. These markers indicate technical debt that should be tracked.

---

#### Dead Exception Handlers (WARNING)

Exception handlers that silently swallow errors without any handling, logging, or re-throwing.

**Bad Example:**
```python
try:
    process_payment(order)
except:
    pass  # WARNING: Silent failure

try:
    send_notification(user)
except Exception:
    pass  # WARNING: Silent failure

try:
    update_inventory(item)
except Exception as e:
    pass  # WARNING: Exception captured but ignored
```

**Good Example:**
```python
try:
    process_payment(order)
except PaymentError as e:
    logger.error(f"Payment failed: {e}")
    raise  # Re-throw or handle appropriately

try:
    send_notification(user)
except NotificationError:
    # Intentionally silenced: notifications are non-critical
    # Ticket: INFRA-123 tracks notification reliability
    pass
```

**Review Finding:**
```markdown
**WARNING:** Dead exception handler detected
- [PaymentService.py:42] except: pass - silently swallows all errors
- [OrderService.py:88] except Exception: pass - no logging or handling
**Rule:** Code should handle errors explicitly
**Fix:** Add logging, re-throw, or document why silencing is intentional
```

**Exclude:**
- Handlers with logging statements
- Handlers that set error flags/states
- Intentional silencing with explaining comment

---

## Review Process

When reviewing source code:

1. **Check Security First** - CRITICAL findings
2. **Check YAGNI** - No speculative features
3. **Check Unused Code** - Actively search for dead code
   - Private methods without callers
   - Unused classes, interfaces, and entire packages
   - @Deprecated code that's no longer called
   - Calls TO @Deprecated code (should migrate)
   - Commented-out code blocks
   - Unreachable code
   - Pass-only functions (placeholders never implemented)
   - Unused class attributes (assigned but never read)
   - Dead exception handlers (except: pass)
   - TODO/FIXME markers (technical debt indicators)
4. **Check Code Duplication** - Actively search for duplicated code blocks
   - Compare similar classes (Services, Controllers, etc.)
   - Look for copy-pasted validation, error handling, mapping logic
   - Flag large duplications as WARNING/CRITICAL
5. **Check Requirements Traceability** - Story references present
6. **Check Code Quality** - Naming, size, complexity
7. **Check Correctness** - Logic, edge cases, errors

**IMPORTANT:** Unused code and code duplication detection are HIGH PRIORITY items. Do not just passively notice them - actively search for dead code and duplicates across the codebase being reviewed.

**Remember:** Only flag issues based on requirements. Don't demand features not in the story.
