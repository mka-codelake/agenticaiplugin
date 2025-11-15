# Claude Code Plugin Development Reference

Token-optimized reference for AI agents developing Claude Code plugins.

## Plugin Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # REQUIRED: Plugin metadata
├── agents/                   # OPTIONAL: Sub-agents
│   └── agent-name.md
├── commands/                 # OPTIONAL: Slash commands
│   └── command-name.md
├── skills/                   # OPTIONAL: Auto-loaded context
│   └── skill-name/
│       ├── SKILL.md         # REQUIRED if skill exists
│       ├── reference.md     # OPTIONAL: Progressive disclosure
│       └── templates/       # OPTIONAL: Jinja2 templates
└── README.md

```

## Plugin Metadata (.claude-plugin/plugin.json)

**Required fields:**
```json
{
  "name": "plugin-identifier",
  "description": "Plugin description",
  "version": "0.1.0",
  "author": {
    "name": "Author Name"
  }
}
```

**No registration needed** - Claude Code auto-discovers all components.

## Skills

### Purpose
Auto-loaded knowledge/context that enhances Claude's capabilities. Think: "Training manuals".

### Structure
```
skills/skill-name/
├── SKILL.md           # Main skill definition
├── reference.md       # OPTIONAL: Detailed examples (progressive disclosure)
└── templates/         # OPTIONAL: Jinja2 templates (.j2 files)
```

### SKILL.md Format
```markdown
---
name: skill-identifier
description: What it does and WHEN to auto-activate. Include trigger keywords.
allowed-tools:       # OPTIONAL: Restrict tool access
  - Read
  - Bash(git:*)
---

# Skill Content

Instructions, guidelines, best practices.

**This skill activates automatically when user mentions: keyword1, keyword2, etc.**
```

### Frontmatter Fields

| Field | Required | Notes |
|-------|----------|-------|
| `name` | YES | Lowercase, hyphens only |
| `description` | YES | Include auto-activation conditions |
| `allowed-tools` | NO | Omit to allow all tools |

### Auto-Activation Patterns

**Keyword-based (most common):**
```markdown
**This skill activates automatically when user mentions: java, .java files, Spring Boot.**
```

**Proactive (explicit triggers):**
```markdown
Use this skill PROACTIVELY when:
- ✅ User says "commit" or "commit changes"
- ✅ User mentions creating commits
```

### Progressive Disclosure (reference.md)

- Keep SKILL.md concise (main rules only)
- Move details/examples to reference.md
- Reference it: "See reference.md for examples"
- Reduces token usage, loads on demand

### Templates (Jinja2)

Store in `skills/skill-name/templates/*.j2`:

```jinja2
# {{ title }}

**Status:** {{ status }}

## Details
{% for item in items %}
- {{ item }}
{% endfor %}
```

Render via Task tool or similar.

## Agents (Sub-Agents)

### Purpose
Specialized AI assistants for discrete workflows with isolated context. Think: "Specialized workers".

### Structure
Single markdown file per agent in `agents/` directory:
```
agents/
├── code-reviewer.md
├── dependency-analyzer.md
└── sprint-planner.md
```

### Agent File Format
```markdown
---
name: agent-identifier
description: What this agent does and when to use it. Use PROACTIVELY when [condition]. MUST BE USED when [scenario].
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
color: cyan
---

# Agent Name

You are a [role] specialized in [domain].

## Purpose
Clear description.

## Instructions
1. Step-by-step process
2. What to check
3. How to report

## Best Practices
- Guidelines
- Quality standards
```

### Frontmatter Fields

| Field | Required | Format | Default |
|-------|----------|--------|---------|
| `name` | YES | Lowercase, hyphens | - |
| `description` | YES | Max 1024 chars, include triggers | - |
| `tools` | NO | Comma-separated | Inherit all |
| `model` | NO | `sonnet`, `opus`, `haiku` | `sonnet` |
| `color` | NO | `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan` | - |

### Skills vs Agents

| Aspect | Skills | Agents |
|--------|--------|--------|
| Context | Shared main | Isolated per agent |
| Invocation | Model-invoked only | Model OR user-invoked |
| Structure | Directory + SKILL.md | Single .md file |
| Purpose | Knowledge/guidelines | Workflow execution |
| Use when | "Remember X automatically" | "Automate Y workflow" |

### Invoking Agents

**Programmatic (from code/skills):**
```python
Task(
    subagent_type="agent-name",  # matches frontmatter 'name'
    description="Brief task",
    prompt="Detailed instructions for agent"
)
```

**User invocation:**
- `@agent-name` mentions
- Auto-invoked based on description matching

## Commands (Slash Commands)

### Purpose
Custom slash commands for users.

### Structure
Single markdown file per command in `commands/`:
```
commands/
├── review-code.md
└── analyze-dependencies.md
```

### Command File Format
```markdown
Brief description of what this command does.

## Usage
```
/command-name <arg1> <arg2>
```

## Examples
```
/command-name example
```

## Instructions

Detailed steps for Claude to execute when this command is invoked.

1. Validate parameters
2. Execute logic
3. Report results
```

**Command naming:** Use kebab-case, can include hyphens (e.g., `cc-code-review`)

## Discovery & Installation

### Auto-Discovery
Claude Code automatically discovers:
- All `.md` files in `agents/`
- All `SKILL.md` files in `skills/*/`
- All `.md` files in `commands/`

**No manual registration needed in plugin.json.**

### Installation
```bash
# Add marketplace
/plugin marketplace add /path/to/marketplace

# Install plugin
/plugin install plugin-name@marketplace-name

# Update after changes
/plugin marketplace update marketplace-name
```

## Best Practices

### Skills
1. **Concise main content:** Keep SKILL.md focused
2. **Progressive disclosure:** Move examples to reference.md
3. **Clear triggers:** Explicit auto-activation keywords in description
4. **Cross-reference:** Link related skills (avoid duplication)
5. **Tool restrictions:** Use allowed-tools to limit scope when needed

### Agents
1. **Context isolation:** Use when workflow needs dedicated focus
2. **Clear instructions:** Step-by-step process
3. **Structured output:** Define exact format for reports
4. **No assumptions:** Agent works independently, no shared context

### Commands
1. **Parameter validation:** Always validate user input
2. **Usage messages:** Show help if parameters missing/wrong
3. **Error handling:** Clear error messages
4. **One purpose:** Keep commands focused

### General
1. **No examples in plugin:** Don't create sample projects/files unless needed
2. **Template-based setup:** Provide templates for users to copy (e.g., CLAUDE.template.md)
3. **Mechanism, not content:** Plugin provides tools, users provide content
4. **Token efficiency:** Keep documentation concise

## Common Patterns

### Auto-Activation in Skills
```markdown
---
name: java-best-practices
description: Java best practices. Auto-activates when writing Java code.
---

**This skill activates automatically when user mentions: java, .java files, javac, Java code.**
```

### Agent Priority Rules
If agent has internal priority rules (e.g., project guidelines > skill guidelines), document in agent description, NOT in external files:

```markdown
## Critical Priority Rule

**When project guidelines conflict with skill guidelines, PROJECT GUIDELINES ALWAYS WIN.**

This rule is internal to this agent.
```

### Project Configuration (CLAUDE.md pattern)
For project-specific agent triggers, provide template:
1. Create `CLAUDE.template.md` in plugin root
2. Document in README: "Copy to your project as CLAUDE.md"
3. Template contains instructions for main agent

### Progressive Loading Pattern
```markdown
# Skill Main Content

Core rules here.

For detailed examples and edge cases, see reference.md.
```

Claude loads reference.md only when needed.

### Template Rendering Pattern
Store templates in `skills/skill-name/templates/`:
- Use Jinja2 syntax
- Render with context data
- Keep templates simple and reusable

## File Naming Conventions

- **Skills:** `skill-name` (directory), `SKILL.md` (uppercase)
- **Agents:** `agent-name.md` (lowercase, hyphens)
- **Commands:** `command-name.md` (lowercase, hyphens)
- **Templates:** `template-name.md.j2` (Jinja2 extension)

## Tools Access

### In Skills (allowed-tools)
```yaml
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(git:*)      # Specific bash commands only
  - Glob
  - Grep
```

### In Agents (tools)
```yaml
tools: Read, Write, Edit, Bash, Glob, Grep
```

Omit to inherit all tools from main agent.

## Directory Conventions

### claudedocs/ Pattern
Common pattern for project artifacts:
```
claudedocs/
├── epics/        # EPIC-XXX-name.md
├── stories/      # STORY-XXX-name.md
├── sprints/      # SPRINT-XX.md
├── adrs/         # ADR-XXX-decision.md
└── guidelines/   # Project-specific guidelines (*.md)
```

**Naming:** `{TYPE}-{ID}-{description}.md`
- IDs: Zero-padded (001, 002, 003)
- Description: lowercase-with-dashes

Skills/Agents auto-create directories if missing.

## What NOT to Do

❌ Don't list agents/skills/commands in plugin.json (auto-discovered)
❌ Don't create claudedocs/ in plugin repo (project-specific)
❌ Don't include example content in plugin (mechanism only)
❌ Don't modify skills for agent triggers (use CLAUDE.md pattern)
❌ Don't create hooks via skills (use native Claude Code hooks if available)
❌ Don't put priority rules in external README (put in agent description)

## Testing

1. Make changes in plugin directory
2. Update marketplace:
   ```bash
   /plugin marketplace update marketplace-name
   ```
3. Test in project

Changes are immediately available after marketplace update.

## Model Selection

**In agents:**
- `sonnet` - Default, balanced
- `haiku` - Fast, simple tasks (cheaper)
- `opus` - Complex reasoning (expensive)

Choose haiku for straightforward workflows to reduce cost/latency.

## Context Optimization

1. **Skills:** Shared context - keep concise
2. **Agents:** Isolated context - can be more detailed
3. **Progressive disclosure:** Use reference.md for details
4. **Templates:** Externalize repetitive structures

## Summary Checklist

Creating a plugin:
- [ ] Create `.claude-plugin/plugin.json` with required fields
- [ ] Add skills in `skills/skill-name/SKILL.md` (if needed)
- [ ] Add agents in `agents/agent-name.md` (if needed)
- [ ] Add commands in `commands/command-name.md` (if needed)
- [ ] Use correct frontmatter for each component
- [ ] Include auto-activation keywords in descriptions
- [ ] Test via marketplace update
- [ ] Document in README.md

All components are optional except plugin.json. Build what you need.
