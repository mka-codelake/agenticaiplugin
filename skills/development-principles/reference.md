# Development Principles Reference

Language-agnostic development best practices and principles.

---

## Core Principles (Detailed)

### YAGNI (You Aren't Gonna Need It)

**Definition:** Only implement features that are in the current story acceptance criteria.

**Rationale:**
- Speculative features add complexity
- Requirements change - features become obsolete
- Time wasted on unused code
- Harder to maintain

**Examples:**

✅ **Good - Implements only what's needed:**
```
Story AC: "User can reset password via email"

Implementation:
- Password reset endpoint
- Email sending logic
- Reset token generation
- Token validation

That's it. Nothing more.
```

❌ **Bad - Speculative features:**
```
Story AC: "User can reset password via email"

Implementation:
- Password reset via email ✓
- Password reset via SMS (not in AC)
- Two-factor authentication (not in AC)
- Password strength meter (not in AC)
- Password history (not in AC)

Result: 5x complexity, 80% unused features
```

**Real-World Impact:**
- Speculative features: 60-80% never used
- Maintenance cost: Every feature needs updates, tests, docs
- Opportunity cost: Could have built actual requirements

**When You Think "This Would Be Useful":**
1. Stop
2. Ask user: "Should I create a story for [feature]?"
3. If yes → Create story, implement later
4. If no → Don't implement

---

### KISS (Keep It Simple, Stupid)

**Definition:** Choose the simplest solution that meets acceptance criteria.

**Rationale:**
- Simple code is maintainable
- Simple code has fewer bugs
- Simple code is easier to test
- Complexity should be justified

**Examples:**

✅ **Good - Simple solution:**
```
Story AC: "Store user messages in database"

Implementation:
- Use ORM (JPA, SQLAlchemy, Django ORM, etc.)
- Simple repository pattern
- Standard CRUD operations

That's it.
```

❌ **Bad - Over-engineered:**
```
Story AC: "Store user messages in database"

Implementation:
- Custom ORM layer with reflection
- Generic repository base class with 20 type parameters
- Abstract factory for repository creation
- Strategy pattern for different databases
- Cache layer with distributed invalidation
- Event sourcing with CQRS

Result: 10x complexity for simple CRUD
```

**Complexity Checklist:**

Before adding complexity, ask:
- [ ] Does story AC explicitly require this complexity?
- [ ] Can simple solution NOT meet AC?
- [ ] Did user approve this approach?

If all "No" → Use simple solution.

**Examples of Justified Complexity:**
- AC says "Response time <100ms" → Caching justified
- AC says "Handle 10,000 requests/sec" → Load balancing justified
- AC says "Works offline" → Event sourcing justified

---

### Single Responsibility Principle

**Definition:** One class = one responsibility. One method = one thing.

**Rationale:**
- Easier to understand (focused purpose)
- Easier to test (one thing to verify)
- Easier to change (localized impact)
- Easier to reuse

**Examples:**

✅ **Good - Focused classes:**
```python
class UserService:
    """Manages user CRUD operations"""
    def create_user(self, email, name): ...
    def update_user(self, user_id, data): ...
    def delete_user(self, user_id): ...

class EmailService:
    """Manages email sending"""
    def send_welcome_email(self, user): ...
    def send_reset_email(self, user): ...

class ReportService:
    """Generates user reports"""
    def generate_pdf_report(self, user): ...
```

❌ **Bad - God class:**
```python
class UserService:
    """Does everything related to users"""
    def create_user(self): ...       # CRUD
    def send_welcome_email(self): ...  # Email
    def generate_report(self): ...    # Reporting
    def export_to_csv(self): ...      # Export
    def validate_permissions(self): ... # Auth
    def log_activity(self): ...       # Logging
    # 50 more methods...
```

**How to Identify Violations:**

Signs your class has too many responsibilities:
- Class name contains "And", "Manager", "Helper", "Utility"
- Class has >10 methods
- Methods operate on different data
- Hard to describe class in one sentence

**Refactoring:**
1. List all methods
2. Group by responsibility
3. Extract each group into separate class

---

## Code Size Guidelines (Detailed)

### Method Size

**Rules:**
- **Preferred:** <20 lines (fits on screen, easy to grasp)
- **Maximum:** 50 lines (absolute limit)
- **Longer?** Extract helper methods

**How to Measure:**
- Count logical lines (exclude braces, comments)
- One method should fit in your editor without scrolling

**Refactoring Long Methods:**

**Technique 1: Extract Helper Methods**
```python
# ❌ BEFORE: 80-line method
def process_order(order):
    # 20 lines: Validate order
    if not order.email:
        raise ValueError("Email required")
    if not is_valid_email(order.email):
        raise ValueError("Invalid email")
    # ... 15 more validation lines

    # 20 lines: Calculate total
    subtotal = sum(item.price for item in order.items)
    tax = subtotal * TAX_RATE
    shipping = calculate_shipping(order.address)
    # ... 15 more calculation lines

    # 20 lines: Check inventory
    # ... inventory logic

    # 20 lines: Process payment
    # ... payment logic

# ✅ AFTER: 4 focused methods
def process_order(order):
    validate_order(order)                # 10 lines
    total = calculate_total(order)       # 15 lines
    check_inventory(order)               # 12 lines
    process_payment(order, total)        # 18 lines

def validate_order(order):               # 10 lines
    if not order.email:
        raise ValueError("Email required")
    if not is_valid_email(order.email):
        raise ValueError("Invalid email")
    # ...

def calculate_total(order):              # 15 lines
    subtotal = sum(item.price for item in order.items)
    tax = subtotal * TAX_RATE
    shipping = calculate_shipping(order.address)
    return subtotal + tax + shipping
```

**Technique 2: Extract to New Class**

If extracted methods don't belong in current class → New class.

**Benefits of Small Methods:**
- Easy to understand at a glance
- Easy to test (one thing to verify)
- Easy to reuse
- Easy to debug

---

### Class Size

**Rules:**
- **Preferred:** <200 lines
- **Maximum:** 500 lines
- **Longer?** Split into multiple classes

**Refactoring Large Classes:**

**Technique 1: Split by Responsibility**
```python
# ❌ BEFORE: 800-line God class
class UserService:
    def create_user(self): ...
    def update_user(self): ...
    def send_welcome_email(self): ...
    def send_reset_email(self): ...
    def generate_report(self): ...
    def export_to_pdf(self): ...
    def export_to_csv(self): ...
    def log_activity(self): ...
    # 50 more methods...

# ✅ AFTER: Focused classes
class UserService:              # 150 lines
    def create_user(self): ...
    def update_user(self): ...
    def delete_user(self): ...

class UserNotificationService:  # 100 lines
    def send_welcome_email(self): ...
    def send_reset_email(self): ...

class UserReportService:        # 200 lines
    def generate_report(self): ...
    def export_to_pdf(self): ...
    def export_to_csv(self): ...
```

**Technique 2: Extract Helper Classes**

Move complex logic to focused helper classes.

---

## Story Traceability (Detailed)

### Why Trace Stories in Code?

**Benefits:**
- Understand WHY code exists
- Find code when story changes
- Verify all ACs are implemented
- Easier maintenance

### How to Reference Stories

**Method-Level (for specific AC):**
```java
// STORY-042 AC: Messages retried 3 times before DLQ
private void retryMessage(Message msg) {
    for (int i = 0; i < 3; i++) {
        try {
            process(msg);
            return;
        } catch (Exception e) {
            if (i == 2) sendToDLQ(msg);
        }
    }
}
```

**Class-Level (for entire story):**
```python
"""
Kafka Dead Letter Queue service.

Implements STORY-042: Dead Letter Queue Feature
- AC1: Failed messages sent to DLQ after 3 retries
- AC2: DLQ messages logged with error details
- AC3: Separate DLQ topic: input-messages-dlq
"""
class DeadLetterQueueService:
    ...
```

**Multi-Story Class:**
```typescript
/**
 * User authentication service.
 *
 * Implements:
 * - STORY-010: User login with email/password
 * - STORY-011: Password reset via email
 * - STORY-015: Session management
 */
class AuthService {
    ...
}
```

---

## Logging Guidelines (Language-Agnostic)

### Log Levels

**ERROR:** Errors requiring immediate attention
- System failures
- Data corruption
- External service down
- Unrecoverable errors

**WARN:** Recoverable issues, potential problems
- Retry attempts
- Deprecated usage
- Configuration issues
- Degraded performance

**INFO:** Important business events
- User created/updated/deleted
- Order placed/completed
- System started/stopped
- Integration events

**DEBUG:** Troubleshooting details
- Variable values
- Method entry/exit
- Intermediate calculations
- Cache hits/misses

### Logging Best Practices

**Do:**
- Include context (user ID, order ID, request ID)
- Log exceptions with stack traces
- Use structured logging when available
- Use log levels appropriately

**Don't:**
- Log sensitive data (passwords, tokens, credit cards, SSN)
- Log in hot loops (performance impact)
- Use print statements instead of logger
- Swallow exceptions without logging

**Examples:**

```python
# ✅ GOOD
logger.error("Failed to process order %s: %s", order_id, str(e), exc_info=e)
logger.warn("Kafka retry attempt %d/%d", attempt, max_retries)
logger.info("User %s created successfully", user_id)
logger.debug("Cache miss for key: %s", cache_key)

# ❌ BAD
print(f"Error: {e}")                    # Print instead of logger
logger.info(f"Password: {password}")    # Sensitive data
logger.error("Error")                   # No context
for item in million_items:
    logger.info("Processing %s", item)  # Hot loop
```

---

## Comments Guidelines (Detailed)

**Philosophy: Code tells you WHAT. Comments tell you WHY.**

### Good Comments

**Story/AC References:**
```python
# STORY-012 AC: Email must be validated per RFC 5322
email_pattern = r'^[A-Za-z0-9+_.-]+@(.+)$'
```

**Business Logic Reasons:**
```java
// Customer receives 10% discount after 5 purchases (STORY-025 AC)
if (user.getPurchaseCount() >= 5) {
    discount = 0.10;
}
```

**Non-Obvious Technical Decisions:**
```typescript
// Use debounce to prevent API spam (500ms from UX research)
const debouncedSearch = debounce(search, 500);
```

**Workarounds:**
```go
// TODO: Remove after Library X fixes bug #1234 (workaround)
result := hackAroundLibraryBug(data)
```

### Bad Comments

**Describing obvious code:**
```python
# Add 1 to counter
counter += 1

# Return true
return True

# Loop through users
for user in users:
    ...
```

**Redundant with method name:**
```java
// Get user by ID
public User getUserById(Long id) { ... }

// Save message to database
public void saveMessage(Message msg) { ... }
```

### Comment Checklist

Before writing a comment, ask:
- [ ] Is this obvious from the code? → Don't comment
- [ ] Does method name explain it? → Don't comment
- [ ] Is this business logic WHY? → Comment
- [ ] Is this story/AC reference? → Comment
- [ ] Is this non-obvious decision? → Comment

---

## Dependency Management (Detailed)

### The Dependency Problem

**Every dependency adds:**
- Maintenance burden (security updates)
- Compatibility risk (version conflicts)
- Build time (download, compile)
- Complexity (learning curve)

**Before adding dependency, ask:**
1. Is this in existing tech stack?
2. Does story AC require this functionality?
3. Can I use standard library instead?
4. Is this approved by user?

### Examples

**Scenario 1: JSON Parsing**

Story AC: "Parse JSON messages from Kafka"

✅ **Good:**
```python
# Check if project already uses JSON library
import json  # Standard library - always ok

# OR if project uses third-party:
import orjson  # Already in requirements.txt
```

❌ **Bad:**
```python
# Add new JSON library when standard exists
pip install ujson  # Why? json or orjson already work
```

**Scenario 2: HTTP Requests**

Story AC: "Call external API for user verification"

✅ **Good:**
```python
# Check what project uses
import requests  # Already in requirements.txt

# OR discuss:
# "Story X needs HTTP client. Project doesn't have one yet.
#  I recommend 'requests' (most popular). Shall I add it?"
```

❌ **Bad:**
```python
# Silently add without asking
import httpx  # Different from project standard
```

### When to Ask User

**Always ask before adding dependency if:**
- Not in current tech stack
- Alternative to existing library
- For optional/nice-to-have feature

**Template:**
```
"Story X requires [functionality].
I see the project [uses Y / doesn't have this yet].
I recommend adding [library Z].
Shall I add it to [package.json/pom.xml/requirements.txt]?"
```

---

## Security Best Practices (Detailed)

### 1. Never Hardcode Credentials

**Why:** Credentials in code → leaked on git, exposed in logs, security breach.

```python
# ❌ BAD
API_KEY = "sk-1234567890abcdef"
DB_PASSWORD = "mySecretPassword123"
connection_string = "mongodb://admin:password@localhost"

# ✅ GOOD
API_KEY = os.getenv("API_KEY")
DB_PASSWORD = os.getenv("DB_PASSWORD")
connection_string = os.getenv("MONGODB_URI")
```

**Languages:**
- Python: `os.getenv("KEY")`
- Java: `System.getenv("KEY")` or Spring `@Value("${key}")`
- Node.js: `process.env.KEY`
- Go: `os.Getenv("KEY")`

### 2. Always Validate User Input

**Why:** Prevent injection attacks, data corruption, crashes.

```python
# ❌ BAD - No validation
def create_user(email, name):
    user = User(email=email, name=name)
    db.save(user)

# ✅ GOOD - Validate
def create_user(email, name):
    if not email:
        raise ValueError("Email required")
    if not is_valid_email(email):
        raise ValueError("Invalid email format")
    if len(name) < 2 or len(name) > 50:
        raise ValueError("Name must be 2-50 characters")

    user = User(email=email, name=name)
    db.save(user)
```

### 3. Use Parameterized Queries

**Why:** Prevent SQL injection.

```python
# ❌ BAD - SQL Injection
query = f"SELECT * FROM users WHERE email = '{email}'"
db.execute(query)

# ✅ GOOD - Parameterized
query = "SELECT * FROM users WHERE email = ?"
db.execute(query, [email])
```

### 4. OWASP Top 10 Awareness

Common vulnerabilities to check for:
- Injection (SQL, Command, LDAP)
- Broken Authentication
- Sensitive Data Exposure
- XML External Entities (XXE)
- Broken Access Control
- Security Misconfiguration
- Cross-Site Scripting (XSS)
- Insecure Deserialization
- Using Components with Known Vulnerabilities
- Insufficient Logging & Monitoring

**When implementing security-critical features (auth, payment, etc.), explicitly check OWASP guidelines.**

---

## Performance Guidelines (Detailed)

### Premature Optimization is the Root of All Evil

**Donald Knuth's Rule:** "Premature optimization is the root of all evil (yet we should not pass up our opportunities in that critical 3%)"

**Translation:**
- 97% of the time: Write simple, clear code
- 3% of the time: Optimize when profiling shows bottleneck

### When NOT to Optimize

**Don't optimize when:**
- Story has no performance AC
- You "think" it might be slow (measure first!)
- "Best practice" says to optimize
- You want to show off clever code

**Example:**
```
Story AC: "User can search products"
No performance criterion mentioned.

Don't:
- Pre-implement caching
- Use complex algorithms
- Optimize database queries

Do:
- Simple implementation
- Measure performance
- Optimize IF too slow
```

### When TO Optimize

**Only when:**
1. Story has performance AC
2. Simple solution doesn't meet AC
3. Profiling shows bottleneck

**Process:**
1. Implement simple solution
2. Write tests
3. Run performance tests
4. If doesn't meet AC:
   - Profile to find bottleneck
   - Optimize THAT specific bottleneck
   - Re-test

**Example:**
```
Story AC: "Search returns results in <500ms"

1. Simple: Database query → 2 seconds (FAILS AC)
2. Profile: Query takes 1.8s, rendering takes 0.2s
3. Optimize: Add database index → 400ms (PASSES AC)
4. Stop. Don't optimize rendering.
```

### Common Premature Optimizations to Avoid

❌ **Caching before measuring:**
```python
# Story has no performance AC
def get_user(user_id):
    # "Best practice" says to cache
    if user_id in cache:
        return cache[user_id]
    user = db.get(user_id)
    cache[user_id] = user
    return user

# Result: Added complexity for unmeasured benefit
```

✅ **Simple first, optimize if needed:**
```python
def get_user(user_id):
    return db.get(user_id)

# Later: Performance test shows 2s, AC requires <500ms
# Profile shows: Database query is bottleneck
# Then add caching
```

---

## Anti-Patterns Summary

### ❌ Feature Creep (YAGNI Violation)
Implementing features not in story → Wasted time, complexity

### ❌ Over-Engineering (KISS Violation)
Complex solution when simple works → Hard to maintain

### ❌ God Classes (SRP Violation)
One class doing everything → Hard to understand, test, change

### ❌ Long Methods (>50 lines)
Hard to understand, test, maintain → Extract helpers

### ❌ Coverage Chasing
Writing tests to hit % goal → Meaningless tests

### ❌ Premature Optimization
Optimizing without measuring → Added complexity, no benefit

### ❌ Hardcoded Credentials
Security breach waiting to happen → Use env vars

### ❌ No Input Validation
Injection attacks, crashes → Always validate

### ❌ Commented-Out Code
Use git history instead → Remove commented code

### ❌ No Story References
Can't trace code to story → Add AC references

---

## Quick Reference Checklist

### Before Writing Code
- [ ] Story AC is clear
- [ ] Simple solution identified
- [ ] No speculative features planned

### While Writing Code
- [ ] Methods <20 lines (preferred)
- [ ] Classes <200 lines (preferred)
- [ ] One class = one responsibility
- [ ] Story AC referenced in comments
- [ ] No hardcoded credentials
- [ ] Input validated
- [ ] Appropriate log levels

### After Writing Code
- [ ] Code is simple (KISS)
- [ ] Only implements story AC (YAGNI)
- [ ] Single Responsibility (SRP)
- [ ] No commented-out code
- [ ] No unused imports/variables
- [ ] Story traceability present

### Before Committing
- [ ] All acceptance criteria implemented
- [ ] Tests written for AC + business logic
- [ ] Coverage analyzed (gaps addressed)
- [ ] No security vulnerabilities
- [ ] Dependencies justified
- [ ] Code reviewed (if applicable)

---

**Remember: These principles apply to ALL programming languages. Good code is simple, focused, and traceable to requirements.**
