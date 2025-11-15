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

## Plugin Development Guidelines

### Structure Conventions

**Directory Layout:**
```
agenticaiplugin/
├── .claude-plugin/
│   └── plugin.json           # REQUIRED metadata
├── agents/                    # Sub-agents (isolated context)
├── commands/                  # Slash commands
├── skills/                    # Auto-loaded knowledge
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
- **Commands:** `command-name.md` (lowercase, hyphens)
- **Templates:** `template-name.md.j2` (Jinja2 extension)

### Frontmatter Requirements

**Skills (SKILL.md):**
```yaml
---
name: skill-identifier
description: What it does and WHEN to auto-activate. Include trigger keywords.
allowed-tools: [optional list]
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

**Commands:**
No frontmatter required. File name becomes command name.

### Auto-Discovery

Claude Code automatically discovers:
- All `.md` files in `agents/` → Agents
- All `SKILL.md` files in `skills/*/` → Skills
- All `.md` files in `commands/` → Commands

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
skills/agile-workflow/templates/
├── epic.md.j2
├── story.md.j2
└── sprint.md.j2
```

---

## What NOT to Do

❌ Don't list agents/skills/commands in plugin.json (auto-discovered)
❌ Don't create `claudedocs/` in plugin repo (project-specific, not plugin-specific)
❌ Don't include example projects in plugin (mechanism only, not content)
❌ Don't put priority rules in README (put in agent description)
❌ Don't duplicate information across skills (use cross-references)

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

**Remember:** Always check `docs/plugin-howto.md` first for plugin development questions!
