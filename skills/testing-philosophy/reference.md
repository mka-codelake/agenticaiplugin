

# Testing Philosophy Reference

Detailed guidelines for "Test YOUR Code, Not THE Code" philosophy.

---

## Test Necessity Matrix (Comprehensive)

| Code Type | Category | Test Required? | Example |
|-----------|----------|----------------|---------|
| **Business Logic** | Business | ✅ YES | `calculateDiscount()`, `validateOrder()` |
| **Custom Algorithms** | Business | ✅ YES | `sortByPriority()`, `findOptimalRoute()` |
| **Validation Rules** | Business | ✅ YES | `validateEmail()`, `checkBusinessRules()` |
| **Domain Models (with logic)** | Business | ✅ YES | `Order.calculateTotal()`, `User.hasPermission()` |
| **Service Layer** | Business | ✅ YES | `UserService.createUser()` |
| **Custom Utilities** | Business | ✅ YES | `DateUtils.parseCustomFormat()` |
| **State Machines** | Business | ✅ YES | `OrderStateMachine.transition()` |
| **Story Acceptance Criteria** | Business | ✅ YES | Any story acceptance criterion implementation |
| | | | |
| **Getters/Setters** | Generated | ❌ NO | `getName()`, `setName()` (Lombok) |
| **Constructors (simple)** | Generated | ❌ NO | `User(name, email)` (Lombok) |
| **Builders** | Generated | ❌ NO | `User.builder()` (Lombok) |
| **Equals/HashCode** | Generated | ❌ NO | `@EqualsAndHashCode` (Lombok) |
| **ToString** | Generated | ❌ NO | `@ToString` (Lombok) |
| **MapStruct Mappers** | Generated | ❌ NO | `@Mapper UserMapper` |
| **QueryDSL Q-classes** | Generated | ❌ NO | `QUser`, `QOrder` |
| | | | |
| **Spring Boot Application** | Framework | ❌ NO | `@SpringBootApplication` main class |
| **JPA Entities (simple)** | Framework | ❌ NO | `@Entity User` (no business logic) |
| **Repository Interfaces** | Framework | ❌ NO | `extends JpaRepository` (no custom) |
| **Controller Routing** | Framework | ❌ NO | `@GetMapping("/users")` |
| **Configuration Classes** | Framework | ❌ NO | `@Configuration WebConfig` |
| **Spring Components (simple)** | Framework | ❌ NO | `@Component` with only injection |
| **DTOs/POJOs (simple)** | Framework | ❌ NO | Data transfer objects, no logic |
| | | | |
| **Custom JPA Queries** | Infrastructure | ✅ YES | `@Query("SELECT ... WHERE complex")` |
| **Kafka Listeners (logic)** | Infrastructure | ⚠️ PARTIAL | Test message processing, not listener |
| **REST Client (custom logic)** | Infrastructure | ⚠️ PARTIAL | Test retry/fallback, not HTTP |
| **Cache Logic** | Infrastructure | ⚠️ PARTIAL | Test eviction logic, not cache framework |
| **Event Handlers (logic)** | Infrastructure | ⚠️ PARTIAL | Test business logic, not event system |

---

## Detailed Examples

### ✅ Test THIS (Business Logic)

#### Example 1: Service Method

```java
// UserService.java - YOUR business logic
public class UserService {
    public void createUser(String email, String name) {
        // STORY-012 AC: User email must be valid format
        if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new InvalidEmailException("Invalid email format");
        }

        // STORY-012 AC: System rejects duplicate emails
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateUserException("Email already exists");
        }

        User user = new User(email, name);
        userRepository.save(user);
    }
}

// UserServiceTest.java
@Test
void shouldCreateUserWithValidEmail() {
    // Tests STORY-012 acceptance criteria
    when(userRepository.existsByEmail("test@example.com")).thenReturn(false);

    userService.createUser("test@example.com", "John");

    verify(userRepository).save(any(User.class));
}

@Test
void shouldThrowExceptionWhenEmailInvalid() {
    // Tests STORY-012 AC: Validate email format
    assertThrows(InvalidEmailException.class,
        () -> userService.createUser("invalid-email", "John")
    );
}

@Test
void shouldThrowExceptionWhenEmailExists() {
    // Tests STORY-012 AC: Reject duplicate emails
    when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

    assertThrows(DuplicateUserException.class,
        () -> userService.createUser("test@example.com", "John")
    );
}
```

#### Example 2: Domain Model with Logic

```java
// Order.java - YOUR business logic in domain model
public class Order {
    private List<OrderItem> items;
    private BigDecimal discount;

    // Business logic - MUST TEST
    public BigDecimal calculateTotal() {
        BigDecimal subtotal = items.stream()
            .map(OrderItem::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return subtotal.subtract(discount);
    }

    // Business logic - MUST TEST
    public boolean isEligibleForFreeShipping() {
        return calculateTotal().compareTo(new BigDecimal("50")) >= 0;
    }

    // Lombok-generated - NO TEST NEEDED
    @Getter @Setter
    private Long id;
}

// OrderTest.java
@Test
void shouldCalculateTotalCorrectly() {
    Order order = new Order();
    order.addItem(new OrderItem(new BigDecimal("30")));
    order.addItem(new OrderItem(new BigDecimal("20")));
    order.setDiscount(new BigDecimal("5"));

    BigDecimal total = order.calculateTotal();

    assertEquals(new BigDecimal("45"), total);
}

@Test
void shouldBeEligibleForFreeShippingWhenTotalAbove50() {
    Order order = new Order();
    order.addItem(new OrderItem(new BigDecimal("60")));

    assertTrue(order.isEligibleForFreeShipping());
}

@Test
void shouldNotBeEligibleForFreeShippingWhenTotalBelow50() {
    Order order = new Order();
    order.addItem(new OrderItem(new BigDecimal("40")));

    assertFalse(order.isEligibleForFreeShipping());
}

// NO TEST for getId(), setId() - Lombok-generated
```

---

### ❌ Don't Test THIS (Framework/Generated)

#### Example 1: Spring Boot Controller Routing

```java
// UserController.java
@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    private UserService userService;

    // Don't test the routing - that's Spring Boot's job
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    // Don't test the mapping - that's Spring Boot's job
    @PostMapping
    public User createUser(@RequestBody UserDTO dto) {
        return userService.create(dto);
    }
}

// ❌ DON'T write this test
@Test
void shouldMapGetRequestToGetUser() {
    // This tests Spring Boot, not YOUR code
    mockMvc.perform(get("/api/users/1"))
           .andExpect(status().isOk());
}
```

**Comment in code:**
```java
// No test: Spring Boot handles routing and mapping
```

#### Example 2: JPA Entity

```java
// User.java
@Entity
@Table(name = "users")
@Data  // Lombok generates getters/setters/equals/hashCode/toString
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    private String name;

    // No business logic here - just data holder
}

// ❌ DON'T write these tests
@Test
void testGetEmail() {
    // This tests Lombok, not YOUR code
    user.setEmail("test@example.com");
    assertEquals("test@example.com", user.getEmail());
}

@Test
void testJpaSave() {
    // This tests JPA/Hibernate, not YOUR code
    entityManager.persist(user);
    entityManager.flush();
    assertNotNull(user.getId());
}
```

**Comment in code:**
```java
// No test: Simple JPA entity with Lombok-generated methods, no business logic
```

#### Example 3: Repository Interface

```java
// UserRepository.java
public interface UserRepository extends JpaRepository<User, Long> {
    // Spring Data JPA generates implementation
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}

// ❌ DON'T write these tests
@Test
void testFindByEmail() {
    // This tests Spring Data JPA, not YOUR code
    userRepository.save(new User("test@example.com", "John"));
    Optional<User> user = userRepository.findByEmail("test@example.com");
    assertTrue(user.isPresent());
}
```

**Comment in code:**
```java
// No test: Spring Data JPA-generated methods, no custom logic
```

---

### ⚠️ Test PARTIALLY (Infrastructure with Business Logic)

#### Example: Kafka Listener

```java
// MessageListener.java
@Component
public class MessageListener {
    @Autowired
    private MessageProcessor processor;

    // Don't test @KafkaListener - test the processing logic
    @KafkaListener(topics = "input-topic")
    public void listen(String message) {
        // Business logic - MUST TEST THIS
        MessageDTO dto = parseMessage(message);
        processor.process(dto);
    }

    // Business logic - MUST TEST
    private MessageDTO parseMessage(String message) {
        if (message == null || message.isEmpty()) {
            throw new InvalidMessageException("Message is empty");
        }

        String[] parts = message.split("\\|");
        if (parts.length != 2) {
            throw new InvalidMessageException("Invalid format");
        }

        return new MessageDTO(parts[0], parts[1]);
    }
}

// MessageListenerTest.java
@Test
void shouldParseMessageCorrectly() {
    // Test business logic extraction, not Kafka
    MessageDTO dto = listener.parseMessage("id|content");

    assertEquals("id", dto.getId());
    assertEquals("content", dto.getContent());
}

@Test
void shouldThrowExceptionWhenMessageIsEmpty() {
    assertThrows(InvalidMessageException.class,
        () -> listener.parseMessage("")
    );
}

@Test
void shouldThrowExceptionWhenFormatInvalid() {
    assertThrows(InvalidMessageException.class,
        () -> listener.parseMessage("invalid")
    );
}

// NO TEST for @KafkaListener annotation - that's Kafka's job
```

---

## Edge Cases to Test

### 1. Null Inputs

```java
@Test
void shouldHandleNullInput() {
    assertThrows(IllegalArgumentException.class,
        () -> service.process(null)
    );
}
```

### 2. Empty Collections

```java
@Test
void shouldHandleEmptyList() {
    List<Item> emptyList = Collections.emptyList();
    BigDecimal total = calculator.sum(emptyList);
    assertEquals(BigDecimal.ZERO, total);
}
```

### 3. Boundary Values

```java
@Test
void shouldApplyDiscountWhenAmountIsExactly100() {
    // Boundary: 100 is the minimum for discount
    BigDecimal discount = calculator.calculateDiscount(new BigDecimal("100"));
    assertEquals(new BigDecimal("10"), discount);
}

@Test
void shouldNotApplyDiscountWhenAmountIs99() {
    BigDecimal discount = calculator.calculateDiscount(new BigDecimal("99"));
    assertEquals(BigDecimal.ZERO, discount);
}
```

### 4. Invalid States

```java
@Test
void shouldThrowExceptionWhenOrderAlreadyShipped() {
    Order order = new Order();
    order.setStatus(OrderStatus.SHIPPED);

    assertThrows(IllegalStateException.class,
        () -> order.cancel()
    );
}
```

---

## Test Quality Standards

### 1. One Test, One Thing

```java
// ✅ Good - tests one scenario
@Test
void shouldReturnErrorWhenMessageIsEmpty() {
    Result result = validator.validate("");
    assertTrue(result.hasError());
    assertEquals("Message cannot be empty", result.getErrorMessage());
}

// ❌ Bad - tests multiple scenarios
@Test
void shouldValidateMessage() {
    assertTrue(validator.validate("valid").isOk());
    assertTrue(validator.validate("").hasError());
    assertTrue(validator.validate(null).hasError());
    // Split into 3 separate tests!
}
```

### 2. Arrange-Act-Assert Pattern

```java
@Test
void shouldCalculateDiscount() {
    // Arrange - Setup
    Order order = new Order();
    order.addItem(new OrderItem(new BigDecimal("100")));
    DiscountCalculator calculator = new DiscountCalculator();

    // Act - Execute
    BigDecimal discount = calculator.calculate(order);

    // Assert - Verify
    assertEquals(new BigDecimal("10"), discount);
}
```

### 3. Clear, Descriptive Test Names

```java
// ✅ Good names - describe behavior
shouldReturnErrorWhenEmailIsInvalid()
shouldApplyDiscountWhenOrderTotalExceeds100()
shouldThrowExceptionWhenUserNotFound()
shouldCreateUserSuccessfullyWithValidInput()

// ❌ Bad names - vague or numbered
test1()
testEmail()
testValidation()
userTest()
```

### 4. No Test Interdependencies

```java
// ❌ Bad - Test 2 depends on Test 1
private static Long userId;  // Shared state!

@Test
void test1_createUser() {
    userId = userService.create("John");  // Sets shared field
}

@Test
void test2_findUser() {
    User user = userService.find(userId);  // Uses field from test1
    // BREAKS if test1 doesn't run first or fails!
}

// ✅ Good - Independent tests
@Test
void shouldCreateUser() {
    Long userId = userService.create("John");  // Local variable
    assertNotNull(userId);
}

@Test
void shouldFindUser() {
    Long userId = userService.create("Jane");  // Create own data
    User user = userService.find(userId);
    assertEquals("Jane", user.getName());
}
```

### 5. Fast Tests (Mock External Dependencies)

```java
// ✅ Good - Mock database
@Test
void shouldFindUserByEmail() {
    when(mockRepository.findByEmail("test@example.com"))
        .thenReturn(Optional.of(new User("test@example.com", "John")));

    User user = userService.findByEmail("test@example.com");

    assertEquals("John", user.getName());
}

// ❌ Bad - Real database (slow, brittle)
@Test
@Transactional
void shouldFindUserByEmail() {
    // Real database call - slow and requires DB setup
    userRepository.save(new User("test@example.com", "John"));
    User user = userService.findByEmail("test@example.com");
    assertEquals("John", user.getName());
}
```

---

## When to Skip Tests (with Comments)

Always add a comment explaining WHY a test is skipped:

```java
public class UserEntity {
    // No test: Lombok-generated getter
    @Getter
    private String name;

    // No test: Lombok-generated setter
    @Setter
    private String email;

    // No test: JPA entity mapping, no business logic
    @Id
    private Long id;
}

@RestController
public class UserController {
    // No test: Spring Boot routing, no custom logic
    @GetMapping("/users")
    public List<User> getUsers() {
        return userService.findAll();
    }
}

public interface UserRepository extends JpaRepository<User, Long> {
    // No test: Spring Data JPA-generated method
    Optional<User> findByEmail(String email);
}
```

---

## Integration Tests vs Unit Tests Strategy

### The Test Pyramid

```
              /\
             /  \    E2E Tests (very few)
            /----\
           /      \
          / Integr\ Integration Tests (some)
         /  ation  \
        /   Tests   \
       /-------------\
      /               \
     /   Unit Tests    \ Unit Tests (many)
    /                   \
   /_____________________\
```

### When to Use Integration Tests

**Purpose:** Verify technical correctness and main business flows work end-to-end.

**Use Integration Tests for:**

1. **Technical Stack Validation**
   - Does Kafka consumer actually receive messages?
   - Does REST API respond correctly?
   - Does database save/retrieve data?
   - Does cache work?

2. **Business Happy Path (1-2 tests per feature)**
   - Main successful scenario works end-to-end
   - Example: "User places order → Order is saved → Confirmation email sent"

3. **Critical Error Scenarios**
   - What happens when external service is down?
   - What happens with invalid data format?
   - What happens when DB connection fails?

**Example: Kafka Integration Test**

```java
@SpringBootTest
@EmbeddedKafka
class MessageConsumerIntegrationTest {

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private MessageRepository messageRepository;

    @Test
    void shouldConsumeValidMessageAndSaveToDatabase() {
        // Integration Test: Kafka → Consumer → Service → Database
        String message = "{\"id\":\"123\",\"text\":\"Hello\"}";

        kafkaTemplate.send("input-topic", message);

        await().atMost(5, SECONDS).until(() ->
            messageRepository.findById("123").isPresent()
        );

        Message saved = messageRepository.findById("123").get();
        assertEquals("Hello", saved.getText());
    }

    @Test
    void shouldSendInvalidMessageToDLQ() {
        // Integration Test: Error handling
        String invalidMessage = "{invalid-json}";

        kafkaTemplate.send("input-topic", invalidMessage);

        await().atMost(5, SECONDS).until(() ->
            dlqRepository.count() == 1
        );
    }

    // DON'T test 100 validation rules here!
    // That's what Unit Tests are for.
}
```

**Keep Integration Tests Minimal:**
- 1-3 tests per feature
- Focus on "does it work at all?"
- NOT for testing every edge case

---

### When to Use Unit Tests

**Purpose:** Test detail logic, edge cases, and business rules without external dependencies.

**Use Unit Tests for:**

1. **Complex Business Logic**
   - Calculations, algorithms
   - State machines
   - Complex validation rules

2. **Many Edge Cases**
   - 100 different email validation scenarios
   - 50 discount calculation variations
   - Boundary conditions

3. **Fast Feedback**
   - No Kafka setup needed
   - No database needed
   - No Spring context needed

**Example: Validation Logic (100 cases)**

```java
class EmailValidatorTest {

    private EmailValidator validator = new EmailValidator();

    // Instead of 100 Integration Tests sending 100 Kafka messages...
    // Write 100 fast Unit Tests!

    @Test
    void shouldAcceptValidEmail() {
        assertTrue(validator.isValid("test@example.com"));
    }

    @Test
    void shouldRejectEmailWithoutAt() {
        assertFalse(validator.isValid("testexample.com"));
    }

    @Test
    void shouldRejectEmailWithoutDomain() {
        assertFalse(validator.isValid("test@"));
    }

    @Test
    void shouldRejectEmailWithSpaces() {
        assertFalse(validator.isValid("test @example.com"));
    }

    @Test
    void shouldRejectEmailWithSpecialCharsInDomain() {
        assertFalse(validator.isValid("test@exam ple.com"));
    }

    // ... 95 more edge cases
    // All tests run in < 1 second!
}
```

**Why Unit Tests for Edge Cases?**
- **Fast:** No external dependencies, runs in milliseconds
- **Simple:** Just call the method, no setup
- **Maintainable:** Easy to add more cases
- **Reliable:** No flaky network/DB issues

**Why NOT Integration Tests for Edge Cases?**
- **Slow:** Need to start Kafka, DB, Spring context
- **Complex:** Need test data setup for each scenario
- **Expensive:** 100 Integration Tests take minutes, not seconds
- **Brittle:** Flaky when external services have issues

---

### Real-World Example: Order Validation

**Scenario:** You have an Order validation service with:
- 50 validation rules (email, phone, address, payment, items, etc.)
- Each rule has 5-10 edge cases
- Total: ~300 test cases

**❌ Bad Approach (All Integration Tests):**
```java
// 300 Integration Tests that send REST requests
@SpringBootTest
@Test
void shouldRejectOrderWithInvalidEmail_Case1() {
    // Start Spring context, setup DB, HTTP client...
    ResponseEntity<Order> response = restTemplate.postForEntity(
        "/api/orders",
        orderWithInvalidEmail1,
        Order.class
    );
    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
}

// ... 299 more tests like this
// Total runtime: 30 minutes
// Maintenance nightmare when API changes
```

**✅ Good Approach (Test Pyramid):**

```java
// 1. Integration Tests (verify end-to-end flow works)
@SpringBootTest
class OrderApiIntegrationTest {

    @Test
    void shouldCreateOrderSuccessfully() {
        // Happy path: Order is valid → saved to DB → confirmation sent
        ResponseEntity<Order> response = restTemplate.postForEntity(
            "/api/orders",
            validOrder,
            Order.class
        );
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertTrue(orderRepository.findById(response.getBody().getId()).isPresent());
    }

    @Test
    void shouldRejectInvalidOrder() {
        // Error path: Invalid order → 400 error with message
        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/orders",
            invalidOrder,
            ErrorResponse.class
        );
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    // Only 2 Integration Tests!
    // Runtime: 10 seconds
}

// 2. Unit Tests (test all validation rules)
class OrderValidatorTest {

    @Test
    void shouldRejectEmailWithoutAt() {
        assertFalse(validator.validateEmail("testexample.com"));
    }

    @Test
    void shouldRejectPhoneWithLetters() {
        assertFalse(validator.validatePhone("123-ABC-4567"));
    }

    // ... 298 more validation tests
    // Runtime: 2 seconds
    // Easy to maintain
}
```

**Result:**
- 2 Integration Tests: Verify stack works (10 seconds)
- 298 Unit Tests: Verify all validation rules (2 seconds)
- Total: 12 seconds instead of 30 minutes
- Much easier to maintain

---

### Guidelines

**Integration Tests:**
- Keep to minimum (1-3 per feature)
- Test technical correctness
- Test main happy path
- Test critical error scenarios
- Use real or embedded external dependencies (Embedded Kafka, TestContainers)

**Unit Tests:**
- Write as many as needed
- Test all edge cases
- Test complex business logic
- Mock external dependencies
- Should run in milliseconds

**Test Strategy:**
- Integration Tests: 1-3 tests per acceptance criterion (technical + happy path + critical errors)
- Unit Tests: All edge cases and business logic variations
- Coverage: Analyze AFTER testing, use to find gaps or dead code

---

## Coverage as Analysis Tool (Not a Goal)

### The Right Approach

**Step 1: Write Tests for Acceptance Criteria**
- Each acceptance criterion should have tests (Integration or Unit)
- Main happy path + critical error scenarios

**Step 2: Write Tests for Business Logic Details**
- Complex algorithms, calculations
- Edge cases (null, empty, boundaries)
- Business rules variations

**Step 3: Run Tests and Check Coverage**
- Run coverage report (JaCoCo, IntelliJ Coverage, etc.)
- Look at untested code paths

**Step 4: Analyze Untested Paths**

For each untested code block, ask:

**Q1: Is this an important case I missed?**
- Yes → Write test for it
- Example: Error handling path not tested → Add error test

**Q2: Is this dead/unnecessary code?**
- Yes → Remove the code
- Example: Unused method, unreachable branch → Delete

**Q3: Is this framework/generated code?**
- Yes → Ok, no test needed
- Example: Lombok getter, Spring Boot auto-config → Ignore

**Q4: Is this defensive code for edge case?**
- Yes → Consider if worth testing
- Example: "if (value == null) return default" → Maybe add test, maybe ok

### Example: Analyzing Coverage Report

```
Class: OrderService
Coverage: 65%

Untested Lines:
- Line 45: if (order == null) throw new IllegalArgumentException()
- Line 67: logger.debug("Processing order {}", order.getId())
- Line 82: return orderMapper.toDTO(order)

Analysis:
- Line 45: Missing test for null input → ADD TEST ✅
- Line 67: Logging statement → No test needed (not business logic) ✅
- Line 82: MapStruct-generated mapper → No test needed (generated code) ✅

Action: Add test for Line 45, ignore rest.
```

### Anti-Pattern: Chasing Coverage Numbers

❌ **Bad:**
```
Coverage is 78%, need to get to 80%!
*writes test for getter to increase coverage*
Coverage is now 81%! Success!
```

✅ **Good:**
```
All acceptance criteria tested?
- Yes ✅

All business logic tested?
- Yes ✅

Any untested paths that matter?
- Line 45: null check not tested → Add test
- Rest is framework/logging → Ignore

Done. Coverage is 65%, but all important code is tested.
```

### Coverage is a Diagnostic, Not a KPI

**Use coverage to:**
- Find missing tests (untested business logic)
- Find dead code (unreachable branches)
- Validate test thoroughness

**Don't use coverage to:**
- Set arbitrary goals (80%, 90%)
- Force testing of framework/generated code
- Measure team performance

**Coverage tells you WHERE tests might be missing, not whether tests are GOOD.**

---

## Summary Checklist

When writing code, ask these questions:

- [ ] Is this business logic I wrote? → Test it
- [ ] Does this implement a story acceptance criterion? → Test it
- [ ] Is this complex or error-prone? → Test it
- [ ] Is this a framework feature (Spring, JPA)? → Don't test it
- [ ] Is this generated code (Lombok)? → Don't test it
- [ ] Is this a simple getter/setter? → Don't test it
- [ ] Did I test edge cases (null, empty, boundaries)? → Yes
- [ ] Are my tests independent and fast? → Yes
- [ ] Do test names clearly describe behavior? → Yes
- [ ] Did I add comments for skipped tests? → Yes

**Remember: Focus on testing YOUR code (business logic), not THE code (frameworks/libraries).**
