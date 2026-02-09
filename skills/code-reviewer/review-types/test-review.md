# Test Review Criteria

Review criteria for test files (*Test.java, *Tests.java, test_*.py, *.test.js, *.spec.ts, etc.).

## Core Principle

**"Test YOUR Code, Not THE Code"**

Only test business logic YOU wrote to implement story requirements. Do NOT test framework code, libraries, or generated code.

---

## Focus Areas

### 1. Testing Philosophy Adherence
- **CRITICAL:** Framework testing violations (testing Spring Boot, JPA, Jackson, etc.)
- **CRITICAL:** Generated code testing (testing Lombok getters/setters)
- **WARNING:** Library testing (testing standard libraries)
- **WARNING:** Missing tests for business logic

### 2. Test Coverage
- **WARNING:** Business logic methods without tests
- **WARNING:** Edge cases not tested (null, empty, boundary values)
- **SUGGESTION:** Happy path only (missing error case tests)

### 3. Test Quality
- **WARNING:** Tests without clear Arrange-Act-Assert structure
- **WARNING:** Multiple assertions per test (unfocused)
- **WARNING:** Tests with dependencies (not independent)
- **SUGGESTION:** Unclear test names

### 4. Test Placement
- **WARNING:** Integration tests in unit test directory
- **WARNING:** Unit tests in integration test directory
- **SUGGESTION:** Test organization doesn't match source structure

---

## Framework Testing Violations - CRITICAL

###What NOT to Test

**DO NOT test framework code:**
- ❌ Spring Boot (@SpringBootTest, @Autowired, @Component)
- ❌ JPA/Hibernate (save, findById, @Entity, @Repository)
- ❌ Jackson (JSON serialization/deserialization)
- ❌ Lombok (generated getters, setters, constructors, @Data, @Builder)
- ❌ Standard libraries (Collections, Streams, String methods)
- ❌ Web frameworks (HTTP request/response handling, @RestController)

**WHY:** These are tested by their authors. You trust that `repository.save()` works. Testing it wastes time and adds no value.

---

### CRITICAL Violations - Examples

#### Bad Example 1: Testing JPA Save

```java
@Test
void testSaveUser() {
    User user = new User("John", "john@example.com");
    User saved = userRepository.save(user);  // Testing Hibernate!
    assertNotNull(saved.getId());
}
```

**Problem:** This tests Hibernate's save implementation, not YOUR code.

**Review Finding:**
```markdown
**CRITICAL:** Testing framework code
- [UserRepositoryTest.java:15] Testing JPA save() method
**Rule:** testing-philosophy → "Test YOUR Code, Not THE Code"
**Fix:** Remove test. JPA save is tested by Hibernate team.
```

#### Bad Example 2: Testing Lombok Getters

```java
@Test
void testUserGetters() {
    User user = new User("John", "john@example.com");
    assertEquals("John", user.getName());  // Testing Lombok!
    assertEquals("john@example.com", user.getEmail());  // Testing Lombok!
}
```

**Problem:** This tests Lombok-generated getters, not YOUR code.

**Review Finding:**
```markdown
**CRITICAL:** Testing generated code
- [UserTest.java:10] Testing Lombok-generated getName()
- [UserTest.java:11] Testing Lombok-generated getEmail()
**Rule:** testing-philosophy → Don't test generated code
**Fix:** Remove test. Lombok generates correct getters.
```

#### Bad Example 3: Testing Jackson Serialization

```java
@Test
void testUserSerialization() throws Exception {
    User user = new User("John", "john@example.com");
    String json = objectMapper.writeValueAsString(user);  // Testing Jackson!
    assertTrue(json.contains("John"));
}
```

**Problem:** This tests Jackson's serialization, not YOUR code.

**Review Finding:**
```markdown
**CRITICAL:** Testing library code
- [UserTest.java:20] Testing Jackson serialization
**Rule:** testing-philosophy → Don't test libraries
**Fix:** Remove test. Jackson is tested by its authors.
```

---

### Good Examples - Test YOUR Code

#### Good Example 1: Testing Business Logic

```java
@Test
void calculateDiscount_appliesCorrectPercentage() {
    // STORY-042 AC: Premium users get 20% discount
    Order order = new Order(100.00);
    User premiumUser = new User("premium");

    // YOUR business logic
    double discount = discountCalculator.calculate(order, premiumUser);

    assertEquals(20.00, discount, 0.01);  // Testing YOUR calculation
}
```

**Why GOOD:** Tests YOUR discount calculation logic, which implements a story requirement.

#### Good Example 2: Testing Custom Validation

```java
@Test
void validateEmail_rejectsInvalidFormat() {
    // STORY-055 AC: Email must contain @ and domain
    String invalidEmail = "invalid-email";

    // YOUR validation logic
    boolean isValid = emailValidator.validate(invalidEmail);

    assertFalse(isValid);  // Testing YOUR validation
}
```

**Why GOOD:** Tests YOUR custom validation logic.

#### Good Example 3: Testing Edge Cases

```java
@Test
void processOrder_throwsExceptionWhenOrderIsNull() {
    // STORY-089 AC: System handles invalid orders gracefully

    // YOUR error handling logic
    assertThrows(
        IllegalArgumentException.class,
        () -> orderService.processOrder(null)
    );
}
```

**Why GOOD:** Tests YOUR null handling logic, an edge case in your implementation.

---

## Test Coverage

### WARNING: Missing Tests for Business Logic

If source code contains business logic (story-driven methods), verify tests exist:

**Check:**
- Every public business logic method has at least one test
- Happy path tested
- Edge cases tested (null, empty, boundary values)
- Error cases tested

**Don't Check:**
- Framework methods (save, findById, etc.) - don't need tests
- Getters/setters - don't need tests
- Simple pass-through methods - don't need tests

### WARNING: Missing Edge Cases

**Common edge cases to test:**
- Null inputs
- Empty collections/strings
- Boundary values (0, -1, MAX_INT, etc.)
- Invalid formats
- Concurrent access (if relevant)

---

## Test Quality

### WARNING: Unclear Test Structure

Tests should follow **Arrange-Act-Assert (AAA)** pattern:

**Bad Example:**
```java
@Test
void test1() {
    User user = new User();
    user.setName("John");
    assertEquals("John", user.getName());
    user.setEmail("john@example.com");
    assertEquals("john@example.com", user.getEmail());
}
```

**Good Example:**
```java
@Test
void calculateTotal_includesTaxAndShipping() {
    // Arrange
    Order order = new Order(100.00);
    order.setTaxRate(0.1);
    order.setShippingCost(10.00);

    // Act
    double total = order.calculateTotal();

    // Assert
    assertEquals(120.00, total, 0.01);
}
```

### WARNING: Multiple Assertions (Unfocused Test)

Each test should verify ONE behavior:

**Bad Example:**
```java
@Test
void testUser() {
    User user = new User("John", "john@example.com");
    assertEquals("John", user.getName());  // Multiple
    assertEquals("john@example.com", user.getEmail());  // unrelated
    assertTrue(user.isActive());  // assertions
}
```

**Good Example:**
```java
@Test
void newUser_isActiveByDefault() {
    User user = new User("John", "john@example.com");
    assertTrue(user.isActive());  // One focused assertion
}
```

### SUGGESTION: Test Naming

Test names should describe behavior, not implementation:

**Bad:**
```java
@Test
void test1() { ... }

@Test
void testCalculate() { ... }
```

**Good:**
```java
@Test
void calculateDiscount_returns20PercentForPremiumUsers() { ... }

@Test
void validateEmail_rejectsEmailsWithoutAtSign() { ... }
```

---

## Test Placement

### WARNING: Wrong Test Directory

**Unit Tests** (fast, no external dependencies):
- Location: `src/test/java/unit/` or `src/test/python/unit/`
- Test: Single class/method in isolation
- No: Database, HTTP, file system

**Integration Tests** (slower, external dependencies):
- Location: `src/test/java/integration/` or `src/test/python/integration/`
- Test: Multiple components working together
- May use: Database, HTTP, external services

**Review Finding:**
```markdown
**WARNING:** Wrong test placement
- [UserServiceTest.java:1] Uses @SpringBootTest but in unit/ directory
**Fix:** Move to integration/ directory (tests Spring context)
```

---

## Infrastructure Integration Test Completeness

**IMPORTANT:** Actively identify all infrastructure components the application depends on, then verify that each has at least one integration test.

### 5. Infrastructure Component Detection

Scan the project for infrastructure dependencies:

**Databases:**
- Connection strings, ORM configuration, repository classes, migration scripts
- Examples: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch

**Messaging Systems:**
- Producer/consumer configuration, topic/queue definitions, message handlers
- Examples: Kafka, RabbitMQ, ActiveMQ, SQS, NATS

**External APIs:**
- HTTP client configuration, API client classes, endpoint URLs
- Examples: REST clients, GraphQL clients, gRPC stubs

**Caches:**
- Cache configuration, cache annotations, cache manager setup
- Examples: Redis, Memcached, Hazelcast, in-memory caches

**File Systems / Object Storage:**
- File read/write operations, storage configuration
- Examples: S3, Azure Blob, local filesystem, SFTP

**Other Infrastructure:**
- SMTP/email services, LDAP/identity providers, scheduler/cron jobs

### 6. Integration Test Requirements

For each detected infrastructure component, verify:

- **CRITICAL:** Primary data store (main database) has no integration test
- **CRITICAL:** Core messaging system (e.g., Kafka for event-driven architecture) has no integration test
- **WARNING:** Secondary infrastructure component has no integration test
- **WARNING:** Integration test exists but doesn't test the actual integration point (e.g., uses in-memory mock instead of real container)
- **SUGGESTION:** Integration test exists but covers only happy path (no failure scenarios)

**What constitutes a valid integration test:**
- Uses real or containerized infrastructure (TestContainers, Docker, embedded server)
- Tests the actual integration boundary (connection, read/write, publish/consume)
- Verifies that data crosses the boundary correctly (format, encoding, schema)

**Review Finding Example:**
```markdown
**CRITICAL:** Missing integration test for primary database
- Project uses PostgreSQL (detected via application.yml + JPA entities)
- No integration test found that tests actual database operations with real/containerized PostgreSQL
**Rule:** test-review → Infrastructure Integration Test Completeness
**Fix:** Add integration test using TestContainers PostgreSQL or equivalent containerized approach
```

```markdown
**WARNING:** Missing integration test for Kafka messaging
- Project uses Kafka (detected via KafkaTemplate, @KafkaListener)
- No integration test verifying message produce/consume with real Kafka broker
**Rule:** test-review → Infrastructure Integration Test Completeness
**Fix:** Add integration test with containerized Kafka verifying end-to-end message flow
```

### 7. Integration Test → Technical Requirement Traceability

Integration tests should reference the technical requirement they validate:

- **WARNING:** Integration test without reference to requirement, epic, or technical story
- **SUGGESTION:** Group integration tests by infrastructure component for clarity

**Good Example:**
```java
@Test
void shouldPersistUserToPostgreSQL() {
    // EPIC-005: Database Integration
    // Technical Requirement: User data persisted to PostgreSQL
    // ...
    // REQUIREMENT ✓
}
```

**Bad Example:**
```java
@Test
void testDatabase() {
    // No requirement reference - why does this test exist?
    // ...
}
```

---

## E2E Test Coverage & Business Case Traceability

### 8. Business Requirements Documentation Check

Before checking E2E test completeness, verify that business requirements are documented:

**Check for requirements documentation in:**
- `claudedocs/stories/` or `docs/stories/` (story files)
- `claudedocs/epics/` or `docs/epics/` (epic files)
- `claudedocs/requirements/` or `docs/requirements/` (requirements files)
- Story references in code comments (STORY-XXX patterns)
- README or project documentation describing business use cases

**If NO requirements documentation found:**
```markdown
**WARNING:** No business requirements documentation found
- Cannot verify E2E test completeness without documented business cases
- Found test files but no traceable requirements to validate against
**Recommendation:** Document business requirements in claudedocs/stories/ or equivalent location
**Impact:** Without documented requirements, E2E test coverage cannot be objectively assessed
```

**If requirements documentation found → continue to section 9.**

### 9. E2E Test Completeness

For each documented business case / acceptance criterion, verify an E2E test exists:

- **WARNING:** Documented business case has no corresponding E2E test
- **WARNING:** E2E test exists but doesn't cover the full flow (partial coverage)
- **SUGGESTION:** E2E test covers happy path only (no error/edge scenarios documented in requirements)

**What constitutes a valid E2E test:**
- Tests the complete business flow from entry point (API, UI, message) to final state (database, response, side effect)
- Uses real or containerized infrastructure (not mocked boundaries)
- Validates the business outcome, not just technical correctness
- References the business requirement it validates (STORY-XXX, AC-N)

**Review Finding Example:**
```markdown
**WARNING:** Missing E2E test for business case
- STORY-042 AC-3: "When a user submits an order via REST API, the order is persisted and a confirmation email is sent"
- No E2E test found that validates this complete flow
**Rule:** test-review → E2E Test Completeness
**Fix:** Add E2E test that: POST /api/orders → verify DB persistence → verify email sent
```

### 10. E2E Test → Business Requirement Traceability

E2E tests MUST reference the business requirement they validate:

- **WARNING:** E2E test without story/requirement reference
- **WARNING:** E2E test references a story but doesn't match acceptance criteria
- **SUGGESTION:** Consider requirement coverage matrix (which AC is covered by which test)

**Good Example:**
```python
def test_order_submission_creates_order_and_sends_confirmation():
    """
    STORY-042 AC-3: When a user submits an order via REST API,
    the order is persisted and a confirmation email is sent.
    """
    # Given: valid order data
    # When: POST /api/orders
    # Then: order in database AND email sent
    # AC-3 ✓
```

**Bad Example:**
```python
def test_order():
    # No requirement reference
    # Tests something but unclear what business case
    response = client.post("/api/orders", json=order_data)
    assert response.status_code == 201
```

---

## Test Level Distribution Strategy

### 11. Smart Test Distribution

Verify that tests are distributed sensibly across test levels (unit, integration, E2E).

**Test Pyramid Principle:**
```
        /  E2E  \        ← Few: complete business flows
       / Integr. \       ← Medium: infrastructure boundaries
      /   Unit    \      ← Many: business logic variations
```

#### Complex Logic → Unit Tests (WARNING if missing)

When business logic has many variations, conditional paths, or calculation rules:

- **WARNING:** Complex logic (>5 conditional paths) tested only at integration/E2E level
- **WARNING:** Many input variations (>10 combinations) tested only via integration/E2E tests
- **SUGGESTION:** Consider unit tests for logic-heavy methods to test all variations cheaply

**Rationale:** Unit tests are fast, focused, and cheap. Testing 50 discount calculation scenarios via E2E tests (each spinning up the full application) is wasteful when a unit test with parameterized inputs achieves the same coverage in seconds.

**Detection:** Look for complex business logic (calculations, state machines, rule engines, validation chains) and check if test variations exist at unit level.

**Review Finding Example:**
```markdown
**WARNING:** Complex logic tested only at integration level
- [DiscountCalculator.java] Has 8 discount rules with 12 conditional branches
- Only 2 integration tests found (happy path + one error case)
- Remaining variations (edge cases, boundary values, rule combinations) untested
**Rule:** test-review → Test Level Distribution
**Fix:** Add parameterized unit tests for DiscountCalculator covering all rule variations. Keep integration tests for verifying the calculator works within the service context.
```

#### Infrastructure Boundaries → Integration Tests (WARNING if wrong level)

- **WARNING:** Infrastructure integration tested only at unit level with mocks (doesn't prove real integration works)
- **SUGGESTION:** Consider contract tests for external API integrations

#### Business Flows → E2E Tests (WARNING if missing)

- **WARNING:** Complete business flow has no E2E test
- **WARNING:** E2E test doesn't cover the full flow (stops mid-way)

#### Anti-Patterns

- **WARNING:** Hundreds of variation tests at E2E level when they could be unit tests (slow test suite, expensive feedback loop)
- **WARNING:** All tests are integration/E2E tests with no unit tests (missing test pyramid base)
- **WARNING:** All tests are unit tests with mocked dependencies (no proof that real integration works)
- **SUGGESTION:** Test suite takes >10 minutes → review test distribution for optimization opportunities

---

## Review Process

When reviewing test code:

1. **Check Framework Testing** - CRITICAL violations first
2. **Check Unit Test Coverage** - Business logic methods tested? Complex logic with variations at unit level?
3. **Check Quality** - AAA/Given-When-Then, focused assertions, clear names
4. **Check Placement** - Unit vs Integration vs E2E directory correct?
5. **Check Infrastructure Integration Tests** - HIGH PRIORITY
   - Identify all infrastructure components (DB, messaging, caches, external APIs)
   - For each: verify integration test with real/containerized infrastructure exists
   - Primary data store + core messaging without integration test = CRITICAL
6. **Check E2E Test Completeness** - HIGH PRIORITY
   - Find business requirements documentation (stories, ACs, specs)
   - For each documented business case: verify E2E test exists
   - Check that E2E tests cover full flow (entry point → final state)
   - If no requirements documentation found: flag as WARNING
7. **Check Test→Requirement Traceability**
   - Integration tests reference technical requirements (EPIC-XXX)?
   - E2E tests reference business requirements (STORY-XXX, AC-N)?
8. **Check Test Distribution** - Smart pyramid
   - Complex logic with many variations → should be unit tests (not only integration/E2E)
   - Infrastructure boundaries → should be integration tests (not only mocked unit tests)
   - Business flows → should be E2E tests
   - Anti-pattern: hundreds of variations at E2E level, or all-mocks no integration

**Remember:** Testing framework code is a CRITICAL violation. Always flag it.

**Remember:** Only require tests for business logic that implements story requirements. Don't demand tests for framework functionality.

**Remember:** Infrastructure integration tests and E2E test completeness are HIGH PRIORITY. Actively detect infrastructure components and check for corresponding tests.
