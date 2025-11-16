# Claude Code Plugin Development Reference

Token-optimized reference for AI agents developing Claude Code plugins.

## Plugin Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # REQUIRED: Plugin metadata
├── .mcp.json                 # OPTIONAL: MCP server configuration
├── agents/                   # OPTIONAL: Sub-agents
│   └── agent-name.md
├── commands/                 # OPTIONAL: Slash commands
│   └── command-name.md
├── skills/                   # OPTIONAL: Auto-loaded context
│   └── skill-name/
│       ├── SKILL.md         # REQUIRED if skill exists
│       ├── reference.md     # OPTIONAL: Progressive disclosure
│       └── templates/       # OPTIONAL: Jinja2 templates
├── servers/                  # OPTIONAL: Bundled MCP server executables
│   └── server-executable
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

## MCP Servers

### Purpose
Bundle and configure MCP (Model Context Protocol) servers with your plugin to extend Claude's capabilities with external tools and APIs.

### Structure
```
plugin-root/
├── .mcp.json              # Server configuration
└── servers/               # Optional: bundled executables
    └── your-server
```

### Configuration Format

**Option 1: Separate .mcp.json file**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/executable",
      "args": ["--flag", "value"],
      "env": {
        "CONFIG_PATH": "${CLAUDE_PLUGIN_ROOT}/config",
        "API_TOKEN": "${API_TOKEN}",
        "VAR_WITH_DEFAULT": "${VAR:-default_value}"
      }
    }
  }
}
```

**Option 2: Inline in plugin.json**
```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-package"]
    }
  }
}
```

### Key Elements

| Element | Description |
|---------|-------------|
| `command` | Path to executable (use `${CLAUDE_PLUGIN_ROOT}` for portability) |
| `args` | Command-line arguments array |
| `env` | Environment variables with optional defaults `${VAR:-default}` |

### Environment Variables & Credentials

**For user-specific credentials (API tokens, keys):**

```json
{
  "env": {
    "API_TOKEN": "${API_TOKEN}",
    "API_KEY": "${API_KEY:-}"
  }
}
```

**User must set before using:**
```bash
export API_TOKEN="user-token-here"
# Add to ~/.bashrc or ~/.zshrc for persistence
```

**Documentation pattern in README.md:**
```markdown
## MCP Server Configuration

This plugin includes an MCP server that requires authentication.

### Required Environment Variables
- `API_TOKEN` - Get from https://service.com/tokens

### Setup
1. Obtain token from service
2. Add to shell config: `export API_TOKEN="your-token"`
3. Restart Claude Code

### Troubleshooting
- Check server status: `/mcp status`
- Debug mode: `claude --debug`
```

### Automatic Startup

- MCP servers start automatically when plugin is enabled
- Requires Claude Code restart to apply changes
- Server tools integrate seamlessly into Claude's toolkit

### Best Practices

1. **Portability:** Always use `${CLAUDE_PLUGIN_ROOT}` for paths
2. **Defaults:** Provide sensible defaults where possible: `${VAR:-default}`
3. **Documentation:** Clearly document required environment variables
4. **Setup command:** Provide `/plugin:setup` command for guided configuration
5. **Graceful degradation:** Document behavior when credentials missing
6. **Error handling:** Skills/agents should check if MCP tools are available

### Handling Missing Credentials

**In documentation/setup command:**
- Guide users through obtaining credentials
- Explain how to configure environment variables
- Provide verification steps (`/mcp status`)

**In skills (graceful degradation):**
```markdown
**Note:** This skill works best with the bundled MCP server.
If you see "tool not available" errors, run `/plugin:setup`.
```

**In agents (explicit checks):**
Document that certain features require MCP server and how to verify availability.

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
2. **Command-based setup:** Provide templates via commands that embed content (e.g., init command)
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
For project-specific agent triggers, embed template in command:
1. Embed complete template content in init command (commands/init.md)
2. Command creates CLAUDE.md in user's project automatically
3. Template contains instructions for main agent
4. Benefits: Self-contained, always available, no file dependencies

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
❌ Don't hardcode credentials in MCP configs (use environment variables)
❌ Don't use absolute paths in MCP configs (use `${CLAUDE_PLUGIN_ROOT}`)

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
- [ ] Add MCP servers in `.mcp.json` or plugin.json (if needed)
- [ ] Use correct frontmatter for each component
- [ ] Include auto-activation keywords in descriptions
- [ ] Document required environment variables (if using MCP servers)
- [ ] Test via marketplace update
- [ ] Document in README.md

All components are optional except plugin.json. Build what you need.
