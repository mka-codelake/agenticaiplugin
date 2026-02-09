---
description: Promote workspace permissions to user level (apply across all projects)
disable-model-invocation: true
---

# Promote Permissions Command

Promotes workspace-specific permissions to user level, so they apply across all projects.

## Usage

```
/agenticaiplugin:promote-perms
```

No parameters required.

## What It Does

1. **Read Both Settings Files:**
   - Workspace: `.claude/settings.local.json` (project-specific)
   - User: `~/.claude/settings.json` (global)

2. **Compare Permissions:**
   - Find permissions in workspace that don't exist at user level
   - Identify specific commands that could become generic patterns
   - Skip project-specific permissions (containing absolute paths to current project)

3. **Present Candidates:**
   - Show promotable permissions grouped by type
   - Suggest generic patterns where applicable
   - Let user select which to promote

4. **Update User Settings:**
   - Add selected permissions to `~/.claude/settings.json`
   - Preserve existing user permissions

5. **Cleanup Workspace Settings:**
   - Ask user if promoted permissions should be removed from workspace
   - Remove selected permissions from `.claude/settings.local.json`
   - Keeps workspace file clean and avoids redundancy

## Example

```
User: /agenticaiplugin:promote-perms

Analyzing permissions...

Workspace: .claude/settings.local.json (15 permissions)
User: ~/.claude/settings.json (47 permissions)

Candidates for promotion:

[1] WebFetch(domain:code.claude.com)
    Status: Not in user settings
    Action: Add as-is

[2] WebFetch(domain:claudelog.com)
    Status: Not in user settings
    Action: Add as-is

[3] Skill(agenticaiplugin:git-smart-commit)
    Status: Not in user settings
    Action: Add as-is

[4] Bash(git -C /path/to/project diff --stat)
    Status: Project-specific (contains absolute path)
    Suggestion: Already covered by Bash(git diff:*) pattern
    Action: Skip (already covered)

Select permissions to promote:
> 1, 2, 3

Promoting 3 permissions to user level...

Updated: ~/.claude/settings.json
+ WebFetch(domain:code.claude.com)
+ WebFetch(domain:claudelog.com)
+ Skill(agenticaiplugin:git-smart-commit)

Remove promoted permissions from workspace settings?
> Yes

Cleaned up: .claude/settings.local.json
- WebFetch(domain:code.claude.com)
- WebFetch(domain:claudelog.com)
- Skill(agenticaiplugin:git-smart-commit)

Done! 3 permissions promoted to user level and removed from workspace.
```

## Smart Detection

The command intelligently handles different permission types:

### Direct Promotion (add as-is)
- `WebFetch(domain:*)` - Domain-based permissions
- `WebSearch` - General capabilities
- `Skill(*)` - Plugin skills
- `mcp__*` - MCP server tools
- Generic `Bash(command:*)` patterns

### Skip (project-specific)
- Permissions containing the current project's absolute path
- One-time specific commands (e.g., exact commit messages)

### Already Covered
- Specific commands already matched by user-level patterns
- Example: `Bash(git -C /path diff)` covered by `Bash(git diff:*)`

## Execution Instructions

When this command is invoked:

### Step 1: Load Settings

```javascript
// Paths
workspacePath = ".claude/settings.local.json"  // relative to project root
userPath = "~/.claude/settings.json"           // user home directory

// Load both files
workspacePerms = loadJSON(workspacePath).permissions.allow || []
userPerms = loadJSON(userPath).permissions.allow || []
```

### Step 2: Analyze Each Workspace Permission

For each permission in workspace:

1. **Check if exact match exists in user** → Skip (already global)

2. **Check if covered by user pattern:**
   - User has `Bash(git add:*)` → covers `Bash(git add file.txt)`
   - User has `Bash(mvn:*)` → covers `Bash(mvn clean install)`

3. **Check if project-specific:**
   - Contains current working directory path → Mark as project-specific
   - Contains specific commit messages → Mark as one-time

4. **Otherwise:** → Candidate for promotion

### Step 3: Categorize Candidates

Group into:
- **Promotable:** Can be added directly to user settings
- **Project-specific:** Should stay in workspace only
- **Already covered:** User pattern already handles this

### Step 4: Present to User

Show each candidate with:
- The permission string
- Why it's a candidate (not in user / not covered)
- Recommended action

Use AskUserQuestion with multiSelect to let user choose.

### Step 5: Update User Settings

For selected permissions:

1. Read current `~/.claude/settings.json`
2. Add selected permissions to `permissions.allow` array
3. Remove duplicates
4. Write back to file
5. Report what was added

### Step 6: Cleanup Workspace Settings

After promoting permissions:

1. Ask user if they want to remove promoted permissions from workspace
2. If yes:
   - Read `.claude/settings.local.json`
   - Remove the promoted permissions from `permissions.allow`
   - Write back to file
   - Report what was removed

This keeps the workspace settings clean and avoids redundant permissions that are now handled at user level.

### Pattern Matching Logic

To check if a specific command is covered by a pattern:

```
Pattern: Bash(git add:*)
Matches: Bash(git add file.txt)
         Bash(git add .)
         Bash(git add -A)

Pattern: Bash(mvn:*)
Matches: Bash(mvn clean)
         Bash(mvn test)
         Bash(mvn -q verify)
```

The `:*` suffix means "any arguments following".

## Safety

- **Read-only analysis first:** Shows what would change before doing anything
- **User confirmation required:** Nothing is modified without explicit selection
- **Cleanup is optional:** Removing from workspace requires separate confirmation
- **Backup suggestion:** Recommend backing up settings before bulk changes
- **No overwrites:** Only adds new permissions to user settings, never removes existing ones

## Related

- **/agenticaiplugin:init** - Initialize project structure
