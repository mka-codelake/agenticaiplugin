---
name: git-smart-commit
description: "Analyzes uncommitted changes, intelligently groups them into logical commits, and creates meaningful commit messages following project conventions. Use when user wants to commit changes, create commits, make git commits, or analyze changes for committing."
allowed-tools: [Bash, Read, Glob, Grep, rg]
---

# Git Smart Commit

Intelligently analyzes all uncommitted changes in the project, groups them into logical commits, and creates meaningful commit messages following project conventions and conventional commit standards.

## Functionality

### Change Analysis
- Examine all modified, added, and deleted files
- Understand the nature and purpose of changes
- Categorize modifications by type and scope

### Logical Grouping
- Separate changes into coherent, atomic commits
- Group related file changes together
- Isolate different features, fixes, and documentation

### Smart Message Generation
- Follow detected project conventions from git history
- Use conventional commit format when no pattern exists
- Include descriptive summaries explaining intent
- Maintain consistency with existing commit style

## Process

1. **Analyze Git History Pattern**
   - Review recent commit messages for conventions
   - Detect prefix patterns and formatting style
   - Note project-specific requirements

2. **Examine Current Changes**
   - Run git status to identify all changes
   - Analyze diffs to understand modifications
   - Categorize changes by purpose and scope

3. **Group Changes Logically**
   - Separate unrelated changes into distinct commits
   - Keep commits atomic and focused
   - Ensure each commit represents one logical change

4. **Generate Commit Messages**
   - Follow detected project patterns
   - Use appropriate conventional commit prefixes
   - Write descriptive messages explaining why changes were made

5. **Execute Commits**
   - Stage related changes together
   - Create individual commits for each logical group
   - Maintain clean git history

## Output Format
```
Analyzing changes...
Pattern detected: [project convention]

Creating commits:
1. [prefix]: [descriptive message]
   - file1.ext
   - file2.ext

2. [prefix]: [descriptive message]
   - file3.ext

Commits created successfully.
```

## Error Handling
- Warn about uncommitted merge conflicts
- Handle partially staged changes appropriately
- Provide rollback instructions if commits fail
- Detect and warn about large binary files

## Examples
```bash
# Commit all changes with automatic grouping
# The skill will:
# 1. Analyze git log to detect "feat:", "fix:", "docs:" pattern
# 2. Identify changes: new API endpoint, bug fix, README update
# 3. Create three separate commits:
#    - feat: add user profile management endpoints
#    - fix: resolve null pointer in authentication
#    - docs: update API documentation
```

## Supported Commit Prefixes
- **feat**: New feature or functionality
- **fix**: Bug fix or error correction
- **docs**: Documentation only changes
- **style**: Formatting, missing semicolons, etc (no code change)
- **refactor**: Code restructuring without changing behavior
- **perf**: Performance improvements
- **test**: Adding or modifying tests
- **build**: Build system or dependency changes
- **ci**: CI configuration changes
- **chore**: Maintenance tasks, tooling changes
- **revert**: Reverting a previous commit
- **cleanup**: Removing unused code or files

## Notes
- **History-Aware**: Adapts to existing project conventions
- **Atomic Commits**: Each commit represents one logical change
- **Non-Destructive**: Never forces commits or overwrites history
- **Pattern Recognition**: Learns from repository's commit history
- **Conventional Commits**: Falls back to standard prefixes when needed
- **Multiple Small Commits**: Preferred over one large mixed-purpose commit
