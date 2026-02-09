# Changelog

All notable changes to the AgenticAI Plugin.

Format: Machine-readable. Each version is a `## X.Y.Z` section.
The agent parses this to show the delta between installed and current version.

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
