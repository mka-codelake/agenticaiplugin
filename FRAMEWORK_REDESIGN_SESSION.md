# Framework Redesign - AgenticAI Plugin Dokumentation

**Datum:** 2025-11-12
**Version:** 1.0
**Projekt:** Claude Code Plugin für flexible, agile Software-Entwicklungs-Workflows

---

## Übersicht

### Was ist dieses Plugin?

Ein Claude Code Plugin, das **automatisch aktivierende Skills** bereitstellt für:
- Agile Workflow-Management (Epics, Stories, Sprints)
- Best Practices (Java, Testing, Development Principles)
- Architektur-Entscheidungen (ADRs)
- Dependency-Analyse mit ULTRATHINK

**Kern-Idee:** Skills aktivieren sich automatisch basierend auf Kontext (Progressive Disclosure) - **keine Commands nötig**.

---

## Motivation & Problem

### Ursprüngliches Framework

**Location:** `agenticai/framework`
**Ansatz:** Phasenbasiert mit spezialisierten AI-Agenten (6 Agents, 12 Commands)
**Datenhaltung:** PostgreSQL + MongoDB via Workflow MCP Server

**Stärken:**
- Hochwertige Regeln: "Test YOUR Code, Not THE Code"
- 1835 Zeilen Java Best Practices
- ULTRATHINK für Dependency-Analyse
- Templates (Jinja2) für Epic/Story/ADR
- Dynamic Model Selection (Opus/Sonnet/Haiku)

**Schwächen:**
- ❌ Starre Command-Struktur (`/cl-req → /cl-arch → /cl-plan → /cl-dev`)
- ❌ Wasserfall-Problem: Alle Requirements vorab ("Wall-of-Text")
- ❌ Neue Anforderungen = Workflow restart
- ❌ Agents als separate Entitäten (Overhead)
- ❌ Database-First (PostgreSQL + MongoDB Setup)

### Kern-Problem

**"Zu unflexibel für dynamische, agile Anforderungen"**

#### Vergleich: Wasserfall vs. Agile

| Aspekt | Framework (Wasserfall) | Gewünscht (Agile) |
|--------|------------------------|-------------------|
| **Requirements** | Alle vorab extrahieren | High-Level → iterativ verfeinern |
| **Architektur** | Komplettes Design vorab | High-Level, dann Epic-für-Epic |
| **Planung** | Alle Phasen auf einmal | Sprint-für-Sprint |
| **Änderungen** | Schwierig (Workflow restart) | Einfach (neue Story) |
| **Review** | Nach Implementierung | Kontinuierlich |
| **Flexibilität** | Niedrig | Hoch |

#### Konkrete Use Cases, die nicht funktionieren

**Szenario 1: Neue Anforderung während Entwicklung**
- Problem: Epic-001 läuft, neue Anforderung "Dead Letter Queue"
- Framework: Müsste `/cl-req` neu laufen oder manuell Requirements in DB einfügen
- Gewünscht: Einfach neue Story erstellen und in Sprint einplanen ✅

**Szenario 2: Epic-für-Epic Entwicklung**
- Problem: 3 Komponenten (kafka/, domain/, storage/), je 1 Epic
- Framework: Will alles vorab planen
- Gewünscht: Epic-001 fertig, dann Epic-002 starten (iterativ) ✅

**Szenario 3: Architektur-Entscheidung während Entwicklung**
- Problem: Interface sollte anders sein
- Framework: Müsste Architecture-Phase reopenen
- Gewünscht: ADR schreiben, Interface anpassen, weitermachen ✅

### Gewünschter Workflow

1. **High-Level System-Beschreibung** (Tech-Stack, Architektur, Datenfluss)
2. **Epics ableiten** (ggf. mit Komponenten-Schnitt)
3. **Epic für Epic bearbeiten**: Stories schneiden
4. **Stories in Sprints planen** (Abhängigkeiten beachten)
5. **Flexibel**: Neue Anforderungen jederzeit als neue Stories/Epics

---

## Kern-Entscheidungen

### 1. Skills für Verhaltensweisen statt Commands ✅

**Entscheidung:** Keine `/cl-req`, `/cl-dev` Commands. Stattdessen Skills, die sich automatisch aktivieren.

**Begründung:**
- ✅ Natürliche Konversation statt Command-Syntax
- ✅ Automatische Aktivierung basierend auf Kontext
- ✅ Flexibel erweiterbar (neue Skills ohne Workflow-Änderung)
- ✅ Progressive Disclosure (token-effizient)

**Beispiel:**
```
User: "Schreib mir Stories für Kafka-Integration"
Claude: [Aktiviert automatisch: agile-workflow Skill]
```

### 2. Plugin-Struktur statt CLAUDE.md ✅

**Entscheidung:** Plugin mit `.claude-plugin/plugin.json` + `skills/` auf Root-Ebene.

**Begründung:**
- ✅ Wiederverwendbar in mehreren Projekten
- ✅ Marketplace-fähig
- ✅ Klare Trennung: Plugin vs. Projekt-Config
- ❌ CLAUDE.md funktioniert nicht in Plugins (nur in Projekten)

**Plugin vs Projekt:**
- **Plugins:** `.claude-plugin/plugin.json` + `skills/` auf Root
- **Projekte:** `.claude/` für projekt-spezifische Config

### 3. claudedocs/ statt Workflow-MCP-DB ✅

**Entscheidung:** Markdown-Dateien in `claudedocs/` statt PostgreSQL + MongoDB.

**Begründung:**
- ✅ Keine DB-Abhängigkeit: Einfacherer Setup, funktioniert sofort
- ✅ Versionierbar: Git-freundlich, Diff, History
- ✅ Flexibel: Jederzeit editierbar, kein Schema-Lock
- ✅ Transparent: Human-readable
- ✅ Portabel: Funktioniert überall

**Struktur:**
```
claudedocs/
├── epics/       # EPIC-XXX-description.md
├── stories/     # STORY-XXX-description.md
├── sprints/     # SPRINT-XX.md
├── adrs/        # ADR-XXX-description.md
└── tasks/       # TASK-XXX-description.md (optional)
```

### 4. Keine separaten Agents ✅

**Entscheidung:** Claude nutzt Skills kontextabhängig, keine separaten Requirements Engineer / Developer / etc. Agents.

**Begründung:**
- ✅ Weniger Overhead (kein Agent-Launch)
- ✅ Natürlicher: Claude ist "ein Agent mit vielen Skills"
- ✅ Flexibler: Skills können kombiniert werden
- ✅ User muss keine Agent-Namen kennen

**Statt:**
```
/cl-arch  # Startet Solution Architect Agent
```

**Jetzt:**
```
User: "Definiere die Architektur für Kafka-Integration"
Claude: [Aktiviert architecture-decisions Skill] → erstellt ADR
```

### 5. Templates in Skills statt separater Templates-Folder ✅

**Entscheidung:** Templates in jeweiligen Skills (`agile-workflow/templates/`) statt zentralem `.claude/templates/`.

**Begründung:**
- ✅ **Cohesion:** Template gehört zu Skill-Logik
- ✅ **Progressive Disclosure:** Nur geladen wenn Skill aktiv
- ✅ **Modularität:** Skill + Template = Einheit
- ✅ **Wiederverwendbarkeit:** Skill kann in andere Projekte kopiert werden

### 6. Ordnerstruktur in SKILL.md ✅

**Entscheidung:** Ordnerstruktur-Konventionen in SKILL.md (nicht CLAUDE.md) dokumentieren.

**Begründung:**
- ✅ SKILL.md ist Plugin-Standard (CLAUDE.md nur für Projekte)
- ✅ Fundamental für Workflow → sollte immer geladen sein
- ✅ Sehr kurz (2-3 Zeilen)
- ✅ Alternative (separater Skill) wäre Overhead für simple Convention

---

## Plugin-Architektur

### Vollständige Ordnerstruktur

```
agenticaiplugin/
│
├── .claude-plugin/
│   └── plugin.json              # Plugin Metadata (name, version, description)
│
├── skills/                      # Skills (Auto-activated Task Packs)
│   │
│   ├── agile-workflow/          # Epic/Story/Sprint Management
│   │   ├── SKILL.md             # Auto-activated when managing Epics/Stories
│   │   ├── templates/
│   │   │   ├── epic.md.j2
│   │   │   ├── story.md.j2
│   │   │   └── sprint.md.j2
│   │   └── reference.md         # Ausführliche Workflow-Doku
│   │
│   ├── testing-philosophy/      # "Test YOUR Code, Not THE Code"
│   │   ├── SKILL.md             # Auto-activated when writing tests
│   │   └── reference.md         # Test Necessity Matrix, Code Classification
│   │
│   ├── development-principles/  # Universal (YAGNI, KISS, SRP)
│   │   ├── SKILL.md             # Auto-activated when writing code (any language)
│   │   └── reference.md         # Code Size, Traceability, Security, Performance
│   │
│   ├── java-best-practices/     # Java 17-25, Spring Boot, Maven
│   │   ├── SKILL.md             # Auto-activated when writing Java code
│   │   └── reference.md         # Modern Syntax, Spring Patterns, Maven Standards
│   │
│   ├── dependency-analysis/     # ULTRATHINK-based Dependency Analysis
│   │   ├── SKILL.md             # Auto-activated when analyzing dependencies
│   │   └── reference.md         # ULTRATHINK Prompts, Circular Detection
│   │
│   ├── architecture-decisions/  # ADR Writing
│   │   ├── SKILL.md             # Auto-activated when making architecture decisions
│   │   ├── templates/
│   │   │   └── adr.md.j2
│   │   └── reference.md         # ADR Format, Best Practices
│   │
│   └── git-smart-commit/        # Intelligent Git Commits
│       └── SKILL.md             # Auto-activated when committing changes
│
└── README.md                    # Plugin Documentation
```

### Projekt-Struktur (wo Plugin installiert wird)

```
my-project/                      # z.B. kafkareader (Test-Projekt)
│
├── .claude/
│   └── skills/                  # Skills von Plugin hierhin installiert
│       ├── agile-workflow/
│       ├── testing-philosophy/
│       ├── development-principles/
│       ├── java-best-practices/
│       ├── dependency-analysis/
│       └── architecture-decisions/
│
├── claudedocs/                  # Agile Artifacts (Markdown)
│   ├── epics/
│   │   └── EPIC-001-kafka-integration.md
│   ├── stories/
│   │   ├── STORY-001-kafka-consumer-setup.md
│   │   ├── STORY-002-message-deserialization.md
│   │   └── STORY-003-port-interface.md
│   ├── sprints/
│   │   ├── SPRINT-01.md
│   │   └── SPRINT-02.md
│   ├── adrs/
│   │   └── ADR-001-port-adapter-architecture.md
│   └── tasks/                   # Optional: Technische Tasks
│       └── TASK-001-setup-kafka-docker.md
│
├── src/                         # Projekt-Code
├── pom.xml                      # Maven Config
└── README.md
```

---

## Skills-Übersicht

### Implementierte Skills (7 Total)

| Skill | Zweck | Auto-Aktivierung | Dateien | Status |
|-------|-------|------------------|---------|--------|
| **agile-workflow** | Epic/Story/Sprint Management | Bei "Erstelle Epic/Story", "Plan Sprint" | SKILL.md (8.5 KB)<br>3 Templates (epic, story, sprint)<br>reference.md (10.2 KB) | ✅ Iteration 1 |
| **testing-philosophy** | "Test YOUR Code, Not THE Code"<br>Test Necessity Matrix | Bei Test-Schreiben, "Schreib Tests" | SKILL.md (9.5 KB)<br>reference.md (30 KB) | ✅ Iteration 2 |
| **development-principles** | Universal: YAGNI, KISS, SRP<br>Code Size, Traceability, Security | Bei Code-Schreiben (any language) | SKILL.md (4.6 KB)<br>reference.md (16 KB) | ✅ Iteration 3 |
| **java-best-practices** | Java 17-25, Spring Boot, Maven<br>Modern Syntax, Patterns | Bei Java-Code-Schreiben | SKILL.md (3.8 KB)<br>reference.md (29 KB) | ✅ Iteration 3 |
| **dependency-analysis** | ULTRATHINK Dependency-Analyse<br>Circular Detection, Sprint Readiness | Bei "Analysiere Dependencies", Sprint-Planung | SKILL.md (235 lines)<br>reference.md (680 lines) | ✅ Iteration 4 |
| **architecture-decisions** | ADR Management<br>Michael Nygard Framework | Bei "Erstelle ADR", Architektur-Entscheidungen | SKILL.md (210 lines)<br>Template: adr.md.j2<br>reference.md (600 lines) | ✅ Iteration 5 |
| **git-smart-commit** | Intelligente Git Commits<br>Analyse & Grouping | Bei "Commit changes", "Create commit" | SKILL.md | ✅ Vorhanden |

**Total:** 7 Skills, ~170 KB Content

### Multi-Skill Activation

**Beispiel: Java-Projekt**
- `development-principles` (universal) ✅
- `java-best-practices` (Java-spezifisch) ✅
- `testing-philosophy` (universal) ✅
- `agile-workflow` (bei Epic/Story/Sprint) ✅
- `dependency-analysis` (bei Dependency-Erwähnung, Sprint-Planung) ✅
- `architecture-decisions` (bei ADR-Erwähnung, Design Decisions) ✅

**Alle aktivieren sich gleichzeitig** basierend auf Kontext (Progressive Disclosure).

---

## Skill-Details

### 1. agile-workflow

**Zweck:** Epic/Story/Sprint Management mit Templates und Dependency-Analyse

**Auto-Aktivierung:**
- "Erstelle ein Epic"
- "Schneide Stories"
- "Plan einen Sprint"
- Bei Erwähnung von Epics/Stories/Sprints

**Features:**
- INVEST Criteria für Stories
- Fibonacci Story Points (1, 2, 3, 5, 8, 13)
- Dependency Tracking
- Sprint Planning (Capacity-basiert)
- Templates für Epic/Story/Sprint (Jinja2)

**File Naming Convention:**
- Epics: `claudedocs/epics/EPIC-001-kafka-integration.md`
- Stories: `claudedocs/stories/STORY-001-kafka-consumer-setup.md`
- Sprints: `claudedocs/sprints/SPRINT-01.md`

**Templates:**
```jinja2
# STORY-{{ id }}: {{ title }}

**Epic:** [EPIC-{{ epic_id }}](../epics/EPIC-{{ epic_id }}-*.md)
**Story Points:** {{ story_points }}
**Sprint:** {{ sprint }}
**Status:** {{ status }}

## User Story
As a {{ role }}, I want {{ goal }}, so that {{ benefit }}.

## Acceptance Criteria
- [ ] {{ criterion_1 }}
- [ ] {{ criterion_2 }}

## Dependencies
{{ dependencies }}
```

### 2. testing-philosophy

**Zweck:** "Test YOUR Code, Not THE Code" - Fokus auf Business Logic, nicht Framework

**Auto-Aktivierung:**
- "Schreib Tests"
- "Test Coverage"
- Bei Test-Code-Schreiben

**Kern-Prinzip:**
- ✅ **Test YOUR Code:** Business Logic, Custom Algorithms, Domain Rules
- ❌ **Don't Test THE Code:** Spring Boot, Kafka, Redis, Hibernate

**Code Classification:**
```
┌─────────────────────────────────────────────┐
│  Framework Code (THE Code)                  │
│  ❌ Don't Test                              │
│  - Spring Boot Annotations                  │
│  - Kafka Consumer/Producer                  │
│  - Redis Operations                         │
│  - JPA/Hibernate                            │
└─────────────────────────────────────────────┘
          ↓ calls ↓
┌─────────────────────────────────────────────┐
│  Business Logic (YOUR Code)                 │
│  ✅ Test This                               │
│  - Domain Rules                             │
│  - Transformations                          │
│  - Validations                              │
│  - Calculations                             │
└─────────────────────────────────────────────┘
```

**Test Necessity Matrix:**
| Code Type | Integration Tests | Unit Tests |
|-----------|-------------------|------------|
| **Business Logic** | Few (1-3 Happy Path) | Many (100s Edge Cases) |
| **Framework Glue** | Few (Tech Validation) | None (Trust Framework) |
| **Configuration** | Smoke Test | None |

**Coverage als Diagnostic Tool:**
- ❌ NICHT: "Wir brauchen >80% Coverage"
- ✅ STATTDESSEN: "Coverage zeigt untestete Business Logic"

### 3. development-principles

**Zweck:** Universal/sprachunabhängig: YAGNI, KISS, SRP, Code Size, Security

**Auto-Aktivierung:**
- Bei Code-Schreiben (Java, Python, JavaScript, Go, etc.)
- Bei Code-Review-Diskussionen

**Kern-Prinzipien:**
1. **YAGNI (You Aren't Gonna Need It)**
   - Keine Abstractions "for the future"
   - Story-Driven: Nur was für AC nötig

2. **KISS (Keep It Simple, Stupid)**
   - Einfachste Lösung wählen
   - Keine Over-Engineering

3. **Single Responsibility Principle (SRP)**
   - Eine Klasse/Funktion = Eine Verantwortlichkeit
   - Hohe Cohesion, Low Coupling

4. **Code Size**
   - Methoden: < 20 Zeilen (Guideline, nicht Regel)
   - Klassen: < 200 Zeilen

5. **Story Traceability**
   - Jede Methode referenziert Story: `// STORY-001: AC1`

6. **Security, Performance, Logging, Comments**
   - OWASP Top 10 beachten
   - Performance nur bei Bedarf optimieren
   - Structured Logging (SLF4J, Logback)
   - Comments nur bei komplexer Business Logic

### 4. java-best-practices

**Zweck:** Java 17-25, Spring Boot, Maven Best Practices

**Auto-Aktivierung:**
- Bei Java-Code-Schreiben
- Bei Spring Boot / Maven Projekten

**Kern-Features:**
- **Modern Java Syntax (Java 17-25):**
  - Records (Java 14+)
  - Pattern Matching (Java 16+)
  - Sealed Classes (Java 17+)
  - Virtual Threads (Java 21+)
  - String Templates (Java 21+)
  - Version Detection aus `pom.xml`/`build.gradle`

- **Spring Boot Patterns:**
  - Constructor Injection (nicht `@Autowired`)
  - Port & Adapter (Hexagonal Architecture)
  - Configuration Properties (nicht `@Value`)
  - Proper Exception Handling

- **Maven Standards:**
  - Dependency Management
  - Plugin Configuration
  - Multi-Module Builds

- **Null Safety:**
  - Optional für nullable returns
  - `@NonNull` / `@Nullable` Annotations

**Auto-Suggest Strategy:**
- Erkennt Java Version aus `pom.xml`
- Schlägt moderne Features vor (z.B. Records statt POJOs)
- Warnt bei veralteten Patterns

### 5. dependency-analysis

**Zweck:** ULTRATHINK-basierte Dependency-Analyse mit Circular Detection

**Auto-Aktivierung:**
- "Analysiere Dependencies"
- "Sprint Planning"
- Bei komplexen Story-Dependencies

**Core Features:**
1. **Circular Dependency Detection**
   - DFS-basierte Zyklus-Erkennung
   - Warnung bei zirkulären Dependencies

2. **Sprint Readiness Check**
   - Validiert Dependencies vor Sprint-Start
   - Prüft: Alle Dependencies in Sprint oder Completed?

3. **Dependency Graph Visualization**
   - ASCII-Graphen für Stories/Epics/Sprints
   - Zeigt Dependency-Chains

4. **Dependency Classification**
   - Technical Dependencies (z.B. "Port Interface vor Adapter")
   - Business Dependencies (z.B. "User Login vor User Profile")
   - Data Dependencies (z.B. "Schema vor Migration")

**ULTRATHINK Integration:**
- Kombinierter Ansatz: Vordefinierte Prompts + Custom Guidance
- 4 vordefinierte ULTRATHINK-Prompts für Standard-Szenarien:
  1. Circular Dependency Detection
  2. Sprint Readiness Validation
  3. Dependency Impact Analysis
  4. Complex Interdependency Mapping

**Beispiel:**
```
User: "Analysiere Dependencies für STORY-001, STORY-002, STORY-003"
Claude: [Aktiviert dependency-analysis Skill]
        [Nutzt ULTRATHINK für Analyse]
        [Erstellt Dependency Graph]
        [Warnt bei Circular Dependencies]
```

### 6. architecture-decisions

**Zweck:** ADR (Architectural Decision Record) Management nach Michael Nygard Framework

**Auto-Aktivierung:**
- "Erstelle ein ADR"
- "Warum haben wir X gewählt?"
- Bei Architektur-Entscheidungen

**Features:**
- Michael Nygard ADR Framework
- Status: Proposed → Accepted/Rejected/Deprecated/Superseded
- Consequences (Positive & Negative)
- Template: `adr.md.j2`

**File Naming Convention:**
- `claudedocs/adrs/ADR-001-port-adapter-architecture.md`
- Zero-padded numbering
- Lowercase-with-dashes

**Template:**
```markdown
# ADR-{{ id }}: {{ title }}

**Status:** {{ status }}
**Date:** {{ date }}
**Deciders:** {{ deciders }}

## Context
{{ context }}

## Decision
{{ decision }}

## Consequences

### Positive
- {{ positive_1 }}
- {{ positive_2 }}

### Negative
- {{ negative_1 }}
- {{ negative_2 }}

## Alternatives Considered
{{ alternatives }}

## Related
- {{ related_decision_1 }}
```

### 7. git-smart-commit

**Zweck:** Intelligente Git Commits mit Analyse & Grouping

**Auto-Aktivierung:**
- "Commit changes"
- "Create commit"
- Bei Git-Commit-Anforderungen

**Features:**
- Analysiert uncommitted changes
- Gruppiert logisch zusammengehörige Änderungen
- Erstellt aussagekräftige Commit Messages
- Folgt Projekt-Conventions (Conventional Commits)

---

## Implementierungs-Status

### Iterationsplan - Zusammenfassung

| Iteration | Umfang | Test-Projekt | Dauer | Status |
|-----------|--------|--------------|-------|--------|
| 1 | agile-workflow (Komplett: Epic+Story+Sprint) | **kafkareader** | 20-30 min | ✅ Abgeschlossen |
| 2 | testing-philosophy | **kafkareader** | 15-20 min | ✅ Abgeschlossen |
| 3 | java-best-practices + development-principles | **kafkareader** | 15-20 min | ✅ Abgeschlossen |
| 4 | dependency-analysis (optional) | **kafkareader** | 15-20 min | ✅ Abgeschlossen |
| 5 | architecture-decisions | **kafkareader** | 10-15 min | ✅ Abgeschlossen |
| 6 | Integration E2E (Alle Skills) | **kafkareader** | 30-45 min | ⏸️ Ausstehend |

**Fortschritt:** 5 von 6 Iterationen abgeschlossen (83%)

### Phasen-Übersicht

#### Phase 1: Core Setup ✅
- ✅ CLAUDE.md erstellen ❌ (nicht nötig für Plugin)
- ✅ agentic.md Template ❌ (nicht nötig für Plugin)
- ✅ claudedocs/ Ordnerstruktur (in agile-workflow Skill dokumentiert)

#### Phase 2: Core Skills ✅
- ✅ agile-workflow Skill (Iteration 1)
- ✅ testing-philosophy Skill (Iteration 2)
- ✅ java-best-practices Skill (Iteration 3)

#### Phase 3: Advanced Skills ✅
- ✅ development-principles Skill (Iteration 3, extrahiert)
- ✅ dependency-analysis Skill (Iteration 4)
- ✅ architecture-decisions Skill (Iteration 5)
- ✅ git-smart-commit Skill (bereits vorhanden)

#### Phase 4: Testing & Validation ⏸️
- ⏸️ Integration E2E Test (Iteration 6)
  - Kompletter Workflow: High-Level → Epic → Stories → Sprint → Implementation → ADR
  - Szenario: "Kafka Dead Letter Queue Feature"
  - Real-World Simulation mit kafkareader-Projekt

#### Phase 5: Refinement & Dokumentation
- ✅ README.md vorhanden
- ✅ Skill-Dokumentation vollständig
- ⏸️ Feedback sammeln (nach Iteration 6)

---

## Plugin-Installation & Updates

### In Projekt installieren

```bash
# Plugin-Marketplace hinzufügen
/plugin marketplace add /path/to/marketplace

# Plugin installieren
/plugin install agenticaiplugin@local-dev-marketplace

# Plugin updaten nach Änderungen
/plugin marketplace update local-dev-marketplace
```

**Skills landen in:** `projekt/.claude/skills/`

### Test-Status in kafkareader (Test-Projekt)

- ✅ agile-workflow Skill aktiviert sich
- ✅ testing-philosophy Skill aktiviert sich
- ✅ java-best-practices Skill aktiviert sich
- ✅ development-principles Skill aktiviert sich
- ✅ dependency-analysis Skill aktiviert sich
- ✅ architecture-decisions Skill aktiviert sich
- ⏸️ Vollständiger E2E Test steht noch aus (Iteration 6)

---

## Wichtige Erkenntnisse

### 1. Plugin vs Projekt Struktur

**CRITICAL: Nicht verwechseln!**

- **Plugins:**
  - `.claude-plugin/plugin.json` + `skills/` auf Root
  - Wiederverwendbar in mehreren Projekten
  - Marketplace-fähig

- **Projekte:**
  - `.claude/` für projekt-spezifische Config
  - CLAUDE.md für Projekt-Workflows
  - agentic.md für Projekt-Kontext

### 2. Multi-Skill Activation

- ✅ Mehrere Skills können gleichzeitig aktiv sein
- ✅ Progressive Disclosure: Nur wenn relevant
- ✅ Kombinierbar: development-principles + java-best-practices + testing-philosophy

### 3. Skills vs Commands

**Skills (✅ Gewählt):**
- Auto-activated basierend auf Kontext
- Natürliche Konversation
- Flexibel erweiterbar
- Token-effizient (Progressive Disclosure)

**Commands (❌ Verworfen):**
- Manuelle Aktivierung: `/cl-req`, `/cl-dev`
- Unflexibel (starre Sequenz)
- User muss Commands kennen
- Overhead

### 4. ULTRATHINK Integration

- ✅ Vordefinierte Prompts für Standard-Szenarien
- ✅ Custom Guidance für komplexe Analysen
- ✅ Circular Dependency Detection
- ✅ Sprint Readiness Validation

### 5. Template-Integration

- ✅ Jinja2 Templates in Skills (`templates/`)
- ✅ Cohesion: Template + Skill = Einheit
- ✅ Progressive Disclosure: Nur geladen wenn Skill aktiv

---

## Nächste Schritte

### Iteration 6: Integration E2E Test ⏸️

**Szenario:** "Kafka Dead Letter Queue Feature" in kafkareader

1. **Plugin komplett installieren**
2. **High-Level Beschreibung:** "Ich möchte ein Dead Letter Queue Feature"
3. **Epic erstellen:** Prüfen ob agile-workflow aktiviert
4. **Stories schneiden:** Prüfen Dependencies & Story Points
5. **Dependencies analysieren:** Prüfen dependency-analysis + ULTRATHINK
6. **Sprint planen:** Capacity 8 Points
7. **Story implementieren:** Prüfen java-best-practices + testing-philosophy
8. **ADR erstellen:** "Warum 3 Retries?"

**Erwartetes Ergebnis:**
- ✅ Kompletter Workflow funktioniert End-to-End
- ✅ Alle Skills arbeiten zusammen
- ✅ Keine Brüche oder Fehler
- ✅ Plugin funktioniert "out of the box"

### Nach Iteration 6

- Feedback sammeln
- Ggf. Skills erweitern/anpassen
- Dokumentation finalisieren
- Plugin veröffentlichen

---

## Zusammenfassung

**Was ist dieses Plugin?**
- 7 automatisch aktivierende Skills für agile Software-Entwicklung
- Keine Commands, keine DB, keine Agents - nur Skills
- Funktioniert sofort nach Installation ("Zero Setup")

**Warum wurde es gebaut?**
- Ursprüngliches Framework zu unflexibel (Wasserfall)
- Neue Anforderungen während Entwicklung nicht möglich
- Gewünscht: Agile, flexibel, iterativ

**Wie funktioniert es?**
- Skills aktivieren sich automatisch basierend auf Kontext
- Markdown-Dateien in `claudedocs/` (git-freundlich)
- Templates in Skills (Jinja2)
- Multi-Skill Activation (mehrere Skills gleichzeitig)

**Status:**
- 5/6 Iterationen abgeschlossen (83%)
- Nächster Schritt: Integration E2E Test (Iteration 6)

**Verfügbare Skills:**
1. agile-workflow (Epic/Story/Sprint)
2. testing-philosophy ("Test YOUR Code")
3. development-principles (YAGNI, KISS, SRP)
4. java-best-practices (Java 17-25, Spring, Maven)
5. dependency-analysis (ULTRATHINK)
6. architecture-decisions (ADR)
7. git-smart-commit (Smart Commits)

---

**Version:** 1.0
**Letzte Aktualisierung:** 2025-11-13
**Nächstes Update:** Nach Iteration 6 (E2E Test)
