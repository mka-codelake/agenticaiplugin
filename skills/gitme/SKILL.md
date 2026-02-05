---
name: gitme
description: Smart git commit — analyze changes, group logically, create meaningful messages
disable-model-invocation: true
---

# Git Smart Commit Command

Commit all uncommitted changes using intelligent grouping and meaningful commit messages.

## Usage

```
/agenticaiplugin:gitme
```

No parameters required.

## What It Does

Invokes the `git-smart-commit` skill to:

1. **Analyze Changes:**
   - Scan all uncommitted changes (staged and unstaged)
   - Identify logical groupings of related changes

2. **Group Intelligently:**
   - Separate unrelated changes into distinct commits
   - Keep related changes together

3. **Create Meaningful Commits:**
   - Generate descriptive commit messages following project conventions
   - Include relevant context (story IDs, change type, etc.)

## Example

```
User: /agenticaiplugin:gitme

Analyzing uncommitted changes...

Found 3 logical groups:

1. Feature: User authentication
   - src/main/java/UserService.java
   - src/main/java/AuthController.java

2. Fix: Null pointer in OrderService
   - src/main/java/OrderService.java

3. Docs: Update README
   - README.md

Creating commits...
✓ feat(auth): add user authentication service
✓ fix(order): handle null order items
✓ docs: update installation instructions

3 commits created successfully.
```

## Related

- **/agenticaiplugin:code-review** - Review code before committing
- **git-smart-commit skill** - Underlying skill for commit logic
