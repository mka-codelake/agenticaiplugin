# Known Deprecations & Registry APIs

Shared reference for dependency version checking and deprecation detection. Used by Specialist 1 during code review and in `--renovate` dependency audit mode.

---

## Registry API Calls

Use these APIs to verify the latest stable version of each dependency.

**JVM (Maven Central):**
```bash
curl -s "https://search.maven.org/solrsearch/select?q=g:{groupId}+AND+a:{artifactId}&rows=1&wt=json"
```

**JavaScript (npm Registry):**
```bash
curl -s "https://registry.npmjs.org/{package}/latest"
```

**Python (PyPI):**
```bash
curl -s "https://pypi.org/pypi/{package}/json"
```

**Error handling:**
- API timeout → skip dependency with warning
- 404 → mark as "unknown package"

---

## Known Deprecation List

Check this list FIRST before using WebSearch. If a project dependency matches, flag it immediately.

### JVM

| Deprecated | Replacement | Since |
|-----------|-------------|-------|
| RestTemplate | RestClient | Spring 6+ |
| Joda-Time | java.time | Java 8+ |
| Commons Lang 2.x | Commons Lang 3 | Long deprecated |
| Log4j 1.x | Logback / Log4j 2 | EOL, CVE risk |
| javax.* packages | jakarta.* | Spring Boot 3+ |
| Hibernate Validator 6.x | Hibernate Validator 8.x (jakarta) | Jakarta EE migration |
| Spring Security OAuth | Spring Authorization Server | Spring Security 6+ |

### JavaScript

| Deprecated | Replacement | Since |
|-----------|-------------|-------|
| moment.js | date-fns, day.js, Temporal API | Maintenance mode |
| request | axios, node-fetch, got | Deprecated 2020 |
| node-sass | sass (dart-sass) | Deprecated 2020 |
| tslint | eslint + @typescript-eslint | Deprecated 2019 |
| lodash (full) | native ES6+ or lodash-es | Partial replacement |
| express-validator 5.x | express-validator 7.x (new API) | Breaking API change |

### Python

| Deprecated | Replacement | Since |
|-----------|-------------|-------|
| urllib2 | requests, httpx | Python 3 |
| optparse | argparse | Python 3.2+ |
| distutils | setuptools | Python 3.12+ (removed) |
| imp | importlib | Python 3.4+ |
| asyncio.coroutine | async/await | Python 3.5+ |
| pkg_resources | importlib.resources | Python 3.9+ |

---

## WebSearch Fallback

For dependencies NOT on the known list, use WebSearch:

```
"{library} deprecated {current_year}"
"{library} alternative replacement {current_year}"
```

Only research libraries that are:
- Outdated with major version gap, OR
- Flagged by other indicators (changelog mentions, community warnings)

---

## Manifest Detection

Detect project tech stacks by searching for manifest files:

| Pattern | Stack |
|---------|-------|
| `pom.xml` | JVM (Maven) |
| `build.gradle`, `build.gradle.kts` | JVM (Gradle) |
| `package.json` | JavaScript (npm/yarn/pnpm) |
| `requirements.txt`, `pyproject.toml`, `Pipfile` | Python |

**Rules:**
- Without `--stack` filter: check ALL detected stacks
- With `--stack` filter: check only the specified stack
- No manifests found: error and stop

---

## Dependency Extraction

### JVM (pom.xml)
- Extract `<dependency>` elements: groupId, artifactId, version
- Note property references (`${...}`)
- Identify Spring Boot managed dependencies (no version tag)

### JavaScript (package.json)
- Extract `dependencies` and `devDependencies`
- Parse semver constraints (^, ~, exact)

### Python (requirements.txt / pyproject.toml)
- Extract package names and versions
- Parse version specifiers (==, >=, ~=)

---

## Dependency Audit Report Format

Used when `--renovate` mode generates the full audit report:

```markdown
# Dependency Audit Report

**Date:** {current date}
**Project:** {project path}
**Tech Stacks:** {detected stacks}
**Mode:** {Full | Quick}

---

## Summary

| Status | Count | Action |
|--------|-------|--------|
| Current | {n} | None |
| Outdated | {n} | Update recommended |
| Deprecated | {n} | Migration required |
| Replaced | {n} | Alternative available |

---

## {Stack Name} Dependencies

### Outdated

| Dependency | Current | Latest | Gap |
|------------|---------|--------|-----|
| {name} | {current} | {latest} | {Minor/Major} |

### Deprecated

| Dependency | Issue | Replacement |
|------------|-------|-------------|
| {name} | {reason} | {alternative} |

### Current

| Dependency | Version |
|------------|---------|
| {name} | {version} |

---

## Recommendations

### Priority 1: Critical (Deprecated/Security)
{List of critical items with recommended action}

### Priority 2: Updates Recommended
{List of outdated items sorted by gap size}
```
