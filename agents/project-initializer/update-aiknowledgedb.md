# Task: Update aiknowledgedb Integration

This task is executed by the project-initializer coordinator during UPDATE workflow.

---

## Step 1: Check Installation

Check if aiknowledgedb is installed in the target project:

```bash
ls .claude/rules/aiknowledgedb-knowledge-lookup.md 2>/dev/null
```

**If NOT found:**

```
aiknowledgedb: Not installed (skipping)
```

**STOP this task here.** Return to coordinator. Nothing to update.

---

## Step 2: Version Comparison

Read `.claude/rules/aiknowledgedb-knowledge-lookup.md` and extract the version from the header comment:

```
aiknowledgedb Rule v1.0
```

Compare against the latest template version in `{plugin_root}/rules-templates/aiknowledgedb-knowledge-lookup.md`.

**If versions match:** Rule is up to date.
**If versions differ:** Rule needs updating.

---

## Step 3: Check Hook and Permission

Even if the rule is current, verify hook and permission are properly configured:

### 3.1 PreCompact Hook Check

Read `hooks/hooks.json` (if exists) and check for `aiknowledgedb` reference.

- **Found:** `✓ PreCompact hook configured`
- **Not found / file missing:** `⚠ PreCompact hook missing`

### 3.2 SessionStart Hook Check

Read `hooks/hooks.json` (if exists) and check for `session-knowledge-extract` reference.

- **Found:** `✓ SessionStart hook configured`
- **Not found / file missing:** `⚠ SessionStart hook missing`

### 3.3 Permission Check

Read `.claude/settings.local.json` (if exists) and check for `Bash(aiknowledgedb:*)`.

- **Found:** `✓ CLI permission configured`
- **Not found / file missing:** `⚠ CLI permission missing`

---

## Step 4: Preview

Show what will be updated:

```
aiknowledgedb Update Preview:
  Rule: v1.0 (up to date)                    (or: v0.9 → v1.0 (update available))
  PreCompact hook: ✓ configured              (or: ⚠ missing — will be added)
  SessionStart hook: ✓ configured            (or: ⚠ missing — will be added)
  Permission: ✓ configured                   (or: ⚠ missing — will be added)
```

**If everything is current:** Report and STOP.

```
aiknowledgedb: All components up to date.
```

---

## Step 5: Apply Updates

### 5.1 Update Rule (if needed)

1. Read the template from `{plugin_root}/rules-templates/aiknowledgedb-knowledge-lookup.md`
2. Write it to `.claude/rules/aiknowledgedb-knowledge-lookup.md`

Report: `✓ Updated aiknowledgedb-knowledge-lookup.md`

### 5.2 Resolve aiknowledgedb Scripts Path (if SessionStart hook missing)

Follow the path resolution logic from `init-aiknowledgedb.md` Step 4.2:

```bash
AIKNOWLEDGEDB_BIN=$(readlink -f "$(which aiknowledgedb)")
AIKNOWLEDGEDB_SCRIPTS="$(dirname "$(dirname "$(dirname "$AIKNOWLEDGEDB_BIN")")")/scripts"
```

If `session-knowledge-extract.sh` not found at that path, skip SessionStart hook repair.

### 5.3 Repair Hooks (if missing)

Follow the same hook installation logic as in `init-aiknowledgedb.md` Step 4.3:
- File missing → create with full hook config (both PreCompact + SessionStart)
- File exists without aiknowledgedb → show manual merge warning for missing hooks
- File exists with aiknowledgedb → skip configured hooks, repair only missing ones

### 5.4 Repair Permission (if missing)

Follow the same permission installation logic as in `init-aiknowledgedb.md` Step 4.4:
- File missing → create with permission
- File exists without permission → add to allow array
- File exists with permission → skip

---

## Step 6: Summary

Report results back to coordinator:

```
aiknowledgedb Update:
  ✓ Rule updated (v0.9 → v1.0)              (or: ✓ Rule up to date)
  ✓ PreCompact hook repaired                 (or: ✓ PreCompact hook OK)
  ✓ SessionStart hook repaired               (or: ✓ SessionStart hook OK)
  ✓ Permission repaired                      (or: ✓ Permission OK)
```
