# AgenticAI Plugin - Kontext für neue AI-Sessions

> **Zweck dieser Datei:** Lies nur diese Datei, um sofort produktiv mit dem Projekt arbeiten zu können.

## Was ist dieses Projekt?

Ein **Claude Code Plugin** das Entwickler-Workflows durch Agents, Skills und Commands verbessert. Fokus auf Java/Spring Boot, aber sprachunabhängig anwendbar.

**Version:** 0.1.0 | **Autor:** Michael Kagel

---

## Projektstruktur

```
agenticaiplugin/
├── .claude-plugin/plugin.json    # Plugin-Metadaten
├── agents/                       # 4 Sub-Agents (isolierter Kontext)
│   ├── code-reviewer.md          # Automatische Code-Reviews
│   ├── test-engineer.md          # Integration/E2E-Tests schreiben
│   ├── project-initializer.md    # Projekt-Setup
│   └── context-creator.md        # agentic.md Erstellung/Update
├── commands/                     # 6 Slash-Commands
│   ├── init.md                   # /init - Projekt initialisieren
│   ├── gitme.md                  # /gitme - Smart Git Commits
│   ├── code-review.md            # /cc-code-review - Manuelles Review
│   ├── test.md                   # /cc-test - Tests erstellen
│   ├── create-agentic.md         # /create-agentic - Kontext erstellen
│   └── load-agentic.md           # /load-agentic - Kontext laden
├── skills/                       # 14 Auto-aktivierte Wissensbasen
│   ├── agile-workflow/           # Epic/Story/Sprint-Management
│   ├── git-smart-commit/         # Intelligente Commits
│   ├── code-reviewer/            # Review-Kriterien
│   ├── development-principles/   # YAGNI, KISS, Story-Traceability
│   ├── testing-philosophy/       # "Test YOUR Code, Not THE Code"
│   ├── java-best-practices/      # Java 17+/21+/25+
│   ├── spring-boot-best-practices/
│   ├── integration-testing/      # TestContainers, Awaitility
│   ├── maven-best-practices/
│   ├── dependency-analysis/      # Story-Dependencies mit ULTRATHINK
│   ├── architecture-decisions/   # ADR-Management
│   ├── technology-advisor-jvm/   # Bibliotheksempfehlungen JVM
│   ├── technology-advisor-javascript/
│   └── technology-advisor-python/
├── docs/plugin-howto.md          # WICHTIG: Interne Entwickler-Referenz
├── CLAUDE.md                     # Plugin-Entwicklungsanweisungen
└── README.md                     # Installations- und Feature-Guide
```

---

## Kernkonzepte

### Auto-Discovery
Claude Code findet automatisch:
- `agents/*.md` → Agents
- `skills/*/SKILL.md` → Skills
- `commands/*.md` → Commands

**Keine manuelle Registrierung in plugin.json nötig.**

### Progressive Disclosure
- **SKILL.md**: Kompakt, nur essenzielle Regeln
- **reference.md**: Details, Beispiele, Edge Cases (bei Bedarf geladen)

### Projektrichtlinien haben Vorrang
`claudedocs/guidelines/*.md` im User-Projekt überschreiben IMMER Skill-Guidelines.

---

## Agents im Detail

| Agent | Zweck | Tools | Model |
|-------|-------|-------|-------|
| **code-reviewer** | Multi-Type Code-Reviews (Code/Test/Architektur) | Read, Glob, Grep, Bash | Sonnet |
| **test-engineer** | Integration/System/E2E-Tests schreiben | Read, Write, Edit, Glob, Grep, Bash | Sonnet |
| **project-initializer** | Interaktives Projekt-Setup | Read, Write, Edit, Bash, Glob, AskUserQuestion | Sonnet |
| **context-creator** | Erstellt/aktualisiert agentic.md Projekt-Kontext | Read, Write, Edit, Glob, Grep, Bash | Sonnet |

### Test-Engineer: Isolierter Kontext
Der Test-Engineer arbeitet **bewusst ohne Implementierungsdetails** - er testet User-Requirements, nicht die Implementierung.

### Context-Creator: AI Session Management
Der Context-Creator erstellt/aktualisiert `agentic.md` - eine token-optimierte Projekt-Übersicht, die neuen AI-Sessions ermöglicht, sofort produktiv zu arbeiten. Verwendet Progressive Disclosure und scanbare Formate (Tabellen statt Prosa).

---

## Skills - Wann werden sie aktiviert?

| Skill | Auto-Aktivierung bei Keywords |
|-------|-------------------------------|
| agile-workflow | epic, story, sprint, backlog, planning |
| git-smart-commit | commit, git commit, stage and commit |
| development-principles | Code schreiben (alle Sprachen) |
| testing-philosophy | Tests, Testabdeckung |
| java-best-practices | Java-Code |
| spring-boot-best-practices | Spring Boot, @RestController, @Service |
| integration-testing | TestContainers, @SpringBootTest |
| technology-advisor-* | Dependencies hinzufügen |

---

## Wichtige Konventionen

### Dateinamen
```
EPIC-001-description.md     # Epics
STORY-001-description.md    # Stories
SPRINT-01.md                # Sprints
ADR-001-description.md      # Architecture Decision Records
```

### Story-Traceability in Code
```java
// STORY-012 AC: Email-Validierung nach RFC 5322
if (!validateEmail(email)) {
    throw new InvalidEmailException();
}
```

### Test-Struktur (Integration Tests)
```
src/test/java/
├── unit/              # Developer-owned
└── integration/       # Test-Engineer-owned
    ├── api/
    ├── messaging/
    ├── system/
    └── e2e/
```

---

## KRITISCHE REGELN

### 1. Keine absoluten Pfade in Plugin-Dateien
```
❌ /mnt/d/ki/repos/agenticaiplugin/
✅ /path/to/your/marketplace (generisch)
✅ claudedocs/guidelines/ (relativ im User-Projekt)
```

### 2. Dokumentation-Priorität
**IMMER ZUERST:** `docs/plugin-howto.md` konsultieren, bevor externe Quellen.

### 3. Testing-Philosophie
```
Test YOUR Code, Not THE Code

✅ Business-Logik testen (Berechnungen, Validierungen)
❌ Framework-Code testen (Spring-Annotationen, JPA-Mappings)
❌ Generierten Code testen (Lombok, MapStruct)
```

---

## Entwicklungs-Workflow

1. **Dateien bearbeiten** im Plugin-Verzeichnis
2. **Marketplace updaten:**
   ```bash
   /plugin marketplace update local-dev-marketplace
   ```
3. **Testen** in einem Projekt, das das Plugin nutzt

---

## Schnellreferenz: Commands

```bash
/init                      # Projekt mit claudedocs/ initialisieren
/gitme                     # Smart Git Commit erstellen
/cc-code-review <file>     # Manuelles Code-Review
/cc-test STORY-042         # Tests für Story schreiben
/create-agentic            # Projekt-Kontext erstellen/updaten
/load-agentic              # Projekt-Kontext laden
```

---

## Wo finde ich was?

| Thema | Datei |
|-------|-------|
| Plugin-Entwicklung allgemein | `docs/plugin-howto.md` |
| Frontmatter-Syntax | `docs/plugin-howto.md` |
| Skill-Templates (Jinja2) | `skills/agile-workflow/templates/` |
| Review-Kriterien | `skills/code-reviewer/` |
| Spring Boot Patterns | `skills/spring-boot-best-practices/SKILL.md` |
| Java Patterns | `skills/java-best-practices/SKILL.md` |
| Testing Patterns | `skills/integration-testing/SKILL.md` |
| Context-Management | `agents/context-creator.md` |

---

## Legacy-Framework Referenz

**Pfad:** `C:\Dev\repos\agenticai`

Vorherige Version des Frameworks - nur bei Bedarf konsultieren (Migration, historischer Kontext).

---

## Aktuelle Entwicklung (letzte Commits)

- `6072bf5` feat(context): add AI session context management
- `dc8bcb8` refactor(agents): optimize token usage with progressive disclosure
- `33a25d1` feat(agents): add skills frontmatter field support
- `e2326d6` docs(project): add legacy framework reference
- `ef87125` refactor(template): update CLAUDE.md for intelligent code review

---

**Nächster Schritt:** Lies `docs/plugin-howto.md` für detaillierte Plugin-Entwicklungsfragen.
