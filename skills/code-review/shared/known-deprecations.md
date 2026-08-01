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

**Container images (Docker Hub):**
```bash
# official images live in the "library" namespace
curl -s "https://hub.docker.com/v2/repositories/library/{image}/tags?page_size=100&ordering=last_updated"
curl -s "https://hub.docker.com/v2/repositories/{namespace}/{image}/tags?page_size=100&ordering=last_updated"
```

**Container images (GHCR):** anonymous pull token first, then the tag list with that token as bearer.
```bash
TOKEN=$(curl -s "https://ghcr.io/token?scope=repository:{owner}/{image}:pull" | node -e '
let res;
try { res = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) { res = null; }
if (!res || typeof res.token !== "string") {
  console.error("ghcr.io returned no token field - cannot list tags anonymously");
  process.exit(1);
}
console.log(res.token);
')
curl -s -H "Authorization: Bearer $TOKEN" "https://ghcr.io/v2/{owner}/{image}/tags/list"
```
**Keep the token check.** When the scope is denied, the token endpoint answers
`{"errors":[{"code":"DENIED",…}]}` — with no `token` field at all. Reading that field
without checking (`jq -r .token`, or eyeballing the response) yields the literal string
`null`, and against the same public image GHCR treats it as valid: `Bearer null` → **HTTP
200 with a full tag list**, whereas an empty token → 403 and no header at all → 401. The
one broken value that a naive read produces is the one value that fails silently, so a
missing token must abort here instead of yielding a tag list you would otherwise trust.
A genuinely denied scope is the "private image" case under Error handling below: report
it as unverifiable.

**Container images (Quay):**
```bash
curl -s "https://quay.io/api/v1/repository/{namespace}/{image}/tag/?onlyActiveTags=true&limit=100"
```

**GitHub Actions:**
```bash
curl -s "https://api.github.com/repos/{owner}/{action}/releases/latest"   # or: gh release view --repo {owner}/{action}
```

**Tag list caveats:** these endpoints return tags in registry order, not semver order — sort yourself and discard `latest`, `edge`, `nightly`, `rc`/`beta`, and date-only snapshot tags before deciding what "latest stable" is. A digest-only reference (`image@sha256:…`) carries no version information; resolve it via the registry or report the currency question as unverifiable.

**Error handling:**
- API timeout → skip dependency with warning
- 404 → mark as "unknown package"
- Registry requires authentication (private image) → report as unverifiable, do not guess

---

## Manifest Detection

Detect project tech stacks by searching for manifest files:

| Pattern | Stack |
|---------|-------|
| `pom.xml` | JVM (Maven) |
| `build.gradle`, `build.gradle.kts` | JVM (Gradle) |
| `package.json` | JavaScript (npm/yarn/pnpm) |
| `requirements.txt`, `pyproject.toml`, `Pipfile` | Python |
| `Dockerfile`, `Containerfile` (`FROM …`) | Container base images |
| `docker-compose*.yml`, K8s manifests, Helm values (`image:`) | Container image references |
| `.github/workflows/*.yml` (`uses:`) | GitHub Actions |
| `.circleci/config.yml` (orbs), `.gitlab-ci.yml` (`image:`, `include:`), `azure-pipelines.yml` (`task@N`), `Jenkinsfile` | Other CI building blocks |

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

For container images and CI actions:

```
"{image} docker official image supported tags"
"{image} {tag} end of life"
"{owner}/{action} latest release deprecated"
```

Research deprecations for dependencies that are:
- Outdated with major version gap
- Flagged by other indicators (changelog mentions, community warnings)

Use the standard severity classification from `issue-classification.md` for all findings.
