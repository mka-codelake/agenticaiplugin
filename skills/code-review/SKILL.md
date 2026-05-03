---
description: Run intelligent, multi-specialist code review. Analyzes changes, spawns focused review specialists (security, architecture, SOLID, code quality, tests, etc.), consolidates findings. Invoke via /agenticaiplugin:code-review.
effort: xhigh
---

Multi-specialist code review. You are the **Chief Architect** orchestrating 11 focused review specialists.

Specialists only collect findings — they never fix code.

## Usage

```
/agenticaiplugin:code-review [<file>|--complete|--renovate]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Git Diff** (Default) | `/agenticaiplugin:code-review` | Review uncommitted changes |
| **Single File** | `/agenticaiplugin:code-review <file>` | Review a specific file |
| **Complete Project** | `/agenticaiplugin:code-review --complete` | Review all source files |
| **Dependency Audit** | `/agenticaiplugin:code-review --renovate [--stack jvm\|js\|python] [--quick] [--save]` | Full dependency audit |

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags or invalid arguments** → Display the Usage section above verbatim, then STOP.

**Valid arguments:**
- No argument → Git Diff mode
- `<file>` → path to an existing file (validate it exists)
- `--complete` → full project review
- `--renovate` → dependency audit, with optional: `--stack jvm|js|python`, `--quick`, `--save`

**Invalid examples:** `--foo`, unknown flags, `--complete --renovate` (mutually exclusive), `--complete <file>` (mutually exclusive).

## Execution Flow

### Step 1: Determine Mode & Get Files

**Git Diff (no parameter):**
1. Get changed files:
   ```bash
   git diff --name-only HEAD
   git diff --name-only --staged
   git ls-files --others --exclude-standard
   ```
   Combine all three lists (deduplicated) into the file list.
2. **WAIT for step 1 to complete.** If no changes found: display "No uncommitted changes detected" and STOP.
3. **Only after step 1 succeeds:** Get combined diff: `git diff HEAD` (includes both staged and unstaged changes)

**Single File:** Validate file exists. If not found: error and STOP.

**--complete:** Find all source files (exclude node_modules, target, build, .git, dist, venv, __pycache__).

**--renovate:** See "Dependency Audit Flow" section in `orchestration.md`. Runs only Specialist 1 in expanded mode against ALL project dependencies.

### Steps 2-7: Orchestration (Git Diff / Single File / --complete only)

Read `orchestration.md` for the full orchestration playbook:
- **Step 2:** Categorize files (source, test, config, docs) and analyze change patterns
- **Step 3:** Select specialists based on activation matrix
- **Step 4:** Execute Phase 1 — Dependencies & Versions (sequential)
- **Step 5:** Execute Phase 2 — All applicable specialists (parallel, in ONE message)
- **Step 6:** Consolidate, deduplicate, and sort findings
- **Step 7:** Output summary table + full report, save to `claudedocs/code-review-result.md`

## Skill Contents

```
skills/code-review/
├── SKILL.md                    ← This file (orchestrator command)
├── orchestration.md            ← Detailed playbook, prompt templates, report format
├── shared/
│   ├── issue-classification.md ← Severity definitions (Critical/Warning/Suggestion)
│   ├── best-practices.md       ← Review quality guidelines
│   ├── specialist-output-format.md ← Standard output format for specialists
│   └── known-deprecations.md   ← Registry APIs, manifest detection, WebSearch patterns
└── specialists/                ← 11 focused review rule sets
    ├── 01-dependencies-versions.md    (Phase 1 — always)
    ├── 02-security-data-safety.md     (Phase 2 — source files)
    ├── 03-architecture-layers.md      (Phase 2 — 3+ layers / new deps)
    ├── 04-design-patterns.md          (Phase 2 — source files)
    ├── 05-solid-code-smells.md        (Phase 2 — source files)
    ├── 06-code-quality-correctness.md (Phase 2 — source files)
    ├── 07-dead-code-duplication.md    (Phase 2 — source files)
    ├── 08-cross-cutting-concerns.md   (Phase 2 — source files)
    ├── 09-test-quality.md             (Phase 2 — test files)
    ├── 10-test-completeness-infra.md  (Phase 2 — source files)
    └── 11-documentation-comments.md    (Phase 2 — source files)
```

## Key Principles

- **Project guidelines** (`claudedocs/guidelines/*.md`) always override skill rules
- **Every specialist researches current standards** (language, framework, libraries) via WebSearch/Context7 before reviewing
- **Phase 1 → Phase 2** sequencing ensures version context is available to all specialists
- **Parallel Phase 2** execution minimizes total review time
- If a specialist fails, the review continues with remaining results
- After review: display findings, do NOT auto-fix, let user decide
- Review report is always saved to `claudedocs/code-review-result.md` (overwritten each run)
