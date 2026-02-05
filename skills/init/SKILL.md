---
name: init
description: Initialize project for AgenticAI Plugin (rules, directories, guidelines)
disable-model-invocation: true
---

# Project Initialization Command

Interactive project setup for AgenticAI Plugin.

## Usage

```
/agenticaiplugin:init
```

No parameters required.

## What It Does

Creates plugin rules in `.claude/rules/` and recommended directory structure for using AgenticAI Plugin features.

Invokes the `project-initializer` agent which guides you through:

1. **Status Check:**
   - Check for existing `.claude/rules/` directory
   - Check for existing plugin rules (`agenticaiplugin-*.md`)
   - Check for `claudedocs/` directories

2. **Confirmation:**
   - Show what will be created/modified
   - Ask for user confirmation

3. **Setup:**
   - Create `.claude/rules/` directory
   - Create plugin rules:
     - `agenticaiplugin-core.md` - Never make assumptions
     - `agenticaiplugin-code-review.md` - Automatic code reviews
     - `agenticaiplugin-protected-dirs.md` - Protected directories
   - Create `claudedocs/guidelines/` directory
   - Create `claudedocs/testspecs/` directory

4. **Summary:**
   - Report what was created
   - Show next steps

## Example

```
User: /agenticaiplugin:init

AgenticAI Plugin - Project Setup

Current Status:
[x] .claude/rules/ - Not found (required)
[x] claudedocs/guidelines/ - Not found (recommended)
[x] claudedocs/testspecs/ - Not found (recommended)

Setup will perform these actions:
- Create .claude/rules/ directory
- Create plugin rules:
  - agenticaiplugin-core.md (Never Make Assumptions)
  - agenticaiplugin-code-review.md (Automatic Code Review)
  - agenticaiplugin-protected-dirs.md (Protected Directories)
- Create claudedocs/guidelines/
- Create claudedocs/testspecs/

Proceed with AgenticAI Plugin setup?
> Yes, set up now

[checkmark] Created .claude/rules/agenticaiplugin-core.md
[checkmark] Created .claude/rules/agenticaiplugin-code-review.md
[checkmark] Created .claude/rules/agenticaiplugin-protected-dirs.md
[checkmark] Created claudedocs/guidelines/
[checkmark] Created claudedocs/testspecs/

Setup complete! Your project is ready for AgenticAI Plugin.

Summary:
- Plugin rules created: 3
- Directories created: 2

Next steps:
1. Add project-specific coding rules to claudedocs/guidelines/
2. Add test scenarios to claudedocs/testspecs/
3. Start using plugin features:
   - /agenticaiplugin:code-review - Review code quality
   - /agenticaiplugin:gitme - Smart git commits
   - /agenticaiplugin:test - Run tests

To update rules after plugin updates:
   /agenticaiplugin:update-plugin

Happy coding with AgenticAI!
```

## Plugin Rules

The following rules are created in `.claude/rules/`:

| Rule File | Purpose |
|-----------|---------|
| `agenticaiplugin-core.md` | Never make assumptions - always ask for clarification |
| `agenticaiplugin-code-review.md` | Automatic code review after task completion |
| `agenticaiplugin-protected-dirs.md` | Protected test directories and user configuration |

These rules are auto-loaded by Claude Code when working in your project.

**To disable a rule:** Simply delete the file from `.claude/rules/`.

**To update rules:** Run `/agenticaiplugin:update-plugin` after plugin updates.

## Related

- **/agenticaiplugin:update-plugin** - Update rules to latest version
- **/agenticaiplugin:config** - Configure plugin settings
- **/agenticaiplugin:code-review** - Review code quality
- **/agenticaiplugin:test** - Write integration tests
