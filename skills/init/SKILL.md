---
description: Initialize a project for AgenticAI Plugin (scaffolds .claude/ guidelines and adrs directories)
disable-model-invocation: true
effort: low
---

# Project Initialization Command

Interactive project setup for AgenticAI Plugin.

## Usage

```
/agenticaiplugin:init
```

No parameters required.

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Any other argument passed** → Display the Usage section above verbatim, then STOP. This command takes no parameters.

## Execution

Invoke the `agenticaiplugin:project-initializer` agent in **init** mode.

Init scaffolds the `.claude/guidelines/` and `.claude/adrs/` directories. It does **not**
copy any rule files — the plugin provides always-on behavior itself via its doctrine
(SessionStart) and enforcement (PreToolUse) hooks.

**IMPORTANT:** Pass the plugin root path so the agent can run the setup scripts.
The plugin root is this skill's base directory, two levels up (i.e., `../../` from `skills/init/`).
Include it in the agent prompt as `plugin_root: <absolute_path>`.

## Related

- **/agenticaiplugin:update-plugin** _(deprecated since 0.26.2)_ - One-time transition for an existing installation
- **/agenticaiplugin:code-review** - Review code quality
