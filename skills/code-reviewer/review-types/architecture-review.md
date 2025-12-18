# Architecture Review Criteria

Review criteria for architectural and design aspects when changes span multiple layers or introduce new dependencies.

## When to Perform Architecture Review

Trigger architecture review when:
- 3+ layers affected (Controller, Service, Repository, Entity)
- New dependencies added (pom.xml, package.json, requirements.txt, build.gradle)
- New architectural patterns introduced
- Database schema changes
- API design changes (new endpoints, breaking changes)
- Major refactoring across modules

---

## Focus Areas

### 1. Architecture Pattern Recognition

**IMPORTANT:** First identify which architectural pattern the project follows:

| Pattern | Key Indicators |
|---------|----------------|
| **Layered** | Controller/Service/Repository structure, vertical layers |
| **Hexagonal** | Ports & Adapters, domain at center, infrastructure at edges |
| **Clean Architecture** | Use Cases, Entities, Interface Adapters, Frameworks |
| **Microservices** | Independent deployable services, API gateways |
| **Modular Monolith** | Bounded contexts, module boundaries within monolith |

**If NO clear pattern is recognizable:**
```markdown
**INFO:** No clear architectural pattern detected
- Project structure does not follow a recognizable architecture pattern
- Found mixed approaches: {describe what was found}
**Recommendation:** Document the intended architecture in claudedocs/adrs/ or claudedocs/guidelines/
**Impact:** Without documented architecture, consistency is harder to maintain
```

This is NOT a blocker but MUST appear in every architecture review report.

### 2. Layered Architecture Compliance
- **CRITICAL:** Layer violations (Controller → Repository directly)
- **CRITICAL:** Circular dependencies between packages/modules
- **WARNING:** Business logic in wrong layer (e.g., in Controller)
- **WARNING:** Mixed responsibilities across layers

### 3. Hexagonal Architecture Compliance

When hexagonal/ports-and-adapters pattern is detected:

- **CRITICAL:** Domain depends on infrastructure (dependency inversion violated)
- **CRITICAL:** Adapter directly accesses another adapter (should go through domain)
- **WARNING:** Port interface defined in adapter instead of domain
- **WARNING:** Domain entity contains framework annotations (@Entity, @JsonProperty)

**Hexagonal Structure:**
```
┌─────────────────────────────────────────┐
│              Adapters (Infrastructure)   │
│  ┌─────────────────────────────────┐    │
│  │         Ports (Interfaces)       │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │    Domain (Core Logic)   │    │    │
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**CRITICAL: Domain → Infrastructure Dependency**
```java
// BAD: Domain depends on infrastructure
package com.example.domain;

import org.springframework.data.jpa.repository.JpaRepository;  // CRITICAL!
import javax.persistence.Entity;  // CRITICAL!

@Entity  // Domain should be framework-agnostic
public class User { ... }
```

**Good Example:**
```java
// Domain - no framework dependencies
package com.example.domain;

public class User {
    private UserId id;
    private Email email;
    // Pure domain logic, no annotations
}

// Port - interface in domain
package com.example.domain.ports;

public interface UserRepository {
    User findById(UserId id);
    void save(User user);
}

// Adapter - implements port with framework
package com.example.infrastructure.persistence;

@Repository
public class JpaUserRepository implements UserRepository {
    // JPA implementation
}
```

### 4. Dependency Direction
- **CRITICAL:** Reverse dependencies (Repository → Controller, Infrastructure → Domain)
- **WARNING:** Tight coupling between unrelated modules
- **WARNING:** New dependencies creating circular references

### 5. ADR Compliance
- **WARNING:** Violations of documented Architectural Decision Records
- **WARNING:** Technology choices inconsistent with ADRs

### 6. API Design
- **WARNING:** Non-RESTful API design (when REST is project standard)
- **WARNING:** Breaking changes without versioning
- **WARNING:** Inconsistent naming conventions across endpoints

### 7. Design Patterns
- **WARNING:** Inappropriate pattern usage
- **SUGGESTION:** Missing patterns for common problems
- **SUGGESTION:** Over-engineering with unnecessary patterns

---

## Layer Separation - CRITICAL

### Standard Layer Structure

**Typical layered architecture:**
```
Controller Layer (presentation)
    ↓
Service Layer (business logic)
    ↓
Repository Layer (data access)
    ↓
Entity/Model Layer (domain)
```

### CRITICAL: Layer Violations

#### Bad Example 1: Controller Calls Repository Directly

```java
@RestController
public class UserController {
    @Autowired
    private UserRepository userRepository;  // CRITICAL: Bypass Service

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        return userRepository.findById(id).orElse(null);  // CRITICAL
    }
}
```

**Problem:** Business logic belongs in Service layer. Controller should not access Repository directly.

**Review Finding:**
```markdown
**CRITICAL:** Layer violation
- [UserController.java:8] Controller directly injecting Repository
- [UserController.java:12] Controller calling Repository method
**Rule:** architecture-decisions → Layer Separation
**Fix:** Inject UserService instead. Move logic to Service layer.
```

#### Good Example:

```java
@RestController
public class UserController {
    @Autowired
    private UserService userService;  // Correct: Call Service

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUser(id);  // Correct
    }
}

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;  // Correct: Service uses Repository

    public User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
    }
}
```

### CRITICAL: Circular Dependencies

**Bad Example:**
```
Package A → depends on → Package B
Package B → depends on → Package A  // CRITICAL: Circular
```

**Review Finding:**
```markdown
**CRITICAL:** Circular dependency
- [UserService.java:5] Imports OrderService
- [OrderService.java:5] Imports UserService
**Rule:** architecture-decisions → No Circular Dependencies
**Fix:** Extract shared logic to common service or use events/interfaces.
```

---

## Dependency Direction

### WARNING: Business Logic in Wrong Layer

**Bad Example:**
```java
@RestController
public class OrderController {
    @PostMapping("/orders")
    public Order createOrder(@RequestBody OrderRequest request) {
        // WARNING: Business logic in Controller
        double total = 0;
        for (OrderItem item : request.getItems()) {
            total += item.getPrice() * item.getQuantity();
            if (item.getQuantity() > 100) {
                total *= 0.9;  // Bulk discount logic in Controller!
            }
        }
        // ...
    }
}
```

**Good Example:**
```java
@RestController
public class OrderController {
    @Autowired
    private OrderService orderService;

    @PostMapping("/orders")
    public Order createOrder(@RequestBody OrderRequest request) {
        return orderService.createOrder(request);  // Delegate to Service
    }
}

@Service
public class OrderService {
    public Order createOrder(OrderRequest request) {
        // Business logic belongs here
        double total = calculateTotal(request.getItems());
        // ...
    }

    private double calculateTotal(List<OrderItem> items) {
        return items.stream()
            .mapToDouble(item -> {
                double itemTotal = item.getPrice() * item.getQuantity();
                return item.getQuantity() > 100 ? itemTotal * 0.9 : itemTotal;
            })
            .sum();
    }
}
```

**Review Finding:**
```markdown
**WARNING:** Business logic in Controller
- [OrderController.java:8-14] Discount calculation in Controller
**Rule:** architecture-decisions → Service Layer Responsibility
**Fix:** Move calculation to OrderService.calculateTotal()
```

---

## ADR Compliance

### WARNING: Technology Choice Violations

If `claudedocs/adrs/` directory exists, check for ADR violations.

**Example ADR:** `claudedocs/adrs/ADR-003-use-postgresql.md`
```markdown
# ADR-003: Use PostgreSQL for Data Storage

Status: Accepted
Date: 2024-01-15

## Decision
We will use PostgreSQL as our primary relational database.

## Rationale
- ACID compliance required
- JSON support for flexible data
- Strong community and tooling
```

**Bad Example:**
```xml
<!-- pom.xml -->
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>  <!-- WARNING: Violates ADR-003 -->
</dependency>
```

**Review Finding:**
```markdown
**WARNING:** ADR violation
- [pom.xml:42] H2 database dependency added
**Rule:** ADR-003 (Use PostgreSQL for Data Storage)
**Fix:** Use PostgreSQL as specified in ADR-003. If H2 is for testing only, document it.
```

---

## API Design

### WARNING: Non-RESTful Endpoints

If project uses REST as standard:

**Bad Example:**
```java
@PostMapping("/getUserById")  // WARNING: Not RESTful
public User getUserById(@RequestBody IdRequest request) { ... }

@GetMapping("/deleteUser/{id}")  // CRITICAL: GET for delete operation
public void deleteUser(@PathVariable Long id) { ... }
```

**Good Example:**
```java
@GetMapping("/users/{id}")  // RESTful: GET for retrieval
public User getUser(@PathVariable Long id) { ... }

@DeleteMapping("/users/{id}")  // RESTful: DELETE for deletion
public void deleteUser(@PathVariable Long id) { ... }
```

### WARNING: Breaking Changes Without Versioning

**Bad Example:**
```java
// Old API
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return new User(id, name, email);  // Returns User object
}

// Modified API - BREAKING CHANGE
@GetMapping("/users/{id}")
public UserResponse getUser(@PathVariable Long id) {
    return new UserResponse(id, name, email, roles);  // Different structure!
}
```

**Good Example:**
```java
// Keep v1 for backward compatibility
@GetMapping("/v1/users/{id}")
public User getUser(@PathVariable Long id) {
    return new User(id, name, email);
}

// Add v2 for new structure
@GetMapping("/v2/users/{id}")
public UserResponse getUserV2(@PathVariable Long id) {
    return new UserResponse(id, name, email, roles);
}
```

**Review Finding:**
```markdown
**WARNING:** Breaking API change without versioning
- [UserController.java:15] Changed response structure from User to UserResponse
**Rule:** architecture-decisions → API Versioning
**Fix:** Introduce /v2/users/{id} endpoint, keep /v1/users/{id} unchanged for backward compatibility.
```

---

## Design Patterns

### WARNING: Inappropriate Pattern Usage

**Bad Example - Unnecessary Singleton:**
```java
// YAGNI violation: Singleton pattern when not needed
public class UserValidator {
    private static UserValidator instance;

    private UserValidator() {}  // Overengineering

    public static UserValidator getInstance() {
        if (instance == null) {
            instance = new UserValidator();
        }
        return instance;
    }

    public boolean validate(User user) { ... }
}
```

**Good Example - Simple Class:**
```java
// Simple, testable, no unnecessary pattern
@Component
public class UserValidator {
    public boolean validate(User user) { ... }
}
```

### SUGGESTION: Missing Factory Pattern

When creating complex objects with many variations:

**Suggestion:**
```markdown
**SUGGESTION:** Consider Factory pattern
- [OrderService.java:25-45] Complex order creation logic with multiple variations
**Benefit:** Factory pattern would centralize order creation logic
**Fix (optional):** Extract to OrderFactory if complexity grows
```

---

## New Dependencies

### WARNING: Unjustified Dependencies

**Check new dependencies in:**
- `pom.xml` (Java/Maven)
- `build.gradle` (Java/Gradle)
- `package.json` (JavaScript/Node)
- `requirements.txt` or `pyproject.toml` (Python)

**Questions to ask:**
1. Is this dependency required for story requirements?
2. Does existing dependency already provide this functionality?
3. Is this the approved version (check ADRs)?
4. Does this create conflicting dependencies?

**Review Finding:**
```markdown
**WARNING:** New dependency without justification
- [pom.xml:55] Added commons-lang3
**Question:** Does Spring Boot's built-in utilities cover this use case?
**Recommendation:** Verify necessity. Spring provides StringUtils, ObjectUtils, etc.
```

---

## Database Schema Changes

### WARNING: Schema Changes Without Migration

When reviewing entity changes:

**Bad Example:**
```java
@Entity
public class User {
    @Id
    private Long id;

    private String name;

    // New field without migration script
    @Column(nullable = false)  // WARNING: Breaking change
    private String email;
}
```

**Review Finding:**
```markdown
**WARNING:** Schema change without migration
- [User.java:12] Added non-nullable email column
**Risk:** Existing rows will fail constraint
**Fix:** Provide migration script (Flyway/Liquibase) with default value or make nullable initially
```

---

## Review Process

When performing architecture review:

1. **Identify Architecture Pattern** - ALWAYS do this first
   - Determine if project follows Layered, Hexagonal, Clean, or other pattern
   - If no clear pattern: Include INFO note in report (not a blocker)
2. **Check Pattern-Specific Violations** - CRITICAL priority
   - Layered: Layer violations, circular dependencies
   - Hexagonal: Domain→Infrastructure dependencies, adapter violations
3. **Check Circular Dependencies** - CRITICAL priority
4. **Check ADR Compliance** - If ADRs exist
5. **Check API Design** - RESTful conventions, versioning
6. **Check New Dependencies** - Justification and conflicts
7. **Check Design Patterns** - Appropriateness

**Remember:** Only flag architectural issues relevant to the changes made. Don't demand full system refactoring unless it directly impacts current story.

**IMPORTANT:** The architecture pattern recognition (or lack thereof) MUST always appear in the report, even if no violations are found.
