# Task: Install AgenticAI Rules and Directories

This task is executed by the project-initializer coordinator during INIT workflow.

## Step 1: Create Rules

### 1.1 Create .claude/rules/ directory

```bash
mkdir -p .claude/rules
```

### 1.2 Create Rule Files

For each of the 5 rule templates:
1. Read the template from `{plugin_root}/rules-templates/`
2. Use Write tool to create the file in `.claude/rules/` with the template content

Files to create:
- `.claude/rules/agenticaiplugin-core.md`
- `.claude/rules/agenticaiplugin-code-review.md`
- `.claude/rules/agenticaiplugin-protected-dirs.md`
- `.claude/rules/agenticaiplugin-git-commit.md`
- `.claude/rules/agenticaiplugin-engineering.md`

Report each created rule:
```
✓ Created .claude/rules/agenticaiplugin-core.md
✓ Created .claude/rules/agenticaiplugin-code-review.md
✓ Created .claude/rules/agenticaiplugin-protected-dirs.md
✓ Created .claude/rules/agenticaiplugin-git-commit.md
✓ Created .claude/rules/agenticaiplugin-engineering.md
```

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

| Template File | Target in User Project |
|------|----------------------|
| `rules-templates/agenticaiplugin-core.md` | `.claude/rules/agenticaiplugin-core.md` |
| `rules-templates/agenticaiplugin-code-review.md` | `.claude/rules/agenticaiplugin-code-review.md` |
| `rules-templates/agenticaiplugin-protected-dirs.md` | `.claude/rules/agenticaiplugin-protected-dirs.md` |
| `rules-templates/agenticaiplugin-git-commit.md` | `.claude/rules/agenticaiplugin-git-commit.md` |
| `rules-templates/agenticaiplugin-engineering.md` | `.claude/rules/agenticaiplugin-engineering.md` |

Read each template from `{plugin_root}/rules-templates/`, then Write to `.claude/rules/` in the user's project.
