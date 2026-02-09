# AgenticAI Plugin Development Instructions

This file contains development instructions for working on the AgenticAI Plugin itself.

---

## 🚨 CRITICAL: Consult Internal Documentation First

**Always check internal documentation before using external sources:**

### Documentation Priority

1. **FIRST:** Check `docs/plugin-howto.md` for all Claude Code plugin development questions
   - Plugin structure and conventions
   - Skills, agents, commands (frontmatter, auto-discovery)
   - Best practices and patterns
   - What IS and ISN'T documented by Claude Code
   - File naming conventions
   - Progressive disclosure patterns

2. **ONLY IF NOT FOUND:** Use WebSearch for external documentation
   - Official Claude Code documentation
   - Claude API documentation
   - Community resources

**Why this is critical:**
The `docs/plugin-howto.md` file contains curated, plugin-specific knowledge that may differ from general Claude Code documentation. It includes lessons learned, specific conventions for this plugin, and answers to common questions.

**Always start there first.**

---

## 🚨 CRITICAL: No Absolute Paths in Plugin Files

**The plugin must be portable across all user environments.**

### Rules

❌ **NEVER use:**
- Absolute paths to plugin development directory (`/mnt/d/ki/repos/agenticaiplugin`)
- Absolute paths to user projects (`/dein-projekt/`, `/your-project/`)
- Developer-specific paths (Windows drives `D:\`, WSL mounts `/mnt/d/`, home directories `~/`)
- Hardcoded paths that won't work when plugin is installed elsewhere

✅ **ALWAYS use:**
- Generic placeholders: `/path/to/your/marketplace`, `<your-project-root>`
- Relative paths within user's project: `claudedocs/guidelines/`
- Clear instructions: "From your project root:"
- Examples for multiple platforms (Windows, WSL, Linux, macOS)

### Examples

**BAD:**
```bash
cp CLAUDE.template.md /dein-projekt/CLAUDE.md
/plugin marketplace add D:\ki\marketplace
mkdir -p /mnt/d/ki/repos/agenticaiplugin/test
```

**GOOD:**
```bash
# From your project root:
mkdir -p claudedocs/guidelines

# Add marketplace (use your actual path):
/plugin marketplace add /path/to/your/marketplace

# Examples for different platforms:
# Windows: /plugin marketplace add C:\dev\marketplace
# WSL:     /plugin marketplace add /mnt/c/dev/marketplace
# Linux:   /plugin marketplace add ~/dev/marketplace
```

### Why This Matters

Users install this plugin in diverse environments:
- Different operating systems (Windows, Linux, macOS, WSL)
- Different directory structures
- Different user names and home paths
- Different drive letters and mount points

**The plugin must work everywhere without modification.**

### What Users Get

When users install the plugin:
- Plugin files are copied to Claude Code's plugin directory
- Users work in their own project directories
- Plugin references relative paths in user's projects (`claudedocs/*`)
- Plugin provides commands/skills/agents that work from user's context

**The plugin cannot and should not reference its own installation path.**

---

## Plugin Development Guidelines

### Structure Conventions

**Directory Layout:**
```
agenticaiplugin/
├── .claude-plugin/
│   └── plugin.json           # REQUIRED metadata
├── agents/                    # Sub-agents (isolated context)
├── skills/                    # All skills (knowledge + commands)
│   └── skill-name/
│       ├── SKILL.md          # Main skill definition
│       ├── reference.md      # Progressive disclosure (optional)
│       └── templates/        # Jinja2 templates (optional)
├── docs/                      # Internal documentation
│   └── plugin-howto.md       # PRIMARY DEV REFERENCE
└── CLAUDE.md                 # This file
```

### File Naming

- **Skills:** `skill-name` (directory), `SKILL.md` (uppercase)
- **Agents:** `agent-name.md` (lowercase, hyphens)
- **Templates:** `template-name.md.j2` (Jinja2 extension)

### Frontmatter Requirements

**Knowledge Skills (auto-activated, SKILL.md):**
```yaml
---
name: skill-identifier
description: What it does and WHEN to auto-activate. Include trigger keywords.
user-invocable: false
---
```

**Command Skills (slash commands, SKILL.md):**
```yaml
---
name: command-identifier
description: What this command does (shown in command menu)
disable-model-invocation: true
---
```

**Agents (agent-name.md):**
```yaml
---
name: agent-identifier
description: What this agent does and when to use it. Use PROACTIVELY when [condition].
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
color: cyan
---
```

### Auto-Discovery

Claude Code automatically discovers:
- All `.md` files in `agents/` → Agents
- All `SKILL.md` files in `skills/*/` → Skills

**No registration needed in plugin.json.**

---

## Development Workflow

### Making Changes

1. **Edit files** in the plugin directory
2. **Update marketplace:**
   ```bash
   /plugin marketplace update local-dev-marketplace
   ```
3. **Test** in a project that uses the plugin

Changes are immediately available after marketplace update.

### Testing

- Test skills by triggering their auto-activation keywords
- Test agents by invoking them via Task tool or @mentions
- Test commands by running them: `/agenticaiplugin:command-name`

---

## Progressive Disclosure Pattern

**Keep SKILL.md concise:**
- Main rules and guidelines only
- Essential information

**Move details to reference.md:**
- Extensive examples
- Edge cases
- Deep-dive explanations
- Reference documentation

**Reference from SKILL.md:**
```markdown
For detailed examples, see reference.md.
```

Claude loads reference.md only when explicitly needed, saving tokens.

---

## Template Pattern

**Store templates in `skills/skill-name/templates/`:**
- Use Jinja2 syntax (`.j2` extension)
- Keep templates focused and reusable
- Document template variables

**Example:**
```
skills/my-skill/templates/
├── template-a.md.j2
├── template-b.md.j2
└── template-c.md.j2
```

---

## What NOT to Do

❌ Don't list agents/skills/commands in plugin.json (auto-discovered)
❌ Don't create `claudedocs/` in plugin repo (project-specific, not plugin-specific)
❌ Don't include example projects in plugin (mechanism only, not content)
❌ Don't put priority rules in README (put in agent description)
❌ Don't duplicate information across skills (use cross-references)
❌ Don't reference agents without plugin prefix in invocation contexts (see below)

### Agent References: Always Use Fully Qualified Names

When a skill or rule **instructs to invoke/call/spawn an agent**, always use the fully qualified name with plugin prefix:

- ✅ `agenticaiplugin:project-initializer` — in invocation/instruction context
- ✅ `agenticaiplugin:context-creator` — in invocation/instruction context
- ❌ `project-initializer` — will fail, Claude Code can't resolve the agent type

**Exception:** Pure descriptive/documentation contexts (like tables listing available agents) may use the short name since no invocation happens there.

---

## Token Optimization

1. **Skills:** Shared context - keep very concise
2. **Agents:** Isolated context - can be more detailed
3. **Progressive disclosure:** Use reference.md for details
4. **Templates:** Externalize repetitive structures
5. **Cross-references:** Link related skills instead of duplicating

---

## Customization

This file can be extended with:
- Project-specific development conventions
- Team workflows
- Testing procedures
- Release processes
- Contribution guidelines

---

## Reference: Legacy Framework

**Location:** `C:\Dev\repos\agenticai`

This directory contains the previous version of this framework. When the user mentions "old framework", "legacy framework", "previous version", or similar terms, they are referring to this location.

**Usage:**
- Reference for understanding evolution of concepts
- Migration source for proven patterns
- Historical context when needed

**Note:** This information is for reference only and should not be loaded automatically at session start. Only consult when explicitly relevant to the current task.

---

**Remember:** Always check `docs/plugin-howto.md` first for plugin development questions!
