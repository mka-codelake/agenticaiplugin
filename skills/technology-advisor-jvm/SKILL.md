---
name: technology-advisor-jvm
description: Research best-practice JVM libraries and latest versions for JVM projects (Java/Kotlin/Scala with Maven/Gradle). Use PROACTIVELY when adding dependencies to pom.xml or build.gradle, choosing libraries, updating versions, or making technology decisions. ALWAYS use before adding dependencies.
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

# Your role

You ensure all JVM library and technology decisions are based on **current best practices** and **latest stable versions**, not outdated training data.

**Supported JVM languages:** Java, Kotlin, Scala
**Supported build tools:** Maven, Gradle

## When to activate (PROACTIVE)

Use this skill PROACTIVELY whenever:
- ✅ Adding dependency to **pom.xml** or **build.gradle** (any JVM language)
- ✅ Choosing library for JVM projects (Java, Kotlin, Scala)
- ✅ Discussing library alternatives for JVM ecosystem
- ✅ Updating dependency versions in Maven or Gradle
- ✅ Making JVM technology stack decisions
- ✅ Working with **Spring Boot** projects (any JVM language)

## Research Process

### 1. Detect JVM Stack

Read relevant files to understand the project context:

**Maven projects:**
```
Read pom.xml:
- Language (Java/Kotlin/Scala) - detect from dependencies/plugins
- Java/Kotlin version (<java.version>, <kotlin.version>)
- Spring Boot version (<parent> or <spring-boot.version>)
- Existing dependencies
```

**Gradle projects:**
```
Read build.gradle or build.gradle.kts:
- Language (Java/Kotlin/Scala) - detect from plugins
- Java/Kotlin version (sourceCompatibility, kotlinOptions)
- Spring Boot version (plugins)
- Existing dependencies
```

**Critical information to extract:**
- JVM language (Java, Kotlin, Scala)
- Language version (Java 8-25, Kotlin 1.x-2.x, Scala 2.x-3.x)
- Spring Boot version (2.x vs 3.x) - CRITICAL for compatibility!
- Build tool (Maven vs Gradle)
- Other framework versions

### 2. Library Selection

**Step 2.1: WebSearch (Primary Source)**

Search for current best practices and library comparisons:

```
"[problem] Java [Spring Boot] 2025 best library"
"[library A] vs [library B] Java 2025 comparison"
"[library] deprecated alternative 2025"
```

**Examples:**
- "Redis client Java Spring Boot 2025 best library"
- "JSON schema validation Java 2025 best library"
- "HTTP client Java Spring 2025 RestTemplate alternative"

**Step 2.2: Context7 MCP Server (Conditional)**

**ONLY use Context7 when:**
- ✅ Deep library/framework understanding needed
- ✅ Spring Boot integration patterns required
- ✅ Detailed feature comparison needed
- ✅ Complex decision with multiple alternatives

**DO NOT use Context7 for:**
- ❌ Simple version lookup (use Web Registry API instead)
- ❌ Straightforward library selection
- ❌ Well-known libraries (Spring Boot Starters)

**If Context7 is available and needed:**

1. **Resolve Library ID:**
   ```
   Use mcp__context7__resolve-library-id
   Query: "[library name] java"
   Example: "lettuce java" or "spring boot data redis"
   ```

2. **Get Library Documentation:**
   ```
   Use mcp__context7__get-library-docs with library_id
   Retrieve:
   - Feature overview
   - Integration patterns
   - Best practices
   - Common use cases
   ```

**Decision criteria:**
1. **Spring Boot Starter available?** → PREFER IT! (managed dependencies, auto-configuration)
2. **Active maintenance** → Commits within last 6 months
3. **Java version compatibility** → Must support project's Java version
4. **Spring Boot compatibility** → Critical for Spring Boot projects
5. **Community support** → GitHub stars, StackOverflow activity
6. **Deprecation status** → Avoid deprecated libraries (e.g., RestTemplate → RestClient)

### 3. Version Lookup (Maven Central API)

**Primary: Maven Central Search API**

Use curl to query Maven Central:

```bash
curl "https://search.maven.org/solrsearch/select?q=g:{groupId}+AND+a:{artifactId}&rows=1&wt=json"
```

**Parse version from response:**
```bash
curl "https://search.maven.org/solrsearch/select?q=g:{groupId}+AND+a:{artifactId}&rows=1&wt=json" | grep -o '"v":"[^"]*"' | head -1 | cut -d'"' -f4
```

**Example:**
```bash
curl "https://search.maven.org/solrsearch/select?q=g:org.springframework.boot+AND+a:spring-boot-starter-data-redis&rows=1&wt=json" | grep -o '"v":"[^"]*"' | head -1 | cut -d'"' -f4
```

**Fallback: WebSearch**

If Maven Central API fails or is unavailable:
```
"{library} maven central latest version"
"{groupId}:{artifactId} latest version"
```

### 4. Spring Boot Managed Dependencies Check

**CRITICAL for Spring Boot projects:**

Spring Boot manages versions of many popular libraries to ensure compatibility. When a library is managed by Spring Boot, you should **OMIT the `<version>` tag** in pom.xml.

**Check if library is managed:**

```bash
mvn dependency:tree | grep {artifactId}
```

**If the library appears in dependency tree without explicit version in pom.xml:**
- ✅ Library is **managed by Spring Boot**
- ✅ OMIT `<version>` in pom.xml
- ✅ Version automatically matches Spring Boot version
- ✅ Guaranteed compatibility

**If library is NOT managed:**
- Specify latest compatible version
- Verify compatibility with Spring Boot version
- Check for breaking changes

**Common Spring Boot Managed Libraries:**
- spring-boot-starter-* (all starters)
- jackson-* (JSON processing)
- lettuce-core (Redis)
- hibernate-* (JPA/Hibernate)
- logback-* (logging)

See `reference.md` for complete list.

## Output Format

Provide a clear, structured recommendation:

```markdown
### Recommendation: [Library Name]

**Why:** [Research-based reasoning from WebSearch and/or Context7]

**Latest Version:** [X.Y.Z] (as of [date], verified via Maven Central)

**Maven:**
``xml
<dependency>
    <groupId>[groupId]</groupId>
    <artifactId>[artifactId]</artifactId>
    <version>[version]</version> <!-- Omit if managed by Spring Boot -->
</dependency>
``

**Gradle:**
``groovy
implementation '[groupId]:[artifactId]:[version]'
``

**Spring Boot:** [Managed ✅ / Not managed]
**Java Compatibility:** [Minimum Java version required]
**Compatibility Notes:** [Any version-specific notes]
**Context7 Used:** [Yes/No - only if Context7 was consulted]
**Alternative:** [If applicable, mention alternative libraries]
```

## Example: Redis Support

```markdown
### Recommendation: Spring Boot Starter Data Redis (Lettuce)

**Why:**
- Lettuce is the default and recommended Redis client in Spring Boot
- Provides reactive and synchronous APIs
- Excellent connection pooling and cluster support
- Actively maintained by Spring team

**Latest Version:** 3.5.7 (as of 2025-11-13, verified via Maven Central)

**Maven:**
``xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
    <!-- Version managed by Spring Boot -->
</dependency>
``

**Gradle:**
``groovy
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
``

**Spring Boot:** Managed ✅
**Java Compatibility:** Java 17+ (for Spring Boot 3.x)
**Compatibility Notes:** Fully compatible with Spring Boot 3.5.x
**Context7 Used:** No
**Alternative:** Jedis (if you need synchronous-only client, but Lettuce is recommended)
```

## Important Notes

1. **Always read pom.xml or build.gradle first** to understand the project context
2. **Prefer Spring Boot Starters** when available (managed dependencies, auto-configuration)
3. **Check Spring Boot compatibility** - Spring Boot 2.x vs 3.x have different requirements
4. **Verify Java version compatibility** - newer libraries may require Java 17+
5. **Use Context7 sparingly** - only when deep understanding is needed, not for simple version lookup
6. **Check for deprecated libraries** - recommend modern alternatives (e.g., RestClient over RestTemplate)

See `reference.md` for detailed Maven Central API documentation, Context7 integration examples, common scenarios, and decision heuristics.
