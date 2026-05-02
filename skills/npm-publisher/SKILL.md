---
description: |
  Pre-publish audit for npm packages. Validates package.json hygiene, version sync
  between package.json and source constants, license compliance (incl. Apache-2.0
  NOTICE handling), README completeness, tarball content (privacy/secrets/dotfile
  leaks), registry state, and dependency vulnerabilities. Reports classified
  findings, offers interactive fixes, and verifies a clean `npm pack --dry-run`.
  Audit-only by default; explicit confirmation required for actual publish.
  Invoke via /agenticaiplugin:npm-publish.
disable-model-invocation: true
---

# NPM Publish

Pre-publish audit and remediation for npm packages.

## Usage

```
/agenticaiplugin:npm-publish [options]
```

| Option | Description |
|--------|-------------|
| *(no options)* | Full audit + interactive fixes on current directory |
| `--repo <path>` | Target a specific local package directory instead of cwd |
| `--audit-only` | Skip Phase 4–9 (interactive fixes, publish, post-publish). Report findings only. |
| `--help` | Show this usage information |

### Examples

```
/agenticaiplugin:npm-publish
/agenticaiplugin:npm-publish --repo /home/user/projects/my-cli/app
/agenticaiplugin:npm-publish --audit-only
```

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags or invalid arguments** → Display the Usage section above verbatim, then STOP.
3. **`--repo` without value** → Display the Usage section above verbatim, then STOP.
4. **No argument** → Proceed with full audit on current directory.

## What It Does

The `agenticaiplugin:npm-publisher` agent runs a 9-phase workflow:

1. **Resolves** the target package (cwd or `--repo`); aborts cleanly on monorepos
2. **Checks** npm login state and 2FA status; offers a `chore/npm-publish-prep` branch
3. **Audits** the package across seven dimensions:
   - **package.json hygiene** — required + recommended fields, common mistakes
   - **Version sync** — `package.json.version` vs. hard-coded version constants in source files
   - **License compliance** — LICENSE present + matches; for Apache-2.0: NOTICE in `files[]`
   - **README sanity** — exists, has Installation + Usage (mandatory for first publish)
   - **Tarball content** — builds a real `npm pack`, extracts, scans for absolute paths, emails, IPs, internal hostnames, real names, secret patterns (JWT, npm/GitHub/OpenAI/Anthropic/Slack/AWS tokens), dotfile leaks (`.claude/settings.local.json`, `.env`, `.npmrc`, `.aws/`, `.ssh/`, private keys), and source-maps with embedded `sourcesContent`
   - **Registry state** — first publish vs. update, version bump check, maintainer membership
   - **Dependencies** — `npm audit` for production deps, outdated check
4. **Displays** classified findings (Critical / Warning / Informational with `✓` `⚠` `ℹ` icons)
5. **Asks** targeted fix questions (batched per category, per-finding for sensitive items like secrets)
6. **Presents** a complete change plan for user approval
7. **Applies** fixes (`Edit` for existing files, `Write` for new ones like `.npmignore`)
8. **Re-verifies** with a clean `npm publish --dry-run` and re-run of the tarball audit
9. **Optionally** triggers `npm publish` (only on explicit user confirmation) and runs post-publish steps (git tag, end-to-end install test, GitHub Release offer)

### Why this skill exists

Publishing to npm has more sharp edges than first-time publishers expect:
- `bin` paths with `./` prefix trigger npm 10+ warnings and are auto-corrected at publish time (your source-of-truth `package.json` then drifts from the registry)
- Hard-coded `VERSION` constants in source files silently drift from `package.json.version` after a bump — `--version` reports the wrong number
- Apache-2.0 requires `NOTICE` in the distribution; npm only auto-includes README/LICENSE/CHANGELOG, so `NOTICE` must be explicit in `files[]`
- Source-maps with `sourcesContent` would publish your full TypeScript source to the registry
- Check Point Research scanned ~46,500 npm packages and found `.claude/settings.local.json` in 428 of them — 30+ contained real npm tokens, GitHub PATs, or third-party service credentials

This skill catches all of the above before they reach the public registry.

### Audit-Only Default

The skill does not call `npm publish` unless the user explicitly accepts in Phase 8. The recommended path is the user runs `npm publish` themselves after the skill confirms the package is clean — npm `publish` typically requires interactive 2FA (passkey or OTP) which the agent cannot reliably handle from a non-interactive shell.

### Single-Package Focus

Lerna, Nx, pnpm-workspaces, and npm-workspaces monorepos are detected in Phase 0 and abort the run with a clear out-of-scope message. Workaround: `cd` into the individual package directory and re-run with `--repo .`. Monorepo support may be added later.

### Files Created/Modified

| File | When |
|------|------|
| `package.json` | Edited to add missing fields, fix `bin` path prefix, add `prepublishOnly`, list `NOTICE` in `files[]` |
| `.npmignore` | Created from the safe-default template if neither `files[]` nor `.npmignore` exists |
| Source files with version mismatches | `Edit` to sync hard-coded VERSION constants with `package.json.version` |
| Files with sensitive content | `Edit` to redact, `.npmignore` entry to exclude, or deletion (per-finding user confirmation) |
| `.github/workflows/publish.yml` | Optional, on explicit user request — tag-triggered auto-publish workflow |

## Execution

Invoke the `agenticaiplugin:npm-publisher` agent:

```
Agent(
    subagent_type="agenticaiplugin:npm-publisher",
    description="Audit npm package for publish-readiness",
    prompt="Audit this npm package and prepare it for publish. Mode: {full | audit-only}. Repo: {repo_path_or_cwd}"
)
```

Where `mode` is `full` (default) or `audit-only`.

## Related

- **github-publish** — Repo-level public-release prep (LICENSE, CONTRIBUTING, badges, GitHub Actions). Run `github-publish` first if the repo isn't already public-ready, then `npm-publish` for package-specific concerns.
- **license-check** — Dependency license compatibility (broader than npm-publish's `npm audit`-based check). Consider running this before publishing public packages with many dependencies.
- **git-smart-commit** — After `npm-publish` applies fixes, commit the changes via this skill.
