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
- If `claudedocs/guidelines/` documents version constraints, respect them

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

**Unjustified dependency:**
```markdown
**WARNING:** New dependency without justification
- [pom.xml:55] Added commons-lang3
**Question:** Does Spring Boot's built-in utilities cover this use case?
**Fix:** Verify necessity. Spring provides StringUtils, ObjectUtils, etc.
```
