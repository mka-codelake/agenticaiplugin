---
description: |
  End-to-end npm release: cuts a release (semver bump from Conventional
  Commits, source-file VERSION sync, CHANGELOG generation), then audits
  package.json hygiene, version sync, license compliance, README,
  tarball content (privacy/secrets/dotfile leaks), registry state, and
  dependency vulnerabilities. Reports classified findings, offers
  interactive fixes, and verifies a clean `npm pack --dry-run`.
  Audit-only by default for the publish step; explicit confirmation
  required for actual publish.
  Invoke via /agenticaiplugin:npm-publish.
disable-model-invocation: true
effort: low
---

# NPM Publish

End-to-end release workflow for npm packages: release-cutting (semver decision + CHANGELOG generation) followed by publish-readiness audit and remediation.

## Usage

```
/agenticaiplugin:npm-publish [options]
```

| Option | Description |
|--------|-------------|
| *(no options)* | Full workflow on current directory: release cutting + audit + interactive fixes |
| `--repo <path>` | Target a specific local package directory instead of cwd |
| `--skip-release-cut` | Skip Phase 2 (no version bump, no CHANGELOG generation). Audit + fixes still run. |
| `--audit-only` | Skip Phase 2 AND Phase 5–10. Report findings only — no writes, no publish. |
| `--help` | Show this usage information |

### Examples

```
/agenticaiplugin:npm-publish                                  # full release flow
/agenticaiplugin:npm-publish --repo /home/user/projects/my-cli/app
/agenticaiplugin:npm-publish --skip-release-cut               # version is already bumped
/agenticaiplugin:npm-publish --audit-only                     # diagnostic only
```

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags or invalid arguments** → Display the Usage section above verbatim, then STOP.
3. **`--repo` without value** → Display the Usage section above verbatim, then STOP.
4. **`--audit-only` AND `--skip-release-cut` both passed** → fine, redundant but consistent (both skip Phase 2).
5. **No argument** → Proceed with full workflow on current directory.

## What It Does

The `agenticaiplugin:npm-publisher` agent runs an 11-phase workflow (Phases 0–10):

1. **Resolves** the target package (cwd or `--repo`); aborts cleanly on monorepos
2. **Checks** npm login state and 2FA status; offers a `chore/npm-publish-prep` branch
3. **Cuts the release** (Phase 2 — skipped via `--skip-release-cut` or `--audit-only`):
   - Detects registry state (first-publish / re-release / already-bumped / inconsistent)
   - Analyzes Conventional Commits since last release tag
   - Suggests bump type (patch / minor / major) — user confirms or overrides
   - Bumps `package.json.version`, syncs hard-coded VERSION constants in source files
   - Generates a Keep-a-Changelog entry from grouped commits — user reviews
   - Commits as `chore(release): vX.Y.Z`
4. **Audits** the package across seven dimensions:
   - **package.json hygiene** — required + recommended fields, common mistakes
   - **Version sync** — informational if cutting ran, critical otherwise
   - **License compliance** — LICENSE present + matches; for Apache-2.0: NOTICE in `files[]`
   - **README sanity** — exists, has Installation + Usage (mandatory for first publish)
   - **Tarball content** — builds a real `npm pack`, extracts, scans for absolute paths, emails, IPs, internal hostnames, real names, secret patterns (JWT, npm/GitHub/OpenAI/Anthropic/Slack/AWS tokens), dotfile leaks (`.claude/settings.local.json`, `.env`, `.npmrc`, `.aws/`, `.ssh/`, private keys), and source-maps with embedded `sourcesContent`
   - **Registry state** — first publish vs. update, version bump check, maintainer membership
   - **Dependencies** — `npm audit` for production deps, outdated check
5. **Displays** classified findings (Critical / Warning / Informational with `✓` `⚠` `ℹ` icons), prepended with a "Release Cut" summary if Phase 2 ran
6. **Asks** targeted fix questions (batched per category, per-finding for sensitive items like secrets)
7. **Presents** a complete change plan for user approval
8. **Applies** fixes (`Edit` for existing files, `Write` for new ones like `.npmignore`)
9. **Re-verifies** with a clean `npm publish --dry-run` and re-run of the tarball audit
10. **Optionally** triggers `npm publish` (only on explicit user confirmation)
11. **Post-publish** steps (git tag, end-to-end install test, GitHub Release offer using the CHANGELOG section as notes)

### Why this skill exists

Releasing to npm has more sharp edges than first-time publishers expect:
- `bin` paths with `./` prefix trigger npm 10+ warnings and are auto-corrected at publish time (your source-of-truth `package.json` then drifts from the registry)
- Hard-coded `VERSION` constants in source files silently drift from `package.json.version` after a bump — `--version` reports the wrong number
- Apache-2.0 requires `NOTICE` in the distribution; npm only auto-includes README/LICENSE/CHANGELOG, so `NOTICE` must be explicit in `files[]`
- Source-maps with `sourcesContent` would publish your full TypeScript source to the registry
- Check Point Research scanned ~46,500 npm packages and found `.claude/settings.local.json` in 428 of them — 30+ contained real npm tokens, GitHub PATs, or third-party service credentials
- Choosing the right semver bump from a long commit history is error-prone manually — Conventional Commits make it tractable

This skill catches all of the above before they reach the public registry, and orchestrates the bump + CHANGELOG entry that traditionally precedes the publish.

### Audit-Only Default for the Publish Step

The skill does not call `npm publish` unless the user explicitly accepts in Phase 9. The recommended path is the user runs `npm publish` themselves after the skill confirms the package is clean — npm `publish` typically requires interactive 2FA (passkey or OTP) which the agent cannot reliably handle from a non-interactive shell.

Phase 2 (release-cutting) DOES write changes (commits a `chore(release):` commit) when the user accepts a bump — but this is local and reversible (`git reset HEAD~1` undoes it).

### Single-Package Focus

Lerna, Nx, pnpm-workspaces, and npm-workspaces monorepos are detected in Phase 0 and abort the run with a clear out-of-scope message. Workaround: `cd` into the individual package directory and re-run with `--repo .`. Monorepo support may be added later.

### Files Created/Modified

| File | When |
|------|------|
| `package.json` | Edited in Phase 2 (version bump) and/or Phase 7 (add missing fields, fix `bin` path prefix, add `prepublishOnly`, list `NOTICE` in `files[]`) |
| Source files with VERSION constants | Edited in Phase 2 to sync with the new `package.json.version` |
| `CHANGELOG.md` | Created or prepended in Phase 2 with the new section (Keep a Changelog format) |
| `.npmignore` | Created in Phase 7 from the safe-default template if neither `files[]` nor `.npmignore` exists |
| Files with sensitive content | Edited in Phase 7 to redact, `.npmignore` entry to exclude, or deletion (per-finding user confirmation) |
| `.github/workflows/publish.yml` | Optional, on explicit user request — tag-triggered auto-publish workflow |

### Commits Created

| Phase | Commit |
|---|---|
| Phase 2 (if bump accepted) | `chore(release): v{X.Y.Z}` — version bump + synced VERSION constants + CHANGELOG entry |
| Phase 7 (if user approved fixes) | One or more commits, content depends on fixes (e.g., `fix: add NOTICE to package files[]`) |
| Phase 10 (if Phase 9 published) | Tag `v{X.Y.Z}` annotated, pushed |

## Execution

Invoke the `agenticaiplugin:npm-publisher` agent:

```
Agent(
    subagent_type="agenticaiplugin:npm-publisher",
    description="Cut and audit npm package for release",
    prompt="Run the npm release workflow on this package. Mode: {full | skip-release-cut | audit-only}. Repo: {repo_path_or_cwd}"
)
```

Where `mode` is `full` (default), `skip-release-cut`, or `audit-only`.

## Related

- **github-publish** — Repo-level public-release prep (LICENSE, CONTRIBUTING, badges, GitHub Actions). Run `github-publish` first if the repo isn't already public-ready, then `npm-publish` for package-specific concerns.
- **license-check** — Dependency license compatibility (broader than npm-publish's `npm audit`-based check). Consider running this before publishing public packages with many dependencies.
- **git-smart-commit** — Use for any non-release commits (Phase 7 fixes that warrant manual commit composition rather than the skill's automatic ones).
