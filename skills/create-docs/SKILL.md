---
description: Create both agentic.md and README.md in a single analysis pass
disable-model-invocation: true
---

# Create Docs Command

Creates or updates both `agentic.md` and `README.md` in one pass.

## Usage

```
/agenticaiplugin:create-docs
```

No parameters required.

## What It Does

The context-creator agent will:

1. **Analyze Project ONCE:**
   - Scan directory structure
   - Identify technology stack
   - Read key files
   - Extract rules, features, and patterns

2. **Write Both Files:**
   - `agentic.md` - AI-optimized context (token-efficient, tables)
   - `README.md` - Human-readable overview (prose, examples)

## Example Output

```
agentic.md CREATED
README.md CREATED

Analyzed:
- 12 directories
- 8 key files
- 5 critical rules extracted
- 6 features identified

Key findings:
- Spring Boot 3.2 / Java 21
- Maven project
- REST API with Kafka integration
```

## When to Use

- **Initial project setup:** Create all documentation at once
- **After major changes:** Ensure both audiences have current info
- **Consistency:** Keep agentic.md and README.md in sync

## Execution

Invoke the context-creator agent:

```
Task(
    subagent_type="context-creator",
    description="Create/update agentic.md and README.md",
    prompt="Analyze this project and create or update both documentation files. Target: both"
)
```

## Related

- **/agenticaiplugin:inspect** - Load existing agentic.md or create it; use `--update` to incrementally update
- **/agenticaiplugin:create-readme** - Create only README.md (human-readable)
