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

## Review Process

When reviewing test code:

1. **Check Framework Testing** - CRITICAL violations first
2. **Check Coverage** - Are business logic methods tested?
3. **Check Quality** - AAA pattern, focused assertions, clear names
4. **Check Placement** - Unit vs Integration directory correct?

**Remember:** Testing framework code is a CRITICAL violation. Always flag it.

**Remember:** Only require tests for business logic that implements story requirements. Don't demand tests for framework functionality.
