# Changelog

All notable changes to the AgenticAI Plugin.

Format: Machine-readable. Each version is a `## X.Y.Z` section.
The agent parses this to show the delta between installed and current version.

## 0.13.1

- **github-publish: optional license check after completion.** After the github-publisher agent finishes, the skill now asks the user whether to run a license compatibility check. If accepted, the `license-checker` agent is invoked with the project license pre-filled (skipping Phase 1 detection). Runs identically to a manual `/agenticaiplugin:license-check` invocation. Also updates README.md with license-check entries (commands, features, project structure) and fixes outdated plugin.json description.

## 0.13.0

- **New skill: license-check.** Scans project dependencies, tools, scripts, and LLM model references for license compatibility issues. New `license-checker` agent (Sonnet) performs a 5-phase analysis: detect project license, scan dependencies across 7 ecosystems (npm, Python, Rust, Go, Maven, Gradle, .NET), identify LLM model references and vendored code, check compatibility against a comprehensive matrix, and generate a severity-rated report. Two modes: full scan (default, includes transitive dependencies via CLI tools) and `--quick` (direct dependencies only, no CLI tools needed). Report saved to `claudedocs/license-check-result.md`. Covers permissive, copyleft (GPL/LGPL/AGPL), non-OSI (SSPL/BSL), and proprietary licenses. Includes LLM model license table (Llama, Mistral, Phi, OpenAI, Claude, etc.), known license-changed packages (Redis, Elasticsearch, Terraform), and SPDX expression parsing (OR/AND/WITH). Architecturally prepared for future integration with `github-publish` skill.

## 0.12.1

- **Fix(github-publish): UPDATE mode now runs full project analysis.** Previously, UPDATE mode only checked README structure against the Baseline but did not verify whether the content was still accurate. Now runs the same project analysis as CREATE mode and compares results against the existing README to detect factual discrepancies (e.g., outdated feature counts, missing new capabilities, stale project structure). Discrepancies are shown in the Plan Preview before any changes are made.

## 0.12.0

- **BREAKING: Removed `create-readme` skill and `context-creator` agent.** README creation and enhancement is now fully handled by `github-publish` (use `--readme` mode for README-only updates). The `context-creator` agent's project analysis logic (tech stack detection, key file scanning, content generation) has been absorbed into `github-publisher` agent and `github-publish/reference.md` Section 5. New README Baseline Structure defines mandatory sections and ordering for all public repositories. The `github-publisher` agent now supports both CREATE mode (generate full README from project analysis) and UPDATE mode (check against baseline, add missing sections, preserve existing content).

## 0.11.2

- **Fix(github-publish): three template bugs from first real-world test.** Logo embed now uses relative path (`./etc/logo.svg`) instead of `raw.githubusercontent.com` URL — works on any branch without depending on default branch name. GitHub Actions release badge is no longer added before the first release exists (links to empty page). Beta banner text is now adaptive to project type instead of hardcoded "APIs may change" (e.g., "Skills, agents, and conventions" for plugins, "APIs and data formats" for libraries).

## 0.11.1

- **github-publish: `--repo` parameter, feature branch, plan preview, no-remote support.** Skill now accepts `--repo <path|github-url>` to target a different repository. All changes are made on a dedicated `feat/github-publish` branch for PR-based review. New Phase 5 (Plan Preview) shows all planned CREATE/UPDATE/SKIP actions and requires user approval before execution. Repos without a remote are fully supported — agent uses placeholders for owner/repo, skips remote-dependent badges, and lists "add remote" as a next step. Agent never pushes automatically.

## 0.11.0

- **New skill: github-publish.** Prepares GitHub repositories for professional public release. Interactive workflow with 3 modes: full setup (default), `--readme` (README enhancement only), `--license` (license selection only). Creates/enhances README (badges via shields.io/nodei.co, SVG logo, development status banners), LICENSE (MIT/Apache 2.0/GPL v3 based on project type), CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, GitHub Actions release workflow, and issue templates. New `github-publisher` agent (Sonnet) handles the 5-phase interactive workflow: project analysis, status display, user decisions, file creation, summary. Includes Jinja2 templates for all generated files and a reference.md with badge patterns, license decision matrix, SVG logo generation guidelines, and README enhancement rules.

## 0.10.4

- **Fix: git-commit rule template version bump.** Rule template `agenticaiplugin-git-commit.md` was missing the `Plugin-Version` header, preventing `/agenticaiplugin:update-plugin` from detecting that the rule had changed. Projects installed before the fully qualified skill name fix (`agenticaiplugin:git-smart-commit`) were stuck with the old rule. Bumped rule from v1.0 to v1.1. Running `/agenticaiplugin:update-plugin` now correctly pushes the fixed rule.

## 0.10.3

- **QA skill: Removed `--phase` and `--scope` options.** Both flags added complexity without sufficient value. `--phase <1-4>` (run single phase) and `--scope <path>` (restrict to subdirectory) are no longer accepted. The skill now always runs all 4 phases on the entire project. `--force-rebuild` remains unchanged.

## 0.10.2

- **QA skill: Stricter structure validation for pre-existing files.** Compatibility check now validates table column structure (6 columns for requirements, 7 for test cases) instead of relying on ID format patterns. Removed the `(or contains inline tables)` loophole that let any file with markdown tables pass as compatible. Added explicit examples of incompatible files to prevent lenient interpretation by the agent.
- **QA skill: Mandatory catalog + group file output.** Post-processing instructions for Phase 2 and Phase 3 now include a MANDATORY header and a self-check step. Root catalogs must be pure indexes (no detail rows). The `requirements/` and `test-cases/` directories with group files are always created — not conditional on file size.
- **QA skill: Preserve existing IDs during migration.** ID conventions updated to accept component-specific ID formats (DB-01, ST-ERR-02, TC-CLI-01) alongside the default REQ-NNN / TC-NNN. Migration option explicitly preserves original IDs instead of renumbering, avoiding breakage of code-side references. New rule: "Never rename" existing IDs to a different format.

## 0.10.1

- **QA skill: Phase Delegation architecture.** Each of the 4 QA phases now runs in its own Phase Agent (`general-purpose`, `sonnet`) instead of accumulating all convergence rounds in the orchestrator's context. 3-level hierarchy: Orchestrator (Opus) → Phase Agent (Sonnet, convergence loop + file I/O) → Round Agent (Explore, Opus, codebase analysis). Phase Agents read reference.md for instructions, manage rounds internally, write output files, and return only a 5-line `PHASE_SUMMARY`. Orchestrator context stays ~200 lines instead of ~3,350+. Round prompts and analysis quality unchanged. Step 5 (Write Documents) removed — each Phase Agent writes its own output. No user-facing changes (same CLI options, same output files).

## 0.10.0

- **New skill: qa (Quality Square Traceability Manager).** Manages bidirectional traceability between Requirements, Code, Test Cases, and Tests. Four phases: System Discovery, Requirements Extraction, Test Cases Derivation, Gap Analysis. Uses iterative convergence pattern (Explore agents with Opus, max 5 rounds per phase) for completeness. Outputs to `claudedocs/` (system-view, requirements catalog + groups, test-cases catalog + groups, qa-report). Supports `--phase <1-4>`, `--scope <path>`, `--force-rebuild`. Includes Jinja2 templates, shared ID conventions (REQ-NNN, TC-NNN), and status definitions.

## 0.9.4

- **Upgraded model selection for code review specialists.** Three-tier model assignment: Security (#02) and Architecture (#03) upgraded from `sonnet` to `opus` for nuanced multi-file analysis where false negatives are costly. SOLID & Code Smells (#05) upgraded from `haiku` to `sonnet` for better SRP/LSP violation detection. All other specialists unchanged.
- **Code review report persisted to file.** The consolidated review report is now always saved to `claudedocs/code-review-result.md` (overwritten each run). Mirrors the architecture-audit pattern. Prepares for follow-up features that consume the report file.

## 0.9.3

- **New specialist: Documentation & Comments (Specialist 11).** Checks comment language (English-only = CRITICAL), Javadoc/docstring completeness for public/protected/package-private methods, complexity-based private method documentation, commented-out code, TODO/FIXME/HACK hygiene (ticket references), noise comments, and API documentation frameworks. Extracted overlapping rules from Specialist 06 (Rule 6.7 Public API Documentation) and Specialist 07 (Rules 7.1 commented-out code, 7.5 TODO/FIXME). Cross-references added in Specialists 06 and 07.

## 0.9.2

- **Fix: markdown-converter and create-cli frontmatter.** Removed explicit `name:` field that prevented auto-discovery with `agenticaiplugin:` prefix. Added `disable-model-invocation: true` to both skills. Updated `docs/plugin-howto.md` to document `name` as optional (default: directory name).

## 0.9.1

- **Removed: aiknowledgedb integration.** Knowledge skill, rule template, and init/update tasks migrated to the aiknowledgedb project itself. Install Claude Code integration directly from aiknowledgedb: `cd aiknowledgedb && ./globals/install.sh`

## 0.9.0

- **aiknowledgedb Integration.** Knowledge skill (`/agenticaiplugin:knowledge`), rule template (`aiknowledgedb-knowledge-lookup.md`), and init/update tasks for automatic knowledge DB setup. Init checks for CLI availability and skips gracefully if not installed.
- **Refactor: Coordinator architecture.** Project initializer refactored from 677-line monolith to slim coordinator (~200 lines) with 5 task files in `agents/project-initializer/`. Easier to maintain and extend.

## 0.8.7

- **New skill: create-cli.** Designs CLI surface area (arguments, flags, subcommands, help text, output formats, exit codes). Produces a compact spec for implementation. Includes `cli-guidelines.md` reference.
- **New skill: markdown-converter.** Converts files to Markdown via `uvx markitdown`. Supports PDF, Word, PowerPoint, Excel, HTML, CSV, JSON, XML, images, audio, ZIP, YouTube URLs, EPub.
- **Docs: Command-style skill convention documented.** `docs/plugin-howto.md` now describes the `## Usage` + `## Argument Handling` pattern (standardized since v0.8.2) as a required pattern for new command-style skills.

## 0.8.6

- **Fix: Update handles deprecated testspecs directory.** Projects initialized before v0.8.5 with `claudedocs/testspecs/` now get it cleaned up (removed if empty, warning if contains files).
- **Fix: Update creates claudedocs/adrs/ directory.** Existing installations now get the `claudedocs/adrs/` directory during update, matching the init flow.
- **Fix: protected-dirs rule bumped to v1.1.** The testspecs-to-adrs content change in v0.8.5 was missing a version bump, causing updates to skip this rule.
- **Fix: code-review rule template header aligned to v1.1.** Template header now matches the version table, preventing unnecessary rewrites on every update.

## 0.8.5

- **ADRs in code review.** Code review specialists now receive Architecture Decision Records (`claudedocs/adrs/*.md`) as authoritative context. Priority chain updated: Project Guidelines > ADRs > Current Standards > Specialist Rules.
- **Removed testspecs directory.** `claudedocs/testspecs/` was created during init but never read by any skill. Replaced with `claudedocs/adrs/` in init, protected-dirs rule, and documentation.
- **Externalized rule templates.** Rule templates moved from embedded in project-initializer agent (~440 lines) to separate files in `rules-templates/`. Agent reads them at runtime via plugin root path. Agent shrinks from 1075 to 643 lines.
- **Trimmed init SKILL.md.** Removed redundant step descriptions, examples, and rules table that duplicated the agent. 121 → 37 lines.

## 0.8.4

- **Refactor: Code review default mode reviews local changes.** Git Diff mode (no parameter) now reviews uncommitted local changes (`git diff HEAD` + untracked files) instead of comparing against `origin/main`. Works in repos without a remote. Removed all remote branch detection code.

## 0.8.3

- **Fix: Robust default branch detection in code-review.** Git Diff mode now checks for `origin` remote existence, falls back to `git remote show origin` for non-standard branch names (e.g., `develop`, `trunk`), and shows a clear error with available branches if detection fails. Also enforces sequential execution of git diff steps to prevent parallel failures.

## 0.8.2

- **`--help` and input validation for all commands.** All 8 command skills now handle `--help` (displays usage info) and reject invalid arguments with usage guidance. Standardized `## Argument Handling` section added to each SKILL.md.

## 0.8.1

- **New rule: `agenticaiplugin-engineering.md`.** Consolidates engineering principles (bidirectional traceability, encapsulation/API surface, code size limits, test classification, dependency management) into an always-active rule file. Replaces keyword-triggered knowledge skills with persistent project context.
- **Removed 4 knowledge skills.** `development-principles`, `testing-philosophy`, `technology-advisor-jvm`, `technology-advisor-javascript` deleted. Content migrated to rule or covered by Claude's training.
- **Code review SSOT removed.** Specialists no longer reference external knowledge skills. Specialist 09 now has code classification inlined.

## 0.8.0

- **Trimmed 4 knowledge skills to essentials.** `development-principles` (311→56 lines): only story traceability, code size limits, dependency approval. `testing-philosophy` (335→36 lines): only code classification table and "No test" convention. `technology-advisor-jvm` (255→33 lines): only research-forcing workflow + Maven Central API. `technology-advisor-javascript` (292→33 lines): only research-forcing workflow + npm registry API. All reference.md files deleted.
- **Removed `agile-workflow` skill.** Epic/Story/Sprint management (934 lines including templates) removed — standard agile knowledge covered by Claude's training.
- **Updated code review SSOT references.** Specialist 08 (Cross-Cutting) no longer references development-principles. Orchestration mapping table updated.

## 0.7.0

- **BREAKING: Removed 7 redundant knowledge skills.** Skills `architecture-decisions`, `dependency-analysis`, `integration-testing`, `java-best-practices`, `spring-boot-best-practices`, `maven-best-practices`, and `technology-advisor-python` have been removed. Their content (Java patterns, Spring Boot architecture, TestContainers, Maven, ADRs, Python libraries, story dependencies) is covered by Claude's training knowledge. Code review specialists updated to remove SSOT references to deleted skills. ~9,500 lines of shared-context token overhead eliminated.

## 0.6.2

- **Fix model invocation:** Allow model to auto-invoke `code-review` skill (required by automatic review rule). `gitme` remains user-only; automatic commits use `git-smart-commit` knowledge skill.

## 0.6.1

- **Differentiated model selection:** Architecture audit and code review now use `sonnet` for multi-file reasoning tasks (pattern recognition, dependency direction, security, cross-cutting concerns) and `haiku` for rule-based single-file checks. Improves analysis quality for complex architectural assessments.

## 0.6.0

- **Architecture Audit:** New command `/agenticaiplugin:architecture-audit` — comprehensive architecture assessment with 7 focused analyzers, A-E ratings, and weighted overall score. Supports `--scope` for monorepos. Reports saved to `claudedocs/`.

## 0.5.3

- **Agent name prefix fix:** Skills now use fully qualified `agenticaiplugin:` prefix for agent invocations
- **Version comparison fix:** Update workflow now correctly detects rule version updates
- **Qualified agent names rule:** Added convention to CLAUDE.md to prevent future prefix omissions

## 0.5.2

- **Tiered code review:** Automatic Quick Review for small changes (≤50 lines, ≤3 files), Full Review for substantial changes

## 0.5.1

- **What's New display:** Update workflow now shows changelog delta between old and new version
- **Version tracking:** Rule templates now include `Plugin-Version` for automatic version detection

## 0.5.0

- **Multi-specialist code review:** Restructured from single reviewer to 10 focused specialist agents running in parallel
- **Knowledge Skills as SSOT:** Code review specialists now use Knowledge Skills as single source of truth for their rules
- **Cleanup:** Removed deprecated commands (`config`, `create-cr`, `test`) and dead code (`ensemble-count`)
- **Renovate integration:** Dependency audit (`renovate`) merged into code-review as `--renovate` mode
- **agentic.md removed:** Dropped agentic.md concept entirely, README-only documentation
- **Skills architecture:** All 13 commands migrated to skills, frontmatter descriptions added
- **git-commit rule:** New rule enforcing git-smart-commit skill for all commits

## 0.4.2

- **Update plugin command:** Replaced `update-rules` with `update-plugin` for full installation management
- **Legacy detection:** Automatic detection and migration of CLAUDE.md-based installations
- **Project initializer agent:** Moved update logic into dedicated agent for better isolation

## 0.4.1

- **Code review enhancements:** Three review modes, architecture pattern detection, dead code detection
- **Deprecated API detection:** Finds deprecated calls and unused packages
- **Modular rules:** Migrated from monolithic CLAUDE.md template to `.claude/rules/` files

## 0.4.0

- **New commands:** `renovate` (dependency audits), `help` (plugin overview), `promote-perms` (permissions), `create-cr` (context documents)
- **Ensemble code review:** Parallel reviewers for comprehensive analysis
- **Context creator:** Extended to support README.md generation
- **Proactive skills:** Improved trigger descriptions for reliable auto-activation
- **Progressive disclosure:** Optimized agents for token efficiency
