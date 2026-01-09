---
name: git-smart-commit
description: |
  🚫 MANDATORY for ALL git commits. NEVER run 'git commit' directly - ALWAYS invoke this skill first.
  Analyzes uncommitted changes, groups them logically, creates meaningful commit messages.
  TRIGGER WORDS: commit, committe, committen, git commit, push (if uncommitted changes exist), einchecken, stage and commit.
  This skill REPLACES manual git commit commands.
user-invocable: true
allowed-tools:
  - Bash(git:*)
  - Read
  - Glob
  - Grep
---

# ⚠️ CRITICAL: This skill REPLACES git commit

**DO NOT run `git commit` directly. ALWAYS use this skill instead.**

When user says "commit", "committe", "committen", "einchecken", or wants to commit changes:
1. STOP - Do not run git commit
2. INVOKE this skill
3. Follow the skill's process below

This is NOT optional guidance - it is a MANDATORY workflow replacement.

---

# Your role

You intelligently analyze uncommitted changes in git repositories, group them into logical atomic commits, and create meaningful commit messages following project conventions and conventional commit standards.

## When to activate (PROACTIVE)

Use this skill PROACTIVELY whenever:
- ✅ User says **"commit"** or **"commit changes"**
- ✅ User says **"make commit"** or **"create commit"**
- ✅ User says **"git commit"** or **"stage and commit"**
- ✅ User mentions **committing** or **staging changes**
- ✅ User asks to **analyze uncommitted changes** for committing
- ✅ User wants to **create commits** or **save changes to git**

## Core Functionality

### Change Analysis
- Examine all modified, added, and deleted files
- Understand the nature and purpose of changes
- Categorize modifications by type and scope

### Logical Grouping
- Separate changes into coherent, atomic commits
- Group related file changes together
- Isolate different features, fixes, and documentation
- Keep commits atomic and focused

### Smart Message Generation
- Follow detected project conventions from git history
- Use conventional commit format when no pattern exists
- Include descriptive summaries explaining intent
- Maintain consistency with existing commit style

## Process

### 1. Analyze Git History Pattern

Review recent commits to detect project conventions:
```bash
git log --oneline -20
```

Detect patterns:
- Prefix format (feat:, fix:, docs:, etc.)
- Message style (imperative, past tense, etc.)
- Scope usage (feat(api):, fix(auth):, etc.)
- Footer conventions (BREAKING CHANGE, Closes #123, etc.)

### 2. Examine Current Changes

Identify all uncommitted changes:
```bash
git status
git diff
git diff --staged
```

Categorize changes:
- New features
- Bug fixes
- Documentation updates
- Refactoring
- Tests
- Configuration

**Error Handling:**
- Warn about uncommitted merge conflicts
- Handle partially staged changes appropriately
- Detect and warn about large binary files

### 3. Group Changes Logically

Separate unrelated changes into distinct commits:
- One logical change per commit
- Related files grouped together
- Avoid mixing features with fixes
- Keep documentation changes separate (unless directly related)

**Example grouping:**
```
Group 1: feat: add user profile endpoint
- src/api/user.js (new endpoint)
- src/routes/user.js (route registration)

Group 2: fix: resolve authentication timeout
- src/auth/middleware.js (timeout fix)

Group 3: docs: update API documentation
- README.md (API section)
```

### 4. Generate Commit Messages

Follow detected project patterns or use conventional commits:

**Conventional Commit Format:**
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Message Guidelines:**
- Use imperative mood ("add" not "added")
- Capitalize first letter of description
- No period at end of description
- Body explains "why" not "what"
- Reference issues in footer (Closes #123)

### 5. Execute Commits

Create commits for each logical group:
```bash
git add <files for group 1>
git commit -m "<message 1>"

git add <files for group 2>
git commit -m "<message 2>"
```

Maintain clean git history with atomic, focused commits.

## Supported Commit Prefixes

Use conventional commit types:

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

**With scope (optional):**
```
feat(api): add user profile endpoints
fix(auth): resolve null pointer exception
docs(readme): update installation instructions
```

## Output Format

```
Analyzing changes...
Pattern detected: [conventional commits with scope]

Proposed commits:

1. feat(api): add user profile management endpoints
   Files:
   - src/api/profile.js
   - src/routes/profile.js
   - src/models/user.js

2. fix(auth): resolve authentication timeout issue
   Files:
   - src/auth/middleware.js

3. docs(readme): update API documentation for profile endpoints
   Files:
   - README.md

Create these commits? [Proceed with commit creation]
```

## Example Scenario

**User request:** "Commit my changes"

**Skill actions:**

1. **Analyze git log:**
   ```
   Recent commits use pattern: "feat:", "fix:", "docs:"
   ```

2. **Examine changes:**
   ```
   Modified: src/api/user.js (new endpoint)
   Modified: src/api/auth.js (bug fix)
   Modified: README.md (documentation)
   ```

3. **Group logically:**
   ```
   Group 1: New feature (user.js)
   Group 2: Bug fix (auth.js)
   Group 3: Documentation (README.md)
   ```

4. **Generate messages:**
   ```
   feat: add user profile management endpoints
   fix: resolve null pointer in authentication
   docs: update API documentation
   ```

5. **Execute commits:**
   ```bash
   git add src/api/user.js
   git commit -m "feat: add user profile management endpoints"

   git add src/api/auth.js
   git commit -m "fix: resolve null pointer in authentication"

   git add README.md
   git commit -m "docs: update API documentation"
   ```

## Important Notes

- **History-Aware**: Adapts to existing project conventions automatically
- **Atomic Commits**: Each commit represents one logical change
- **Non-Destructive**: Never forces commits or overwrites history
- **Pattern Recognition**: Learns from repository's commit history (git log)
- **Conventional Commits**: Falls back to standard prefixes when no pattern detected
- **Multiple Small Commits**: Preferred over one large mixed-purpose commit
- **Rollback Safe**: Provides rollback instructions if commits fail
- **Conflict Detection**: Warns about merge conflicts before committing
- **Binary File Warning**: Detects and warns about large binary files

## Best Practices

1. **Always analyze git history first** - maintain consistency
2. **Keep commits atomic** - one logical change per commit
3. **Write descriptive messages** - explain "why" not "what"
4. **Group related changes** - files that belong together
5. **Separate concerns** - features, fixes, docs should be separate commits
6. **Follow conventions** - use detected project patterns
7. **Reference issues** - add "Closes #123" in footer when applicable
8. **Avoid mixing** - don't mix refactoring with new features
