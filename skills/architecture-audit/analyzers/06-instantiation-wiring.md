# Analyzer 06: Instantiation & Wiring

You evaluate how the project handles object creation, dependency injection, and component wiring — and whether the approach is consistent and testable.

---

## What to Analyze

### 6.1 Wiring Mechanism

Identify the primary mechanism used to wire components together:

| Mechanism | Indicators |
|-----------|------------|
| **DI Framework** | Spring `@Autowired`/`@Inject`, Angular DI, .NET DI, Dagger, Guice |
| **Manual Construction** | Explicit `new` in composition root / main, no DI framework |
| **Service Locator** | Global registry, `ServiceLocator.get()`, `Container.resolve()` |
| **Factory Pattern** | Factory classes/methods creating instances |
| **Module System** | Language-level modules wiring (Go packages, Python imports, ES modules) |

Is there **one primary mechanism** or a mix?

### 6.2 Consistency

- Is the same wiring approach used throughout the project?
- Are there components using DI in one area and manual `new` in another (for the same type of wiring)?
- Is the wiring approach consistent within each layer?

### 6.3 Injection Style (if DI framework)

- **Constructor Injection** — preferred, explicit dependencies, testable
- **Field Injection** — `@Autowired` on fields (Java), less explicit, harder to test
- **Setter Injection** — `setX()` methods, optional dependencies
- **Method Injection** — `@Bean` methods in configuration

Is the injection style consistent across the project? Mixed constructor and field injection signals inconsistency.

### 6.4 `new ConcreteClass()` in Business Logic

- Are concrete dependencies instantiated directly inside business logic?
  - `new EmailService()` inside `OrderService` instead of injecting it
  - `new HttpClient()` inside a service method
- This creates tight coupling and makes testing difficult
- Exception: Value objects, DTOs, and data structures are fine to instantiate directly

### 6.5 Configuration Centralization

- Is wiring configuration centralized?
  - Java: `@Configuration` classes, `application.yml`
  - TypeScript: Module definitions, composition root
  - Python: `settings.py`, DI container setup
- Or is configuration scattered across the codebase?

### 6.6 Testability

- Can dependencies be replaced in tests?
  - Constructor injection enables easy mocking
  - Field injection requires reflection or framework support
  - `new` in business logic prevents mocking entirely
- Are there test configurations or test doubles for infrastructure dependencies?
- Is the wiring approach test-friendly?

---

## Analysis Approach

1. **Identify wiring mechanism** from framework dependencies and code patterns
2. **Sample constructors/injection points** across layers
3. **Search for `new` instantiations** of service/infrastructure types in business logic
4. **Check for configuration centralization** (config classes, composition root)
5. **Assess testability** by examining test setup patterns

---

## Rating Criteria

| Rating | Criteria |
|--------|----------|
| **A** | Consistent wiring mechanism; constructor injection throughout; centralized configuration; excellent testability |
| **B** | Mostly consistent; 1-2 instances of mixed injection style or direct instantiation; good testability |
| **C** | Recognizable wiring approach but inconsistently applied; some direct instantiation in business logic; testability mixed |
| **D** | Multiple wiring mechanisms mixed without clear rationale; frequent direct instantiation; poor testability |
| **E** | No consistent wiring approach; dependencies created ad-hoc; no testability consideration |
| **N/A** | Purely functional codebase, scripting project, or no meaningful dependency graph |

---

## Output

Follow the standard format from `shared/analyzer-output-format.md`.
Use the rating definitions from `shared/rating-scale.md`.
