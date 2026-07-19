# Architecture Audit Orchestration Playbook

Detailed orchestration logic for the multi-analyzer architecture audit.

> **Primary path is the Workflow script `audit.workflow.js`** (see `SKILL.md` and
> `docs/workflow-integration-howto.md`). The script is **authoritative for control flow**:
> Phase 1 → Phase 2 sequencing, per-analyzer model choice, the **exact weighted rating math**
> (Step 5.3 → `weightedAverage`), and the consolidation stage (Step 5.4–5.6). This document
> remains the **single source of truth for the rules and report structure**, and is the
> **complete prompt-based fallback** used when the Workflow feature is unavailable or declined.
> Discovery and tech-stack detection (Steps 1–2) stay with the main model either way.

## Fundamental Principle: Describe & Assess

**CRITICAL:** This is an architecture AUDIT, not a code review. The goal is to:
- **Describe** what the architecture IS
- **Assess** how consistently it is implemented
- **Rate** each dimension on the A-E scale

Do NOT: find bugs, suggest code fixes, or generate patches. Produce an assessment report.

---

## Step 1: Project Discovery (Orchestrator)

Perform these steps yourself (no sub-agent needed):

### 1.1 Repository Root

```bash
git rev-parse --show-toplevel
```

If `--scope` was provided, verify the path exists relative to repo root.

### 1.2 Directory Tree

Generate a directory tree (2-3 levels deep), excluding:
- `node_modules/`, `target/`, `build/`, `dist/`, `out/`
- `.git/`, `.idea/`, `.vscode/`, `.gradle/`
- `venv/`, `__pycache__/`, `.mypy_cache/`, `.pytest_cache/`
- `vendor/`, `bin/`, `obj/`

Use `ls` or a tree command. If `--scope` is set, restrict to that path.

### 1.3 Categorize Directories

Classify top-level directories:

| Category | Examples |
|----------|----------|
| **Source** | `src/`, `app/`, `lib/`, `pkg/`, `cmd/` |
| **Test** | `test/`, `tests/`, `__tests__/`, `spec/`, `src/test/` |
| **Config** | Root config files, `.github/`, `ci/`, `infra/` |
| **Docs** | `docs/`, `claudedocs/`, `doc/`, `wiki/` |
| **Build Output** | `dist/`, `build/`, `target/`, `out/` |

### 1.4 Source File Counts

Count source files by type (extension). This gives a quick sense of project size and language mix.

### 1.5 Output: Project Structure Summary

Assemble a summary block to pass to analyzers:

```
## Project Structure Summary
- Repository root: {path}
- Scope: {full project | scoped path}
- Directory tree:
  {indented tree, 2-3 levels}
- Source directories: {list}
- Test directories: {list}
- Config files: {list}
- Documentation: {list}
- Source file counts: {extension → count}
- Total source files: {count}
```

---

## Step 2: Tech Stack Detection (Orchestrator)

Perform yourself (no sub-agent needed):

### 2.1 Manifest Files

Search for build/package manifests:

| Manifest | Stack |
|----------|-------|
| `pom.xml` | Java/Maven |
| `build.gradle`, `build.gradle.kts` | Java-Kotlin/Gradle |
| `package.json` | JavaScript/TypeScript/Node.js |
| `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `*.csproj`, `*.sln` | .NET/C# |
| `Gemfile` | Ruby |
| `mix.exs` | Elixir |
| `composer.json` | PHP |

### 2.2 Primary Language(s)

Determine from file extensions (use Step 1.4 counts). If multiple languages, identify primary (most files) and secondary.

### 2.3 Framework Detection

Read manifest files to detect frameworks:

| Framework | Detection |
|-----------|-----------|
| Spring Boot | `spring-boot-starter-*` in pom.xml/build.gradle |
| Express | `express` in package.json dependencies |
| Next.js | `next` in package.json |
| Django | `django` in requirements.txt/pyproject.toml |
| FastAPI | `fastapi` in requirements.txt/pyproject.toml |
| Flask | `flask` in requirements.txt/pyproject.toml |
| ASP.NET | `Microsoft.AspNetCore.*` in .csproj |
| Angular | `@angular/core` in package.json |
| React | `react` in package.json |
| Vue | `vue` in package.json |

### 2.4 Build & Test Tools

Identify build tools (Maven, Gradle, npm, pip, cargo) and test frameworks (JUnit, Jest, pytest, go test, xUnit).

### 2.5 Output: Tech Stack Profile

```
## Tech Stack Profile
- Primary language: {language} ({version if detectable})
- Secondary languages: {list or "none"}
- Framework(s): {name + version}
- Build tool: {name}
- Test framework(s): {names}
- Package manager: {name}
- Manifest files: {paths}
```

---

## Step 3: Phase 1 — Pattern Recognition (Sequential)

Spawn **Analyzer 01** as a sub-agent. This must complete before Phase 2.

**Spawn via Task tool:**
```
subagent_type: general-purpose
model: opus
```

**Prompt (fill in placeholders):**

```
You are an architecture analyzer for [Pattern Recognition].

You are performing an ARCHITECTURE AUDIT (not a code review). Your task:
DESCRIBE and ASSESS, not find bugs or demand fixes.

## Your Analysis Dimension
Read your analysis rules:
skills/architecture-audit/analyzers/01-pattern-recognition.md

## Output Format
Follow the format in:
skills/architecture-audit/shared/analyzer-output-format.md

## Rating Scale
Use the definitions from:
skills/architecture-audit/shared/rating-scale.md

## Project Structure
{project_structure_summary}

## Tech Stack
{tech_stack_profile}

{IF project_guidelines_exist}
## Project Guidelines (Context)
Read: .claude/guidelines/*.md
{ENDIF}

{IF adrs_exist}
## Architectural Decision Records
Read: .claude/adrs/*.md
{ENDIF}

## Source Files to Examine
{file_list — top-level source directories and representative files}

## Instructions
1. Read your analyzer rules
2. Read the output format and rating scale
3. Examine the project structure and relevant files
4. Identify the architecture pattern
5. Determine the confidence level (Clear/Partial/Mixed/Unclear)
6. Define the expected architecture rules
7. Assign a rating (A-E) with justification
8. Support with evidence (directories, file paths, import examples)
9. Be ANALYTICAL and DESCRIPTIVE, not prescriptive
```

Wait for completion. Extract:
- Detected pattern name and confidence
- Expected architecture rules
- Full analyzer output (for the report)

---

## Step 4: Phase 2 — Parallel Analyzers

Spawn **Analyzers 02-07** in a single message (6 parallel Task calls).

**Model selection per analyzer:**

| Analyzer | Model | Rationale |
|----------|-------|-----------|
| 02 Component Boundaries | **sonnet** | Cross-module analysis requires multi-file reasoning |
| 03 Dependency Direction | **opus** | 2× rating weight; reverse-dependency and cycle detection needs a directed import graph plus role classification — errors here move the overall grade disproportionately |
| 04 Naming Consistency | **haiku** | Rule-based pattern matching on names |
| 05 API/Interface Boundaries | **sonnet** | Cross-module access patterns and boundary bypasses |
| 06 Instantiation & Wiring | **sonnet** | Wiring patterns span the entire codebase |
| 07 Structural Visibility | **haiku** | Directory structure and docs — surface-level, rule-based |

(Phase-1 Analyzer 01 Pattern Recognition runs on **opus** — see Phase 1 above; it is the foundation that all Phase-2 analyzers build on and carries 2× rating weight.)

**Spawn each via Task tool:**
```
subagent_type: general-purpose
model: opus   # or sonnet or haiku — see table above
```

**Prompt template (same for all, fill in per analyzer):**

```
You are an architecture analyzer for [{analyzer_name}].

You are performing an ARCHITECTURE AUDIT (not a code review). Your task:
DESCRIBE and ASSESS, not find bugs or demand fixes.

## Your Analysis Dimension
Read your analysis rules:
skills/architecture-audit/analyzers/{analyzer_file}

## Output Format
Follow the format in:
skills/architecture-audit/shared/analyzer-output-format.md

## Rating Scale
Use the definitions from:
skills/architecture-audit/shared/rating-scale.md

## Project Structure
{project_structure_summary}

## Tech Stack
{tech_stack_profile}

## Detected Architecture Pattern (Phase 1)
{phase1_results}

The detected pattern defines the EXPECTED rules against which you evaluate
your dimension.

{IF project_guidelines_exist}
## Project Guidelines (Context)
Read: .claude/guidelines/*.md
{ENDIF}

{IF adrs_exist}
## Architectural Decision Records
Read: .claude/adrs/*.md
{ENDIF}

## Source Files to Examine
{file_list}

## Instructions
1. Read your analyzer rules
2. Read the output format and rating scale
3. Examine the relevant project files
4. Evaluate your dimension against the expected rules from Phase 1
5. Assign a rating (A-E) with justification
6. Report: what works well, deviations, notable patterns
7. Support with evidence (file paths, directory names, import examples)
8. Be ANALYTICAL and DESCRIPTIVE, not prescriptive
```

**Analyzer mapping for placeholders:**

| # | analyzer_name | analyzer_file | model |
|---|---------------|---------------|-------|
| 02 | Component Boundaries | 02-component-boundaries.md | sonnet |
| 03 | Dependency Direction | 03-dependency-direction.md | opus |
| 04 | Naming Consistency | 04-naming-consistency.md | haiku |
| 05 | API/Interface Boundaries | 05-api-interface-boundaries.md | sonnet |
| 06 | Instantiation & Wiring | 06-instantiation-wiring.md | sonnet |
| 07 | Structural Visibility | 07-structural-visibility.md | haiku |

---

## Step 5: Consolidation

After all analyzers complete, consolidate results.

### 5.1 Collect Results

Gather output from all 7 analyzers. If an analyzer failed or timed out:
```
[Analyzer {N}: {Name}] — Analysis not available.
```

### 5.2 Extract Per-Dimension Ratings

| Dimension | Rating |
|-----------|--------|
| Architecture Pattern | {A-E or N/A} |
| Component Boundaries | {A-E or N/A} |
| Dependency Direction | {A-E or N/A} |
| Naming Consistency | {A-E or N/A} |
| API/Interface Boundaries | {A-E or N/A} |
| Instantiation & Wiring | {A-E or N/A} |
| Structural Visibility | {A-E or N/A} |

### 5.3 Calculate Overall Rating

Use the weighted average from `shared/rating-scale.md`:
- Architecture Pattern (01): **2x weight**
- Dependency Direction (03): **2x weight**
- All others: **1x weight**
- N/A dimensions excluded

Conversion: A=5, B=4, C=3, D=2, E=1. Compute weighted average, round to nearest grade.

### 5.4 Identify Cross-Cutting Themes

Look for themes mentioned by multiple analyzers:
- If 3+ analyzers mention the same concern → highlight as cross-cutting theme
- If findings reinforce each other → strengthen the narrative
- If findings contradict → note the tension

### 5.5 Consolidate Strengths & Concerns

- **Strengths:** Collect all "What Works Well" items, deduplicate, group by theme
- **Concerns:** Collect all "Deviations & Concerns" items, group by theme, sort by how many analyzers flagged them

### 5.6 Generate Recommendations

Derive 3-5 high-level recommendations from the concerns:
- Phrase as "Consider..." or "To improve..."
- Prioritize by impact (address pattern-level concerns before cosmetic ones)
- Be constructive, not prescriptive

---

## Step 6: Report & Storage

### 6.1 Display Report

Output the full report in the conversation (see Report Structure below).

### 6.2 Save Report

```bash
mkdir -p claudedocs
```

Write the report to: `claudedocs/architecture-audit-YYYY-MM-DD.md`

Confirm: `Report saved: claudedocs/architecture-audit-{date}.md`

---

## Report Structure

```markdown
# Architecture Audit Report

**Project:** {name}
**Date:** {YYYY-MM-DD}
**Scope:** {full project | scoped path}
**Tech Stack:** {stack summary}

---

## Executive Summary

**Overall Rating: {rating}** ({label})

{2-4 sentences: detected pattern, consistency assessment, main strengths and concerns}

### Rating Overview

| Dimension | Rating | Summary |
|-----------|--------|---------|
| Architecture Pattern | {A-E} | {one-liner} |
| Component Boundaries | {A-E} | {one-liner} |
| Dependency Direction | {A-E} | {one-liner} |
| Naming Consistency | {A-E} | {one-liner} |
| API/Interface Boundaries | {A-E} | {one-liner} |
| Instantiation & Wiring | {A-E} | {one-liner} |
| Structural Visibility | {A-E} | {one-liner} |

---

## Architecture Pattern
{Full Analyzer 01 output}

## Detailed Findings

### Component Boundaries
{Analyzer 02 output}

### Dependency Direction
{Analyzer 03 output}

### Naming Consistency
{Analyzer 04 output}

### API/Interface Boundaries
{Analyzer 05 output}

### Instantiation & Wiring
{Analyzer 06 output}

### Structural Visibility
{Analyzer 07 output}

---

## Strengths
{Consolidated list from all "What Works Well" sections, grouped by theme}

## Concerns
{Consolidated list from all "Deviations & Concerns", grouped by theme}

## Recommendations
{3-5 prioritized high-level recommendations, phrased as "Consider..." or "To improve..."}

---

## Appendix: Project Structure
{Directory tree from Step 1}

## Appendix: Tech Stack
{Full Tech Stack Profile from Step 2}
```

---

## Failure Handling

- **Analyzer fails:** Audit continues with remaining results. Failed analyzer shown as "Analysis not available" in the report. Rating becomes N/A.
- **Phase 1 fails:** Phase 2 still runs. Analyzers evaluate against general best practices instead of a detected pattern. Note this in the report.
- **No source files found:** Display error and stop. No report generated.
- **`--scope` path not found:** Display error and stop.

---

## Token/Cost Optimization

- **Differentiated model choice:** High-leverage analyzers carrying 2× rating weight (01 Pattern Recognition — the Phase-1 foundation — and 03 Dependency Direction) use `opus`, since errors there propagate to all downstream analyzers and move the overall grade disproportionately (issue #19); multi-file-reasoning analyzers (02, 05, 06) use `sonnet`; rule-based analyzers (04, 07) use `haiku`. This balances quality for complex architectural analysis with cost efficiency for pattern-matching tasks.
- **Parallel execution:** Phase 2 analyzers run concurrently (6 Task calls in one message)
- **Focused context:** Each analyzer reads only its own ~80-130 line rules file + ~50 line output format + ~40 line rating scale
- **Steps 1-2 done by orchestrator:** No sub-agent overhead for project discovery and tech stack detection
