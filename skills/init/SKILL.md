---
description: Initialize project for AgenticAI Plugin (rules, directories, guidelines)
disable-model-invocation: true
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

Invoke the `agenticaiplugin:project-initializer` agent. It handles the complete setup:
status check, confirmation, rule creation, directory creation, and summary.

## Related

- **/agenticaiplugin:update-plugin** - Update rules to latest version
- **/agenticaiplugin:code-review** - Review code quality
