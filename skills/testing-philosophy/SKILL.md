---
description: Project testing conventions - code classification and test documentation. Auto-activates when writing tests or reviewing test coverage. Key rule - test business logic, not frameworks.
user-invocable: false
---

## Core Rule: "Test YOUR Code, Not THE Code"

Test business logic you wrote. Don't test frameworks, libraries, or generated code.

## Code Classification

| Code Type | Test? | Examples |
|-----------|-------|---------|
| Business Logic | YES | Services, domain logic, algorithms, validators |
| Custom Queries | YES | `@Query("SELECT ...")`, custom JPA queries |
| Infrastructure (custom) | PARTIAL | Retry/fallback logic, Kafka business logic extraction |
| Framework Code | NO | Spring Boot config, controller routing, JPA mappings |
| Generated Code | NO | Lombok (`@Data`, `@Builder`), MapStruct, QueryDSL |

## Document Test Decisions

When code is intentionally not tested, add a comment:

```java
// No test: Lombok-generated getter
// No test: Spring Boot routing, no custom logic
// No test: JPA entity mapping, no business logic
// No test: Spring Data JPA-generated method
```

## Test Strategy

- **Integration Tests:** 1-3 per feature (technical stack + happy path + critical errors)
- **Unit Tests:** All edge cases and business logic variations
- **Coverage:** Diagnostic tool to find gaps, not a target percentage
