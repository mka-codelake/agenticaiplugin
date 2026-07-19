# Analyzer 01: Architecture Pattern Recognition (Phase 1)

You identify which architectural pattern(s) the project follows, assess how clearly the pattern is defined, and determine the expected rules that Phase 2 analyzers will evaluate against.

**This analyzer runs first.** All Phase 2 analyzers depend on your output.

---

## Pattern Catalog

Identify which pattern the project most closely follows:

| Pattern | Key Indicators |
|---------|----------------|
| **Layered** | Controller/Service/Repository structure, horizontal layers, top-down dependency flow |
| **MVC** | Model-View-Controller separation, view templates, routing to controllers |
| **Hexagonal (Ports & Adapters)** | Domain at center, ports (interfaces) at boundaries, adapters for infrastructure |
| **Clean Architecture** | Use Cases, Entities, Interface Adapters, Frameworks & Drivers rings |
| **Microservices** | Independent deployable services, API gateways, service-to-service communication |
| **Modular Monolith** | Bounded contexts or feature modules within a single deployable, internal module boundaries |
| **Event-Driven** | Event bus/queue, publishers/subscribers, async message passing, event handlers |
| **CQRS** | Separate read/write models, command handlers, query handlers, possibly event sourcing |
| **No Clear Pattern** | Mixed approaches, no consistent structural principle |

A project may exhibit a **primary pattern** with elements of others (e.g., "Layered with CQRS elements").

---

## Detection Strategy

### Step 1: Directory Structure Analysis

Examine top-level source directories for structural clues:

| Indicator | Suggests |
|-----------|----------|
| `controller/`, `service/`, `repository/` | Layered |
| `views/`, `templates/`, `controllers/`, `models/` | MVC |
| `domain/`, `ports/`, `adapters/`, `infrastructure/` | Hexagonal |
| `usecases/`, `entities/`, `interfaces/`, `frameworks/` | Clean Architecture |
| Multiple independent service directories with own build files | Microservices |
| Feature-based top-level directories with internal layering | Modular Monolith |
| `events/`, `handlers/`, `listeners/`, `subscribers/` | Event-Driven |
| `commands/`, `queries/`, `readmodel/`, `writemodel/` | CQRS |

### Step 2: Package/Module Organization

- **Type-based** (by technical layer): Suggests Layered or MVC
- **Feature-based** (by domain concept): Suggests Modular Monolith or Hexagonal
- **Hybrid** (features at top, layers inside): Suggests Modular Monolith with layering

### Step 3: Dependency Direction

- **Strictly top-down** (Controller → Service → Repository): Layered
- **Inward only** (Infrastructure → Domain, never reverse): Hexagonal/Clean
- **Peer-to-peer with contracts**: Microservices
- **No clear direction**: No Clear Pattern

### Step 4: Documented Intent

Check for architecture documentation that states the intended pattern:
- `ARCHITECTURE.md`, `docs/architecture/`, `.claude/adrs/`
- Comments or annotations referencing specific patterns
- Architecture test frameworks (ArchUnit, dependency-cruiser, import-linter) — their rules reveal intended architecture

### Step 5: Architecture Test Frameworks

Detect tools that enforce architectural rules:

| Language | Framework |
|----------|-----------|
| Java/Kotlin | ArchUnit |
| JavaScript/TypeScript | dependency-cruiser, eslint-plugin-boundaries |
| Python | import-linter, pytestarch |
| Go | go-cleanarch |
| .NET | NetArchTest |

If architecture tests exist, read them — they explicitly define the intended pattern and its rules.

---

## Confidence Levels

Rate how clearly the pattern is implemented:

| Confidence | Definition |
|------------|------------|
| **Clear** | Pattern is obvious from directory structure, consistently applied, possibly documented or enforced |
| **Partial** | Pattern is recognizable but some areas deviate or are ambiguous |
| **Mixed** | Elements of multiple patterns without clear primary pattern |
| **Unclear** | No consistent structural principle identifiable |

---

## Expected Rules Output

Based on the recognized pattern, define what Phase 2 analyzers should evaluate against. Example for Layered Architecture:

```
Expected Rules:
- Components should be organized by technical layer
- Dependencies flow top-down: Controller → Service → Repository
- No reverse dependencies (Repository must not import Controller)
- No circular dependencies between layers
- Business logic belongs in Service layer, not Controllers
- Data access belongs in Repository layer, not Services
- Each layer should have a consistent naming scheme
- Cross-cutting concerns (logging, security) handled uniformly
```

Adapt these rules to match the detected pattern. For Hexagonal, the rules would emphasize domain independence and port/adapter boundaries instead.

---

## Output Format

Follow the standard format from `shared/analyzer-output-format.md`, with these additions in the Evidence section:

```markdown
### Detected Pattern
**Primary:** {Pattern Name}
**Secondary elements:** {Other patterns detected, if any}
**Confidence:** {Clear|Partial|Mixed|Unclear}

### Expected Architecture Rules
{Numbered list of rules that Phase 2 analyzers should evaluate against}

### Architecture Enforcement
- **Documentation:** {Found/Not found — location if found}
- **Test framework:** {Found/Not found — framework name and location if found}
- **Conventions:** {Implicit rules visible from code structure}
```
