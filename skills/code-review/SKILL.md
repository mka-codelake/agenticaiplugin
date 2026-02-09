---
description: Run intelligent code review with specialist team (git diff, single file, or full project)
disable-model-invocation: true
---

Perform a multi-specialist code review. You are the **Chief Architect / Team Lead** orchestrating focused review specialists.

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

# Review entire project
/agenticaiplugin:code-review --complete
```

---

## Step 1: Determine Mode & Get Files

### Mode 1: No Parameter (Git Diff - Default)

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

3. **If no changes:** Display "No changes detected" message and STOP.

4. **Get diff content for specialists:**
   ```bash
   git diff origin/${default_branch}...HEAD
   ```

### Mode 2: File Parameter

1. Validate file exists. If not found: error and STOP.
2. Read file content for specialists.

### Mode 3: --complete Parameter

1. Display warning about review time for large codebases.
2. Find all source files (exclude node_modules, target, build, .git, dist, venv, __pycache__).
3. Read file contents for specialists.

---

## Step 2: Categorize Files & Analyze Changes

Categorize all files to review:

**Source Files:** `*.java`, `*.kt`, `*.scala`, `*.py`, `*.js`, `*.ts`, `*.tsx`, `*.go`, `*.rs`, `*.rb`, `*.php` (excluding test files)

**Test Files:** `*Test.java`, `*Tests.java`, `test_*.py`, `*.test.js`, `*.spec.ts`, files in `test/` or `__tests__/` directories

**Config Files:** `pom.xml`, `build.gradle`, `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `*.yaml`, `*.yml`, `*.properties`

**Documentation Files:** `*.md`, `*.txt`, `*.adoc`, `docs/**`, `README.*`

**Analyze patterns:**
- Count affected layers (controller, service, repository, entity, model)
- Detect security-relevant patterns in diff (password, secret, token, api_key, @Query)
- Detect dependency file changes

Display analysis:
```
Change Analysis:
- Source files: {count} ({list})
- Test files: {count} ({list})
- Config files: {count} ({list})
- Docs files: {count} ({list})
- Layers affected: {count}
- New dependencies: {yes/no}
```

---

## Step 3: Select Specialists

Based on change analysis, select which specialists to activate. Read `orchestration.md` for the full activation matrix.

**Quick reference:**

| Condition | Specialists to Activate |
|-----------|------------------------|
| ALWAYS | 1 (Dependencies & Versions) |
| Source files modified | 2 (Security), 4 (Patterns), 5 (SOLID), 6 (Quality), 7 (Dead Code), 8 (Cross-Cutting) |
| 3+ layers OR new deps | 3 (Architecture) |
| Test files modified | 9 (Test Quality) |
| Source files modified | 10 (Test Completeness) |
| ONLY docs/config | Skip all → "No code review needed" and STOP |

Display selection:
```
Specialists Selected:
- Phase 1: [1] Dependencies & Versions
- Phase 2: [2] Security, [4] Design Patterns, [5] SOLID, [6] Code Quality, [7] Dead Code, [8] Cross-Cutting, [10] Test Completeness
- Skipped: [3] Architecture (only 2 layers), [9] Test Quality (no test files changed)
```

---

## Step 4: Execute Phase 1 (Sequential)

Spawn Specialist 1 (Dependencies & Versions) and wait for completion.

**Use the Task tool with:**
- **subagent_type:** `general-purpose`
- **model:** `haiku`
- **description:** `Review dependencies and versions`
- **prompt:** Build from template in orchestration.md, including:
  - Path to specialist rules: `skills/code-reviewer/specialists/01-dependencies-versions.md`
  - Path to output format: `skills/code-reviewer/shared/specialist-output-format.md`
  - Path to severity definitions: `skills/code-reviewer/shared/issue-classification.md`
  - Project guidelines path (if exists): `claudedocs/guidelines/*.md`
  - File list and diff content

Capture Phase 1 results for Phase 2 context.

---

## Step 5: Execute Phase 2 (Parallel)

Spawn ALL applicable Phase 2 specialists **in a single message** using multiple Task tool calls. This runs them concurrently.

**For each specialist, use the Task tool with:**
- **subagent_type:** `general-purpose`
- **model:** `haiku`
- **description:** `Review {specialist_area}`
- **prompt:** Build from template in orchestration.md, including:
  - Path to specialist rules: `skills/code-reviewer/specialists/{NN-name}.md`
  - Path to output format: `skills/code-reviewer/shared/specialist-output-format.md`
  - Path to severity definitions: `skills/code-reviewer/shared/issue-classification.md`
  - Project guidelines path (if exists): `claudedocs/guidelines/*.md`
  - Phase 1 results summary (version context)
  - File list and diff content

**IMPORTANT:** Launch all Phase 2 specialists in ONE message to maximize parallelism.

---

## Step 6: Consolidate Report

After all specialists complete, consolidate per orchestration.md:

1. **Collect** all specialist results
2. **Merge** findings into single list
3. **Deduplicate** same file:line flagged by multiple specialists (keep higher severity)
4. **Sort** by severity: Critical → Warning → Suggestion
5. **Group** by specialist category within severity
6. **Handle failures:** If a specialist failed, note it in report

---

## Step 7: Output Report

### Summary Table (for quick scanning)

```
## Code Review Findings Summary

| Severity | File | Finding | Specialist |
|----------|------|---------|------------|
| CRITICAL | ApiClient.java:12 | Hardcoded API key | Security |
| WARNING | OrderService.java:156 | Missing null check | Code Quality |
| SUGGESTION | Config.java:12 | Consider @Value | Dependencies |

**Summary:** 1 Critical, 1 Warning, 1 Suggestion
**Specialists activated:** {N}/10
```

### Full Report

```
## Code Review Report

**Files Reviewed:** {count}
**Specialists Activated:** {count}/10
**Phase 1:** Dependencies & Versions
**Phase 2:** {list}
**Project Guidelines:** {found or "None"}

---

### Critical Issues
#### {Specialist Category}
- [{File}:{Line}] {Description}
  **Rule:** {reference}
  **Fix:** {direction}

### Warnings
#### {Specialist Category}
- [{File}:{Line}] {Description}
  **Rule:** {reference}
  **Impact:** {why it matters}
  **Fix:** {direction}

### Suggestions
#### {Specialist Category}
- [{File}:{Line}] {Description}
  **Benefit:** {what would improve}

---

### Summary
- **Critical:** {count}
- **Warnings:** {count}
- **Suggestions:** {count}
- **Overall Assessment:** {brief assessment}

### Specialist Results
| Specialist | Findings | Status |
|------------|----------|--------|
| Dependencies & Versions | {counts} | {status} |
| ... | ... | ... |
```

---

## After Review

1. Display the finding report to the user
2. Do NOT automatically fix issues
3. Let user decide next steps

## Important Notes

- **Git Diff mode** is the default — optimized for PR/branch reviews
- **Single File mode** is for targeted reviews of specific files
- **Complete Project mode** can be slow for large codebases — use sparingly
- **Project guidelines** (claudedocs/guidelines/*.md) always override skill guidelines
- **Phase 1 → Phase 2** sequencing ensures version context is available
- **Parallel Phase 2** execution minimizes total review time
- If a specialist fails, the review continues with remaining results
- **Every specialist researches current standards** for the detected tech stack (language, framework, libraries) via WebSearch/Context7 BEFORE reviewing. This ensures reviews reflect up-to-date best practices, not outdated patterns.
- **Specialists only collect findings** — they never fix code, generate patches, or modify files
