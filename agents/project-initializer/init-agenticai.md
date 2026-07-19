# Task: Create AgenticAI Project Directories

This task is executed by the project-initializer coordinator during INIT workflow.

The plugin no longer copies rule files into the project — always-on behavior comes from
the plugin's own doctrine (SessionStart hook) and enforcement (PreToolUse hook). Init only
scaffolds the project directories that plugin features read.

## Step 1: Create Project Directories

For each missing directory from the coordinator's status check, create it:

```bash
mkdir -p .claude/guidelines .claude/adrs
```

Report each created directory:
```
✓ Created .claude/guidelines/
✓ Created .claude/adrs/
```

Skip directories that already exist (don't report them).

- `.claude/guidelines/` — your own coding rules; code review reads them.
- `.claude/adrs/` — Architecture Decision Records; code review and architecture audit read them.

You place your own `.md` files there; the plugin reads them but never modifies them. If you
want them committed and shared, ensure they are not gitignored (some projects gitignore
`.claude/`).
