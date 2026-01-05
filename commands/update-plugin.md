# Update Plugin Command

Updates AgenticAI Plugin to the latest version, including rules and CLAUDE.md migration.

## Usage

```
/agenticaiplugin:update-plugin
```

No parameters required.

## What It Does

1. **Migrates CLAUDE.md** - Removes old plugin content from CLAUDE.md (keeps project-specific content)
2. **Updates Rules** - Syncs `.claude/rules/agenticaiplugin-*.md` to latest version

**Only affects plugin-generated content.** Project-specific content is always preserved.

## Execution Steps

### Step 1: Detect Installation Type

This step determines the installation state and required actions.

#### 1.1 Check for Modern Installation

```bash
ls -la .claude/rules/agenticaiplugin-*.md 2>/dev/null
```

**If rules files exist:** Modern installation detected → Continue to Step 2.

#### 1.2 Check for Legacy Installation (No Rules Directory)

If `.claude/rules/` does not exist or contains no `agenticaiplugin-*.md` files, check for legacy CLAUDE.md:

```bash
ls CLAUDE.md 2>/dev/null
```

**If CLAUDE.md does NOT exist:**

```
No plugin installation found.

Run /agenticaiplugin:init first to set up your project.
```

**STOP here.**

#### 1.3 Check CLAUDE.md for Plugin Content

If CLAUDE.md exists, read it and check for legacy plugin sections using these patterns:

| Pattern | Indicates Legacy Plugin |
|---------|------------------------|
| `🚨 CRITICAL: Never Make Assumptions` | Yes |
| `Never Make Assumptions` | Yes |
| `Automatic Code Review After Task Completion` | Yes |
| `CRITICAL: Protected Test Directories` | Yes |
| `Protected Test Directories` | Yes |
| `CRITICAL: Protected User Configuration` | Yes |
| `Protected User Configuration` | Yes |

**If NO plugin patterns found in CLAUDE.md:**

```
No plugin installation found.

CLAUDE.md exists but contains no plugin content.
Run /agenticaiplugin:init first to set up your project.
```

**STOP here.**

**If plugin patterns ARE found:**

```
Legacy installation detected!

Found old plugin content in CLAUDE.md.
This will be migrated to .claude/rules/ files.
```

Set flag: `legacy_migration = true`

Continue to Step 2.

---

### Step 2: CLAUDE.md Migration

Check if `CLAUDE.md` exists in project root.

**If CLAUDE.md does NOT exist:** Skip to Step 3.

**If CLAUDE.md exists:**

#### 2.1 Create Backup

```bash
cp CLAUDE.md CLAUDE.md.backup
```

Report: `Backup created: CLAUDE.md.backup`

#### 2.2 Read and Parse CLAUDE.md

Read the file and split into sections by `##` headers.

#### 2.3 Identify Plugin Sections

Check each section against these patterns:

| Pattern | Section Type |
|---------|--------------|
| `🚨 CRITICAL: Never Make Assumptions` | Plugin (remove) |
| `Never Make Assumptions` | Plugin (remove) |
| `Automatic Code Review After Task Completion` | Plugin (remove) |
| `Project-Specific Guidelines` with `claudedocs/guidelines` | Plugin (remove) |
| `CRITICAL: Protected Test Directories` | Plugin (remove) |
| `Protected Test Directories` | Plugin (remove) |
| `CRITICAL: Protected User Configuration` | Plugin (remove) |
| `Protected User Configuration` | Plugin (remove) |
| All other sections | Project (keep) |

**Section detection algorithm:**
1. Split file by lines starting with `## ` (level-2 headers)
2. For each section, check if header matches any pattern above
3. Mark as "plugin" or "project"

#### 2.4 Build Cleaned Content

Keep only sections marked as "project".

Preserve:
- File title (`# ...` at top)
- All project-specific sections
- Comments, whitespace between sections

#### 2.5 Check if Result is Empty

After removing plugin sections, check if CLAUDE.md is "empty":

**Empty means:**
- Only whitespace
- Only the title line (`# Project Instructions` or similar)
- Only HTML comments (`<!-- -->`)
- Less than 50 characters of actual content

#### 2.6 Handle Result

**If empty:**
```bash
rm CLAUDE.md
```

Report:
```
CLAUDE.md Migration:

Removed plugin sections:
  ✓ "Never Make Assumptions"
  ✓ "Automatic Code Review After Task Completion"
  ✓ "Protected Directories"

No project-specific content found.
CLAUDE.md deleted (backup kept: CLAUDE.md.backup)
```

**If not empty:**

Write cleaned content back to CLAUDE.md.

Report:
```
CLAUDE.md Migration:

Removed plugin sections:
  ✓ "Never Make Assumptions"
  ✓ "Automatic Code Review After Task Completion"

Kept project-specific sections:
  - "Development Workflow"
  - "API Documentation"

CLAUDE.md updated (backup: CLAUDE.md.backup)
```

**If no plugin sections found:**

```
CLAUDE.md Migration:

No old plugin content found in CLAUDE.md.
No changes needed.
```

---

### Step 3: Scan Existing Rules

#### 3.1 Handle Legacy Migration

**If `legacy_migration = true`:**

Create the rules directory:

```bash
mkdir -p .claude/rules
```

All rules will be marked as "New" (to be created).

Skip to Step 5 with all rules marked for creation.

#### 3.2 Scan Modern Installation

List all `agenticaiplugin-*.md` files in `.claude/rules/`:

For each file found:
1. Read the file
2. Extract version from header comment (e.g., `AgenticAI Plugin Rule v1.0`)
3. Store filename and version

**Expected files:**
- `agenticaiplugin-core.md`
- `agenticaiplugin-code-review.md`
- `agenticaiplugin-protected-dirs.md`

### Step 4: Compare Versions

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

### Step 5: Show Update Preview

**For Legacy Migration (`legacy_migration = true`):**

```
Legacy Migration Preview:

Migrating from CLAUDE.md to .claude/rules/:
  agenticaiplugin-core.md - will be created (v1.0)
  agenticaiplugin-code-review.md - will be created (v1.0)
  agenticaiplugin-protected-dirs.md - will be created (v1.0)

Actions:
- 3 rules will be created
- Plugin sections will be removed from CLAUDE.md
```

**For Modern Installation:**

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
Rules Status:

All plugin rules are up to date (v1.0).
```

**If nothing to update (rules current, no CLAUDE.md migration):** Show summary and STOP.

### Step 6: Ask for Confirmation

Only if there are rules to update. Use the AskUserQuestion tool:
- Question: "Proceed with rules update?"
- Options: "Yes, update now" / "No, cancel"

If user chooses "No, cancel" → Stop.

### Step 7: Apply Updates

For each rule that needs updating or creating:

1. Use the rule templates from the project-initializer agent
2. Write the new content to `.claude/rules/`
3. Report each change

```
Updating rules...

✓ agenticaiplugin-code-review.md - Updated (v0.9 -> v1.0)
✓ agenticaiplugin-protected-dirs.md - Created (v1.0)
```

### Step 8: Show Final Summary

Display complete summary:

```
Plugin Update Complete!

CLAUDE.md Migration:
  ✓ 3 plugin sections removed
  ✓ 2 project sections kept
  ✓ Backup: CLAUDE.md.backup

Rules Update:
  ✓ 1 rule updated
  ✓ 1 rule created
  ✓ 1 rule unchanged

Your project-specific content was preserved.
```

---

## Plugin Section Detection Reference

These are the exact patterns used to identify old plugin content in CLAUDE.md:

```
## 🚨 CRITICAL: Never Make Assumptions
## Never Make Assumptions
## Automatic Code Review After Task Completion
## Project-Specific Guidelines (with claudedocs/guidelines in content)
## CRITICAL: Protected Test Directories
## Protected Test Directories
## CRITICAL: Protected User Configuration
## Protected User Configuration
```

Any section NOT matching these patterns is considered project-specific and preserved.

---

## Rule Templates Reference

The command uses the same rule templates as `/agenticaiplugin:init`. These are embedded in the project-initializer agent.

**Current rules and their purposes:**

| Rule | Purpose |
|------|---------|
| `agenticaiplugin-core.md` | Never make assumptions - always ask |
| `agenticaiplugin-code-review.md` | Automatic code review after tasks |
| `agenticaiplugin-protected-dirs.md` | Protected directories and files |

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

- **/agenticaiplugin:init** - Initial project setup
- **/agenticaiplugin:config** - View/edit plugin configuration
