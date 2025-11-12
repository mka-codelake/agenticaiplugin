---
name: testing-philosophy
description: Guides testing decisions based on code classification - "Test YOUR Code, Not THE Code". Auto-activates when writing tests or discussing test coverage.
---

Use this skill when writing tests, reviewing test coverage, or making decisions about what to test.

## Core Philosophy

**"Test YOUR Code, Not THE Code"**

- **Test YOUR Code:** Business logic you wrote (services, domain models, algorithms)
- **Don't Test THE Code:** Frameworks, libraries, third-party code (Spring Boot, JPA, Jackson, etc.)

**Why?** Frameworks are already tested by their maintainers. Testing them wastes time and adds no value.

---

## Code Classification

Every piece of code falls into one of four categories:

### 1. Business Code (MUST test)
- Business rules, calculations, transformations
- Domain logic, validation rules
- Complex algorithms
- State machines
- Service layer methods
- Custom utilities

**Example:** `calculateDiscount()`, `validateOrder()`, `processPayment()`

### 2. Framework Code (NO tests)
- Spring Boot Auto-Configuration
- JPA Entity mappings (unless custom logic)
- Controller mappings (unless custom validation)
- Configuration classes
- Framework annotations

**Example:** `@SpringBootApplication`, `@Entity`, `@RestController`

### 3. Generated Code (NO tests)
- Lombok getters/setters/constructors
- MapStruct mappers
- QueryDSL Q-classes
- Auto-generated builders

**Example:** Lombok `@Data`, `@Builder`, `@Getter`

### 4. Infrastructure Code (Minimal tests)
- Database repositories: Only test custom queries
- Kafka listeners: Only test business logic extraction
- REST clients: Only test retry/fallback logic
- Cache configurations: Only test eviction logic

---

## Test Necessity Decision Logic

**When writing code, ask:**

1. **Did I write this logic?**
   - Yes → Consider testing
   - No (framework/library) → Don't test

2. **Is this business logic?**
   - Yes → MUST test
   - No (just wiring/configuration) → Don't test

3. **Does this implement a story acceptance criterion?**
   - Yes → MUST test
   - No → Consider if valuable

4. **Is this complex or error-prone?**
   - Yes → MUST test
   - No (trivial getter) → Don't test

---

## Coverage Philosophy

**Don't chase coverage percentages - chase quality tests.**

### Test-First Approach

1. **Write tests for acceptance criteria** (Integration/E2E)
2. **Write tests for business logic details** (Unit Tests)
3. **Run tests, check coverage AFTER**
4. **Analyze untested code paths:**
   - Is this an important case I missed? → Add test
   - Is this dead/unnecessary code? → Remove code
   - Is this framework/generated code? → Ok, no test needed

**Coverage is a tool for finding gaps, not a goal to achieve.**

### What Coverage Tells You

**High coverage (90%+) in business logic:**
- Good! Your acceptance criteria are well tested.

**Low coverage (30%) in business logic:**
- Missing tests? → Add tests for acceptance criteria
- Dead code? → Remove unused code
- Framework code counted? → Ignore framework coverage

**Example:**
- `UserService` (business logic): 95% coverage - All acceptance criteria + edge cases tested ✅
- `UserController` (Spring wiring): 0% coverage - Framework code, no test needed ✅
- `UserEntity` (Lombok-generated): 0% coverage - Generated code, no test needed ✅
- **Don't focus on project-wide percentage** - focus on whether acceptance criteria are tested ✅

---

## Quick Reference: What to Test?

| Code Type | Test Required? | Example |
|-----------|----------------|---------|
| Business Logic | ✅ YES | `calculateDiscount()` |
| Validation Rules | ✅ YES | `validateEmail()` |
| Custom Algorithms | ✅ YES | `sortByPriority()` |
| Story Acceptance Criteria | ✅ YES | Acceptance criteria implementation |
| Getters/Setters | ❌ NO | `getName()`, `setName()` |
| JPA Entity | ❌ NO | `@Entity User` |
| Spring Config | ❌ NO | `@Configuration` |
| Lombok Generated | ❌ NO | `@Data`, `@Builder` |
| Controller Routing | ❌ NO | `@GetMapping("/users")` |
| Custom Query | ✅ YES | `@Query("SELECT ...")` |
| Kafka Listener | ⚠️ PARTIAL | Test logic, not @KafkaListener |
| REST Client Retry | ✅ YES | Custom retry/fallback |

---

## Anti-Patterns (DO NOT do this)

### ❌ Testing Getters/Setters

```java
@Test
void testGetName() {
    user.setName("John");
    assertEquals("John", user.getName());
}
```

**Why bad:** Tests Lombok/Java, not YOUR code.

### ❌ Testing Spring Boot Auto-Configuration

```java
@Test
void testApplicationContextLoads() {
    assertNotNull(applicationContext);
}
```

**Why bad:** Tests Spring Boot, not YOUR code.

### ❌ Testing JPA Save

```java
@Test
void testRepositorySave() {
    repository.save(user);
    assertTrue(repository.findById(user.getId()).isPresent());
}
```

**Why bad:** Tests JPA/Hibernate, not YOUR code.

### ❌ Testing Jackson Serialization

```java
@Test
void testJsonSerialization() {
    String json = objectMapper.writeValueAsString(user);
    assertTrue(json.contains("\"name\":"));
}
```

**Why bad:** Tests Jackson, not YOUR code.

---

## When Writing Tests

1. **Identify code type** (Business/Framework/Generated/Infrastructure)
2. **Apply Test Necessity Matrix** (see reference.md)
3. **Write tests ONLY for Business Logic**
4. **Add comment for skipped tests:**
   ```java
   // No test: Lombok-generated getter
   // No test: Framework code (Spring Boot routing)
   // No test: JPA entity mapping
   ```

5. **Focus on edge cases** in business logic:
   - Null inputs
   - Empty collections
   - Boundary values
   - Invalid states

---

## Integration Tests vs Unit Tests

### Integration Tests (Few, focused on technical + business correctness)

**Purpose:**
- Technical correctness (Does the stack work together? Kafka, REST, DB, etc.)
- Business Happy Path (Does the main flow work end-to-end?)
- Critical error scenarios (What happens when Kafka is down? Invalid JSON?)

**Example:**
```java
@SpringBootTest
@Test
void shouldConsumeMessageAndSaveToDatabase() {
    // Integration: Kafka → Service → Database
    kafkaTemplate.send("input-topic", validMessage);

    await().atMost(5, SECONDS).until(() ->
        messageRepository.findByText(validMessage.getText()).isPresent()
    );
}

@Test
void shouldRejectInvalidMessageFormat() {
    // Integration: Invalid message handling
    kafkaTemplate.send("input-topic", "{invalid-json}");

    // Verify message goes to DLQ
    await().atMost(5, SECONDS).until(() ->
        dlqRepository.count() == 1
    );
}
```

**Use Integration Tests for:**
- End-to-end smoke tests
- Technical stack validation
- Main business flows (1-2 tests per feature)
- Critical error scenarios

**Keep them minimal:** If you have 100 validation rules, DON'T write 100 integration tests!

---

### Unit Tests (Many, focused on detail logic)

**Purpose:**
- Detail logic validation (complex algorithms, calculations)
- Edge cases (null, empty, boundaries, special characters)
- Business rules with many variations

**Example:**
```java
@Test
void shouldValidateEmail_ValidFormat() {
    assertTrue(validator.isValidEmail("test@example.com"));
}

@Test
void shouldValidateEmail_InvalidNoAt() {
    assertFalse(validator.isValidEmail("testexample.com"));
}

@Test
void shouldValidateEmail_InvalidNoDomain() {
    assertFalse(validator.isValidEmail("test@"));
}

// ... 50 more edge cases for email validation
```

**Use Unit Tests for:**
- Complex business logic (calculations, algorithms)
- Many edge cases (don't need real Kafka/DB for validation logic!)
- Detail validation rules
- Performance-critical code

**Advantage:** Fast, no external dependencies, can test hundreds of cases quickly.

---

### Test Pyramid Strategy

```
        /\
       /  \  Few Integration Tests (E2E, technical + business)
      /----\
     /      \
    /  Unit  \ Many Unit Tests (detail logic, edge cases)
   /  Tests   \
  /__________\
```

**Example Ratio:**
- 1 Integration Test: "Kafka message is consumed and saved to DB"
- 50 Unit Tests: All the validation rules, edge cases, business logic details

**Why?**
- Integration Tests are slow, require setup (Kafka, DB, etc.)
- Unit Tests are fast, easy to maintain
- Testing 100 validation rules via Integration Tests = slow, brittle, expensive
- Testing 100 validation rules via Unit Tests = fast, reliable, cheap

---

## Test Quality

**Every test should:**
- Test ONE thing (no multi-assertions for different scenarios)
- Follow Arrange-Act-Assert pattern
- Have clear, descriptive name (`shouldReturnErrorWhenInputIsNull`)
- Be independent (no test dependencies)
- Be fast (mock external dependencies in Unit Tests)

---

## Progressive Disclosure

For detailed examples, edge case guidelines, test quality standards, and comprehensive Test Necessity Matrix, see `reference.md`.

Only load `reference.md` when user asks for:
- "Show me test examples"
- "What are good test names?"
- "How do I test edge cases?"
- "Test quality standards"

Otherwise, keep context lean.

---

**This skill activates automatically when user mentions: test, testing, coverage, unit test, integration test, junit, mockito.**
