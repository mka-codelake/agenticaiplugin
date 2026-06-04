---
description: Run intelligent, multi-specialist code review. Analyzes changes, spawns focused review specialists (security, architecture, SOLID, code quality, tests, etc.), adversarially verifies findings, consolidates. Invoke via /agenticaiplugin:code-review.
effort: xhigh
---

Multi-specialist code review. You are the **Chief Architect**. Orchestration runs as a
deterministic `Workflow` script (`review.workflow.js`) that detects findings, runs an
**adversarial verify pass** to drop false positives, and consolidates deterministically.

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

The orchestration is a `Workflow` script. **This instruction is the opt-in** to call the
`Workflow` tool. The script is sandboxed (no file/shell access), so YOU gather all inputs
before the call and write the report after it. See `docs/workflow-integration-howto.md`.

### Step 1: Determine Mode & Gather Inputs (you do this — the script cannot)

Resolve `{skill_dir}` = absolute path of this skill's directory. The script is at
`{skill_dir}/review.workflow.js`.

**Git Diff (no parameter):**
1. `git diff --name-only HEAD`, `git diff --name-only --staged`, `git ls-files --others --exclude-standard` → combine, dedupe → `files`.
2. If no changes: display "No uncommitted changes detected" and STOP.
3. `git diff HEAD` → `diff` (staged + unstaged).

**Single File:** validate the file exists (else error + STOP); `files = [path]`, `diff = null`, `mode = "single-file"`.

**--complete:** find all source files (exclude `node_modules`, `target`, `build`, `.git`, `dist`, `venv`, `__pycache__`) → `files`, `diff = null`, `mode = "complete"`.

**--renovate:** `mode = "renovate"`. Detect manifest files via Glob (patterns in `shared/known-deprecations.md`) → `manifests`. If none: error + STOP. If `--stack` given but not detected: error + STOP. Set `flags = { stack?, quick?, save? }`.

**Compute `ctx`** (this makes the activation matrix deterministic in the script):
- `source`: at least one changed file is a source file (not test/docs/config).
- `tests`: at least one changed file is a test file.
- `layers`: number of distinct architectural layers touched (e.g. controller/service/repository/domain/infra, or distinct top-level module dirs). Integer.
- `newDeps`: a manifest file (pom.xml, build.gradle, package.json, requirements.txt, pyproject.toml, go.mod, …) is among the changed files, or the diff adds dependency entries.
- `guidelines`: `claudedocs/guidelines/` exists and contains `*.md`.
- `adrs`: `claudedocs/adrs/` exists and contains `*.md`.

Also set `date` = today's date `YYYY-MM-DD`.

### Step 2: Call the Workflow

Call the `Workflow` tool with:
- `scriptPath`: `{skill_dir}/review.workflow.js`
- `args`:
  ```json
  {
    "mode": "diff|single-file|complete|renovate",
    "skillDir": "{skill_dir}",
    "files": ["..."],
    "diff": "<unified diff or null>",
    "ctx": { "source": true, "tests": false, "layers": 3, "newDeps": false, "guidelines": false, "adrs": false },
    "flags": { "stack": "js", "quick": false, "save": true },
    "manifests": ["package.json"],
    "date": "YYYY-MM-DD"
  }
  ```

### Step 3: Render & Save the Report (you do this — the script returned only data)

The script returns structured data: `{ findings, lowConfidence, dropped, activated, perSpecialist, phase1Status, note?, renovate? }`.
Each finding: `{ severity, file, line, description, rule, fix?, impact?, benefit?, specialist, alsoFlaggedBy?, confidence?, originalSeverity? }`.

- `findings` = verified survivors only → render as the main report.
- `lowConfidence` = Criticals the verifiers refused to confirm. They are **excluded from the
  main findings** (so they are not presented as confirmed) but **never silently dropped** —
  list them in an auditable "Low-confidence (verifiers could not confirm)" section.
- `dropped` = Warnings the verifiers refuted (verified false positives) — optionally list under
  an auditable "Dropped" note.

Render the report in the **exact format** from `orchestration.md` (Step 5 summary table +
Step 6 full report: Critical/Warning/Suggestion with `[File:Line]`, Rule/Fix/Impact/Benefit,
the Specialist Results table from `perSpecialist`).

- Standard modes → write to `claudedocs/code-review-result.md` (overwrite). Confirm: `Report saved: claudedocs/code-review-result.md`.
- `--renovate` → display the audit; if `--save`, write to `claudedocs/reports/dependency-audit-{date}.md`.
- If `note` is present (docs/config-only) → show it and stop.

Do NOT auto-fix. Let the user decide.

### Fallback (if the Workflow feature is unavailable or declined)

Fall back to the prompt-based orchestration in `orchestration.md` (Steps 2–7). It is a
complete specification of the same activation matrix, phase sequencing, model choice, and
report format. The only feature unique to the workflow path is the adversarial verify pass.

## Skill Contents

```
skills/code-review/
├── SKILL.md                    ← This file (orchestrator command)
├── review.workflow.js          ← Deterministic Workflow orchestration (primary path)
├── orchestration.md            ← Rules spec + prompt-based fallback, report format, prompt templates
├── shared/
│   ├── issue-classification.md ← Severity definitions (Critical/Warning/Suggestion)
│   ├── best-practices.md       ← Review quality guidelines
│   ├── specialist-output-format.md ← Standard output format (mirrored by the script schema)
│   └── known-deprecations.md   ← Registry APIs, manifest detection, WebSearch patterns
└── specialists/                ← 12 focused review rule sets (read by the subagents)
    ├── 01-dependencies-versions.md    (Phase 1 — always)
    ├── 02-security-data-safety.md     (Phase 2 — source files)
    ├── 03-architecture-layers.md      (Phase 2 — 3+ layers / new deps)
    ├── 04-design-patterns.md          (Phase 2 — source files)
    ├── 05-solid-code-smells.md        (Phase 2 — source files)
    ├── 06a-correctness-bug-detection.md (Phase 2 — source files)
    ├── 06b-code-style-size.md         (Phase 2 — source files)
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
- **Adversarial verify pass** drops majority-refuted false positives; a refuted *Critical* is never silently dropped (kept as low-confidence)
- **Deterministic consolidation** (dedup by file:line + description similarity, higher severity wins, severity sort) happens in code
- If a specialist or verifier fails, the review continues with remaining results
- After review: display findings, do NOT auto-fix, let user decide
- Review report is always saved to `claudedocs/code-review-result.md` (overwritten each run)
