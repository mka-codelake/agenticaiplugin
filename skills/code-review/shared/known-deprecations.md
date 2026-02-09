# Dependency Version Checking Reference

Shared reference for Specialist 1 (Dependencies & Versions). Used during normal code review and in `--renovate` dependency audit mode.

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

## Deprecation Detection

Do NOT rely on hardcoded lists. Always use WebSearch or Context7 to check for deprecations:

```
"{library} deprecated {current_year}"
"{library} end of life {current_year}"
"{library} alternative replacement {current_year}"
```

Research deprecations for dependencies that are:
- Outdated with major version gap
- Flagged by other indicators (changelog mentions, community warnings)

Use the standard severity classification from `issue-classification.md` for all findings.
