# Integration Testing Examples

Detailed examples for writing integration, system, and E2E tests with Spring Boot.

---

## Complete Example Workflow

**Scenario:** User requests system test for STORY-042: User Registration

### Step 1: Read Sources

```bash
Read: claudedocs/stories/STORY-042-user-registration.md
Read: claudedocs/testspecs/user-registration.md (if exists)
Read: claudedocs/guidelines/testing-standards.md (if exists)
```

### Step 2: Extract Requirements

```
AC-1: POST /api/users creates user with ACTIVE status
AC-2: Welcome email sent on registration
AC-3: Returns 400 if email invalid
AC-4: Publishes user-created event to Kafka
```

### Step 3: Write Tests

**File:** `src/test/java/integration/api/UserRegistrationSystemTest.java`

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Testcontainers
class UserRegistrationSystemTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldRegisterUserWithActiveStatus() {
        // STORY-042: User Registration
        // AC-1: POST /api/users creates user with ACTIVE status

        // Given
        String url = "http://localhost:" + port + "/api/users";
        UserCreateRequest request = new UserCreateRequest("john", "john@example.com");

        // When
        ResponseEntity<UserDTO> response = restTemplate.postForEntity(url, request, UserDTO.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo("ACTIVE");
        // AC-1 ✓
    }

    @Test
    void shouldSendWelcomeEmailOnRegistration() {
        // STORY-042: User Registration
        // AC-2: Welcome email sent on registration

        // Given
        String url = "http://localhost:" + port + "/api/users";
        UserCreateRequest request = new UserCreateRequest("john", "john@example.com");

        // When
        restTemplate.postForEntity(url, request, UserDTO.class);

        // Then
        await().atMost(3, SECONDS).untilAsserted(() -> {
            assertThat(emailService.getSentEmails()).hasSize(1);
            assertThat(emailService.getSentEmails().get(0).getRecipient())
                .isEqualTo("john@example.com");
        });
        // AC-2 ✓
    }

    @Test
    void shouldReturn400WhenEmailInvalid() {
        // STORY-042: User Registration
        // AC-3: Returns 400 if email invalid

        // Given
        String url = "http://localhost:" + port + "/api/users";
        UserCreateRequest request = new UserCreateRequest("john", "invalid-email");

        // When
        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(url, request, ProblemDetail.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        // AC-3 ✓
    }

    @Test
    void shouldPublishUserCreatedEventToKafka() {
        // STORY-042: User Registration
        // AC-4: Publishes user-created event to Kafka

        // Given
        String url = "http://localhost:" + port + "/api/users";
        UserCreateRequest request = new UserCreateRequest("john", "john@example.com");

        // When
        ResponseEntity<UserDTO> response = restTemplate.postForEntity(url, request, UserDTO.class);
        Long userId = response.getBody().id();

        // Then
        await().atMost(5, SECONDS).untilAsserted(() -> {
            List<UserEvent> events = kafkaTestConsumer.getReceivedEvents();
            assertThat(events).hasSize(1);
            assertThat(events.get(0).getUserId()).isEqualTo(userId);
            assertThat(events.get(0).getAction()).isEqualTo("CREATED");
        });
        // AC-4 ✓
    }
}
```

### Step 4: Report to User

```markdown
## Tests Created for STORY-042

**Coverage:** 4 tests covering all Acceptance Criteria
**Location:** src/test/java/integration/api/UserRegistrationSystemTest.java
**TestContainers:** PostgreSQL, Kafka
**Status:** All tests currently FAIL (Red) - ready for developer to implement

### Test Summary

- shouldRegisterUserWithActiveStatus() → AC-1 ✓
- shouldSendWelcomeEmailOnRegistration() → AC-2 ✓
- shouldReturn400WhenEmailInvalid() → AC-3 ✓
- shouldPublishUserCreatedEventToKafka() → AC-4 ✓
```

---

## Additional Patterns

### Kafka Integration Test

```java
@SpringBootTest
@Testcontainers
class KafkaMessageProcessingIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @Autowired
    private KafkaTemplate<String, UserEvent> kafkaTemplate;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldCreateActiveUserWhenReceivingKafkaCreateMessage() {
        // EPIC-005: Kafka Message Processing
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

### Database Integration Test

```java
@SpringBootTest
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldFindUserByEmail() {
        // Given
        User user = new User("john", "john@example.com", UserStatus.ACTIVE);
        userRepository.save(user);

        // When
        Optional<User> found = userRepository.findByEmail("john@example.com");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("john");
    }
}
```

### E2E Test (Complete User Journey)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderPlacementE2ETest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldPlaceOrderFromCartToPayment() {
        // E2E: Complete Order Placement Journey
        // User adds items → creates order → processes payment

        // Given
        Long userId = 1L;
        String baseUrl = "http://localhost:" + port;

        // When - Add items to cart
        restTemplate.postForEntity(
            baseUrl + "/api/cart/items",
            new CartItemRequest(userId, productId1, 2),
            Void.class
        );
        restTemplate.postForEntity(
            baseUrl + "/api/cart/items",
            new CartItemRequest(userId, productId2, 1),
            Void.class
        );

        // When - Create order from cart
        ResponseEntity<OrderDTO> orderResponse = restTemplate.postForEntity(
            baseUrl + "/api/orders",
            new CreateOrderRequest(userId),
            OrderDTO.class
        );
        Long orderId = orderResponse.getBody().getId();

        // When - Process payment
        ResponseEntity<PaymentDTO> paymentResponse = restTemplate.postForEntity(
            baseUrl + "/api/payments",
            new PaymentRequest(orderId, "4111111111111111", 100.00),
            PaymentDTO.class
        );

        // Then
        assertThat(orderResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(orderResponse.getBody().getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(paymentResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(paymentResponse.getBody().getStatus()).isEqualTo(PaymentStatus.SUCCESS);

        // Verify cart is empty
        ResponseEntity<CartDTO> cartResponse = restTemplate.getForEntity(
            baseUrl + "/api/cart/" + userId,
            CartDTO.class
        );
        assertThat(cartResponse.getBody().getItems()).isEmpty();
    }
}
```

---

For more patterns and TestContainers configurations, see `reference.md`.
