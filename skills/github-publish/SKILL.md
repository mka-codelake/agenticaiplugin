---
description: |
  Prepare GitHub repository for public release. Creates/enhances README (badges,
  logo, status banner), LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md,
  GitHub Actions release workflow, issue templates.
  Invoke via /agenticaiplugin:github-publish.
disable-model-invocation: true
---

# GitHub Publish

Prepares a repository for professional public release on GitHub.

## Usage

```
/agenticaiplugin:github-publish [--readme | --license]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Full Setup** | `/agenticaiplugin:github-publish` | Interactive complete workflow — all aspects |
| **README Only** | `/agenticaiplugin:github-publish --readme` | Enhance README only (badges, logo, status banner) |
| **License Only** | `/agenticaiplugin:github-publish --license` | License selection and file creation only |

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** -> Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags or invalid arguments** -> Display the Usage section above verbatim, then STOP.
3. **No argument** -> Proceed with Full Setup mode (default).

## What It Does

The `agenticaiplugin:github-publisher` agent performs an interactive, multi-phase workflow:

1. **Analyzes** the project (type, existing files, git remote, npm package)
2. **Displays** a status overview of what exists and what's missing
3. **Asks** targeted questions (project type, dev status, badges, logo, releases)
4. **Creates/updates** all necessary files in the correct order
5. **Summarizes** what was done and next steps

### Files Created/Enhanced

| File | Purpose |
|------|---------|
| `etc/logo.svg` | Project logo (SVG, generated or user-provided) |
| `LICENSE` | License text (MIT, Apache 2.0, or GPL v3) |
| `NOTICE` | Attribution file (Apache 2.0 only) |
| `CONTRIBUTING.md` | Contribution guidelines |
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 |
| `SECURITY.md` | Vulnerability reporting policy |
| `.github/workflows/release.yml` | Automated release workflow |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template |
| `README.md` | Enhanced with logo, badges, status banner |

## Execution

Invoke the `agenticaiplugin:github-publisher` agent:

```
Agent(
    subagent_type="agenticaiplugin:github-publisher",
    description="Prepare repository for public GitHub release",
    prompt="Analyze this project and prepare for GitHub publish. Mode: {mode}"
)
```

Where `{mode}` is one of: `full`, `readme-only`, `license-only`.

## Related

- **create-readme** - Standalone README creation (complementary — github-publish enhances existing READMEs)
- **git-smart-commit** - After github-publish, commit the generated files
