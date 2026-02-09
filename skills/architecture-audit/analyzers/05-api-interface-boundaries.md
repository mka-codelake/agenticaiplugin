# Analyzer 05: API / Interface Boundaries

You evaluate whether components interact through well-defined interfaces/contracts or bypass boundaries by reaching into internal implementations.

---

## What to Analyze

### 5.1 Declared Interfaces/Contracts

- Do modules/components define **explicit interfaces** at their boundaries?
  - Java: `interface` types in a public API package
  - TypeScript: Exported `interface` or `type` definitions
  - Python: Abstract base classes, Protocol types
  - Go: Interface types at package level
- Are interfaces used for cross-component communication or only within components?

### 5.2 Consumer Access Patterns

- Do consumers (other modules) depend on **interfaces** or on **concrete implementations**?
  - Good: `OrderService` depends on `PaymentPort` (interface)
  - Bad: `OrderService` depends on `StripePaymentService` (concrete)
- Is the dependency on abstractions consistent across the codebase?

### 5.3 Boundary Bypasses ("Shortcut Imports")

- Do consumers import internal/private types from other modules?
  - Importing from `internal/`, `impl/`, or non-exported packages
  - Accessing types not part of a module's public API surface
  - Reaching into another module's data layer directly
- Are these isolated pragmatic shortcuts or systematic boundary violations?

### 5.4 Access Modifiers

- Are visibility modifiers used correctly to enforce boundaries?
  - `public` only for genuinely public API
  - `package-private` / `internal` for implementation details
  - `private` for class internals
- Are there types that should be internal but are exposed as public?
- Language-specific:
  - **Java:** package-private by default? module-info.java?
  - **TypeScript:** barrel exports (index.ts) controlling what's public?
  - **Python:** `__all__` in `__init__.py`? `_private` prefix conventions?
  - **Go:** unexported (lowercase) names for internal types?
  - **C#:** `internal` for assembly-scoped types?

### 5.5 Module Public Surface

- Can you clearly identify what each module exposes to the rest of the project?
- Is the public surface **minimal** (only what's needed) or **maximal** (everything is public)?
- Are there clear "API packages" or "public facades" per module?

### 5.6 Contract Stability

- Do interfaces change frequently (unstable contracts)?
- Are there versioned APIs or interface evolution strategies?
- Are breaking changes to module boundaries handled explicitly?

---

## Analysis Approach

1. **Identify module boundaries** (top-level packages, feature directories)
2. **Check for interface definitions** at boundaries
3. **Sample cross-module imports** to see what's being accessed
4. **Check access modifiers** on types near boundaries
5. **Assess public API surface** clarity per module

---

## Rating Criteria

| Rating | Criteria |
|--------|----------|
| **A** | Clear interfaces at all boundaries; consumers depend on abstractions; minimal public surface; access modifiers correct |
| **B** | Good interface usage with minor gaps (1-2 concrete dependencies, occasional shortcut import) |
| **C** | Some interfaces exist but inconsistently applied; several boundary bypasses; mixed access modifier usage |
| **D** | Few formal interfaces; consumers frequently access internals; access modifiers mostly unused |
| **E** | No interface boundaries; everything depends on everything; no access control |

---

## Output

Follow the standard format from `shared/analyzer-output-format.md`.
Use the rating definitions from `shared/rating-scale.md`.
