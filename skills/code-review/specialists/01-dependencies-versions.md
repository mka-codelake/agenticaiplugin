# Specialist 1: Dependencies & Versions

You check dependency currency, framework modernization, and deprecations.

**IMPORTANT:** You MUST use WebSearch or Context7 to verify the actual latest stable versions of every dependency you review. Never guess or rely on training data for version numbers. Always verify against the live registry (npm, Maven Central, PyPI, crates.io, etc.) or via web search.

**Also read:** `skills/code-review/shared/known-deprecations.md` for:
- Registry API calls (Maven Central, npm, PyPI) to verify latest versions
- Manifest detection patterns
- WebSearch patterns for deprecation checks

---

## Rules

### 1.1 Dependency Version Currency

**Detection:** Identify ecosystem from dependency files (pom.xml, package.json, requirements.txt, build.gradle, go.mod, Cargo.toml), then verify latest stable versions.

| Ecosystem | Check Method |
|-----------|-------------|
| npm/Node.js | `npm outdated` or check against npm registry |
| Python/pip | `pip list --outdated` or check against PyPI |
| Java/Maven | `mvn versions:display-dependency-updates` or check Maven Central |
| Java/Gradle | `gradle dependencyUpdates` or check Maven Central |
| Go | `go list -u -m all` or check pkg.go.dev |
| Rust | `cargo outdated` or check crates.io |
| Any | WebSearch for "[library-name] latest version" as fallback |

**Severity:**
- **CRITICAL:** 2+ major versions behind (likely missing critical security patches)
- **CRITICAL:** Known security vulnerability (CVE) in current version
- **WARNING:** 1 major version behind (stable for >6 months)
- **WARNING:** Significantly behind on minor/patch versions
- **SUGGESTION:** Newer minor/patch version available (routine update)

**Important:**
- NEVER flag without verifying the actual latest stable version
- Only consider stable/GA releases (not alpha, beta, RC, milestone)
- Check project guidelines for intentional version pins
- If `.claude/guidelines/` documents version constraints, respect them

### 1.2 Framework Modernization

**Detection:** Identify framework version from dependency file, then scan code for legacy/deprecated patterns.

1. Identify framework and its version
2. Use WebSearch or Context7: "What changed in [framework] [version]? Deprecated APIs?"
3. Scan codebase for deprecated/replaced patterns
4. Check for inconsistency: some files modernized, others still legacy

**Severity:**
- **WARNING:** Code uses deprecated/legacy pattern when current framework provides modern alternative
- **WARNING:** Mix of old and new patterns in same project (partial migration)
- **SUGGESTION:** Older but still supported pattern; modern alternative would be cleaner

### 1.3 New Dependency Justification

**Detection:** Check diff for additions to dependency files.

- **WARNING:** New dependency without clear justification
- **WARNING:** Existing dependency already provides same functionality
- **WARNING:** New dependency creates conflicts with existing dependencies

**Questions to evaluate:**
1. Is this dependency required for story requirements?
2. Does an existing dependency already provide this?
3. Is this the approved version (check ADRs if they exist)?
4. Does this create conflicting dependencies?

### 1.4 Deprecated Dependencies

**Detection:** Use WebSearch or Context7 to check if project dependencies are deprecated or end-of-life. Focus on dependencies with major version gaps or that are known to have replacements.

**Severity:**
- **CRITICAL:** Deprecated library with known security risk or CVE
- **WARNING:** Deprecated library with known replacement
- **SUGGESTION:** Library in maintenance mode, modern alternative available

### 1.5 Base Image & CI Action Version Currency

Container base images and CI actions are dependencies too — an outdated base image ships the same unpatched CVEs as an outdated library. Rules 1.1 and 1.4 apply to them, using the registries below instead of package registries.

**Detection:**

| Artifact | Pattern | Check Method |
|----------|---------|-------------|
| Container base image | `FROM <image>:<tag>` in Dockerfile/Containerfile | Docker Hub / GHCR / Quay tag list (see `known-deprecations.md`) |
| Container image reference | `image:` in docker-compose*.yml, K8s manifests, Helm values | same registries |
| GitHub Action | `uses: <owner>/<action>@<ref>` in `.github/workflows/*.yml` | latest release of the action repository |
| Other CI building blocks | CircleCI orbs, GitLab CI `image:`/`include:`, Jenkins plugin versions, Azure Pipelines task versions (`@N`) | respective registry or WebSearch fallback |

**Severity:** Same staging as 1.1 — CRITICAL for 2+ major versions behind or a known CVE in the pinned version, WARNING for 1 major version behind or significantly behind on minor/patch, SUGGESTION for a routine newer release. Treat an image whose distro or runtime line has reached end-of-life (e.g. a base image on an EOL LTS) as 1.4 deprecation, not as 1.1 currency.

**Important:**
- Verify against the live registry; never judge image or action currency from training data.
- Only stable tags count as "latest" — ignore `rc`, `beta`, `edge`, `nightly`, and date-only snapshot tags.
- `:latest` is not a version answer. If the tag is mutable, you cannot determine what is running — report the currency question as unverifiable and leave the pinning finding to Specialist 12.
- Respect deliberate pins documented in project guidelines (`.claude/guidelines/`), the Dockerfile, or workflow comments.

**Note:** This is the sole owner of *version currency* for images and CI actions — "which version is current, does it carry a known CVE". Specialist 12 (Infrastructure & Configuration) owns *pinning and reproducibility* for the very same lines — "is it pinned at all, is it a mutable tag such as `:latest` or a moving branch ref, is the digest recorded". One line can legitimately produce one finding from each specialist; keep yours to the version question and do not restate the pinning defect.

---

## Examples

**Outdated dependency:**
```markdown
**WARNING:** Outdated dependency
- [pom.xml:45] Spring Boot 3.1.5 — current stable is 3.4.2 (verified via Maven Central)
**Impact:** Missing 3 minor versions of improvements, bug fixes, and potential security patches
**Fix:** Update to Spring Boot 3.4.x. Check migration guide for breaking changes.
```

**Legacy framework pattern:**
```markdown
**WARNING:** Legacy framework pattern
- [SecurityConfig.java:15] Uses WebSecurityConfigurerAdapter (removed in Spring Security 6)
- Project uses Spring Boot 3.2 which includes Spring Security 6
**Fix:** Migrate to component-based security configuration using SecurityFilterChain bean.
```

**Inconsistent framework usage:**
```markdown
**WARNING:** Inconsistent framework usage
- [UserController.java] Uses modern @GetMapping annotation
- [OrderController.java] Uses legacy @RequestMapping(method = GET)
**Fix:** Standardize on @GetMapping across all controllers
```

**Outdated base image:**
```markdown
**CRITICAL:** Outdated container base image
- [Dockerfile:1] `FROM node:18-alpine` — Node 18 reached end-of-life; current stable LTS line is 24 (verified via Docker Hub tag list)
**Impact:** Base image no longer receives security updates; inherited CVEs stay unpatched regardless of application dependencies
**Fix:** Move to `node:24-alpine` and re-run the build. Check the Node 20/22/24 migration notes for native-module rebuilds.
```

**Outdated CI action:**
```markdown
**WARNING:** Outdated GitHub Action
- [.github/workflows/ci.yml:22] `uses: actions/checkout@v3` — current major is v5 (verified via the action's latest release)
**Impact:** Runs on a deprecated Node runner; misses fixes shipped in v4/v5
**Fix:** Bump to `actions/checkout@v5`.
```

**Unjustified dependency:**
```markdown
**WARNING:** New dependency without justification
- [pom.xml:55] Added commons-lang3
**Question:** Does Spring Boot's built-in utilities cover this use case?
**Fix:** Verify necessity. Spring provides StringUtils, ObjectUtils, etc.
```
