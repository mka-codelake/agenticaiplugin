---
description: Integration, system, and E2E testing patterns for Spring Boot. TestContainers, @SpringBootTest, async testing. Auto-activates when writing integration, system, or E2E tests.
user-invocable: false
---

Use this skill when writing integration, system, or E2E tests (not unit tests).

**Note:**
- For general testing philosophy, see `testing-philosophy` skill
- For unit testing patterns, see `spring-boot-best-practices` skill (Unit Testing section)
- For Java language best practices, see `java-best-practices` skill

---

## Integration vs Unit Tests

**Unit Tests:**
- Test single class/method in isolation
- Mock all dependencies
- Fast (milliseconds)
- Location: `src/test/java/unit/`

**Integration Tests:**
- Test multiple components together
- Real dependencies (database, Kafka, Redis via TestContainers)
- Slower (seconds)
- Location: `src/test/java/integration/`

**System/E2E Tests:**
- Test entire application flow
- Full Spring Boot context
- Real infrastructure
- Location: `src/test/java/e2e/` or `src/test/java/system/`

---

## Spring Boot Integration Testing

### @SpringBootTest

Use `@SpringBootTest` for integration tests that require full application context.

**Basic Setup:**
```java
@SpringBootTest
@ActiveProfiles("test")
class UserIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldCreateUserWithActiveStatus() {
        // STORY-042: User Registration
        // AC-1: New users have ACTIVE status

        // Given
        String username = "testuser";

        // When
        User user = userService.createUser(username);

        // Then
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        // AC-1 ✓
    }
}
```

**Why @SpringBootTest:**
- Loads full Spring application context
- All beans available (services, repositories, configuration)
- Tests real bean wiring and configuration
- Detects misconfiguration early

---

## TestContainers

Use TestContainers for integration tests with real infrastructure (PostgreSQL, Kafka, Redis, etc.).

### PostgreSQL with TestContainers

**Setup:**
```java
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class UserDatabaseIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldPersistUserToDatabase() {
        // EPIC-005: Database Integration
        // AC-2: Users persisted to PostgreSQL

        // Given
        User user = new User("john", "john@example.com");

        // When
        User saved = userRepository.save(user);

        // Then
        assertThat(saved.getId()).isNotNull();
        assertThat(userRepository.findById(saved.getId())).isPresent();
        // AC-2 ✓
    }
}
```

**Key Points:**
- `@Testcontainers` - Enables TestContainers support
- `@Container` - Manages container lifecycle
- `static` container = shared across all tests in class (faster)
- `@DynamicPropertySource` - Injects container connection details into Spring

---

### Kafka with TestContainers

**Setup:**
```java
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class KafkaIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.5.0")
    );

    @DynamicPropertySource
    static void configureKafka(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private KafkaTemplate<String, UserEvent> kafkaTemplate;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldProcessKafkaMessageAndCreateUser() {
        // EPIC-007: Kafka Message Processing
        // AC-1: CREATE message creates user with ACTIVE status

        // Given
        UserEvent event = new UserEvent(123L, "CREATE", "john");

        // When
        kafkaTemplate.send("user-events", event);

        // Then
        await().atMost(5, SECONDS).untilAsserted(() -> {
            Optional<User> user = userRepository.findById(123L);
            assertThat(user).isPresent();
            assertThat(user.get().getStatus()).isEqualTo(UserStatus.ACTIVE);
        });
        // AC-1 ✓
    }
}
```

**Why Awaitility:**
- Kafka processing is asynchronous
- `await().atMost(5, SECONDS).untilAsserted(...)` polls until assertion passes
- Avoids `Thread.sleep()` (flaky, slow)

---

### Redis with TestContainers

**Setup:**
```java
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class RedisCacheIntegrationTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureRedis(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", redis::getFirstMappedPort);
    }

    @Autowired
    private UserService userService;

    @Autowired
    private RedisTemplate<String, User> redisTemplate;

    @Test
    void shouldCacheUserInRedis() {
        // EPIC-009: Redis Caching
        // AC-3: User fetched from cache on second call

        // Given
        Long userId = 42L;

        // When
        User firstCall = userService.getUser(userId);  // Hits database
        User secondCall = userService.getUser(userId); // Hits cache

        // Then
        assertThat(redisTemplate.hasKey("user:" + userId)).isTrue();
        assertThat(firstCall).isEqualTo(secondCall);
        // AC-3 ✓
    }
}
```

---

## REST API Integration Testing

Use `@SpringBootTest` with `webEnvironment = RANDOM_PORT` for REST API tests.

**Setup:**
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class UserApiIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldReturnUserWhenCallingGetUserEndpoint() {
        // STORY-042: User API
        // AC-4: GET /api/users/{id} returns user details

        // Given
        Long userId = 1L;
        String url = "http://localhost:" + port + "/api/users/" + userId;

        // When
        ResponseEntity<UserDTO> response = restTemplate.getForEntity(url, UserDTO.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isEqualTo(userId);
        // AC-4 ✓
    }

    @Test
    void shouldReturn404WhenUserNotFound() {
        // STORY-042: User API
        // AC-5: GET /api/users/{id} returns 404 if user not found

        // Given
        Long nonExistentId = 9999L;
        String url = "http://localhost:" + port + "/api/users/" + nonExistentId;

        // When
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(url, ProblemDetail.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().getTitle()).isEqualTo("User Not Found");
        // AC-5 ✓
    }
}
```

**Key Points:**
- `webEnvironment = RANDOM_PORT` - Starts embedded server on random port
- `@LocalServerPort` - Injects actual port
- `TestRestTemplate` - Pre-configured RestTemplate for testing
- Test real HTTP layer (controllers, exception handling, serialization)

---

## Given-When-Then Pattern

**ALWAYS use Given-When-Then structure for integration tests:**

```java
@Test
void testName() {
    // STORY-XXX: Story Title
    // AC-N: Acceptance Criteria Description

    // Given - Setup test preconditions
    // Arrange test data, mock external dependencies

    // When - Execute the action being tested
    // Call the method/endpoint under test

    // Then - Verify the outcome
    // Assert expected results
    // AC-N ✓
}
```

**Example:**
```java
@Test
void shouldSendEmailWhenUserRegisters() {
    // STORY-042: User Registration
    // AC-6: Welcome email sent on registration

    // Given
    String email = "john@example.com";
    User user = new User("john", email);

    // When
    userService.register(user);

    // Then
    await().atMost(3, SECONDS).untilAsserted(() -> {
        assertThat(emailService.getSentEmails()).hasSize(1);
        assertThat(emailService.getSentEmails().get(0).getRecipient()).isEqualTo(email);
    });
    // AC-6 ✓
}
```

---

## Story Traceability

**CRITICAL: Every integration test MUST reference the Story/Epic it validates:**

```java
@Test
void testMethodName() {
    // STORY-042: User Registration
    // AC-1: New users have ACTIVE status

    // ... test code ...

    // AC-1 ✓  (at the end of assertions)
}
```

**Why:**
- Links tests to requirements (STORY-XXX)
- Traces Acceptance Criteria (AC-N)
- Makes tests self-documenting
- Helps reviewers understand test purpose

---

## Test Data Management

### Test Fixtures

Create reusable test data builders:

```java
public class UserTestFixtures {

    public static User defaultUser() {
        return new User("john", "john@example.com", UserStatus.ACTIVE);
    }

    public static User userWithStatus(UserStatus status) {
        return new User("john", "john@example.com", status);
    }

    public static UserEvent createEvent(Long userId, String action) {
        return new UserEvent(userId, action, "john");
    }
}
```

**Usage:**
```java
@Test
void testSomething() {
    // Given
    User user = UserTestFixtures.defaultUser();

    // When
    // ...
}
```

---

### @BeforeEach / @AfterEach

Clean up test data between tests:

```java
@SpringBootTest
class UserIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        // Clean database before each test
        userRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        // Optional: Additional cleanup
    }

    @Test
    void test1() {
        // Starts with clean database
    }

    @Test
    void test2() {
        // Also starts with clean database (isolated from test1)
    }
}
```

---

## Assertions (AssertJ)

**CRITICAL: Use AssertJ assertions, NOT JUnit assertions!**

**Good (AssertJ):**
```java
import static org.assertj.core.api.Assertions.assertThat;

assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
assertThat(user.getId()).isNotNull();
assertThat(users).hasSize(3);
assertThat(users).extracting(User::getName).containsExactly("alice", "bob", "charlie");
assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
```

**Bad (JUnit assertions):**
```java
import static org.junit.jupiter.api.Assertions.*;

assertEquals(UserStatus.ACTIVE, user.getStatus());  // DON'T USE!
assertNotNull(user.getId());  // DON'T USE!
assertEquals(3, users.size());  // DON'T USE!
```

**Why AssertJ is better:**
- Fluent, readable API
- Better error messages
- Type-safe
- More powerful (extracting, filtering, soft assertions)

---

## Async Testing with Awaitility

For asynchronous operations (Kafka, async methods, events):

```java
import static org.awaitility.Awaitility.*;
import static java.util.concurrent.TimeUnit.*;

@Test
void shouldProcessMessageAsynchronously() {
    // Given
    sendMessage();

    // When/Then
    await().atMost(5, SECONDS)
        .pollInterval(100, MILLISECONDS)
        .untilAsserted(() -> {
            assertThat(repository.count()).isEqualTo(1);
        });
}
```

**Common Patterns:**

**Wait for condition:**
```java
await().atMost(5, SECONDS).until(() -> repository.findById(42L).isPresent());
```

**Wait for assertion:**
```java
await().atMost(5, SECONDS).untilAsserted(() -> {
    assertThat(cache.get("key")).isEqualTo("value");
});
```

**Wait with custom polling:**
```java
await()
    .atMost(10, SECONDS)
    .pollInterval(200, MILLISECONDS)
    .untilAsserted(() -> assertThat(queue).hasSize(5));
```

---

## Test Configuration

### application-test.yaml

Create test-specific configuration:

```yaml
# src/test/resources/application-test.yaml
spring:
  jpa:
    hibernate:
      ddl-auto: create-drop  # Recreate schema for each test run
    show-sql: true

  kafka:
    consumer:
      auto-offset-reset: earliest

  cache:
    type: simple  # Use simple cache instead of Redis for unit tests

logging:
  level:
    com.example: DEBUG
```

**Activate in tests:**
```java
@SpringBootTest
@ActiveProfiles("test")
class MyIntegrationTest {
    // Loads application-test.yaml
}
```

---

## E2E Test Example

**Full End-to-End Test (REST → Service → Kafka → Database):**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class UserRegistrationE2ETest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldRegisterUserEndToEnd() {
        // EPIC-010: User Registration Flow
        // AC-1: POST /api/users creates user, publishes event, persists to DB

        // Given
        String url = "http://localhost:" + port + "/api/users";
        UserCreateRequest request = new UserCreateRequest("john", "john@example.com");

        // When
        ResponseEntity<UserDTO> response = restTemplate.postForEntity(url, request, UserDTO.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();

        Long userId = response.getBody().id();

        // Verify database persistence
        await().atMost(3, SECONDS).untilAsserted(() -> {
            Optional<User> user = userRepository.findById(userId);
            assertThat(user).isPresent();
            assertThat(user.get().getStatus()).isEqualTo(UserStatus.ACTIVE);
        });
        // AC-1 ✓
    }
}
```

---

## Common Patterns

### Test Single Acceptance Criterion

**ONE test = ONE Acceptance Criterion:**

```java
// STORY-042 has 3 Acceptance Criteria → 3 tests

@Test
void shouldCreateUserWithActiveStatus() {
    // AC-1: New users have ACTIVE status
    // ...
    // AC-1 ✓
}

@Test
void shouldSendWelcomeEmailOnRegistration() {
    // AC-2: Welcome email sent
    // ...
    // AC-2 ✓
}

@Test
void shouldPublishUserCreatedEvent() {
    // AC-3: Kafka event published
    // ...
    // AC-3 ✓
}
```

---

### Parameterized Tests

Test multiple scenarios with same logic:

```java
@ParameterizedTest
@ValueSource(strings = {"CREATE", "UPDATE", "DELETE"})
void shouldProcessDifferentEventTypes(String action) {
    // EPIC-007: Kafka Event Processing
    // AC-4: Support CREATE, UPDATE, DELETE events

    // Given
    UserEvent event = new UserEvent(1L, action, "john");

    // When
    kafkaTemplate.send("user-events", event);

    // Then
    await().atMost(5, SECONDS).untilAsserted(() -> {
        assertThat(eventRepository.findByAction(action)).isPresent();
    });
    // AC-4 ✓
}
```

---

## Best Practices

1. **Traceability:** Always reference STORY-XXX and AC-N
2. **Given-When-Then:** Structure all tests this way
3. **AssertJ:** Use AssertJ, never JUnit assertions
4. **Awaitility:** Use for async operations (never Thread.sleep)
5. **TestContainers:** Use real infrastructure, not mocks
6. **Isolation:** Each test independent (clean state in @BeforeEach)
7. **Fast:** Reuse containers (`static @Container`), avoid unnecessary waits
8. **Descriptive Names:** `shouldDoXWhenY` pattern
9. **One AC per test:** Don't mix multiple acceptance criteria

---

## Progressive Disclosure

For detailed guidelines on:
- Advanced TestContainers patterns (networking, volumes)
- Performance optimization (container reuse, parallel execution)
- Test debugging strategies
- Custom TestContainers images
- Complex async testing scenarios

See `reference.md` (load only when user explicitly needs details).

---

**This skill activates automatically when writing integration, system, or E2E tests.**

**Note:** This skill covers **Integration/System/E2E testing only**. For unit testing, see `spring-boot-best-practices` (Unit Testing section).
