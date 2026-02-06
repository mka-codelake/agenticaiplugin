---
description: Maven build tool best practices. Standard directory layout, dependency management, build commands. Use PROACTIVELY when running Maven commands (mvn, ./mvnw), modifying pom.xml, or troubleshooting build issues. ALWAYS use -q flag for builds unless debugging.
user-invocable: false
---

Use this skill when working with Maven build tool (pom.xml projects).

**Note:**
- For Java language best practices, see the `java-best-practices` skill
- **For Spring Boot dependency management**, see the `spring-boot-best-practices` skill
- For dependency selection and version lookup, use the `technology-advisor-jvm` skill

## Maven Standard Directory Layout

**Maven enforces a standard directory structure (MANDATORY):**

```
project-root/
├── pom.xml                    # Maven configuration
├── mvnw                       # Maven wrapper (Unix)
├── mvnw.cmd                   # Maven wrapper (Windows)
├── .mvn/                      # Maven wrapper config
└── src/
    ├── main/
    │   ├── java/              # Java source code
    │   │   └── com/example/   # Package structure
    │   └── resources/         # Config files, properties
    └── test/
        ├── java/              # Test source code
        │   └── com/example/   # Test package structure
        └── resources/         # Test config files
```

**Do NOT deviate from this structure!** Maven plugins expect this layout.

**Example:**
```
src/main/java/com/example/myapp/
├── Main.java
├── model/
│   └── User.java
├── service/
│   └── UserService.java
└── util/
    └── StringUtils.java

src/main/resources/
├── config.properties
└── logback.xml

src/test/java/com/example/myapp/
├── MainTest.java
└── service/
    └── UserServiceTest.java

src/test/resources/
└── test-config.properties
```

---

## pom.xml Structure

**Well-structured pom.xml (Plain Java Project):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- Project coordinates -->
    <groupId>com.example</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <name>My Application</name>
    <description>Plain Java application</description>

    <!-- Properties -->
    <properties>
        <java.version>21</java.version>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>

        <!-- Dependency versions -->
        <junit.version>5.10.0</junit.version>
        <slf4j.version>2.0.9</slf4j.version>
    </properties>

    <!-- Dependencies -->
    <dependencies>
        <!-- Logging -->
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>${slf4j.version}</version>
        </dependency>

        <!-- Test dependencies -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>${junit.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <!-- Build configuration -->
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>${maven.compiler.source}</source>
                    <target>${maven.compiler.target}</target>
                </configuration>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.1.2</version>
            </plugin>
        </plugins>
    </build>
</project>
```

---

## Dependency Management

### Option 1: Properties for Versions

**Use properties for version management:**

```xml
<properties>
    <jackson.version>2.15.2</jackson.version>
    <commons-lang3.version>3.13.0</commons-lang3.version>
</properties>

<dependencies>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>${jackson.version}</version>
    </dependency>

    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-lang3</artifactId>
        <version>${commons-lang3.version}</version>
    </dependency>
</dependencies>
```

**Why:** Centralized version management, easy to update.

---

### Option 2: Dependency Management Section

**For multi-module projects or consistent versioning:**

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.15.2</version>
        </dependency>
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-lang3</artifactId>
            <version>3.13.0</version>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <!-- Version inherited from dependencyManagement -->
    </dependency>
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-lang3</artifactId>
        <!-- Version inherited from dependencyManagement -->
    </dependency>
</dependencies>
```

**Why:**
- Child modules inherit versions from parent
- Consistent versions across multi-module projects
- Override when necessary

---

### Dependency Scopes

**Maven dependency scopes:**

```xml
<!-- compile (default): Available everywhere -->
<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-api</artifactId>
    <version>2.0.9</version>
    <!-- scope: compile is default, can be omitted -->
</dependency>

<!-- test: Only in test classpath -->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.10.0</version>
    <scope>test</scope>
</dependency>

<!-- runtime: Not needed for compilation, only runtime -->
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-classic</artifactId>
    <version>1.4.11</version>
    <scope>runtime</scope>
</dependency>

<!-- provided: Provided by container (e.g., servlet-api) -->
<dependency>
    <groupId>jakarta.servlet</groupId>
    <artifactId>jakarta.servlet-api</artifactId>
    <version>6.0.0</version>
    <scope>provided</scope>
</dependency>
```

---

## Maven Build Commands

**Using Maven Wrapper (Recommended):**

```bash
# Build project (compile + test + package)
./mvnw -q clean install

# Run tests only
./mvnw -q test

# Package without running tests (use sparingly!)
./mvnw -q clean package -DskipTests

# Compile only (no tests, no package)
./mvnw -q clean compile

# Verify (run integration tests)
./mvnw -q verify

# Clean build artifacts
./mvnw -q clean

# Install to local Maven repository
./mvnw -q install
```

**Why Maven Wrapper (`mvnw`):**
- Ensures correct Maven version for project
- No need to install Maven globally
- Consistent builds across environments
- Distributed with project (mvnw, mvnw.cmd, .mvn/)

**Important: Use `-q` (quiet) Flag**

**Always use `-q` (quiet mode) for Maven commands** to minimize output noise and reduce token usage:

```bash
# GOOD: Quiet mode - only errors and warnings are shown
./mvnw -q test

# BAD: Verbose output - generates unnecessary logs
./mvnw test
```

**Why `-q` is important:**
- **Reduces token consumption** - Less Maven logging in context
- **Errors are still displayed** - Maven prints errors and warnings even in quiet mode
- **Cleaner output** - Focus on what matters (test results, errors)
- **Faster processing** - Less text to parse and analyze

**Exception:** Do NOT use `-q` when you need to see the full output:
```bash
# Application output needs to be visible
./mvnw spring-boot:run

# Debugging build issues (verbose output helpful)
./mvnw -X test  # -X = debug mode
```

**Default rule:** If you're running a build/test/verify command, use `-q` unless you have a specific reason to see verbose output.

---

## Common Maven Phases (Lifecycle)

**Maven Build Lifecycle:**

1. **`validate`** - Validate project structure
2. **`compile`** - Compile source code (`src/main/java` → `target/classes`)
3. **`test`** - Run unit tests (`src/test/java`)
4. **`package`** - Package into JAR/WAR (`target/my-app-1.0.0.jar`)
5. **`verify`** - Run integration tests
6. **`install`** - Install to local Maven repository (`~/.m2/repository`)
7. **`deploy`** - Deploy to remote repository (e.g., Nexus, Artifactory)

**Clean Lifecycle:**
- **`clean`** - Delete `target/` directory

**Running a phase executes all previous phases automatically.**

Example:
```bash
./mvnw -q package
# Automatically runs: validate → compile → test → package
```

---

## Maven Multi-Module Projects

**For large projects, use multi-module structure:**

```
parent-project/
├── pom.xml              # Parent POM
├── module-core/
│   ├── pom.xml
│   └── src/
├── module-api/
│   ├── pom.xml
│   └── src/
└── module-cli/
    ├── pom.xml
    └── src/
```

**Parent pom.xml:**
```xml
<groupId>com.example</groupId>
<artifactId>parent-project</artifactId>
<version>1.0.0-SNAPSHOT</version>
<packaging>pom</packaging>  <!-- POM packaging for parent -->

<modules>
    <module>module-core</module>
    <module>module-api</module>
    <module>module-cli</module>
</modules>

<!-- Shared dependency management -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.0</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

**Child Module pom.xml:**
```xml
<parent>
    <groupId>com.example</groupId>
    <artifactId>parent-project</artifactId>
    <version>1.0.0-SNAPSHOT</version>
</parent>

<artifactId>module-core</artifactId>
<!-- Inherits groupId and version from parent -->

<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
        <!-- Version inherited from parent's dependencyManagement -->
    </dependency>
</dependencies>
```

**Build all modules:**
```bash
./mvnw -q clean install
# Builds parent + all modules in order
```

---

## Common Maven Anti-Patterns

### ❌ Not Using Maven Wrapper

```bash
# BAD: Assumes user has Maven installed
mvn -q clean install
```

**Why bad:**
- Different Maven versions on different machines
- Build inconsistency
- Onboarding friction

**Fix:** Always use Maven Wrapper:
```bash
./mvnw -q clean install
```

---

### ❌ Mixing Dependency Scopes Incorrectly

```xml
<!-- BAD: Test dependency without test scope -->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.10.0</version>
    <!-- Missing <scope>test</scope> - will be included in production JAR! -->
</dependency>
```

**Fix:** Always use correct scope:
```xml
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.10.0</version>
    <scope>test</scope>
</dependency>
```

---

### ❌ Hardcoding Versions Throughout pom.xml

```xml
<!-- BAD: Same version repeated -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.15.2</version>
</dependency>
<dependency>
    <groupId>com.fasterxml.jackson.dataformat</groupId>
    <artifactId>jackson-dataformat-xml</artifactId>
    <version>2.15.2</version>  <!-- Duplicate version -->
</dependency>
```

**Fix:** Use properties:
```xml
<properties>
    <jackson.version>2.15.2</jackson.version>
</properties>

<dependencies>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>${jackson.version}</version>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.dataformat</groupId>
        <artifactId>jackson-dataformat-xml</artifactId>
        <version>${jackson.version}</version>
    </dependency>
</dependencies>
```

---

### ❌ Skipping Tests in CI/CD

```bash
# BAD: Skipping tests in CI/CD pipeline
./mvnw -q clean install -DskipTests
```

**Why bad:** Tests are safety net - skipping defeats the purpose of CI/CD.

**When to skip tests:** Only during local development for speed (explicitly documented).

---

## Spring Boot Projects

**For Spring Boot projects:** Maven integrates seamlessly with Spring Boot.

**See `spring-boot-best-practices` skill for:**
- Spring Boot Starter Parent
- Spring Boot Managed Dependencies
- Omitting `<version>` for managed dependencies
- Spring Boot Maven Plugin

---

## Integration with Other Skills

**technology-advisor-jvm:**
- Use for dependency selection and version lookup
- It researches latest versions via Maven Central API
- It checks for compatible versions

**java-best-practices:**
- Maven directory layout maps to Java package structure
- `src/main/java/com/example/` = `package com.example;`

**spring-boot-best-practices:**
- Maven integrates with Spring Boot via starter parent
- Build plugins managed by Spring Boot parent
- **See that skill for Spring Boot specific Maven configuration**

---

## Progressive Disclosure

For detailed guidelines on:
- Maven profiles for different environments
- Dependency conflict resolution (`mvn dependency:tree`)
- Maven repository management (Nexus, Artifactory)
- Custom Maven plugins
- Advanced multi-module patterns

See `reference.md` (load only when user explicitly needs details).

---

**This skill activates automatically when user mentions: maven, pom.xml, mvn, ./mvnw.**

**Note:** This skill covers **Maven build tool only** (framework-agnostic). For Spring Boot specific Maven configuration, see `spring-boot-best-practices`. For Java language, see `java-best-practices`.
