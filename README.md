<img src="./etc/logo.svg" width="400" align="right" alt="AgenticAI Plugin"/>

# AgenticAI Plugin

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

> [!NOTE]
> **AgenticAI Plugin** is in beta. Skills, agents, and conventions may change between minor versions.

A Claude Code plugin that adds intelligent code reviews, architecture audits, quality assurance traceability, smart Git commits, and GitHub repository publishing to your development workflow.

## Overview

The AgenticAI Plugin enhances Claude Code with specialized skills and agents that activate automatically when you need them. Code reviews run 11 focused specialists in parallel, architecture audits score your codebase across 7 dimensions, and smart commits analyze your changes to create meaningful atomic commits.

The plugin is **language-agnostic** — it works with any tech stack (Node.js, Java, Python, Rust, Go, .NET, and more). Project-specific rules and architectural decisions are stored in `claudedocs/` and always take priority over the plugin's built-in guidelines.

## Features

- **Multi-Specialist Code Review** — 11 focused review specialists run in parallel, covering security, architecture, SOLID principles, code quality, test coverage, documentation, and more
- **Architecture Audit** — 7-dimension analysis with A-E ratings (boundaries, dependencies, naming, APIs, wiring, visibility, patterns)
- **QA Traceability** — Bidirectional mapping between requirements, code, test cases, and tests ("Quality Square")
- **Smart Git Commits** — Analyzes changes, groups them logically, creates atomic commits following project conventions
- **GitHub Publish** — Prepares repositories for public release: README (with baseline structure validation), LICENSE, CONTRIBUTING, badges, logo, GitHub Actions, issue templates
- **CLI Design** — Designs CLI interfaces: arguments, flags, subcommands, help text, output formats, exit codes
- **License Check** — Scans dependencies, tools, scripts, and LLM model references for license compatibility issues across 7 ecosystems
- **Markdown Converter** — Converts PDF, Word, PowerPoint, Excel, images, audio, and more to Markdown
- **Modular Rules System** — Plugin rules installed per-project, selectively updatable

## Installation

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and configured
- Access to a local marketplace directory

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
| `gitme` | Smart Git commits with logical grouping |
| `code-review` | Multi-specialist code review (4 modes: diff, file, complete, renovate) |
| `architecture-audit` | 7-dimension architecture assessment with A-E ratings |
| `qa` | Quality Square traceability (requirements, code, test cases, tests) |
| `create-cli` | Design CLI parameters, flags, and UX |
| `license-check` | Check dependency license compatibility (full scan or `--quick`) |
| `markdown-converter` | Convert files to Markdown (PDF, Word, images, audio, etc.) |
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

11 specialists run in parallel:

| # | Specialist | Focus |
|---|-----------|-------|
| 1 | Dependencies & Versions | Outdated deps, CVEs, framework modernization |
| 2 | Security & Data Safety | Credentials, injection, XSS, data loss |
| 3 | Architecture & Layers | Pattern violations, circular deps |
| 4 | Design Patterns (GoF) | Pattern consistency |
| 5 | SOLID & Code Smells | OCP/LSP/ISP/DIP, God Class, Feature Envy |
| 6 | Code Quality & Correctness | YAGNI, SRP, logic errors |
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

Creates a `feat/github-publish` branch with: LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, project logo (SVG), badges, status banner, GitHub Actions release workflow, and issue templates. Shows a plan preview before making changes. Optionally offers a license compatibility check after completion.

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
│   └── project-initializer.md   # Project setup and updates
├── rules-templates/             # Rule templates for project installation
├── skills/
│   ├── architecture-audit/      # 7-dimension architecture assessment
│   ├── code-review/             # 11-specialist code review
│   ├── create-cli/              # CLI interface design
│   ├── git-smart-commit/        # Intelligent commit creation
│   ├── github-publish/          # Public release preparation
│   ├── gitme/                   # Smart commit command alias
│   ├── license-check/           # License compatibility checking
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
