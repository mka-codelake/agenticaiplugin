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
├── CLAUDE.template.md         # Template für Projekt-Konfiguration
├── FRAMEWORK_REDESIGN_SESSION.md  # Session-Dokumentation
└── README.md
```

## Installation

### 1. Lokalen Marketplace hinzufügen

```bash
/plugin marketplace add D:\ki\marketplace
```

Oder unter WSL/Linux:
```bash
/plugin marketplace add /mnt/d/ki/marketplace
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

**1. CLAUDE.md Template kopieren**

Kopiere die Projekt-Konfiguration in dein Projekt:

```bash
cp CLAUDE.template.md /dein-projekt/CLAUDE.md
```

Diese Datei enthält die Anweisung für Claude, automatisch Code-Reviews nach Task-Completion durchzuführen.

**2. Projekt-Guidelines anlegen (optional)**

Erstelle projektspezifische Guidelines:

```bash
mkdir -p /dein-projekt/claudedocs/guidelines
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
