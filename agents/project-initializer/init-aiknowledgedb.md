# Task: Install aiknowledgedb Integration

This task is executed by the project-initializer coordinator during INIT workflow.
aiknowledgedb is **optional** — if the CLI is not installed, skip gracefully.

---

## Step 1: Prerequisite Check

```bash
aiknowledgedb --version 2>/dev/null
```

**If command fails (exit code != 0):**

```
aiknowledgedb CLI not found. Skipping knowledge DB setup.

To install later:
  npm install -g aiknowledgedb
  (or: git clone <repo> && cd app && pnpm install && pnpm run build && npm link)

After installing, re-run /agenticaiplugin:init to set up the knowledge DB integration.
```

**STOP this task here.** Return to coordinator. This is non-blocking.

**If command succeeds:** Show version and continue.

---

## Step 2: Status Check

Check the current setup status in the target project:

1. `.claude/rules/aiknowledgedb-knowledge-lookup.md` — Lookup rule
2. `hooks/hooks.json` — PreCompact hook (check if file exists AND contains `aiknowledgedb`)
3. `hooks/hooks.json` — SessionStart hook (check if file contains `session-knowledge-extract`)
4. `.claude/settings.local.json` — CLI permission (check if file exists AND contains `aiknowledgedb`)

Display format:

```
aiknowledgedb Integration — Status:
  ✓ Lookup rule — Already installed          (or: ✗ Not installed)
  ✗ PreCompact hook — Not configured         (or: ✓ Already configured)
  ✗ SessionStart hook — Not configured       (or: ✓ Already configured)
  ✓ CLI permission — Already configured      (or: ✗ Not configured)
```

---

## Step 3: Preview Actions

Based on the status check, list the actions:

```
aiknowledgedb setup will:
  - Install lookup rule (.claude/rules/aiknowledgedb-knowledge-lookup.md)
  - Configure PreCompact hook (hooks/hooks.json)
  - Configure SessionStart hook (hooks/hooks.json)
  - Add CLI permission (.claude/settings.local.json)
```

Only list items that are missing or need updating. If an item already exists, show:

```
  - Update lookup rule (already exists, will be overwritten with latest version)
```

**If everything is already set up:**

```
All aiknowledgedb components are already installed and up to date.
Nothing to do.
```

Return to coordinator.

---

## Step 4: Install Components

### 4.1 Install Lookup Rule

1. Create directory: `mkdir -p .claude/rules`
2. Read the template from `{plugin_root}/rules-templates/aiknowledgedb-knowledge-lookup.md`
3. Write it to `.claude/rules/aiknowledgedb-knowledge-lookup.md`

Report: `✓ Installed .claude/rules/aiknowledgedb-knowledge-lookup.md`

### 4.2 Resolve aiknowledgedb Scripts Path

The SessionStart hook needs the absolute path to `session-knowledge-extract.sh`. Resolve it from the CLI binary:

```bash
AIKNOWLEDGEDB_BIN=$(readlink -f "$(which aiknowledgedb)")
# CLI is at <repo>/app/dist/cli.js → scripts at <repo>/scripts/
AIKNOWLEDGEDB_SCRIPTS="$(dirname "$(dirname "$(dirname "$AIKNOWLEDGEDB_BIN")")")/scripts"
```

Verify the script exists:

```bash
ls "$AIKNOWLEDGEDB_SCRIPTS/session-knowledge-extract.sh"
```

**If not found:** Report warning and skip SessionStart hook:

```
⚠ session-knowledge-extract.sh not found at $AIKNOWLEDGEDB_SCRIPTS/
  SessionStart hook will not be configured. Update aiknowledgedb to get this feature.
```

Store the resolved path for use in Step 4.3.

### 4.3 Configure Hooks

Check if `hooks/hooks.json` already exists:

**If it does NOT exist:** Create the directory and file with the hook configuration:

```bash
mkdir -p hooks
```

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "<AIKNOWLEDGEDB_SCRIPTS>/session-knowledge-extract.sh",
            "async": true,
            "timeout": 300
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "agent",
            "prompt": "Before context compaction, review the conversation for valuable, reusable insights worth preserving in the knowledge database.\n\n## What to look for\n- Non-obvious solutions to tricky problems\n- Workarounds for framework/library gotchas\n- Architecture decisions with reasoning\n- Debugging techniques that saved time\n- Integration patterns\n- Performance optimizations\n\n## What to skip\n- Trivial changes, WIP, project-specific details\n- Secrets, credentials, personal data\n- Things already documented in CLAUDE.md\n\n## Process\n1. Evaluate: Is anything genuinely reusable? If not, do nothing.\n2. Check for duplicates via Bash:\n   `aiknowledgedb search \"<insight-summary>\" --mode text --limit 5 --json`\n3. If no duplicate, store via Bash:\n   `echo \"<structured-content>\" | aiknowledgedb store --title \"<title>\"`\n4. Max 1-2 entries per flush. Quality over quantity.\n\n## Error handling\nIf CLI commands fail, silently continue. Never block compaction.",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

Replace `<AIKNOWLEDGEDB_SCRIPTS>` with the absolute path resolved in Step 4.2.

**If SessionStart script was not found in Step 4.2:** Omit the `SessionStart` section from the JSON.

Report: `✓ Created hooks/hooks.json with PreCompact + SessionStart hooks`

**If it DOES exist:** Read the file and check for each hook:

1. **PreCompact hook:** Check if file contains `aiknowledgedb`
   - Present → `✓ PreCompact hook already configured`
   - Missing → needs manual merge (see below)

2. **SessionStart hook:** Check if file contains `session-knowledge-extract`
   - Present → `✓ SessionStart hook already configured`
   - Missing → needs manual merge (see below)

**If manual merge is needed for either hook**, show a WARNING:

```
hooks/hooks.json already exists with other hooks.
Manual merge needed. Add these to hooks/hooks.json:

SessionStart hook (add to "SessionStart" array):
{
  "matcher": "startup",
  "hooks": [{
    "type": "command",
    "command": "<AIKNOWLEDGEDB_SCRIPTS>/session-knowledge-extract.sh",
    "async": true,
    "timeout": 300
  }]
}

PreCompact hook (add to "PreCompact" array):
{
  "matcher": "*",
  "hooks": [{
    "type": "agent",
    "prompt": "Before context compaction, review the conversation...",
    "timeout": 60
  }]
}
```

Report: `⚠ hooks/hooks.json — manual merge needed (see instructions above)`

### 4.4 Configure CLI Permission

Check if `.claude/settings.local.json` already exists:

**If it does NOT exist:** Create the file:

```json
{
  "permissions": {
    "allow": [
      "Bash(aiknowledgedb:*)"
    ]
  }
}
```

Report: `✓ Created .claude/settings.local.json with CLI permission`

**If it DOES exist:** Read the file and check if it already contains `Bash(aiknowledgedb:*)`.

- **If it already contains it:** Skip, report `✓ CLI permission already configured`
- **If it does NOT contain it:** Read the existing JSON, add `"Bash(aiknowledgedb:*)"` to the `permissions.allow` array (create the array if it doesn't exist), and write back.

Report: `✓ Added CLI permission to .claude/settings.local.json`

---

## Step 5: Summary

Report results back to coordinator:

```
aiknowledgedb Integration:
  ✓ Lookup rule — Claude will check knowledge DB before external searches
  ✓ PreCompact hook — Insights auto-saved before context compaction
  ✓ SessionStart hook — New sessions auto-analyzed for knowledge extraction
  ✓ CLI permission — aiknowledgedb CLI runs without confirmation

Prerequisites:
  - Ollama running with nomic-embed-text model (for semantic search)
  - aiknowledgedb CLI in PATH
  - claude CLI in PATH (for SessionStart hook)
```

---

## Important Notes

**Idempotent:** Running init multiple times is safe. It overwrites the rule with the latest version and skips components that are already configured.

**Non-destructive:** Never deletes user files. Only creates/updates aiknowledgedb-specific files and adds entries to existing config files.

**Error handling:** If any Write operation fails, report the error clearly and continue with remaining components.
