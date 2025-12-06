# Test-Engineer Agent Command

Invoke the test-engineer agent to write integration, system, or E2E tests based on acceptance criteria.

## Usage

```
/agenticaiplugin:test [STORY-ID | EPIC-ID | test-type]
```

**Examples:**
```
/agenticaiplugin:test STORY-042
/agenticaiplugin:test EPIC-005
/agenticaiplugin:test api
/agenticaiplugin:test kafka
```

## What It Does

The test-engineer agent will:

1. **Read Requirements:**
   - Story/Epic acceptance criteria (`claudedocs/stories/`, `claudedocs/epics/`)
   - Test specifications (`claudedocs/testspecs/*.md`)
   - Project testing guidelines (`claudedocs/guidelines/*.md`)

2. **Write Tests:**
   - Integration tests (`src/test/java/integration/`)
   - System tests (`src/test/java/integration/system/`)
   - E2E tests (`src/test/java/integration/e2e/`)

3. **Apply Best Practices:**
   - TestContainers for real infrastructure
   - Awaitility for async testing
   - AssertJ assertions
   - Given-When-Then structure
   - Story/AC traceability

4. **Report Results:**
   - Tests created
   - Acceptance Criteria coverage
   - TestContainers used
   - Next steps

## Examples

### Write Tests for Specific Story

```
User: /agenticaiplugin:test STORY-042

Test-Engineer:
Reading STORY-042: User Registration...
Found 4 Acceptance Criteria.

Creating tests:
✓ UserRegistrationSystemTest.java
  - shouldRegisterUserWithActiveStatus (AC-1)
  - shouldSendWelcomeEmailOnRegistration (AC-2)
  - shouldReturn400WhenEmailInvalid (AC-3)
  - shouldPublishUserCreatedEvent (AC-4)

All tests written in src/test/java/integration/api/
Tests currently FAIL (Red) - ready for implementation.
```

### Write Tests for Epic

```
User: /agenticaiplugin:test EPIC-005

Test-Engineer:
Reading EPIC-005: Kafka Message Processing...
Found 3 Acceptance Criteria.

Creating tests:
✓ KafkaMessageProcessingIntegrationTest.java
  - shouldCreateUserWhenReceivingCreateEvent (AC-1)
  - shouldUpdateUserWhenReceivingUpdateEvent (AC-2)
  - shouldDeleteUserWhenReceivingDeleteEvent (AC-3)

TestContainers: Kafka, PostgreSQL
Tests written in src/test/java/integration/messaging/
```

### Write Tests for Specific Component

```
User: /agenticaiplugin:test api

Test-Engineer:
Checking for test specifications in claudedocs/testspecs/...
Found: api-testing-scenarios.md

Creating REST API integration tests based on specs...
✓ UserApiIntegrationTest.java
✓ OrderApiIntegrationTest.java

Tests written in src/test/java/integration/api/
```

## Test Specifications

If you have specific test scenarios, create them in:

```
claudedocs/testspecs/[name].md
```

**Example (claudedocs/testspecs/kafka-message-scenarios.md):**

```markdown
# Kafka Message Processing Test Scenarios

## Scenario 1: CREATE Message

**Input:**
- Topic: user-events
- Message: `{"userId": 123, "action": "CREATE", "username": "john"}`

**Expected:**
- User with ID 123 exists in database
- User status is ACTIVE
- User username is "john"

## Scenario 2: UPDATE Message

**Input:**
- Topic: user-events
- Message: `{"userId": 123, "action": "UPDATE", "username": "john_updated"}`

**Expected:**
- User with ID 123 updated in database
- User username is "john_updated"
- User status unchanged
```

The test-engineer agent will read these specs and create corresponding tests.

## Test-First Development (TDD)

**Recommended workflow:**

1. **Define Story/Epic** with Acceptance Criteria
2. **Create Test Specification** (optional, in `claudedocs/testspecs/`)
3. **Run `/agenticaiplugin:test STORY-XXX`** → Test-Engineer writes tests (RED)
4. **Implement features** → Developer makes tests GREEN
5. **Refactor** → Tests still GREEN

## Important Notes

- **Separate Context:** Test-Engineer has separate context from developer agent
- **User Requirements:** Tests reflect YOUR understanding, not implementation details
- **Immutable Tests:** Developer agent must NOT modify integration/system/E2E tests
- **Protected Directories:** `src/test/java/integration/`, `e2e/`, `system/` are protected
- **Test Specifications:** Highest priority - direct user instructions

## Related

- **/agenticaiplugin:code-review** - Review code quality (auto-runs after implementation)
- **testing-philosophy skill** - General testing principles
- **integration-testing skill** - Integration test patterns
- **spring-boot-best-practices skill** - Unit testing section

---

Invoke the test-engineer agent to create high-quality integration, system, and E2E tests that validate your requirements.
