---
description: Guidance for adding, upgrading, or changing dependencies, applied WHEN a dependency manifest is touched. Use when adding, upgrading, or removing a dependency or editing a manifest such as package.json, pom.xml, build.gradle, requirements.txt, pyproject.toml, Cargo.toml, go.mod, Gemfile, composer.json — e.g. "add a dependency", "bump this package", "install X", "neue Abhängigkeit", "Dependency updaten". Captures the dependency rules Claude does not reliably apply by default.
model: haiku
effort: low
---

# Dependency Management

Applies when you add, upgrade, or otherwise change a project's dependencies. These are
the points that are easy to get wrong from memory — apply them every time.

## Verify the CURRENT version — do not trust training data

Before adding or pinning a dependency, verify the actually-current version from the
registry, **not** from memory (training data goes stale and yields wrong versions/APIs):

| Ecosystem | Check |
|-----------|-------|
| npm | `npm view <pkg> version` (and `dist-tags`) |
| Python | `pip index versions <pkg>` |
| Rust | `cargo search <pkg>` |
| Go | `go list -m -versions <module>` |
| Java/Maven | check Maven Central for the latest release |

Match the API you write to the version you actually pin.

## No unrequested dependencies

Only add a dependency that is (1) already in the project's stack, or (2) explicitly
approved by the user. Before pulling in something new, check whether an existing or
transitive dependency already solves it. If a genuinely new dependency is needed,
**ask first** — state what it is, why, and the lighter alternatives.

## Keep the lockfile consistent

After changing a manifest, update the lockfile with the ecosystem's own tool
(`npm install`, `poetry lock`, `cargo update -p`, …) so manifest and lockfile agree —
do not hand-edit a version in one without the other.

## Related

- **license-check** — verify license compatibility of dependencies you add.
