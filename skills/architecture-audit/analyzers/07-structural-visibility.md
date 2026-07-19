# Analyzer 07: Structural Visibility

You evaluate how easily a developer can understand the project's architecture just by looking at its structure — directory names, file organization, entry points, and documentation.

---

## What to Analyze

### 7.1 Self-Explanatory Top-Level Structure

- Can a new developer understand the project's purpose and organization from the top-level directory listing alone?
- Are directory names descriptive of their content?
  - Good: `orders/`, `authentication/`, `api/`, `infrastructure/`
  - Bad: `stuff/`, `misc/`, `module1/`, `pkg/`
- Is the top-level structure cluttered with many files, or is it clean with clear directories?

### 7.2 Architecture Pattern Visibility

- Is the architecture pattern recognizable from directory/package names alone?
  - Layered: `controllers/`, `services/`, `repositories/`
  - Hexagonal: `domain/`, `ports/`, `adapters/`
  - Feature-based: `user/`, `order/`, `payment/`
- Do directory names signal the pattern without needing to read code?

### 7.3 Feature Locality (Co-location vs. Scattering)

- **Co-located (feature-based):** All files for a feature in one directory
  - `user/UserController.java`, `user/UserService.java`, `user/UserRepository.java`
- **Scattered (type-based):** Files for a feature spread across technical directories
  - `controllers/UserController.java`, `services/UserService.java`, `repositories/UserRepository.java`
- Is the chosen approach applied consistently?
- Can you find all files related to one feature without searching?

### 7.4 Entry Point Clarity

- Is there a clear application entry point?
  - `main.py`, `index.ts`, `App.java`, `Program.cs`, `main.go`
- Can you find where the application starts within 30 seconds?
- Is the startup/bootstrap process traceable (configuration → wiring → startup)?

### 7.5 Architecture Documentation

- Does architecture documentation exist?
  - `ARCHITECTURE.md` at project root
  - `docs/architecture/` directory
  - `.claude/adrs/` (Architectural Decision Records)
  - Inline architecture comments in key files
- Does the documentation match the actual code structure?

### 7.6 Navigation Depth

- How many directory levels must you navigate to reach meaningful source files?
  - 1-2 levels: Excellent visibility
  - 3-4 levels: Acceptable for complex projects
  - 5+ levels: Deep nesting reduces visibility
- Is the depth consistent or do some areas nest much deeper than others?

### 7.7 Configuration Visibility

- Is project configuration easy to find?
  - Build configuration: `pom.xml`, `package.json`, `build.gradle` at root
  - Application configuration: `application.yml`, `.env`, `settings.py`
  - Infrastructure configuration: `docker-compose.yml`, `Dockerfile`, CI/CD configs
- Are configuration files scattered or organized?

---

## Analysis Approach

1. **List top-level directory structure** (2-3 levels)
2. **Assess naming clarity** of each directory
3. **Determine co-location vs. scattering** strategy
4. **Find the entry point** — how long does it take?
5. **Search for architecture documentation** (`ARCHITECTURE.md`, `docs/`, `.claude/adrs/`)
6. **Measure navigation depth** to source files

---

## Rating Criteria

| Rating | Criteria |
|--------|----------|
| **A** | Architecture instantly recognizable from structure; clear entry point; documentation matches code; consistent co-location or scattering; reasonable depth |
| **B** | Good structural visibility with minor gaps (missing docs but clear structure, or docs exist but slightly outdated) |
| **C** | Structure partially reveals architecture; some areas clear, others confusing; documentation incomplete or absent |
| **D** | Structure does not clearly communicate architecture; deep nesting; no documentation; hard to find entry point |
| **E** | Structure actively misleading or chaotic; directories named generically; no entry point visible; no documentation |

---

## Output

Follow the standard format from `shared/analyzer-output-format.md`.
Use the rating definitions from `shared/rating-scale.md`.
