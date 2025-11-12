# AgenticAI Plugin

Claude Code Plugin mit AI-gestützten Entwicklungs-Skills und Commands für verbesserte Workflows.

## Struktur

```
agenticaiplugin/
├── .claude-plugin/
│   └── plugin.json            # Plugin-Metadaten
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
