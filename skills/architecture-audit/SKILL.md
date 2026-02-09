---
description: Run comprehensive architecture audit. Analyzes project structure, patterns, boundaries, naming, dependencies. Produces a rated assessment report. Invoke via /agenticaiplugin:architecture-audit.
disable-model-invocation: true
context: fork
---

Architecture audit — comprehensive assessment of a project's architectural health. You are the **Lead Architect** producing a structured assessment report.

Analyzers only describe and assess — they never fix code.

## Usage

```
/agenticaiplugin:architecture-audit [--scope <path>]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Full Project** (Default) | `/agenticaiplugin:architecture-audit` | Audit entire project architecture |
| **Scoped** | `/agenticaiplugin:architecture-audit --scope src/backend` | Audit a subdirectory (monorepos) |

Report is saved as `claudedocs/architecture-audit-YYYY-MM-DD.md`.

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags or invalid arguments** → Display the Usage section above verbatim, then STOP.

**Valid arguments:**
- No argument → Full project audit
- `--scope <path>` → path must be provided and must exist

**Invalid examples:** `--scope` without a path, unknown flags like `--foo`.

## Execution Flow

### Step 1: Project Discovery (You)
1. Detect repository root (`git rev-parse --show-toplevel`)
2. Generate directory tree (2-3 levels, exclude build/output/VCS directories)
3. Categorize directories (source, test, config, docs)
4. Count source files by type
5. If `--scope`: restrict to the specified path

### Step 2: Tech Stack Detection (You)
1. Detect manifest files (pom.xml, package.json, requirements.txt, go.mod, Cargo.toml, *.csproj, etc.)
2. Determine primary language(s) from file extensions
3. Identify framework(s) from dependencies
4. Identify build tools and test frameworks

### Step 3: Phase 1 — Pattern Recognition (Sequential)
Spawn Analyzer 01 via Task tool (`general-purpose`, `model: sonnet`).
Provides: Project Structure Summary + Tech Stack Profile.
Returns: Detected pattern, confidence level, expected architecture rules.

**Must complete before Phase 2** — all Phase 2 analyzers need the detected pattern.

### Step 4: Phase 2 — Parallel Analyzers
Spawn Analyzers 02-07 in **one message** (6 parallel Task calls, `general-purpose`).
Model per analyzer: `sonnet` for multi-file reasoning (02, 03, 05, 06), `haiku` for rule-based (04, 07).
Each receives: Project Structure Summary + Tech Stack Profile + Phase 1 results.

### Step 5: Consolidation & Rating
Collect all 7 analyzer outputs. Calculate weighted overall rating. Identify cross-cutting themes. Generate executive summary, consolidated strengths, concerns, and recommendations.

### Step 6: Report
Display the full report in the conversation. Save to `claudedocs/architecture-audit-YYYY-MM-DD.md`.

Read `orchestration.md` for the full orchestration playbook including prompt templates, report structure, and error handling.

## Skill Contents

```
skills/architecture-audit/
├── SKILL.md                          ← This file (orchestrator command)
├── orchestration.md                  ← Detailed playbook, prompt templates, report format
├── shared/
│   ├── analyzer-output-format.md     ← Standard output format for all analyzers
│   └── rating-scale.md              ← Rating definitions (A-E scale)
└── analyzers/
    ├── 01-pattern-recognition.md     (Phase 1 — sequential)
    ├── 02-component-boundaries.md    (Phase 2 — parallel)
    ├── 03-dependency-direction.md    (Phase 2 — parallel)
    ├── 04-naming-consistency.md      (Phase 2 — parallel)
    ├── 05-api-interface-boundaries.md (Phase 2 — parallel)
    ├── 06-instantiation-wiring.md    (Phase 2 — parallel)
    └── 07-structural-visibility.md   (Phase 2 — parallel)
```

## Key Principles

- **Audit describes, assesses, and rates** — it does not demand changes
- **Project guidelines** (`claudedocs/guidelines/*.md`) provide context for evaluation
- **ADRs** (`claudedocs/adrs/`) are respected as documented architecture decisions
- **Language-agnostic** — detects stack-specific patterns but applies universal architecture principles
- **Phase 1 → Phase 2** sequencing ensures analyzers know what pattern to evaluate against
- **Parallel Phase 2** minimizes total audit time
- If an analyzer fails, the audit continues with remaining results
- After audit: display report, do NOT auto-fix, let user decide next steps
