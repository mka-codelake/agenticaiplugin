# Dependency Version Checking Reference

Shared reference for Specialist 1 (Dependencies & Versions). Used during normal code review and in `--renovate` dependency audit mode.

---

## Registry API Calls

Use these APIs to verify the latest stable version of each dependency.

**Where a response is large, it is filtered before you read it.** The saving is proportional
to response size, so only the big ones carry a filter: PyPI answers `boto3` with **3.2 MB**
of release history for one version string, Docker Hub **553 KB** for 100 tag names, `npm
view react versions` **105 KB**. The small endpoints below (Maven Central, npm
`/{package}/latest`, GHCR `tags/list`) stay unfiltered on purpose — under roughly 10 KB a
filter only moves the parsing around. Every filter aborts with exit 1 and a named cause
rather than printing a partial result: an empty answer, an HTTP error body, and invalid
JSON must never look like "no newer version found".

**JVM (Maven Central):**
```bash
curl -s "https://search.maven.org/solrsearch/select?q=g:{groupId}+AND+a:{artifactId}&rows=1&wt=json"
```

**JavaScript (npm Registry):**
```bash
curl -s "https://registry.npmjs.org/{package}/latest"
```

**Python (PyPI):** the raw response carries every file of every release ever published
(3.2 MB for `boto3`, 615 KB for `django`) around the one field that answers the question.
```bash
curl -s "https://pypi.org/pypi/{package}/json" | node -e '
let d;
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) { d = null; }
if (!d || typeof d !== "object" || !d.info || typeof d.info.version !== "string") {
  console.error("pypi.org returned no version info - unknown package or failed request");
  process.exit(1);
}
console.log(JSON.stringify({
  name: d.info.name,
  latest: d.info.version,
  requires_python: d.info.requires_python,
  yanked: !!d.info.yanked,
}, null, 2));
'
```
A yanked latest release is not a valid upgrade target — report the dependency as
unverifiable rather than recommending it.

**Container images (Docker Hub):** official images live in the `library` namespace, so
`{namespace}` is `library` for them.
```bash
curl -s "https://hub.docker.com/v2/repositories/{namespace}/{image}/tags?page_size=100&ordering=last_updated" | node -e '
let d;
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) { d = null; }
if (!d || typeof d !== "object" || !Array.isArray(d.results)) {
  console.error("hub.docker.com returned no tag list - unknown image or failed request");
  process.exit(1);
}
console.log(JSON.stringify(d.results.map(t => ({ name: t.name, last_updated: t.last_updated })), null, 2));
'
```
`last_updated` is kept deliberately: the digests, sizes and per-architecture variants in
the raw response are what make it 553 KB, but the timestamp is what tells a stale image
line from a maintained one — dropping it would save a further 5 KB of the remaining 8.6 KB
and make the EOL judgement this reference exists for impossible.

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
curl -s "https://quay.io/api/v1/repository/{namespace}/{image}/tag/?onlyActiveTags=true&limit=100" | node -e '
let d;
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) { d = null; }
if (!d || typeof d !== "object" || !Array.isArray(d.tags)) {
  console.error("quay.io returned no tag list - unknown image, private repository, or failed request");
  process.exit(1);
}
console.log(JSON.stringify(d.tags.map(t => ({ name: t.name, last_modified: t.last_modified })), null, 2));
'
```
Quay answers a private repository with **HTTP 401** and `{"detail":"Requires
authentication"}` — a body that parses cleanly but has no `tags` field. That is the
"private image" case under Error handling below: report it as unverifiable, do not guess.

**GitHub Actions:** the response is dominated by `body`, which carries the complete release
notes — 28 KB for `grafana/grafana`, and it is the only field that varies by orders of
magnitude between repositories.
```bash
curl -s "https://api.github.com/repos/{owner}/{action}/releases/latest" | node -e '
let d;
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) { d = null; }
if (!d || typeof d !== "object" || typeof d.tag_name !== "string") {
  console.error("api.github.com returned no release - unknown repo, rate limit, or the repo publishes tags only");
  process.exit(1);
}
console.log(JSON.stringify({ tag_name: d.tag_name, published_at: d.published_at, prerelease: !!d.prerelease }, null, 2));
'
# or, where the gh CLI is authenticated: gh release view --repo {owner}/{action} --json tagName,publishedAt,isPrerelease
```
**An abort here is not always an error.** Some repositories tag versions without ever
publishing a GitHub *release*: `golang/go` answers this endpoint with **HTTP 404** and its
`/releases` list with `[]`. An anonymous request is also rate-limited at 60/hour per IP,
which produces the same abort for a repository that does have releases. For the former,
fall back to the tag list:
```bash
curl -s "https://api.github.com/repos/{owner}/{action}/tags" | node -e '
let d;
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) { d = null; }
if (!Array.isArray(d) || d.length === 0) {
  console.error("api.github.com returned no tags - unknown repo, rate limit, or the repo has no tags");
  process.exit(1);
}
console.log(JSON.stringify(d.map(t => t.name), null, 2));
'
```
**Read that fallback with the tag list caveats below, they are not optional here.** This
endpoint returns 30 tags in a repository-dependent order that is *not* chronological:
`actions/checkout` happens to answer `v7.0.1` first, `golang/go` answers
`weekly.2012-03-27` — a tag from 2012. Taking the first entry is how a fourteen-year-old
version gets reported as current. Sort the names yourself, and if no semver-shaped tag is
among them, report the dependency as unverifiable rather than picking one.

**Tag list caveats:** these endpoints return tags in registry order, not semver order — the
filters above preserve that order rather than imposing one, so sort yourself and discard `latest`, `edge`, `nightly`, `rc`/`beta`, and date-only snapshot tags before deciding what "latest stable" is. A digest-only reference (`image@sha256:…`) carries no version information; resolve it via the registry or report the currency question as unverifiable.

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
