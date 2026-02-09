---
description: Run intelligent, multi-specialist code review. Analyzes changes, spawns focused review specialists (security, architecture, SOLID, code quality, tests, etc.), consolidates findings. Invoke via /agenticaiplugin:code-review.
disable-model-invocation: true
---

Multi-specialist code review. You are the **Chief Architect** orchestrating 10 focused review specialists.

Specialists only collect findings — they never fix code.

## Usage

```
/agenticaiplugin:code-review [<file>|--complete|--renovate]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Git Diff** (Default) | `/agenticaiplugin:code-review` | Review changed files vs. main branch |
| **Single File** | `/agenticaiplugin:code-review <file>` | Review a specific file |
| **Complete Project** | `/agenticaiplugin:code-review --complete` | Review all source files |
| **Dependency Audit** | `/agenticaiplugin:code-review --renovate [--stack jvm\|js\|python] [--quick] [--save]` | Full dependency audit |

## Execution Flow

### Step 1: Determine Mode & Get Files

**Git Diff (no parameter):**
1. Detect default branch:
   ```bash
   default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
   if [ -z "$default_branch" ]; then
     if git show-ref --verify --quiet refs/remotes/origin/main; then default_branch="main"
     elif git show-ref --verify --quiet refs/remotes/origin/master; then default_branch="master"; fi
   fi
   ```
2. Get changed files: `git diff --name-only origin/${default_branch}...HEAD`
3. If no changes: display "No changes detected" and STOP
4. Get diff: `git diff origin/${default_branch}...HEAD`

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
- **Step 7:** Output summary table + full report

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
└── specialists/                ← 10 focused review rule sets
    ├── 01-dependencies-versions.md    (Phase 1 — always)
    ├── 02-security-data-safety.md     (Phase 2 — source files)
    ├── 03-architecture-layers.md      (Phase 2 — 3+ layers / new deps)
    ├── 04-design-patterns.md          (Phase 2 — source files)
    ├── 05-solid-code-smells.md        (Phase 2 — source files)
    ├── 06-code-quality-correctness.md (Phase 2 — source files)
    ├── 07-dead-code-duplication.md    (Phase 2 — source files)
    ├── 08-cross-cutting-concerns.md   (Phase 2 — source files)
    ├── 09-test-quality.md             (Phase 2 — test files)
    └── 10-test-completeness-infra.md  (Phase 2 — source files)
```

## Key Principles

- **Project guidelines** (`claudedocs/guidelines/*.md`) always override skill rules
- **Every specialist researches current standards** (language, framework, libraries) via WebSearch/Context7 before reviewing
- **Phase 1 → Phase 2** sequencing ensures version context is available to all specialists
- **Parallel Phase 2** execution minimizes total review time
- If a specialist fails, the review continues with remaining results
- After review: display findings, do NOT auto-fix, let user decide
