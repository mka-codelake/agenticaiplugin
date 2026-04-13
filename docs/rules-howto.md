# Claude Code Rules - How To Guide

> **Status:** January 2025
> **Purpose:** Reference documentation for Claude Code Rules — what they are, how they work, and how they relate to plugins.

---

## What Are Claude Code Rules?

**Modular, path-specific project instructions** in `.claude/rules/*.md`. They extend `CLAUDE.md` with conditional, file-type-specific guidance.

**Key characteristic:** Rules are **path-specific** — they only apply when Claude is working with files that match the specified glob pattern.

---

## Three Memory Levels

Claude Code has three levels for rules:

| Level | Location | Who is affected? | Shared? |
|-------|----------|-----------------|---------|
| **Enterprise** | System paths (see below) | All users on machine | IT-managed |
| **Project** | `.claude/rules/*.md` | Team via git | Yes (committed) |
| **User** | `~/.claude/rules/*.md` | You only (all projects) | No (personal) |

### Enterprise Paths (by OS)

- **macOS:** `/Library/Application Support/ClaudeCode/CLAUDE.md`
- **Linux:** `/etc/claude-code/CLAUDE.md`
- **Windows:** `C:\Program Files\ClaudeCode\CLAUDE.md`

---

## Directory Structure

```
project/
├── .claude/
│   ├── CLAUDE.md              # General project instructions (always loaded)
│   ├── CLAUDE.local.md        # Personal instructions (gitignored)
│   └── rules/
│       ├── code-style.md      # Without paths: → applies to all files
│       ├── java.md            # With paths: → only for specific files
│       ├── security.md        # Security rules
│       └── frontend/          # Subdirectories supported
│           ├── react.md
│           └── styling.md
```

**Auto-Discovery:** All `.md` files in `.claude/rules/` are discovered automatically — no registration required.

---

## Syntax with YAML Frontmatter

### Basic Syntax

```markdown
---
paths: src/**/*.java
---

# Java Guidelines

- Constructor-based Dependency Injection
- Layered Architecture: Controller → Service → Repository
- No business logic in controllers
```

### Frontmatter Fields

| Field | Description |
|-------|-------------|
| `paths` | Glob pattern(s) specifying which files the rule applies to |

**When `paths` is absent:** The rule applies to all files (unconditional).

### Multiple Patterns

**Comma-separated:**
```markdown
---
paths: src/**/*.ts, tests/**/*.test.ts
---
```

**Brace expansion (more efficient):**
```markdown
---
paths: src/**/*.{ts,tsx}
---
```

**Complex:**
```markdown
---
paths: {src,lib}/**/*.ts, tests/**/*.test.ts
---
```

### Supported Glob Patterns

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files in all directories |
| `src/**/*` | All files under `src/` |
| `*.md` | Markdown files in the project root |
| `src/components/*.tsx` | React components in a specific directory |
| `src/**/*.{ts,tsx}` | Both `.ts` and `.tsx` files |

---

## Rules vs. CLAUDE.md

| Aspect | Rules (`.claude/rules/`) | CLAUDE.md |
|--------|--------------------------|-----------|
| **Structure** | Multiple focused files | One large file |
| **Scope** | Path-specific (conditional) | Applies to everything |
| **Use Case** | Language/topic-specific | General project guidance |
| **Example** | "Applies ONLY to TypeScript" | "General coding standards" |
| **Organisation** | Subdirectories possible | Flat (with headings) |
| **Discovery** | Automatic from directory | Must exist at specific paths |

### Typical Organisation

```
.claude/
├── CLAUDE.md                # General: architecture, workflows, setup
└── rules/
    ├── code-style.md        # Applies to all files
    ├── security.md          # Applies to all files
    ├── frontend/
    │   ├── react.md         # paths: src/**/*.tsx
    │   └── styling.md       # paths: src/styles/**/*.scss
    └── backend/
        ├── api.md           # paths: src/api/**/*.ts
        └── database.md      # paths: src/db/**/*.ts
```

---

## Hierarchy and Priority

**Load order (highest to lowest priority):**

1. Enterprise Policy (highest — cannot be overridden)
2. Command-line Arguments
3. Local Project Rules (`.claude/CLAUDE.local.md`)
4. Shared Project Rules (`.claude/rules/*.md`)
5. User-level Rules (`~/.claude/rules/*.md`)
6. User Memory (`~/.claude/CLAUDE.md`)

**Project rules override user rules.**

---

## Project Rules vs. User Rules

### Project Rules (`.claude/rules/*.md`)

- Stored in the project directory
- Checked into source control (git)
- Applies to all team members
- Project-specific guidance
- **Higher priority** than user rules

### User Rules (`~/.claude/rules/*.md`)

- Stored in the user's home directory
- Personal preferences for all projects
- NOT in source control
- Loaded before project rules in the hierarchy
- **Lower priority** than project rules

### Example Scenario

```
~/.claude/rules/
├── my-preferences.md     # Personal style preferences
└── workflows.md          # Personal workflows

project/.claude/rules/
├── code-style.md         # Team standard (overrides personal preferences)
├── testing.md            # Team testing conventions
└── security.md           # Company security standards
```

---

## Plugins and Rules

### Important: Plugins CANNOT Define Rules Directly

**Why?**
- Plugins live outside the project context
- Rules must reside in `.claude/rules/` of the **user's project**
- Plugins are installed in Claude Code's plugin directory

### What Plugins CAN Do

- Define **skills** (auto-loaded context via `SKILL.md`)
- Define **agents** (specialized sub-agents)
- Define **commands** (slash commands)

### What Plugins CANNOT Do

- Define `.claude/rules/*.md` files directly
- Override project structure in the user's repository

### Best Practice for Plugin-Provided Rules

Plugins should provide a **command** (like `/agenticaiplugin:init`) that:

1. Creates the `.claude/rules/` directory in the user's project
2. Populates it with template rule files
3. Allows the user to customize and commit to git

**This keeps rules portable and maintainable** (they live in the project, not the plugin).

---

## Capabilities and Limitations

### Capabilities

| Feature | Description |
|---------|-------------|
| Path-specific application | `paths: src/**/*.java` |
| Multiple rule files | Organise by topic and language |
| Subdirectories | Hierarchical organisation |
| Symlinks | Share common rules across projects |
| Circular symlink detection | Handled cleanly |
| Recursive discovery | All `.md` files in subdirectories found |
| Scoped loading | User/Project/Enterprise levels |
| Lazy loading | Rules only loaded when needed (path-specific) |
| Rich Markdown | Full Markdown syntax supported |

### Limitations

| Limitation | Description |
|------------|-------------|
| No dynamic generation | Rules are static files |
| No rule inheritance | No mechanism to extend or override |
| No rule versioning | No built-in version control |
| No rule validation | Syntax errors only detected on load |
| No rule tests | No mechanism for testing rule application |
| Path patterns only | Cannot condition on file content |
| No conditional loading within | `paths` is all-or-nothing |
| No priority/ordering control | Multiple matching rules load in discovery order |

---

## Practical Examples

### Example 1: Java/Spring Boot

```markdown
---
paths: src/**/*.java
---

# Java/Spring Boot Standards

## Architecture
- Layered: Controllers → Services → Repositories
- Use @RestController, @Service, @Repository
- Constructor-based Dependency Injection

## Testing
- @SpringBootTest for integration tests
- TestContainers for database tests
- Mock external services
```

### Example 2: TypeScript/React

```markdown
---
paths: src/**/*.{ts,tsx}
---

# TypeScript/React Guidelines

## Component Structure
- Functional components with hooks
- Type props with interfaces
- Export components as default

## Testing
- Write tests in `__tests__/`
- Use React Testing Library
- Achieve minimum 80% coverage
```

### Example 3: Security Rules (all files)

```markdown
---
# No paths field = applies to all files
---

# Security Standards

## API Keys and Credentials
- NEVER commit API keys — use environment variables
- Prefix with API_KEY, ACCESS_TOKEN
- Document in .env.example

## Database
- All queries with parameterised statements
- No raw SQL concatenation
- Validate all inputs
```

---

## Workflow: Adding Rules to a Project

### Step 1: Create the rules directory

```bash
mkdir -p .claude/rules
```

### Step 2: Create rule files

```bash
# Code Style Rules
cat > .claude/rules/code-style.md << 'EOF'
---
paths: src/**/*.{ts,tsx}
---

# TypeScript Code Style

- 2-space indentation
- Prefer `const` over `let`
- JSDoc comments for public functions
EOF

# Testing Rules
cat > .claude/rules/testing.md << 'EOF'
---
# No paths = applies to all files
---

# Testing Standards

- Write tests for business logic
- Minimum 80% coverage for critical paths
- AAA Pattern: Arrange, Act, Assert
EOF
```

### Step 3: Commit to git

```bash
git add .claude/rules/
git commit -m "docs: add Claude Code rules for project"
```

---

## Advanced Patterns

### Pattern 1: Organised by layer

```
rules/
├── frontend/
│   ├── react.md      # paths: src/components/**/*.tsx
│   ├── styling.md    # paths: src/styles/**/*.scss
│   └── hooks.md      # paths: src/hooks/**/*.ts
├── backend/
│   ├── api.md        # paths: src/api/**/*.ts
│   ├── database.md   # paths: src/db/**/*.ts
│   └── models.md     # paths: src/models/**/*.ts
└── shared/
    ├── testing.md    # No paths = all files
    └── git.md        # No paths = all files
```

### Pattern 2: Shared rules with symlinks

```bash
# Clone shared rules repo
git clone https://github.com/company/shared-claude-rules ~/shared-rules

# Link into project
ln -s ~/shared-rules .claude/rules/company-standards

# Commit the symlink
git add .claude/rules/company-standards
git commit -m "feat: add shared company standards"
```

### Pattern 3: User-level personal preferences

```
~/.claude/rules/
├── my-style.md       # Personal indentation, naming conventions
├── workflows.md      # Personal Git workflows
└── tooling.md        # Personal tool preferences
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **What** | Modular, path-specific project instructions |
| **Where** | `.claude/rules/*.md` (project), `~/.claude/rules/*.md` (user), system paths (enterprise) |
| **How** | Markdown files with optional YAML frontmatter with `paths` glob patterns |
| **Scope** | Project rules override user rules; user rules apply globally |
| **Auto-load** | All `.md` files in `.claude/rules/` auto-discovered |
| **Plugins** | Cannot define rules directly, but can provide init commands |
| **Relation to CLAUDE.md** | Rules are path-specific alternatives; CLAUDE.md is unconditional |
| **Syntax** | Markdown + YAML frontmatter with optional `paths: glob/pattern` |

---

## Sources

- [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory.md)
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings.md)
- [Claude Code - Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Using CLAUDE.MD files](https://claude.com/blog/using-claude-md-files)
- [NikiforovAll/claude-code-rules](https://github.com/NikiforovAll/claude-code-rules) - Practical examples
