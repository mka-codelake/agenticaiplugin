# QA Skill — Reference

Detailed playbook for the Quality Assurance traceability skill. The orchestrator (SKILL.md) references this document for process details. Read this file at the start of execution (Step 0).

---

## 1. Quality Square Concept

The Quality Square establishes bidirectional traceability between four artifacts:

```
    Requirements ←————————→ Test Cases
         ↕          ╲  ╱         ↕
         ↕           ╲╱          ↕
         ↕           ╱╲          ↕
         ↕          ╱  ╲         ↕
       Code ←————————————→ Tests
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

## 3. Iterative Convergence Protocol

Each phase (1–4) uses multiple sub-agent rounds instead of a single pass. This ensures completeness through independent review.

### Round Structure

```
Round 1:  Explore agent (opus) → Initial discovery → Findings v1
Round 2+: Explore agent (opus) → Review + refine → Findings vN + Convergence Assessment
```

### Sub-Agent Configuration

| Round | Agent Type | Model | Purpose |
|-------|-----------|-------|---------|
| 1 | `Explore` | `opus` | Initial discovery — broad codebase analysis |
| 2–5 | `Explore` | `opus` | Review previous findings, refine, assess completeness |

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

### Orchestrator Loop

```
for each phase in [1, 2, 3, 4]:
    findings = null
    rounds_used = 0
    for round in 1..5:
        rounds_used = round
        if round == 1:
            agent = spawn Explore (opus) with phase task
        else:
            agent = spawn Explore (opus) with phase task + findings
        findings = agent.result
        if round >= 2 and recommendation == CONVERGED:
            break
    record rounds_used for summary
    use findings as input to next phase
```

---

## 4. Phase 1: System Discovery

**Goal:** Identify all components and their external interfaces.

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

### Output

Rendered via `system-view.md.j2` → `claudedocs/system-view.md`

Passed as context to Phase 2.

---

## 5. Phase 2: Requirements Extraction

**Goal:** Extract functional requirements from code, one per observable behavior.

### Preparation (Orchestrator)

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

### Post-Processing (Orchestrator)

1. Group requirements by component
2. If any group exceeds ~100 lines → split into sub-groups
3. Render via `requirements-catalog.md.j2` → `claudedocs/requirements.md`
4. Render each group via `requirements-group.md.j2` → `claudedocs/requirements/<component>.md`

---

## 6. Phase 3: Test Cases Derivation

**Goal:** Derive test cases from requirements and map to existing tests.

### Preparation (Orchestrator)

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

### Post-Processing (Orchestrator)

1. Update requirements: fill in Test Cases column with linked TC-IDs
2. Group test cases by component
3. If any group exceeds ~100 lines → split into sub-groups
4. Render via `test-cases-catalog.md.j2` → `claudedocs/test-cases.md`
5. Render each group via `test-cases-group.md.j2` → `claudedocs/test-cases/<component>.md`
6. Re-render requirement group files with updated Test Cases column

---

## 7. Phase 4: Gap Analysis

**Goal:** Cross-reference all Quality Square artifacts and identify traceability gaps.

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

### Post-Processing (Orchestrator)

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
