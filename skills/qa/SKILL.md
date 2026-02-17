---
description: >
  Quality Assurance traceability management. Maintains the "Quality Square":
  bidirectional traceability between Requirements, Code, Test Cases, and Tests.
  Invoke via /agenticaiplugin:qa.
disable-model-invocation: true
context: fork
---

Quality Assurance — manages bidirectional traceability across the Quality Square (Requirements, Code, Test Cases, Tests). Analyzes only — does NOT write code or tests.

## Usage

```
/agenticaiplugin:qa [options]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Full Project** (Default) | `/agenticaiplugin:qa` | Run all 4 phases on entire project |
| **Single Phase** | `/agenticaiplugin:qa --phase 2` | Run only the specified phase (1–4) |
| **Scoped** | `/agenticaiplugin:qa --scope src/api` | Restrict analysis to a subdirectory |
| **Force Rebuild** | `/agenticaiplugin:qa --force-rebuild` | Retire existing artifacts, rebuild from scratch |

Options can be combined: `/agenticaiplugin:qa --phase 2 --scope src/api`

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags or invalid arguments** → Display the Usage section above verbatim, then STOP.
3. **`--phase` without a number or number outside 1–4** → Display the Usage section above verbatim, then STOP.
4. **`--scope` without a path or path does not exist** → Display the Usage section above verbatim, then STOP.

## Iterative Convergence

Each phase runs multiple Explore agent rounds (opus) for completeness. Round 1 discovers, Rounds 2+ review and refine with fresh context. Stops when findings converge (minimal changes) or after 5 rounds max. See `reference.md` Section 3 for the full protocol.

## Execution Flow

### Step 0: Initialization

1. Read `reference.md` and all files in `shared/`
2. Detect first-run vs subsequent-run (does `claudedocs/requirements.md` exist?)
3. If `--force-rebuild`: mark all existing entries RETIRED before proceeding
4. If `--scope`: validate path exists, restrict analysis scope

### Step 1: System Discovery (Phase 1)

Run iterative convergence loop (see reference.md Section 4):

- Round 1: Spawn `Explore` agent to discover components and external interfaces
- Round 2+: Spawn `Explore` (opus) agent to review and refine findings
- Stop when CONVERGED or round 5

Output: `claudedocs/system-view.md` (rendered from `templates/system-view.md.j2`)

### Step 2: Requirements Extraction (Phase 2)

Run iterative convergence loop (see reference.md Section 5):

- Input: system-view.md + existing requirements (if subsequent-run)
- Round 1: Spawn `Explore` agent to extract functional requirements from code
- Round 2+: Spawn `Explore` (opus) agent to review completeness
- Stop when CONVERGED or round 5

Output: `claudedocs/requirements.md` + `claudedocs/requirements/*.md` (from templates)

### Step 3: Test Cases Derivation (Phase 3)

Run iterative convergence loop (see reference.md Section 6):

- Input: requirements + existing test cases (if subsequent-run)
- Round 1: Spawn `Explore` agent to derive test cases and map existing tests
- Round 2+: Spawn `Explore` (opus) agent to review mappings
- Stop when CONVERGED or round 5

Output: `claudedocs/test-cases.md` + `claudedocs/test-cases/*.md` (from templates)
Also updates: requirements group files with TC cross-references

### Step 4: Gap Analysis (Phase 4)

Run iterative convergence loop (see reference.md Section 7):

- Input: system-view + requirements + test cases
- Round 1: Spawn `Explore` agent to cross-reference all artifacts
- Round 2+: Spawn `Explore` (opus) agent to verify gaps
- Stop when CONVERGED or round 5

Output: `claudedocs/qa-report.md` (rendered from `templates/qa-report.md.j2`)

### Step 5: Write Documents

Render all final documents from templates using converged findings. Write to `claudedocs/` directory. Ensure all cross-references are consistent (REQ→TC matches TC→REQ).

### Step 6: Summary

Display to user:

```
QA Analysis complete.

| Phase | Description | Rounds |
|-------|-------------|--------|
| 1 | System Discovery | {n} |
| 2 | Requirements Extraction | {n} |
| 3 | Test Cases Derivation | {n} |
| 4 | Gap Analysis | {n} |

Results: {req_count} requirements, {tc_count} test cases, {coverage}% coverage

Documents written:
- claudedocs/system-view.md
- claudedocs/requirements.md + {n} group files
- claudedocs/test-cases.md + {n} group files
- claudedocs/qa-report.md

Status: {DRAFT (first-run) | Updated (subsequent-run)}
```

## Skill Contents

```
skills/qa/
├── SKILL.md                        ← This file (orchestrator)
├── reference.md                    ← Detailed playbook, prompt templates, golden rules
├── shared/
│   ├── id-conventions.md           ← ID format, immutability, retirement rules
│   └── status-definitions.md       ← Status values for REQ and TC
└── templates/
    ├── system-view.md.j2           ← Component overview format
    ├── requirements-catalog.md.j2  ← Root catalog format
    ├── requirements-group.md.j2    ← Group file format
    ├── test-cases-catalog.md.j2    ← Root catalog format
    ├── test-cases-group.md.j2      ← Group file format
    └── qa-report.md.j2             ← Gap analysis report format
```

## Key Principles

- **Analyze only** — never writes code or tests, only documents
- **DRAFT marking** — all first-run content is DRAFT until user promotes it
- **Idempotent** — running twice without code changes produces the same output
- **IDs immutable** — once assigned, never changed or reused (see `shared/id-conventions.md`)
- **Lazy loading** — root catalogs reference groups only; detail files loaded on demand
- **Max 5 convergence rounds** per phase — bounded cost
- **claudedocs/guidelines/ and adrs/ are READ-ONLY** — read for context, never modify
