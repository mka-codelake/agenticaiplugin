# Task: Install AgenticAI Rules and Directories

This task is executed by the project-initializer coordinator during INIT workflow.

## Step 1: Install Rules (via sync-rules script)

Install the current plugin rules deterministically. On a fresh project (no
`.claude/rules/`), every template is classified as **create**, so this installs the
full current rule set — no hardcoded rule list to maintain.

**Prerequisite:** `node` on PATH (see `prerequisites.json`, `id: "node"`). If `node`
is missing, report it and STOP — the install cannot run without Node.

```bash
node "{plugin_root}/agents/project-initializer/scripts/sync-rules.mjs" . "{plugin_root}" --apply
```

Report each created rule from the returned JSON report (one `✓ Created …` line per
action `create`).

## Step 2: Create Missing Directories

For each missing directory from the coordinator's status check, create it:

```bash
mkdir -p claudedocs/guidelines claudedocs/adrs
```

Report each created directory:
```
✓ Created claudedocs/guidelines/
✓ Created claudedocs/adrs/
```

Skip directories that already exist (don't report them).

## Rule Templates Reference

The rule set is whatever `rules-templates/agenticaiplugin-*.md` contains — the
`sync-rules.mjs` script (Step 1) is the single mechanism that installs it into
`.claude/rules/`. No rule list is maintained here.
