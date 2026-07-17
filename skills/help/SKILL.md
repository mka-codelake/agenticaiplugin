---
description: Show overview of all plugin commands, skills, and agents
disable-model-invocation: true
model: haiku
effort: low
---

# AgenticAI Plugin Help

Shows an overview of all available commands, skills, and agents.

## Usage

```
/agenticaiplugin:help
```

No parameters required.

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Any other argument passed** → Display the Usage section above verbatim, then STOP. This command takes no parameters.

## Instructions

Show the user the following overview:

---

# AgenticAI Plugin - Overview

## Commands

### Project Setup
| Command | Description |
|---------|-------------|
| **init** | Initializes a project interactively. Creates plugin rules in .claude/rules/ and the claudedocs/ directory structure (guidelines/, adrs/) |

### Documentation
| Command | Description |
|---------|-------------|
| **github-publish** | Prepares a GitHub repository for public release: create/update README (baseline structure, badges, logo, status banner), license selection, version check, sensitive content audit (secrets, private data, internal refs), CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, GitHub Actions release workflow, issue templates. Modes: `--readme` (README only), `--license` (license only), `--repo <path>` (target a different repo) |
| **npm-publish** | End-to-end npm release workflow. Phase 2 cuts the release (analyzes Conventional Commits since last tag, suggests semver bump, updates `package.json.version`, syncs source-file VERSION constants, generates a Keep-a-Changelog entry, commits as `chore(release): vX.Y.Z`). Phases 3+ audit publish-readiness across seven dimensions (`package.json` hygiene including `bin` path prefix and `prepublishOnly` guard, version sync, license compliance with Apache-2.0 NOTICE handling, README sanity, tarball content scan for absolute paths/emails/IPs/hostnames/secret patterns/dotfile leaks/source-maps with embedded sourcesContent, registry state, dependency vulnerabilities). Findings classified Critical/Warning/Informational with interactive remediation. Modes: `--skip-release-cut` (skip Phase 2), `--audit-only` (skip Phase 2 + all writes/publish), `--repo <path>` (target a different package). Audit-only for the publish step by default — explicit confirmation required for actual `npm publish` |

### Development
| Command | Description |
|---------|-------------|
| **gitme** | Intelligent Git commits: analyzes all changes, groups them logically, and creates meaningful commit messages. Can create multiple commits when appropriate |
| **code-review** | Runs an intelligent code review. Four modes: no parameter = Git diff (default), with file = single file, `--complete` = entire project, `--renovate` = dependency audit (options: `--stack jvm/js/python`, `--quick`, `--save`) |
| **architecture-audit** | Comprehensive architecture audit: detects patterns, evaluates 7 dimensions (Boundaries, Dependencies, Naming, APIs, Wiring, Visibility), produces a scored report (A-E scale). Options: `--scope <path>` for partial audits |
| **qa** | Quality Assurance: manages bidirectional traceability between requirements, code, test cases, and tests ("Quality Square"). Analyzes code, extracts requirements, derives test cases, produces gap analysis. Option: `--force-rebuild` |
| **create-cli** | Designs CLI interfaces: arguments, flags, subcommands, help text, output formats, exit codes, prompts. Produces a compact spec for implementation |
| **license-check** | Checks license compatibility of all dependencies, tools, scripts, and LLM models against the project license. Modes: standard (full scan including transitive deps) or `--quick` (direct dependencies only). Report saved to `claudedocs/license-check-result.md` |

### Tools
| Command | Description |
|---------|-------------|
| **markdown-converter** | Converts files to Markdown via `uvx markitdown`. Supports PDF, Word, PowerPoint, Excel, HTML, CSV, JSON, XML, images, audio, ZIP, YouTube URLs, EPub |

### Communication
| Command | Description |
|---------|-------------|
| **persona** | Set or show the agent's communication persona (writer/engineer/telegrapher/caveman), trading response verbosity against token usage. Opt-in — off by default; subcommands `show`, `list`, `off`. State is global per user. Requires Node.js on PATH (state script + SessionStart hook) |

### Self-Learning (Autoskill)
| Command | Description |
|---------|-------------|
| **learn** | Distill a source (directory, URL, notes, or the current conversation) into exactly one reusable learned skill in the user-level library. Manual counterpart to the background reviewer |
| **curator** | Curate the learned-skill library: deterministic lifecycle (stale > 30d, archive > 90d, never delete) plus an overlap/quality report. Opt-in `autoskill` feature — off by default; requires Node.js and the `claude` CLI on PATH |

### Session
| Command | Description |
|---------|-------------|
| **handover** | Save (`save`, default) or load (`load`) a structured cross-session continuity snapshot in the project's auto-memory directory. Captures last activity, open items, blockers, planned next steps. Bridges sessions when context fills or work pauses |

### System
| Command | Description |
|---------|-------------|
| **update-plugin** | Updates plugin rules in .claude/rules/ to the latest version. Automatically migrates from legacy installations |
| **promote-perms** | Promotes workspace-specific permissions to user level (global). Useful when you want the same permissions across all projects |
| **help** | Shows this overview of all commands, skills, agents, and plugin rules |

---

## Project Structure (claudedocs/)

The plugin uses a `claudedocs/` directory for project-specific configuration:

| Directory | Purpose |
|-----------|---------|
| `claudedocs/guidelines/` | Your own coding rules that code review respects (e.g. exception handling, logging standards) |
| `claudedocs/adrs/` | Architecture Decision Records — documented architecture decisions used as context by code review and architecture audit |

These directories are created by `/agenticaiplugin:init`. You place your own `.md` files there — the plugin reads them but never modifies them.

---

## Skills (activated automatically)

Skills are knowledge modules that Claude loads automatically when certain keywords are detected.

### Development
- **git-smart-commit** - Rules for good commits
- **create-cli** - CLI design: arguments, flags, subcommands, output formats, exit codes (Command: `/agenticaiplugin:create-cli`)

### Compliance
- **license-check** - License compatibility checking (Command: `/agenticaiplugin:license-check`)

### Code Quality
- **code-review** - Multi-specialist code reviews (12 focused specialists)
- **qa** - Quality Square Traceability Manager (Command: `/agenticaiplugin:qa`)

### Architecture
- **architecture-audit** - Architecture audit with 7 analyzers and A-E ratings (Command: `/agenticaiplugin:architecture-audit`)

### Tools
- **markdown-converter** - File-to-Markdown conversion via markitdown (Command: `/agenticaiplugin:markdown-converter`)

---

## Agents (specialized sub-agents)

Agents are isolated contexts for specific tasks.

| Agent | Task |
|-------|------|
| **github-publisher** | Prepares repositories for public release on GitHub (including README creation) |
| **license-checker** | Scans project dependencies and checks license compatibility |
| **npm-publisher** | Cuts and audits npm releases (Phase 2: semver bump from Conventional Commits + CHANGELOG generation; Phase 3+: package.json hygiene, version sync, tarball content, secrets, dotfile leaks, registry state) |
| **project-initializer** | Sets up projects for the plugin and performs updates |

---

## Plugin Rules (always active after /agenticaiplugin:init)

These rules are installed in `.claude/rules/` during project initialization and permanently influence Claude's behavior:

| Rule | Behavior |
|------|----------|
| **Ask instead of assume** | Claude asks for clarification when uncertain rather than making assumptions |
| **Automatic code review** | After completing an implementation, Claude automatically runs a multi-specialist code review |
| **Git commits via skill** | `git commit` is never run directly — always via `/agenticaiplugin:gitme` |
| **Engineering principles** | Story traceability, code size limits, test classification, dependency management |
| **Protected directories** | `claudedocs/guidelines/` and `claudedocs/adrs/` are read-only — never modified |

---

**Tip:** Most skills activate automatically. For commands use `/agenticaiplugin:<command>`.
