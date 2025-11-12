# Java, Spring Boot & Maven Best Practices Reference

**Java-specific guidelines for Spring Boot and Maven projects.**

**Note:** For language-agnostic principles (YAGNI, KISS, SRP, code size, story traceability, security, performance), see the `development-principles` skill.

This document focuses on Java-specific syntax, Spring Boot patterns, and Maven standards.

---

## Modern Java Syntax

#### var (Local Variables)
```java
// ✅ Use var when type is obvious from initializer
var items = new HashMap<String, List<Integer>>();
var result = validationService.validateImage(path);

// ❌ Avoid when type is unclear
var count = 0;  // Use explicit: int count = 0;
Item item = getItem();  // Type not obvious
```

#### Diamond Operator <>
```java
// ❌ BEFORE: Redundant type arguments
List<String> items = new ArrayList<String>();

// ✅ AFTER: Use diamond operator
List<String> items = new ArrayList<>();
```

#### Records for Data Carriers (Java 16+)
```java
// ✅ Immutable data containers
public record ValidationResult(boolean valid, String message) {}

// ❌ NOT for services/business logic
public record FileSystemService(ValidationService service) {
    public void copyFile(Path src, Path tgt) { }  // Wrong - use class
}
```

#### Modern Collections (Java 10+)
```java
// ❌ OLD: Collections utilities
Collections.unmodifiableList(new ArrayList<>(items))
Arrays.asList("foo", "bar")

// ✅ NEW: Modern factory methods
List.copyOf(items)
Set.of("foo", "bar")
Map.of("key", 1, "key2", 2)
```

#### Expression Lambdas
```java
// ❌ Statement lambda: Single expression in braces
list.forEach(item -> { System.out.println(item); });

// ✅ Expression lambda: No braces for single statement
list.forEach(System.out::println);
```

#### Optional Modern Methods
```java
// ❌ BEFORE
if (!optional.isPresent()) { return; }

// ✅ AFTER
if (optional.isEmpty()) { return; }
```

### Code Quality Rules

#### Visibility (Principle: Restrictive by Default)
```java
// ✅ Prefer private - expand only when necessary
private String name;           // Private (default)
protected void setup() { }      // Protected - for inheritance
public void process() { }       // Public - external API
```

#### Null Safety Annotations
```java
// ✅ Use @NotNull and @Nullable to prevent NPEs
public @NotNull ValidationResult validate(@NotNull Path file, @Nullable String options)

// ✅ Remove redundant null checks on @NotNull params
public record ScanResult(@NotNull List<Path> images) {
    public ScanResult {
        images = List.copyOf(images);  // Trust @NotNull contract
    }
}

// ✅ Use @Contract for flow analysis
@Contract("null -> false")
public boolean isValid(@Nullable Path file) {
    return file != null && Files.exists(file);
}
```

#### Final Fields (Immutability)
```java
// ❌ BEFORE: Mutable field
private DirectoryChooser chooser = new DirectoryChooser();

// ✅ AFTER: Make final
private final DirectoryChooser chooser = new DirectoryChooser();
```

#### Naming Conventions
- **Variables/Methods**: `lowerCamelCase`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Enums**: `UPPER_SNAKE_CASE`

### Refactoring Guidelines

#### Eliminate Unused Code
```java
// ❌ Remove: Unused imports
import java.util.Collections;  // Not used

// ❌ Remove: Unused fields/variables
private String unusedField;
int unusedVar = 42;

// ❌ Remove: Unused constructor parameters
public Service(@NotNull UnusedDep unused, @NotNull UsedDep used)

// ✅ AFTER: Keep only what's used
public Service(@NotNull UsedDep used)
```

#### Remove Redundant Parameters
```java
// ❌ BEFORE: Parameter always same value
createDialog("Title", task, "Cancel");
createDialog("Title", otherTask, "Cancel");

// ✅ AFTER: Extract to constants/method
private static final String TITLE = "Title";
createDialog(task);
```

#### Convert Unused Fields to Local Variables
```java
// ❌ BEFORE: Field only used in one method
private ValidationService service;

@BeforeEach
void setUp() {
    service = new ValidationService();
}

// ✅ AFTER: Local variable
@Test
void testSomething() {
    var service = new ValidationService();
}
```

#### Exception Handling
```java
// ❌ BEFORE: Redundant throws / printStackTrace
public void process() throws IOException {
    try {
        doWork();
    } catch (IOException e) {
        e.printStackTrace();
    }
}

// ✅ AFTER: Use logging, remove unnecessary throws
private static final Logger logger = LoggerFactory.getLogger(MyClass.class);

public void process() {
    try {
        doWork();
    } catch (IOException e) {
        logger.error("Failed to process", e);
    }
}
```

### Ambiguous References (Avoid)
```java
// ❌ ERROR: Ambiguous - java.util.concurrent.Future.State vs javafx.concurrent.Worker.State
Task<Image> task = loader.loadImage(path);
if (task.getState() == Task.State.CANCELLED) { }

// ✅ FIX: Use fully qualified name
if (task.getState() == javafx.concurrent.Worker.State.CANCELLED) { }
```

---

## Spring Boot Patterns

### Architecture: Layered (Controller → Service → Repository)
```java
// 1. Controller: Handle HTTP requests
@RestController
@RequestMapping("/api/images")
public class ImageController {
    private final ImageService service;

    public ImageController(ImageService service) {  // Constructor injection
        this.service = service;
    }

    @GetMapping("/{id}")
    public ImageDto getImage(@PathVariable Long id) {
        return service.findById(id);
    }
}

// 2. Service: Business logic
@Service
public class ImageService {
    private final ImageRepository repository;

    public ImageService(ImageRepository repository) {  // Constructor injection
        this.repository = repository;
    }

    public ImageDto findById(Long id) {
        return repository.findById(id)
            .map(ImageMapper::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
    }
}

// 3. Repository: Data access
@Repository
public interface ImageRepository extends JpaRepository<Image, Long> {
    List<Image> findByCategory(String category);
}
```

### Dependency Injection (Constructor Injection)
```java
// ✅ PREFERRED: Constructor injection (immutable, testable)
@Service
public class ImageService {
    private final ImageRepository repository;
    private final ValidationService validation;

    public ImageService(ImageRepository repository, ValidationService validation) {
        this.repository = repository;
        this.validation = validation;
    }
}

// ❌ AVOID: Field injection (tight coupling, hard to test)
@Service
public class ImageService {
    @Autowired
    private ImageRepository repository;
}
```

### Error Handling (@RestControllerAdvice)
```java
@RestControllerAdvice(basePackages = "com.example.api")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    // RFC 9457 ProblemDetails support
    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        detail.setTitle("Resource Not Found");
        detail.setDetail(ex.getMessage());
        return detail;
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        detail.setTitle("Validation Failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(detail);
    }
}

// Enable ProblemDetails in application.yaml:
// spring:
//   mvc:
//     problemdetails:
//       enabled: true
```

### Configuration (application.yaml)
```yaml
# src/main/resources/application.yaml
spring:
  application:
    name: image-sorter
  mvc:
    problemdetails:
      enabled: true  # RFC 9457 ProblemDetails
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  datasource:
    url: jdbc:mysql://localhost:3306/imagedb
    username: root
    password: password

# Split large configs:
# src/main/resources/config/logging.yaml
# src/main/resources/config/security.yaml
# Then import in application.yaml with spring.config.location
```

### Testing

#### @WebMvcTest (Unit test with MockMvc)
```java
@WebMvcTest(ImageController.class)
@Import(GlobalExceptionHandler.class)  // Include exception handler
class ImageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ImageService imageService;

    @Test
    void testGetImage() throws Exception {
        given(imageService.findById(1L))
            .willReturn(new ImageDto(1L, "test.jpg"));

        mockMvc.perform(get("/api/images/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("test.jpg"));
    }
}
```

#### @SpringBootTest (Integration test)
```java
@SpringBootTest
@AutoConfigureMockMvc
class ImageSortingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ImageRepository repository;

    @Test
    @Transactional
    void testEndToEndImageSorting() throws Exception {
        Image image = new Image();
        image.setName("test.jpg");
        repository.save(image);

        mockMvc.perform(get("/api/images/1"))
            .andExpect(status().isOk());
    }
}
```

---

## Maven Standards

### Standard Directory Layout (MANDATORY)
```
project-root/
├── pom.xml                              # Root configuration
├── src/
│   ├── main/
│   │   ├── java/                        # Production code
│   │   │   └── de/codelake/sorter/
│   │   │       ├── application/
│   │   │       ├── controller/
│   │   │       ├── service/
│   │   │       └── model/
│   │   └── resources/                   # Config & assets
│   │       ├── application.yaml
│   │       ├── logback.xml
│   │       └── static/
│   │
│   └── test/
│       ├── java/                        # Test code
│       │   └── de/codelake/sorter/
│       └── resources/                   # Test config
│           └── test.yaml
│
└── target/                              # GENERATED (gitignored)
```

**Rules:**
- ✅ Java files: `src/main/java/` or `src/test/java/`
- ✅ Resources: `src/main/resources/` or `src/test/resources/`
- ✅ Package matches directory: `de.codelake.sorter.service` → `de/codelake/sorter/service/`
- ❌ NEVER: `<sourceDirectory>` in pom.xml (use Maven defaults)
- ❌ NEVER: Java files in resources directories

### Spring Boot Parent POM
```xml
<project>
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.1</version>  <!-- Use latest stable -->
        <relativePath/>
    </parent>

    <groupId>de.codelake</groupId>
    <artifactId>image-sorter</artifactId>
    <version>1.0.0</version>

    <dependencies>
        <!-- Don't specify plugin versions - parent manages them -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <!-- Build plugins inherited from parent - don't override versions -->
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

### Multi-Module Structure
```xml
<!-- root pom.xml: Aggregator POM -->
<project>
    <modelVersion>4.0.0</modelVersion>
    <packaging>pom</packaging>  <!-- ✅ For aggregators -->

    <modules>
        <module>core</module>
        <module>api</module>
        <module>ui</module>
    </modules>
</project>

<!-- root pom.xml: Parent POM (dependency management) -->
<project>
    <modelVersion>4.0.0</modelVersion>
    <packaging>pom</packaging>  <!-- ✅ For parents -->

    <dependencyManagement>
        <dependencies>
            <!-- Centralized version control -->
        </dependencies>
    </dependencyManagement>
</project>
```

**Rule:** Always split parent-pom and aggregator-pom.

### Build Commands
```bash
# Compile
./mvnw -q clean compile

# Run tests
./mvnw -q test

# Integration tests
./mvnw -q verify

# Run application (no -q, show output)
./mvnw spring-boot:run

# Package
./mvnw -q package

# On Windows: Use mvnw.cmd instead
mvnw.cmd test
```

**Note:** Use `-q` (quiet) to suppress unnecessary log noise. Errors still print.

### Dependency Management
```xml
<!-- Document version decisions -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <!-- Version: 3.4.1 (latest as of 2025-01-07) -->
    <!-- Source: Spring Initializr API -->
</dependency>

<!-- Spring Boot 3.4.x requires maven-compiler-plugin >= 3.13.0 -->
<!-- Spring Boot 3.x minimum: Java 17 -->
```

---

## Anti-Patterns: What NOT to Do

### ❌ Field Injection (Tight Coupling)
```java
@Service
public class ImageService {
    @Autowired
    private ImageRepository repository;  // ❌ Hard to test, hidden dependency
}

// ✅ CORRECT: Constructor injection
@Service
public class ImageService {
    private final ImageRepository repository;

    public ImageService(ImageRepository repository) {
        this.repository = repository;
    }
}
```

### ❌ Custom Directories (Without Approval)
```xml
<!-- ❌ DON'T DO THIS -->
<build>
    <sourceDirectory>src</sourceDirectory>
    <resources>
        <resource>
            <directory>config</directory>
        </resource>
    </resources>
</build>

<!-- ✅ Use Maven defaults (no configuration needed) -->
```

### ❌ Mutable Singletons
```java
// ❌ Shared mutable state
public class Config {
    public static List<String> CATEGORIES = new ArrayList<>();
}

// ✅ Immutable or injected
@Component
public class ConfigService {
    private final List<String> categories = List.of("Photos", "Videos");
}
```

### ❌ Service Layers as Records
```java
// ❌ WRONG: Record with business logic
public record FileSystemService(Path rootDir) {
    public void copyFile(Path src, Path tgt) throws IOException { }
    public ScanResult scan(Path dir) { }
}

// ✅ CORRECT: Use class for services
@Service
public class FileSystemService {
    private final Path rootDir;

    public FileSystemService(Path rootDir) {
        this.rootDir = rootDir;
    }

    public void copyFile(Path src, Path tgt) throws IOException { }
}
```

### ❌ Swallowed Exceptions
```java
// ❌ Silent failures
try {
    processFile(path);
} catch (IOException e) {
    // Ignored!
}

// ✅ Log or rethrow
try {
    processFile(path);
} catch (IOException e) {
    logger.error("Failed to process file: {}", path, e);
    throw new ProcessingException("Could not process file", e);
}
```

### ❌ Null Without Documentation
```java
// ❌ Unclear if null is allowed
public ValidationResult validate(Path file) {
    if (file == null) return ValidationResult.invalid();
}

// ✅ Document with annotations
public @NotNull ValidationResult validate(@Nullable Path file) {
    if (file == null) return ValidationResult.invalid();
}
```

### ❌ Commented-Out Code
```java
// ❌ Dead code clutters repository
// service.process(item);
// logger.info("Processing complete");
// return result;

// ✅ Use Git history instead
// Git preserves everything - just delete it
```

### ❌ Overriding Plugin Versions
```xml
<!-- ❌ Parent POM already manages versions -->
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.11.0</version>  <!-- WRONG: Contradicts parent -->
        </plugin>
    </plugins>
</build>

<!-- ✅ CORRECT: Let parent manage -->
<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <!-- Version inherited from parent -->
        </plugin>
    </plugins>
</build>
```

---

## JavaDoc & Comments

### JavaDoc (MANDATORY for Public APIs)
```java
/**
 * Validates whether a file is a readable image.
 * <p>
 * Performs both extension and content validation. Returns detailed
 * validation result including failure reasons if validation fails.
 * </p>
 *
 * <p><b>Usage Example:</b></p>
 * <pre>{@code
 * ValidationResult result = service.validateImage(path);
 * if (result.isValid()) {
 *     processImage(result.getPath());
 * }
 * }</pre>
 *
 * @param file The file to validate (must not be {@code null})
 * @return ValidationResult containing validity status and messages
 * @throws IOException if file cannot be accessed
 * @see ValidationResult
 * @since 1.0.0
 */
public @NotNull ValidationResult validateImage(@NotNull Path file) throws IOException {
    // ...
}
```

### Inline Comments (When Needed)
```java
// ✅ Write comments for COMPLEX LOGIC
// Binary search requires sorted array; using case-insensitive comparator
int index = Collections.binarySearch(items, target, String.CASE_INSENSITIVE_ORDER);

// ✅ Write comments for BUSINESS RULES
// EU customers are VAT-exempt if valid VAT ID provided
if (customer.isEU() && customer.hasValidVATId()) {
    return priceWithoutVAT;
}

// ✅ Write comments for WORKAROUNDS (with ticket + timeline)
// WORKAROUND: External API returns null instead of empty list (TICKET-456)
// TODO: Remove once API v2.0 deployed (Q2 2025)
List<Item> items = response.getItems() != null ? response.getItems() : List.of();

// ❌ DON'T write comments that repeat the code
// Increment counter  ← Obvious from code
counter++;

// ❌ DON'T comment out code (use Git history)
// service.process(item);
// logger.info("Done");
```

---
## Quick Guidelines

### Before Committing Code
- [ ] No unused imports or variables
- [ ] Final on immutable fields
- [ ] @NotNull/@Nullable on parameters
- [ ] Constructor injection (not @Autowired)
- [ ] Records only for data carriers
- [ ] var used for obvious types
- [ ] JavaDoc on public methods
- [ ] No printStackTrace() in production
- [ ] No commented-out code
- [ ] Follows Maven directory layout

### Before Merging PR
- [ ] All tests pass (`mvnw test`)
- [ ] Integration tests pass (`mvnw verify`)
- [ ] No hardcoded values
- [ ] Configuration in application.yaml
- [ ] Global error handling via @RestControllerAdvice
- [ ] No ambiguous references

---

## Version Compatibility

| Spring Boot | Java | Maven Compiler |
|---|---|---|
| 3.4.x | 17+ | 3.13.0+ |
| 3.3.x | 17+ | 3.13.0+ |
| 3.2.x | 17+ | 3.11.0+ |
| 3.1.x | 17+ | 3.11.0+ |

---

## Related Resources

- **Java Language Guide**: Oracle Java Docs
- **Spring Boot Docs**: https://spring.io/projects/spring-boot
- **Maven Guide**: https://maven.apache.org/guides/
- **RFC 9457 ProblemDetails**: https://www.rfc-editor.org/rfc/rfc9457
