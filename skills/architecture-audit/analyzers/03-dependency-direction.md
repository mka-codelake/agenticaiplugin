# Analyzer 03: Dependency Direction

You analyze the dependency flow between top-level packages/modules and evaluate whether it conforms to the expected pattern identified in Phase 1.

---

## What to Analyze

### 3.1 Import/Dependency Mapping

- Map the **import relationships** between top-level packages/modules
- Identify which packages depend on which
- Determine the direction of dependency flow
- Compare actual flow to expected flow from the recognized architecture pattern

### 3.2 Dependency Direction Compliance

Based on the detected pattern, check:

| Pattern | Expected Direction |
|---------|-------------------|
| **Layered** | Controller → Service → Repository → Entity (top-down only) |
| **Hexagonal** | Adapters → Domain (inward only); Domain has no outward dependencies |
| **Clean Architecture** | Outer rings → Inner rings; Entities depend on nothing |
| **Modular Monolith** | Modules depend on shared/core; no direct cross-module dependencies |
| **Microservices** | Services communicate via APIs/events, not direct code dependencies |

### 3.3 Reverse Dependencies

- Identify imports that violate the expected direction
  - Example (Layered): Repository importing Controller classes
  - Example (Hexagonal): Domain importing an Adapter or infrastructure class
- Classify severity: occasional slip vs. systematic violation

### 3.4 Circular Dependencies

- Detect circular dependency chains between packages/modules
  - Package A → Package B → Package A
  - Longer chains: A → B → C → A
- Check whether circular dependencies are isolated or widespread

### 3.5 Enforcement Tools

- Are dependency rules enforced by tooling?
  - ArchUnit tests, dependency-cruiser configs, eslint-plugin-boundaries rules
  - Build system module boundaries (Java modules, Gradle project dependencies)
- If enforcement exists, do the rules match the expected pattern?

### 3.6 Dependency Shortcuts

- Imports that bypass intended layers/boundaries
  - Example: A Controller importing a utility from the Repository layer
  - Example: An Adapter directly using another Adapter's internal types
- "Convenience imports" that undermine architectural intent

### 3.7 External Dependency Distribution

- Are external library dependencies concentrated in appropriate layers?
  - Framework dependencies in infrastructure/adapter layers
  - Domain layer free of framework-specific imports
- Or are external dependencies scattered across all layers?

---

## Analysis Approach

1. **Sample imports** from 3-5 representative files in each top-level package
2. **Build a dependency map**: which packages import from which
3. **Compare against expected rules** from Phase 1
4. **Count violations**: isolated vs. systematic
5. **Check for enforcement**: architecture tests, lint configs, module boundaries

---

## Rating Criteria

| Rating | Criteria |
|--------|----------|
| **A** | Dependency direction consistent with expected pattern; no circular dependencies; enforcement tooling in place |
| **B** | Mostly consistent; 1-2 isolated reverse dependencies; no circular dependencies |
| **C** | General direction recognizable but multiple reverse dependencies or shortcuts; minor circular dependency |
| **D** | Frequent direction violations; circular dependencies present; no enforcement |
| **E** | No consistent dependency direction; widespread circular dependencies; dependency chaos |

---

## Output

Follow the standard format from `shared/analyzer-output-format.md`.
Use the rating definitions from `shared/rating-scale.md`.
