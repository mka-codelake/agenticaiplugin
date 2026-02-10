# AgenticAI Plugin Development Instructions

This file contains development instructions for working on the AgenticAI Plugin itself.

---

## 🚨 CRITICAL: Consult Internal Documentation First

**Always check internal documentation before using external sources:**

1. **FIRST:** Check `docs/plugin-howto.md` for all Claude Code plugin development questions
2. **ONLY IF NOT FOUND:** Use WebSearch for external documentation

The `docs/plugin-howto.md` file contains curated, plugin-specific knowledge that may differ from general Claude Code documentation. **Always start there first.**

---

## 🚨 CRITICAL: No Absolute Paths in Plugin Files

**The plugin must be portable across all user environments.**

❌ **NEVER use:** Absolute paths, developer-specific paths (Windows drives, WSL mounts, home dirs), hardcoded paths that won't work when installed elsewhere

✅ **ALWAYS use:** Generic placeholders (`/path/to/your/marketplace`, `<your-project-root>`), relative paths within user's project (`claudedocs/guidelines/`), platform-agnostic examples

Users install this plugin on Windows, Linux, macOS, and WSL with different directory structures. The plugin cannot and should not reference its own installation path.

---

## Project Structure

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
├── rules-templates/           # Rule templates installed by project-initializer
├── docs/                      # Internal documentation
│   └── plugin-howto.md       # PRIMARY DEV REFERENCE
└── CLAUDE.md                 # This file
```

### Auto-Discovery

Claude Code automatically discovers:
- All `.md` files in `agents/` → Agents
- All `SKILL.md` files in `skills/*/` → Skills

**No registration needed in plugin.json.**

For file naming, frontmatter requirements, progressive disclosure, and template patterns, see `docs/plugin-howto.md`.

### Key Files

- `.claude-plugin/plugin.json` — Plugin metadata (name, version, author)
- `docs/plugin-howto.md` — Primary development reference (frontmatter, patterns, conventions)
- `skills/code-review/orchestration.md` — Multi-specialist review orchestration playbook
- `skills/architecture-audit/orchestration.md` — Architecture audit orchestration playbook

---

## Commands

| Command | Description |
|---------|-------------|
| `/plugin marketplace update local-dev-marketplace` | Publish plugin changes to local marketplace |
| `/agenticaiplugin:code-review` | Multi-specialist code review |
| `/agenticaiplugin:init` | Set up plugin in a new project |
| `/agenticaiplugin:git-smart-commit` | Atomic commits with meaningful messages |

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

## Gotchas

- **Skills = shared context** — every SKILL.md is loaded into every session → token-expensive, keep them short. Agents have isolated context and can be more detailed.
- **`rules-templates/` vs `.claude/rules/`** — `rules-templates/` contains the source templates. The `project-initializer` agent copies them to `.claude/rules/` in the target project. `.claude/` is gitignored in the plugin repo.
- **Marketplace update required** — File changes in the plugin directory are NOT immediately active. Always run `/plugin marketplace update` after changes.

---

## Versioning

**NEVER bump the version on your own.** Only the user initiates version changes.

When the user requests a version bump:
1. Update `version` in `.claude-plugin/plugin.json`
2. Update `skills/update-plugin/CHANGELOG.md` — add a new `## X.Y.Z` section at the top with all changes since the previous version (use git log to identify changes)

---

## Token Optimization

1. **Skills:** Shared context - keep very concise
2. **Agents:** Isolated context - can be more detailed
3. **Progressive disclosure:** Use reference.md for details
4. **Templates:** Externalize repetitive structures
5. **Cross-references:** Link related skills instead of duplicating

---

## Legacy Framework

When the user mentions "old framework" or "legacy", ask for the path. Only consult when explicitly relevant to the current task.

---

**Remember:** Always check `docs/plugin-howto.md` first for plugin development questions!
