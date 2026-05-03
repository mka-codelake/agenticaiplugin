---
description: Update plugin rules and migrate legacy CLAUDE.md installations
disable-model-invocation: true
effort: low
---

# Update Plugin Command

Updates AgenticAI Plugin to the latest version, including rules and CLAUDE.md migration.

## Usage

```
/agenticaiplugin:update-plugin
```

No parameters required.

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Any other argument passed** → Display the Usage section above verbatim, then STOP. This command takes no parameters.

## What It Does

Updates an existing AgenticAI Plugin installation. Handles both modern (rules-based) and legacy (CLAUDE.md-based) installations.

Invokes the `agenticaiplugin:project-initializer` agent in **update** mode.

**IMPORTANT:** Pass the plugin root path so the agent can read rule templates.
The plugin root is this skill's base directory, two levels up (i.e., `../../` from `skills/update-plugin/`).
Include it in the agent prompt as `plugin_root: <absolute_path>`.

The agent:

1. **Cleanup (ALWAYS runs first):**
   - Removes deprecated `agentic.md` file if present in project root

2. **Detects Installation Type:**
   - Modern: `.claude/rules/agenticaiplugin-*.md` files exist
   - Legacy: Plugin content in CLAUDE.md (no rules files)
   - None: No plugin installation found

3. **For Legacy Installations:**
   - Migrates plugin content from CLAUDE.md to `.claude/rules/`
   - Removes plugin sections from CLAUDE.md
   - Preserves project-specific content
   - Creates backup (CLAUDE.md.backup)

4. **For Modern Installations:**
   - Compares rule versions
   - Updates outdated rules
   - Creates missing rules

5. **Summary:**
   - Reports what was migrated/updated
   - Shows rule versions
   - Displays "What's New" changelog delta between installed and current version

## Example

```
User: /agenticaiplugin:update-plugin

Legacy installation detected!

Found old plugin content in CLAUDE.md.
This will be migrated to .claude/rules/ files.

Legacy Migration Preview:

Migrating from CLAUDE.md to .claude/rules/:
  agenticaiplugin-core.md - will be created (v1.0)
  agenticaiplugin-code-review.md - will be created (v1.0)
  agenticaiplugin-protected-dirs.md - will be created (v1.0)

Actions:
- 3 rules will be created
- Plugin sections will be removed from CLAUDE.md

Proceed with plugin update?
> Yes, update now

Backup created: CLAUDE.md.backup

CLAUDE.md Migration:

Removed plugin sections:
  ✓ "Never Make Assumptions"
  ✓ "Automatic Code Review"
  ✓ "Protected Directories"

No project-specific content found.
CLAUDE.md deleted (backup kept: CLAUDE.md.backup)

✓ agenticaiplugin-core.md - Created (v1.0)
✓ agenticaiplugin-code-review.md - Created (v1.0)
✓ agenticaiplugin-protected-dirs.md - Created (v1.0)

Plugin Migration Complete!

Your project is now using the new rules-based configuration.
```

## When to Use

Run this command after updating the AgenticAI Plugin:

```bash
# 1. Update the plugin
/plugin marketplace update local-dev-marketplace

# 2. Update plugin in your project
/agenticaiplugin:update-plugin
```

Also run when migrating from old plugin version that used monolithic CLAUDE.md.

## Related

- **/agenticaiplugin:init** - Initial project setup (fresh installation)
