# Code Review Orchestration Playbook

Detailed orchestration logic for the multi-specialist code review architecture. Referenced by SKILL.md during review execution.

## Fundamental Principle: Findings Only

**CRITICAL:** Specialists ONLY identify and report issues. They do NOT:
- Fix code
- Generate code changes
- Apply patches
- Modify files

Specialists produce a structured findings report. The user decides what to fix.

---

## Specialist Activation Matrix

| # | Specialist | Phase | Activate When |
|---|-----------|-------|---------------|
| 1 | Dependencies & Versions | **1** | ALWAYS |
| 2 | Security & Data Safety | 2 | Source files modified |
| 3 | Architecture & Layers | 2 | 3+ layers affected OR new dependencies |
| 4 | Design Patterns (GoF) | 2 | Source files modified |
| 5 | SOLID & Code Smells | 2 | Source files modified |
| 6 | Code Quality & Correctness | 2 | Source files modified |
| 7 | Dead Code & Duplication | 2 | Source files modified |
| 8 | Cross-Cutting Concerns | 2 | Source files modified |
| 9 | Test Quality | 2 | Test files modified |
| 10 | Test Completeness & Infra | 2 | Source files modified |

### Selection Logic

```
ALWAYS activate:
  → Specialist 1 (Dependencies & Versions)

IF source_files_modified:
  → Specialists 2, 4, 5, 6, 7, 8

IF source_files_modified AND (layers_affected >= 3 OR new_dependencies):
  → Specialist 3 (Architecture)

IF test_files_modified:
  → Specialist 9 (Test Quality)

IF source_files_modified:
  → Specialist 10 (Test Completeness)

IF ONLY docs/config changed:
  → Skip all specialists
  → Return "No code review needed — documentation/config changes only."
```

---

## Phase Execution

### Phase 1: Dependencies & Versions (Sequential)

Specialist 1 runs first because version findings provide critical context for Phase 2 specialists.

**Why Phase 1 runs first:**
- If a framework is severely outdated, Phase 2 specialists need to know (e.g., deprecated patterns may be expected in older framework versions)
- If dependencies have known CVEs, security specialist should consider this
- If framework version was recently upgraded, code quality specialist should watch for legacy patterns

**Spawn via Task tool:**
```
subagent_type: general-purpose
model: haiku
```

Wait for completion. Capture full results.

### Phase 1 → Phase 2 Context Sharing

**CRITICAL:** Phase 1 results MUST be included in every Phase 2 specialist's prompt. This ensures specialists have version context for their reviews.

**Include in Phase 2 prompts:**
- Framework name and version (e.g., "Spring Boot 3.2.1")
- Outdated dependencies found (name, current version, latest version)
- Known CVEs or security issues in dependencies
- Framework modernization findings (deprecated APIs still in use)
- Any dependency conflicts detected

**How context affects Phase 2 specialists:**
- **Security (2):** Known CVEs in dependencies = heightened scrutiny for related code
- **Architecture (3):** Outdated framework version may mean legacy patterns are expected, not violations
- **Design Patterns (4):** Modern framework version means modern patterns should be used
- **Code Quality (6):** Deprecated API usage should be flagged if modern alternative exists
- **Cross-Cutting (8):** Framework version determines which cross-cutting approaches are current

### Phase 2: All Applicable Specialists (Parallel)

Spawn ALL applicable Phase 2 specialists in a single message using multiple Task tool calls. This runs them concurrently for faster total review time.

**Spawn each via Task tool:**
```
subagent_type: general-purpose
model: haiku
```

**Note on inter-specialist communication:** Phase 2 specialists run in parallel and independently. They do not communicate with each other during execution. Cross-specialist context comes from:
1. Phase 1 results (shared with all)
2. The orchestrator's consolidation step (deduplication, cross-referencing)

---

## Specialist Prompt Template

Each specialist receives this prompt (fill in placeholders):

```
You are a code review specialist for [{specialist_name}].

## Step 1: Research Current Standards

BEFORE reviewing any code, identify the project's technology stack from the
files to review and Phase 1 context. Then research the CURRENT best practices
and standards for:

- The programming language(s) used (e.g., Java 21, Python 3.12, TypeScript 5.x)
- The framework(s) and their versions (e.g., Spring Boot 3.2, FastAPI 0.110, Next.js 14)
- Key libraries and their current conventions
- Language-specific idioms and patterns for the detected version

Use WebSearch or Context7 (resolve-library-id → query-docs) to look up:
- "[framework] [version] best practices [current year]"
- "[framework] [version] migration guide" (if Phase 1 found outdated version)
- "[language] [version] coding standards"

This ensures your review is based on up-to-date standards, not outdated patterns.

## Step 2: Read Your Rules
Read your review rules file:
skills/code-review/specialists/{specialist_file}

## Output Format
Follow the output format defined in:
skills/code-review/shared/specialist-output-format.md

## Severity Definitions
Use the severity classification from:
skills/code-review/shared/issue-classification.md
(Focus on: {relevant_severity_sections})

{IF project_guidelines_exist}
## Project Guidelines (OVERRIDE skill rules when conflicts occur)
Read and apply project-specific guidelines from:
claudedocs/guidelines/*.md
{ENDIF}

## Files to Review
{file_list_with_paths}

{IF git_diff_mode}
## Review Context
Focus on changed lines. Here is the git diff context:
{diff_content}
{ENDIF}

{IF phase1_results}
## Phase 1 Context (Dependencies & Versions)
The dependency/version review found:
{phase1_summary}
Consider this context when making recommendations.
{ENDIF}

## Instructions
1. Identify the tech stack from the files and Phase 1 context
2. Research current standards for the detected language, framework, and libraries
3. Read your specialist rules file
4. Read the output format specification
5. Apply BOTH your specialist rules AND current technology standards
6. When your rules conflict with current standards, prefer current standards
7. When project guidelines conflict with either, project guidelines win
8. Return findings ONLY in the standard output format
9. If no issues found, return "No findings."
10. Do NOT fix code — only identify and describe issues
11. Do NOT generate code changes or patches
12. Do NOT modify any files
```

---

## Report Consolidation

After all specialists complete, the orchestrator consolidates results.

### Step 1: Collect Results

Gather output from all specialists. If a specialist failed or timed out, include:
```
[Specialist {N}: {Name}] Failed to complete — results unavailable.
```

### Step 2: Merge Findings

Combine all findings from all specialists into a single list.

### Step 3: Deduplicate

When the same file:line is flagged by multiple specialists:
- Keep the finding with the higher severity
- If same severity, keep the one with more specific rule reference
- Note which specialists flagged it (e.g., "Also flagged by: Specialist 5")

**Deduplication heuristic:** Same file + same line number + similar description = duplicate.

### Step 4: Sort

Order all findings:
1. Critical → Warning → Suggestion
2. Within same severity: group by specialist category

### Step 5: Generate Summary Table

```markdown
## Code Review Findings Summary

| Severity | File | Finding | Specialist |
|----------|------|---------|------------|
| CRITICAL | ApiClient.java:12 | Hardcoded API key | Security |
| CRITICAL | UserController.java:25 | SQL injection | Security |
| WARNING | OrderService.java:156 | Missing null check | Code Quality |
| WARNING | PaymentService.java:23 | Method too long | Code Quality |
| SUGGESTION | Config.java:12 | Consider @Value | Dependencies |

**Summary:** 2 Critical, 2 Warnings, 1 Suggestion
**Specialists activated:** 7/10
**Phase 1 duration:** ~30s | **Phase 2 duration:** ~45s (parallel)
```

### Step 6: Generate Full Report

```markdown
## Code Review Report

**Files Reviewed:** {count}
**Specialists Activated:** {activated_count}/10
**Phase 1:** Dependencies & Versions
**Phase 2:** {list of activated specialists}
**Project Guidelines:** {found or "None"}

---

### Critical Issues

#### {Specialist Category}
- [{File}:{Line}] {Description}
  **Rule:** {Rule reference}
  **Fix:** {Fix direction}

---

### Warnings

#### {Specialist Category}
- [{File}:{Line}] {Description}
  **Rule:** {Rule reference}
  **Impact:** {Why it matters}
  **Fix:** {Fix direction}

---

### Suggestions

#### {Specialist Category}
- [{File}:{Line}] {Description}
  **Benefit:** {What would improve}

---

### Summary
- **Critical:** {count} issues requiring fixes
- **Warnings:** {count} items needing attention
- **Suggestions:** {count} optional improvements
- **Overall Assessment:** {Brief assessment}

### Specialist Results
| Specialist | Findings | Status |
|------------|----------|--------|
| Dependencies & Versions | 2W, 1S | Complete |
| Security & Data Safety | 2C | Complete |
| Architecture & Layers | — | Skipped (2 layers) |
| Design Patterns | 1W | Complete |
| SOLID & Code Smells | 1W | Complete |
| Code Quality | 1W, 1S | Complete |
| Dead Code & Duplication | 1C, 2W | Complete |
| Cross-Cutting Concerns | — | Complete (no findings) |
| Test Quality | 1C, 1W | Complete |
| Test Completeness | 2W | Complete |
```

---

## Failure Handling

- If a specialist fails, include "[Specialist X] failed to complete" in report
- Continue with remaining specialist results
- Never fail the entire review because one specialist failed
- If Phase 1 fails, still run Phase 2 without version context

---

## Token/Cost Optimization

- **Model choice:** Specialists use `haiku` (fast, cheap, sufficient for focused rule checking)
- **Selective activation:** Only applicable specialists are spawned
- **Parallel execution:** Phase 2 specialists run concurrently
- **Focused context:** Each specialist reads only ~150-250 lines of rules (vs. ~3,200 lines in single-agent approach)
