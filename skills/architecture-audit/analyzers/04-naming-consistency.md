# Analyzer 04: Naming Consistency

You evaluate whether naming conventions are consistently applied across the codebase — for types, methods, files, packages, and domain terminology.

---

## What to Analyze

### 4.1 Type Suffix Consistency

- Are role-based suffixes used consistently?
  - Controllers: `*Controller` (not mixed with `*Handler`, `*Endpoint`, `*Resource`)
  - Services: `*Service` (not mixed with `*Manager`, `*Helper`, `*Processor`)
  - Repositories: `*Repository` (not mixed with `*Dao`, `*Store`, `*DataAccess`)
  - Mappers: `*Mapper` (not mixed with `*Converter`, `*Transformer`, `*Adapter`)
  - DTOs: `*Dto` / `*Request` / `*Response` (consistent choice)
- Note: The project may legitimately choose non-standard suffixes — consistency matters, not which suffix.

### 4.2 Method Verb Consistency

- Retrieval operations: Does the project use one verb consistently?
  - `get*` / `find*` / `fetch*` / `load*` / `retrieve*` — pick one or have a clear convention
- Creation operations: `create*` / `add*` / `save*` / `insert*`
- Update operations: `update*` / `modify*` / `edit*` / `change*`
- Deletion operations: `delete*` / `remove*` / `destroy*` / `erase*`
- Existence checks: `exists*` / `has*` / `is*` / `contains*`

### 4.3 Domain Terminology

- Is the same business concept referred to by the same name throughout?
  - Example: `User` vs. `Account` vs. `Member` for the same concept
  - Example: `Order` vs. `Purchase` vs. `Transaction` for the same concept
- Does the Ubiquitous Language (if DDD) remain consistent across layers?

### 4.4 File Naming Patterns

- Are file names consistent with the types they contain?
- Casing convention applied uniformly:
  - `PascalCase.java` / `kebab-case.ts` / `snake_case.py`
- One class per file, or consistent multi-type file conventions?
- Test file naming: `*Test` / `*Tests` / `*Spec` / `test_*` — consistent?

### 4.5 Package/Directory Naming

- Consistent casing: lowercase, kebab-case, camelCase, PascalCase?
- Consistent granularity: `user/` vs. `user-management/` vs. `users/`
- Singular vs. plural: `model/` vs. `models/`, `service/` vs. `services/` — consistent choice?

### 4.6 Constant & Configuration Naming

- Constants: `UPPER_SNAKE_CASE` consistently?
- Configuration keys: consistent separator (`.` vs. `-` vs. `_`)?
- Environment variables: consistent prefix or naming scheme?

---

## Analysis Approach

1. **Scan type names** across the project for suffix patterns
2. **Sample method names** from service/repository classes for verb patterns
3. **Compare domain terms** across layers (controller, service, repository)
4. **Check file names** for casing consistency
5. **Check package/directory names** for conventions

---

## Rating Criteria

| Rating | Criteria |
|--------|----------|
| **A** | Consistent naming conventions across all categories; clear patterns; domain terminology uniform |
| **B** | Good consistency with 1-2 minor deviations (e.g., one mixed verb, one misnamed test file) |
| **C** | Recognizable conventions but noticeable inconsistencies in 2-3 categories |
| **D** | Partial naming conventions; significant inconsistency in suffixes or verbs; mixed domain terms |
| **E** | No recognizable naming conventions; arbitrary naming throughout |

---

## Output

Follow the standard format from `shared/analyzer-output-format.md`.
Use the rating definitions from `shared/rating-scale.md`.
