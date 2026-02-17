# QA Skill — Reference

Detailed playbook for the Quality Assurance traceability skill. The orchestrator (SKILL.md) references this document for process details. Read this file at the start of execution (Step 0).

---

## 1. Quality Square Concept

The Quality Square establishes bidirectional traceability between four artifacts:

```
    Requirements <————————> Test Cases
         ↕          ╲  ╱         ↕
         ↕           ╲╱          ↕
         ↕           ╱╲          ↕
         ↕          ╱  ╲         ↕
       Code <————————————> Tests
```

**Six cross-reference paths:**

| Path | Direction | Managed By |
|------|-----------|------------|
| REQ → TC | Requirement references its test cases | QA Skill |
| TC → REQ | Test case references its requirements | QA Skill |
| REQ → Code | Requirement references source location | QA Skill |
| TC → Test | Test case references actual test file | QA Skill |
| Code → REQ | Code comments reference requirement ID | Coding Agent (manual) |
| Test → TC | Test comments reference test case ID | Coding Agent (manual) |

The QA Skill manages the first four paths (document-side references). The last two (code-side references) are established by the developer during implementation. The QA Skill detects and reports missing code-side references in the gap analysis.

**What QA Skill does:** Analyzes code, extracts requirements, derives test cases, maps existing tests, reports gaps.

**What QA Skill does NOT do:** Write code, write tests, modify source files.

---

## 2. First-Run vs Subsequent-Run Logic

### Detection

Check both files independently:

| File | Exists? | QA Structure? | Result |
|------|---------|---------------|--------|
| `claudedocs/requirements.md` | No | — | First-run (requirements) |
| `claudedocs/requirements.md` | Yes | Valid | Subsequent-run (requirements) |
| `claudedocs/requirements.md` | Yes | Invalid | Ask user (see Structure Validation) |
| `claudedocs/test-cases.md` | No | — | First-run (test cases) |
| `claudedocs/test-cases.md` | Yes | Valid | Subsequent-run (test cases) |
| `claudedocs/test-cases.md` | Yes | Invalid | Ask user (see Structure Validation) |

Each file is evaluated independently — it's possible that requirements are valid but test cases need migration, or vice versa.

### Structure Validation

When `claudedocs/requirements.md` or `claudedocs/test-cases.md` exists, validate QA skill compatibility before proceeding:

**Required markers for `requirements.md`:**
- Contains at least one `REQ-NNN` ID pattern
- Contains a table with columns matching: ID | Title | Scope | Source | Test Cases | Status
- References group files in `claudedocs/requirements/` (or contains inline tables)

**Required markers for `test-cases.md`:**
- Contains at least one `TC-NNN` ID pattern
- Contains a table with columns matching: ID | Title | Scope | Type | Requirements | Test | Status
- References group files in `claudedocs/test-cases/` (or contains inline tables)

**If validation fails (incompatible structure detected):**

STOP and ask the user via `AskUserQuestion`:

```
Existing file detected: claudedocs/{filename}

This file exists but does not match the QA skill's expected structure.
It may have been created manually or by another tool.

What should I do?
```

Options:
1. **Migrate content** — Parse existing content, extract requirements/test cases where possible, assign QA-format IDs, preserve original as `{filename}.backup.md`
2. **Overwrite** — Treat as first-run, build from scratch (existing content is lost)
3. **Abort** — Stop execution, leave everything unchanged

**Important:** Never silently overwrite or ignore incompatible files. Always ask.

### First-Run Behavior

- Build all artifacts from scratch
- All requirements and test cases get Status: **DRAFT**
- IDs start at REQ-001 / TC-001
- User must review and promote DRAFT → ACTIVE/COVERED manually

### Subsequent-Run Behavior

- Read existing catalogs and group files
- Verify existing entries against current code
- Add newly discovered requirements/test cases (DRAFT)
- Update test mappings (COVERED/UNCOVERED status)
- Never modify existing IDs or their meaning
- Never remove existing entries (set RETIRED if obsolete)

### --force-rebuild

- Mark ALL existing requirements and test cases as RETIRED
- Rebuild from scratch with new IDs (continue from max existing + 1)
- Preserves retired entries in catalogs for audit trail

---

## 3. Phase Delegation Architecture

Each phase (1–4) is delegated to an independent Phase Agent that manages its convergence loop internally. This 3-level architecture isolates each phase's context, preventing accumulation in the orchestrator.

### 3-Level Hierarchy

```
Orchestrator (Opus) — SKILL.md — lightweight sequencing (~200 lines context)
  ├─ Phase 1 Agent (general-purpose, sonnet) → 5-line summary
  │    ├─ Round 1 (Explore, opus) — initial discovery
  │    └─ Round 2+ (Explore, opus) — review + refine
  ├─ Phase 2 Agent (general-purpose, sonnet) → 5-line summary
  │    └─ ...
  ├─ Phase 3 Agent (general-purpose, sonnet) → 5-line summary
  │    └─ ...
  └─ Phase 4 Agent (general-purpose, sonnet) → 5-line summary
       └─ ...
```

| Level | Agent | Type | Model | Responsibility |
|-------|-------|------|-------|----------------|
| 1 | Orchestrator | Skill runner | Opus | Init, validation, phase sequencing, final summary |
| 2 | Phase Agent | `general-purpose` | `sonnet` | Convergence loop, file I/O, template rendering |
| 3 | Round Agent | `Explore` | `opus` | Codebase analysis, deep reasoning |

### Phase Agent Responsibilities

Each Phase Agent runs autonomously:

1. **Read** reference.md Section {N} for detailed instructions
2. **Read** `shared/` files (ID conventions, status definitions)
3. **Read** relevant templates from `templates/`
4. **Read** input files from previous phase (e.g., `claudedocs/system-view.md`)
5. **Run convergence loop** internally:
   ```
   for round in 1..5:
     if round == 1:
       spawn Explore (opus) with Round 1 prompt
     else:
       spawn Explore (opus) with Round 2+ prompt + previous findings
     findings = result
     if round >= 2 and CONVERGED: break
   ```
6. **Post-process**: group findings, split if needed, render templates
7. **Write** output files to `claudedocs/`
8. **Return** Phase Summary to orchestrator

### Round Agent Behavior (unchanged)

Round agents are `Explore` (opus) agents. Their prompts and analysis behavior are identical — only the spawning location moves from the orchestrator to the Phase Agent.

### Convergence Assessment Format

Every Round 2+ agent must include at the end of its output:

```markdown
## Convergence Assessment
- Changes from previous round: [summary of additions/corrections/removals]
- Magnitude: [significant / moderate / minimal]
- Recommendation: [CONTINUE / CONVERGED]
- Reasoning: [why another round would or wouldn't add value]
```

### Convergence Rules

1. If **Magnitude = minimal** → CONVERGED (stop iterating)
2. If **round = 5** → forced CONVERGED (cost bound)
3. In practice, most phases converge in 2–3 rounds

### Phase Summary Format

Every Phase Agent MUST return this exact format as its final output:

```
PHASE_SUMMARY:
- phase: {phase_number}
- name: {phase_name}
- rounds: {rounds_used}
- output_files: [{comma-separated list of files written}]
- stats: {phase-specific key metrics}
```

The orchestrator uses these summaries to assemble the final user-facing report.

---

## 4. Phase 1: System Discovery

**Goal:** Identify all components and their external interfaces.

### Phase Agent Context

| | |
|---|---|
| **Input files** | (none — first phase) |
| **Output files** | `claudedocs/system-view.md` |
| **Templates** | `templates/system-view.md.j2` |
| **Summary stats** | `components: {n}, interfaces: {n}` |

### Phase Agent Prompt

The orchestrator spawns a `general-purpose` (`sonnet`) Phase Agent with this prompt:

> You are running **Phase 1: System Discovery** of the QA Skill.
>
> **Instructions:** Read `{skill_dir}/reference.md`:
> - Section 3 — Phase Delegation Architecture (convergence protocol, summary format)
> - Section 4 — Phase 1 details (round prompts, post-processing)
>
> Also read:
> - All files in `{skill_dir}/shared/`
> - `{skill_dir}/templates/system-view.md.j2`
>
> **Scope:** {scope or "entire project"}
>
> **Execute the convergence loop** as described in Section 3:
> 1. Spawn `Explore` (`opus`) rounds using the Round prompts from Section 4
> 2. Stop when CONVERGED or after 5 rounds
> 3. Post-process findings and render `system-view.md.j2`
> 4. Write result to `claudedocs/system-view.md`
> 5. Return your PHASE_SUMMARY (format in Section 3)

Replace `{skill_dir}` with the absolute path to this skill's directory. Replace `{scope}` with the `--scope` value or "entire project".

### Round 1 Prompt (Explore Agent)

> Analyze this project and identify all components and their external interfaces.
>
> Focus on:
> 1. Project structure — directories, modules, packages
> 2. Tech stack — languages, frameworks, build tools, test frameworks
> 3. External interfaces — API routes, CLI commands, messaging endpoints, scheduled tasks, event handlers
> 4. Entry points — where each interface is defined in code
>
> Grep patterns to try (adapt to detected framework):
> - API routes: `@(Get|Post|Put|Delete|Patch|RequestMapping)`, `router\.(get|post|put|delete)`, `@app\.(get|post|put|delete|route)`
> - CLI commands: `@Command`, `command(`, `subparsers`, `.command(`, `cobra.Command`
> - Messaging: `@KafkaListener`, `@RabbitListener`, `@SqsListener`, `subscribe(`, `on('message`
> - Scheduled: `@Scheduled`, `cron`, `setInterval`, `schedule.every`
>
> Return structured output:
> - Tech stack table (Category | Technology)
> - Components table (Name | Type | Path | Interfaces count)
> - External Interfaces table (Interface | Type | Component | Entry Point)

### Round 2+ Prompt (Explore Agent, opus)

> Review these system discovery findings against the actual codebase.
>
> Previous findings:
> {findings_from_previous_round}
>
> Tasks:
> 1. Verify each listed component actually exists
> 2. Check for components/interfaces that were missed
> 3. Correct any misclassifications
> 4. Validate entry point paths
>
> Return: Updated findings in the same structure + Convergence Assessment.

### Post-Processing (Phase Agent)

Render via `system-view.md.j2` → `claudedocs/system-view.md`

---

## 5. Phase 2: Requirements Extraction

**Goal:** Extract functional requirements from code, one per observable behavior.

### Phase Agent Context

| | |
|---|---|
| **Input files** | `claudedocs/system-view.md` |
| **Output files** | `claudedocs/requirements.md`, `claudedocs/requirements/*.md` |
| **Templates** | `templates/requirements-catalog.md.j2`, `templates/requirements-group.md.j2` |
| **Summary stats** | `requirements: {n}, new: {n}, groups: {n}` |

### Phase Agent Prompt

The orchestrator spawns a `general-purpose` (`sonnet`) Phase Agent with this prompt:

> You are running **Phase 2: Requirements Extraction** of the QA Skill.
>
> **Instructions:** Read `{skill_dir}/reference.md`:
> - Section 3 — Phase Delegation Architecture (convergence protocol, summary format)
> - Section 5 — Phase 2 details (preparation, round prompts, post-processing)
>
> Also read:
> - All files in `{skill_dir}/shared/`
> - `{skill_dir}/templates/requirements-catalog.md.j2` and `requirements-group.md.j2`
>
> **Input from Phase 1:** Read `claudedocs/system-view.md`
>
> **Runtime context:**
> - Run mode: {first-run | subsequent-run}
> - If subsequent-run: also read `claudedocs/requirements.md` and all files in `claudedocs/requirements/`
> - If --force-rebuild: mark all existing entries RETIRED before analysis
> - Scope: {scope or "entire project"}
>
> **Execute:**
> 1. Follow Preparation steps in Section 5
> 2. Run the convergence loop (Section 3) with Round prompts from Section 5
> 3. Follow Post-Processing steps in Section 5
> 4. Return your PHASE_SUMMARY (format in Section 3) — include stats: requirements, new, groups

Replace `{skill_dir}`, `{run_mode}`, `{scope}` with actual values.

### Preparation (Phase Agent)

- If subsequent-run: read `claudedocs/requirements.md` and all `claudedocs/requirements/*.md`
- Determine `next_req_id` = max existing REQ-ID + 1 (or 001 if first-run)

### Round 1 Prompt (Explore Agent)

> For each external interface in the system view below, read the implementation code and extract functional requirements.
>
> System View:
> {system_view_content}
>
> {if subsequent_run}
> Existing requirements (preserve these, add new ones):
> {existing_requirements}
> Next available ID: REQ-{next_req_id}
> {endif}
>
> Rules:
> - One requirement per observable behavior (API response, CLI output, message published, etc.)
> - Classify scope: **external** (visible to callers) or **internal** (implementation detail)
> - Focus on external scope; include internal only for complex business logic
> - Source = file path where the behavior is implemented
> - Title should be a concise, testable statement ("Returns 404 when user not found")
>
> Return requirements as a table per component:
> ID | Title | Scope | Source | Test Cases | Status
>
> Set Test Cases to "—" (Phase 3 will fill them).
> Set Status to DRAFT for all new entries.

### Round 2+ Prompt (Explore Agent, opus)

> Review these requirements against the actual code.
>
> System View:
> {system_view_content}
>
> Previous requirements:
> {findings_from_previous_round}
>
> Tasks:
> 1. Verify each requirement maps to actual code behavior
> 2. Find missed behaviors (especially error handling, edge cases, validation)
> 3. Check scope classifications (external vs internal)
> 4. Remove duplicates
> 5. Ensure titles are testable statements
>
> Return: Updated requirements in the same table format + Convergence Assessment.

### Post-Processing (Phase Agent)

1. Group requirements by component
2. If any group exceeds ~100 lines → split into sub-groups
3. Render via `requirements-catalog.md.j2` → `claudedocs/requirements.md`
4. Render each group via `requirements-group.md.j2` → `claudedocs/requirements/<component>.md`

---

## 6. Phase 3: Test Cases Derivation

**Goal:** Derive test cases from requirements and map to existing tests.

### Phase Agent Context

| | |
|---|---|
| **Input files** | `claudedocs/requirements.md`, `claudedocs/requirements/*.md` |
| **Output files** | `claudedocs/test-cases.md`, `claudedocs/test-cases/*.md` (+ updates `claudedocs/requirements/*.md`) |
| **Templates** | `templates/test-cases-catalog.md.j2`, `templates/test-cases-group.md.j2` |
| **Summary stats** | `test_cases: {n}, new: {n}, covered: {n}, uncovered: {n}, groups: {n}` |

### Phase Agent Prompt

The orchestrator spawns a `general-purpose` (`sonnet`) Phase Agent with this prompt:

> You are running **Phase 3: Test Cases Derivation** of the QA Skill.
>
> **Instructions:** Read `{skill_dir}/reference.md`:
> - Section 3 — Phase Delegation Architecture (convergence protocol, summary format)
> - Section 6 — Phase 3 details (preparation, round prompts, post-processing)
>
> Also read:
> - All files in `{skill_dir}/shared/`
> - `{skill_dir}/templates/test-cases-catalog.md.j2` and `test-cases-group.md.j2`
>
> **Input from Phase 2:** Read `claudedocs/requirements.md` and all files in `claudedocs/requirements/`
>
> **Runtime context:**
> - Run mode: {first-run | subsequent-run}
> - If subsequent-run: also read `claudedocs/test-cases.md` and all files in `claudedocs/test-cases/`
> - If --force-rebuild: mark all existing entries RETIRED before analysis
> - Scope: {scope or "entire project"}
>
> **Execute:**
> 1. Follow Preparation steps in Section 6
> 2. Run the convergence loop (Section 3) with Round prompts from Section 6
> 3. Follow Post-Processing steps in Section 6 (includes updating requirements group files with TC cross-references)
> 4. Return your PHASE_SUMMARY (format in Section 3) — include stats: test_cases, new, covered, uncovered, groups

Replace `{skill_dir}`, `{run_mode}`, `{scope}` with actual values.

### Preparation (Phase Agent)

- If subsequent-run: read `claudedocs/test-cases.md` and all `claudedocs/test-cases/*.md`
- Determine `next_tc_id` = max existing TC-ID + 1 (or 001 if first-run)
- Identify test directories: Glob for `**/test/**`, `**/tests/**`, `**/spec/**`, `**/__tests__/**`

### Round 1 Prompt (Explore Agent)

> For each requirement below, derive test cases covering happy path, error cases, and edge cases. Then scan the test directories and map existing tests.
>
> Requirements:
> {requirements_content}
>
> {if subsequent_run}
> Existing test cases (preserve these, add new ones):
> {existing_test_cases}
> Next available ID: TC-{next_tc_id}
> {endif}
>
> Test directories to scan: {test_dirs}
>
> Rules:
> - Derive test cases per requirement: happy path (always), error cases, edge cases
> - Type: HAPPY | ERROR | EDGE
> - Scope: external (tests through public interface) or internal (unit-level)
> - Search test files for tests matching each requirement's behavior
> - If a matching test exists: set Test = file:testName, Status = COVERED
> - If no match: set Test = "—", Status = UNCOVERED
> - Link back to requirements in the Requirements column
>
> Return test cases as a table per component:
> ID | Title | Scope | Type | Requirements | Test | Status

### Round 2+ Prompt (Explore Agent, opus)

> Review these test cases against the requirements and actual test files.
>
> Requirements:
> {requirements_content}
>
> Previous test cases:
> {findings_from_previous_round}
>
> Tasks:
> 1. Check completeness: does every requirement have at least happy-path coverage?
> 2. Verify test mappings: do mapped tests actually test the claimed behavior?
> 3. Check for missed error/edge cases
> 4. Ensure bidirectional links (TC→REQ and REQ→TC) are consistent
>
> Return: Updated test cases in the same table format + Convergence Assessment.

### Post-Processing (Phase Agent)

1. Update requirements: fill in Test Cases column with linked TC-IDs
2. Group test cases by component
3. If any group exceeds ~100 lines → split into sub-groups
4. Render via `test-cases-catalog.md.j2` → `claudedocs/test-cases.md`
5. Render each group via `test-cases-group.md.j2` → `claudedocs/test-cases/<component>.md`
6. Re-render requirement group files with updated Test Cases column

---

## 7. Phase 4: Gap Analysis

**Goal:** Cross-reference all Quality Square artifacts and identify traceability gaps.

### Phase Agent Context

| | |
|---|---|
| **Input files** | `claudedocs/system-view.md`, `claudedocs/requirements.md`, `claudedocs/requirements/*.md`, `claudedocs/test-cases.md`, `claudedocs/test-cases/*.md` |
| **Output files** | `claudedocs/qa-report.md` |
| **Templates** | `templates/qa-report.md.j2` |
| **Summary stats** | `gaps_by_category: {...}, coverage_pct: {n}` |

### Phase Agent Prompt

The orchestrator spawns a `general-purpose` (`sonnet`) Phase Agent with this prompt:

> You are running **Phase 4: Gap Analysis** of the QA Skill.
>
> **Instructions:** Read `{skill_dir}/reference.md`:
> - Section 3 — Phase Delegation Architecture (convergence protocol, summary format)
> - Section 7 — Phase 4 details (round prompts, post-processing)
>
> Also read:
> - All files in `{skill_dir}/shared/`
> - `{skill_dir}/templates/qa-report.md.j2`
>
> **Input from Phases 1–3:** Read:
> - `claudedocs/system-view.md`
> - `claudedocs/requirements.md` and all files in `claudedocs/requirements/`
> - `claudedocs/test-cases.md` and all files in `claudedocs/test-cases/`
>
> **Execute:**
> 1. Run the convergence loop (Section 3) with Round prompts from Section 7
> 2. Follow Post-Processing in Section 7
> 3. Return your PHASE_SUMMARY (format in Section 3) — include stats: gaps_by_category, coverage_pct

Replace `{skill_dir}` with the absolute path to this skill's directory.

### Round 1 Prompt (Explore Agent)

> Cross-reference all QA artifacts and identify gaps in the Quality Square.
>
> System View:
> {system_view_content}
>
> Requirements:
> {requirements_content}
>
> Test Cases:
> {test_cases_content}
>
> Analyze four gap categories:
>
> 1. **Requirements without Test Cases** — REQs where Test Cases column = "—"
> 2. **Test Cases without Tests (UNCOVERED)** — TCs where Status = UNCOVERED
> 3. **Orphan Tests** — test files/functions not referenced by any TC
>    - Scan test directories, compare against TC Test column
> 4. **Untraced Code** — external interfaces in system-view not referenced by any REQ
>    - Compare system-view interfaces against REQ Source column
>
> Also assess:
> - Internal complexity: methods >50 lines or cyclomatic complexity concerns that need unit tests
> - Coverage percentages per category
>
> Return structured gap report with tables per category + recommendations.

### Round 2+ Prompt (Explore Agent, opus)

> Review this gap analysis for accuracy.
>
> Previous gap analysis:
> {findings_from_previous_round}
>
> Available artifacts:
> - System View: {system_view_content}
> - Requirements: {requirements_content}
> - Test Cases: {test_cases_content}
>
> Tasks:
> 1. Verify gaps are real (no false positives from missed mappings)
> 2. Check for gaps not yet identified
> 3. Validate coverage percentages
> 4. Assess recommendation quality
>
> Return: Updated gap analysis + Convergence Assessment.

### Post-Processing (Phase Agent)

Render via `qa-report.md.j2` → `claudedocs/qa-report.md`

---

## 8. Document Format Specifications

### Requirements Table Columns

| Column | Content |
|--------|---------|
| ID | REQ-NNN (see `shared/id-conventions.md`) |
| Title | Concise, testable statement of behavior |
| Scope | `external` or `internal` |
| Source | File path where behavior is implemented |
| Test Cases | Comma-separated TC-IDs or "—" |
| Status | See `shared/status-definitions.md` |

### Test Cases Table Columns

| Column | Content |
|--------|---------|
| ID | TC-NNN (see `shared/id-conventions.md`) |
| Title | Concise description of what is tested |
| Scope | `external` or `internal` |
| Type | HAPPY, ERROR, or EDGE |
| Requirements | Comma-separated REQ-IDs |
| Test | `file:testName` or "—" |
| Status | See `shared/status-definitions.md` |

---

## 9. Splitting Logic

Documents grow incrementally. The splitting threshold keeps files manageable:

1. **Start inline:** Requirements/test cases start within their group file
2. **Split threshold:** When a group file exceeds ~100 lines → split into sub-group files
3. **Root catalog:** Always references groups only (lazy-load pattern)
4. **Group files:** Reference sub-groups if split, otherwise contain rows directly
5. **Sub-group naming:** `<component>-<subgroup>.md` (e.g., `api-users.md`, `api-orders.md`)

---

## 10. Golden Rules

1. **IDs are immutable** — once assigned, an ID never changes meaning or gets reused
2. **New IDs preferred** — add new entries rather than modifying existing ones
3. **Retired IDs tracked** — Status: RETIRED, row preserved in catalog
4. **Cross-references consistent** — REQ→TC must match TC→REQ at all times
5. **~100 lines splitting threshold** — split group files when they exceed this
6. **Lazy loading** — root catalogs reference groups only; load detail files on demand
7. **DRAFT marking** — all first-run content is DRAFT until user promotes it
8. **claudedocs/guidelines/ and adrs/ are READ-ONLY** — never modify, only read for context
9. **Idempotent execution** — running the skill twice without code changes produces the same result
10. **Max 5 rounds per phase** — convergence is bounded to prevent runaway iteration
