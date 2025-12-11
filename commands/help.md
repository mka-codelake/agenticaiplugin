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
| **config** | Konfiguriert Plugin-Einstellungen wie die Anzahl der Reviewer beim Ensemble-Code-Review |

### Dokumentation
| Command | Beschreibung |
|---------|--------------|
| **create-agentic** | Erstellt/aktualisiert `agentic.md` - ein KI-optimiertes Projektdokument, das Claude hilft, das Projekt schnell zu verstehen |
| **create-readme** | Erstellt/aktualisiert `README.md` - klassische Projektdokumentation für Menschen |
| **create-docs** | Erstellt beide Dokumente (agentic.md + README.md) in einem Durchgang |
| **load-agentic** | Lädt eine existierende agentic.md ins Kontext, um das Projekt schnell zu verstehen |

### Entwicklung
| Command | Beschreibung |
|---------|--------------|
| **gitme** | Intelligente Git-Commits: Analysiert alle Änderungen, gruppiert sie logisch und erstellt aussagekräftige Commit-Messages. Kann mehrere Commits erstellen wenn sinnvoll |
| **code-review** `<datei>` | Führt ein intelligentes Code-Review durch. Erkennt automatisch den Review-Typ (Code/Tests/Architektur) und wendet die relevanten Kriterien an |
| **test** `[STORY-ID]` | Lässt den Test-Engineer Integration-/System-/E2E-Tests schreiben. Optional mit Story-ID für Traceability |

### Change Management
| Command | Beschreibung |
|---------|--------------|
| **create-cr** `[datei]` | Erstellt ein Change Request Dokument aus dem aktuellen Session-Kontext. Wichtig: Sichert Planungswissen bevor eine neue Session gestartet wird. Mit Dateiname: Aktualisiert existierendes CR |

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
- **code-reviewer** - Kriterien für Code-Reviews
- **testing-philosophy** - "Test YOUR Code, Not THE Code"
- **integration-testing** - TestContainers, @SpringBootTest, Async-Testing

### Architektur
- **architecture-decisions** - ADR (Architecture Decision Records) erstellen
- **dependency-analysis** - Story-Abhängigkeiten analysieren

### Technologie-Beratung (recherchiert aktuelle Versionen)
- **technology-advisor-jvm** - Maven/Gradle Dependencies
- **technology-advisor-javascript** - npm/yarn Packages
- **technology-advisor-python** - pip/poetry Packages

### Sprach-spezifisch
- **java-best-practices** - Java 17+/21+/25+ Konventionen
- **maven-best-practices** - Maven-Builds und pom.xml
- **spring-boot-best-practices** - Spring Boot Patterns

---

## Agents (spezialisierte Sub-Agenten)

Agents sind isolierte Kontexte für spezifische Aufgaben.

| Agent | Aufgabe |
|-------|---------|
| **code-reviewer** | Führt mehrstufige Code-Reviews durch (Code/Tests/Architektur) |
| **context-creator** | Erstellt agentic.md und README.md |
| **project-initializer** | Richtet Projekte für das Plugin ein |
| **test-engineer** | Schreibt Integration-/System-/E2E-Tests basierend auf Akzeptanzkriterien |

---

**Tipp:** Die meisten Skills aktivieren sich automatisch. Für Commands nutze `/agenticaiplugin:<command>`.
