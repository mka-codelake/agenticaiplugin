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
| `description` | Non-empty, one-line summary. Shown on the npm registry page. Content is additionally matched (case-insensitive, word boundaries) against publication-warning markers — `DO NOT PUBLISH`, `FIXTURE`, `TEST`, `PROTOTYPE`, `PLACEHOLDER`, `TODO`, and `PRIVATE` unless `private: true` is set. A match is a warning, not a block. |
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

1. Build a real tarball: `cd "{repo_path}" && npm pack --json` (captures filename). If it yields no tarball name, abort the tarball audit — an empty `$PKG_DIR` makes every scan below report "nothing found" for a package that was never scanned.
2. Extract to a tempdir: `mktemp -d -t npm-audit-XXXXXXXX`, then `tar -xzf`
3. Run all scans against the extracted `package/` directory
4. **Always clean up** in a `finally`-equivalent: delete tempdir and the `.tgz` from the package directory

`npm pack` runs `prepack` and `postpack` hooks, so the tarball contents reflect what `npm publish` would actually upload — including any prepack-generated files (e.g., README/LICENSE copies in monorepo subpackages).

**All scans below use `grep -o`, and none of them redirects stderr.** Both are load-bearing in
a *published tarball* specifically, because most of what is in one is minified — and a minified
file is a single line, so `grep -n` without `-o` answers every match with the entire file. The
worst measured case is the one this section explicitly scans for: a 2.8 MB source-map whose
`sources` array carries 200 absolute build paths returned **2,812,052 B**, and a map with a
single leaked path returns its whole megabyte for that one hit. `2>/dev/null` goes for the
reason it went everywhere else in #63 — it makes "the directory is not there" indistinguishable
from "this package is clean". grep exits 1 when it finds nothing and ≥ 2 when it could not
look; treat only the former as a passed scan.

**Seven of the eleven patterns needed nothing beyond `-o`.** A token pattern ends at the first
character outside its own alphabet, so the match *is* the token: JWT, npm, GitHub, OpenAI,
Anthropic, Slack and AWS keys measured 145–252 B each against a 1.4 MB minified bundle, down
from 1,400,642 B. Three patterns end in a class that keeps running through minified code and
needed an upper bound on top of `-o`; they are marked at their sections below. The eleventh,
the absolute-path pattern, needed the opposite — it matches only a prefix, so `-o` alone
printed `/home/b`.

| Scan | before | after |
|---|---|---|
| 3.2 absolute paths | 2,812,052 B | 37,636 B |
| 3.3 emails | did not finish in 45 s | 296 B |
| 3.4 IP addresses | 1,400,642 B | 134 B |
| 3.5 hostnames | 1,400,790 B / 41.6 s | 281 B / 0.6 s |
| 3.6 seven prefixed secret patterns | 1,400,642 B each | 145–252 B each |
| 3.6 generic catch-all | 1,500,136 B | 647 B |

The two timing entries are not a footnote. The email pattern **never returned** on a minified
bundle — 45 s and killed, with the address it was looking for sitting in the file. An
unbounded `+` in front of an anchor makes the scan quadratic in line length, so the failure
mode is not "too much output", it is a secret scan that reports nothing because it was
stopped.

### 3.2 Absolute Filesystem Paths (Critical)

Leaks build-environment paths and reveals OS / username structure.

```bash
grep -rnoE "(/home/[a-zA-Z]|/Users/[a-zA-Z]|/root/[a-zA-Z]|/mnt/[a-z]/)[A-Za-z0-9._/-]{0,200}|C:\\\\[Uu]sers[A-Za-z0-9._\\\\-]{0,200}" \
  "$PKG_DIR" --include="*.js" --include="*.json" --include="*.md" --include="*.map"
```

The `{0,200}` tail exists so the match is worth printing. The original pattern stops after the
first character of the username, so `-o` would report `/home/b` — the finding would say a path
leaked without saying which. A `{0,n}` tail matches the empty string, so it cannot cost a hit
the prefix alone would have found; the regression check over every pattern class in 3.2–3.6
confirmed identical hit locations before and after.

**A source-map is one finding, not two hundred.** The 200 hits in the measured map are the 200
entries of its `sources` array, all from the same build tree. Report the file, the count and
the common root — not one finding per entry — and see 3.8, which deals with source-map hygiene
as its own problem.

Common sources:
- Source-maps with absolute `sources` paths (TypeScript misconfigured — should emit relative)
- Webpack/Rollup output without proper `sourceRoot`
- Build artifacts with embedded path strings
- Hard-coded test fixtures referencing absolute paths

Allowlist:
- `/tmp/` paths in test fixtures (warning, not critical)
- Documentation discussing canonical paths like `/usr/local/bin` (not actual user paths)

### 3.3 Email Addresses (Warning)

**Bounded pattern** — the local part is the quadratic one, see 3.1.

```bash
grep -rnoE "[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,24}" \
  "$PKG_DIR" --include="*.js" --include="*.json" --include="*.md" --include="*.txt"
```

The three bounds are the RFC 5321 limits — 64 for the local part, 255 for the domain — plus 24
for the TLD, comfortably above the longest one in existence. They are what makes the scan
terminate: unbounded, `[a-zA-Z0-9._%+-]+` before the `@` will happily consume a 700,000-character
run of minified identifier text at every offset, and the scan was killed at 45 s without
reporting the address that was in the file. Bounded, the same scan answers in 14.7 s with 296 B.
A local part longer than 64 characters is still found — the match simply starts later in the
run.

Whitelist — these are expected and not findings:
- `package.json.author.email` (the author opted in)
- `package.json.maintainers[].email`
- Email in `NOTICE` if it's the copyright holder
- The Apache 2.0 license file boilerplate (`http://www.apache.org/licenses/LICENSE-2.0`)
- `test@example.com`, `user@example.com`, `noreply@*` (documentation/test patterns)

Other matches → ask user per file (could be intentional contact info, could be leakage).

### 3.4 IP Addresses (Warning)

```bash
grep -rnowE "([0-9]{1,3}\.){3}[0-9]{1,3}" "$PKG_DIR" \
  --include="*.js" --include="*.json" --include="*.md"
```

**The word boundary lives in `-w`, not in `\b`.** `\b` is a GNU extension. POSIX leaves a
backslash before an ordinary character undefined and BSD/macOS grep reads it literally, so
`\b([0-9]…` demands a `b` in front of the address: **8 matches under GNU, 0 under the BSD
reading** — the scan reports a clean package without having recognised a single address. `-w` is
documented by both implementations (BSD defines it as wrapping the expression in `[[:<:]]` and
`[[:>:]]`) and returned byte-identical output to GNU `\b` on every fixture, including the
rejections that make the boundary worth having: `1234.5.6.7` and `1.2.3.4567` stay unmatched.

Explicit boundary groups are the tempting replacement and the wrong one. `(^|[^0-9.])…([^0-9.]|$)`
*consumes* the boundary character, so an address one separator behind another has none left —
`10.0.0.1 10.0.0.2` was found once instead of twice — and it newly matches `v1.2.3.4`, because
`v` satisfies `[^0-9.]` where `\b` and `-w` both reject it. Measured over the same fixtures it
lost 1 of 8 IP hits and 4 of 12 hostname hits while adding that false one.

Already bounded on both sides, so `-o` is the rest of the change. It does cost the surrounding
context that told a real address from a version string like `1.2.3.4` — but that context was
never readable in the minified files this scan mostly runs against, where it was the rest of
the megabyte. Open the file at the reported location when a hit needs judging.

Allowlist (always OK):
- `127.0.0.1`, `0.0.0.0`, `255.255.255.255`
- Documentation ranges: `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`
- IPv4-version-strings in non-IP context (e.g., `version: "1.2.3.4"` is unusual but not an IP)

Findings worth flagging:
- RFC 1918 private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- Public IPs (could be infrastructure leak)

### 3.5 Hostnames (Warning)

**Bounded pattern** — same quadratic shape as 3.3.

```bash
grep -rnowE "(localhost|[a-z0-9-]{1,253}\.local|[a-z0-9-]{1,253}\.lan|[a-z0-9-]{1,253}\.intern|[a-z0-9-]{1,253}\.corp|[a-z0-9-]{1,253}\.intranet|raspberry[a-z0-9-]{0,253}|rpi[0-9-]{0,253}|pihole[a-z0-9-]{0,253}|homelab[a-z0-9-]{0,253})" "$PKG_DIR" \
  --include="*.js" --include="*.json" --include="*.md" --include="*.txt"
```

`-w` carries the boundary here for the reason given in 3.4.

253 is the RFC 1035 limit for a whole domain name, deliberately chosen over the 63 that applies
to a single label. 63 is the technically correct bound and it loses findings: because the match
has to start at a word boundary, a label longer than the bound has no matching start position at
all, and a 100-character label — invalid as DNS, perfectly possible as leaked text — went from
found to not found. 253 keeps it and still turns 1,400,790 B / 41.6 s into 281 B / 0.6 s.

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
| AWS Secret | `aws_secret_access_key[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9/+=]{40}['\"]?` — run with `-i` | Pair with AKIA or alone |
| Stripe Secret | `sk_live_[A-Za-z0-9]{24,}` | Production Stripe key |
| Google API | `AIza[0-9A-Za-z_-]{35}` | Google Cloud API key |
| Discord Bot | `[MN][A-Za-z0-9]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}` | Discord bot token |
| Generic high-entropy assignment | `(api[_-]?key\|password\|secret\|token\|bearer\|credential\|access[_-]?token)[[:space:]]*[:=][[:space:]]*['\"]?[^'\"]{16,512}['\"]?` — run with `-i` | Lower-confidence catch-all. Quotes optional → also catches unquoted `KEY=value` config lines. **The only pattern in this table with an added upper bound** — see below |
| Private key headers | `-----BEGIN (RSA \|EC \|OPENSSH \|PGP \|)PRIVATE KEY-----` | SSH/PGP private keys embedded as strings |

**This table is the catalog; the command list in the agent file is an excerpt of it.** That list
is declared there as *minimum coverage*, and six rows here have no command of their own — GitHub
OAuth, AWS Secret, Stripe, Google, Discord, and the private-key header, which nothing else
catches. The agent builds those from the rows above, so the rows have to be runnable exactly as
written.

**Which is why they are POSIX ERE and nothing else — no `(?i)`, no `\s`, `\d`, `\w` or `\b`.**
`grep -E` is not PCRE. `(?i)` makes GNU grep print `warning: ? at start of expression` and match
nothing at all: 0 hits against a file holding two AWS secrets, 2 hits once the prefix is dropped
and `-i` passed instead. That is why the two case-insensitive rows now say `-i` in their regex
cell; every other row is case-sensitive by design. `\s` is a GNU extension that BSD grep reads as
a literal `s`, which costs the catch-all every assignment with whitespace around the operator
(5 hits down to 3) — `[[:space:]]` is the portable spelling and returned byte-identical output.
The Discord row was worse than non-portable: inside a bracket expression `\d` and `\w` are
literal on GNU too, so `[A-Za-z\d]{23}` accepted a backslash and the letter `d` but no digits,
and the row matched a real Discord token on no platform at all (0 hits before the rewrite, 1
after). For `\b`, see Section 3.4 — the replacement is `-w`, not a boundary group.

**Run every one of these with `grep -o`.** The prefixed patterns need nothing else: each ends
at the first character outside its own alphabet, so the match is the token, and none of their
open quantifiers (`{36,}`, `{32,}`, `+`) can run away in practice. Measured against a 1.4 MB
minified bundle carrying one token of each class, they returned 145–252 B apiece where the
unbounded `grep -n` had returned 1,400,642 B — the whole file, once per pattern. Do **not**
add upper bounds to them: a `{36,72}` on a token that the file happens to continue past 72
characters still matches, but the same edit on the multi-segment JWT pattern removed findings
outright, because a bounded first segment leaves no room for the `.` that must follow it.

**The generic catch-all is the one that needs the bound.** Its tail is `[^'"]`, and in an
unquoted minified config line — `password=…` with no closing quote anywhere — that class runs
to the end of the file. `-o` does not help at all here: it still returned **1,500,136 B** for a
single match, against 1,500,136 B unbounded. At `{16,512}` the same scan returns **647 B**.
Nothing is hidden by it: a value longer than 512 characters still matches and is still
reported, only printed truncated — and a 512-character prefix is more than enough to judge a
credential.

**File scope:** The named prefix patterns (JWT, npm, GitHub, OpenAI, Anthropic, AWS, …) run against **all** files — their prefixes are unambiguous everywhere. The **generic catch-all** must also run against all files (skip binaries with `-I`, exclude `node_modules`), not just `*.js`/`*.json`: prefixless credentials (DB passwords, bearer tokens) commonly live in config files (`.env`, `.ini`, `.conf`, or renamed variants that evade the dotfile-hygiene glob). Restricting it to code endings leaves those uncovered.

### 3.7 Dotfile-Hygiene (CRITICAL)

Files that should never appear in published tarballs. Documented credential-leak vectors.

```bash
find "$PKG_DIR" -type f \( \
  -path '*/.claude/*' -o \
  -name 'settings.local.json' -o \
  -name '.env' -o -name '.env.*' -o -name '*.env' -o \
  -name '.npmrc' -o \
  -path '*/.aws/*' -o -path '*/.ssh/*' -o \
  -name 'id_rsa*' -o -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' \
\)
```

`2>/dev/null` is deliberately absent here, and `find` reads its exit code the other way round
from `grep`: it exits **0** once it has searched, with or without hits, so an empty listing is a
real all-clear. A non-zero exit means it could not look everywhere — an empty `$PKG_DIR`, a
missing directory, an unreadable subtree — and then even a *non-empty* hit list is incomplete.
Suppressed, every one of those arrives as "this package is clean" (issue #102).

**Reference:** Check Point Research scanned ~46,500 npm packages in late 2025 and found:
- 428 packages contained `.claude/settings.local.json`
- ~30 of those (≈ 7%) contained real credentials: npm tokens, GitHub PATs, Telegram bot tokens, Hugging Face API keys, Bearer tokens for third-party services
- Source: https://securitybrief.asia/story/claude-code-can-leak-secrets-in-public-npm-packages

The `.claude/` directory is meant for local Claude Code workspace settings and should be added to `.npmignore` and `.gitignore`. The skill's default `.npmignore.j2` template covers this and the broader credential-file patterns.

### 3.8 Source-Map Hygiene

Two opposite failure classes — a map that carries too much, and one that carries too little.

**Embedded `sourcesContent` (Warning)**

Source-maps reference original source files via the `sources` array. They optionally embed the original content via `sourcesContent`. When TypeScript projects publish only the compiled output (`dist/`), source-maps with `sourcesContent` effectively republish the entire TypeScript source — defeating the point of distributing only compiled JS.

```bash
find "$PKG_DIR" -name "*.map" -type f -print0 | while IFS= read -r -d '' f; do
  node -e '
const fs = require("fs");
const f = process.argv[1];
let m;
try { m = JSON.parse(fs.readFileSync(f, "utf8")); }
catch (e) { console.error("SKIPPED (unreadable or invalid JSON): " + f + " - " + e.message); process.exit(0); }
const c = Array.isArray(m.sourcesContent) ? m.sourcesContent : [];
if (c.some(s => s)) console.log(f);
' "$f"
done
```

To fix at the source: `tsconfig.json` → `compilerOptions.sourceMap: true` (no `inlineSources`, no `inlineSourceMap`).

**`sources` pointing outside the package (informational)**

The mirror image: entries in `sources` that start with `../` or are absolute point at paths that do not exist inside `node_modules/<pkg>/` after install. The map ships as dead weight and go-to-source breaks for consumers. Not a leak — a map that is useless because it carries too little.

```bash
find "$PKG_DIR" -name "*.map" -type f -print0 | while IFS= read -r -d '' f; do
  node -e '
const fs = require("fs");
const f = process.argv[1];
let m;
try { m = JSON.parse(fs.readFileSync(f, "utf8")); }
catch (e) { console.error("SKIPPED (unreadable or invalid JSON): " + f + " - " + e.message); process.exit(0); }
const sources = Array.isArray(m.sources) ? m.sources : [];
// In the JS regex literal, \\ is one literal backslash: the class matches a
// Windows drive letter followed by either a backslash or a forward slash.
const out = sources.filter(s => typeof s === "string" &&
  (s.startsWith("../") || s.startsWith("/") || /^[A-Za-z]:[\\/]/.test(s)));
if (out.length) console.log(f + ": " + out.slice(0, 3).join(", "));
' "$f"
done
```

To fix at the source: emit the map from a build whose `rootDir`/`outDir` keep sources inside the published tree, or set `compilerOptions.sourceRoot` so the references resolve within the package. Dropping the `.map` files from `files[]` is the alternative when consumers are not meant to debug into the source at all.

Both checks print findings on stdout and a `SKIPPED (...)` line on stderr for any `.map` that cannot be read or parsed. A skipped map is **not** a clean map — report skipped files separately so an unparsable source-map never passes as "no finding". `2>/dev/null` is deliberately absent here: suppressing stderr is what turned an interpreter failure into a silent false negative in the first place (issue #65).

A map without `sourcesContent` whose `sources` all stay inside the package is clean. Absolute paths in `sources` deliberately overlap with Section 3.2 — there they match as a raw path string (Critical, build-environment leak), here as a semantic statement that the map points out of the package. One line may legitimately produce both findings; do not deduplicate them.

### 3.9 False-Positive Downgrades

Apply these before reporting findings to avoid noise:

| Path/File pattern | Treatment |
|---|---|
| `*test*`, `*spec*`, `__tests__/`, `tests/`, `fixtures/`, `testdata/` | Downgrade Critical → Warning. Test data legitimately contains fake credentials. |
| `*.example`, `*.sample` | Downgrade to informational. These are templates by definition. |
| Comments referencing patterns by name (`// example: sk-XXXX...`) | Strip from match list. |
| Environment variable references (`process.env.OPENAI_API_KEY`) | Not a finding — it's the *correct* pattern. |

---

## 4. Version Sync (Audit-Side Check)

**Note:** As of plugin v0.16.0, version-sync remediation is performed in **Phase 2 Release Cutting** (see Section 9). The audit here is now informational — the cutting phase already syncs source-file VERSION constants to `package.json.version` whenever it bumps. A mismatch found in audit means cutting was skipped (e.g., audit-only mode) or a constant exists that the cutting-phase scan missed; in either case the user is informed.

### 4.1 Detection

Source files are searched for hard-coded version strings that should match
`package.json.version`. The search lives in **one executed, tested file** —
`skills/npm-publisher/scripts/version-sync-scan.mjs` — which `agents/npm-publisher.md` calls in
Phase 2.4 Step F (cutting) and Phase 3b (audit). This file no longer repeats the command: the
call needs `${CLAUDE_PLUGIN_ROOT}`, which is substituted in an `agents/*.md` body but **not** in
a companion file like this one, and a third copy of anything here is what issue #75 removed.
Read the script for the exact call and the authoritative behaviour; what follows is the contract
the audit depends on.

**Output.** One JSON object on stdout:
`{ status, reason?, repoPath, scannedDirs, matches, errors }`, each match carrying `file`,
`line`, `version`, `versions` (always present; it holds both values on the rare line carrying
two constants, and `version` is its first entry) and `text`. Exit 0 when the scan concluded,
2 when it hit real errors, 1 on a usage error.

**Three states, deliberately distinguishable** — this is the substance of issue #70:

| State | Report as |
|---|---|
| `status: "scanned"`, `matches` non-empty | mismatches to resolve (§4.2) |
| `status: "scanned"`, `matches` and `errors` empty | **the only state that means "in sync"** |
| `status: "skipped"` (+ `SKIPPED (...)` on stderr) | "not checked" — never a passing check, never a fix trigger |
| `errors` non-empty | scan failed partway — an empty `matches` says nothing about sync |

A skipped scan is not a clean scan. It happens when none of the candidate directories `src`,
`app/src`, `lib` exists, or the repo path itself does not. In `--audit-only` mode the audit is
the only sync defense there is, so an empty result being misread as clean is the expensive
failure — hence the separate status rather than an empty result carrying two meanings. Never
suppress stderr with `2>/dev/null`: doing so is what turned a failed scan into a silent false
negative (issues #65, #70).

**What is searched.** The extension list covers the JS/TS family plus the languages a published
npm package routinely carries a *native* half in: Python, Go, Rust, and the full mobile bridge —
Java **and** Kotlin on Android, Swift and Objective-C (`*.m`/`*.mm`) on iOS. React Native,
Cordova and Capacitor packages ship both halves; covering only one of them was the defect behind
issue #72.

**What counts as a version constant.** `VERSION` or `version`, a `:` or `=`, then a quoted
three-segment number — with an optional `@` before the quote for the idiomatic Objective-C
literal `static NSString *const VERSION = @"1.2.3";`, which the C-style-only pattern missed
(#72). That prefix stays a single optional character on purpose: no `r`/`f`/`b` for Python, no
`r#` for Rust — none are idiomatic for a version constant, and every prefix admitted widens the
false-positive surface of a pattern whose matches are offered to the user as edits. Known gap,
carried over unchanged: a type annotation between separator and literal
(`const version: string = "2.0.0"`) is not matched.

**Three behaviours inherited from the original `grep -rEn`, each kept deliberately** (issue #75,
point 8): symlinks are not followed (`grep -r`, not `-R`) though a candidate directory that is
itself a symlink is still searched; binary files are skipped; `node_modules`/`dist`/`build`
below a candidate directory are **not** excluded. Each is pinned by a test, so changing one is a
decision rather than a drift.

Common patterns:
- `const VERSION = "1.2.3"` (CLI tools showing `--version`)
- `const APP_VERSION = "1.2.3"` (banner/about strings)
- `version: "1.2.3"` (config objects, unrelated package.json reads)
- Python: `__version__ = "1.2.3"`
- Go: `var Version = "1.2.3"`
- Rust: `pub const VERSION: &str = "1.2.3";`

### 4.2 Resolution

For each mismatch found in audit (i.e., not handled by cutting):
- **Update source file** to match `package.json` (most common case)
- **Update package.json** to match source (rare)
- **Skip** (intentional divergence — e.g., the constant tracks something else)

### 4.3 Why this is critical

Observed failure mode on a real npm publish of a Node CLI: `package.json` was bumped to the new version, but the `const VERSION = '…'` in the CLI entry point still held the previous one. The published binary reported the old version via `--version`, contradicting the registry metadata. Caught only because the publisher manually verified — without an audit, it would have shipped wrong.

Better solutions exist (e.g., `import {version} from '../package.json' assert {type: 'json'}`), but they require build-time tooling. The Phase 2 cutting workflow + audit-side check together provide pragmatic defense-in-depth.

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

## 9. Release Cutting (Phase 2)

The agent's Phase 2 prepares a release: it decides the next version, syncs hard-coded VERSION constants in source files, generates a CHANGELOG entry, and produces a `chore(release): vX.Y.Z` commit before the audit phases run. This section documents the cutting logic in detail.

### 9.1 Detection branches

Compare local `package.json.version` against `npm view <name> version`. Four branches:

| Local vs. published | Treatment |
|---|---|
| Package not on registry (404) | First publish — skip cutting, inform user that `package.json.version` will be the initial release |
| `local == published` | Re-release branch (main path) — propose bump |
| `local > published` | Already-bumped — confirm and optionally generate CHANGELOG only |
| `local < published` | Inconsistent — abort with clear error |

### 9.2 Conventional Commits parsing

Read commits since the last release tag. `%b` is the complete commit body of every commit in
the range, and the only thing 9.2 asks of it is whether the words `BREAKING CHANGE:` appear —
so the body is reduced to that one boolean where it is produced, not after it has arrived:

```bash
git log v{published_latest}..HEAD --pretty=format:"%H%x1f%s%x1f%b%x1e" | node -e '
const raw = require("fs").readFileSync(0, "utf8");
if (raw.trim().length === 0) {
  console.error("git log returned no commits - wrong tag, or HEAD is already at the released commit");
  process.exit(1);
}
const out = [];
for (const rec of raw.split("\u001e")) {
  const r = rec.replace(/^\n/, "");
  if (r.trim().length === 0) continue;
  const parts = r.split("\u001f");
  if (parts.length < 3 || parts[0].length !== 40) {
    console.error("git log record is not hash/subject/body - the format string did not survive");
    process.exit(1);
  }
  out.push({
    hash: parts[0].slice(0, 12),
    subject: parts[1],
    breaking: /(^|\n)BREAKING CHANGE:/.test(parts.slice(2).join("\u001f")),
  });
}
console.log(JSON.stringify(out, null, 2));
'
```

Measured over four releases of this repository (35 commits, bodies written as release notes):
**31,946 B → 5,135 B**. The saving grows with the release interval, because it is the bodies
that grow, not the subjects.

**The separators changed from `|` to `%x1f`/`%x1e`, and that is a correctness fix, not
cosmetics.** `%H|%s|%b` cannot be parsed: a subject containing a pipe splits into the wrong
fields — `fix: pipe | in subject` yields the subject `fix: pipe ` — and a body spans lines, so
every body line is indistinguishable from a new commit record. A body line beginning `feat:`
would be read as a commit and could raise the bump on its own. Unit separator between fields
and record separator between commits are in neither, so both problems disappear. Verified
against a fixture with a pipe in subject and body, a multi-line body, a `BREAKING CHANGE:`
footer and an empty body.

**An empty result aborts with exit 1 rather than reporting "no commits".** git writes
`fatal: ambiguous argument` to stderr for a tag that does not exist and nothing to stdout —
which is indistinguishable from a range that is genuinely empty unless the command says so.
Both cases are named in the message, and stderr is not redirected, so git's own diagnosis
stands above it.

Then parse each commit's subject:

| Pattern | Type | Bump suggestion |
|---|---|---|
| `feat:` or `feat(scope):` | feature | minor |
| `fix:` or `fix(scope):` | bug fix | patch |
| `refactor:`, `perf:`, `style:`, `test:`, `chore:`, `build:`, `ci:`, `docs:` | maintenance | patch |
| `<type>!:` (any type with `!`) | breaking | **major** |
| Body contains `BREAKING CHANGE:` | breaking | **major** |

Aggregate across all commits — the highest-impact signal wins (any `major` → bump major; else any `feat` → minor; else patch).

**Filter out** — both recognisable by subject, which is all the filter above returns:
- Merge commits (`Merge branch ...`, `Merge pull request ...`) — auto-generated, no semantic value
- Previous `chore(release):` commits — these mark prior releases, not new content

Co-author trailers used to need filtering here as well. They do not any more: they live in the
body, and the body no longer leaves the filter — only the `breaking` boolean derived from it
does.

### 9.3 Bump computation

Given current version `MAJOR.MINOR.PATCH` and bump type:

| Bump | New version |
|---|---|
| major | `(MAJOR+1).0.0` |
| minor | `MAJOR.(MINOR+1).0` |
| patch | `MAJOR.MINOR.(PATCH+1)` |

Pre-release suffixes (`-alpha.1`, `-rc.2`, etc.): if user is on a pre-release, the heuristic should suggest the next pre-release increment (`1.0.0-alpha.1` → `1.0.0-alpha.2`); but in practice it's safer to ask the user explicitly when pre-releases are involved.

**Always present the user with a multi-choice question.** Heuristic-suggested option is highlighted as recommended, but the user can override to any of patch / minor / major / custom / skip.

### 9.4 Code-constant sync

After the user confirms a bump, update `package.json.version`, then sync hard-coded VERSION constants in source files (same `version-sync-scan.mjs` as Section 4.1). For each match: ask the user whether to update (default Yes for `*VERSION` constants, default Skip for context-ambiguous matches like `version: "1.2.3"` in config objects).

### 9.5 CHANGELOG format (Keep a Changelog)

Reference: <https://keepachangelog.com/en/1.1.0/>

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added
- New features (mapped from `feat` commits)

### Fixed
- Bug fixes (mapped from `fix` commits)

### Changed
- Other changes (mapped from `refactor`, `perf`, `chore` (excluding chore(release)), `build`, `ci`)

### Removed
- Removals (only when explicit in commit message; usually paired with major bumps)
```

Section ordering and naming follow Keep a Changelog. Empty subsections (no commits of that type) are omitted.

### 9.6 CHANGELOG file detection

Search at repo root in priority order:
1. `CHANGELOG.md` (most common)
2. `CHANGES.md`
3. `HISTORY.md`

If found: prepend the new section right after the file header (typically a `# Changelog` line and intro paragraph). Do not append to the end.

If none found: ask the user via AskUserQuestion. Default Yes — create `CHANGELOG.md` at repo root with the standard Keep a Changelog header and the new section as the first entry.

### 9.7 Commit message format

```
chore(release): v{X.Y.Z}
```

No body required for routine releases. The CHANGELOG entry IS the documentation. Optional body: short summary if the bump is unusual (e.g., a major version warranting context).

### 9.8 Skip conditions

Phase 2 is skipped entirely when:
- `--skip-release-cut` flag is passed
- `--audit-only` flag is passed (audit-only is stricter — also skips fixes and publish)
- The user selects "Skip" from the bump-type AskUserQuestion (treats run as re-publish or audit-only)
- First-publish branch (no prior version to cut from)

When skipped, Phase 3 (audit) runs against the existing `package.json.version`, and any version-sync mismatches surface as informational findings (Section 4) rather than being remediated automatically.

### 9.9 Edge cases

**No commits since last tag:** AskUserQuestion: skip cutting / force re-release with empty CHANGELOG / abort. The first option is usually correct (nothing changed; user might be re-running the audit on a previously-cut release).

**Last tag missing:** If `git describe --tags --match 'v*'` returns nothing (no tags exist locally) but `npm view` shows a published version, fall back to scanning all commits as if they were a single release. Warn the user that bump-type detection is less reliable without tag boundaries.

**User edits CHANGELOG manually before commit:** AskUserQuestion offers an "Edit before commit" option. The agent writes the generated section to a temp file, prints the path, and waits — user edits in their editor, confirms, agent reads the result and uses it for the commit.

**Multi-line commit subjects (rare):** Use only the first line of `%s` for parsing; the rest goes into `%b` (body) which is checked separately for `BREAKING CHANGE:`.

---

## 10. Out-of-Scope (Document, Don't Implement)

If the user requests these, point to alternatives or future work:

- **Monorepo support** (Lerna/Nx/pnpm-workspaces) — each package has its own audit; needs orchestration. Aborted in Phase 0.
- **`npm unpublish`** — different tool, time-window restricted, security-sensitive. Use `npm` CLI directly.
- **`npm deprecate`** — marks a version as deprecated without removal. Different workflow.
- **Yarn / pnpm publish** — npm CLI is the lowest-common-denominator. Yarn/pnpm proxy to npm anyway for the publish step.
- **Private-registry authentication** (GitHub Packages, GitLab Package Registry, Verdaccio, JFrog Artifactory) — different `.npmrc` setup per registry, often org-specific tokens.
- **Code signing / npm provenance** — `npm publish --provenance` is supported but requires GitHub Actions + OIDC setup; covered briefly in the optional auto-publish workflow template, not as a standalone audit step.
- **BREAKING-CHANGE detection from code diff** (vs. only commit messages) — too complex to do reliably; trust the author's Conventional-Commit marking.
- **Pre-release version arithmetic** beyond simple suggestions — pre-release semver is intricate and project-specific; the cutting phase asks the user explicitly when pre-release suffixes are detected.
