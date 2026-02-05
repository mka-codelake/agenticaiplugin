---
description: Run intelligent code review (git diff, single file, or full project)
---

Perform a code review using the code-reviewer agent.

## Usage

```
/agenticaiplugin:code-review [<file>|--complete]
```

## Modes

| Mode | Command | Description |
|------|---------|-------------|
| **Git Diff** (Default) | `/agenticaiplugin:code-review` | Review all changed files vs. main branch |
| **Single File** | `/agenticaiplugin:code-review <file>` | Review a specific file |
| **Complete Project** | `/agenticaiplugin:code-review --complete` | Review all source files in project |

## Examples

```bash
# Review all changes (git diff) - DEFAULT
/agenticaiplugin:code-review

# Review a specific file
/agenticaiplugin:code-review src/main/java/com/example/UserService.java
/agenticaiplugin:code-review UserController.java

# Review entire project (all source files)
/agenticaiplugin:code-review --complete
```

## Parameter Handling

### Mode 1: No Parameter (Git Diff - Default)

When called without parameters:

1. **Detect default branch:**
   ```bash
   default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
   if [ -z "$default_branch" ]; then
     if git show-ref --verify --quiet refs/remotes/origin/main; then
       default_branch="main"
     elif git show-ref --verify --quiet refs/remotes/origin/master; then
       default_branch="master"
     fi
   fi
   ```

2. **Get changed files:**
   ```bash
   git diff --name-only origin/${default_branch}...HEAD
   ```

3. **If no changes detected:**
   ```
   No changes detected against origin/{branch}.

   Your working tree is clean. Nothing to review.

   Alternatives:
   - /agenticaiplugin:code-review <file>      Review a specific file
   - /agenticaiplugin:code-review --complete  Review entire project
   ```
   STOP execution.

4. **If changes detected:**
   - Display list of changed files
   - Proceed with code-reviewer agent

### Mode 2: File Parameter

When called with a file path (not `--complete`):

1. **Validate file exists:**
   - If not found: Report error and STOP
   - If found: Proceed with review

2. **Error message if file not found:**
   ```
   Error: File not found: {file_path}

   Please verify the file path and try again.
   ```

### Mode 3: --complete Parameter

When called with `--complete`:

1. **Display warning:**
   ```
   Complete Project Review

   This will review ALL source files in the project.
   This may take significant time for large codebases.

   Scanning for source files...
   ```

2. **Find all source files:**
   ```bash
   find . -type f \( \
     -name "*.java" -o -name "*.kt" -o -name "*.scala" -o \
     -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o \
     -name "*.go" -o -name "*.rs" -o -name "*.rb" -o -name "*.php" \
   \) \
   ! -path "*/node_modules/*" \
   ! -path "*/target/*" \
   ! -path "*/build/*" \
   ! -path "*/.git/*" \
   ! -path "*/dist/*" \
   ! -path "*/venv/*" \
   ! -path "*/__pycache__/*"
   ```

3. **Display file count:**
   ```
   Found {count} source files to review.

   Proceeding with complete project review...
   ```

4. **Proceed with code-reviewer agent**

## Execution

Once mode is determined, invoke the code-reviewer agent:

### For Git Diff Mode (Default)

```
Review all changed files in this branch compared to the main branch.

Instructions:
1. Use git diff to detect all changed files (you have built-in support for this)
2. Categorize files by type (source, test, config, docs)
3. Decide which review types to perform (Code/Test/Architecture)
4. Load all project guidelines from claudedocs/guidelines/*.md
5. Apply relevant development skills
6. Remember: Project guidelines override skill guidelines when conflicts occur
7. Generate a structured finding report organized by severity

Provide only the finding report, no code fixes.
```

### For Single File Mode

```
Review the following file for code quality issues:

File: {file_path}

Instructions:
1. Load all project guidelines from claudedocs/guidelines/*.md
2. Activate relevant development skills (development-principles, java-best-practices, etc.)
3. Review the file against all applicable rules
4. Remember: Project guidelines override skill guidelines when conflicts occur
5. Generate a structured finding report with:
   - Critical issues (must fix)
   - Warnings (should address)
   - Suggestions (optional improvements)
6. Include specific line numbers and rule references for each finding

Provide only the finding report, no code fixes.
```

### For Complete Project Mode

```
Perform a complete project review of all source files.

Files to review:
{list of files from find command}

Instructions:
1. This is a COMPLETE project review, not just changed files
2. Categorize files by type (source, test, config)
3. Perform all relevant review types (Code/Test/Architecture)
4. Load all project guidelines from claudedocs/guidelines/*.md
5. Apply relevant development skills
6. Remember: Project guidelines override skill guidelines when conflicts occur
7. Focus on critical and warning issues (skip minor suggestions for large reviews)
8. Generate a consolidated finding report organized by severity

Provide only the finding report, no code fixes.
```

## Agent Invocation

Use the Task tool with:
- **subagent_type:** `code-reviewer`
- **description:** `Review code` (or `Review changed files` / `Review project`)
- **prompt:** Mode-specific prompt from above

## After Review

1. Display the finding report to the user
2. Do NOT automatically fix issues
3. Let user decide next steps

## Important Notes

- **Git Diff mode** is the default - optimized for PR/branch reviews
- **Single File mode** is for targeted reviews of specific files
- **Complete Project mode** can be slow for large codebases - use sparingly
- The code-reviewer agent checks both project guidelines and skills
- Project-specific guidelines (claudedocs/guidelines/*.md) take precedence
