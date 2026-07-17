<img src="./etc/logo.svg" width="400" align="right" alt="AgenticAI Plugin"/>

# AgenticAI Plugin

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

> [!NOTE]
> **AgenticAI Plugin** is in beta. Skills, agents, and conventions may change between minor versions.

A Claude Code plugin that adds intelligent code reviews, architecture audits, quality assurance traceability, smart Git commits, and GitHub repository publishing to your development workflow.

## Overview

The AgenticAI Plugin enhances Claude Code with specialized skills and agents that activate automatically when you need them. Code reviews run 12 focused specialists in parallel, architecture audits score your codebase across 7 dimensions, and smart commits analyze your changes to create meaningful atomic commits.

The plugin is **language-agnostic** — it works with any tech stack (Node.js, Java, Python, Rust, Go, .NET, and more). Project-specific rules and architectural decisions are stored in `claudedocs/` and always take priority over the plugin's built-in guidelines.

## Features

- **Multi-Specialist Code Review** — 12 focused review specialists run in parallel, covering security, architecture, SOLID principles, code quality, test coverage, documentation, and more
- **Architecture Audit** — 7-dimension analysis with A-E ratings (boundaries, dependencies, naming, APIs, wiring, visibility, patterns)
- **QA Traceability** — Bidirectional mapping between requirements, code, test cases, and tests ("Quality Square")
- **Smart Git Commits** — Analyzes changes, groups them logically, creates atomic commits following project conventions
- **GitHub Publish** — Prepares repositories for public release: README (with baseline structure validation), LICENSE, CONTRIBUTING, badges, logo, version check, language audit (German detection and translation to English), sensitive content audit (secrets, emails, private paths), GitHub Actions, issue templates
- **CLI Design** — Designs CLI interfaces: arguments, flags, subcommands, help text, output formats, exit codes
- **License Check** — Scans dependencies, tools, scripts, and LLM model references for license compatibility issues across 7 ecosystems
- **Markdown Converter** — Converts PDF, Word, PowerPoint, Excel, images, audio, and more to Markdown
- **Handover** — Cross-session continuity snapshots: capture open items, blockers, and next steps; resume cleanly after a break with a freshness check
- **Modular Rules System** — Plugin rules installed per-project, selectively updatable

## Installation

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and configured
- Access to a local marketplace directory
- [Node.js](https://nodejs.org/) 18 LTS or later on PATH — required by hook-based features
  (`persona`, `autoskill`). The Claude Code native installer does not bundle Node,
  so it must be installed separately. Without it, those features degrade with a
  visible error instead of working; all other plugin features are unaffected.
- The `claude` CLI on PATH — only required if you enable `autoskill` (its
  background reviewer runs `claude -p`).

### Steps

1. Clone the plugin:
   ```bash
   git clone https://github.com/mka-codelake/agenticaiplugin.git /path/to/agenticaiplugin
   ```

2. Add your marketplace (if not already added):
   ```bash
   /plugin marketplace add /path/to/your/marketplace
   ```

3. Install the plugin:
   ```bash
   /plugin install agenticaiplugin@local-dev-marketplace
   ```

4. Initialize in your project:
   ```bash
   /agenticaiplugin:init
   ```

## Usage

### Quick Start

```bash
/agenticaiplugin:init              # Set up plugin in your project
/agenticaiplugin:help              # Show all available commands
```

Initialization creates:
- `.claude/rules/agenticaiplugin-*.md` — Plugin rules (5 rule files)
- `claudedocs/guidelines/` — For your project-specific code review rules
- `claudedocs/adrs/` — For Architectural Decision Records

### Commands

| Command | Description |
|---------|-------------|
| `github-publish` | Prepare repo for public release (README, license, badges, logo, etc.) |
| `npm-publish` | End-to-end npm release: cut release (semver bump from Conventional Commits + CHANGELOG generation) + pre-publish audit (package.json, tarball content, secrets, version sync) |
| `gitme` | Smart Git commits with logical grouping |
| `code-review` | Multi-specialist code review (4 modes: diff, file, complete, renovate) |
| `architecture-audit` | 7-dimension architecture assessment with A-E ratings |
| `qa` | Quality Square traceability (requirements, code, test cases, tests) |
| `create-cli` | Design CLI parameters, flags, and UX |
| `license-check` | Check dependency license compatibility (full scan or `--quick`) |
| `markdown-converter` | Convert files to Markdown (PDF, Word, images, audio, etc.) |
| `handover` | Save/load cross-session continuity snapshot (open items, blockers, next steps) with reconciliation against prior state |
| `init` | Initialize plugin in a project |
| `update-plugin` | Update plugin rules to latest version |
| `promote-perms` | Promote workspace permissions to user level |
| `help` | Show overview of all commands and skills |

All commands are invoked with the `/agenticaiplugin:` prefix, e.g. `/agenticaiplugin:code-review`.

### Code Review

```bash
/agenticaiplugin:code-review                    # Review uncommitted changes (default)
/agenticaiplugin:code-review src/UserService.js  # Review a single file
/agenticaiplugin:code-review --complete          # Review entire project
/agenticaiplugin:code-review --renovate          # Dependency audit
```

12 specialists run in parallel:

| # | Specialist | Focus |
|---|-----------|-------|
| 1 | Dependencies & Versions | Outdated deps, CVEs, framework modernization |
| 2 | Security & Data Safety | Credentials, injection, XSS, data loss |
| 3 | Architecture & Layers | Pattern violations, circular deps |
| 4 | Design Patterns (GoF) | Pattern consistency |
| 5 | SOLID & Code Smells | OCP/LSP/ISP/DIP, God Class, Feature Envy |
| 6a | Correctness & Bug Detection | YAGNI, logic/off-by-one bugs, behavioral change |
| 6b | Code Style & Size | Method/class size, magic numbers, immutability, naming |
| 7 | Dead Code & Duplication | DRY violations, unused code, magic numbers |
| 8 | Cross-Cutting Concerns | Error handling, logging, transactions |
| 9 | Test Quality | AAA structure, naming, placement |
| 10 | Test Completeness & Infra | Integration tests, E2E coverage |
| 11 | Documentation & Comments | Language, Javadoc/docstrings, TODOs |

Findings are deduplicated, sorted by severity, and consolidated into a single report. Project guidelines (`claudedocs/guidelines/*.md`) always override skill rules.

### GitHub Publish

```bash
/agenticaiplugin:github-publish                  # Full interactive setup
/agenticaiplugin:github-publish --readme         # README only
/agenticaiplugin:github-publish --license        # License only
/agenticaiplugin:github-publish --repo /path     # Target different repo
```

Creates a `feat/github-publish` branch with: LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, project logo (SVG), badges, status banner, GitHub Actions release workflow, and issue templates. Detects default/placeholder versions and suggests appropriate versioning based on development status. Audits for non-English content (German detection) and offers per-category translation of documentation, code comments, and user-facing strings to English. Scans for sensitive content (API keys, tokens, private email addresses, internal infrastructure references, local filesystem paths) and offers interactive redaction before publish. Shows a plan preview before making changes. Optionally offers a license compatibility check after completion.

### NPM Publish

```bash
/agenticaiplugin:npm-publish                       # Full release flow: cut + audit + fixes
/agenticaiplugin:npm-publish --repo /path          # Target a specific package directory
/agenticaiplugin:npm-publish --skip-release-cut    # Skip semver bump + CHANGELOG (already done)
/agenticaiplugin:npm-publish --audit-only          # Diagnostic only — no writes, no publish
```

End-to-end npm release workflow in one skill. The first half (Phase 2 "Release Cutting") detects the registry state, analyzes Conventional Commits since the last release tag, suggests a semver bump (patch/minor/major), bumps `package.json.version`, syncs hard-coded `VERSION` constants in source files, generates a Keep-a-Changelog entry from grouped commits, and produces a `chore(release): vX.Y.Z` commit. Skipped on first-publish, when local is already ahead of published, or via `--skip-release-cut` / `--audit-only`.

The second half audits across seven dimensions: `package.json` hygiene (required + recommended fields, `bin`-path prefix, `prepublishOnly` guard), version sync (informational if cutting ran, critical otherwise), license compliance (with explicit `NOTICE` handling for Apache-2.0), README sanity, tarball content scan (absolute paths, emails, IPs, hostnames, secret patterns for JWT/npm/GitHub/OpenAI/Anthropic/Slack/AWS tokens, dotfile leaks like `.claude/settings.local.json` documented by Check Point Research as a real-world credential vector, source-maps with embedded `sourcesContent`), registry state, and dependency vulnerabilities. Findings are classified Critical / Warning / Informational and presented for interactive remediation. The actual `npm publish` step requires explicit user confirmation in Phase 9 — default is "user runs publish manually" because of 2FA passkey/OTP interaction limits.

### Handover

```bash
/agenticaiplugin:handover               # Save (default): capture current state
/agenticaiplugin:handover save          # Same as above, explicit
/agenticaiplugin:handover load          # Load existing snapshot back into context
```

Cross-session continuity mechanism that complements Claude Code's auto-memory (which holds persistent semantic facts) with a *temporal* snapshot — "where was I, what's open, what's next?". Useful when a session approaches the context limit, when work pauses for the day, or when picking up after a break.

**Save mode** reads the existing snapshot first (if present), gathers live repo state (`git status`, `git log`, `gh issue list`, `gh pr list`), and synthesizes a new snapshot using **reconciliation rules**: items demonstrably resolved this session are dropped, items not mentioned are preserved as still-open by default, conflicts are resolved by current state, and the hands-off list carries forward unless explicitly freed. Writes to `<project_memory_dir>/handover.md` with a 7-section structure (Letzter Stand, Repo-State, Offene Items, Blocker, Geplante nächste Schritte, Referenzen, Hands-off-Liste), and indexes it via a one-line entry under `## Handover` in `MEMORY.md`.

**Load mode** reads the snapshot, performs a freshness check (warns at 15+ days, strongly at 30+), prints the full content into context, and suggests verification steps. Skill is explicit-trigger only (`disable-model-invocation: true`) — never auto-loads, since stale snapshots silently entering context would corrupt new sessions. One file per project, no archive; for a fresh start, delete `handover.md` manually.

## Configuration

### Project Guidelines

Create `.md` files in `claudedocs/guidelines/` to define project-specific rules that the code review respects:

```
claudedocs/guidelines/
├── exception-handling.md
├── logging-standards.md
├── code-style.md
└── architecture-patterns.md
```

Project guidelines **always override** plugin skill guidelines when conflicts occur.

### Plugin Configuration File

Optional, global per user: `agenticaiplugin.config.json` in the Claude config
directory (`$CLAUDE_CONFIG_DIR`, default `~/.claude`).

| Key | Values | Default | Effect |
|-----|--------|---------|--------|
| `prereqNotice` | `"on-change"` \| `"every-session"` | `"on-change"` | How often the session-start prerequisite check notifies about unmet feature prerequisites: only when the situation changes, or on every session start |
| `autoskill.enabled` | `true` \| `false` | `false` | Enable the self-learning skill mechanism (see [Autoskill](#autoskill-self-learning-skills)). Off by default because it spawns background `claude -p` runs |
| `autoskill.threshold` | integer | `10` | Tool calls per session before a background skill review is triggered |
| `autoskill.reviewerModel` | model alias | `"sonnet"` | Model used for the background reviewer/curator |
| `autoskill.nudgeInterval` | integer | `10` | Inject a silent learn reminder every N prompts (`0` disables it) |
| `autoskill.curator.enabled` | `true` \| `false` | `true` | Enable the lazy curator (lifecycle maintenance of learned skills) |
| `autoskill.curator.intervalDays` | integer | `7` | Days between curator runs |

### Autoskill (self-learning skills)

Opt-in mechanism that watches your sessions and distills reusable **learned
skills** into your user-level library (`~/.claude/skills/learned-*`), so a
technique or correction from one session is available in the next. It is
**disabled by default** — enable it with `"autoskill": { "enabled": true }` in
the config file above.

- After enough tool activity in a session, a background reviewer (a headless
  `claude -p` run — this is why it is opt-in and costs tokens) proposes a skill
  create/patch; the result surfaces as a 💾 note on your next prompt.
- `/agenticaiplugin:learn` distills a source (a directory, URL, notes, or the
  current conversation) into one skill on demand.
- `/agenticaiplugin:curator` runs lifecycle maintenance (stale > 30 days,
  archive > 90 days, never deletes) plus an overlap report.
- **Requires the `claude` CLI on PATH** for the background reviewer (only
  checked when autoskill is enabled).

### Feature Prerequisites

`prerequisites.json` (plugin root) is the central registry of external
requirements per feature (Node.js for hook-based features; the `claude` CLI for
autoskill). It is checked at three points:

1. **`/agenticaiplugin:init` and `/agenticaiplugin:update-plugin`** — warns with
   install hints; this also covers the case where Node itself is missing.
2. **Session start** — a hook injects a short notice when prerequisites are
   unmet (frequency per `prereqNotice` above). Known limitation: if Node itself
   is missing, this hook cannot run; you then see a plain hook error at session
   start — run `/agenticaiplugin:init` for guided diagnosis.
3. **Skills** — feature skills reference the same registry for their error
   guidance.

### Architectural Decision Records

Create `.md` files in `claudedocs/adrs/` to document architectural decisions. Both code review and architecture audit check compliance with documented ADRs.

## Project Structure

```
agenticaiplugin/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata
├── agents/
│   ├── github-publisher.md      # GitHub publish workflow
│   ├── license-checker.md       # License compatibility scanning
│   ├── npm-publisher.md         # npm publish audit and remediation
│   ├── project-initializer/     # Project setup and update sub-agents
│   │   ├── init-agenticai.md
│   │   ├── update-agenticai.md
│   │   └── cleanup-deprecated.md
│   └── project-initializer.md   # Project setup and updates (entry point)
├── rules-templates/             # Rule templates for project installation
├── skills/
│   ├── architecture-audit/      # 7-dimension architecture assessment
│   ├── code-review/             # 11-specialist code review
│   ├── create-cli/              # CLI interface design
│   ├── git-smart-commit/        # Intelligent commit creation
│   ├── github-publish/          # Public release preparation
│   ├── gitme/                   # Smart commit command alias
│   ├── handover/                # Cross-session continuity snapshots
│   ├── license-check/           # License compatibility checking
│   ├── npm-publisher/           # npm pre-publish audit
│   ├── help/                    # Plugin help overview
│   ├── init/                    # Project initialization
│   ├── markdown-converter/      # File-to-Markdown conversion
│   ├── promote-perms/           # Permission promotion
│   ├── qa/                      # Quality Square traceability
│   └── update-plugin/           # Plugin update management
├── docs/
│   ├── plugin-howto.md          # Plugin development reference
│   └── rules-howto.md           # Rules template reference
└── CLAUDE.md                    # Development instructions
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute, report bugs, and suggest features.

## License

Copyright 2026 Michael Kagel. Licensed under the Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
