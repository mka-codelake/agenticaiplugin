---
name: spring-boot-best-practices
description: Spring Boot framework best practices. Component stereotypes, layered architecture, dependency injection, configuration, error handling. Auto-activates when using Spring Boot.
---

Use this skill when working with Spring Boot applications (framework-specific patterns).

**Note:**
- For Java language best practices, see the `java-best-practices` skill
- For Maven/Gradle build tool basics, see the `maven-best-practices` skill
- For language-agnostic principles (YAGNI, KISS, SRP), see the `development-principles` skill
- For dependency selection and version lookup, use the `technology-advisor-jvm` skill

---

## Spring Boot Dependency Management

Spring Boot manages versions of 100+ popular libraries to ensure compatibility. This section covers **both Maven and Gradle**.

### Maven: Spring Boot Starter Parent

**Use Spring Boot Starter Parent in pom.xml:**

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>
    <relativePath/>
</parent>
```

**Benefits:**
- Manages versions of 100+ dependencies
- Ensures compatibility across Spring ecosystem
- No need to specify `<version>` for managed dependencies
- Includes build plugin configuration

---

### Gradle: Spring Boot Plugin

**Use Spring Boot Gradle Plugin in build.gradle:**

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.0'
    id 'io.spring.dependency-management' version '1.1.0'
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    // No version needed - managed by Spring Boot plugin
}
```

**Or in build.gradle.kts (Kotlin DSL):**

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.0"
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    // No version needed - managed by Spring Boot plugin
}
```

---

### Managed Dependencies: Omit `<version>`

**Spring Boot manages versions for common libraries. DO NOT specify versions for managed dependencies.**

**Maven Example:**
```xml
<!-- GOOD: Version managed by Spring Boot Parent -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <!-- NO <version> tag -->
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
    <!-- NO <version> tag -->
</dependency>

<!-- BAD: Unnecessary version (conflicts with Spring Boot) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <version>3.3.0</version>  <!-- DON'T DO THIS! -->
</dependency>
```

**Gradle Example:**
```groovy
dependencies {
    // GOOD: Version managed by Spring Boot plugin
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'

    // BAD: Unnecessary version
    implementation 'org.springframework.boot:spring-boot-starter-web:3.3.0'  // DON'T DO THIS!
}
```

---

### Common Managed Dependencies

**Spring Boot manages versions for these popular libraries:**

- **All Spring Boot Starters** (`spring-boot-starter-*`)
- **Jackson** (JSON processing)
- **Hibernate / JPA** (`hibernate-core`, `hibernate-validator`)
- **Lettuce** (Redis client)
- **Logback** (logging)
- **JUnit 5** (`junit-jupiter`)
- **Mockito** (testing)
- **AssertJ** (testing assertions)

**Check if managed:**
- **Maven:** `mvn dependency:tree` - if library appears without explicit `<version>` in pom.xml, it's managed
- **Gradle:** `./gradlew dependencies` - Spring Boot plugin manages versions

---

### Spring Boot Starters: Prefer Starters over Individual Dependencies

**Spring Boot Starters bundle commonly used dependencies + auto-configuration.**

**GOOD: Use Spring Boot Starter**
```xml
<!-- Maven -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

```groovy
// Gradle
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
```

**Includes automatically:**
- `spring-data-redis`
- `lettuce-core` (Redis client)
- Auto-configuration for Redis

**BAD: Individual dependencies (more work, error-prone)**
```xml
<!-- Maven - Don't do this! -->
<dependency>
    <groupId>org.springframework.data</groupId>
    <artifactId>spring-data-redis</artifactId>
    <version>???</version>  <!-- What version? -->
</dependency>
<dependency>
    <groupId>io.lettuce</groupId>
    <artifactId>lettuce-core</artifactId>
    <version>???</version>
</dependency>
<!-- + manual configuration needed -->
```

**Why Starters are better:**
- Auto-configuration included (no manual setup)
- All required dependencies bundled
- Version compatibility guaranteed
- Less boilerplate

---

### Common Spring Boot Starters

**Web & REST:**
- `spring-boot-starter-web` - REST APIs (Spring MVC, Tomcat)
- `spring-boot-starter-webflux` - Reactive web (WebFlux, Netty)
- `spring-boot-starter-validation` - Bean validation (Hibernate Validator)

**Data:**
- `spring-boot-starter-data-jpa` - JPA / Hibernate
- `spring-boot-starter-data-redis` - Redis (Lettuce)
- `spring-boot-starter-data-mongodb` - MongoDB

**Messaging:**
- `spring-boot-starter-kafka` - Apache Kafka

**Testing:**
- `spring-boot-starter-test` - Testing (JUnit 5, Mockito, AssertJ)

**Others:**
- `spring-boot-starter-actuator` - Production monitoring
- `spring-boot-starter-security` - Spring Security

---

### Spring Boot Version Detection

**Always check Spring Boot version before adding dependencies:**

**Maven (pom.xml):**
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>  <!-- Spring Boot version -->
</parent>
```

**Gradle (build.gradle):**
```groovy
plugins {
    id 'org.springframework.boot' version '3.3.0'
}
```

**Version differences:**
- **Spring Boot 2.x** - Java 8+, javax.* packages
- **Spring Boot 3.x** - Java 17+, jakarta.* packages (Jakarta EE 9+)

**IMPORTANT:** Spring Boot 2.x and 3.x are NOT compatible due to javax → jakarta package migration!

---

### Maven Build Plugin

**Maven: Spring Boot Maven Plugin**

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <!-- NO <version> - managed by Spring Boot parent -->
        </plugin>
    </plugins>
</build>
```

**Features:**
- Creates executable JAR with embedded Tomcat
- `./mvnw spring-boot:run` - Run application
- Repackages JAR for deployment

---

### Gradle Build Plugin

**Gradle: Spring Boot Plugin**

```groovy
plugins {
    id 'org.springframework.boot' version '3.3.0'
    id 'io.spring.dependency-management' version '1.1.0'
}

tasks.named('bootJar') {
    archiveBaseName.set('my-app')
    archiveVersion.set('1.0.0')
}
```

**Features:**
- Creates executable JAR with embedded Tomcat
- `./gradlew bootRun` - Run application
- Dependency management (similar to Maven parent)

---

## Spring Boot Framework Patterns

### Component Stereotypes

Spring Boot uses stereotype annotations to mark different layers:

- **@RestController** - REST API endpoints (Controller layer)
- **@Service** - Business logic (Service layer)
- **@Repository** - Data access (Repository layer)
- **@Component** - Generic components (utilities, helpers)
- **@Configuration** - Bean configuration classes

**Examples:**
```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    // REST API endpoints
}

@Service
public class UserService {
    // Business logic
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Data access
}

@Component
public class PasswordEncoder {
    // Utility component
}

@Configuration
public class AppConfig {
    // Bean definitions
}
```

---

### Layered Architecture

**Spring Boot follows a layered architecture:**

```
┌─────────────────┐
│   Controller    │  REST API Layer (@RestController)
│  (REST API)     │  - HTTP requests/responses
│                 │  - Validation
│                 │  - Delegates to Service
└────────┬────────┘
         ↓
┌─────────────────┐
│    Service      │  Business Logic Layer (@Service)
│ (Business Logic)│  - Business rules
│                 │  - Transactions
│                 │  - Orchestrates Repository calls
└────────┬────────┘
         ↓
┌─────────────────┐
│   Repository    │  Data Access Layer (@Repository)
│  (Data Access)  │  - Database queries
│                 │  - JPA/JDBC operations
└─────────────────┘
```

**Rule:** Controllers call Services, Services call Repositories. **No skipping layers.**

**Good (Follows layered architecture):**
```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;  // Controller → Service

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return service.findAll();  // Delegates to service
    }
}

@Service
public class UserService {
    private final UserRepository repository;  // Service → Repository

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public List<User> findAll() {
        return repository.findAll();  // Business logic + data access
    }
}
```

**Bad (Skips Service layer):**
```java
@RestController
public class UserController {
    @Autowired
    private UserRepository repository;  // Controller → Repository DIRECTLY - BAD!

    @GetMapping("/users")
    public List<User> getUsers() {
        return repository.findAll();  // Business logic in controller!
    }
}
```

**Why bad:** Controllers should not contain business logic or call repositories directly. Service layer provides:
- Transaction management
- Business logic encapsulation
- Reusability across multiple controllers

---

### Dependency Injection

**Spring Boot Best Practice: Constructor Injection**

**Good (Constructor Injection):**
```java
@Service
public class UserService {
    private final UserRepository repository;  // final = immutable

    // Constructor Injection (preferred)
    public UserService(UserRepository repository) {
        this.repository = repository;
    }
}

// With Lombok @RequiredArgsConstructor (even better!)
@Service
@RequiredArgsConstructor  // Generates constructor for final fields
public class UserService {
    private final UserRepository repository;
}
```

**Bad (Field Injection):**
```java
@Service
public class UserService {
    @Autowired
    private UserRepository repository;  // Field injection - BAD!
}
```

**Why Constructor Injection is better:**
1. **Immutability** - `final` fields prevent accidental modification
2. **Testability** - Easy to inject mocks in tests
3. **Null Safety** - Constructor enforces non-null dependencies
4. **Explicitness** - Dependencies are clear

**Why avoid Field Injection:**
- Cannot make fields `final`
- Harder to test (requires reflection)
- Hidden dependencies
- Circular dependency issues

---

### Configuration

**application.yaml (Preferred over application.properties):**

```yaml
# application.yaml
spring:
  application:
    name: my-app
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:secret}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  mvc:
    problemdetails:
      enabled: true  # Enable ProblemDetails (RFC 7807)

server:
  port: 8080

app:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP:localhost:9092}
    topic: user-events
```

**Why YAML over Properties:**
- Hierarchical structure (easier to read)
- Less repetition
- Better for complex configurations

**Profile-specific configuration:**
- `application.yaml` - Default configuration
- `application-dev.yaml` - Development overrides
- `application-prod.yaml` - Production overrides

**Activate profile:**
```bash
java -jar app.jar --spring.profiles.active=prod
```

**Large configurations:** Segregate into `config/` subfolder:
```
src/main/resources/
├── application.yaml
└── config/
    ├── database.yaml
    ├── kafka.yaml
    └── security.yaml
```

---

### Error Handling

**Spring Boot Best Practice: @RestControllerAdvice**

**1. Enable ProblemDetails (RFC 7807):**
```yaml
# application.yaml
spring:
  mvc:
    problemdetails:
      enabled: true
```

**2. Create Global Exception Handler:**
```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ProblemDetail handleUserNotFound(UserNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND,
            ex.getMessage()
        );
        problem.setTitle("User Not Found");
        return problem;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            ex.getMessage()
        );
        problem.setTitle("Invalid Request");
        return problem;
    }
}
```

**3. Create Custom Exceptions extending ErrorResponseException:**
```java
public class UserNotFoundException extends ErrorResponseException {
    public UserNotFoundException(Long userId) {
        super(HttpStatus.NOT_FOUND,
              ProblemDetail.forStatusAndDetail(
                  HttpStatus.NOT_FOUND,
                  "User with ID " + userId + " not found"
              ),
              null
        );
    }
}
```

**Why ProblemDetails:**
- Standard RFC 7807 format
- Consistent error responses across API
- Machine-readable error details
- Better than custom error response DTOs

---

## Common Anti-Patterns

### ❌ Skipping Service Layer

```java
@RestController
public class UserController {
    @Autowired
    private UserRepository repository;  // Skip Service - BAD!

    @GetMapping("/users")
    public List<User> getUsers() {
        return repository.findAll();  // Business logic in controller!
    }
}
```

**Why bad:**
- Business logic leaks into controller
- No transaction management
- Hard to reuse logic
- Violates separation of concerns

**Fix:** Add Service layer:
```java
@RestController
public class UserController {
    private final UserService service;  // Controller → Service

    @GetMapping("/users")
    public List<User> getUsers() {
        return service.findAll();  // Delegates to service
    }
}

@Service
public class UserService {
    private final UserRepository repository;

    @Transactional(readOnly = true)
    public List<User> findAll() {
        return repository.findAll();
    }
}
```

---

### ❌ Field Injection

```java
@Service
public class UserService {
    @Autowired
    private UserRepository repository;  // Field injection - BAD!
}
```

**Why bad:**
- Cannot use `final` (immutability)
- Harder to test
- Hidden dependencies

**Fix:** Constructor Injection:
```java
@Service
@RequiredArgsConstructor  // Lombok
public class UserService {
    private final UserRepository repository;  // final + constructor injection
}
```

---

### ❌ God Services

```java
@Service
public class UserService {
    public void createUser() { ... }
    public void sendEmail() { ... }
    public void generateReport() { ... }
    public void exportToPdf() { ... }
}
```

**Why bad:** Violates Single Responsibility Principle (see `development-principles` skill).

**Fix:** Split into focused services:
- `UserService` - User management
- `EmailService` - Email sending
- `ReportService` - Report generation
- `PdfExportService` - PDF export

---

### ❌ Using application.properties (instead of YAML)

```properties
# application.properties - Repetitive, hard to read
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=postgres
spring.datasource.password=secret
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
```

**Fix:** Use application.yaml:
```yaml
# application.yaml - Hierarchical, easy to read
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: postgres
    password: secret
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
```

---

## Spring Boot Version Detection

**Always check Spring Boot version in pom.xml or build.gradle:**

**Maven (pom.xml):**
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>  <!-- Spring Boot version -->
</parent>
```

**Gradle (build.gradle):**
```groovy
plugins {
    id 'org.springframework.boot' version '3.3.0'
}
```

**Version differences:**
- **Spring Boot 2.x** - Requires Java 8+, javax.* packages
- **Spring Boot 3.x** - Requires Java 17+, jakarta.* packages, Native support

---

## Integration with Other Skills

**technology-advisor-jvm:**
- When adding Spring Boot dependencies (starters), use `technology-advisor-jvm` skill
- It checks for Spring Boot managed dependencies
- It verifies compatibility with Spring Boot version

**java-best-practices:**
- Use Java language best practices (naming, null safety, immutability)
- Combine with Spring Boot patterns

**maven-best-practices:**
- Use Maven standards for project structure
- Leverage Spring Boot Starter Parent for dependency management

---

## Progressive Disclosure

For detailed guidelines on:
- Spring Boot advanced patterns (async, caching, scheduling)
- Spring Security integration
- Spring Data JPA best practices
- Transaction management
- Testing Spring Boot applications

See `reference.md` (load only when user explicitly needs details).

---

**This skill activates automatically when user mentions: spring boot, @SpringBootApplication, @RestController, @Service, @Repository, spring-boot-starter-*.**

**Note:** This skill covers **Spring Boot framework only**. For Java language, use `java-best-practices`. For Maven build tool, use `maven-best-practices`.
