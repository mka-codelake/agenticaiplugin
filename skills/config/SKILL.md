---
name: config
description: Configure plugin settings (e.g. ensemble code review count)
disable-model-invocation: true
---

Interactive configuration wizard for AgenticAI Plugin settings.

## Usage

```
/agenticaiplugin:config
```

No parameters required. The command will guide you through available settings interactively.

## Execution Steps

### Step 1: Read Current Configuration

Check if `claudedocs/config.yaml` exists in the current project:

**If file exists:**
- Read and parse the YAML content
- Extract current settings

**If file does NOT exist:**
- Use default values (all settings at their defaults)

### Step 2: Display Current Settings

Show the current configuration status:

```
📋 AgenticAI Plugin Configuration

Current Settings:
┌─────────────────────────┬─────────┬─────────┐
│ Setting                 │ Value   │ Source  │
├─────────────────────────┼─────────┼─────────┤
│ Code Review Instances   │ 1       │ default │
└─────────────────────────┴─────────┴─────────┘
```

If config.yaml exists with custom values:
```
📋 AgenticAI Plugin Configuration

Current Settings:
┌─────────────────────────┬─────────┬─────────────┐
│ Setting                 │ Value   │ Source      │
├─────────────────────────┼─────────┼─────────────┤
│ Code Review Instances   │ 3       │ config.yaml │
└─────────────────────────┴─────────┴─────────────┘
```

### Step 3: Ask for Configuration Changes

Use AskUserQuestion to let the user modify settings:

**Question 1: Code Review Instances**
```
Question: "How many parallel code reviewers should run after task completion?"
Header: "Reviewers"
Options:
  - "1 (default)" - Single reviewer, standard behavior
  - "2" - Two reviewers for broader coverage
  - "3" - Three reviewers, good balance of coverage vs cost
  - "Custom" - Enter a custom number
```

**If user selects "Custom":**
- Ask follow-up: "Enter the number of parallel reviewers (1-10 recommended):"
- Validate: Must be a positive integer

### Step 4: Write Configuration

**If user made changes:**

1. Ensure `claudedocs/` directory exists (create if needed)
2. Write `claudedocs/config.yaml` with the new settings:

```yaml
# AgenticAI Plugin Configuration
# This file controls plugin behavior for this project.
# Delete this file to reset all settings to defaults.

code-review:
  ensemble-count: 3  # Number of parallel code reviewers (default: 1)
```

3. Confirm to user:
```
✓ Configuration saved to claudedocs/config.yaml

Updated Settings:
- Code Review Instances: 3

Changes take effect on next code review.
```

**If user kept defaults:**
```
No changes made. Using default settings.

Tip: Run /agenticaiplugin:config again anytime to adjust settings.
```

### Step 5: Explain the Setting

After saving, briefly explain what the setting does:

```
ℹ️ About Ensemble Code Review:

When ensemble-count > 1, multiple code reviewers run in parallel
after task completion. This leverages LLM non-determinism to find
more issues - each reviewer may catch different problems.

Results are automatically deduplicated:
• Exact matches (same file:line) → merged
• Similar findings → grouped with confidence score
• Unique findings → kept (the value of ensemble mode)

Higher counts = more coverage but higher token cost.
```

## Configuration Schema

The `claudedocs/config.yaml` file uses this structure:

```yaml
# AgenticAI Plugin Configuration

code-review:
  ensemble-count: 1  # Number of parallel reviewers (default: 1)
  # Future settings will be added here as needed
```

**Current Settings:**

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| Ensemble Count | `code-review.ensemble-count` | 1 | Number of parallel code reviewers |

## Important Notes

- Configuration is **per-project** (stored in project's claudedocs/)
- Default behavior (no config.yaml) = single reviewer
- Settings take effect immediately on next code review
- Delete `claudedocs/config.yaml` to reset all settings to defaults

## Error Handling

**If claudedocs/ cannot be created:**
```
Error: Cannot create claudedocs/ directory.
Please check write permissions and try again.
```

**If config.yaml cannot be written:**
```
Error: Cannot write to claudedocs/config.yaml.
Please check file permissions and try again.
```
