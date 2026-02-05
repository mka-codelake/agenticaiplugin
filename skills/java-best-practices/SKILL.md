---
name: java-best-practices
description: Java language best practices (17+, 21+, 25+). Use PROACTIVELY when writing or reviewing Java code (.java files). Covers naming conventions, null safety, immutability, modern syntax. For Spring Boot, also load spring-boot-best-practices.
user-invocable: false
---

Use this skill when writing Java code (language-specific best practices).

**Note:**
- For language-agnostic principles (YAGNI, KISS, SRP), see the `development-principles` skill
- For Spring Boot framework patterns, see the `spring-boot-best-practices` skill
- For Maven build tool, see the `maven-best-practices` skill

## Java Language Guidelines

### Naming Conventions

- **Classes:** `PascalCase` (UserService, OrderController)
- **Methods/Variables:** `lowerCamelCase` (processMessage, userId)
- **Constants:** `UPPER_SNAKE_CASE` (MAX_RETRY_ATTEMPTS)
- **Packages:** lowercase (com.example.service)

**Examples:**
```java
public class MessageProcessor {  // Class: PascalCase
    private static final int MAX_RETRIES = 3;  // Constant: UPPER_SNAKE_CASE

    public void processMessage(String messageText) {  // Method: lowerCamelCase
        int retryCount = 0;  // Variable: lowerCamelCase
    }
}
```

---

### Visibility

**Default to `private`:**
- Use `private` for all fields and helper methods
- Use `protected` only for inheritance scenarios
- Use `public` only for API methods
- **Never use public fields** (use getters/setters or Lombok)

**Why:** Encapsulation - hide implementation details, expose only necessary API.

**Good:**
```java
public class UserService {
    private UserRepository repository;  // private field

    private String formatName(String name) {  // private helper
        return name.trim().toLowerCase();
    }

    public User createUser(String name) {  // public API
        String formatted = formatName(name);
        return repository.save(new User(formatted));
    }
}
```

**Bad:**
```java
public class UserService {
    public UserRepository repository;  // public field - BAD!

    public String formatName(String name) {  // public helper - unnecessary
        return name.trim().toLowerCase();
    }
}
```

---

### Null Safety

**Use annotations and Optional:**
- `@NonNull`, `@Nullable` annotations (from Lombok or javax.validation)
- `Optional<T>` for return values that may be null (business case)
- Check for null in public methods

**When to use Optional:**
- ✅ Return values when absence is expected (business logic)
- ❌ Method parameters (use `@NonNull` instead)
- ❌ Fields (use `@NonNull` instead)

**Examples:**
```java
public class UserService {

    // Optional for return value (user may not exist)
    public Optional<User> findById(@NonNull Long id) {
        return repository.findById(id);
    }

    // Null check in public method
    public User createUser(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name cannot be null or blank");
        }
        return repository.save(new User(name));
    }
}
```

---

### Immutability

**Prefer immutable objects:**
- Use `final` for variables that don't change
- Use Java Records for DTOs/value objects
- Immutable collections with `List.of()`, `Set.of()`, `Map.of()`

**Why:** Immutability prevents bugs, enables thread-safety, makes code easier to reason about.

**Good (Immutable):**
```java
public record UserDTO(Long id, String name, String email) {}  // Record: immutable

public class MessageProcessor {
    private final MessageRepository repository;  // final field

    public MessageProcessor(MessageRepository repository) {
        this.repository = repository;  // assigned once in constructor
    }
}
```

**Bad (Mutable):**
```java
public class UserDTO {
    public Long id;  // mutable field
    public String name;  // mutable field
}
```

---

## Modern Java Syntax (Version-Aware)

**IMPORTANT: Always detect project Java version from pom.xml or build.gradle first!**

**Check version in pom.xml:**
```xml
<properties>
    <java.version>21</java.version>
</properties>
```

**Check version in build.gradle:**
```groovy
sourceCompatibility = '21'
```

---

### Java 17+ (Baseline)

**Records** (Value Objects / DTOs):
```java
// Old style (verbose)
public class User {
    private final Long id;
    private final String name;

    public User(Long id, String name) {
        this.id = id;
        this.name = name;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    // + equals(), hashCode(), toString()
}

// Java 17+ Record (concise)
public record User(Long id, String name) {}
```

**Pattern Matching for instanceof:**
```java
// Old style
if (obj instanceof String) {
    String str = (String) obj;
    System.out.println(str.length());
}

// Java 17+ Pattern Matching
if (obj instanceof String str) {
    System.out.println(str.length());  // str already cast
}
```

**Text Blocks** (Multi-line strings):
```java
// Old style
String json = "{\n" +
              "  \"name\": \"John\",\n" +
              "  \"age\": 30\n" +
              "}";

// Java 17+ Text Blocks
String json = """
    {
      "name": "John",
      "age": 30
    }
    """;
```

**var** (Type inference for obvious types):
```java
// Verbose
Map<String, List<User>> usersByDepartment = new HashMap<>();

// Java 17+ var (obvious from right side)
var usersByDepartment = new HashMap<String, List<User>>();
```

**Immutable Collections:**
```java
List<String> names = List.of("Alice", "Bob", "Charlie");  // immutable
Set<Integer> numbers = Set.of(1, 2, 3);  // immutable
Map<String, Integer> ages = Map.of("Alice", 30, "Bob", 25);  // immutable
```

---

### Java 21+ (Recommended)

**Virtual Threads** (High-concurrency I/O):
```java
// Java 21+ Virtual Threads for high-concurrency
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 10000; i++) {
        executor.submit(() -> {
            // I/O operation (e.g., HTTP request, database query)
            fetchDataFromAPI();
        });
    }
}
```

**Why:** Virtual Threads are lightweight (millions possible), ideal for I/O-bound tasks.

**Pattern Matching for switch:**
```java
// Old style
String result;
if (obj instanceof String) {
    result = "String of length " + ((String) obj).length();
} else if (obj instanceof Integer) {
    result = "Integer: " + obj;
} else {
    result = "Unknown";
}

// Java 21+ Switch with Pattern Matching
String result = switch (obj) {
    case String s -> "String of length " + s.length();
    case Integer i -> "Integer: " + i;
    default -> "Unknown";
};
```

**Record Patterns** (Deconstruct records):
```java
record Point(int x, int y) {}

// Java 21+ Record Patterns
if (obj instanceof Point(int x, int y)) {
    System.out.println("Point at " + x + ", " + y);
}
```

**Sequenced Collections:**
```java
List<String> list = List.of("a", "b", "c");
list.getFirst();  // "a"
list.getLast();   // "c"
list.reversed();  // ["c", "b", "a"]
```

---

### Java 22+

**Unnamed Variables** (for unused parameters):
```java
// Old style
list.stream()
    .map((item) -> processItem())  // 'item' unused
    .collect(Collectors.toList());

// Java 22+ Unnamed Variables
list.stream()
    .map(_ -> processItem())  // _ indicates unused
    .collect(Collectors.toList());
```

---

### Java 25+ (Latest LTS)

**Scoped Values** (Replacement for ThreadLocal with Virtual Threads):
```java
// Instead of ThreadLocal (problematic with virtual threads)
private static final ScopedValue<User> CURRENT_USER = ScopedValue.newInstance();

ScopedValue.where(CURRENT_USER, user)
    .run(() -> {
        // CURRENT_USER.get() available here
        processRequest();
    });
```

**Flexible Constructor Bodies:**
```java
record User(String name) {
    // Java 25+ Flexible Constructor
    public User {
        if (name == null) throw new IllegalArgumentException();
        name = name.trim();  // can modify param before assignment
    }
}
```

---

## Auto-Suggest Modern Alternatives

When user writes old-style code, automatically suggest modern Java alternatives:

**Example:**
User writes:
```java
if (obj instanceof String) {
    String str = (String) obj;
    ...
}
```

Suggest:
"Consider using Java 17+ Pattern Matching: `if (obj instanceof String str)`"

---

## Common Anti-Patterns

### ❌ Public Everything

```java
public class UserService {
    public String formatName(String name) { ... }  // Should be private
    public String helper() { ... }  // Should be private
}
```

**Why bad:** Exposes implementation details, makes refactoring harder.

**Fix:** Default to `private`, make `public` only when necessary.

---

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

**Why bad:** Violates Single Responsibility Principle (see `development-principles` skill).

**Fix:** Split into `UserService`, `EmailService`, `ReportService`, `PdfExporter`.

---

### ❌ Mutable DTOs

```java
public class UserDTO {
    public Long id;  // mutable
    public String name;  // mutable
}
```

**Why bad:** Mutable state leads to bugs, thread-safety issues.

**Fix:** Use Java 17+ Records for immutability:
```java
public record UserDTO(Long id, String name) {}
```

---

## Progressive Disclosure

For detailed guidelines on:
- Modern Java syntax examples and migration strategies
- Refactoring from old Java to modern Java
- Performance considerations (Virtual Threads vs traditional threads)
- Comprehensive anti-pattern catalog

See `reference.md` (load only when user explicitly needs details).

---

**This skill activates automatically when user mentions: java, .java files, javac, java code.**

**Note:** This skill covers **Java language only**. For Spring Boot framework patterns, use `spring-boot-best-practices`. For Maven build tool, use `maven-best-practices`.
