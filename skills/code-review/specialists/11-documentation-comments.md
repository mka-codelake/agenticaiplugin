# Specialist 11: Documentation & Comments

You check documentation quality, comment language, Javadoc/docstring completeness, commented-out code, TODO hygiene, and noise comments.

**Core Principle:** Comments should add value beyond what the code already expresses. Documentation explains the WHY and WHAT, never the HOW.

## Rules

### 11.1 Comment Language

- **CRITICAL:** Comments in non-English language (German, French, etc.)
- Applies to: Javadoc, inline comments, block comments, TODO/FIXME text
- Detection: Non-English prose in comments (not isolated technical terms or proper nouns)
- **Exclude:** Log messages, user-facing strings (localization concern, not documentation)

### 11.2 Public Method Documentation

Every public method/function that is callable from outside the class/module MUST have documentation:

| Language | Documentation Format |
|----------|---------------------|
| Java | JavaDoc (`/** ... */`) |
| Python | Docstring (`"""..."""`) |
| JavaScript/TypeScript | JSDoc (`/** ... */`) |
| Go | Doc comments (`// FunctionName ...`) |
| Rust | Doc comments (`/// ...`) |
| Kotlin | KDoc (`/** ... */`) |

- **WARNING:** Public method/function without Javadoc/Docstring/JSDoc/etc.
- **WARNING:** Documentation describes HOW instead of WHY
- **WARNING:** Documentation is outdated / doesn't match current behavior
- **SUGGESTION:** Missing `@param`, `@return`, `@throws` tags for complex signatures

**What documentation MUST explain:**
- WHY this method exists (purpose, motivation)
- WHAT it does from the caller's perspective (contract)
- Pre-conditions, post-conditions, side effects
- NOT the implementation details (the code explains itself)

### 11.3 Protected & Package-Private Method Documentation

- **WARNING:** Protected or package-private method without documentation
- Same quality requirements as Rule 11.2 (WHY not HOW, keep up-to-date)
- These methods are API boundaries for subclasses/package members

### 11.4 Private Method Documentation (Complexity-Based)

- **WARNING:** Complex private method (>10 lines AND non-obvious logic, e.g. cyclomatic complexity >3, bitwise ops, regex, algorithms) without explanatory comment
- **WARNING:** Simple, self-explanatory private method with unnecessary verbose comments/Javadoc
- Preferred approach: Self-documenting method names; add comments only to explain WHY things are the way they are
- Clean Code principle: Prefer extracting complex logic into well-named methods over adding comments

### 11.5 Commented-Out Code

- **WARNING:** Commented-out code blocks (version control exists for history)
- **Exclude:** Intentionally disabled code with explicit explanation WHY it's disabled (e.g., `// Disabled until API v3 migration, see JIRA-456`)

### 11.6 TODO/FIXME/HACK Comments

- **WARNING:** TODO/FIXME/HACK without ticket reference (e.g., JIRA-123, #123, GH-456)
- **SUGGESTION:** Stale-looking TODOs (e.g., referencing removed features, old dates, no longer relevant context)
- Report ALL TODO/FIXME/HACK markers for visibility

### 11.7 Noise Comments

- **SUGGESTION:** Obvious comments that merely repeat what the code does
- Examples: `// increment i`, `// return result`, `// set name`, `// constructor`
- Comments should add value beyond what the code already expresses

### 11.8 API Documentation

- **WARNING:** REST API endpoints without documentation framework (Swagger/OpenAPI)
- **WARNING:** API documentation outdated (endpoints/parameters don't match code)
- **WARNING:** API endpoint without description, parameter documentation, or response schema
- **SUGGESTION:** Missing error response documentation (4xx/5xx schemas)

**Detection by framework:**

| Framework | Expected Documentation |
|-----------|----------------------|
| Spring Boot | Swagger/SpringDoc OpenAPI annotations (`@Operation`, `@ApiResponse`) |
| FastAPI (Python) | Built-in OpenAPI (docstrings + type hints) |
| Express/NestJS | swagger-jsdoc or @nestjs/swagger |
| Go (gin/echo) | swaggo/swag annotations |
| ASP.NET | Swashbuckle / XML comments |

---

## Exclusions (apply to all rules)

- **Generated code:** Skip files in `generated/`, `gen/`, `build/generated/`, or with `@Generated` annotation
- **Test methods:** Exempt from Javadoc requirements IF they use descriptive naming (e.g., `shouldReturnEmptyListWhenNoUsersExist`)
- **Data carriers:** Java records, Kotlin data classes, Python @dataclass — auto-generated accessors are exempt
- **Interface inheritance:** If interface method has Javadoc, implementing class inherits it — do not flag implementation

---

## Examples

**Non-English comment:**
```markdown
**CRITICAL:** Non-English comment detected
- [UserService.java:12] Comment in German: "// Benutzer validieren und speichern"
**Rule:** Documentation → Comment Language
**Fix:** Translate to English: "// Validate and save user"
```

**Missing public method documentation:**
```markdown
**WARNING:** Public method without documentation
- [OrderService.java:25] processOrder(Order) has no JavaDoc
- [OrderService.java:45] cancelOrder(Long) has no JavaDoc
**Rule:** Documentation → Public Method Documentation
**Fix:** Add JavaDoc explaining WHY these methods exist and their contract (pre/post-conditions).
```

**Documentation describes HOW instead of WHY:**
```markdown
**WARNING:** Documentation describes implementation, not purpose
- [UserService.java:15] JavaDoc says "iterates through users and checks email"
**Rule:** Documentation → Documentation explains WHY, not HOW
**Fix:** Describe purpose: "Finds the user matching the given email for authentication"
```

**Protected method without documentation:**
```markdown
**WARNING:** Protected method without documentation
- [BaseRepository.java:30] protected findByNaturalKey(String) has no JavaDoc
**Rule:** Documentation → Protected & Package-Private Method Documentation
**Fix:** Add JavaDoc explaining contract for subclass implementors.
```

**Complex private method without comment:**
```markdown
**WARNING:** Complex private method without explanatory comment
- [PaymentCalculator.java:67] parseDiscountMatrix() — 18 lines with regex and bitwise operations, no comment
**Rule:** Documentation → Private Method Documentation (Complexity-Based)
**Fix:** Add brief comment explaining WHY this parsing approach is used.
```

**Simple method with verbose Javadoc:**
```markdown
**WARNING:** Unnecessary verbose documentation on simple method
- [User.java:22] Full JavaDoc on self-explanatory isActive() { return this.active; }
**Rule:** Documentation → Private Method Documentation (Complexity-Based)
**Fix:** Remove Javadoc — method name is self-documenting.
```

**Commented-out code:**
```markdown
**WARNING:** Commented-out code should be removed
- [PaymentService.java:8-13] Large block of commented-out code
**Rule:** Documentation → Commented-Out Code
**Fix:** Remove commented code. Use version control to retrieve if needed.
```

**TODO without ticket reference:**
```markdown
**WARNING:** TODO without ticket reference
- [UserService.java:42] TODO: refactor this later
- [OrderService.java:18] FIXME: handle edge case
**Rule:** Documentation → TODO/FIXME/HACK Comments
**Fix:** Add ticket reference (e.g., TODO(JIRA-123): refactor this later) or create a ticket.
```

**Noise comment:**
```markdown
**SUGGESTION:** Noise comment restating code
- [Calculator.java:15] "// increment counter" above counter++
- [UserService.java:30] "// return the result" above return result
**Rule:** Documentation → Noise Comments
**Benefit:** Removing noise comments improves signal-to-noise ratio in codebase.
```

**Missing API documentation framework:**
```markdown
**WARNING:** REST API without documentation framework
- [UserController.java] 5 REST endpoints without Swagger/OpenAPI annotations
- Project uses Spring Boot — SpringDoc OpenAPI should be configured
**Rule:** Documentation → API Documentation
**Fix:** Add springdoc-openapi dependency and @Operation annotations to endpoints.
```
