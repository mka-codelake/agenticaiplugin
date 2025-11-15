# Integration Testing - Reference

## Advanced TestContainers Patterns

### Container Reuse Across Test Classes

**Problem:** Starting containers for each test class is slow.

**Solution:** Use singleton pattern for container reuse:

```java
public abstract class AbstractIntegrationTest {

    private static final PostgreSQLContainer<?> postgres;
    private static final KafkaContainer kafka;

    static {
        postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

        kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

        postgres.start();
        kafka.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }
}
```

**Usage:**
```java
@SpringBootTest
class UserIntegrationTest extends AbstractIntegrationTest {
    // Reuses containers from parent class
}

@SpringBootTest
class OrderIntegrationTest extends AbstractIntegrationTest {
    // Reuses same containers (fast!)
}
```

**Benefits:**
- Containers started once per test suite
- Massive speed improvement
- Shared across all test classes

---

### Docker Compose Integration

**Use docker-compose.yaml for complex multi-container setups:**

```yaml
# src/test/resources/docker-compose-test.yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5432"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    ports:
      - "9092"

  redis:
    image: redis:7-alpine
    ports:
      - "6379"
```

**Java Integration:**
```java
@SpringBootTest
@Testcontainers
class DockerComposeIntegrationTest {

    @Container
    static DockerComposeContainer<?> environment =
        new DockerComposeContainer<>(new File("src/test/resources/docker-compose-test.yaml"))
            .withExposedService("postgres", 5432)
            .withExposedService("kafka", 9092)
            .withExposedService("redis", 6379);

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () ->
            "jdbc:postgresql://" + environment.getServiceHost("postgres", 5432) +
            ":" + environment.getServicePort("postgres", 5432) + "/testdb"
        );
        // ... configure other services
    }
}
```

---

### Custom TestContainers Images

**Build custom container with pre-loaded test data:**

```dockerfile
# src/test/resources/Dockerfile.postgres-test
FROM postgres:15-alpine

COPY init.sql /docker-entrypoint-initdb.d/
```

```sql
-- src/test/resources/init.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100)
);

INSERT INTO users (username, email) VALUES
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com');
```

**Usage:**
```java
@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
    DockerImageName.parse("my-postgres-test:latest")
);
```

---

## Performance Optimization

### Parallel Test Execution

**Maven (pom.xml):**
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <parallel>classes</parallel>
        <threadCount>4</threadCount>
    </configuration>
</plugin>
```

**Gradle (build.gradle):**
```groovy
test {
    maxParallelForks = 4
}
```

**Important:** Use container reuse pattern (AbstractIntegrationTest) to avoid port conflicts!

---

### @DirtiesContext (Use Sparingly)

**Problem:** Test modifies Spring context (e.g., adds beans dynamically).

**Solution (last resort):**
```java
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ContextModifyingTest {
    // Context recreated after this test class
}
```

**Warning:** `@DirtiesContext` is SLOW (recreates entire Spring context). Avoid if possible!

**Better alternatives:**
- Clean data in `@BeforeEach`
- Use `@Transactional` with rollback
- Use separate test profile

---

### Transaction Rollback

**Automatically rollback database changes after each test:**

```java
@SpringBootTest
@Transactional
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Test
    void testUserCreation() {
        // Given
        userService.createUser("john");

        // Then
        assertThat(userService.findAll()).hasSize(1);

        // Automatically rolled back after test
    }

    @Test
    void testAnotherUser() {
        // Starts with clean database (previous test rolled back)
        assertThat(userService.findAll()).isEmpty();
    }
}
```

**Benefits:**
- Fast (no manual cleanup)
- Automatic isolation
- No `@BeforeEach` cleanup needed

**Caveat:** Doesn't work with `@SpringBootTest(webEnvironment = RANDOM_PORT)` (different transaction context).

---

## Debugging Integration Tests

### Enable Verbose Logging

**application-test.yaml:**
```yaml
logging:
  level:
    org.springframework: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
    org.testcontainers: DEBUG
    com.example: DEBUG
```

---

### Access TestContainer Logs

```java
@Test
void debugContainerLogs() {
    // Print container logs
    System.out.println(postgres.getLogs());
}
```

---

### Inspect Running Containers

```bash
# While tests are running, in another terminal:
docker ps

# Connect to container
docker exec -it <container_id> bash

# Check PostgreSQL
docker exec -it <container_id> psql -U test -d testdb
```

---

## Complex Async Testing

### Kafka Consumer Verification

**Verify messages are consumed:**

```java
@SpringBootTest
@EmbeddedKafka(topics = "user-events")
class KafkaConsumerTest {

    @Autowired
    private KafkaTemplate<String, UserEvent> kafkaTemplate;

    @KafkaListener(topics = "user-events", groupId = "test-group")
    public void listen(UserEvent event) {
        receivedEvents.add(event);
    }

    private List<UserEvent> receivedEvents = new ArrayList<>();

    @Test
    void shouldConsumeMessage() {
        // Given
        UserEvent event = new UserEvent(1L, "CREATE", "john");

        // When
        kafkaTemplate.send("user-events", event);

        // Then
        await().atMost(5, SECONDS).untilAsserted(() -> {
            assertThat(receivedEvents).hasSize(1);
            assertThat(receivedEvents.get(0).getAction()).isEqualTo("CREATE");
        });
    }
}
```

---

### Polling with Custom Condition

**Wait for complex condition:**

```java
@Test
void waitForComplexCondition() {
    // Given
    processOrder(orderId);

    // When/Then
    await()
        .atMost(10, SECONDS)
        .pollInterval(200, MILLISECONDS)
        .until(() -> {
            Order order = orderRepository.findById(orderId).orElse(null);
            return order != null &&
                   order.getStatus() == OrderStatus.COMPLETED &&
                   order.getPaymentStatus() == PaymentStatus.PAID;
        });
}
```

---

### Awaitility Aliases (Readability)

```java
@Test
void readableAwait() {
    // Given
    sendMessage();

    // When/Then
    await("message processing")
        .atMost(Duration.ofSeconds(5))
        .untilAsserted(() -> assertThat(repository.count()).isEqualTo(1));
}
```

**Output on failure:**
```
org.awaitility.core.ConditionTimeoutException:
Condition with alias 'message processing' didn't complete within 5 seconds
```

---

## Advanced AssertJ Patterns

### Extracting and Filtering

```java
@Test
void advancedAssertions() {
    List<User> users = userRepository.findAll();

    // Extract single field
    assertThat(users)
        .extracting(User::getName)
        .containsExactly("alice", "bob", "charlie");

    // Extract multiple fields
    assertThat(users)
        .extracting(User::getName, User::getEmail)
        .containsExactly(
            tuple("alice", "alice@example.com"),
            tuple("bob", "bob@example.com")
        );

    // Filter and assert
    assertThat(users)
        .filteredOn(user -> user.getStatus() == UserStatus.ACTIVE)
        .hasSize(2);
}
```

---

### Soft Assertions

**Multiple assertions without stopping on first failure:**

```java
@Test
void softAssertions() {
    User user = userService.getUser(1L);

    SoftAssertions.assertSoftly(softly -> {
        softly.assertThat(user.getName()).isEqualTo("john");
        softly.assertThat(user.getEmail()).isEqualTo("john@example.com");
        softly.assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        softly.assertThat(user.getCreatedAt()).isNotNull();
    });
    // All assertions executed, report shows ALL failures
}
```

---

### Custom Assertions

**Create domain-specific assertions:**

```java
public class UserAssert extends AbstractAssert<UserAssert, User> {

    public UserAssert(User user) {
        super(user, UserAssert.class);
    }

    public static UserAssert assertThat(User user) {
        return new UserAssert(user);
    }

    public UserAssert hasActiveStatus() {
        isNotNull();
        if (actual.getStatus() != UserStatus.ACTIVE) {
            failWithMessage("Expected user to have ACTIVE status but was <%s>", actual.getStatus());
        }
        return this;
    }

    public UserAssert hasEmail(String email) {
        isNotNull();
        if (!actual.getEmail().equals(email)) {
            failWithMessage("Expected user email to be <%s> but was <%s>", email, actual.getEmail());
        }
        return this;
    }
}
```

**Usage:**
```java
@Test
void customAssertion() {
    User user = userService.getUser(1L);

    UserAssert.assertThat(user)
        .hasActiveStatus()
        .hasEmail("john@example.com");
}
```

---

## Test Data Builders

### Builder Pattern

```java
public class UserBuilder {
    private String username = "defaultUser";
    private String email = "default@example.com";
    private UserStatus status = UserStatus.ACTIVE;

    public static UserBuilder aUser() {
        return new UserBuilder();
    }

    public UserBuilder withUsername(String username) {
        this.username = username;
        return this;
    }

    public UserBuilder withEmail(String email) {
        this.email = email;
        return this;
    }

    public UserBuilder withStatus(UserStatus status) {
        this.status = status;
        return this;
    }

    public User build() {
        return new User(username, email, status);
    }
}
```

**Usage:**
```java
@Test
void builderPattern() {
    // Given
    User user = aUser()
        .withUsername("john")
        .withEmail("john@example.com")
        .withStatus(UserStatus.INACTIVE)
        .build();

    // When
    userService.activate(user);

    // Then
    assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
}
```

---

## Spring Boot Test Slices (for Integration Tests)

### @DataJpaTest (Repository Layer)

**Test JPA repositories in isolation:**

```java
@DataJpaTest
class UserRepositoryIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void shouldFindUserByEmail() {
        // Given
        User user = new User("john", "john@example.com");
        entityManager.persist(user);
        entityManager.flush();

        // When
        Optional<User> found = userRepository.findByEmail("john@example.com");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("john");
    }
}
```

**Benefits:**
- Only loads JPA components (no full context)
- In-memory H2 database by default
- Fast

---

### @WebMvcTest (Controller Layer)

**Test REST controllers without full context:**

```java
@WebMvcTest(UserController.class)
class UserControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Test
    void shouldReturnUserWhenFound() throws Exception {
        // Given
        User user = new User(1L, "john", "john@example.com");
        when(userService.getUser(1L)).thenReturn(Optional.of(user));

        // When/Then
        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("john"))
            .andExpect(jsonPath("$.email").value("john@example.com"));
    }
}
```

---

## Common Pitfalls

### ❌ Using Thread.sleep()

**Bad:**
```java
sendMessage();
Thread.sleep(5000);  // Flaky! Message might arrive in 100ms or 6000ms
assertThat(repository.count()).isEqualTo(1);
```

**Good:**
```java
sendMessage();
await().atMost(5, SECONDS).untilAsserted(() -> {
    assertThat(repository.count()).isEqualTo(1);
});
```

---

### ❌ Not Cleaning State Between Tests

**Bad:**
```java
@Test
void test1() {
    userRepository.save(new User("john"));
    assertThat(userRepository.count()).isEqualTo(1);
}

@Test
void test2() {
    // Flaky! Might be 0 or 1 depending on execution order
    assertThat(userRepository.count()).isEqualTo(0);
}
```

**Good:**
```java
@BeforeEach
void setUp() {
    userRepository.deleteAll();
}
```

---

### ❌ Testing Too Much in One Test

**Bad:**
```java
@Test
void testEverything() {
    // AC-1: Create user
    userService.createUser("john");

    // AC-2: Send email
    assertThat(emailService.getSentEmails()).hasSize(1);

    // AC-3: Publish event
    assertThat(kafkaTemplate.getSentMessages()).hasSize(1);
}
```

**Good:**
```java
@Test
void shouldCreateUser() {
    // AC-1 only
}

@Test
void shouldSendEmail() {
    // AC-2 only
}

@Test
void shouldPublishEvent() {
    // AC-3 only
}
```

---

## Summary

- **TestContainers:** Real infrastructure, reuse containers
- **Awaitility:** Async testing, no Thread.sleep
- **AssertJ:** Fluent assertions, powerful filtering
- **Given-When-Then:** Clear test structure
- **Traceability:** Link to STORY-XXX, AC-N
- **Isolation:** Clean state between tests
- **Performance:** Parallel execution, transaction rollback

For more examples and advanced patterns, see official documentation:
- [TestContainers](https://www.testcontainers.org/)
- [Awaitility](https://github.com/awaitility/awaitility)
- [AssertJ](https://assertj.github.io/doc/)
