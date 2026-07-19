---
description: Run comprehensive architecture audit. Analyzes project structure, patterns, boundaries, naming, dependencies. Produces a rated assessment report. Invoke via /agenticaiplugin:architecture-audit.
disable-model-invocation: true
context: fork
effort: xhigh
---

Architecture audit — comprehensive assessment of a project's architectural health. You are
the **Lead Architect**. Orchestration runs as a deterministic `Workflow` script
(`audit.workflow.js`); the **overall rating is computed by exact JS arithmetic**, not by the
model. Analyzers only describe and assess — they never fix code.

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

The orchestration is a `Workflow` script. **This instruction is the opt-in** to call the
`Workflow` tool. The script is sandboxed (no file/shell access), so YOU run discovery and
tech-stack detection (need Bash/Glob) before the call and write the report after it. See
`docs/workflow-integration-howto.md`.

### Step 1: Project Discovery (you)
1. Detect repository root (`git rev-parse --show-toplevel`).
2. Generate directory tree (2-3 levels, exclude build/output/VCS dirs).
3. Categorize directories (source, test, config, docs) and count source files by type.
4. If `--scope`: verify the path exists (else error + STOP) and restrict to it.
5. **No source files found → error + STOP** (no report).
6. Assemble the **Project Structure Summary** string (orchestration.md Step 1.5).

### Step 2: Tech Stack Detection (you)
Detect manifests, primary/secondary languages, frameworks, build/test tools → assemble the
**Tech Stack Profile** string (orchestration.md Step 2.5). Also collect a `fileList` of
representative source files/dirs, and detect whether `.claude/guidelines/` and
`.claude/adrs/` exist (with `*.md`).

### Step 3: Call the Workflow

Resolve `{skill_dir}` = absolute path of this skill's directory. Call the `Workflow` tool with:
- `scriptPath`: `{skill_dir}/audit.workflow.js`
- `args`:
  ```json
  {
    "skillDir": "{skill_dir}",
    "projectStructureSummary": "…",
    "techStackProfile": "…",
    "fileList": ["src/...", "..."],
    "scope": "" ,
    "date": "YYYY-MM-DD",
    "guidelines": false,
    "adrs": false
  }
  ```

### Step 4: Render & Save the Report (you — the script returned only data)

The script returns: `{ date, scope, overallRating, overallLabel, ratings, phase1Degraded,
phase1: {patternName, confidence, rating, summary, report}, analyzers: [{key,id,name,rating,summary,report}],
synthesis: {crossCuttingThemes, strengths, concerns, recommendations} }`.

Render the **exact "Report Structure"** from `orchestration.md`:
- Executive Summary with `**Overall Rating: {overallRating}** ({overallLabel})`.
- Rating Overview table from `ratings` + each dimension's `summary` (incl. the Pattern row from `phase1.summary`).
- Architecture Pattern section = `phase1.report`; Detailed Findings = each analyzer's `report`.
- Strengths / Concerns / Recommendations from `synthesis`.
- Appendices = the Project Structure Summary and Tech Stack Profile you built in Steps 1–2.
- If `phase1Degraded` is true, note "Phase 1 failed — analyzers evaluated against general best practices."

Display the full report in the conversation **and** write it to
`claudedocs/architecture-audit-{date}.md`. Confirm: `Report saved: claudedocs/architecture-audit-{date}.md`.

Do NOT auto-fix. The audit describes and rates; the user decides next steps.

### Fallback (if the Workflow feature is unavailable or declined)

Fall back to the prompt-based orchestration in `orchestration.md` (Steps 3–6). It is a
complete specification of the same sequencing, model choice, rating calculation, and report
format.

## Skill Contents

```
skills/architecture-audit/
├── SKILL.md                          ← This file (orchestrator command)
├── audit.workflow.js                 ← Deterministic Workflow orchestration (primary path)
├── orchestration.md                  ← Rules spec + prompt-based fallback, report structure
├── shared/
│   ├── analyzer-output-format.md     ← Standard output format (mirrored by the script schema)
│   └── rating-scale.md              ← Rating definitions (A-E) + weighting + rounding rule
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
- **Overall rating is exact JS math** (01 & 03 weighted 2×, N/A excluded, A=5…E=1, rounded half-up) — identical inputs always yield the identical grade
- **Project guidelines** (`.claude/guidelines/*.md`) provide context; **ADRs** (`.claude/adrs/`) are respected
- **Phase 1 → Phase 2** sequencing ensures analyzers know what pattern to evaluate against
- **Consolidation stage** (cross-cutting themes, deduped strengths/concerns, 3-5 recommendations) runs as a dedicated agent so the full analyzer reports never flood the orchestrator context
- If an analyzer fails it becomes N/A and the audit continues; if Phase 1 fails, Phase 2 evaluates against general best practices
- After audit: display + save report, do NOT auto-fix
