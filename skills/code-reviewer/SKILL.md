---
description: Code review criteria, specialist rules, and shared guidelines for the multi-specialist review architecture. Auto-activates when code-review command spawns specialists.
user-invocable: false
---

# Code Reviewer Skill

This skill provides review criteria and guidelines for the multi-specialist code review architecture.

## Purpose

Supports intelligent, team-based code reviews where focused specialists each apply a subset of review rules. The orchestrator (code-review command) spawns specialists as sub-agents via Task tool.

## Architecture

```
code-review/SKILL.md (Orchestrator)
    │
    ├── Phase 1: Specialist 1 (Dependencies & Versions) - Sequential
    │
    └── Phase 2: Specialists 2-10 (applicable ones) - Parallel
```

## Specialist Rules

10 focused specialists in `specialists/`:

| # | File | Focus | ~Rules |
|---|------|-------|--------|
| 1 | `01-dependencies-versions.md` | Dependency currency, framework modernization | ~8 |
| 2 | `02-security-data-safety.md` | Credentials, injection, XSS, validation, data loss | ~6 |
| 3 | `03-architecture-layers.md` | Layer violations, circular deps, ADR, API design | ~19 |
| 4 | `04-design-patterns.md` | GoF patterns, trigger matrix, consistency | ~16 |
| 5 | `05-solid-code-smells.md` | SOLID, Feature Envy, God Class, naming | ~25 |
| 6 | `06-code-quality-correctness.md` | YAGNI, SRP, size, logic, behavioral changes | ~25 |
| 7 | `07-dead-code-duplication.md` | Unused code, DRY violations, commented code | ~16 |
| 8 | `08-cross-cutting-concerns.md` | Error handling, logging, validation consistency | ~10 |
| 9 | `09-test-quality.md` | Framework testing violations, AAA, naming, placement | ~11 |
| 10 | `10-test-completeness-infra.md` | Infrastructure tests, E2E coverage, traceability | ~17 |

## Shared Guidelines

Shared resources applicable to all specialists:

- **shared/issue-classification.md** — Severity definitions (Critical/Warning/Suggestion) and decision tree
- **shared/best-practices.md** — Review quality guidelines (accuracy, actionability, context awareness)
- **shared/specialist-output-format.md** — Standard output format all specialists must follow

## How It Works

1. User runs `/agenticaiplugin:code-review`
2. SKILL.md (code-review) acts as orchestrator
3. Orchestrator analyzes changes and selects applicable specialists
4. Phase 1: Dependencies & Versions specialist runs (provides version context)
5. Phase 2: All applicable specialists run in parallel via Task tool
6. Orchestrator consolidates, deduplicates, and sorts findings
7. Final report presented to user

## Auto-Activation

This skill activates automatically when specialists need to read review criteria. No manual activation required.
