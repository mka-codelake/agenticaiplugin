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
├── commands/                 # LEGACY: Slash commands (use skills/ for new development)
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

These fields apply to SKILL.md files in `skills/` and also to command files in `commands/` (legacy).

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `name` | NO | directory name | Override only if needed |
| `description` | YES | - | Include auto-activation conditions |
| `allowed-tools` | NO | all | Tool restrictions (YAML list supported) |
| `context` | NO | - | `fork` for isolated sub-agent context |
| `agent` | NO | - | Agent type for execution |
| `model` | NO | inherits session | `haiku` / `sonnet` / `opus` / `inherit` — see [Effort + Model](#effort--model) |
| `effort` | NO | inherits session | `low` / `medium` / `high` / `xhigh` / `max` — see [Effort + Model](#effort--model) |
| `hooks` | NO | - | PreToolUse/PostToolUse/Stop hooks |
| `user-invocable` | NO | `true` | Show in slash command menu |
| `disable-model-invocation` | NO | `false` | Prevent Claude from auto-invoking |
| `argument-hint` | NO | - | Hint shown in slash command menu |

### Effort + Model

Both `effort:` and `model:` are officially documented Anthropic fields ([Skills](https://code.claude.com/docs/en/skills#frontmatter-reference), [Subagents](https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields)). They override the session defaults *while the skill or agent is active*.

**`effort:`** — Reasoning/thinking budget. Higher = more deliberate analysis, longer latency, higher cost.

**`model:`** — Which Claude model executes the skill or agent. `haiku` is fast/cheap, `sonnet` balanced, `opus` deepest reasoning.

**Plugin classification heuristic.** `effort:` measures the *skill's own* reasoning load — not the user-perceived workload. A wrapper skill that delegates to an agent has *low* skill-side effort even when the agent does heavy work.

| Pattern | Typical `effort:` | Typical `model:` | Example |
|---------|-------------------|------------------|---------|
| Pure lookup / display | `low` | `haiku` | `help`, `markdown-converter` |
| Single-pass mechanical action | `low` | `haiku` | `promote-perms` |
| Thin wrapper that delegates to an agent | `low` | inherit | `init`, `github-publish` |
| Reconciliation / structured output | `medium` | inherit | `handover` |
| Domain-deep single-pass reasoning | `high` | inherit | `create-cli`, `git-smart-commit` |
| Multi-phase orchestration with consolidation | `xhigh` | inherit | `code-review`, `architecture-audit`, `qa` |

**Where each override applies (and where it does not).** This determines whether `model:` is worth setting at all:

- **Skill without `context: fork`** → `effort:` and `model:` apply to the main conversation while the skill body executes.
- **Skill with `context: fork`** → both apply inside the fork; the main conversation is unaffected.
- **Skill that delegates via the Task tool to a subagent** → both apply only to the *orchestrating skill body*. The spawned subagent runs with **its own** `model:`/`effort:` (subagent definition wins per the [model resolution order](https://code.claude.com/docs/en/sub-agents#choose-a-model)). So setting `model: haiku` on a *thin* wrapper skill has minimal impact — the wrapper body is too short for the model switch to outweigh the prompt-cache invalidation cost.
- **Skill preloaded into a subagent via `skills:`** → the skill content is injected as domain knowledge. The subagent runs on its own `model:`/`effort:`. The skill's frontmatter `model:`/`effort:` is **ignored** in this path.

**Pairing rule.** Set `model: haiku` only when the skill body itself does the work (pure lookup, mechanical action). For thin wrappers that delegate, leave `model` to inherit — set only `effort: low`. `effort:` is always worth setting because it shapes the reasoning budget for whatever portion of the skill body actually runs.

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

### Forked Context (`context: fork`)

Run skill in isolated sub-agent context:

```yaml
---
name: heavy-analysis
description: Deep code analysis
context: fork
---
```

**Use when:**
- Skill performs complex, multi-step operations
- Need isolated context (won't pollute main conversation)
- Long-running operations that benefit from dedicated focus

**Behavior:**
- Skill runs as sub-agent with own context
- Does NOT see previous conversation history
- Results returned to main conversation when complete

### Agent Field (`agent`)

Specify which agent type executes the skill:

```yaml
---
name: code-check
description: Quick code validation
agent: github-publisher
---
```

**Use when:**
- Skill should leverage existing agent capabilities
- Need specific agent's tools or model configuration

### Hooks in Skills

Skills can define lifecycle hooks:

```yaml
---
name: my-skill
description: Skill with hooks
hooks:
  PreToolUse:
    - command: "echo 'Before any tool'"
      once: true  # Only first time
  PostToolUse:
    - command: "log-tool-usage.sh"
  Stop:
    - command: "cleanup.sh"
---
```

**Hook types:**
| Hook | Trigger |
|------|---------|
| `PreToolUse` | Before each tool execution |
| `PostToolUse` | After each tool execution |
| `Stop` | When skill/session ends |

**Options:**
- `once: true` - Execute only on first occurrence

### User Invocability (`user-invocable`)

Control visibility in slash command menu:

```yaml
---
name: internal-helper
description: Internal skill not for direct use
user-invocable: false
---
```

**Default:** `true` - Skills appear as `/plugin:skill-name` in menu

**Set to `false` when:**
- Skill is only for internal/programmatic use
- Skill should only auto-activate, never be called directly

### Hot-Reload Behavior

Skills in these directories auto-reload without restart:
- `~/.claude/skills/` (global)
- `.claude/skills/` (project)

**Workflow:**
1. Create/modify skill file
2. Skill immediately available
3. No session restart needed

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
├── github-publisher.md
└── project-initializer.md
```

### Agent File Format
```markdown
---
name: agent-identifier
description: What this agent does and when to use it. Use PROACTIVELY when [condition]. MUST BE USED when [scenario].
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
color: cyan
skills: skill-name1, skill-name2  # Optional: Auto-load skills
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
| `effort` | NO | `low`, `medium`, `high`, `xhigh`, `max` | inherits session — see [Effort + Model](#effort--model) |
| `color` | NO | `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan` | - |
| `skills` | NO | Comma-separated skill names | None |

### Auto-Loading Skills

Agents can automatically load specific skills when they start using the `skills:` frontmatter field.

**Syntax:**
**Behavior:**
- Skills are loaded into the agent's isolated context at startup
- Comma-separated list of skill names (matches skill's frontmatter `name:` field)
- Skills must exist in plugin, project, or global skills directories
- Reduces need for manual skill loading in agent instructions

**Use cases:**
- **Core skills:** Always-needed knowledge (e.g., `development-principles` for code reviewers)
- **Domain skills:** Specialized knowledge (e.g., `testing-philosophy` for test writers)
- **Language skills:** Tech-specific patterns when agent is language-specific

**Best practices:**
- Only auto-load skills that are ALWAYS relevant to the agent
- Keep conditional skills (context-dependent) in agent logic
- Document auto-loaded skills in agent instructions to avoid redundancy

### Skills vs Agents vs Commands

| Aspect | Skills | Agents | Commands (legacy) |
|--------|--------|--------|-------------------|
| Context | Shared main | Isolated per agent | Shared main |
| Invocation | Model and/or user | Model OR user | User-invoked only |
| Structure | Directory + SKILL.md | Single .md file | Single .md file |
| Purpose | Knowledge/guidelines | Workflow execution | User actions |
| Use when | "Remember X automatically" | "Automate Y workflow" | Backward compat only |

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

## Commands (Slash Commands) -- LEGACY

> **Legacy notice:** Since Claude Code v2.1.3 (Jan 2026), Anthropic's official Plugins Reference labels `commands/` as _"Skill Markdown files (legacy; use skills/ for new skills)"_. Slash commands and skills have been merged. **Use `skills/` for all new development.** Existing command files continue to work.

### When to Keep Existing Commands
- Commands that already exist and work -- no urgent need to migrate
- Simple commands that do not need supporting files, auto-invocation, `context: fork`, `agent`, or hooks

### What Skills Offer Over Commands
Skills support features that commands do not:
- Supporting files directory (reference.md, templates/)
- Auto-invocation by Claude (model-initiated)
- `context: fork` for isolated sub-agent execution
- `agent` field for agent-type delegation
- Hooks (PreToolUse, PostToolUse, Stop)
- `disable-model-invocation` field
- Dynamic context injection

**If a skill and a command share the same name, the skill takes precedence.**

### Structure
Single markdown file per command in `commands/`:
```
commands/
├── review-code.md
└── analyze-dependencies.md
```

### Command File Format

Commands now support the same YAML frontmatter as skills:

```markdown
---
name: command-identifier
description: What this command does
allowed-tools:
  - Read
  - Bash(git:*)
argument-hint: "<file-path>"
user-invocable: true
disable-model-invocation: true
---

Brief description of what this command does.

## Usage
/command-name <arg1> <arg2>

## Instructions

Detailed steps for Claude to execute when this command is invoked.

1. Validate parameters
2. Execute logic
3. Report results
```

**Command naming:** Use kebab-case, can include hyphens (e.g., `cc-code-review`)

### Migrating Commands to Skills

To migrate a command to a skill:

1. Create the skill directory: `skills/my-command/`
2. Move (or copy) `commands/my-command.md` to `skills/my-command/SKILL.md`
3. Add or update the YAML frontmatter (name, description, etc.)
4. Optionally add `reference.md` or `templates/` for supporting content
5. Delete the old command file to avoid name collisions
6. Test: `/plugin:my-command` should invoke the new skill

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
- All `.md` files in `commands/` (legacy; use `skills/` for new development)

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

### Commands (Legacy)
1. **Prefer skills for new features:** Commands are legacy; use `skills/` instead
2. **Parameter validation:** Always validate user input
3. **Usage messages:** Show help if parameters missing/wrong
4. **Error handling:** Clear error messages
5. **One purpose:** Keep commands focused

### General
1. **No examples in plugin:** Don't create sample projects/files unless needed
2. **Command-based setup:** Provide templates via commands that embed content (e.g., init command)
3. **Mechanism, not content:** Plugin provides tools, users provide content
4. **Token efficiency:** Keep documentation concise

## Common Patterns

### Command-Style Skills (Usage + Argument Handling)

Every user-invocable skill that acts as a command MUST include two standardized sections:

**`## Usage`** — Shows invocation syntax and modes:
```markdown
## Usage

\```
/agenticaiplugin:skill-name [<args>]
\```

| Mode | Command | Description |
|------|---------|-------------|
| **Default** | `/agenticaiplugin:skill-name` | What happens with no args |
| **With Arg** | `/agenticaiplugin:skill-name <arg>` | What happens with args |
```

**`## Argument Handling`** — Guards execution with validation:
```markdown
## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **No argument AND command requires parameters** → Display the Usage section above verbatim, then STOP.
3. **Unrecognized flags or invalid arguments** → Display the Usage section above verbatim, then STOP.
```

**Two patterns depending on whether arguments are required:**

| Scenario | No-arg behavior | Example |
|----------|----------------|---------|
| Command requires parameters | Show Usage, STOP | `markdown-converter` (needs `<file>`) |
| Command works without parameters | Proceed with default behavior | `code-review` (defaults to Git Diff mode) |

**Why:** Standardized since v0.8.2. Ensures consistent UX across all commands. Users always get usage guidance when invoking incorrectly.

**Applies to:** All user-invocable skills that perform an action. Pure knowledge skills (auto-activated only, `user-invocable: false`) may skip this.

### Auto-Activation in Skills
```markdown
---
name: development-principles
description: Development principles (YAGNI, KISS, SRP). Auto-activates when writing code.
---

**This skill activates automatically when user mentions: YAGNI, KISS, SRP, code quality, refactoring.**
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

## Hidden Features (Incubator)

Features that are available but not prominently advertised. For power users who know to look for them.

### Multi-Specialist Code Review

The code review system uses a team-based architecture with 12 focused specialist agents. A "Chief Architect" orchestrator (`skills/code-review/SKILL.md`) spawns specialists via the Task tool.

**How it works:**
1. Orchestrator detects changes (git diff, single file, or complete project)
2. Phase 1: Dependencies & Versions specialist runs first (provides version context)
3. Phase 2: All applicable specialists run in parallel (spawned as `general-purpose` sub-agents with a per-specialist `model` tier — `haiku`/`sonnet`/`opus`, see `orchestration.md`)
4. Orchestrator consolidates, deduplicates, and sorts findings into a single report

**12 Specialists:** Dependencies & Versions, Security & Data Safety, Architecture & Layers, Design Patterns (GoF), SOLID & Code Smells, Correctness & Bug Detection (06a), Code Style & Size (06b), Dead Code & Duplication, Cross-Cutting Concerns, Test Quality, Test Completeness & Infra, Documentation & Comments

**Key design decisions:**
- Specialists read only their focused rules (~100-200 lines) for thorough coverage
- Each specialist researches current tech stack standards via WebSearch/Context7 before reviewing
- Specialists only identify issues — they never fix code or modify files
- Phase 1 results are passed to Phase 2 specialists for version-aware reviews

See `skills/code-review/orchestration.md` for the full orchestration playbook

## Summary Checklist

Creating a plugin:
- [ ] Create `.claude-plugin/plugin.json` with required fields
- [ ] Add skills in `skills/skill-name/SKILL.md` (if needed)
- [ ] Add agents in `agents/agent-name.md` (if needed)
- [ ] Add commands in `commands/command-name.md` (legacy; prefer `skills/` for new features)
- [ ] Add MCP servers in `.mcp.json` or plugin.json (if needed)
- [ ] Use correct frontmatter for each component
- [ ] Include auto-activation keywords in descriptions
- [ ] Document required environment variables (if using MCP servers)
- [ ] Test via marketplace update
- [ ] Document in README.md

All components are optional except plugin.json. Build what you need.
