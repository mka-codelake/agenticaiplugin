# Changelog

All notable changes to the AgenticAI Plugin.

Format: Machine-readable. Each version is a `## X.Y.Z` section.
The agent parses this to show the delta between installed and current version.

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
