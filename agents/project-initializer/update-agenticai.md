# Task: Update AgenticAI Rules

This task is executed by the project-initializer coordinator during UPDATE workflow.

---

## Step 1: Detect Installation Type

### 1.1 Check for Modern Installation

```bash
ls -la .claude/rules/agenticaiplugin-*.md 2>/dev/null
```

**If rules files exist:** Modern installation detected → Set `installation_type = modern` → Continue to Step 2.

### 1.2 Check for Legacy Installation (No Rules Directory)

If `.claude/rules/` does not exist or contains no `agenticaiplugin-*.md` files:

```bash
ls CLAUDE.md 2>/dev/null
```

**If CLAUDE.md does NOT exist:**

```
No plugin installation found.

Run /agenticaiplugin:init first to set up your project.
```

**STOP here.**

### 1.3 Check CLAUDE.md for Plugin Content

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

Set `installation_type = legacy`

---

## Step 2: CLAUDE.md Migration

**Skip this step if `installation_type = modern` AND CLAUDE.md does not exist.**

Check if `CLAUDE.md` exists in project root.

**If CLAUDE.md does NOT exist:** Skip to Step 3.

**If CLAUDE.md exists:**

### 2.1 Create Backup

```bash
cp CLAUDE.md CLAUDE.md.backup
```

Report: `Backup created: CLAUDE.md.backup`

### 2.2 Read and Parse CLAUDE.md

Read the file and split into sections by `##` headers.

### 2.3 Identify Plugin Sections

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

### 2.4 Build Cleaned Content

Keep only sections marked as "project".

Preserve:
- File title (`# ...` at top)
- All project-specific sections
- Comments, whitespace between sections

### 2.5 Check if Result is Empty

After removing plugin sections, check if CLAUDE.md is "empty":

**Empty means:**
- Only whitespace
- Only the title line (`# Project Instructions` or similar)
- Only HTML comments (`<!-- -->`)
- Less than 50 characters of actual content

### 2.6 Handle Result

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

## Step 3: Scan Existing Rules

### 3.1 Handle Legacy Migration

**If `installation_type = legacy`:**

Create the rules directory:

```bash
mkdir -p .claude/rules
```

All rules will be marked as "New" (to be created).

Skip to Step 5 with all rules marked for creation.

### 3.2 Scan Modern Installation (via sync-rules script)

Run the deterministic rule-sync script in **dry-run** mode. It compares the installed
`.claude/rules/agenticaiplugin-*.md` against the plugin's `rules-templates/` (the single
source of truth) and classifies each rule — no hardcoded version table to maintain.

**Prerequisite:** the script needs `node` on PATH. If `node` is missing, report the Node.js
prerequisite (see `prerequisites.json`, `id: "node"`, field `hints`) and STOP — the sync
cannot run without it.

```bash
node "{plugin_root}/agents/project-initializer/scripts/sync-rules.mjs" . "{plugin_root}" --dry-run
```

Parse the JSON report:

```
{ "applied": false, "actions": [ {
    "id", "file", "action",              // action ∈ create | update | delete | up-to-date
    "installedRuleVersion", "templateRuleVersion",
    "installedPluginVersion"             // observed BEFORE apply — used by Step 8 "What's New"
} ] }
```

- **create** — template present, not installed.
- **update** — both present, rule version differs.
- **delete** — installed but no template (deprecated rule → will be removed).
- **up-to-date** — same rule version.

Use `action` for Steps 5–7; keep `installedPluginVersion` for the Step 8 delta.

---

## Step 4: Version comparison — handled by the script

`sync-rules.mjs` reads each template's `AgenticAI Plugin Rule vX.Y` header directly, so the
latest versions are never hardcoded here. Nothing to do in this step.

---

## Step 5: Show Update Preview

**For Legacy Migration (`installation_type = legacy`):**

```
Legacy Migration Preview:

Migrating from CLAUDE.md to .claude/rules/ (one line per rule the sync-rules dry-run marks "create"):
  agenticaiplugin-core.md - will be created (v1.0)
  agenticaiplugin-code-review.md - will be created (v1.2)
  ... (all current templates)

Actions:
- [N] rules will be created
- Plugin sections will be removed from CLAUDE.md
```

**For Modern Installation (`installation_type = modern`):**

```
Rules Update Preview:

Rendered from the sync-rules dry-run report (one line per action):
  agenticaiplugin-core.md - v1.0 (up to date)
  agenticaiplugin-code-review.md - v0.9 -> v1.2 (update available)
  agenticaiplugin-git-commit.md - missing (will be created)
  agenticaiplugin-<deprecated>.md - v1.0 (deprecated -> will be REMOVED)

Actions:
- 1 rule up to date
- 1 rule will be updated
- 1 rule will be created
- 1 rule will be removed (no longer part of the plugin)
```

**If all rules are up to date:**

```
Rules Status:

All plugin rules are up to date.
```

**If nothing to update, create, or delete (all rules current, no CLAUDE.md migration):** Show summary and STOP.

---

## Step 6: Ask for Confirmation

Only if there are rules to update, create, **or delete**. Use the AskUserQuestion tool:
- Question: "Proceed with plugin update?"
- Options: "Yes, update now" / "No, cancel"

If user chooses "No, cancel" → Stop.

---

## Step 7: Apply Updates

Re-run the sync script in **apply** mode. It creates/updates/deletes the rule files
deterministically (create/update = copy template; delete = remove the deprecated file):

```bash
node "{plugin_root}/agents/project-initializer/scripts/sync-rules.mjs" . "{plugin_root}" --apply
```

Report each change from the returned report, e.g.:

```
Updating rules...

✓ agenticaiplugin-code-review.md - Updated (v1.1 -> v1.2)
✓ agenticaiplugin-git-commit.md - Created (v1.1)
✓ agenticaiplugin-<deprecated>.md - Removed (no longer part of the plugin)
```

---

## Step 8: Show Final Summary with "What's New"

### 8.1 Determine Version Delta

**Before** showing the summary, determine the changelog delta:

1. **Read the plugin CHANGELOG** from `skills/update-plugin/CHANGELOG.md` (relative to the plugin installation, use Glob to find it)
2. **Detect installed (old) version:** Use `installedPluginVersion` from the **dry-run** report (Step 3.2) — it was captured **before** apply, so it survives the rule rewrite/removal (do NOT re-read a rule file after apply). Take the highest non-null value across the report's actions. If all are null (pre-0.5.1 installation), treat as `unknown`.
3. **Detect new version:** Parse the first `## X.Y.Z` heading in the CHANGELOG — that's the current plugin version.
4. **Collect delta entries:** All `## X.Y.Z` sections where `X.Y.Z` is newer than the old version. If old version is `unknown`, include all entries.

### 8.2 Show Summary

**For Legacy Migration:**

```
Plugin Migration Complete!

CLAUDE.md Migration:
  ✓ [X] plugin sections removed
  ✓ [X] project sections kept
  ✓ Backup: CLAUDE.md.backup

Rules Created:
  ✓ agenticaiplugin-core.md (v1.0)
  ✓ agenticaiplugin-code-review.md (v1.1)
  ✓ agenticaiplugin-protected-dirs.md (v1.1)

Your project is now using the new rules-based configuration.
Project-specific content was preserved.
```

**For Modern Update:**

```
Plugin Update Complete!

Rules Update:
  ✓ [X] rule(s) updated
  ✓ [X] rule(s) created
  ✓ [X] rule(s) unchanged

Your project-specific content was preserved.
```

### 8.3 Show "What's New" (if version changed)

**Skip this section entirely if:**
- Old version equals new version (no update happened)

**Show this section if version changed or old version is unknown:**

After the summary above, append a "What's New" block. Include all changelog entries from versions newer than the installed version.

Format:

```
───────────────────────────────────
What's New (0.4.2 → 0.9.0)
───────────────────────────────────

## 0.9.0
- aiknowledgedb Integration (knowledge skill, rule template, init/update tasks)
- ...

## 0.8.7
- ...

───────────────────────────────────
```

**If old version is unknown:**

Use `? → 0.9.0` in the header instead of a specific old version.

**Important:** Reproduce the changelog entries verbatim from the CHANGELOG.md file. Do not summarize or rewrite them.
