# Technology Advisor Java - Reference

## Maven Central Search API

### Endpoint

```
https://search.maven.org/solrsearch/select?q=g:{groupId}+AND+a:{artifactId}&rows=1&wt=json
```

### Parameters

- `q`: Query string in format `g:{groupId}+AND+a:{artifactId}`
- `rows`: Number of results (use 1 for latest version)
- `wt`: Response format (json)

### Example Requests

**Spring Boot Starter Web:**
```bash
curl "https://search.maven.org/solrsearch/select?q=g:org.springframework.boot+AND+a:spring-boot-starter-web&rows=1&wt=json"
```

**Lettuce (Redis Client):**
```bash
curl "https://search.maven.org/solrsearch/select?q=g:io.lettuce+AND+a:lettuce-core&rows=1&wt=json"
```

**Jackson Databind:**
```bash
curl "https://search.maven.org/solrsearch/select?q=g:com.fasterxml.jackson.core+AND+a:jackson-databind&rows=1&wt=json"
```

### Response Format

```json
{
  "responseHeader": {
    "status": 0,
    "QTime": 1
  },
  "response": {
    "numFound": 150,
    "start": 0,
    "docs": [
      {
        "id": "org.springframework.boot:spring-boot-starter-web:3.5.7",
        "g": "org.springframework.boot",
        "a": "spring-boot-starter-web",
        "v": "3.5.7",
        "p": "jar",
        "timestamp": 1699889400000,
        "ec": [".pom", ".jar"],
        "tags": ["spring", "boot", "starter"]
      }
    ]
  }
}
```

### Parse Version

**Using grep:**
```bash
curl "https://search.maven.org/solrsearch/select?q=g:org.springframework.boot+AND+a:spring-boot-starter-web&rows=1&wt=json" | grep -o '"v":"[^"]*"' | head -1 | cut -d'"' -f4
```

**Expected output:**
```
3.5.7
```

## Context7 MCP Server Integration

### When to Use Context7

**Use Context7 when you need:**
- ✅ Deep understanding of library features and architecture
- ✅ Spring Boot-specific integration patterns
- ✅ Detailed comparison between multiple libraries
- ✅ Best practices for complex library usage
- ✅ Framework-specific recommendations

**Do NOT use Context7 for:**
- ❌ Simple version lookup (use Maven Central API instead)
- ❌ Well-known libraries with obvious choices (Spring Boot Starters)
- ❌ Quick decisions when WebSearch provides clear answer

### Context7 Tools

#### 1. mcp__context7__resolve-library-id

**Purpose:** Find the library ID in Context7's knowledge base

**Input:**
```
Query: "[library name] java"
```

**Examples:**
```
"lettuce java"
"spring boot data redis"
"jackson databind"
"hibernate validator"
```

**Output:**
```
library_id: "io.lettuce:lettuce-core"
```

#### 2. mcp__context7__get-library-docs

**Purpose:** Retrieve detailed documentation and patterns

**Input:**
```
library_id: "io.lettuce:lettuce-core"
```

**Output:**
- Feature overview
- Integration patterns (Spring Boot, standalone)
- Configuration examples
- Best practices
- Common use cases

### Example Workflow with Context7

**Scenario:** User needs JSON schema validation, unsure between multiple libraries

**Step 1: WebSearch**
```
Query: "JSON schema validation Java 2025 best library"
Results: networknt/json-schema-validator, everit-org/json-schema, justify
```

**Step 2: Context7 (for detailed comparison)**
```
1. mcp__context7__resolve-library-id("json-schema-validator java")
   → library_id: "com.networknt:json-schema-validator"

2. mcp__context7__get-library-docs(library_id)
   → Features:
     - Supports Draft 7, 2019-09, 2020-12
     - High performance
     - Comprehensive error reporting
     - Active maintenance

3. Compare with everit-org (if needed)
```

**Step 3: Version Lookup (Web)**
```
Maven Central: com.networknt:json-schema-validator
→ Version: 1.5.3
```

**Output:**
```markdown
### Recommendation: networknt/json-schema-validator

**Why:**
- WebSearch: Most actively maintained (updated Jan 2025)
- Context7: Supports latest JSON Schema drafts (7, 2019-09, 2020-12)
- Context7: High performance with comprehensive error reporting
- 2.8k+ GitHub stars, excellent community support

**Latest Version:** 1.5.3 (verified via Maven Central)

**Maven:**
``xml
<dependency>
    <groupId>com.networknt</groupId>
    <artifactId>json-schema-validator</artifactId>
    <version>1.5.3</version>
</dependency>
``

**Spring Boot:** Not managed
**Java Compatibility:** Java 8+
**Context7 Used:** Yes (for feature comparison)
**Alternative:** everit-org/json-schema (if you only need Draft 4 support)
```

## Common Scenarios

### Scenario 1: Add Redis Support to Spring Boot Project

**User:** "Add Redis support to the project"

**Process:**

1. **Read pom.xml:**
   ```xml
   <parent>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-parent</artifactId>
       <version>3.5.7</version>
   </parent>
   ```
   → Spring Boot 3.5.7, Java 17+

2. **WebSearch:**
   ```
   "Redis client Spring Boot 2025 best practice"
   ```
   → Result: Lettuce is default and recommended

3. **Maven Central API:**
   ```bash
   curl "https://search.maven.org/solrsearch/select?q=g:org.springframework.boot+AND+a:spring-boot-starter-data-redis&rows=1&wt=json"
   ```
   → Version: 3.5.7

4. **Check Managed:**
   ```bash
   mvn dependency:tree | grep redis
   ```
   → Managed by Spring Boot ✅

**Output:**
```markdown
### Recommendation: Spring Boot Starter Data Redis (Lettuce)

**Why:**
- Lettuce is the default Redis client in Spring Boot
- Reactive and synchronous API support
- Excellent connection pooling and cluster support
- Actively maintained by Spring team

**Latest Version:** 3.5.7 (managed by Spring Boot 3.5.7)

**Maven:**
``xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
    <!-- Version managed by Spring Boot -->
</dependency>
``

**Spring Boot:** Managed ✅
**Java Compatibility:** Java 17+ (Spring Boot 3.x requirement)
**Context7 Used:** No
**Alternative:** Jedis (if synchronous-only client needed)
```

### Scenario 2: HTTP Client for Spring Boot 3.2+

**User:** "I need an HTTP client for REST API calls"

**Process:**

1. **Read pom.xml:**
   ```xml
   <spring-boot.version>3.5.7</spring-boot.version>
   ```
   → Spring Boot 3.5.7 (Spring Framework 6.x)

2. **WebSearch:**
   ```
   "HTTP client Spring Boot 2025 RestTemplate alternative"
   ```
   → Result: RestClient (Spring 6.1+), WebClient (reactive)

3. **Check Spring Boot Version:**
   - Spring Boot 3.2+ includes Spring 6.1+
   - RestClient available ✅

**Output:**
```markdown
### Recommendation: RestClient (Spring Framework 6.1+)

**Why:**
- Modern synchronous HTTP client (replacement for deprecated RestTemplate)
- Available since Spring 6.1 (Spring Boot 3.2+)
- Fluent API, better error handling
- Built-in by Spring Framework (no additional dependency)

**Latest Version:** Included in Spring Boot 3.5.7

**Maven:**
``xml
<!-- No dependency needed - included in spring-boot-starter-web -->
``

**Usage Example:**
``java
import org.springframework.web.client.RestClient;

@Component
public class MyService {
    private final RestClient restClient;

    public MyService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
            .baseUrl("https://api.example.com")
            .build();
    }
}
``

**Spring Boot:** Built-in ✅
**Java Compatibility:** Java 17+ (Spring Boot 3.x)
**Context7 Used:** No
**Alternative:** WebClient (if you need reactive/async support)
**Deprecated:** RestTemplate (use RestClient instead)
```

### Scenario 3: JSON Schema Validation

**User:** "We need JSON schema validation for incoming API requests"

**Process:**

1. **Read pom.xml:**
   ```xml
   <java.version>17</java.version>
   <spring-boot.version>3.5.7</spring-boot.version>
   ```

2. **WebSearch:**
   ```
   "JSON schema validation Java 2025 best library"
   ```
   → Result: networknt/json-schema-validator (most active), everit-org/json-schema

3. **Maven Central API:**
   ```bash
   curl "https://search.maven.org/solrsearch/select?q=g:com.networknt+AND+a:json-schema-validator&rows=1&wt=json"
   ```
   → Version: 1.5.3

4. **Check Managed:**
   → NOT managed by Spring Boot

5. **Context7 (optional for comparison):**
   - networknt: Draft 7, 2019-09, 2020-12, high performance
   - everit-org: Draft 4 only, lower activity

**Output:**
```markdown
### Recommendation: networknt/json-schema-validator

**Why:**
- Most actively maintained (latest commit: Jan 2025)
- Supports latest JSON Schema drafts (7, 2019-09, 2020-12)
- High performance with comprehensive error reporting
- 2.8k+ GitHub stars
- Excellent Spring Boot integration examples

**Latest Version:** 1.5.3 (verified via Maven Central)

**Maven:**
``xml
<dependency>
    <groupId>com.networknt</groupId>
    <artifactId>json-schema-validator</artifactId>
    <version>1.5.3</version>
</dependency>
``

**Spring Boot:** Not managed
**Java Compatibility:** Java 8+ (works with Java 17+)
**Compatibility Notes:** Works seamlessly with Jackson (Spring Boot default JSON library)
**Context7 Used:** No (WebSearch provided clear answer)
**Alternative:** everit-org/json-schema (if you only need Draft 4 support)
```

### Scenario 4: Update Outdated Dependency

**User:** "Update spring-boot-starter-web to latest version"

**Process:**

1. **Read pom.xml:**
   ```xml
   <parent>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-parent</artifactId>
       <version>3.4.0</version>
   </parent>
   ```
   → Currently on Spring Boot 3.4.0

2. **Maven Central API:**
   ```bash
   curl "https://search.maven.org/solrsearch/select?q=g:org.springframework.boot+AND+a:spring-boot-starter-parent&rows=1&wt=json"
   ```
   → Latest: 3.5.7

3. **WebSearch (for release notes):**
   ```
   "Spring Boot 3.5.7 release notes"
   ```
   → Check breaking changes, new features

**Output:**
```markdown
### Recommendation: Update Spring Boot to 3.5.7

**Why:**
- Latest stable version (as of Nov 2025)
- Security updates and bug fixes
- Performance improvements
- New features (check release notes)

**Current Version:** 3.4.0
**Latest Version:** 3.5.7 (verified via Maven Central)

**Maven (update parent):**
``xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.7</version>
</parent>
``

**Important:**
- Review release notes: https://spring.io/blog
- Check for breaking changes (3.4.x → 3.5.x)
- Test thoroughly after upgrade
- All Spring Boot managed dependencies will update automatically

**Spring Boot:** Parent version
**Java Compatibility:** Java 17+ (no change)
**Context7 Used:** No
```

### Scenario 5: Deprecated Library Replacement

**User:** "Using RestTemplate for HTTP calls"

**Process:**

1. **Detect deprecated usage:**
   - RestTemplate deprecated in Spring 6+
   - Spring Boot 3.x uses Spring 6+

2. **WebSearch:**
   ```
   "RestTemplate deprecated alternative Spring 2025"
   ```
   → Result: RestClient (synchronous), WebClient (reactive)

3. **Recommend modern alternative:**

**Output:**
```markdown
### Recommendation: Migrate from RestTemplate to RestClient

**Why:**
- RestTemplate is deprecated in Spring Framework 6+
- RestClient is the modern synchronous replacement
- Better fluent API, improved error handling
- Built-in with Spring Boot 3.2+ (no new dependency)

**Migration:**

**Old (RestTemplate):**
``java
@Autowired
private RestTemplate restTemplate;

String result = restTemplate.getForObject("https://api.example.com/data", String.class);
``

**New (RestClient):**
``java
@Autowired
private RestClient.Builder restClientBuilder;

private final RestClient restClient;

@PostConstruct
public void init() {
    this.restClient = restClientBuilder.baseUrl("https://api.example.com").build();
}

String result = restClient.get()
    .uri("/data")
    .retrieve()
    .body(String.class);
``

**Spring Boot:** Built-in (Spring Boot 3.2+) ✅
**Java Compatibility:** Java 17+
**Context7 Used:** No
**Alternative:** WebClient (if you need reactive/async support)
**Deprecated:** RestTemplate (migrate away from this)
```

## Decision Heuristics

### Priority Order

When choosing between multiple libraries, prioritize in this order:

1. **Spring Boot Starter Available** (highest priority)
   - Managed dependencies (no version conflicts)
   - Auto-configuration
   - Spring team maintenance
   - Example: spring-boot-starter-data-redis > lettuce-core directly

2. **Active Maintenance**
   - Last commit within 6 months
   - Regular releases
   - Active issue/PR handling
   - Security updates

3. **Community Support**
   - GitHub stars (indicator, not absolute)
   - StackOverflow questions/answers
   - Documentation quality
   - Corporate backing (Spring, Netflix, Google, etc.)

4. **Compatibility**
   - Java version compatibility
   - Spring Boot version compatibility
   - No known conflicts with existing stack

5. **Performance**
   - Benchmarks available
   - Production proven
   - Resource usage acceptable

### Red Flags

**Avoid libraries with these characteristics:**

- ❌ **No updates >1 year** (unless extremely stable and complete)
- ❌ **Deprecated or archived** (e.g., RestTemplate, Commons Lang 2.x)
- ❌ **Replaced by newer library** (e.g., moment.js → date-fns)
- ❌ **Known security vulnerabilities** (check CVEs)
- ❌ **Incompatible with current stack** (Java version, Spring Boot version)
- ❌ **Poor documentation** (hard to use, many open issues about confusion)
- ❌ **Abandoned by maintainer** (no response to issues/PRs)

### Spring Boot Specific Patterns

**Always prefer Spring Boot Starters:**
```
❌ io.lettuce:lettuce-core
✅ org.springframework.boot:spring-boot-starter-data-redis

❌ com.h2database:h2
✅ org.springframework.boot:spring-boot-starter-data-jpa + H2 (managed)

❌ org.hibernate.validator:hibernate-validator
✅ org.springframework.boot:spring-boot-starter-validation
```

**Check Spring Boot Dependency Management:**
```bash
mvn dependency:tree
```

If library appears without version in pom.xml → managed by Spring Boot ✅

## Spring Boot Managed Dependencies (Common)

Spring Boot manages versions for these popular libraries:

### Web & HTTP
- spring-boot-starter-web (includes Tomcat, Jackson, Spring MVC)
- spring-boot-starter-webflux (reactive web)
- jackson-databind, jackson-core (JSON)
- gson (alternative JSON)

### Data Access
- spring-boot-starter-data-jpa (Hibernate)
- spring-boot-starter-data-redis (Lettuce)
- spring-boot-starter-data-mongodb
- HikariCP (connection pooling)
- flyway-core (database migrations)
- liquibase-core (database migrations)

### Testing
- spring-boot-starter-test (JUnit 5, Mockito, AssertJ)
- junit-jupiter (JUnit 5)
- mockito-core
- assertj-core
- rest-assured

### Logging
- logback-classic (default)
- slf4j-api
- log4j2 (alternative)

### Validation
- spring-boot-starter-validation (Hibernate Validator)
- hibernate-validator

### Security
- spring-boot-starter-security
- spring-security-oauth2-client
- spring-security-oauth2-resource-server

### Messaging
- spring-boot-starter-amqp (RabbitMQ)
- spring-kafka (Kafka)

**Full list:** Check Spring Boot's dependency management POM:
```bash
mvn dependency:tree | grep "managed"
```

## Quick Reference: Common Libraries

### HTTP Clients
- **RestClient** ✅ (Spring 6.1+, synchronous, built-in)
- **WebClient** ✅ (reactive, built-in with spring-boot-starter-webflux)
- ❌ **RestTemplate** (deprecated in Spring 6+)

### JSON Processing
- **Jackson** ✅ (Spring Boot default, managed)
- **Gson** (alternative, managed by Spring Boot)
- ❌ **org.json** (too basic, unmaintained)

### JSON Schema Validation
- **networknt/json-schema-validator** ✅ (Draft 7+, active)
- **everit-org/json-schema** (Draft 4, less active)

### Redis Clients
- **Lettuce** ✅ (Spring Boot default via spring-boot-starter-data-redis)
- **Jedis** (alternative, synchronous-only)

### Database
- **Spring Data JPA** ✅ (via spring-boot-starter-data-jpa)
- **Hibernate** ✅ (included in JPA starter, managed)
- **HikariCP** ✅ (connection pool, Spring Boot default, managed)

### Database Migrations
- **Flyway** ✅ (managed by Spring Boot)
- **Liquibase** ✅ (managed by Spring Boot)

### Logging
- **SLF4J + Logback** ✅ (Spring Boot default, managed)
- ❌ **Log4j 1.x** (CRITICAL vulnerabilities, CVE-2021-44228)

### Testing
- **JUnit 5** ✅ (Spring Boot default, managed)
- **Mockito** ✅ (managed by Spring Boot)
- **AssertJ** ✅ (managed by Spring Boot)
- **REST Assured** ✅ (API testing, managed by Spring Boot)
- ❌ **JUnit 4** (deprecated, migrate to JUnit 5)

### Validation
- **Jakarta Bean Validation** ✅ (via spring-boot-starter-validation, managed)
- **Hibernate Validator** ✅ (implementation, managed)

### Date/Time
- **Java 8+ java.time API** ✅ (built-in, prefer this)
- **ThreeTen-Extra** (extensions to java.time)
- ❌ **Joda-Time** (deprecated, migrate to java.time)

### Utilities
- **Apache Commons Lang 3** ✅ (utilities, NOT managed - specify version)
- **Guava** (Google utilities, NOT managed - specify version)
- ❌ **Commons Lang 2.x** (deprecated, use Lang 3)

### Async/Concurrency
- **Java CompletableFuture** ✅ (built-in Java 8+)
- **Spring @Async** ✅ (built-in Spring)
- **Virtual Threads** ✅ (Java 21+, consider for high-concurrency)

## Version Compatibility Matrix

### Spring Boot 3.x
- **Java:** 17+ (required)
- **Jakarta EE:** 9+ (javax.* → jakarta.*)
- **Spring Framework:** 6.x
- **Hibernate:** 6.x
- **Tomcat:** 10.x

### Spring Boot 2.x (End of Life)
- **Java:** 8, 11, 17
- **Java EE:** 8 (javax.*)
- **Spring Framework:** 5.x
- **Hibernate:** 5.x
- **Tomcat:** 9.x

**Note:** Spring Boot 2.x reached End of Life. Migrate to 3.x for security updates.

## Common Pitfalls

### Pitfall 1: Mixing Java EE and Jakarta EE

**Problem:**
```xml
<!-- Spring Boot 3.x uses Jakarta EE -->
<dependency>
    <groupId>javax.validation</groupId>  <!-- Wrong namespace! -->
    <artifactId>validation-api</artifactId>
</dependency>
```

**Solution:**
```xml
<!-- Use Jakarta namespace for Spring Boot 3.x -->
<dependency>
    <groupId>jakarta.validation</groupId>
    <artifactId>jakarta.validation-api</artifactId>
    <!-- Version managed by Spring Boot -->
</dependency>
```

### Pitfall 2: Overriding Managed Version

**Problem:**
```xml
<!-- Don't override Spring Boot managed versions -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.14.0</version>  <!-- May cause conflicts! -->
</dependency>
```

**Solution:**
```xml
<!-- Let Spring Boot manage the version -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <!-- No version tag - managed by Spring Boot -->
</dependency>
```

### Pitfall 3: Using Deprecated Libraries

**Problem:**
```java
// RestTemplate is deprecated in Spring 6+
@Autowired
private RestTemplate restTemplate;
```

**Solution:**
```java
// Use RestClient (Spring 6.1+)
@Autowired
private RestClient.Builder restClientBuilder;
```

### Pitfall 4: Ignoring Java Version Requirements

**Problem:**
```xml
<java.version>11</java.version>
<!-- Trying to use Spring Boot 3.x -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.7</version>  <!-- Requires Java 17+! -->
</parent>
```

**Solution:**
```xml
<java.version>17</java.version>  <!-- Spring Boot 3.x requires Java 17+ -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.7</version>
</parent>
```

## Additional Resources

### Official Documentation
- Maven Central: https://central.sonatype.com/
- Spring Boot: https://spring.io/projects/spring-boot
- Spring Boot Dependency Versions: https://docs.spring.io/spring-boot/appendix/dependency-versions.html

### Version Checking Tools
- Maven Versions Plugin: `mvn versions:display-dependency-updates`
- Gradle Versions Plugin: `./gradlew dependencyUpdates`

### Security
- CVE Database: https://cve.mitre.org/
- Snyk Vulnerability Database: https://snyk.io/vuln/
- OWASP Dependency-Check: https://owasp.org/www-project-dependency-check/
