---
name: java-best-practices
description: Java-specific coding guidelines for Spring Boot and Maven projects. Modern Java syntax, Spring patterns, Maven standards, null safety. Auto-activates when writing Java code.
---

Use this skill when writing Java code, especially Spring Boot applications with Maven.

**Note:** For language-agnostic principles (YAGNI, KISS, SRP), see the `development-principles` skill which activates alongside this one.

## Java-Specific Guidelines

### Naming Conventions
- **Classes:** `PascalCase` (UserService, OrderController)
- **Methods/Variables:** `lowerCamelCase` (processMessage, userId)
- **Constants:** `UPPER_SNAKE_CASE` (MAX_RETRY_ATTEMPTS)
- **Packages:** lowercase (com.example.service)

### Spring Boot Patterns
- **Controllers:** `@RestController` + `@RequestMapping`
- **Services:** `@Service` (business logic)
- **Repositories:** `@Repository` or extend `JpaRepository`
- **Components:** `@Component` (utilities, helpers)
- **Configuration:** `@Configuration` (setup beans)

### Layered Architecture
```
Controller (REST API)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
```

**Rule:** Controllers call Services, Services call Repositories. No skipping layers.

---

## Code Quality Rules

### Visibility
- Default to `private`
- Use `protected`, `public` only when necessary
- No public fields (use getters/setters or Lombok)

### Null Safety
- Use `@NonNull`, `@Nullable` annotations
- Use `Optional<T>` for return values that may be null (business case, not always)
- Check for null in public methods

### Immutability
- Prefer immutable objects (Records, `final` variables)
- Use Records for DTOs when possible
- `final` for fields that don't change

### Error Handling
- Create custom exceptions for business cases
- Use `@RestControllerAdvice` for global exception handling
- Return meaningful error messages

---

## Maven Standards

### Standard Directory Layout (MANDATORY)
```
src/
├── main/
│   ├── java/           # Java source code
│   └── resources/      # Config files (application.yaml)
└── test/
    ├── java/           # Test source code
    └── resources/      # Test config files
```

### Dependencies
- Use Spring Boot Starter Parent for version management
- Don't override plugin versions (parent manages them)
- Document dependency choices
- Prefer Spring Boot starters over individual dependencies

### Build Commands
- Build: `./mvnw clean install`
- Tests: `./mvnw test`
- Skip tests: `./mvnw clean install -DskipTests` (only when explicitly needed)

---

## Spring Boot Best Practices

### Configuration
- Use `application.yaml` (NOT application.properties)
- Segregate large configs into `config/` subfolder
- Use profiles for env-specific config (dev, prod)

### Error Handling
- Use `@RestControllerAdvice` + extend `ResponseEntityExceptionHandler`
- Enable ProblemDetails: `spring.mvc.problemdetails.enabled=true`
- Create custom exceptions extending `ErrorResponseException`

### Dependency Injection
- Use constructor injection (preferred)
- Avoid field injection with `@Autowired`
- Use `@RequiredArgsConstructor` (Lombok) for constructor injection

---

## Common Anti-Patterns

### ❌ Public Everything
```java
public class UserService {
    public String helper() { ... }  // Should be private
}
```

### ❌ God Classes
```java
// One class doing everything
public class UserService {
    public void createUser() { ... }
    public void sendEmail() { ... }
    public void generateReport() { ... }
    public void exportToPdf() { ... }
}
```

### ❌ Skipping Layers
```java
@RestController
public class UserController {
    @Autowired
    private UserRepository repository;  // Skip Service layer - BAD!

    @GetMapping("/users")
    public List<User> getUsers() {
        return repository.findAll();  // Business logic in controller!
    }
}
```

### ❌ Field Injection
```java
@Service
public class UserService {
    @Autowired
    private UserRepository repository;  // Field injection - BAD!
}
```

✅ Use constructor injection instead.

---

## Progressive Disclosure

For detailed guidelines on refactoring, code quality, modern Java syntax, Spring Boot patterns, Maven configuration, and comprehensive examples, see `reference.md`.

Only load `reference.md` when user needs detailed help with:
- Refactoring strategies
- Modern Java syntax (Records, Switch Expressions, etc.)
- Spring Boot advanced patterns
- Maven multi-module projects
- Performance optimization

Otherwise, keep context lean.

---

**This skill activates automatically when user mentions: java, spring, spring boot, maven, controller, service, repository, bean, configuration.**
