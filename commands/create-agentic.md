# Create Agentic Command

Creates or updates the `agentic.md` file - a context-optimized project overview for AI sessions.

## Usage

```
/create-agentic
```

No parameters required.

## What It Does

The context-creator agent will:

1. **Detect Mode:**
   - If `agentic.md` doesn't exist → CREATE mode (full analysis)
   - If `agentic.md` exists → UPDATE mode (incremental update)

2. **Analyze Project:**
   - Scan directory structure
   - Identify technology stack (pom.xml, package.json, etc.)
   - Read key files (CLAUDE.md, README.md, configs)
   - Extract critical rules and conventions
   - Check recent git activity

3. **Write agentic.md:**
   - Context-optimized format (tables, headers, bullets)
   - Includes: Purpose, Structure, Tech Stack, Critical Rules, References
   - No absolute paths (portable)
   - Scannable by AI and humans

## Example Output

```
agentic.md CREATED

Analyzed:
- 12 directories
- 8 key files
- 5 critical rules extracted

Key findings:
- Spring Boot 3.2 / Java 21
- Maven multi-module project
- Microservices architecture
```

## When to Use

- **New project:** Run once to create initial context
- **After major changes:** Update after adding features, changing architecture
- **Before sharing:** Ensure context is current for other AI sessions
- **Periodically:** Keep the context fresh

## Execution

Invoke the context-creator agent:

```
Task(
    subagent_type="context-creator",
    description="Create/update agentic.md",
    prompt="Analyze this project and create or update the agentic.md file. Target: agentic"
)
```

## Related

- **/load-agentic** - Load agentic.md to understand a project
- **/create-readme** - Create human-readable README.md
- **/create-docs** - Create both agentic.md and README.md
- **CLAUDE.md** - Project-specific instructions (source for critical rules)
