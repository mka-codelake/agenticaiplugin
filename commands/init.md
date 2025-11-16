Interactive project setup for AgenticAI Plugin.

Creates CLAUDE.md and recommended directory structure for using AgenticAI Plugin features.

## Instructions

Use the Task tool to invoke the project-initializer agent:

```
Task(
    subagent_type="project-initializer",
    description="Initialize AgenticAI project",
    prompt="Run interactive project initialization for AgenticAI Plugin"
)
```

The agent will guide you through:
1. Status check of existing files/directories
2. Confirmation prompt
3. CLAUDE.md creation or merge
4. Directory structure creation
5. Completion summary
