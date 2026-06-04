# Changelog

All notable changes to the AgenticAI Plugin.

Format: Machine-readable. Each version is a `## X.Y.Z` section.
The agent parses this to show the delta between installed and current version.

## 0.19.2

- **persona: make the state write a verified action (bugfix).** The `/agenticaiplugin:persona` skill inlined the state-file write as a shell code block, which the model could treat as illustrative and **skip** — reporting "persona updated" without ever writing `persona.state`. The persona then never persisted (no SessionStart-hook injection next session, no statusline indicator), even though the confirmation claimed success. Fix: state changes now go through a dedicated **`skills/persona/persona.sh`** (`show`/`set`/`off`) with value validation, atomic write (`tmp`+`mv`), read-back verification, and a machine-readable `OK persona=<value>` line the skill must echo back — coupling the confirmation to the real action. `SKILL.md` replaces the inline code blocks with a mandatory, action-oriented script call (`{skill_dir}/persona.sh`) and forbids fabricating the output ("no `OK persona=` line seen → the change did not happen"). The SessionStart hook (`persona-inject.sh`) now resolves its style snippets via `$BASH_SOURCE` self-location instead of `${CLAUDE_PLUGIN_ROOT}` (empty in the normal tool context), so it reliably finds the snippets after the write.

## 0.19.1

- **code-review & architecture-audit: specialist/analyzer model tiering raised; CR-06 split (#19).** A blind, anchoring-free re-evaluation (18 agents, each scoring one rule file without seeing the assigned model) found the tiering systematically too low — a Critical-recall risk. This release applies the cost-conscious subset of those findings.
  - **CR-06 split — the core change.** The former single `06 Code Quality & Correctness` (haiku) bundled trivial style checks with execution-simulation bug-hunting under one misleading name. It is now two specialists: **`06a` Correctness & Bug Detection (opus)** — YAGNI/intent (6.1), logic/algorithm/off-by-one bugs + concurrency hazards (6.3), behavioral-change detection (6.4); and **`06b` Code Style & Size (haiku)** — size/complexity (6.2), single-threaded immutability (6.5), magic numbers/naming (6.6). This yields *both* better bug recall *and* lower cost than the prior single haiku specialist. The `shared/` references to rules 6.1/6.2 still resolve (rules keep their numbers in their new home file). No renumbering of 01–11 (avoids breaking the many cross-references).
  - **code-review model bumps (`review.workflow.js`):** `04 Design Patterns` haiku→sonnet (GoF equivalence spans classes), `08 Cross-Cutting Concerns` sonnet→opus (project-wide error/logging-strategy synthesis), `10 Test Completeness` haiku→sonnet (prose-AC-vs-assertions, fake-integration detection). The verifier tier is unchanged (`Critical?opus:sonnet`) — it keys on finding severity, not on the producing specialist's model, which is the correct axis.
  - **architecture-audit model bumps (`audit.workflow.js`):** `01 Pattern Recognition` (Phase-1 foundation, 2× rating weight) sonnet→opus and `03 Dependency Direction` (2× weight, directed import-graph + role classification) sonnet→opus — both carry disproportionate leverage on the overall grade.
  - Both `orchestration.md` model tables, rationale sections, and the `SKILL.md` specialist tree are kept in sync with the scripts. Rule templates are not affected (skill-internal scripts only).

## 0.19.0

- **New skill: persona — agent communication style switching.** Adds a `/agenticaiplugin:persona` command plus a SessionStart hook that injects a communication-style ruleset, letting you trade response verbosity against token usage. Four cumulative styles from most to least verbose: `writer` (decorative, eloquent, explaining), `engineer` (concise, drops filler/pleasantries/hedging), `telegrapher` (brief, adds abbreviations/arrows, drops articles), `caveman` (ultra-terse, 1–3 word sentences, no lists). All styles share an inviolable Level-0 guard: technical terms, quoted error messages, and code blocks are never altered. **Opt-in by design:** the active style lives in a one-word state file (`${CLAUDE_CONFIG_DIR:-$HOME/.claude}/persona.state`, global per user); with no persona set the hook injects nothing and Claude behaves exactly as without the plugin — installing the plugin never forces a style. Subcommands: `show` (active persona), `list` (all styles with restriction summary), `off`/`reset` (back to normal). The command is `disable-model-invocation: true` (explicit `/persona` only — no accidental auto-switching). First plugin feature to use a plugin-level `hooks/hooks.json` (auto-discovered SessionStart hook, `matcher: ""`); the hook is a jq-based Bash script that degrades to a silent no-op when jq is absent or the persona value is unknown. Inspired by ASE's persona feature but reimplemented without an MCP server or config-cascade — a single state file plus one hook.

## 0.18.0

- **code-review and architecture-audit migrated to the `Workflow` feature.** Both orchestrators now run as deterministic JavaScript Workflow scripts instead of prompt-driven specialist/analyzer spawning, so activation, sequencing, and consolidation are enforced by code rather than prompt discipline. The command surface is unchanged (same invocations, flags, frontmatter) and a graceful fallback to the existing prompt-based `orchestration.md` remains for environments without the Workflow feature.
  - **code-review (`skills/code-review/review.workflow.js`, #10):** adds an **adversarial verify pass** — every Critical/Warning finding faces N=3 independent verifiers prompted to refute it; a finding survives only on `confirmed > refuted` (`uncertain` counts as non-confirmation), with verifier model scaled by severity. False-negative safety net: a refuted Critical is moved to an auditable `lowConfidence` list rather than silently dropped; refuted Warnings go to `dropped`. Activation matrix, Phase 1 → Phase 2 sequencing + context-sharing, per-specialist model choice, and `--renovate`/single-file/`--complete`/diff modes are preserved. Consolidation (dedup by `basename:line` + description similarity, higher severity wins, "also flagged by") is deterministic JS. Findings/verdicts are schema-validated (no free-text parsing); the report is still written to `claudedocs/code-review-result.md`.
  - **architecture-audit (`skills/architecture-audit/audit.workflow.js`, #11):** the overall rating is now **exact JS arithmetic** (`weightedAverage`) — Analyzers 01 & 03 weighted 2×, others 1×, `N/A` excluded from numerator and denominator, A=5…E=1, rounded half-up — so identical inputs always yield the identical grade (documented in `rating-scale.md`). Phase 1 sequencing, parallel Phase 2 (with the Phase 1 barrier), per-analyzer model choice, and failure handling are preserved; a dedicated consolidation-stage agent produces cross-cutting themes, deduped strengths/concerns, and prioritized recommendations without flooding the orchestrator context. Report still written to `claudedocs/architecture-audit-YYYY-MM-DD.md`.
- **New: `docs/workflow-integration-howto.md` (spike #9).** Binding, reusable pattern for calling repo-local `Workflow` scripts from a `SKILL.md`: `{skill_dir}`-based path resolution, the `args` convention (incl. the empirically-verified `JSON.parse` guard — `args` arrives as a JSON string), the sandbox I/O boundary, opt-in/graceful-fallback strategy, the canonical hook-form skeleton, schema/model conventions, packaging, and local testing/resume. Linked from `CLAUDE.md` as required reading before migrating a skill. Closes #9, #10, #11.

## 0.17.1

- **`effort:` and `model:` frontmatter on all skills and agents.** Adopted the official Anthropic-documented `effort:` (`low | medium | high | xhigh | max`) and `model:` (`haiku | sonnet | opus | inherit`) frontmatter fields for both Skills (per [Skills frontmatter reference](https://code.claude.com/docs/en/skills#frontmatter-reference)) and Subagents (per [Subagents frontmatter reference](https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields)). Classification follows the Anthropic-standard semantics — `effort:` sizes the *skill's own* reasoning load, not the user-perceived workload — so wrapper skills that delegate to an agent are tagged `low` even when the delegated agent does heavy work. `effort:` is set on every skill and agent. `model:` is set selectively: `haiku` only where the skill body itself does the work (`help`, `promote-perms`, `markdown-converter` — pure lookups/mechanical actions). For thin wrappers that delegate to a subagent (`init`, `update-plugin`, `github-publish`, `license-check`, `npm-publisher`), `model:` is left to inherit — the spawned subagent already runs with its own model (per the subagent model resolution order), so a haiku override on the short wrapper body does not outweigh the prompt-cache invalidation cost. `handover` is `effort: medium`. `create-cli`, `git-smart-commit`, `gitme` are `high`. Orchestrators `code-review`, `architecture-audit`, `qa` are `xhigh`. Plugin agents get `effort:` on top of their existing `model: sonnet`: `project-initializer` is `medium`, the three release/audit agents (`github-publisher`, `license-checker`, `npm-publisher`) are `xhigh`. New section "Effort + Model" in `docs/plugin-howto.md` documents the heuristic, the selective-model rule, and where each override applies (main conversation vs. fork vs. spawned sub-agent vs. preloaded skill). Closes #6.

## 0.17.0

- **New skill: handover.** Cross-session continuity mechanism that complements auto-memory with a temporal snapshot ("where was I, what's open, what's next") instead of persistent semantic facts. Skill is `disable-model-invocation: true` — explicit user trigger only, never auto-loaded, since stale snapshots silently entering context would corrupt new sessions. Two modes: **save** (default) reads the existing `<project_memory_dir>/handover.md` if present, treats it as prior state, then synthesizes a new snapshot from prior state + current session + live repo state (`git status`, `git log`, `gh issue list`, `gh pr list`); writes the file with frontmatter (`name`, `description`, `type: project`, `snapshotDate`) and appends a one-line index entry under `## Handover` in `MEMORY.md`. **load** reads the existing snapshot, performs a freshness check (≤14d silent, 15–30d soft warning, >30d strong warning), prints the full content into the active conversation context, and suggests verification steps (`git log`, `gh issue view`). The snapshot follows a 7-section structure: Letzter Stand, Repo-State bei Snapshot, Offene Items, Strukturelle Blocker / Härtungen, Geplante nächste Schritte, Wichtige Referenzen, Hands-off-Liste, plus optional Cursor-Position. **Reconciliation rules** in save mode prevent the failure mode where a same-session re-save loses prior multi-day open items: resolved items are dropped, unmentioned prior items are preserved by default, current state wins on conflicts, hands-off entries carry forward unless explicitly freed. No archive, no versioning — single `handover.md` per project; for a fresh start the user manually deletes the file. Bridges sessions when context fills up or work pauses.

## 0.16.0

- **npm-publish: integrated release-cutting phase (Phase 2).** The npm-publisher agent now orchestrates the full release lifecycle in a single skill invocation: it cuts the release before auditing publish-readiness. New Phase 2 (Release Decision) sits between Account/Branch (Phase 1) and Audits (now Phase 3, was Phase 2 — all subsequent phases renumbered to 3–10). Detection branches on the registry state: first-publish (skip cutting, this is initial release), local==published (re-release, the main path), local>published (already manually bumped, optionally generate CHANGELOG only), local<published (abort with clear error). For the re-release path: parses Conventional Commits since the last release tag (`git log v{latest}..HEAD`), aggregates the highest-impact signal (`<type>!:` or `BREAKING CHANGE:` in body → major; any `feat:` → minor; else patch), suggests the next version, and asks the user via AskUserQuestion to confirm or override (patch/minor/major/custom/skip). On confirmation: updates `package.json.version`, syncs hard-coded VERSION constants in source files (same grep pattern previously used in the audit, now pulled forward), generates a Keep-a-Changelog entry from grouped commits (Added from feat / Fixed from fix / Changed from refactor+chore+perf+build+ci / Removed when explicit), prepends to existing `CHANGELOG.md` or creates new file with header, asks user to review/edit, and commits as `chore(release): vX.Y.Z`. Two new flags: `--skip-release-cut` (audit only, no version bump) and the existing `--audit-only` now also skips Phase 2. Phase 2 itself has a "Skip" option in the bump-type AskUserQuestion for runs where the user wants to re-publish or audit-only. Phase 3b Version Sync becomes informational when cutting ran (the bump just happened), critical otherwise. Phase 4 status display prepends a "Release Cut" summary block when Phase 2 ran. Phase 10 GitHub Release generation now uses the CHANGELOG section as the release body when CHANGELOG exists. New reference.md Section 9 documents the full cutting spec (detection branches, Conventional Commits parsing rules, semver bump computation, Keep a Changelog format, CHANGELOG file detection, commit message format, skip conditions, edge cases). Replaces the previously-considered separate `release-cutter` skill — single invocation is more ergonomic.

## 0.15.0

- **New skill: npm-publish.** Pre-publish audit for npm packages, complementing `github-publish` with npm-registry-specific concerns. New `npm-publisher` agent (Sonnet) runs a 9-phase workflow: target resolution with monorepo detection (Lerna/Nx/pnpm-workspaces aborted as out-of-scope), npm account/2FA state check with optional `chore/npm-publish-prep` branch, comprehensive audit across seven dimensions (package.json hygiene including `bin` path normalization without `./`-prefix and `prepublishOnly` guard, version sync between `package.json.version` and hard-coded VERSION constants in source files, license compliance with explicit NOTICE-in-`files[]` verification for Apache-2.0, README sanity with mandatory Installation+Usage on first publish, real tarball content scan via `npm pack` extraction, registry state with semver bump detection, dependency vulnerabilities via `npm audit`), classified status display with ✓/⚠/ℹ icons grouped by category, interactive fix proposals via AskUserQuestion (batched per group, per-finding for sensitive items), plan preview, fix application via Edit/Write, final verification by re-running the dry-run and tarball audit, optional publish trigger (default recommends user publishes manually due to 2FA passkey/OTP interaction limits), and post-publish steps (git tag, end-to-end install test in tempdir, GitHub Release offer). The tarball content scan addresses the documented credential-leak risk where ~1% of npm packages accidentally include `.claude/settings.local.json` with real tokens (Check Point Research finding, late 2025) — also detects absolute paths, emails (with NOTICE/author whitelist), private IPs, internal hostnames, real names, secret patterns (JWT, npm tokens, GitHub PATs, OpenAI/Anthropic/Slack/AWS keys, generic high-entropy assignments), additional dotfile patterns (`.env`, `.npmrc`, `.aws/`, `.ssh/`, private keys), and source maps with embedded `sourcesContent` that would leak TypeScript source. New `.npmignore.j2` template provides safe defaults covering Claude workspace files, secrets, dev artifacts, and common credential locations. Optional `publish.yml.j2` template generates a tag-triggered GitHub Actions auto-publish workflow with version-tag verification and npm provenance. Audit-only by default (`--audit-only` flag for CI use); single-package focus initially. New reference.md documents the full pattern catalog including secret-regex table, license SPDX validation, and false-positive downgrade rules.

## 0.14.0

- **github-publish: sensitive content audit with interactive redaction.** Before publishing a repo to GitHub, the github-publisher agent now scans the working tree for sensitive content across six categories: Secrets & Credentials (AWS/Google/Anthropic/OpenAI/GitHub/Stripe/Slack API keys, SSH/PGP private keys, JWT tokens, password assignments, connection strings), E-Mail Addresses, Private Paths (Unix home dirs, macOS home dirs, Windows drives, WSL mounts), Internal Infrastructure (RFC 1918 IPs, `.internal`/`.local`/`.corp`/`.lan`/`.intranet` hostnames), External GitHub References, and Git History (informational only). Detection uses grep-based pattern matching with optional graceful fall-through to `gitleaks`/`trufflehog` when installed. False-positive handling downgrades test files, `.example`/`.sample` files, and environment variable references. Phase 3 status display shows findings per category. Phase 4 adds a new multi-select question (Q10) that lets users choose which categories to redact — Secrets are pre-selected to prevent accidental skip. Phase 6 Step 2.8 performs per-category redaction: secrets require individual user confirmation, other categories use style-matched placeholder substitution. Phase 7 summary includes redaction counts and git history rewrite instructions (`git filter-repo`/BFG) when history findings exist. Warnings are emitted if secrets remain in the working tree. New reference.md Section 10 documents the full pattern catalog, scan method, redaction rules, and tool integration.
- **github-publish: GitHub-native contact channels as default for SECURITY.md and CODE_OF_CONDUCT.md.** Phase 4 now asks the contact method up-front (Q2, directly after project classification). Default is "GitHub Security Advisories + Issues" — no email appears in any generated file. Users who prefer email contact can explicitly opt in via "E-Mail contact" or "Both", which triggers a follow-up prompt with a mandatory warning that the address will be publicly visible. Templates `SECURITY.md.j2` and `CODE_OF_CONDUCT.md.j2` branch on a new `contact_mode` variable (`github-native` | `email` | `both`) with appropriate language for each mode. SECURITY.md renders a link to `/security/advisories/new`; CODE_OF_CONDUCT.md points to the Issues tracker and GitHub's Report Abuse flow. The previous late, implicit email prompt in Phase 6 has been removed.

## 0.13.5

- **github-publish: version check for default/placeholder versions.** The github-publisher agent now detects the project version from manifest files (package.json, pyproject.toml, Cargo.toml, pom.xml, build.gradle, *.csproj) during Phase 2 analysis. A "probably-default" heuristic flags versions that were likely never intentionally set: version matches a common default (`0.0.0`, `0.0.1`, `0.1.0`, `1.0.0`) AND no version git tags exist AND no CHANGELOG file exists. Flagged versions are shown with a warning in the Phase 3 status display. Phase 4 adds a new question (Q3, after development status) with status-dependent version recommendations — Heavy Development suggests pre-release suffixes, Beta suggests `0.9.0` or `1.0.0-beta.1`, Stable recommends `1.0.0`. User can keep the current version if intentional. If changed, Phase 6 Step 2.5 updates the manifest file. Go projects handled as special case (version via git tags only). New reference.md Section 9 documents detection table, heuristic, and recommendations.

## 0.13.4

- **Fix(github-publish): three branch modes for idempotent re-runs.** When `feat/github-publish` already exists, the agent now offers three options: **Rerun** (idempotent — runs full workflow but only acts on what's missing or changed, recommended after plugin updates), **Continue** (skip to post-execution steps like license check), **Reset** (delete branch and start from scratch). Previously only "Continue" and "Reset" existed, where "Continue" was undefined and caused the agent to skip all analysis phases, preventing new features from being applied to existing branches.

## 0.13.3

- **github-publish: language audit with optional translation.** In full mode, the github-publisher agent now scans the project for non-English content before publishing. Detects German text in three categories: documentation files (README, docs/, manifest descriptions), code comments (inline, block, docstrings), and user-facing code strings (error messages, log output, test descriptions). Results shown in Phase 3 status display. If non-English content is found, Phase 4 asks the user which categories to translate (multiSelect). Phase 6 Step 2.5 translates selected categories using the Edit tool while preserving code structure. Git commit messages are flagged but not modified (would require history rewrite). New reference.md Section 8 documents detection heuristics, German keyword list, scan patterns, and translation rules.

## 0.13.2

- **Fix(github-publish): enforce English for all generated files.** Added explicit language rule to github-publisher agent: all generated files (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue templates, workflows) must be written in English, overriding any system-level language setting. Replaced German text in Phase 5 Plan Preview ("Geplante Aktionen" → "Planned actions", "Soll ich fortfahren?" → "Proceed with these changes?"). Added "English only" to reference.md Section 5.6 Writing Style.

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
