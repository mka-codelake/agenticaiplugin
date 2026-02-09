# AgenticAI Plugin

A powerful Claude Code plugin that transforms your development workflow with intelligent agents, auto-activated skills, and convenient slash commands. Built for agile teams working across multiple programming languages, with specialized support for Java/Spring Boot development.

## Overview

The AgenticAI Plugin brings production-ready development patterns and automation directly into Claude Code. Whether you're managing epics and stories, writing tests, conducting code reviews, or generating documentation, this plugin provides the tools and knowledge to work faster and smarter.

**What makes it different?**

This plugin doesn't just provide commands - it enhances Claude's capabilities with specialized knowledge that activates automatically when you need it. Writing Java code? Best practices are immediately available. Creating tests? Testing philosophy kicks in. Planning a sprint? Agile workflow tools appear. Everything works together seamlessly.

The plugin architecture separates concerns intelligently: test engineers write integration tests without seeing implementation details (true TDD), and code reviewers combine project-specific guidelines with universal best practices.

**Who is it for?**

- Development teams practicing agile methodologies
- Java/Spring Boot developers who want intelligent code assistance
- Projects requiring strict separation between test specifications and implementation
- Teams establishing or enforcing coding standards
- Anyone wanting smarter Git commits, automated code reviews, and context-aware documentation

## Features

- **Intelligent Agile Workflow:** Epic/Story/Sprint management with templates, acceptance criteria generation, and story point estimation
- **Smart Code Reviews:** Multi-type reviews (code, tests, architecture) combining project guidelines with best-practice skills
- **Test-First Development:** Separate test-engineer agent writes integration tests from user requirements, not implementation
- **README Generation:** Creates and updates human-readable project documentation
- **Technology Advisors:** Language-specific recommendations for JVM, JavaScript, and Python ecosystems
- **Git Intelligence:** Analyzes changes and creates meaningful atomic commits following project conventions
- **Architecture Decision Records:** ADR creation and management with standard templates
- **Progressive Disclosure:** Skills load essential information by default, detailed references on demand
- **Modular Rules System:** Flexible plugin rules that can be selectively installed and updated

## Installation

### Prerequisites

- Claude Code installed and configured
- Access to a local marketplace directory

### Steps

1. **Clone or download this plugin** to a local directory:
   ```bash
   git clone <repository-url> /path/to/agenticaiplugin
   ```

2. **Add your marketplace** (if not already added):
   ```bash
   # Use the path where your marketplace is located
   /plugin marketplace add /path/to/your/marketplace

   # Examples for different platforms:
   # Windows: /plugin marketplace add C:\dev\marketplace
   # WSL:     /plugin marketplace add /mnt/c/dev\marketplace
   # Linux:   /plugin marketplace add ~/dev/marketplace
   # macOS:   /plugin marketplace add ~/dev/marketplace
   ```

3. **Install the plugin:**
   ```bash
   /plugin install agenticaiplugin@local-dev-marketplace
   ```

4. **After making changes** (for plugin developers):
   ```bash
   /plugin marketplace update local-dev-marketplace
   ```

## Usage

### Quick Start

Initialize a new project with recommended directory structure:

```bash
/agenticaiplugin:init
```

This command creates:
- `.claude/rules/agenticaiplugin-*.md` - Plugin rules for Claude Code
- `claudedocs/guidelines/` for project-specific code review rules
- `claudedocs/testspecs/` for test scenarios

**Plugin rules created:**
| Rule | Purpose |
|------|---------|
| `agenticaiplugin-core.md` | Never make assumptions - always ask |
| `agenticaiplugin-code-review.md` | Automatic code review after tasks |
| `agenticaiplugin-protected-dirs.md` | Protected directories and files |
| `agenticaiplugin-git-commit.md` | Enforce git-smart-commit skill for commits |

**To update rules after plugin updates:**
```bash
/agenticaiplugin:update-plugin
```

### Common Workflows

#### Agile Development

```
User: "Create an epic for user authentication"
Claude: Creates structured epic with goal, scope, and out-of-scope

User: "Slice this epic into stories"
Claude: Generates user stories with acceptance criteria and story points

User: "Plan a sprint with these stories"
Claude: Creates sprint plan with capacity tracking and dependencies
```

Files are created in `claudedocs/epics/`, `stories/`, and `sprints/` following naming conventions.

#### Test-First Development

```
User: "Write integration tests for STORY-042"
Claude: test-engineer agent creates tests based on story's acceptance criteria

User: "Implement STORY-042"
Claude: Developer implements features until integration tests pass

User: "Review my implementation"
Claude: multi-specialist code review checks against project guidelines
```

The test-engineer works in isolated context - it sees user requirements but not implementation details, ensuring true black-box testing.

#### Smart Git Commits

```
User: "Create commits for my changes"

Claude:
  - Analyzes git status and diff
  - Reviews recent commit history for patterns
  - Groups related changes logically
  - Creates atomic commits with meaningful messages
  - Follows project conventions (Conventional Commits, etc.)
```

#### Documentation

```bash
# Create/update human-readable README
/agenticaiplugin:create-readme

# Transfer context to structured document
/agenticaiplugin:create-cr

# View/edit plugin configuration
/agenticaiplugin:config
```

The context creator analyzes your project structure, key files, recent commits, and patterns to generate README documentation that helps developers get productive immediately.

### Manual Commands

While most features activate automatically, you can also invoke them manually:

```bash
# Code review - three modes:
/agenticaiplugin:code-review                              # Git diff (default) - review all changed files
/agenticaiplugin:code-review src/main/java/UserService.java  # Single file review
/agenticaiplugin:code-review --complete                   # Complete project review

# Create tests for a specific story or epic
/agenticaiplugin:test STORY-042
/agenticaiplugin:test EPIC-005

# Smart Git commits
/agenticaiplugin:gitme

# Dependency audit report
/agenticaiplugin:renovate

# Plugin help
/agenticaiplugin:help

# Promote permissions for commands
/agenticaiplugin:promote-perms
```

## Configuration

### Project Guidelines

Create `.md` files in `claudedocs/guidelines/` to define project-specific rules:

- `exception-handling.md` - Custom exception handling rules
- `logging-standards.md` - Project logging requirements
- `code-style.md` - Code style beyond language standards
- `architecture-patterns.md` - Architecture rules and patterns

**Important:** Project guidelines ALWAYS override plugin skill guidelines when conflicts occur.

**Example guideline** (`claudedocs/guidelines/exception-handling.md`):

```markdown
# Exception Handling Guidelines

## Rule: ErrorCode Required

All custom exceptions MUST have an ErrorCode as first parameter.

✅ Correct:
throw new UserNotFoundException(ErrorCode.USER_404, userId);

❌ Wrong:
throw new UserNotFoundException("User not found");
```

### Test Specifications

Create `.md` files in `claudedocs/testspecs/` for integration test scenarios:

**Example** (`claudedocs/testspecs/kafka-scenarios.md`):

```markdown
# Kafka Message Processing Test Scenarios

## Scenario 1: CREATE Message

**Input:**
- Topic: user-events
- Message: {"userId": 123, "action": "CREATE", "username": "john"}

**Expected:**
- User with ID 123 exists in database
- User status is ACTIVE
- Username is "john"
```

The test-engineer agent reads these specifications and creates TestContainer-based integration tests.

## Project Structure

```
agenticaiplugin/
├── .claude-plugin/
│   └── plugin.json           # Plugin metadata
├── agents/                   # Specialized sub-agents
│   ├── test-engineer.md      # Integration test creation
│   ├── project-initializer.md # Project setup
│   └── context-creator.md    # README generation
├── rules-templates/          # Plugin rule templates
│   ├── agenticaiplugin-core.md
│   ├── agenticaiplugin-code-review.md
│   ├── agenticaiplugin-protected-dirs.md
│   └── agenticaiplugin-git-commit.md
├── skills/                   # All skills (knowledge + commands)
│   ├── # Auto-activated knowledge skills:
│   ├── agile-workflow/       # Epic/Story/Sprint management
│   ├── git-smart-commit/     # Intelligent commits
│   ├── code-review/          # Multi-specialist code review (orchestrator + 10 specialists)
│   ├── development-principles/ # YAGNI, KISS, traceability
│   ├── testing-philosophy/   # Testing approach
│   ├── java-best-practices/  # Java patterns
│   ├── spring-boot-best-practices/
│   ├── integration-testing/  # TestContainers, Awaitility
│   ├── maven-best-practices/
│   ├── dependency-analysis/  # Story dependencies
│   ├── architecture-decisions/ # ADR management
│   ├── technology-advisor-jvm/
│   ├── technology-advisor-javascript/
│   ├── technology-advisor-python/
│   ├── # Slash command skills (user-invocable):
│   ├── init/                 # Project initialization
│   ├── update-plugin/        # Update plugin rules
│   ├── gitme/                # Smart Git commits
│   ├── code-review/          # Manual code review
│   ├── test/                 # Test creation
│   ├── create-readme/        # README generation
│   ├── create-cr/            # Context to document transfer
│   ├── config/               # Plugin configuration
│   ├── help/                 # Plugin help
│   ├── promote-perms/        # Permissions promotion
│   └── renovate/             # Dependency audit
├── docs/
│   ├── plugin-howto.md       # Plugin development reference
│   └── rules-howto.md        # Claude Code Rules documentation
├── CLAUDE.md                 # Development instructions
└── README.md                 # This file
```

## Advanced Features

### Multi-Specialist Code Review

The code review system uses a team-based architecture with 10 focused specialist agents orchestrated by a "Chief Architect" lead:

**Phase 1 (Sequential):** Dependencies & Versions specialist runs first, providing version context for Phase 2.

**Phase 2 (Parallel):** All applicable specialists run concurrently:
| # | Specialist | Focus |
|---|-----------|-------|
| 1 | Dependencies & Versions | Outdated deps, CVEs, framework modernization |
| 2 | Security & Data Safety | Credentials, injection, XSS, data loss |
| 3 | Architecture & Layers | Pattern violations, port/adapter, circular deps |
| 4 | Design Patterns (GoF) | Pattern trigger matrix, consistency |
| 5 | SOLID & Code Smells | OCP/LSP/ISP/DIP, God Class, Feature Envy |
| 6 | Code Quality & Correctness | YAGNI, SRP, logic errors, API documentation |
| 7 | Dead Code & Duplication | DRY violations, unused code, magic numbers |
| 8 | Cross-Cutting Concerns | Error handling, logging, transactions, caching |
| 9 | Test Quality | AAA structure, naming, placement, coverage |
| 10 | Test Completeness & Infra | Integration tests, E2E coverage, architecture tests |

**Three review modes:**
| Mode | Command | Use Case |
|------|---------|----------|
| Git Diff (Default) | `/agenticaiplugin:code-review` | PR/branch reviews - reviews all changed files |
| Single File | `/agenticaiplugin:code-review <file>` | Targeted review of specific file |
| Complete Project | `/agenticaiplugin:code-review --complete` | Full codebase audit |

**Key features:**
- Specialists research current standards (WebSearch/Context7) before reviewing
- Each specialist reads only its focused rules (~100-200 lines vs ~3,200 in old approach)
- Findings are deduplicated, sorted by severity, and consolidated into a single report
- Specialists only identify issues — they never fix code or modify files
- Project guidelines (`claudedocs/guidelines/*.md`) always override skill rules

### Test Engineer Agent

Works in **isolated context** - deliberately doesn't see implementation details. This ensures integration tests validate user requirements, not implementation choices.

**Workflow:**
1. Test-engineer reads story acceptance criteria and test specifications
2. Creates integration tests using TestContainers (real infrastructure)
3. Developer implements features to make tests pass
4. Tests remain immutable - implementation must adapt to pass them

**Technology stack:**
- TestContainers (Kafka, PostgreSQL, Redis, etc.)
- @SpringBootTest (full application context)
- Awaitility (async testing without Thread.sleep)
- AssertJ (fluent assertions)

### Agile Workflow Skill

Complete epic/story/sprint management with:

- **Epic Creation:** Goal, scope, out-of-scope definitions
- **Story Slicing:** INVEST criteria validation
- **Acceptance Criteria:** Template-based generation
- **Story Points:** Fibonacci sequence (1, 2, 3, 5, 8, 13)
- **Sprint Planning:** Capacity management and dependency tracking
- **Jinja2 Templates:** Consistent document generation

**File naming convention:**
- `EPIC-001-user-authentication.md`
- `STORY-042-login-validation.md`
- `SPRINT-01.md`

### Technology Advisors

Language-specific library and framework recommendations:

- **JVM:** Spring ecosystem, testing tools, utilities
- **JavaScript:** React/Vue/Node.js ecosystems
- **Python:** Django/Flask, data science, testing

Advisors consider project context, existing dependencies, and best practices when suggesting technologies.

### Architecture Decision Records

Create and manage ADRs with standard templates:

- Context and problem statement
- Decision drivers
- Options considered
- Decision outcome
- Consequences (positive and negative)

ADRs stored in `claudedocs/architecture/` following naming convention `ADR-001-description.md`.

### Dependency Audit

Generate comprehensive dependency audit reports:

```bash
/agenticaiplugin:renovate
```

Analyzes project dependencies and creates detailed audit reports including:
- Security vulnerabilities
- Outdated versions
- License compliance
- Dependency health metrics

## Best Practices

### File Organization

```
your-project/
├── .claude/
│   └── rules/
│       ├── agenticaiplugin-*.md  # Plugin rules (auto-generated)
│       └── my-custom-rules.md    # Your own rules (optional)
├── claudedocs/
│   ├── guidelines/           # Code review rules
│   ├── testspecs/           # Test scenarios
│   ├── epics/               # Epic documents
│   ├── stories/             # User stories
│   ├── sprints/             # Sprint plans
│   └── architecture/        # ADRs
├── src/
│   ├── main/java/
│   └── test/java/
│       ├── unit/            # Developer-owned
│       └── integration/     # Test-engineer-owned
└── CLAUDE.md                # Project-specific instructions (optional)
```

### Story Traceability

Always reference stories in code:

```java
// STORY-012 AC-1: Email validation per RFC 5322
if (!validateEmail(email)) {
    throw new InvalidEmailException(ErrorCode.INVALID_EMAIL, email);
}

// STORY-012 AC-2: Duplicate email check
if (userRepository.existsByEmail(email)) {
    throw new DuplicateEmailException(ErrorCode.EMAIL_EXISTS, email);
}
// AC-2 ✓
```

### Test Separation

**Integration tests (immutable):**
- Written by test-engineer agent
- Based on user requirements
- Never modified by developer
- Located in `src/test/java/integration/`

**Unit tests (mutable):**
- Written by developer
- Implementation-specific
- Can be refactored freely
- Located in `src/test/java/unit/`

### Testing Philosophy

```
Test YOUR Code, Not THE Code

✅ Test business logic you wrote
✅ Test calculations and validations
✅ Test complex algorithms
✅ Test custom validators

❌ Don't test Spring annotations
❌ Don't test JPA mappings
❌ Don't test Lombok-generated code
❌ Don't test framework behavior
```

## Development

### Plugin Development

For developers working on the plugin itself:

1. **Check internal documentation first:** `docs/plugin-howto.md`
2. **Follow CLAUDE.md instructions**
3. **Use portable paths** - no absolute paths in plugin files
4. **Test changes** by updating marketplace

### Adding New Skills

1. Create directory: `skills/skill-name/`
2. Add `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: skill-identifier
   description: What it does and WHEN to auto-activate
   allowed-tools: [Bash, Read, Grep]
   ---

   # Skill instructions
   ```
3. Optional: Add `reference.md` for detailed documentation
4. Update marketplace: `/plugin marketplace update local-dev-marketplace`

### Adding New Agents

1. Create file: `agents/agent-name.md`
2. Add frontmatter:
   ```yaml
   ---
   name: agent-identifier
   description: Purpose and proactive activation conditions
   tools: Read, Write, Edit, Bash
   model: sonnet
   color: cyan
   ---

   # Agent instructions
   ```
3. Update marketplace

### Adding New Commands (as Skills)

1. Create directory: `skills/command-name/`
2. Add `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: command-name
   description: What this command does
   disable-model-invocation: true
   ---

   # Command instructions
   ```
3. Update marketplace: `/plugin marketplace update local-dev-marketplace`
4. Use: `/agenticaiplugin:command-name`

## Contributing

Contributions welcome! When contributing:

1. Follow existing file naming conventions
2. Use portable paths (never absolute paths specific to your environment)
3. Check `docs/plugin-howto.md` for plugin development patterns
4. Test in multiple projects before submitting
5. Update documentation for new features
6. Add examples to skill reference.md files where appropriate

## License

MIT

---

**Note:** This plugin provides mechanisms and patterns - individual projects customize it with their own guidelines, test specifications, and workflows in the `claudedocs/` directory.
