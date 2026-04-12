# GitHub Publish — Reference

Detailed rules for the `github-publisher` agent. Load sections on demand during execution.

---

## 1. License Decision Matrix

| Project Type | License | Files | SPDX |
|-------------|---------|-------|------|
| **Product** (end-user app, GUI, desktop tool) | GPL v3.0 | `LICENSE` | `GPL-3.0-or-later` |
| **Library / Framework / CLI** | Apache 2.0 | `LICENSE` + `NOTICE` | `Apache-2.0` |
| **Small utility / personal** | MIT | `LICENSE` | `MIT` |
| **Patent-sensitive domain** (override) | Apache 2.0 | `LICENSE` + `NOTICE` | `Apache-2.0` |

Patent-sensitive domains: Vector search, embeddings, RAG, ML/AI, cryptography, blockchain, compression, image/audio processing.

### Copyright Format

- **Apache 2.0 / GPL v3**: `Copyright YYYY Michael Kagel`
- **MIT**: `Copyright (c) YYYY Michael Kagel`
- Year: Use the current year. For multi-year projects: `YYYY-YYYY`.

### NOTICE File (Apache 2.0 only)

```
{project_name}
Copyright YYYY Michael Kagel

This product includes software developed by Michael Kagel.

Licensed under the Apache License, Version 2.0
(http://www.apache.org/licenses/LICENSE-2.0)
```

### package.json Update

If `package.json` exists, set:
```json
{
  "author": "Michael Kagel",
  "license": "{SPDX identifier}"
}
```

---

## 2. Badge Patterns

### License Badge (always)

```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
```

Use the badge matching the selected license.

### NPM Badges (if npm package)

Full NPM info badge:
```markdown
[![NPM](https://nodei.co/npm/{package_name}.svg?downloads=true&stars=true)](https://www.npmjs.com/package/{package_name})
```

NPM version badge:
```markdown
[![npm version](https://img.shields.io/npm/v/{package_name})](https://www.npmjs.com/package/{package_name})
```

### GitHub Actions Badge (if release workflow created)

```markdown
[![Release](https://github.com/{owner}/{repo}/actions/workflows/release.yml/badge.svg)](https://github.com/{owner}/{repo}/actions/workflows/release.yml)
```

### Badge Placement

Badges go directly after the `# Title` line, before any description text. Each badge on its own line or separated by spaces.

---

## 3. Status Banners

Use GitHub's native alert syntax. Place after badges, before the main description.

### Heavy Development

```markdown
> [!CAUTION]
> **{project_name}** is still under heavy development and not yet ready for production use.
```

### Beta

```markdown
> [!NOTE]
> **{project_name}** is in beta. APIs may change between minor versions.
```

### Stable

No banner needed.

---

## 4. Logo Generation Guidelines

### SVG Requirements

- **Format**: SVG with `viewBox` attribute (no fixed width/height in root element)
- **File size**: Max 10KB
- **Colors**: Monochrome base with optional single accent color
- **Style**: Clean, geometric or typographic. Professional, not playful
- **Readability**: Must be recognizable at 100px width and detailed at 400px

### SVG Structure

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <!-- Background shape (optional) -->
  <!-- Icon/symbol element -->
  <!-- Project name text -->
</svg>
```

### Design Approach

1. **Derive from project name**: Use initials, abbreviations, or symbolic representation
2. **Keep it simple**: 2-3 geometric shapes max, clean lines
3. **Typography**: Use `font-family="Arial, Helvetica, sans-serif"` for cross-platform rendering
4. **Colors**: Choose based on project domain (blue=data/infra, green=tools/dev, purple=AI/ML, orange=web)

### File Location and README Embedding

Save to: `etc/logo.svg`

README embed (before `# Title`):
```html
<img src="https://raw.githubusercontent.com/{owner}/{repo}/main/etc/logo.svg" width="400" align="right" alt=""/>
```

Determine the default branch (main or master) from git config.

---

## 5. README Enhancement Rules

### Insertion Order (top to bottom)

1. Logo `<img>` tag (before `# Title`)
2. `# Title` (existing or from project name)
3. Badge block (after title)
4. Status banner (after badges)
5. Rest of existing README content (preserved)

### Preservation Rules

When enhancing an existing README:
- **NEVER** delete existing sections
- **NEVER** rewrite existing prose
- **INSERT** logo, badges, and banner at the correct positions
- **ADD** missing standard sections at the end (Contributing, License) if absent
- **UPDATE** License section to reference the actual LICENSE file

### Standard Sections (add if missing)

If the README lacks these sections, append them:

```markdown
## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

{license_text} -- See [LICENSE](LICENSE){and_notice}.
```

Where `{and_notice}` is ` and [NOTICE](NOTICE)` for Apache 2.0, empty otherwise.

---

## 6. GitHub Actions Release Workflow

### When to Create

Only when user confirms they want automated releases.

### Workflow Capabilities

- Triggered by version tags (`v*.*.*`)
- Creates GitHub Release with auto-generated notes
- Publishes to npm (if npm package, with `NPM_TOKEN` secret)
- Generates CHANGELOG entries

### Required Secrets

Document in the summary output:
- `NPM_TOKEN` — Required if npm publish is enabled. Generate at npmjs.com > Access Tokens.

---

## 7. Project Analysis Heuristics

### Detecting Project Type

| File | Project Type |
|------|-------------|
| `package.json` | Node.js |
| `pom.xml` | Java/Maven |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin/Gradle |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pyproject.toml` / `setup.py` / `requirements.txt` | Python |
| `*.sln` / `*.csproj` | .NET/C# |

### Detecting NPM Package

`package.json` exists AND has a `name` field AND does not have `"private": true`.

### Detecting GitHub Remote

```bash
git remote get-url origin 2>/dev/null
```

Parse `{owner}/{repo}` from the URL. **If no remote exists:**
- The repo may be brand new and not yet pushed to GitHub
- Ask the user for `{owner}/{repo}` only if needed (badges, logo URL, CONTRIBUTING issues link)
- If the user doesn't know yet, use placeholders: `{OWNER}` / `{REPO}` in generated files
- Never attempt to push, fetch, or interact with a remote that doesn't exist
- The Summary phase should list "add remote" as a next step

### Detecting Default Branch

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
```

Fallback: check if `main` or `master` branch exists.
