# Update Rules Command

Updates AgenticAI Plugin rules to the latest version.

## Usage

```
/agenticaiplugin:update-rules
```

No parameters required.

## What It Does

Compares plugin rules in `.claude/rules/` with the current plugin version and updates outdated rules.

**Only affects files with `agenticaiplugin-` prefix.** User's own rules are never touched.

## Execution Steps

### Step 1: Check Prerequisites

Check if `.claude/rules/` directory exists:

```bash
ls -la .claude/rules/ 2>/dev/null
```

**If directory does NOT exist:**

```
No .claude/rules/ directory found.

Run /agenticaiplugin:init first to set up your project.
```

**STOP here if directory doesn't exist.**

### Step 2: Scan Existing Rules

List all `agenticaiplugin-*.md` files in `.claude/rules/`:

For each file found:
1. Read the file
2. Extract version from header comment (e.g., `AgenticAI Plugin Rule v1.0`)
3. Store filename and version

**Expected files:**
- `agenticaiplugin-core.md`
- `agenticaiplugin-code-review.md`
- `agenticaiplugin-protected-dirs.md`

### Step 3: Compare Versions

Compare each existing rule with the current plugin version.

**Current Plugin Rule Versions:**

| Rule File | Current Version |
|-----------|-----------------|
| agenticaiplugin-core.md | v1.0 |
| agenticaiplugin-code-review.md | v1.0 |
| agenticaiplugin-protected-dirs.md | v1.0 |

For each rule:
- If file missing: Mark as "New"
- If version matches: Mark as "Up to date"
- If version differs: Mark as "Update available"

### Step 4: Show Update Preview

Display what will be updated:

```
Rules Update Preview:

Current rules in .claude/rules/:
  agenticaiplugin-core.md - v1.0 (up to date)
  agenticaiplugin-code-review.md - v0.9 -> v1.0 (update available)
  agenticaiplugin-protected-dirs.md - missing (will be created)

Actions:
- 1 rule up to date
- 1 rule will be updated
- 1 rule will be created
```

**If all rules are up to date:**

```
All plugin rules are up to date (v1.0).

No changes needed.
```

**STOP here if nothing to update.**

### Step 5: Ask for Confirmation

Use the AskUserQuestion tool:
- Question: "Proceed with rules update?"
- Options: "Yes, update now" / "No, cancel"

If user chooses "No, cancel" → Stop.

### Step 6: Apply Updates

For each rule that needs updating or creating:

1. Use the rule templates from the project-initializer agent
2. Write the new content to `.claude/rules/`
3. Report each change

```
Updating rules...

[checkmark] agenticaiplugin-code-review.md - Updated (v0.9 -> v1.0)
[checkmark] agenticaiplugin-protected-dirs.md - Created (v1.0)
```

### Step 7: Show Changelog Summary

Display what changed in each updated rule:

```
Rules Update Complete!

Summary:
- 1 rule updated
- 1 rule created
- 1 rule unchanged

Changes in this update:

agenticaiplugin-code-review.md (v0.9 -> v1.0):
  - Added ensemble mode for parallel reviewers
  - Clarified one-round-only principle

agenticaiplugin-protected-dirs.md (new):
  - v1.0: Initial version

Your custom rules (without agenticaiplugin- prefix) were not modified.
```

## Rule Templates Reference

The command uses the same rule templates as `/agenticaiplugin:init`. These are embedded in the project-initializer agent.

**Current rules and their purposes:**

| Rule | Purpose |
|------|---------|
| `agenticaiplugin-core.md` | Never make assumptions - always ask |
| `agenticaiplugin-code-review.md` | Automatic code review after tasks |
| `agenticaiplugin-protected-dirs.md` | Protected directories and files |

## When to Use

Run this command after updating the AgenticAI Plugin to get the latest rule improvements.

```bash
# 1. Update the plugin
/plugin marketplace update local-dev-marketplace

# 2. Update rules in your project
/agenticaiplugin:update-rules
```

## Related

- **/agenticaiplugin:init** - Initial project setup (also creates rules)
- **/agenticaiplugin:config** - View/edit plugin configuration
