# AgenticAI Plugin - Context for AI Sessions

> **Purpose:** Read only this file to immediately work productively with this project.

## What is this project?

A **Claude Code Plugin** that enhances development workflows through agents, skills, and commands. Provides intelligent automation for agile workflows, code reviews, testing, and documentation generation across multiple languages with focus on Java/Spring Boot.

**Version:** 0.1.0 | **Tech Stack:** Claude Code Plugin System, Jinja2 Templates, Markdown

---

## Project Structure

```
agenticaiplugin/
├── .claude-plugin/plugin.json    # Plugin metadata
├── agents/                       # 4 Sub-agents (isolated context)
│   ├── code-reviewer.md          # Automatic code reviews
│   ├── test-engineer.md          # Integration/E2E test creation
│   ├── project-initializer.md    # Project setup automation
│   └── context-creator.md        # AI session context management
├── commands/                     # 14 Slash commands
│   ├── init.md                   # /init - Project initialization
│   ├── update-rules.md           # /update-rules - Update plugin rules
│   ├── gitme.md                  # /gitme - Smart Git commits
│   ├── code-review.md            # /code-review - Manual review
│   ├── test.md                   # /test - Test creation
│   ├── create-agentic.md         # /create-agentic - Context creation
│   ├── create-docs.md            # /create-docs - Documentation generation
│   ├── create-readme.md          # /create-readme - README generation
│   ├── load-agentic.md           # /load-agentic - Context loading
│   ├── create-cr.md              # /create-cr - Context to document
│   ├── config.md                 # /config - Plugin configuration
│   ├── help.md                   # /help - Plugin help
│   ├── promote-perms.md          # /promote-perms - Permissions promotion
│   └── renovate.md               # /renovate - Dependency audit
├── rules-templates/              # Plugin rule templates (copied to projects)
│   ├── agenticaiplugin-core.md           # Never make assumptions
│   ├── agenticaiplugin-code-review.md    # Automatic code review
│   └── agenticaiplugin-protected-dirs.md # Protected directories
├── skills/                       # 14 Auto-activated knowledge bases
│   ├── agile-workflow/           # Epic/Story/Sprint management
│   ├── git-smart-commit/         # Intelligent commits
│   ├── code-reviewer/            # Review criteria
│   ├── development-principles/   # YAGNI, KISS, Story-traceability
│   ├── testing-philosophy/       # "Test YOUR Code, Not THE Code"
│   ├── java-best-practices/      # Java 17+/21+/25+
│   ├── spring-boot-best-practices/
│   ├── integration-testing/      # TestContainers, Awaitility
│   ├── maven-best-practices/
│   ├── dependency-analysis/      # Story-dependencies with ULTRATHINK
│   ├── architecture-decisions/   # ADR management
│   ├── technology-advisor-jvm/   # Library recommendations JVM
│   ├── technology-advisor-javascript/
│   └── technology-advisor-python/
├── docs/plugin-howto.md          # PRIMARY DEV REFERENCE
├── CLAUDE.md                     # Plugin development instructions
└── README.md                     # Installation and feature guide
```

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Platform | Claude Code Plugin System |
| Language | Markdown (agents, skills, commands) |
| Templates | Jinja2 (.j2 files) |
| Build | N/A (no build process) |
| Testing | Manual testing in Claude Code |
| Primary Focus | Java, Spring Boot, Maven |
| Multi-Language | JavaScript, Python support via technology-advisor skills |

---

## Critical Rules

### 1. No Absolute Paths in Plugin Files

**The plugin must be portable across all user environments.**

- NEVER use: `/mnt/d/ki/repos/agenticaiplugin/`, `/dein-projekt/`, developer-specific paths
- ALWAYS use: Generic placeholders like `/path/to/your/marketplace`, `<your-project-root>`
- Relative paths within user's project: `claudedocs/guidelines/`

### 2. Documentation Priority

**ALWAYS check `docs/plugin-howto.md` FIRST** before using external sources for plugin development questions.

### 3. Auto-Discovery Pattern

Claude Code automatically discovers:
- All `.md` files in `agents/` as Agents
- All `SKILL.md` files in `skills/*/` as Skills
- All `.md` files in `commands/` as Commands

**No registration needed in plugin.json.**

### 4. Progressive Disclosure

- **SKILL.md**: Concise, essential rules only
- **reference.md**: Details, examples, edge cases (loaded on demand)
- Saves tokens by keeping auto-loaded context minimal

### 5. Testing Philosophy

```
Test YOUR Code, Not THE Code

✅ Business logic (calculations, validations)
❌ Framework code (Spring annotations, JPA mappings)
❌ Generated code (Lombok, MapStruct)
```

### 6. Project Guidelines Override Skills

User's `claudedocs/guidelines/*.md` files ALWAYS override plugin skill guidelines.

---

## Key Files Reference

| Topic | File |
|-------|------|
| Plugin development reference | docs/plugin-howto.md |
| Development instructions | CLAUDE.md |
| Installation guide | README.md |
| Agile workflow templates | skills/agile-workflow/templates/ |
| Code review criteria | skills/code-reviewer/SKILL.md |
| Spring Boot patterns | skills/spring-boot-best-practices/SKILL.md |
| Java patterns | skills/java-best-practices/SKILL.md |
| Integration testing | skills/integration-testing/SKILL.md |
| Context management | agents/context-creator.md |

---

## Agents Overview

| Agent | Purpose | Model | Key Tools |
|-------|---------|-------|-----------|
| **code-reviewer** | Multi-type code reviews (code/test/architecture) | Sonnet | Read, Glob, Grep, Bash |
| **test-engineer** | Integration/System/E2E test creation (isolated context) | Sonnet | Read, Write, Edit, Grep, Bash |
| **project-initializer** | Interactive project setup with claudedocs/ | Sonnet | Read, Write, Edit, Bash, AskUserQuestion |
| **context-creator** | Creates/updates agentic.md and README.md | Sonnet | Read, Write, Edit, Glob, Grep, Bash |

**Test-Engineer Isolation:** Deliberately works without implementation details - tests user requirements, not implementation.

**Context-Creator Modes:** Supports creating/updating both agentic.md (AI-optimized) and README.md (human-readable).

**Code-Reviewer Features:**
- Three modes: Git Diff (default), Single File, Complete Project (`--complete`)
- Architecture pattern recognition (Layered, Hexagonal, Clean, etc.)
- Reports when no clear architecture pattern detected
- Active code duplication detection (DRY violations → WARNING/CRITICAL)
- Unused & dead code detection (unreferenced methods, classes, fields)
- Multi-persona ensemble reviews (security, performance, maintainability)

---

## Skills Auto-Activation Triggers

| Skill | Activation Keywords |
|-------|---------------------|
| agile-workflow | epic, story, sprint, backlog, planning |
| git-smart-commit | commit, git commit, stage and commit |
| development-principles | Code writing (all languages) |
| testing-philosophy | tests, test coverage |
| java-best-practices | Java code |
| spring-boot-best-practices | Spring Boot, @RestController, @Service |
| integration-testing | TestContainers, @SpringBootTest |
| technology-advisor-* | Adding dependencies |
| maven-best-practices | Maven, pom.xml |
| architecture-decisions | ADR, architecture decision |

---

## Commands Quick Reference

```bash
/agenticaiplugin:init                      # Initialize project with rules + claudedocs/
/agenticaiplugin:update-rules              # Update plugin rules to latest version
/agenticaiplugin:gitme                     # Create smart Git commits
/agenticaiplugin:code-review               # Review changed files (git diff) - DEFAULT
/agenticaiplugin:code-review <file>        # Review specific file
/agenticaiplugin:code-review --complete    # Review entire project
/agenticaiplugin:test STORY-042            # Create tests for story
/agenticaiplugin:create-agentic            # Create/update agentic.md
/agenticaiplugin:create-docs               # Create/update both agentic.md and README.md
/agenticaiplugin:create-readme             # Create/update README.md
/agenticaiplugin:load-agentic              # Load agentic.md into context
/agenticaiplugin:create-cr                 # Transfer context to structured document
/agenticaiplugin:config                    # View/edit plugin configuration
/agenticaiplugin:help                      # Show plugin help
/agenticaiplugin:promote-perms             # Promote permissions for commands
/agenticaiplugin:renovate                  # Dependency audit report
```

---

## File Naming Conventions

```
EPIC-001-description.md     # Epics (lowercase-with-dashes)
STORY-001-description.md    # Stories
SPRINT-01.md                # Sprints
ADR-001-description.md      # Architecture Decision Records
```

**Story Traceability in Code:**
```java
// STORY-012 AC: Email validation per RFC 5322
if (!validateEmail(email)) {
    throw new InvalidEmailException();
}
```

---

## Test Structure Convention

```
src/test/java/
├── unit/              # Developer-owned (mutable)
└── integration/       # Test-Engineer-owned (immutable)
    ├── api/
    ├── messaging/
    ├── system/
    └── e2e/
```

**Critical:** Developer-agent NEVER modifies integration/system/e2e tests - only test-engineer can change them.

---

## Development Workflow

1. **Edit files** in plugin directory
2. **Update marketplace:**
   ```bash
   /plugin marketplace update local-dev-marketplace
   ```
3. **Test** in a project using the plugin

Changes available immediately after marketplace update.

---

## Current Development

**Recent commits:**
- `284a323` feat(code-review): add unused & dead code detection
- `0b3697f` docs: sync documentation with latest plugin features
- `9d2f9fb` feat(rules): migrate from CLAUDE.md template to modular rules
- `a05f7ef` feat(init): add --only-claudemd parameter to skip claudedocs
- `d95d1f6` docs: update documentation with code-review enhancements

**Current focus:** Enhanced code review capabilities (unused/dead code detection), modular rules system, comprehensive documentation

---

## Legacy Framework Reference

**Location:** `C:\Dev\repos\agenticai`

Previous version of this framework. Consult only when explicitly relevant for migration or historical context.
