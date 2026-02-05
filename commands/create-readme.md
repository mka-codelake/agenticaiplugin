---
description: Create or update README.md — human-readable project documentation
---

# Create README Command

Creates or updates the `README.md` file - a human-readable project overview.

## Usage

```
/agenticaiplugin:create-readme
```

No parameters required.

## What It Does

The context-creator agent will:

1. **Detect Mode:**
   - If `README.md` doesn't exist → CREATE mode (full analysis)
   - If `README.md` exists → UPDATE mode (preserve manual sections)

2. **Analyze Project:**
   - Scan directory structure
   - Identify technology stack (pom.xml, package.json, etc.)
   - Read key files (CLAUDE.md, agentic.md, configs)
   - Extract features and usage patterns
   - Check recent git activity

3. **Write README.md:**
   - Human-readable format with full explanations
   - Includes: Overview, Features, Installation, Usage, Contributing, License
   - Step-by-step instructions
   - Code examples with context

## Example Output

```
README.md CREATED

Analyzed:
- 12 directories
- 8 key files
- 6 features identified

Key findings:
- Spring Boot 3.2 / Java 21
- Maven project
- REST API application
```

## When to Use

- **New project:** Create initial documentation for developers
- **After major changes:** Update installation or usage instructions
- **Before publishing:** Ensure README is complete and accurate
- **Onboarding:** Make project accessible to new contributors

## Execution

Invoke the context-creator agent:

```
Task(
    subagent_type="context-creator",
    description="Create/update README.md",
    prompt="Analyze this project and create or update the README.md file. Target: readme"
)
```

## Related

- **/agenticaiplugin:create-agentic** - Create AI-optimized context (agentic.md)
- **/agenticaiplugin:create-docs** - Create both agentic.md and README.md
- **CLAUDE.md** - Project-specific instructions
