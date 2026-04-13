---
description: Show overview of all plugin commands, skills, and agents
disable-model-invocation: true
---

# AgenticAI Plugin Help

Zeigt eine Übersicht über alle verfügbaren Commands, Skills und Agents.

## Usage

```
/agenticaiplugin:help
```

No parameters required.

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Any other argument passed** → Display the Usage section above verbatim, then STOP. This command takes no parameters.

## Instructions

Zeige dem Benutzer folgende Übersicht:

---

# AgenticAI Plugin - Übersicht

## Commands

### Projekt-Setup
| Command | Beschreibung |
|---------|--------------|
| **init** | Initialisiert ein Projekt interaktiv. Erstellt Plugin-Regeln in .claude/rules/ und die claudedocs/-Verzeichnisstruktur (guidelines/, adrs/) |

### Dokumentation
| Command | Beschreibung |
|---------|--------------|
| **github-publish** | Bereitet GitHub-Repository für Public Release vor: README erstellen/aktualisieren (Baseline-Struktur, Badges, Logo, Status-Banner), Lizenzauswahl, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, GitHub Actions Release-Workflow, Issue-Templates. Modi: `--readme` (nur README), `--license` (nur Lizenz), `--repo <path>` (anderes Repo) |

### Entwicklung
| Command | Beschreibung |
|---------|--------------|
| **gitme** | Intelligente Git-Commits: Analysiert alle Änderungen, gruppiert sie logisch und erstellt aussagekräftige Commit-Messages. Kann mehrere Commits erstellen wenn sinnvoll |
| **code-review** | Führt ein intelligentes Code-Review durch. Vier Modi: ohne Parameter = Git Diff (Standard), mit Datei = Einzeldatei, `--complete` = ganzes Projekt, `--renovate` = Dependency-Audit (Optionen: `--stack jvm/js/python`, `--quick`, `--save`) |
| **architecture-audit** | Umfassendes Architektur-Audit: Erkennt Patterns, bewertet 7 Dimensionen (Boundaries, Dependencies, Naming, APIs, Wiring, Visibility), erstellt bewerteten Report (A-E Skala). Optionen: `--scope <path>` für Teilbereiche |
| **qa** | Quality Assurance: Verwaltet bidirektionale Traceability zwischen Requirements, Code, Test Cases und Tests ("Quality Square"). Analysiert Code, extrahiert Requirements, leitet Test Cases ab, erstellt Gap-Analyse. Option: `--force-rebuild` |
| **create-cli** | Designt CLI-Oberflächen: Argumente, Flags, Subcommands, Help-Text, Output-Formate, Exit-Codes, Prompts. Erstellt eine kompakte Spec zur Implementierung |
| **license-check** | Prüft Lizenzkompatibilität aller Abhängigkeiten, Tools, Scripts und LLM-Modelle gegen die Projektlizenz. Modi: Standard (vollständiger Scan inkl. transitive Deps) oder `--quick` (nur direkte Abhängigkeiten). Report wird in `claudedocs/license-check-result.md` gespeichert |

### Tools
| Command | Beschreibung |
|---------|--------------|
| **markdown-converter** | Konvertiert Dateien zu Markdown via `uvx markitdown`. Unterstützt PDF, Word, PowerPoint, Excel, HTML, CSV, JSON, XML, Bilder, Audio, ZIP, YouTube-URLs, EPub |

### System
| Command | Beschreibung |
|---------|--------------|
| **update-plugin** | Aktualisiert Plugin-Regeln in .claude/rules/ auf die neueste Version. Migriert automatisch von Legacy-Installationen |
| **promote-perms** | Hebt Workspace-spezifische Permissions auf User-Level (global). Nützlich wenn man dieselben Permissions in allen Projekten haben möchte |
| **help** | Zeigt diese Übersicht aller Commands, Skills, Agents und Plugin-Regeln |

---

## Projektstruktur (claudedocs/)

Das Plugin nutzt ein `claudedocs/`-Verzeichnis für projektspezifische Konfiguration:

| Verzeichnis | Zweck |
|-------------|-------|
| `claudedocs/guidelines/` | Eigene Coding-Regeln, die der Code-Review berücksichtigt (z.B. Exception-Handling, Logging-Standards) |
| `claudedocs/adrs/` | Architecture Decision Records — dokumentierte Architektur-Entscheidungen, die Code-Review und Architecture-Audit als Kontext nutzen |

Diese Verzeichnisse werden beim `/agenticaiplugin:init` angelegt. Du legst dort eigene `.md`-Dateien ab — das Plugin liest sie, ändert sie aber nie.

---

## Skills (werden automatisch aktiviert)

Skills sind Wissensmodule, die Claude automatisch lädt wenn bestimmte Schlüsselwörter erkannt werden.

### Entwicklung
- **git-smart-commit** - Regeln für gute Commits
- **create-cli** - CLI-Design: Argumente, Flags, Subcommands, Output-Formate, Exit-Codes (Command: `/agenticaiplugin:create-cli`)

### Compliance
- **license-check** - Lizenzkompatibilitätsprüfung (Command: `/agenticaiplugin:license-check`)

### Code-Qualität
- **code-review** - Multi-Specialist Code-Reviews (11 fokussierte Spezialisten)
- **qa** - Quality Square Traceability Manager (Command: `/agenticaiplugin:qa`)

### Architektur
- **architecture-audit** - Architektur-Audit mit 7 Analyzern und A-E Bewertung (Command: `/agenticaiplugin:architecture-audit`)

### Tools
- **markdown-converter** - Datei-zu-Markdown-Konvertierung via markitdown (Command: `/agenticaiplugin:markdown-converter`)

---

## Agents (spezialisierte Sub-Agenten)

Agents sind isolierte Kontexte für spezifische Aufgaben.

| Agent | Aufgabe |
|-------|---------|
| **github-publisher** | Bereitet Repositories für Public Release auf GitHub vor (inkl. README-Erstellung) |
| **license-checker** | Scannt Projektabhängigkeiten und prüft Lizenzkompatibilität |
| **project-initializer** | Richtet Projekte für das Plugin ein, führt Updates durch |

---

## Plugin-Regeln (immer aktiv nach /agenticaiplugin:init)

Diese Regeln werden bei der Projektinitialisierung in `.claude/rules/` installiert und beeinflussen Claudes Verhalten dauerhaft:

| Regel | Verhalten |
|-------|-----------|
| **Rückfragen statt Annahmen** | Claude fragt bei Unklarheiten nach, statt Annahmen zu treffen |
| **Automatisches Code-Review** | Nach Abschluss einer Implementierung führt Claude automatisch ein Multi-Specialist Code-Review durch |
| **Git-Commits über Skill** | `git commit` wird nie direkt ausgeführt — immer über `/agenticaiplugin:gitme` |
| **Engineering-Prinzipien** | Story-Traceability, Code-Size-Limits, Test-Klassifizierung, Dependency-Management |
| **Geschützte Verzeichnisse** | `claudedocs/guidelines/` und `claudedocs/adrs/` werden nur gelesen, nie verändert |

---

**Tipp:** Die meisten Skills aktivieren sich automatisch. Für Commands nutze `/agenticaiplugin:<command>`.
