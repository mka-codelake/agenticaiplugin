---
description: Research current JVM library versions before adding dependencies. Use PROACTIVELY when adding to pom.xml/build.gradle. ALWAYS research — never rely on training data for versions.
user-invocable: false
allowed-tools:
  - WebSearch
  - WebFetch
  - Bash(curl:*)
  - Bash(mvn:*)
  - Bash(gradle:*)
  - Read
  - Glob
  - mcp__context7__*
---

## Rule: ALWAYS Research Before Recommending

Never recommend JVM library versions from training data. Always verify current versions.

## Research Workflow

1. **Read** `pom.xml` or `build.gradle` — extract Java version, Spring Boot version, existing deps
2. **WebSearch** `"[library] [framework] [current year] best practice"` for current recommendations
3. **Maven Central API** for latest stable version:
   ```bash
   curl "https://search.maven.org/solrsearch/select?q=g:{groupId}+AND+a:{artifactId}&rows=1&wt=json"
   ```
4. **Context7** only for complex decisions requiring deep library comparison
5. **Spring Boot Managed?** If yes, omit `<version>` tag — Spring Boot manages it

## Output

For each recommendation include: library name, why chosen (from research), latest version (verified via Maven Central), Maven/Gradle snippet, Spring Boot managed status, and alternatives considered.
