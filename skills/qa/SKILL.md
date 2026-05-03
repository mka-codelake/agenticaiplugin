---
description: >
  Quality Assurance traceability management. Maintains the "Quality Square":
  bidirectional traceability between Requirements, Code, Test Cases, and Tests.
  Invoke via /agenticaiplugin:qa.
disable-model-invocation: true
context: fork
effort: xhigh
---

Quality Assurance — manages bidirectional traceability across the Quality Square (Requirements, Code, Test Cases, Tests). Analyzes only — does NOT write code or tests.

## Usage

```
/agenticaiplugin:qa [options]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Full Project** (Default) | `/agenticaiplugin:qa` | Run all 4 phases on entire project |
| **Force Rebuild** | `/agenticaiplugin:qa --force-rebuild` | Retire existing artifacts, rebuild from scratch |

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags or invalid arguments** → Display the Usage section above verbatim, then STOP.

## Phase Delegation

Each phase is delegated to an independent Phase Agent (`general-purpose`, `sonnet`) that manages its own convergence loop internally. Each Phase Agent spawns `Explore` (`opus`) rounds for deep codebase analysis, writes its output files, and returns only a brief summary to the orchestrator. This keeps the orchestrator's context lightweight. See `reference.md` Section 3 for the full architecture.

## Execution Flow

### Step 0: Initialization

1. Read `reference.md` and all files in `shared/`
2. Note the absolute path of this skill's directory — referred to as `{skill_dir}` below. Pass this path to all Phase Agents.
3. Detect first-run vs subsequent-run:
   - Check if `claudedocs/requirements.md` exists
   - Check if `claudedocs/test-cases.md` exists
   - If either exists: **validate QA structure** (see reference.md Section 2 — Structure Validation)
   - If structure is incompatible: ask user via `AskUserQuestion` (migrate / overwrite / abort)
   - Each file is evaluated independently
4. If `--force-rebuild`: mark all existing entries RETIRED before proceeding

### Step 1: System Discovery (Phase 1)

Spawn Phase Agent (`general-purpose`, `sonnet`). Construct the prompt from `reference.md` Section 4 — Phase Agent Prompt template.

Pass to the agent:
- `{skill_dir}`: absolute path to this skill's directory

Expect back: `PHASE_SUMMARY` with `output_files` and stats (`components`, `interfaces`).

### Step 2: Requirements Extraction (Phase 2)

Spawn Phase Agent (`general-purpose`, `sonnet`). Construct the prompt from `reference.md` Section 5 — Phase Agent Prompt template.

Pass to the agent:
- `{skill_dir}`: absolute path to this skill's directory
- `{run_mode}`: first-run or subsequent-run (detected in Step 0)
- `{force_rebuild}`: whether `--force-rebuild` was specified

Expect back: `PHASE_SUMMARY` with stats (`requirements`, `new`, `groups`).

### Step 3: Test Cases Derivation (Phase 3)

Spawn Phase Agent (`general-purpose`, `sonnet`). Construct the prompt from `reference.md` Section 6 — Phase Agent Prompt template.

Pass to the agent:
- `{skill_dir}`: absolute path to this skill's directory
- `{run_mode}`: first-run or subsequent-run (detected in Step 0)
- `{force_rebuild}`: whether `--force-rebuild` was specified

Expect back: `PHASE_SUMMARY` with stats (`test_cases`, `new`, `covered`, `uncovered`, `groups`).

### Step 4: Gap Analysis (Phase 4)

Spawn Phase Agent (`general-purpose`, `sonnet`). Construct the prompt from `reference.md` Section 7 — Phase Agent Prompt template.

Pass to the agent:
- `{skill_dir}`: absolute path to this skill's directory

Expect back: `PHASE_SUMMARY` with stats (`gaps_by_category`, `coverage_pct`).

### Step 5: Summary

Assemble the final report from the 4 Phase Summaries. Display to user:

```
QA Analysis complete.

| Phase | Description | Rounds |
|-------|-------------|--------|
| 1 | System Discovery | {from Phase 1 summary} |
| 2 | Requirements Extraction | {from Phase 2 summary} |
| 3 | Test Cases Derivation | {from Phase 3 summary} |
| 4 | Gap Analysis | {from Phase 4 summary} |

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
- **Phase isolation** — each phase runs in its own agent, only summaries return to orchestrator
- **claudedocs/guidelines/ and adrs/ are READ-ONLY** — read for context, never modify
