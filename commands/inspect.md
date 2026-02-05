---
description: Analyze project structure, tech stack, and domain — save context to agentic.md
---

# Inspect Command

Analyzes a project comprehensively to understand its structure, technology, and domain - then saves the context for future sessions.

## Usage

```
/agenticaiplugin:inspect
```

No parameters required.

## What It Does

1. **Check for existing agentic.md:**
   - Look for `agentic.md` in the project root

2. **If agentic.md EXISTS:**
   - Read and internalize the existing context
   - Output a summary in chat
   - **Important:** Inform user that this comes from an existing `agentic.md` file (they may have forgotten it exists)
   - Signal readiness for questions

3. **If agentic.md does NOT exist:**
   - Perform comprehensive project analysis (technical AND domain)
   - Write findings to `agentic.md`
   - Output a summary in chat
   - Signal readiness for questions

## Execution Steps

### Step 1: Check for Existing Context

```bash
ls agentic.md 2>/dev/null
```

### Step 2A: If agentic.md EXISTS

1. Read the file using the Read tool
2. Parse and internalize:
   - Project purpose and domain
   - Technology stack
   - Architecture and structure
   - Critical rules
   - Key files and references
3. Output summary with notice:

```
ℹ️ Found existing agentic.md - loading saved context.

Project: [Project Name]

Summary:
- [Purpose/Domain]
- [Tech stack]
- [Architecture]
- [X] critical rules

This context was previously saved. If it's outdated, run:
  /agenticaiplugin:create-agentic

Ready for your questions about this project.
```

**STOP here if agentic.md existed.**

### Step 2B: If agentic.md does NOT exist

Invoke the context-creator agent for comprehensive analysis:

```
Task(
    subagent_type="context-creator",
    description="Comprehensive project inspection",
    prompt="Perform a THOROUGH and COMPREHENSIVE analysis of this project.

    Analyze BOTH:
    - TECHNICAL: Code structure, architecture, technology stack, dependencies, patterns, conventions
    - DOMAIN: Business purpose, features, use cases, domain concepts

    Create a detailed agentic.md that captures the full project context.

    After writing agentic.md, output a brief summary for the chat.
    Target: agentic"
)
```

### Step 3: Final Output (after agent completes)

After the context-creator agent finishes:

```
Project analyzed: [Project Name]

Summary:
- [Purpose/Domain in 1-2 sentences]
- [Tech stack]
- [Key components/features]
- [Architecture pattern if detected]

Full context saved to agentic.md.

Ready for your questions about this project.
```

## Primary Use Case

**Exploring unfamiliar projects** - especially third-party code from GitHub or other sources that don't have an `agentic.md` yet.

This command:
- Saves you from re-analyzing the project every session
- Creates persistent context in `agentic.md`
- Gives you a quick overview immediately

## Analysis Depth

This command always performs a **thorough, comprehensive analysis**:
- Full directory structure scan
- All configuration files examined
- Source code patterns identified
- Domain concepts extracted
- Architecture patterns detected
- No quick/shallow mode

## Example

### New Project (no agentic.md)

```
User: /agenticaiplugin:inspect

AI: [Invokes context-creator agent for comprehensive analysis]

Project analyzed: awesome-api

Summary:
- REST API for managing customer orders with real-time notifications
- Node.js / Express / TypeScript / PostgreSQL
- Key features: Order CRUD, WebSocket notifications, PDF invoice generation
- Layered architecture (routes → services → repositories)

Full context saved to agentic.md.

Ready for your questions about this project.
```

### Existing Project (agentic.md found)

```
User: /agenticaiplugin:inspect

AI: ℹ️ Found existing agentic.md - loading saved context.

Project: awesome-api

Summary:
- REST API for managing customer orders
- Node.js / Express / TypeScript / PostgreSQL
- 4 critical rules
- Focus: Order management with real-time updates

This context was previously saved. If it's outdated, run:
  /agenticaiplugin:create-agentic

Ready for your questions about this project.
```

## When to Use

- **Opening a new/unfamiliar project:** First thing to understand what you're working with
- **Third-party code:** GitHub repos, vendor code, inherited projects
- **Starting a new session:** Quick way to get up to speed (checks for existing context first)

## Related

- **/agenticaiplugin:load-agentic** - Only loads existing agentic.md (fails if missing)
- **/agenticaiplugin:create-agentic** - Always creates/updates agentic.md (no existence check)
- **/agenticaiplugin:create-docs** - Creates both agentic.md and README.md
