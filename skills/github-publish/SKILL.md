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
/agenticaiplugin:github-publish [options]
```

| Option | Description |
|--------|-------------|
| *(no options)* | Full interactive setup on current directory |
| `--repo <path>` | Target a specific local repo directory instead of cwd |
| `--repo <github-url>` | Target a GitHub repo (resolves to local clone) |
| `--readme` | Enhance README only (badges, logo, status banner) |
| `--license` | License selection and file creation only |
| `--help` | Show this usage information |

Options can be combined: `--repo /path/to/project --readme`

### Examples

```
/agenticaiplugin:github-publish
/agenticaiplugin:github-publish --repo /home/user/projects/my-lib
/agenticaiplugin:github-publish --repo https://github.com/user/my-lib
/agenticaiplugin:github-publish --readme
/agenticaiplugin:github-publish --repo /path/to/project --license
```

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** -> Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags or invalid arguments** -> Display the Usage section above verbatim, then STOP.
3. **`--repo` without value** -> Display the Usage section above verbatim, then STOP.
4. **No argument** -> Proceed with Full Setup mode on current directory.

## What It Does

The `agenticaiplugin:github-publisher` agent performs an interactive, multi-phase workflow:

1. **Resolves** the target repo (cwd, local path, or GitHub URL -> local clone)
2. **Creates** a feature branch `feat/github-publish` for all changes
3. **Analyzes** the project (type, existing files, git remote, npm package)
4. **Displays** a status overview of what exists and what's missing
5. **Asks** targeted questions (project type, dev status, badges, logo, releases)
6. **Presents** a plan of all changes for user approval before execution
7. **Creates/updates** all necessary files in the correct order
8. **Summarizes** what was done, with push and PR instructions

### Feature Branch

All changes are made on a dedicated `feat/github-publish` branch. This allows you to:
- Push the branch and review changes via Pull Request on GitHub
- See exactly how badges, logo, and banner look in the rendered README
- Merge into main/master when satisfied

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
    prompt="Analyze this project and prepare for GitHub publish. Mode: {mode}. Repo: {repo_path_or_cwd}"
)
```

Where `{mode}` is one of: `full`, `readme-only`, `license-only`.

## Related

- **create-readme** - Standalone README creation (complementary — github-publish enhances existing READMEs)
- **git-smart-commit** - After github-publish, commit the generated files
