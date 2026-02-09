# Analyzer 02: Component Boundaries

You evaluate how clearly the project is divided into components/modules and whether those boundaries are consistent, meaningful, and well-maintained.

---

## What to Analyze

### 2.1 Top-Level Organization

- Are top-level directories/packages **functional areas** (user, order, payment) or **technical layers** (controller, service, repository)?
- Is the chosen approach applied consistently across the project?
- Are there orphaned files or packages that don't fit the organizational scheme?

### 2.2 Internal Module Structure

- Does each module/component have a **consistent internal structure**?
  - Example: Every feature module has `controller/`, `service/`, `repository/` subdirectories
  - Or: Every module has `api/`, `domain/`, `infrastructure/`
- Are there modules that deviate from the common structure?
- Is the internal structure appropriate for the module's complexity?

### 2.3 Shared/Common Modules

- Do `shared/`, `common/`, `util/`, `core/` modules exist?
- Are they focused (true shared utilities) or dumping grounds (unrelated code)?
- Is there code in shared modules that belongs to a specific feature?
- Does the shared module have clear boundaries itself?

### 2.4 Entry Points & Public API Surface

- Does each module have a **clear entry point** (index file, public API package, facade)?
- Is it obvious which types/functions are the module's public interface?
- Do modules expose internals that consumers shouldn't depend on?

### 2.5 "God Packages"

- Are there packages/directories that accumulate unrelated concerns?
- Signs: generic names (`misc/`, `helpers/`, `stuff/`), large file counts, mixed domain concepts
- Does any single package contain types from multiple unrelated domains?

### 2.6 Public vs. Internal Separation

- Is there a clear distinction between public API and internal implementation?
- Language-specific mechanisms:
  - **Java:** `public` vs. package-private, module-info.java
  - **TypeScript/JavaScript:** index.ts barrel exports, `internal/` directories
  - **Python:** `__init__.py` exports, `_private` prefix convention
  - **Go:** Exported (capitalized) vs. unexported names
  - **C#:** `public` vs. `internal`, assembly boundaries

---

## Rating Criteria

| Rating | Criteria |
|--------|----------|
| **A** | Clear, consistent component boundaries; well-defined public surfaces; no god packages; shared modules focused |
| **B** | Good boundaries with minor deviations (1-2 misplaced files, one slightly bloated shared module) |
| **C** | Boundaries recognizable but inconsistent internal structure or several components with unclear scope |
| **D** | Partial boundaries; some modules well-defined, others are catch-all packages; unclear what belongs where |
| **E** | No meaningful component boundaries; flat structure or arbitrary grouping; everything accessible from everywhere |

---

## Output

Follow the standard format from `shared/analyzer-output-format.md`.
Use the rating definitions from `shared/rating-scale.md`.
