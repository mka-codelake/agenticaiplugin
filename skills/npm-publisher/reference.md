# NPM Publisher — Reference

Long-form rules and pattern catalogs for the `npm-publisher` agent. Read selectively as needed during the workflow phases — the agent prompt references specific sections.

---

## 1. package.json Hygiene Catalog

### 1.1 Required Fields

These cause `npm publish` to fail or warn loudly. Critical findings.

| Field | Validation |
|---|---|
| `name` | Present, non-empty, lowercase, no spaces, no leading `.` or `_`, ≤ 214 chars total. Scoped names: `@scope/name`. |
| `version` | Present, valid semver (`MAJOR.MINOR.PATCH` plus optional `-prerelease` and `+build`). |
| `main` OR `bin` OR `exports` | At least one defined entry point. A package with none is technically allowed but practically broken. |
| `license` | Present. SPDX identifier preferred (`Apache-2.0`, `MIT`, `GPL-3.0-or-later`). String `UNLICENSED` is valid for proprietary. |

### 1.2 Recommended Fields

Best practice for public packages. Warnings if missing.

| Field | Recommendation |
|---|---|
| `description` | Non-empty, one-line summary. Shown on the npm registry page. |
| `author` | String `"Name"` or object `{name, email, url}`. |
| `repository` | Object `{type: "git", url: "git+https://github.com/..."}`. Drives the registry page's "Repository" link. |
| `bugs` | `{url: "https://github.com/.../issues"}`. |
| `homepage` | URL to docs site or repo README anchor. |
| `keywords` | Array, ≥ 1 entry. Drives npm search. |
| `engines.node` | Explicit constraint, e.g. `">=22.12.0"`. Prevents installs on incompatible Node. |
| `publishConfig.access` | `"public"` for unscoped or scoped-public packages. Defaults to `"restricted"` for scoped — would block public publish. |

### 1.3 Common Mistakes

| Pattern | Issue | Fix |
|---|---|---|
| `bin: "./dist/cli.js"` | npm 10+ warning: "script name was invalid and removed" — the `./` prefix triggers it. npm auto-corrects on publish, but your source diverges from the registry truth. | Drop the `./` prefix: `bin: "dist/cli.js"`. Run `npm pkg fix`. |
| `private: true` while planning to publish | `npm publish` blocks. Sometimes set as a guard during dev and forgotten. | Remove `private` field. |
| `main: "dist/index.js"` but `dist/` not in `files[]` | Published tarball lacks the entry point. Installers get a broken module. | Either add `dist/` to `files[]` or remove the `files[]` array. |
| Neither `files[]` nor `.npmignore` defined | Tarball includes everything not matching the npm default ignore list — typically leaks dev artifacts, configs, secrets. | Define one explicitly. Prefer `files[]` for explicit allowlisting, `.npmignore` for blocklist. |
| `scripts.prepublishOnly` missing | No quality gate before publish — typecheck/lint/build errors slip through. | Add `"prepublishOnly": "npm run typecheck && npm run lint && npm run build"` (using `npm run` is package-manager-neutral). |

### 1.4 Auto-Includes (npm Default)

Regardless of `files[]`, npm always includes:
- `package.json`
- `README*` (any case)
- `LICENSE` / `LICENCE` (any case)
- `CHANGELOG*` / `CHANGES*` / `HISTORY*`
- The file referenced by `main`
- The files referenced by `bin`

**Not auto-included:**
- `NOTICE` — must be explicit in `files[]` for Apache-2.0 compliance
- Any other docs

---

## 2. License Compliance

### 2.1 Apache-2.0 Specific

The Apache 2.0 license requires that any distribution include the `NOTICE` file. For npm packages this means:

1. `NOTICE` file exists at package root
2. `NOTICE` is listed in `package.json.files[]` if `files[]` is used (npm does NOT auto-include NOTICE — see Section 1.4)
3. `NOTICE` contains at minimum a copyright line (`Copyright {year} {holder}`) and an attribution line

If `files[]` is not used (i.e., `.npmignore`-based exclusion), `NOTICE` is included by default unless explicitly excluded.

### 2.2 SPDX Validation

Compare `package.json.license` against the LICENSE file's actual content:
- `Apache-2.0` → LICENSE should start with `Apache License` and `Version 2.0`
- `MIT` → LICENSE should contain `MIT License` or `Permission is hereby granted, free of charge`
- `GPL-3.0-or-later` / `GPL-3.0-only` → `GNU GENERAL PUBLIC LICENSE` `Version 3`
- `BSD-3-Clause` / `BSD-2-Clause` → starts with `Copyright` then `Redistribution and use`
- `ISC` → `Permission to use, copy, modify, and/or distribute`

Mismatch is a critical finding (legal exposure).

### 2.3 README License Section

The README should mention the license name with a link to the LICENSE file. Pattern:

```markdown
## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
```

Missing → warning. Don't auto-create — push to `github-publish` skill which handles README structure.

---

## 3. Tarball Content Audit

### 3.1 Workflow

1. Build a real tarball: `cd {repo_path} && npm pack --json` (captures filename)
2. Extract to a tempdir: `mktemp -d -t npm-audit-XXXXXXXX`, then `tar -xzf`
3. Run all scans against the extracted `package/` directory
4. **Always clean up** in a `finally`-equivalent: delete tempdir and the `.tgz` from the package directory

`npm pack` runs `prepack` and `postpack` hooks, so the tarball contents reflect what `npm publish` would actually upload — including any prepack-generated files (e.g., README/LICENSE copies in monorepo subpackages).

### 3.2 Absolute Filesystem Paths (Critical)

Leaks build-environment paths and reveals OS / username structure.

```bash
grep -rnE "/home/[a-zA-Z]|/Users/[a-zA-Z]|/root/[a-zA-Z]|/mnt/[a-z]/|C:\\\\[Uu]sers" \
  $PKG_DIR --include="*.js" --include="*.json" --include="*.md" --include="*.map" 2>/dev/null
```

Common sources:
- Source-maps with absolute `sources` paths (TypeScript misconfigured — should emit relative)
- Webpack/Rollup output without proper `sourceRoot`
- Build artifacts with embedded path strings
- Hard-coded test fixtures referencing absolute paths

Allowlist:
- `/tmp/` paths in test fixtures (warning, not critical)
- Documentation discussing canonical paths like `/usr/local/bin` (not actual user paths)

### 3.3 Email Addresses (Warning)

```bash
grep -rnE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" \
  $PKG_DIR --include="*.js" --include="*.json" --include="*.md" --include="*.txt" 2>/dev/null
```

Whitelist — these are expected and not findings:
- `package.json.author.email` (the author opted in)
- `package.json.maintainers[].email`
- Email in `NOTICE` if it's the copyright holder
- The Apache 2.0 license file boilerplate (`http://www.apache.org/licenses/LICENSE-2.0`)
- `test@example.com`, `user@example.com`, `noreply@*` (documentation/test patterns)

Other matches → ask user per file (could be intentional contact info, could be leakage).

### 3.4 IP Addresses (Warning)

```bash
grep -rnE "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" $PKG_DIR \
  --include="*.js" --include="*.json" --include="*.md" 2>/dev/null
```

Allowlist (always OK):
- `127.0.0.1`, `0.0.0.0`, `255.255.255.255`
- Documentation ranges: `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`
- IPv4-version-strings in non-IP context (e.g., `version: "1.2.3.4"` is unusual but not an IP)

Findings worth flagging:
- RFC 1918 private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- Public IPs (could be infrastructure leak)

### 3.5 Hostnames (Warning)

```bash
grep -rnE "\b(localhost|[a-z0-9-]+\.local|[a-z0-9-]+\.lan|[a-z0-9-]+\.intern|[a-z0-9-]+\.corp|[a-z0-9-]+\.intranet|raspberry[a-z0-9-]*|rpi[0-9-]*|pihole[a-z0-9-]*|homelab[a-z0-9-]*)\b" $PKG_DIR \
  --include="*.js" --include="*.json" --include="*.md" --include="*.txt" 2>/dev/null
```

Downgrade to informational: `localhost` alone, "local DB", "local file system" (legitimate documentation patterns).

Critical-ish: Custom internal hostnames (`pihole-pi`, `homelab-server`) suggest leak from infrastructure setup.

### 3.6 Secret Patterns (CRITICAL)

The most important audit. Use this regex catalog:

| Pattern | Regex | Source |
|---|---|---|
| JWT | `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+` | Three base64url segments separated by dots, header always starts with `eyJ` (encoded `{"`) |
| npm token | `npm_[A-Za-z0-9]{36,}` | npm v7+ format |
| GitHub PAT (classic) | `ghp_[A-Za-z0-9]{36,}` | GitHub Personal Access Token v2 |
| GitHub PAT (fine-grained) | `github_pat_[A-Za-z0-9_]{82,}` | GitHub fine-grained PAT |
| GitHub OAuth | `gho_[A-Za-z0-9]{36,}` | OAuth user-to-server tokens |
| OpenAI API | `sk-[A-Za-z0-9]{32,}` (legacy), `sk-proj-[A-Za-z0-9_-]{40,}` (project keys) | OpenAI standard format |
| Anthropic API | `sk-ant-[A-Za-z0-9_-]{32,}` | Anthropic / Claude |
| Slack Bot/User | `xox[bpaorsl]-[A-Za-z0-9-]{10,}` | Slack token classes |
| AWS Access Key | `AKIA[0-9A-Z]{16}` | AWS IAM access key |
| AWS Secret | `(?i)aws_secret_access_key\s*[:=]\s*['\"]?[A-Za-z0-9/+=]{40}['\"]?` | Pair with AKIA or alone |
| Stripe Secret | `sk_live_[A-Za-z0-9]{24,}` | Production Stripe key |
| Google API | `AIza[0-9A-Za-z_-]{35}` | Google Cloud API key |
| Discord Bot | `[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}` | Discord bot token |
| Generic high-entropy assignment | `(?i)(api[_-]?key\|password\|secret\|token\|bearer\|credential\|access[_-]?token)\s*[:=]\s*['\"][^'\"]{16,}['\"]` | Lower-confidence catch-all |
| Private key headers | `-----BEGIN (RSA \|EC \|OPENSSH \|PGP \|)PRIVATE KEY-----` | SSH/PGP private keys embedded as strings |

### 3.7 Dotfile-Hygiene (CRITICAL)

Files that should never appear in published tarballs. Documented credential-leak vectors.

```bash
find $PKG_DIR -type f \( \
  -path '*/.claude/*' -o \
  -name 'settings.local.json' -o \
  -name '.env' -o -name '.env.*' -o -name '*.env' -o \
  -name '.npmrc' -o \
  -path '*/.aws/*' -o -path '*/.ssh/*' -o \
  -name 'id_rsa*' -o -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' \
\) 2>/dev/null
```

**Reference:** Check Point Research scanned ~46,500 npm packages in late 2025 and found:
- 428 packages contained `.claude/settings.local.json`
- ~30 of those (≈ 7%) contained real credentials: npm tokens, GitHub PATs, Telegram bot tokens, Hugging Face API keys, Bearer tokens for third-party services
- Source: https://securitybrief.asia/story/claude-code-can-leak-secrets-in-public-npm-packages

The `.claude/` directory is meant for local Claude Code workspace settings and should be added to `.npmignore` and `.gitignore`. The skill's default `.npmignore.j2` template covers this and the broader credential-file patterns.

### 3.8 Source-Maps with Embedded `sourcesContent` (Warning)

Source-maps reference original source files via the `sources` array. They optionally embed the original content via `sourcesContent`. When TypeScript projects publish only the compiled output (`dist/`), source-maps with `sourcesContent` effectively republish the entire TypeScript source — defeating the point of distributing only compiled JS.

```bash
find $PKG_DIR -name "*.map" -type f 2>/dev/null | while read f; do
  python3 -c "
import json,sys
m = json.load(open('$f'))
if m.get('sourcesContent') and any(s for s in m['sourcesContent']):
    print('$f')
" 2>/dev/null
done
```

To fix at the source: `tsconfig.json` → `compilerOptions.sourceMap: true` (no `inlineSources`, no `inlineSourceMap`).

Source-maps with `sources` containing absolute paths fall under Section 3.2.

### 3.9 False-Positive Downgrades

Apply these before reporting findings to avoid noise:

| Path/File pattern | Treatment |
|---|---|
| `*test*`, `*spec*`, `__tests__/`, `tests/`, `fixtures/`, `testdata/` | Downgrade Critical → Warning. Test data legitimately contains fake credentials. |
| `*.example`, `*.sample` | Downgrade to informational. These are templates by definition. |
| Comments referencing patterns by name (`// example: sk-XXXX...`) | Strip from match list. |
| Environment variable references (`process.env.OPENAI_API_KEY`) | Not a finding — it's the *correct* pattern. |

---

## 4. Version Sync

### 4.1 Detection

Search source files for hard-coded version strings that should match `package.json.version`:

```bash
grep -rEn "(VERSION|version)\s*[:=]\s*['\"][0-9]+\.[0-9]+\.[0-9]+['\"]" \
  --include="*.ts" --include="*.js" --include="*.mjs" --include="*.cjs" \
  --include="*.py" --include="*.go" --include="*.rs" --include="*.java" \
  {repo_path}/src {repo_path}/app/src {repo_path}/lib 2>/dev/null
```

Common patterns:
- `const VERSION = "1.2.3"` (CLI tools showing `--version`)
- `const APP_VERSION = "1.2.3"` (banner/about strings)
- `version: "1.2.3"` (config objects, unrelated package.json reads)
- Python: `__version__ = "1.2.3"`
- Go: `var Version = "1.2.3"`
- Rust: `pub const VERSION: &str = "1.2.3";`

### 4.2 Resolution

For each mismatch, ask the user:
- **Update source file** to match `package.json` (most common case — the source forgot to bump)
- **Update package.json** to match source (rare — source was bumped but package.json missed)
- **Skip** (intentional divergence — e.g., the constant tracks something else)

### 4.3 Why this is critical

Real example from `aiknowledgedb` v2.1.0 publish: `package.json` was bumped to `2.1.0`, but `app/src/cli.ts:43` retained `const VERSION = '2.0.0'`. The published binary reported `aiknowledgedb --version` → `2.0.0`, contradicting the registry metadata. Caught only because the publisher manually verified — without an audit, it would have shipped wrong.

Better solutions exist (e.g., `import {version} from '../package.json' assert {type: 'json'}`), but they require build-time tooling. For now, sync detection is the pragmatic guard.

---

## 5. `.npmignore` Strategy

If neither `files[]` nor `.npmignore` exists, create `.npmignore` from `templates/.npmignore.j2`. Cover at minimum:

- Claude Code workspace (`.claude/`, `CLAUDE.md`, `claudedocs/`) — Check Point finding
- Secrets (`.env*`, `.npmrc`, SSH/AWS dirs, private keys)
- Dev artifacts (`.git/`, `node_modules/`, `*.log`, `*.tsbuildinfo`, `coverage/`)
- IDE configs (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Local notes (`TODO.md`, `NOTES.md`)

If `files[]` exists, the inverse logic applies — `files[]` is an allowlist, so most paths are excluded by default. In that case, the audit should still surface `.claude/` etc. if they slip through somehow (e.g., a `files[]` entry like `"src/**"` could accidentally match `src/.claude/`).

---

## 6. Registry State

### 6.1 First Publish

`npm view <name>` returns 404 → name is available. Verify before publish.

For first publishes, mandate:
- README has Installation section
- README has Usage section
- All recommended `package.json` fields populated (no warnings)

### 6.2 Update Publish

`npm view <name>` returns metadata. Compare:
- `package.json.version` MUST be strictly greater than `npm view <name> version` (latest)
- Detect bump type: patch / minor / major
- For major bumps: warn user to confirm (breaking changes are publicly visible commitment)
- Verify current `npm whoami` user is in the maintainers list

### 6.3 Maintainer Email Privacy

`npm view <pkg> maintainers` shows username + email of every maintainer. The maintainer email is the email registered to the npm account. If the user has privacy concerns, recommend setting a forwarding alias (e.g., addy.io custom-domain) in npm Profile Settings. Note: npm blocks addy.io / SimpleLogin / similar disposable-email providers at *account creation* time, but accepts them in *profile updates* — workaround is signup with a real email, then change to alias.

---

## 7. Optional GitHub Actions Auto-Publish

If the user wants tag-triggered auto-publish, generate `.github/workflows/publish.yml` from `templates/publish.yml.j2`. Requires:

- `NPM_TOKEN` secret in repo settings (npm Granular Access Token, scoped to the package, with `read+write` permission, expiration set)
- 2FA: depending on token type, may bypass 2FA — granular tokens with 2FA-required setting are safer
- Trigger: `on: push: tags: ['v*']` (matches semver tags)

The workflow runs `npm install`, `npm run build` (if defined), then `npm publish --provenance` (if enabled — npm provenance attests the build came from this workflow, increases supply-chain trust).

---

## 8. Phase 8 Auto-Publish: Why "Recommend No"

Phase 8 offers to run `npm publish` from the agent. The default recommendation is **No, user publishes manually**. Reasons:

1. **2FA interaction** — most accounts use TOTP/passkey for publish auth. Bash-tool invocation of `npm publish` cannot answer an interactive auth prompt.
2. **Irreversibility** — `npm unpublish` is restricted to 72 hours after publish, with conditions. A bad publish (wrong files, wrong version) needs a `2.x.y+1` patch publish, not undo.
3. **User accountability** — the maintainer pressing publish themselves is a deliberate, reviewable action. Agent-triggered publish dilutes that.

The skill emphasizes "audit clean, ready to publish — here's the command" as the primary success path. Auto-publish is opt-in, not opt-out.

---

## 9. Out-of-Scope (Document, Don't Implement)

If the user requests these, point to alternatives or future work:

- **Monorepo support** (Lerna/Nx/pnpm-workspaces) — eachpackage has its own audit; needs orchestration. Aborted in Phase 0.
- **`npm unpublish`** — different tool, time-window restricted, security-sensitive. Use `npm` CLI directly.
- **`npm deprecate`** — marks a version as deprecated without removal. Different workflow.
- **Yarn / pnpm publish** — npm CLI is the lowest-common-denominator. Yarn/pnpm proxy to npm anyway for the publish step.
- **Private-registry authentication** (GitHub Packages, GitLab Package Registry, Verdaccio, JFrog Artifactory) — different `.npmrc` setup per registry, often org-specific tokens.
- **Code signing / npm provenance** — `npm publish --provenance` is supported but requires GitHub Actions + OIDC setup; covered briefly in the optional auto-publish workflow template, not as a standalone audit step.
- **CHANGELOG generation** — adjacent concern, fits a `release-cutter` skill better.
