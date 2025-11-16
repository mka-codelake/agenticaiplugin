# AgenticAI Plugin

Claude Code Plugin mit AI-gestützten Entwicklungs-Skills und Commands für verbesserte Workflows.

## Struktur

```
agenticaiplugin/
├── .claude-plugin/
│   └── plugin.json            # Plugin-Metadaten
├── agents/
│   └── code-reviewer.md       # Code-Review Sub-Agent
├── commands/
│   └── cc-code-review.md      # Manuelles Code-Review Command
├── skills/
│   ├── agile-workflow/        # Epic/Story/Sprint Management
│   │   ├── SKILL.md
│   │   ├── templates/
│   │   │   ├── epic.md.j2
│   │   │   ├── story.md.j2
│   │   │   └── sprint.md.j2
│   │   └── reference.md
│   └── git-smart-commit/      # Intelligente Git-Commit-Erstellung
│       └── SKILL.md
├── CLAUDE.md                  # Plugin-Entwicklungsrichtlinien
├── FRAMEWORK_REDESIGN_SESSION.md  # Session-Dokumentation
└── README.md
```

## Installation

### 1. Lokalen Marketplace hinzufügen

```bash
# Verwende den Pfad, wo du den Marketplace geklont/extrahiert hast
/plugin marketplace add /path/to/your/marketplace

# Beispiele:
# Windows: /plugin marketplace add C:\dev\marketplace
# WSL:     /plugin marketplace add /mnt/c/dev/marketplace
# Linux:   /plugin marketplace add ~/dev/marketplace
```

### 2. Plugin installieren

```bash
/plugin install agenticaiplugin@local-dev-marketplace
```

### 3. Marketplace aktualisieren (nach Plugin-Änderungen)

```bash
/plugin marketplace update local-dev-marketplace
```

## Enthaltene Skills

### agile-workflow

Vollständiges Agile Workflow Management mit Epic/Story/Sprint Funktionalität.

**Verwendung:**
- "Erstelle ein Epic für [Feature]" - Erstellt strukturiertes Epic in `claudedocs/epics/`
- "Schneide das Epic in Stories" - Erstellt User Stories mit Acceptance Criteria
- "Plan einen Sprint" - Plant Sprint mit Capacity und Dependencies

**Features:**
- Epic-Erstellung mit Goal, Scope, Out-of-Scope
- Story-Slicing mit INVEST Criteria
- Acceptance Criteria Templates
- Story Points (Fibonacci: 1, 2, 3, 5, 8, 13)
- Sprint Planning mit Capacity Management
- Dependency Tracking
- Jinja2 Templates für Konsistenz
- Ordnerstruktur: `claudedocs/epics/`, `stories/`, `sprints/`
- File Naming: `EPIC-001-description.md` (lowercase-with-dashes)

**Workflow:**
1. High-Level Beschreibung → Epic
2. Epic → Stories (mit Acceptance Criteria)
3. Stories → Sprint (mit Capacity)
4. Iterative Entwicklung, flexibel neue Stories hinzufügen

### git-smart-commit

Analysiert automatisch alle uncommitted Änderungen, gruppiert sie logisch und erstellt aussagekräftige Commit-Messages nach Projekt-Konventionen.

**Verwendung:**
- Claude erkennt automatisch, wenn du Änderungen committen möchtest
- Sag einfach "Erstelle Commits für meine Änderungen" oder ähnlich
- Das Skill analysiert die Git-Historie und passt sich an deine Konventionen an

**Features:**
- Erkennt Projekt-spezifische Commit-Konventionen
- Gruppiert Änderungen logisch
- Erstellt atomic commits
- Unterstützt Conventional Commits (feat, fix, docs, etc.)
- Adaptiert sich an bestehende Commit-Message-Patterns

## Code-Review Agent

Automatischer Code-Review Sub-Agent, der Code-Qualität nach projektspezifischen Guidelines und Best-Practice-Skills überprüft.

### Setup

**Empfohlen: Automatisches Setup mit init-Command**

```bash
/agenticaiplugin:init
```

Dieser Command:
- Erstellt automatisch CLAUDE.md in deinem Projekt
- Legt empfohlene Verzeichnisse an (claudedocs/guidelines, etc.)
- Führt dich durch den Setup-Prozess

**Alternative: Manuelles Setup**

**1. Verzeichnisse anlegen**

```bash
# Von deinem Projekt-Root aus:
mkdir -p claudedocs/guidelines
```

Lege beliebige `.md` Dateien in diesem Ordner an mit deinen projektspezifischen Code-Regeln:
- `exception-handling.md` - Eigene Exception-Handling-Regeln
- `logging-standards.md` - Projekt-Logging-Vorgaben
- `code-style.md` - Code-Style über Sprach-Standards hinaus
- `architecture-patterns.md` - Architektur-Regeln und Patterns
- Weitere nach Bedarf

### Verwendung

**Automatisch (empfohlen):**

Wenn `CLAUDE.md` korrekt konfiguriert ist, führt Claude nach jeder vollständigen Task-Implementierung automatisch einen Code-Review durch:

```
User: "Implementiere Story-42: User Authentication"
→ Claude implementiert Code
→ Tests laufen grün
→ Claude triggert automatisch code-reviewer Agent
→ Findings werden analysiert und kritische Issues gefixt
→ Claude meldet: "Task fertig, Code-Review abgeschlossen"
```

**Manuell:**

Für gezieltes Review einzelner Dateien:

```bash
cc-code-review src/main/java/UserService.java
```

Der `cc-code-review` Command erwartet **genau einen Datei-Parameter**. Ohne Parameter wird eine Usage-Meldung angezeigt.

### Funktionsweise

Der code-reviewer Agent kombiniert mehrere Regel-Quellen:

1. **Projekt-Guidelines** (`claudedocs/guidelines/*.md`)
   - Projektspezifische Regeln
   - **Höchste Priorität** bei Konflikten

2. **Development Skills**
   - `development-principles` - Sprach-agnostische Prinzipien
   - `java-best-practices` - Java-spezifische Best Practices
   - `spring-boot-best-practices` - Spring Boot Patterns
   - `testing-philosophy` - Test-Richtlinien
   - Weitere relevante Skills

3. **Prioritätsregel**
   - Bei Konflikten: **Projekt-Guidelines überschreiben IMMER Skill-Guidelines**
   - Beispiel: Skill sagt "max 20 Zeilen", Projekt sagt "max 30 für Controller" → 30 gilt

### Review-Report Format

Der Agent liefert strukturierte Findings:

```markdown
## Code Review Report

**Files Reviewed:** 3
**Guidelines Applied:** 2 project + 4 skills

### Critical Issues
- [UserService.java:42] Missing ErrorCode in exception
  **Rule:** exception-handling.md:15
  **Fix:** Add ErrorCode as first parameter

### Warnings
- [UserController.java:23] Log level should be DEBUG
  **Rule:** logging-standards.md:8

### Suggestions
- [UserService.java:12] Consider using Optional
  **Reference:** java-best-practices

### Summary
- Critical: 1 (must fix)
- Warnings: 1 (should address)
- Suggestions: 1 (optional)
```

### Wichtige Hinweise

- **Nur Mechanismus:** Dieses Plugin liefert den Code-Review-Mechanismus, nicht die Inhalte
- **Projekt-Verantwortung:** Jedes Projekt definiert eigene Guidelines in `claudedocs/guidelines/`
- **Format frei:** Guidelines sind normale Markdown-Dateien, Format nach Bedarf
- **Skill-Integration:** Der Agent nutzt automatisch alle relevanten Development-Skills
- **Main Agent entscheidet:** Claude hat finale Entscheidungshoheit über Findings

### Beispiel: Projekt-Guideline

Beispiel für `claudedocs/guidelines/exception-handling.md` in deinem Projekt:

```markdown
# Exception Handling Guidelines

## Rule: ErrorCode erforderlich

Alle Custom Exceptions MÜSSEN einen ErrorCode als ersten Parameter haben.

✅ Correct:
throw new UserNotFoundException(ErrorCode.USER_404, userId);

❌ Wrong:
throw new UserNotFoundException("User not found");
```

Der code-reviewer Agent liest diese Datei automatisch und prüft Code dagegen.

---

## Test-Engineer Agent

Automatischer Test-Engineer Sub-Agent für Integration-, System- und E2E-Tests mit **separatem Kontextfenster** vom Developer-Agent.

### Konzept: Separate Kontexte für Tests und Implementation

**Problem:** Wenn derselbe Agent Tests UND Implementation schreibt, fließt das Implementation-Verständnis in die Tests ein.

**Lösung:** Der test-engineer Agent hat einen **separaten Kontext** und schreibt Tests basierend auf **User-Requirements**, nicht auf Implementation-Details.

```
┌─────────────────────┐
│  User Requirements  │
│  (Story, AC, Specs) │
└──────────┬──────────┘
           │
           ├──────────────────────┐
           ▼                      ▼
   ┌───────────────┐      ┌────────────────┐
   │ test-engineer │      │ developer-agent│
   │ (Context A)   │      │ (Context B)    │
   └───────┬───────┘      └────────┬───────┘
           │                       │
           ▼                       ▼
   Integration Tests        Implementation
   (User's View)           (Developer's View)
```

**Vorteil:** Tests validieren Requirements unabhängig von Implementation-Details.

---

### Setup

**Empfohlen: Automatisches Setup mit init-Command**

```bash
/agenticaiplugin:init
```

Dieser Command:
- Erstellt automatisch CLAUDE.md in deinem Projekt (mit CRITICAL Rules)
- Legt empfohlene Verzeichnisse an (claudedocs/testspecs, etc.)
- Führt dich durch den Setup-Prozess

Die CLAUDE.md enthält CRITICAL Rules:
- Developer-Agent darf Integration/System/E2E-Tests **NICHT** ändern
- Nur test-engineer Agent darf diese Tests schreiben/modifizieren

**Alternative: Manuelle Verzeichnisse anlegen**

```bash
# Von deinem Projekt-Root aus:
mkdir -p claudedocs/testspecs
```

Lege beliebige `.md` Dateien mit Test-Szenarien an (freies Namensschema):
- `kafka-message-scenarios.md` - Kafka Message Tests
- `api-test-cases.md` - REST API Testfälle
- `user-registration-flows.md` - User Journey Tests
- Weitere nach Bedarf

**Beispiel Test-Spezifikation (`claudedocs/testspecs/kafka-scenarios.md`):**

```markdown
# Kafka Message Processing Test Scenarios

## Scenario 1: CREATE Message

**Input:**
- Topic: user-events
- Message: {"userId": 123, "action": "CREATE", "username": "john"}

**Expected:**
- User with ID 123 exists in database
- User status is ACTIVE
- User username is "john"

## Scenario 2: UPDATE Message

**Input:**
- Topic: user-events
- Message: {"userId": 123, "action": "UPDATE", "username": "john_updated"}

**Expected:**
- User with ID 123 updated in database
- User username is "john_updated"
```

---

### Verwendung

#### Automatisch (Empfohlen)

Claude erkennt automatisch, wenn du Integration-/System-/E2E-Tests möchtest:

```
User: "Schreib Systemtest für STORY-042"
User: "Erstelle Integrationstest für die Kafka-Verarbeitung"
User: "Wir brauchen einen E2E-Test für User Registration"

→ Main-Agent erkennt Test-Anfrage
→ Ruft test-engineer Agent auf (separater Kontext)
→ Test-Engineer liest Requirements und schreibt Tests
→ Tests landen in src/test/java/integration/
```

#### Manuell

Für gezielte Test-Erstellung:

```bash
/cc-test STORY-042
/cc-test EPIC-005
/cc-test kafka
```

---

### Workflow: Test-First Development (TDD)

**Empfohlener Ablauf:**

1. **User + Test-Engineer:** Integration-Tests definieren
   ```
   User: "Schreib Systemtest für STORY-042: User Registration"
   → test-engineer schreibt Tests in integration/
   → Tests schlagen fehl (RED)
   ```

2. **Developer-Agent:** Implementation
   ```
   User: "Implementiere STORY-042"
   → developer-agent liest Integration-Tests
   → implementiert Features
   → Tests werden grün (GREEN)
   ```

3. **Developer-Agent:** Unit-Tests & Refactoring
   ```
   → developer-agent schreibt Unit-Tests
   → refactored Code
   → Integration-Tests bleiben grün
   ```

**CRITICAL:** Developer-Agent darf Integration-Tests NICHT ändern!

---

### Test-Verantwortlichkeiten

| Test-Typ | Location | Agent | Beschreibung |
|----------|----------|-------|--------------|
| **Integration Tests** | `src/test/java/integration/` | test-engineer | Mehrere Komponenten zusammen (Epic-Level) |
| **System Tests** | `src/test/java/integration/system/` | test-engineer | Gesamter Application Flow (Story-Level) |
| **E2E Tests** | `src/test/java/integration/e2e/` | test-engineer | Komplette User Journey |
| **Unit Tests** | `src/test/java/unit/` | developer-agent | Einzelne Klassen/Methoden |

**Schutz-Mechanismus:**

In `CLAUDE.md` ist festgelegt:
```
⛔ Developer-Agent darf NICHT:
- Integration/System/E2E-Tests modifizieren
- Integration/System/E2E-Tests löschen
- Failing Tests durch Änderung der Tests "fixen"

✅ Developer-Agent darf:
- Integration-Tests LESEN (um Requirements zu verstehen)
- Integration-Tests AUSFÜHREN (um Implementation zu validieren)
- Implementation anpassen bis Tests grün sind
```

---

### Funktionsweise

Der test-engineer Agent kombiniert mehrere Quellen:

1. **Test-Spezifikationen** (`claudedocs/testspecs/*.md`)
   - User-definierte Test-Szenarien
   - **Höchste Priorität**

2. **Story/Epic Acceptance Criteria** (`claudedocs/stories/`, `epics/`)
   - Acceptance Criteria aus Stories
   - User Story Statements

3. **Projekt-Guidelines** (`claudedocs/guidelines/*.md`)
   - Test-spezifische Guidelines
   - z.B. `testing-standards.md`, `kafka-testing.md`

4. **Testing Skills**
   - `integration-testing` - TestContainers, @SpringBootTest, Awaitility
   - `testing-philosophy` - Allgemeine Test-Prinzipien
   - `spring-boot-best-practices` - Spring Boot Patterns (Unit Testing Section)
   - `java-best-practices` - Java Syntax

---

### Technologie-Stack

**Integration-Tests verwenden:**
- **TestContainers** - Reale Infrastruktur (Kafka, PostgreSQL, Redis)
- **@SpringBootTest** - Full Application Context
- **Awaitility** - Async Testing (statt Thread.sleep)
- **AssertJ** - Fluent Assertions (KEIN JUnit assertEquals!)

**Beispiel:**

```java
@SpringBootTest
@Testcontainers
class KafkaIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(/*...*/);

    @Test
    void shouldCreateUserWhenReceivingKafkaCreateMessage() {
        // EPIC-005: Kafka Message Processing
        // AC-1: CREATE message creates user with ACTIVE status
        // TestSpec: claudedocs/testspecs/kafka-scenarios.md

        // Given
        UserEvent event = new UserEvent(123L, "CREATE", "john");

        // When
        kafkaTemplate.send("user-events", event);

        // Then
        await().atMost(5, SECONDS).untilAsserted(() -> {
            Optional<User> user = userRepository.findById(123L);
            assertThat(user).isPresent();
            assertThat(user.get().getStatus()).isEqualTo(UserStatus.ACTIVE);
        });
        // AC-1 ✓
    }
}
```

**Wichtige Elemente:**
1. Traceability: `// EPIC-XXX`, `// AC-N`, `// TestSpec:`
2. Given-When-Then Struktur
3. AssertJ Assertions
4. AC Verification Marker: `// AC-N ✓`

---

### Test-Report Format

Nach Test-Erstellung liefert der test-engineer Agent:

```markdown
## Integration Tests Created

**Story:** STORY-042: User Registration
**Test Spec:** claudedocs/testspecs/user-registration-tests.md

### Tests Written

1. **UserRegistrationSystemTest.java** (src/test/java/integration/api/)
   - shouldRegisterUserWithActiveStatus() → AC-1 ✓
   - shouldSendWelcomeEmailOnRegistration() → AC-2 ✓
   - shouldReturn400WhenEmailInvalid() → AC-3 ✓

2. **UserKafkaIntegrationTest.java** (src/test/java/integration/messaging/)
   - shouldPublishUserCreatedEvent() → AC-4 ✓

### Test Coverage
- Acceptance Criteria: 4/4 covered ✓
- Test Specifications: All scenarios implemented ✓
- TestContainers: PostgreSQL, Kafka
- Async Testing: Awaitility for Kafka assertions

### Next Steps
Run tests: `./mvnw -q test -Dtest=UserRegistrationSystemTest`
Developer agent can now implement features to make tests pass (TDD).
```

---

### Wichtige Hinweise

- **Separate Kontexte:** test-engineer und developer-agent haben getrennte Kontexte
- **User-Requirements:** Tests basieren auf User-Verständnis, nicht auf Implementation
- **Immutable Tests:** Tests sind Requirements - Developer darf sie nicht ändern!
- **Test-First:** Tests werden VOR Implementation geschrieben (TDD)
- **TestContainers:** Echte Infrastruktur, keine Mocks
- **Projekt-Spezifikationen:** `claudedocs/testspecs/` hat höchste Priorität

---

## Entwicklung

### Plugin-Updates testen

1. Ändere Dateien in diesem Repo
2. In deinem Test-Projekt:
   ```bash
   /plugin marketplace update local-dev-marketplace
   ```
3. Das Plugin verwendet jetzt die aktuellen Änderungen

### Neue Skills hinzufügen

1. Erstelle Verzeichnis: `skills/skill-name/`
2. Füge `SKILL.md` hinzu mit Frontmatter:
   ```yaml
   ---
   name: skill-name
   description: Was es macht und wann es verwendet wird
   allowed-tools: [Bash, Read, Grep]
   ---

   # Skill-Instruktionen hier
   ```
3. Marketplace updaten

## License

MIT
