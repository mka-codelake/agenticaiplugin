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

## Instructions

Zeige dem Benutzer folgende Übersicht:

---

# AgenticAI Plugin - Übersicht

## Commands

### Projekt-Setup
| Command | Beschreibung |
|---------|--------------|
| **init** | Initialisiert ein Projekt interaktiv. Erstellt CLAUDE.md mit projektspezifischen Anweisungen und die claudedocs/-Verzeichnisstruktur (guidelines/, testspecs/, etc.) |

### Dokumentation
| Command | Beschreibung |
|---------|--------------|
| **create-readme** | Erstellt/aktualisiert `README.md` - klassische Projektdokumentation für Menschen |

### Entwicklung
| Command | Beschreibung |
|---------|--------------|
| **gitme** | Intelligente Git-Commits: Analysiert alle Änderungen, gruppiert sie logisch und erstellt aussagekräftige Commit-Messages. Kann mehrere Commits erstellen wenn sinnvoll |
| **code-review** | Führt ein intelligentes Code-Review durch. Vier Modi: ohne Parameter = Git Diff (Standard), mit Datei = Einzeldatei, `--complete` = ganzes Projekt, `--renovate` = Dependency-Audit (Optionen: `--stack jvm/js/python`, `--quick`, `--save`) |
| **architecture-audit** | Umfassendes Architektur-Audit: Erkennt Patterns, bewertet 7 Dimensionen (Boundaries, Dependencies, Naming, APIs, Wiring, Visibility), erstellt bewerteten Report (A-E Skala). Optionen: `--scope <path>` für Teilbereiche |

### System
| Command | Beschreibung |
|---------|--------------|
| **promote-perms** | Hebt Workspace-spezifische Permissions auf User-Level (global). Nützlich wenn man dieselben Permissions in allen Projekten haben möchte |

---

## Skills (werden automatisch aktiviert)

Skills sind Wissensmodule, die Claude automatisch lädt wenn bestimmte Schlüsselwörter erkannt werden.

### Entwicklungsprinzipien
- **development-principles** - YAGNI, KISS, SRP, Story-Traceability
- **git-smart-commit** - Regeln für gute Commits
- **agile-workflow** - Epics, Stories, Sprints mit Templates

### Code-Qualität
- **code-review** - Multi-Specialist Code-Reviews (10 fokussierte Spezialisten)
- **testing-philosophy** - "Test YOUR Code, Not THE Code"

### Architektur
- **architecture-audit** - Architektur-Audit mit 7 Analyzern und A-E Bewertung (Command: `/agenticaiplugin:architecture-audit`)

### Technologie-Beratung (recherchiert aktuelle Versionen)
- **technology-advisor-jvm** - Maven/Gradle Dependencies
- **technology-advisor-javascript** - npm/yarn Packages

---

## Agents (spezialisierte Sub-Agenten)

Agents sind isolierte Kontexte für spezifische Aufgaben.

| Agent | Aufgabe |
|-------|---------|
| **code-review** | Multi-Specialist Code-Reviews (10 fokussierte Spezialisten, kein separater Agent mehr) |
| **context-creator** | Erstellt README.md |
| **project-initializer** | Richtet Projekte für das Plugin ein |

---

**Tipp:** Die meisten Skills aktivieren sich automatisch. Für Commands nutze `/agenticaiplugin:<command>`.
