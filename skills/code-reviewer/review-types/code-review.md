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

### 11. SOLID Principles (Beyond SRP)

SRP is covered in section 4. The remaining SOLID principles:

#### Open/Closed Principle (OCP)

- **WARNING:** Classes that must be modified for every new variant or type (long if/else or switch chains on type)
- **WARNING:** Adding a new feature requires changing existing, tested code instead of extending
- **SUGGESTION:** Consider polymorphism or Strategy pattern when switch/if chains grow beyond 3 cases

**Detection:** Look for switch/if-else chains that check a type or category to determine behavior. Each new type requires modifying the method.

#### Liskov Substitution Principle (LSP)

- **WARNING:** Subclass throws UnsupportedOperationException for inherited methods
- **WARNING:** Subclass changes the semantics or contract of base class methods
- **WARNING:** Override strengthens preconditions or weakens postconditions

**Detection:** Subclass that "disables" inherited behavior or violates expectations set by the base type.

#### Interface Segregation Principle (ISP)

- **WARNING:** Interface with >7 methods where some implementors leave methods empty or throw exceptions
- **WARNING:** Clients forced to depend on interface methods they never call
- **SUGGESTION:** Split large interfaces into smaller, focused ones

**Detection:** Implementors with empty method bodies, `pass`, or `throw new UnsupportedOperationException()`.

#### Dependency Inversion Principle (DIP)

- **WARNING:** High-level module directly instantiates low-level classes (`new ConcreteImpl()`) instead of depending on abstractions
- **WARNING:** Business logic directly references concrete infrastructure classes (database drivers, HTTP clients, file system)
- **SUGGESTION:** Introduce interface between layers when concrete dependency causes tight coupling

---

### 12. Cross-Cutting Concern Consistency

**IMPORTANT:** Actively check that cross-cutting concerns are implemented consistently across the entire project. Inconsistency in these areas leads to maintenance burden, unpredictable behavior, and architectural degradation.

#### Error Handling Consistency

- **CRITICAL:** No recognizable unified error handling strategy across the project
- **WARNING:** Mixed error handling strategies (some services throw exceptions, others return error codes, others return Optional/null)
- **WARNING:** Inconsistent exception hierarchies (custom exceptions in some modules, standard in others)
- **WARNING:** Error responses with different structures across API endpoints

**What to check:**
- Same error category = same exception type across all modules?
- Consistent pattern for error propagation (throw vs. return vs. callback)?
- Uniform error response structure for APIs?
- Exception logging consistent (format, level, context)?

#### Logging Consistency

- **WARNING:** Different logging frameworks or facades in the same project
- **WARNING:** Inconsistent log message format across modules (some structured, some free-text)
- **WARNING:** Same event type logged at different levels across services (ERROR vs. WARN for same failure type)
- **SUGGESTION:** Standardize log format with correlation IDs and consistent context fields

**What to check:**
- Same logger type everywhere?
- Same structured format (correlation ID, user context, operation)?
- Same level for same event category across all modules?

#### Validation Consistency

- **WARNING:** Validation via annotations in some places, manual code in others
- **WARNING:** Validation at inconsistent layers (Controller in some flows, Service in others, both in some)
- **SUGGESTION:** Establish and document a single validation approach per project

#### Other Cross-Cutting Concerns

When reviewing, identify ALL cross-cutting concerns present in the project and check each for consistency:

- **WARNING:** Inconsistent transaction management (declarative vs. programmatic)
- **WARNING:** Inconsistent caching approach (different abstractions or strategies)
- **WARNING:** Inconsistent security/authorization checks (annotations vs. manual)
- **WARNING:** Inconsistent serialization configuration

**Review Approach:**
1. Identify cross-cutting concerns present in the codebase
2. For each, check consistency across all modules
3. Isolated inconsistency → WARNING
4. Systemic inconsistency (no strategy recognizable) → CRITICAL

---

### 13. Code Smells

Actively look for these classic refactoring indicators (based on Fowler's catalog).

#### Feature Envy (WARNING)

Method that accesses data of another object more than its own class data.

- **WARNING:** Method calls >3 getters/fields on another object while using few or none of its own

```python
# WARNING: This logic belongs in Order, not in OrderPrinter
class OrderPrinter:
    def format_total(self, order):
        total = order.base_price * order.quantity
        tax = total * order.tax_rate
        shipping = order.weight * order.shipping_rate
        return f"Total: {total + tax + shipping}"
```

#### God Class (WARNING / CRITICAL)

A class that accumulates too many responsibilities, even if within line limits.

- **WARNING:** Class with >7 constructor dependencies
- **CRITICAL:** Class with >10 constructor dependencies
- **WARNING:** Class with generic name ("Manager", "Handler", "Processor", "Helper") containing unrelated methods

**Detection:** Can you split the class into 2+ classes with no shared state? If yes → God Class.

#### Shotgun Surgery (WARNING)

A single logical change requires touching many unrelated files.

- **WARNING:** Adding one feature requires changes in >5 files that don't form a natural vertical slice

**Detection:** Suggests scattered responsibility that should be consolidated.

#### Message Chains / Train Wrecks (WARNING)

Long chains of method calls violating Law of Demeter.

- **WARNING:** Method chains >3 levels deep navigating object structure

```java
// WARNING: Deeply coupled to internal structure
String city = order.getCustomer().getAddress().getCity().getName();
```

#### Primitive Obsession (SUGGESTION)

Using primitives for domain concepts instead of value objects.

```java
// SUGGESTION: email, phone, currency are domain concepts - consider value objects
public void createUser(String email, String phone, double balance, String currency) { ... }
```

#### Data Clumps (WARNING)

Same group of parameters appearing together in multiple methods.

- **WARNING:** Same 3+ parameters appear together in 3+ method signatures

```python
# WARNING: street, city, zip_code always travel together - extract Address object
def create_address(street, city, zip_code): ...
def validate_address(street, city, zip_code): ...
def format_address(street, city, zip_code): ...
```

---

### 14. Cohesion & Coupling

#### Low Cohesion (WARNING)

- **WARNING:** Class where methods operate on different, unrelated subsets of fields
- **WARNING:** Instance method that uses no instance fields (should be static or moved)
- **WARNING:** Class with >7 constructor dependencies (likely multiple responsibilities)
- **SUGGESTION:** Utility class with unrelated methods grouped by convenience

**Heuristic:** If a class can be split into 2+ classes with no shared fields → low cohesion.

#### High Coupling (WARNING)

- **WARNING:** Class importing >10 project-internal classes (not framework/standard library)
- **WARNING:** Bidirectional dependencies between classes
- **WARNING:** Concrete class dependency where an interface would reduce coupling
- **SUGGESTION:** Consider events or mediator pattern to decouple tightly coupled modules

---

### 15. Naming Consistency

**IMPORTANT:** Check naming patterns across the project, not just individual names.

- **WARNING:** Inconsistent suffixes for same-layer types (e.g., `UserService` + `OrderManager` + `PaymentHandler` all in service layer)
- **WARNING:** Inconsistent verbs for same operation type (e.g., `getUser()`, `fetchOrder()`, `retrievePayment()`, `loadProduct()`)
- **WARNING:** Inconsistent terminology for same domain concept (e.g., `User` vs. `Account` vs. `Customer` for the same entity)
- **SUGGESTION:** Document naming conventions if none exist

**What to check:**
- Same layer = same suffix consistently?
- Same operation = same verb consistently?
- Same domain concept = same term consistently?

---

### 16. Behavioral Change Detection

When reviewing modifications to existing code, actively check for unintended behavioral changes.

- **CRITICAL:** Changed return type of public method without updating all callers
- **CRITICAL:** Changed exception type that callers may be catching specifically
- **WARNING:** Changed default values that affect existing behavior
- **WARNING:** Changed method signature (parameter order, types, nullability)
- **WARNING:** Modified sorting, ordering, or comparison behavior without explicit requirement
- **WARNING:** Changed visibility modifier (public→private, protected→package-private)
- **SUGGESTION:** Consider backward compatibility for internal APIs between modules

**What to check:**
- Return type changed? (callers may break)
- Exception type changed? (catch blocks may miss it)
- Default values changed? (existing behavior may shift)
- Null handling behavior changed? (callers may not expect it)

---

### 17. Immutability & Defensive Programming

- **WARNING:** Mutable internal state exposed via getters (returning internal collections/arrays directly)
- **WARNING:** Shared mutable state between threads without synchronization
- **SUGGESTION:** Fields that could be final/readonly/const but aren't
- **SUGGESTION:** Value objects that are mutable when immutability is preferable
- **SUGGESTION:** Missing defensive copies for mutable constructor/method parameters

**Bad Example:**
```java
public class Order {
    private List<OrderItem> items;

    // WARNING: Exposes mutable internal state
    public List<OrderItem> getItems() { return items; }
}
```

**Good Example:**
```java
public class Order {
    private final List<OrderItem> items;

    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }
}
```

---

### 18. Dependency Version Currency

**IMPORTANT:** Actively check whether project dependencies are up-to-date. Outdated dependencies may miss security patches, bug fixes, and performance improvements.

#### Detection Approach (Language-Neutral)

Determine the project's ecosystem and use the appropriate method to check versions:

| Ecosystem | Detection Method |
|-----------|------------------|
| **npm/Node.js** | `npm outdated` or check package.json versions against npm registry |
| **Python/pip** | `pip list --outdated` or check requirements.txt/pyproject.toml against PyPI |
| **Java/Maven** | `mvn versions:display-dependency-updates` or check pom.xml against Maven Central |
| **Java/Gradle** | `gradle dependencyUpdates` or check build.gradle against Maven Central |
| **Go** | `go list -u -m all` or check go.mod against pkg.go.dev |
| **Rust** | `cargo outdated` or check Cargo.toml against crates.io |
| **Any ecosystem** | WebSearch for "[library-name] latest version" as fallback |

#### Severity Classification

- **CRITICAL:** Dependency is 2+ major versions behind (e.g., Spring Boot 2.x when 3.x is stable) — likely missing critical security patches
- **CRITICAL:** Known security vulnerability in current dependency version (CVE)
- **WARNING:** Dependency is 1 major version behind (e.g., framework v4 when v5 is stable for >6 months)
- **WARNING:** Dependency is significantly behind on minor/patch versions (many releases behind)
- **SUGGESTION:** Dependency has newer minor/patch version available (routine update)

#### Important Rules

- **NEVER flag a dependency as outdated without verifying the actual latest stable version** (via tool output, WebSearch, or registry lookup)
- **Only consider stable/GA releases** — do not flag for alpha, beta, RC, or milestone versions
- **Consider the project context** — some projects intentionally pin versions for compatibility
- **Check project guidelines** — if `claudedocs/guidelines/` documents specific version constraints, respect them

#### Review Finding Example

```markdown
**WARNING:** Outdated dependency
- [pom.xml:45] Spring Boot 3.1.5 — current stable is 3.4.2 (verified via Maven Central)
**Impact:** Missing 3 minor versions of improvements, bug fixes, and potential security patches
**Fix:** Update to Spring Boot 3.4.x. Check migration guide for breaking changes.
```

```markdown
**CRITICAL:** Severely outdated dependency
- [package.json:12] express@4.17.1 — current stable is 5.1.0 (verified via npm registry)
**Impact:** Major version behind, likely missing security patches
**Fix:** Update to express@5.x. Review changelog for breaking changes.
```

---

### 19. Framework Modernization

When a project uses a newer version of a framework, check that the code actually uses the modern API patterns — not deprecated or legacy approaches from older versions.

#### Detection Approach

1. **Identify framework version** from dependency file (pom.xml, package.json, requirements.txt, etc.)
2. **Scan code for legacy patterns** that were common in older versions but replaced in the current version
3. **Check for deprecated API usage** that the current framework version has superseded

#### Severity Classification

- **WARNING:** Code uses deprecated/legacy pattern when the current framework version provides a modern alternative
- **WARNING:** Multiple files use old-style patterns while newer pattern is already used elsewhere in the same project (inconsistency)
- **SUGGESTION:** Code uses older but still supported pattern; modern alternative would be cleaner

#### Common Detection Patterns (Language-Neutral)

| Signal | What to Check |
|--------|---------------|
| Framework major version changed | Are configuration patterns, annotations, API calls updated? |
| Deprecation warnings in build output | Code using deprecated APIs? |
| Mix of old and new patterns in same project | Inconsistent modernization (partially migrated)? |
| Framework migration guide available | Were documented breaking changes addressed? |

#### Review Finding Examples

```markdown
**WARNING:** Legacy framework pattern
- [SecurityConfig.java:15] Uses WebSecurityConfigurerAdapter (removed in Spring Security 6)
- Project uses Spring Boot 3.2 which includes Spring Security 6
**Rule:** code-review → Framework Modernization
**Fix:** Migrate to component-based security configuration using SecurityFilterChain bean.
```

```markdown
**WARNING:** Deprecated API usage with modern alternative
- [app.py:8] Uses flask.ext.login (Flask-Login <0.3 import style)
- Project uses Flask-Login 0.6.x
**Fix:** Change to: from flask_login import LoginManager
```

```markdown
**WARNING:** Inconsistent framework usage
- [UserController.java] Uses modern @GetMapping annotation
- [OrderController.java] Uses legacy @RequestMapping(method = GET) for same purpose
**Rule:** code-review → Framework Modernization (consistency)
**Fix:** Standardize on @GetMapping across all controllers
```

#### Review Approach

1. Identify framework and its version from dependency file
2. Use WebSearch or Context7 to check: "What changed in [framework] [version]? Deprecated APIs?"
3. Scan codebase for patterns that were deprecated or replaced in the current version
4. Check for inconsistency: some files modernized, others still using old patterns
5. Flag deprecated patterns as WARNING, inconsistencies as WARNING, optional improvements as SUGGESTION

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
5. **Check SOLID Principles** - OCP, LSP, ISP, DIP (SRP in step 6)
   - Long switch/if-else chains on type → OCP violation
   - Subclasses disabling inherited behavior → LSP violation
   - Fat interfaces with empty implementors → ISP violation
   - Business logic instantiating concrete infrastructure → DIP violation
6. **Check Code Quality** - Naming, size, complexity, SRP
7. **Check Code Smells** - Actively search for structural problems
   - Feature Envy (method uses other object's data more than its own)
   - God Class (>7 dependencies, generic name, unrelated methods)
   - Message Chains / Train Wrecks (>3 levels deep)
   - Data Clumps (same 3+ params in 3+ methods)
   - Shotgun Surgery (one change touches >5 unrelated files)
8. **Check Cross-Cutting Concern Consistency** - HIGH PRIORITY
   - Error handling: same strategy across all modules?
   - Logging: same framework, format, levels for same event types?
   - Validation: same approach and layer across all flows?
   - Other concerns: transaction management, caching, security checks consistent?
9. **Check Naming Consistency** - Project-wide patterns
   - Same layer = same suffix? Same operation = same verb?
   - Same domain concept = same term?
10. **Check Cohesion & Coupling** - Structural quality
    - Low cohesion: unrelated methods in one class, >7 dependencies
    - High coupling: >10 internal imports, bidirectional dependencies
11. **Check Behavioral Changes** - When reviewing modifications
    - Return types, exception types, default values changed?
    - Method signatures, visibility, sorting behavior changed?
12. **Check Immutability** - Defensive programming
    - Mutable state exposed via getters?
    - Shared mutable state without synchronization?
13. **Check Dependency Versions** - Are dependencies current?
    - Identify ecosystem (npm, pip, Maven, Gradle, Go, Rust, etc.)
    - Verify latest stable versions via appropriate tool or WebSearch
    - Major version behind = WARNING/CRITICAL, known CVE = CRITICAL
    - NEVER flag without verifying actual latest stable version
14. **Check Framework Modernization** - Modern API patterns used?
    - Identify framework version from dependency file
    - Check for deprecated/legacy patterns from older versions
    - Check for inconsistency (some files modernized, others not)
15. **Check Requirements Traceability** - Story references present
16. **Check Correctness** - Logic, edge cases, errors

**IMPORTANT:** Unused code, code duplication, cross-cutting concern consistency, and dependency currency are HIGH PRIORITY items. Do not just passively notice them - actively search for dead code, duplicates, inconsistencies, and outdated dependencies across the codebase being reviewed.

**Remember:** Only flag issues based on requirements. Don't demand features not in the story.
