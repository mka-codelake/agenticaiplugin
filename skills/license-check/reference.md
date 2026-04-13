# License Check — Reference

Detailed rules for the `license-checker` agent. Load sections on demand during execution.

---

## 1. License Compatibility Matrix

### 1.1 License Categories

| Category | Licenses | Key Property |
|----------|----------|-------------|
| **Permissive** | MIT, BSD-2-Clause, BSD-3-Clause, ISC, Unlicense, CC0-1.0, 0BSD, Zlib | No restrictions on derivative works |
| **Permissive+Patent** | Apache-2.0 | Permissive with explicit patent grant |
| **Weak Copyleft** | LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-2.0 | Copyleft limited to modified files or linked library |
| **Strong Copyleft** | GPL-2.0, GPL-3.0 | Derivative works must use same license |
| **Network Copyleft** | AGPL-3.0 | Network use triggers copyleft |
| **Non-OSI** | SSPL, Elastic License 2.0, BSL 1.1, RSALv2, FSL | Not OSI-approved, various commercial restrictions |
| **Proprietary** | Commercial, no-license, custom EULA | Cannot redistribute without permission |

### 1.2 Compatibility Table

**Read as:** Row = project license, Column = dependency license. Result = compatibility status.

| Project ↓ / Dep → | Permissive | Apache-2.0 | LGPL-2.1 | LGPL-3.0 | MPL-2.0 | GPL-2.0 | GPL-3.0 | AGPL-3.0 | Non-OSI | Proprietary |
|--------------------|-----------|------------|----------|----------|---------|---------|---------|----------|---------|-------------|
| **MIT** | OK | OK | WARNING | WARNING | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **BSD-*-Clause** | OK | OK | WARNING | WARNING | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **Apache-2.0** | OK | OK | WARNING | WARNING | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **LGPL-2.1** | OK | OK | OK | INCOMPAT | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **LGPL-3.0** | OK | OK | OK | OK | OK | INCOMPAT | OK | INCOMPAT | WARNING | INCOMPAT |
| **MPL-2.0** | OK | OK | OK | OK | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **GPL-2.0** | OK | INCOMPAT | OK | INCOMPAT | OK | OK | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **GPL-3.0** | OK | OK | OK | OK | OK | INCOMPAT | OK | INCOMPAT | WARNING | INCOMPAT |
| **AGPL-3.0** | OK | OK | OK | OK | OK | INCOMPAT | OK | OK | WARNING | INCOMPAT |
| **Proprietary** | OK | OK | WARNING | WARNING | WARNING | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |

**LGPL WARNING explanation:** LGPL dependencies are OK when dynamically linked. Static linking or bundling may trigger copyleft. Mark as WARNING with note: "LGPL — verify linking method."

**MPL-2.0 in Proprietary:** File-level copyleft only. Modified MPL files must stay MPL, but rest of project can remain proprietary. Mark as WARNING.

**MPL-2.0 in GPL-2.0:** MPL 2.0 Section 3.3 provides explicit GPL compatibility. MPL-licensed code can be distributed under GPL terms. Mark as OK.

### 1.3 Special Cases

**Dual-Licensed Packages (OR expressions):**
- `MIT OR Apache-2.0` — pick the license compatible with your project
- Always choose the most permissive compatible option
- Status: OK if at least one option is compatible

**Combined Licenses (AND expressions):**
- `MIT AND BSD-2-Clause` — both conditions apply simultaneously
- Check compatibility of EACH license individually
- Status: worst of all individual checks

**License Exceptions (WITH operator):**
- `GPL-2.0-only WITH Classpath-exception-2.0` — exception relaxes copyleft for linking
- Common in Java ecosystem (OpenJDK)
- Treat as less restrictive than base license

**"Or later" Versions:**
- `GPL-2.0-or-later` — can be treated as GPL-3.0 if that's more compatible
- `LGPL-2.1-or-later` — can be treated as LGPL-3.0

**Missing License:**
- No LICENSE file AND no license field in manifest → assume Proprietary
- Always mark as WARNING with recommendation to contact maintainer

---

## 2. Per-Ecosystem Detection Methods

### 2.1 npm (Node.js)

**Detection:** `package.json` exists

**License field:** `package.json` → `.license` (SPDX string)

**Dependency fields:**
- `.dependencies` — production (HIGH risk)
- `.devDependencies` — development only (LOW risk)
- `.peerDependencies` — user-installed (HIGH risk)
- `.optionalDependencies` — optional (MEDIUM risk)

**Quick mode:** Read `package.json` only, extract direct dependency names.

**Full mode:**
```bash
npm ls --json --all 2>/dev/null
```
Returns full dependency tree with versions. If npm not installed or no `node_modules`, fall back to quick mode.

**Per-dependency license check:**
```bash
npm info {package} license 2>/dev/null
```

**Lock files:** `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

**Common non-standard license strings:** `"BSD"` → `BSD-2-Clause`, `"ISC License"` → `ISC`, `"WTFPL"` → permissive

### 2.2 Python (pip)

**Detection:** `pyproject.toml`, `setup.py`, `setup.cfg`, or `requirements.txt` exists

**License field:** `pyproject.toml` → `[project] license` (SPDX expression, PEP 621)

**Dependency fields:**
- `pyproject.toml` → `[project.dependencies]` — production
- `pyproject.toml` → `[project.optional-dependencies]` — extras (varies)
- `requirements.txt` — all (assume production unless filename indicates otherwise)
- `requirements-dev.txt`, `dev-requirements.txt` — development only

**Quick mode:** Parse manifest files for dependency names.

**Full mode:**
```bash
pip show {package} 2>/dev/null | grep -i "^License:"
```
For each dependency. If pip not installed, fall back to quick mode.

**Lock files:** `poetry.lock`, `Pipfile.lock`, `uv.lock`

**Fallback:** Python classifiers (`License :: OSI Approved :: MIT License`) — less reliable but sometimes only source.

### 2.3 Rust (Cargo)

**Detection:** `Cargo.toml` exists

**License field:** `[package] license` (SPDX expression, enforced by crates.io)

**Dependency fields:**
- `[dependencies]` — production
- `[dev-dependencies]` — development only
- `[build-dependencies]` — build time (MEDIUM risk)

**Quick mode:** Parse `Cargo.toml` for dependency names and their `package` fields if specified.

**Full mode:**
```bash
cargo metadata --format-version 1 2>/dev/null | jq '.packages[] | {name: .name, license: .license, source: .source}'
```
Returns license for every dependency (direct + transitive). Most reliable ecosystem for license detection.

**Lock files:** `Cargo.lock`

### 2.4 Go

**Detection:** `go.mod` exists

**License field:** None — Go has NO standard license metadata in modules.

**Dependency fields:**
- `go.mod` → `require` blocks — all dependencies

**Quick mode:** Parse `go.mod` for module paths.

**Full mode:**
```bash
go mod graph 2>/dev/null
```
Returns dependency graph. License detection requires inspecting `LICENSE` files in module cache or repository.

**License detection strategy for Go:**
1. Check `$GOPATH/pkg/mod/{module}@{version}/LICENSE` if module cache exists
2. Otherwise, mark as UNKNOWN and recommend manual review
3. Go is the least reliable ecosystem for automated license detection

### 2.5 Maven (Java)

**Detection:** `pom.xml` exists

**License field:** `<licenses><license><name>` + `<url>` in pom.xml

**Dependency fields:**
- `<dependencies>` → `<dependency>` elements
- Check `<scope>`: `compile`/`runtime` = production, `test` = development, `provided` = deployment env

**Quick mode:** Parse `pom.xml` for dependency coordinates (groupId:artifactId:version).

**Full mode:**
```bash
mvn dependency:tree -DoutputType=text 2>/dev/null
```
Returns full dependency tree. License extraction requires checking each dependency's POM.

**License name normalization (Maven uses free-form text):**
- `"The Apache Software License, Version 2.0"` → `Apache-2.0`
- `"GNU General Public License, version 2"` → `GPL-2.0-only`
- `"MIT License"` → `MIT`
- `"Eclipse Public License 2.0"` → `EPL-2.0`

### 2.6 Gradle (Java/Kotlin)

**Detection:** `build.gradle` or `build.gradle.kts` exists

**Dependency fields:** `dependencies { }` block
- `implementation` / `api` — production
- `testImplementation` — development only
- `compileOnly` — compile time (varies)

**Quick mode:** Parse build file for dependency declarations.

**Full mode:**
```bash
gradle dependencies --configuration runtimeClasspath 2>/dev/null
```
or
```bash
./gradlew dependencies --configuration runtimeClasspath 2>/dev/null
```

License detection same as Maven (POM-based).

### 2.7 .NET (C#)

**Detection:** `*.sln` or `*.csproj` exists

**License field:** `<PackageLicenseExpression>` in `.csproj` (SPDX)

**Dependency fields:** `<PackageReference>` elements in `.csproj`

**Quick mode:** Parse `.csproj` for PackageReference elements.

**Full mode:**
```bash
dotnet list package --include-transitive 2>/dev/null
```

**Per-package license:** NuGet metadata (requires network access or local cache).

---

## 3. LLM Model Licenses

### 3.1 Model License Table

| Model Family | License | Commercial Use | Key Restrictions | SPDX |
|-------------|---------|---------------|-----------------|------|
| Llama 2/3 (Meta) | Meta Community License | Conditional | 700M MAU limit; no training competing LLMs | — |
| CodeLlama | Meta Community License | Conditional | Same as Llama | — |
| Mistral (open) | Apache-2.0 | Yes | Standard Apache terms | `Apache-2.0` |
| Mixtral | Apache-2.0 | Yes | Standard Apache terms | `Apache-2.0` |
| Codestral | Mistral AI Non-Production License | No | Research/testing only | — |
| Phi-2/3 (Microsoft) | MIT | Yes | Permissive | `MIT` |
| Gemma (Google) | Gemma Terms of Use | Yes | Use restrictions (no harm) | — |
| Falcon (TII) | Apache-2.0 (most) | Yes | Check per model size | `Apache-2.0` |
| Qwen (Alibaba) | Various | Check per model | Some Apache, some custom | — |
| StableDiffusion | CreativeML Open RAIL-M | Yes | Use restrictions (no deepfakes, harm) | — |
| Whisper (OpenAI) | MIT | Yes | Permissive | `MIT` |
| GPT-* (OpenAI) | Proprietary API | Via API only | ToS apply, no weights | — |
| Claude (Anthropic) | Proprietary API | Via API only | ToS apply, no weights | — |
| Gemini (Google) | Proprietary API | Via API only | ToS apply, no weights | — |

### 3.2 Detection Patterns

Grep for these patterns in code and config files:

```
llama[-_ ]?[234]|codellama|mistral|mixtral|codestral|gpt-[34]|gpt-4o|claude[-_ ]?[234]|claude[-_ ]?opus|claude[-_ ]?sonnet|claude[-_ ]?haiku|gemini|gemma|phi-[234]|qwen|falcon|stable[-_ ]?diffusion|dall[-_ ]?e|whisper|deepseek
```

**Search in file types:**
`*.py`, `*.js`, `*.ts`, `*.java`, `*.go`, `*.rs`, `*.yaml`, `*.yml`, `*.json`, `*.toml`, `*.env`, `*.cfg`, `*.ini`, `Dockerfile`, `docker-compose*.yml`

**False positive mitigation:**
- Skip matches inside comments or documentation files (*.md)
- Verify match is in a model name/config context (e.g., key like `model`, `model_name`, `llm`, `engine`)
- Skip matches in dependency lock files (already covered by Phase 2)

### 3.3 Compatibility Notes

| Project License | Llama | Mistral/Mixtral | Phi | OpenAI API | Proprietary models |
|----------------|-------|-----------------|-----|------------|-------------------|
| MIT | WARNING | OK | OK | OK | OK |
| Apache-2.0 | WARNING | OK | OK | OK | OK |
| GPL-3.0 | WARNING | OK | OK | OK | WARNING |
| Proprietary | WARNING | OK | OK | OK | OK |

**Llama WARNING:** Meta Community License has restrictions (MAU limit, no competing LLM training) that are not compatible with fully open redistribution. Always flag for human review.

**API-only models (GPT, Claude, Gemini):** No license compatibility issue since no model weights are distributed. Only flag if the project bundles model weights (not API calls).

---

## 4. Known Problem Patterns

### 4.1 GPL Dependencies in Permissive/Proprietary Projects

Most common conflict. If project is MIT/Apache/Proprietary and any production dependency is GPL-2.0 or GPL-3.0: **INCOMPATIBLE**.

**Recommendations:**
1. Find alternative permissive-licensed library
2. If no alternative: consider relicensing project under GPL
3. If dev-only: document that it's not distributed (change to WARNING)

### 4.2 License-Changed Packages

Known packages that changed from permissive to restrictive licenses:

| Package | Old License | New License | Breaking Version | Alternative |
|---------|-------------|-------------|-----------------|-------------|
| Redis | BSD-3-Clause | SSPL / RSALv2 | 7.4+ | Valkey (BSD) |
| Elasticsearch | Apache-2.0 | SSPL / Elastic License 2.0 | 7.11+ | OpenSearch (Apache) |
| MongoDB | AGPL-3.0 | SSPL | 4.0+ | — |
| Terraform | MPL-2.0 | BSL 1.1 | 1.6+ | OpenTofu (MPL) |
| Grafana | Apache-2.0 | AGPL-3.0 | 7.0+ | — |
| Sentry | BSD-3-Clause | FSL (Functional Source License) | self-hosted | — |
| CockroachDB | Apache-2.0 | BSL 1.1 | — | — |

**Detection:** If a dependency matches this list AND the version is at or above the breaking version, flag as WARNING with note about the license change and available alternatives.

### 4.3 Missing License

No LICENSE file AND no license field in manifest → **assume Proprietary**.

Always mark as **WARNING** with recommendation:
- "No license found for {package}. Assume proprietary — cannot use without explicit permission."
- "Contact maintainer or use alternative package."

### 4.4 Dev vs Production Scope

| Scope | Risk Level | Status when Incompatible |
|-------|-----------|-------------------------|
| Production (dependencies, api) | High | INCOMPATIBLE |
| Peer (peerDependencies) | High | INCOMPATIBLE |
| Development (devDependencies, test) | Low | WARNING |
| Build (buildDependencies) | Medium | WARNING |
| Optional | Varies | WARNING |

Dev-only dependencies are not distributed with the software, so copyleft typically doesn't trigger. However, some interpretations disagree — flag as WARNING, not INCOMPATIBLE.

### 4.5 Transitive Dependencies

A transitive dependency with an incompatible license is just as problematic as a direct one.

- **Full mode:** Catches these via `npm ls --all`, `cargo metadata`, etc.
- **Quick mode:** Does NOT check transitive deps (by design — trade-off for speed)
- Always note in report if running in quick mode: "Transitive dependencies not checked. Run full scan for comprehensive analysis."

### 4.6 SPDX Expression Parsing

| Pattern | Meaning | How to Evaluate |
|---------|---------|----------------|
| `MIT` | Single license | Check directly |
| `MIT OR Apache-2.0` | User choice | OK if ANY option is compatible |
| `MIT AND BSD-2-Clause` | Both apply | Check EACH; worst result wins |
| `GPL-2.0-only WITH Classpath-exception-2.0` | License + exception | Exception relaxes base license |
| `GPL-2.0-or-later` | Version flexibility | Can treat as GPL-3.0 if more compatible |
| `UNLICENSED` | Proprietary (npm convention) | Treat as Proprietary |
| `SEE LICENSE IN <file>` | Custom license | Read file, mark as WARNING if unclear |

---

## 5. Report Template

```markdown
# License Compatibility Report

**Project:** {project_name}
**License:** {license_name} ({spdx_id}) — {category}
**Date:** {YYYY-MM-DD}
**Mode:** {full|quick}

---

## Summary

| Metric | Count |
|--------|-------|
| Items checked | {total} |
| Incompatible | {incompat_count} |
| Warnings | {warning_count} |
| OK | {ok_count} |

**Verdict:** {ONE OF: "All clear — no compatibility issues found." | "Warnings found — review recommended before distribution." | "Incompatible licenses detected — must resolve before distribution."}

---

## Findings

{Only show INCOMPATIBLE and WARNING items. If none, show "No issues found."}

| # | Item | Version | License | Scope | Status | Issue |
|---|------|---------|---------|-------|--------|-------|
| {n} | {name} | {version} | {license} | {scope} | {status} | {brief description} |

---

## LLM Models

{Only show if LLM model references were found.}

| Model | License | Status | Notes |
|-------|---------|--------|-------|
| {model} | {license} | {status} | {notes} |

---

## Recommendations

{Numbered list with one actionable item per INCOMPATIBLE/WARNING finding.}

1. **{item}** ({status}): {recommendation}

---

## Coverage Notes

{Include if applicable:}
- Ecosystems scanned: {list}
- Tools not available: {list of ecosystem tools that were not installed}
- Quick mode: Transitive dependencies not checked.
```

---

## 6. Integration Hooks

### 6.1 Standalone Invocation

Via slash command:
```
/agenticaiplugin:license-check
/agenticaiplugin:license-check --quick
```

### 6.2 Programmatic Invocation from Other Skills/Agents

Other skills can invoke the license-checker agent directly:

```
Agent(
    subagent_type="agenticaiplugin:license-checker",
    description="Check dependency license compatibility",
    prompt="Check license compatibility for this project. Mode: quick. Project license: Apache-2.0 (Apache-2.0)."
)
```

**Parameters in prompt:**
- `Mode: full` or `Mode: quick` — scan depth
- `Project license: {name} ({SPDX})` — if provided, agent skips Phase 1 (license detection)

### 6.3 github-publish Integration

The `github-publish` SKILL.md offers an optional license check after the github-publisher agent completes. The question is asked at skill level (not inside the agent, since the agent has no Agent tool).

Flow:
1. github-publisher agent finishes (license created/detected)
2. SKILL.md asks user: "Would you also like to run a license compatibility check?"
3. If yes: SKILL.md spawns the license-checker agent with the known project license

```
Agent(
    subagent_type="agenticaiplugin:license-checker",
    description="Check dependency license compatibility",
    prompt="Check license compatibility for this project. Mode: {quick|full}. Project license: {license_name} ({SPDX})."
)
```

The license-checker runs its full workflow — report is displayed and saved to `claudedocs/license-check-result.md`. Phase 1 is skipped since the project license is provided in the prompt.
