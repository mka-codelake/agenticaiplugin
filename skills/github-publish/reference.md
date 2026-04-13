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

### GitHub Actions Badge (only after first release exists)

```markdown
[![Release](https://github.com/{owner}/{repo}/actions/workflows/release.yml/badge.svg)](https://github.com/{owner}/{repo}/actions/workflows/release.yml)
```

**Do NOT include this badge** if the repo has no releases yet — it links to an empty page and confuses visitors. Add it to the README only after the first `v*.*.*` tag has been pushed and the workflow has run at least once.

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
> **{project_name}** is in beta. Features and interfaces may change between minor versions.
```

Adapt the wording to the project's nature (e.g., "Skills, agents, and conventions" for a plugin, "APIs and data formats" for a library).

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
<img src="./etc/logo.svg" width="400" align="right" alt="{project_name}"/>
```

Use a relative path — this works on any branch and doesn't depend on the default branch name.

---

## 5. README — Baseline Structure, Creation, and Enhancement

This section is the single source of truth for README structure across all repositories.

### 5.1 Baseline Structure (required sections, in order)

Every public repository README must follow this structure. Sections marked *(optional)* may be omitted if not applicable.

```
1.  <img> logo                          (optional, before title)
2.  # Project Name
3.  Badges (license, npm, CI)           (after title, before text)
4.  Status banner (Caution/Note)        (optional, after badges)
5.  Introductory paragraph              (1-3 sentences: what is this?)
6.  ## Overview                         (what, why, for whom, key benefits)
7.  ## Features                         (bullet list with descriptions)
8.  ## Installation                     (prerequisites + steps)
9.  ## Usage                            (quick start + examples)
10. ## Configuration                    (optional, if applicable)
11. ## Project Structure                (directory tree with explanations)
12. ## Contributing                     (reference CONTRIBUTING.md)
13. ## License                          (reference LICENSE + NOTICE)
```

**Rules:**
- Sections 1-5 and 6-13 must appear in this order
- Custom project-specific sections go between Usage/Configuration and Project Structure
- Contributing and License are always the last two sections

### 5.2 Content Generation (Project Analysis)

When creating or updating a README, analyze the project first:

**Manifest file detection** (determines project type and installation instructions):

| File | Project Type | Install Command |
|------|-------------|-----------------|
| `package.json` | Node.js | `npm install {name}` |
| `pom.xml` | Java/Maven | Maven dependency XML |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin/Gradle | Gradle dependency |
| `Cargo.toml` | Rust | `cargo add {name}` |
| `go.mod` | Go | `go get {module}` |
| `pyproject.toml` / `setup.py` | Python | `pip install {name}` |
| `*.sln` / `*.csproj` | .NET/C# | `dotnet add package {name}` |
| `.claude-plugin/plugin.json` | Claude Code Plugin | Plugin marketplace install |

**Key file priority** (read these for content):
1. `CLAUDE.md` — Project instructions (highest priority)
2. `README.md` — Existing description (for updates)
3. Build/manifest files — Dependencies, version, scripts
4. Configuration files — Settings, environment
5. `docs/` directory — Additional documentation

**Directory scan:**
```bash
find . -maxdepth 2 -type d -not -path '*/\.*' -not -path './node_modules/*' -not -path './target/*' -not -path './.git/*' -not -path './dist/*' -not -path './build/*' | head -50
```

### 5.3 Create vs Update Mode

**CREATE mode** (no README.md exists):
1. Run project analysis (Section 5.2)
2. Generate complete README following Baseline (Section 5.1)
3. Fill all sections with analyzed content
4. Add logo, badges, and banner

**UPDATE mode** (README.md exists):
1. Run project analysis (Section 5.2) — same as CREATE mode
2. Read existing README completely
3. **Compare analysis results against README content:**
   - Structure: Which Baseline sections are missing?
   - Content: Does the README accurately reflect the current project state? (features, architecture, commands, tech stack, project structure)
   - Factual: Are numbers, names, and descriptions still correct?
4. Show discrepancies and missing sections in Plan Preview
5. Apply changes following Update Rules (Section 5.4)
6. Add/update logo, badges, and banner

### 5.4 Update Rules

When modifying an existing README:

**PRESERVE (never touch):**
- Manually written prose in existing sections
- Screenshots, images, diagrams
- Custom sections not in the Baseline
- Badges the user added manually

**ADD (if missing):**
- Sections from the Baseline that don't exist yet
- Insert at the correct position per Baseline order
- Contributing and License always go at the end

**UPDATE (replace with current data):**
- Installation steps (from build files)
- Feature list (if code changed significantly)
- Version numbers
- Project Structure tree
- Badge URLs (license type, workflow status)

**BE CAREFUL WITH:**
- Overview section (may have custom wording — ask before rewriting)
- Any section with manual formatting or personal tone

### 5.5 Quality Checklist

After creating or updating, verify:

- [ ] Overview explains what the project does, why it exists, and who it's for
- [ ] Installation steps are complete (prerequisites + commands)
- [ ] At least one usage example with code block
- [ ] Prerequisites clearly listed with versions
- [ ] Project structure briefly explained
- [ ] Contributing section references CONTRIBUTING.md
- [ ] License section references LICENSE file
- [ ] Readable by someone new to the project
- [ ] No broken links or placeholder URLs
- [ ] No references to removed features or outdated architecture

### 5.6 Writing Style

- **English only**: All README content must be written in English for international accessibility
- **Readable prose**: Full sentences with context, not just bullet points
- **Explain the "why"**: Not just what the project does, but why it matters
- **Practical examples**: Real-world usage scenarios with runnable code
- **Step-by-step**: Numbered instructions for installation and setup
- **Friendly tone**: Welcoming to new contributors
- **Language-agnostic**: Describe capabilities without assuming a specific tech stack unless the project is stack-specific

### 5.7 Cosmetic Elements (Insertion Order)

When adding logo, badges, and banner to an existing README:

1. Logo `<img>` tag — insert before `# Title` line
2. Badges — insert on the line after `# Title`
3. Status banner — insert after badges, before first paragraph
4. Do NOT move or reorder existing content below the banner

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

---

## 8. Language Audit

### 8.1 Purpose

Before publishing a repository to GitHub, scan for non-English content that should be translated for international accessibility. The audit detects German text (the most common non-English language in this context) and offers translation per category.

### 8.2 Categories

| Category | What It Covers | Detection Target |
|----------|---------------|-----------------|
| **Documentation** | README, CONTRIBUTING, CHANGELOG, docs/, manifest descriptions | Complete .md files and description fields |
| **Code Comments** | Inline, block, docstrings, Javadoc, JSDoc, TODO/FIXME | Comments embedded in source code |
| **Code Strings** | Error messages, log messages, CLI output, UI strings, test descriptions | String literals in source code |

**Not translatable (flag only):**
- Git commit messages — visible on GitHub but requires history rewrite → only mention in summary
- Variable/function names — renaming breaks code → never touch

### 8.3 Detection Heuristics

**Primary indicator — German umlauts in text context:**
```
[äöüßÄÖÜ]
```

**Secondary indicator — common German words in comments/strings:**
```
Fehler|Eingabe|Berechnung|Prüfung|Verarbeitung|Rückgabe|Ausgabe|Abfrage|Ergebnis|Übersicht|Anwendung|Zusammenfassung|Schnittstelle|Eigenschaft|Beschreibung|Funktion|Methode|Klasse|Wert|Datei|Ordner|Zustand|Anfrage|Antwort|Verbindung|Konfiguration|Einstellung|Benutzung|Beispiel|Hinweis|Warnung|Berechtigung
```

**Source file types to scan:**
`*.java`, `*.py`, `*.js`, `*.ts`, `*.jsx`, `*.tsx`, `*.go`, `*.rs`, `*.kt`, `*.scala`, `*.cs`, `*.cpp`, `*.c`, `*.h`, `*.rb`, `*.php`, `*.sh`, `*.bash`

**Directories to exclude:**
`node_modules/`, `.git/`, `vendor/`, `target/`, `dist/`, `build/`, `__pycache__/`, `.gradle/`, `bin/`, `obj/`

**Lock files to exclude:**
`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.lock`, `poetry.lock`, `go.sum`, `*.lock`

### 8.4 Scan Method

**Step 1: Documentation files**
- Find all `.md` files in root and `docs/` directory
- Read each file, check for German text patterns
- Also check `package.json` `description`, `pom.xml` `<description>`, `pyproject.toml` `description`

**Step 2: Code comments**
- Use Grep tool with patterns for umlauts and German keywords
- Filter to comment contexts (lines starting with `//`, `#`, `*`, or inside `/* */`, `""" """` blocks)
- Count affected files and total occurrences

**Step 3: Code strings**
- Use Grep tool with patterns for umlauts and German keywords
- Filter to string contexts (content inside `"..."`, `'...'`, `` `...` ``)
- Count affected files and total occurrences

**Step 4: Git history (informational only)**
```bash
git log --oneline -50 | grep -cP '[äöüßÄÖÜ]|Fehler|Eingabe|Berechnung|Prüfung'
```

### 8.5 Translation Rules

When translating, follow these rules strictly:

1. **Preserve code structure** — only change text content, never modify logic, variables, or formatting
2. **Translate meaning, not word-by-word** — produce natural English
3. **Keep technical terms** — don't translate framework-specific or domain-specific terms
4. **Maintain comment style** — if original uses `//`, translated version uses `//`
5. **Preserve string delimiters** — don't change `"` to `'` or vice versa
6. **Use Edit tool** — one edit per file, replacing all German text in that file at once
7. **Never rename variables or functions** — even if they contain German words
8. **Never modify git history** — only flag German commits in the summary

### 8.6 Mode Behavior

| Mode | Language Audit |
|------|---------------|
| `full` (default) | Yes — scan all 3 categories |
| `--readme` | No — only README cosmetics |
| `--license` | No — only license files |
