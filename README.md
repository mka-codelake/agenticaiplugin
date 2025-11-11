# AgenticAI Plugin

Claude Code Plugin mit AI-gestützten Entwicklungs-Skills und Commands für verbesserte Workflows.

## Struktur

```
agenticaiplugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin-Metadaten
├── skills/
│   └── git-smart-commit/    # Intelligente Git-Commit-Erstellung
│       └── SKILL.md
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
