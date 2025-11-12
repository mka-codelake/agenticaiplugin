# Framework Redesign Session - Erkenntnisse & Entscheidungen

**Datum:** 2025-11-12
**Session-Ziel:** Analyse des agenticai/framework und Redesign für flexiblere, agile Workflows
**Projekt:** Claude Code Plugin mit flexiblem Agile-Workflow-System

---

## Inhaltsverzeichnis

1. [Session-Kontext](#session-kontext)
2. [Framework-Analyse](#framework-analyse)
3. [Problem-Identifikation](#problem-identifikation)
4. [Recherche-Ergebnisse](#recherche-ergebnisse)
5. [Entscheidungen & Begründungen](#entscheidungen--begründungen)
6. [Empfohlene Architektur](#empfohlene-architektur)
7. [Was aus dem Framework übernehmen](#was-aus-dem-framework-übernehmen)
8. [Was verwerfen](#was-verwerfen)
9. [Skill-Konzepte](#skill-konzepte)
10. [Praktische Workflow-Beispiele](#praktische-workflow-beispiele)
11. [Nächste Schritte](#nächste-schritte)

---

## Session-Kontext

### Ursprüngliches Framework
- **Location:** `C:\Dev\repos\agenticai\framework` (WSL: `/mnt/c/Dev/repos/agenticai/framework`)
- **Art:** KI-gesteuertes Software-Entwicklungs-Workflow-Framework für Claude Code
- **Ansatz:** Phasenbasiert mit spezialisierten AI-Agenten
- **Struktur:** 6 Agents, 12 Commands, 8 Configs, 9 Rules, 8 Scripts, 13 Templates
- **Datenhaltung:** PostgreSQL + MongoDB via Workflow MCP Server

### Nutzer-Feedback
- Framework funktioniert grundsätzlich gut
- **ABER:** Zu unflexibel für dynamische Projekte
- Problem: "Wall-of-Text" durch vollständige Requirements vorab (Wasserfall-Problem)
- Neue Erfahrung: High-Level → Epics → Stories → Sprints funktioniert besser
- Dynamische Anforderungen passen nicht in starre Command-Workflows
- Bei neuen Anforderungen muss man quasi von vorne anfangen

### Ziel-Workflow (gewünscht)
1. High-Level System-Beschreibung (Tech-Stack, Architektur, Datenfluss)
2. Epics ableiten (ggf. mit Komponenten-Schnitt)
3. Epic für Epic bearbeiten: Stories schneiden
4. Stories in Sprints planen (Abhängigkeiten beachten)
5. Flexibel: Neue Anforderungen jederzeit als neue Stories/Epics

**Beispiel-Projekt:** Microservice Spring Boot: Kafka → Business Logic → Redis, 3 Komponenten (kafka/, domain/, storage/), Port & Adapter Architektur

---

## Framework-Analyse

### Stärken des Original-Frameworks

**1. Spezialisierte Agenten (6 Agents)**
- Requirements Engineer (Opus): Strukturierte Anforderungen (BR-XXX, FR-XXX, NFR-XXX, C-XXX, A-XXX)
- Solution Architect (Opus): System-Design, ADRs, Tech-Stack
- Planner (Sonnet): Phasen, Dependencies (mit ULTRATHINK), Story Points
- Developer (Sonnet): Code + Tests, YAGNI/KISS/SRP
- Code Reviewer (Sonnet): Qualität, Security, Traceability
- Tester (Haiku): Test Coverage, Edge Cases

**2. Wertvollste Regeln & Prinzipien**
- **Test Philosophy:** "Test YOUR Code, Not THE Code" (nur Business Logic testen)
- **Coding Guidelines:** 1835 Zeilen Java Best Practices
- **Maven/Spring Standards:** Strukturierte Konventionen
- **Requirement Traceability:** Jede Methode referenziert FR-XXX/BR-XXX
- **Dependency Analysis:** ULTRATHINK für kritische Abhängigkeiten
- **Review Strategy:** Setup/Feature/Critical/Hotfix Levels

**3. Nützliche Komponenten**
- **Templates (Jinja2):** Epic, Story, ADR, Phase Summary, Review Dashboard
- **Validation:** 35 Checks (10 auto-fixable), Build/Test/Dependency Validation
- **Dynamic Model Selection:** Opus/Sonnet/Haiku je nach Aufgabe (Cost Optimization)
- **Context Management:** Token Optimization, Verbosity Control

### Schwächen des Original-Frameworks

**1. Starre Command-Struktur**
- Feste Sequenz: `/cl-req → /cl-arch → /cl-plan → /cl-dev → /cl-review`
- Neue Anforderungen = Workflow restart oder manueller Eingriff
- Nicht für iterative, agile Entwicklung geeignet

**2. Wasserfall-Problem**
- Alle Requirements vorab extrahieren → "Wall-of-Text"
- Big Design Up Front statt iterativ
- Review erst nach Implementierung (zu spät für große Änderungen)

**3. Phase State Machine zu starr**
```
PENDING → IMPLEMENTATION_COMPLETE → REVIEW_IN_PROGRESS →
REVIEW_FIXES_NEEDED → FIXES_COMPLETE → PHASE_COMPLETE
```
- Keine Flexibilität für Ad-hoc Änderungen
- Schwierig, Phases zu skippen oder umzuordnen

**4. Agents als separate Entitäten**
- Overhead: Jeder Agent muss separat gestartet werden
- Nutzer muss Commands kennen (`/cl-req`, `/cl-dev`, etc.)
- Nicht natürlich: Konversation besser als Commands

**5. Database-First mit Workflow MCP**
- Abhängigkeit von PostgreSQL + MongoDB
- Setup-Overhead für einfache Projekte
- Schwieriger Einstieg

---

## Problem-Identifikation

### Kern-Problem
**Zu unflexibel für dynamische, agile Anforderungen**

### Konkrete Use Cases, die nicht funktionieren

**Szenario 1: Neue Anforderung während Entwicklung**
- Situation: Epic-001 (Kafka) läuft, neue Anforderung "Dead Letter Queue"
- Problem: Müsste `/cl-req` neu laufen oder manuell Requirements in DB einfügen
- Gewünscht: Einfach neue Story erstellen und in Sprint einplanen

**Szenario 2: Epic-für-Epic Entwicklung**
- Situation: 3 Komponenten (kafka/, domain/, storage/), je 1 Epic
- Problem: Framework will alles vorab planen
- Gewünscht: Epic-001 fertig, dann Epic-002 starten (iterativ)

**Szenario 3: Architektur-Entscheidung während Entwicklung**
- Situation: Beim Codieren merkt man, dass ein Interface anders sein sollte
- Problem: Müsste Architecture-Phase reopenen
- Gewünscht: ADR schreiben, Interface anpassen, weitermachen

### Wasserfall vs. Agile Argumentation
| Aspekt | Framework (Wasserfall) | Gewünscht (Agile) |
|--------|------------------------|-------------------|
| **Requirements** | Alle vorab extrahieren | High-Level → iterativ verfeinern |
| **Architektur** | Komplettes Design vorab | High-Level, dann Epic-für-Epic |
| **Planung** | Alle Phasen auf einmal | Sprint-für-Sprint |
| **Änderungen** | Schwierig (Workflow restart) | Einfach (neue Story) |
| **Review** | Nach Implementierung | Kontinuierlich |
| **Flexibilität** | Niedrig | Hoch |

---

## Recherche-Ergebnisse

### 1. Skills vs. Commands vs. Rules (2025 Best Practices)

**Skills (Auto-activated Task Packs)**
- Aktivieren sich automatisch basierend auf Kontext
- Bestehen aus SKILL.md (YAML frontmatter + Instructions) + optional Scripts/Templates
- Progressive Disclosure: Nur geladen wenn relevant (token-effizient)
- Natürliche Konversation: User sagt "schreib eine Story", Skill aktiviert sich

**When to use:**
- Wiederverwendbare Workflows, die automatisch aktiviert werden sollen
- Guidelines und Best Practices (Testing, Coding Standards)
- Templates und Strukturen (Epic/Story/Sprint)

**Slash Commands (User-Triggered Workflows)**
- User muss explizit `/command` aufrufen
- Für spezifische, bewusste Aktionen

**When to use:**
- Wenn explizite Kontrolle gewünscht ist
- Utility-Funktionen (Export, Clean, Validate)

**Rules (Project Standards)**
- In CLAUDE.md oder anderen Markdown-Dateien
- Immer geladen, fundamental für Projekt

**When to use:**
- Verhaltensweisen, die immer gelten
- Repository-Konventionen
- Grundlegende Workflows

**Quelle:** [Skills are auto-invoked context providers, Commands are user-initiated shortcuts](https://skywork.ai/blog/ai-agent/claude-skills-vs-mcp-vs-llm-tools-comparison-2025/)

### 2. CLAUDE.md Best Practices

**Was sollte rein:**
- Project Tech Stack (kurz!)
- Repository Etiquette (Branch Naming, Merge vs Rebase)
- Developer Environment Setup
- Unexpected Behaviors/Warnings
- Coding Standards, Naming Conventions

**Wichtig:**
- **Max 100-200 Zeilen!** (wird bei jedem Prompt geladen → Token Budget)
- Bei Überschreitung: Details in separate Dateien auslagern und verlinken
- No required format, human-readable

**Hierarchical Structure möglich:**
- Root CLAUDE.md: Allgemein
- Subfolder CLAUDE.md: Spezifisch (z.B. `/frontend/CLAUDE.md`)

**Quelle:** [CLAUDE.md should be 100-200 lines max, move details to other files](https://www.eesel.ai/blog/claude-code-best-practices)

### 3. Skills Folder Structure

**Standard Structure:**
```
.claude/skills/my-skill/
├── SKILL.md              # YAML frontmatter + Instructions
├── scripts/              # Executable Python/Bash scripts
├── references/           # Documentation loaded into context
└── assets/               # Templates, binary files
```

**File Paths:**
- **Immer Forward Slashes** (Unix-style), auch auf Windows!
- Relative Paths: `scripts/helper.py`, `references/guide.md`

**Progressive Disclosure:**
- Claude lädt reference.md nur wenn benötigt
- Vermeidet redundante Dokumentation
- Token-effizient

**Quelle:** [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)

### 4. Agile AI Workflows

**Epic → Story → Sprint Hierarchy:**
- **Epic:** 1-4 Monate, multiple Sprints
- **Story:** 1 Sprint oder weniger, liefert Value
- **Sprint:** 1-2 Wochen

**Best Practices:**
- Epics sollten < 8 Sprints sein (sonst aufteilen)
- Stories müssen INVEST-Kriterien erfüllen
- Dependencies explizit dokumentieren

**AI-Assisted Development:**
- AI validiert Story Completeness, INVEST-Kriterien
- 3x bessere Adoption bei Integration in bestehende Workflows
- Review Checkpoints beibehalten (auch bei AI-generierten Inhalten)

**Quelle:** [Agile Epics and Stories Best Practices](https://www.atlassian.com/agile/project-management/epics-stories-themes)

### 5. Flexible AI Frameworks

**Iterative & Adaptive Approach:**
- Continuous improvement statt Big Design Up Front
- Feedback-Loops in jeder Phase
- Realistic Milestones für Discovery & Refinement

**Agile for AI Projects:**
- Flexibility für rapidly changing demands
- Iterative pilot projects
- Real-world feedback integration

**Quelle:** [Agile Methodologies for AI Success](https://rtslabs.com/agile-methodologies-for-ai-project-success)

---

## Entscheidungen & Begründungen

### 1. Skills für Verhaltensweisen statt Commands ✅

**Entscheidung:** Keine `/cl-req`, `/cl-dev` Commands. Stattdessen Skills, die sich automatisch aktivieren.

**Begründung:**
- Natürliche Konversation statt Command-Syntax
- Automatische Aktivierung basierend auf Kontext
- Flexibel erweiterbar (neue Skills ohne Workflow-Änderung)
- Progressive Disclosure (token-effizient)

**Beispiel:**
- User: "Schreib mir Stories für Kafka-Integration"
- Claude aktiviert automatisch: `agile-workflow` + `story-structure` Skills
- Keine `/cl-story` Command nötig

### 2. CLAUDE.md + agentic.md Hybrid-Ansatz ✅

**Entscheidung:** Beide Dateien nutzen, für unterschiedliche Zwecke.

**Begründung:**
- **CLAUDE.md (100-200 Zeilen):**
  - Automatisch bei jedem Prompt geladen
  - Verhaltensweisen, Workflows, Repository-Konventionen
  - Verweis auf agentic.md
  - Token-optimiert (max 200 Zeilen)

- **agentic.md (unbegrenzt, aber tokenoptimiert):**
  - Vollständiger Projektkontext
  - System Overview, Architektur, Tech-Stack Details
  - Design Decisions, ADRs
  - Code Structure
  - Wird bei Projektstart oder auf Nachfrage gelesen

**Vorteil:** Bewährter agentic.md Ansatz bleibt, CLAUDE.md für fundamentale Workflows ergänzt.

### 3. claudedocs/ statt Workflow-MCP-DB ✅

**Entscheidung:** Markdown-Dateien in `claudedocs/` statt PostgreSQL + MongoDB.

**Begründung:**
- **Keine DB-Abhängigkeit:** Einfacherer Setup, funktioniert sofort
- **Versionierbar:** Git-freundlich, Diff, History
- **Flexibel:** Jederzeit editierbar, kein Schema-Lock
- **Transparent:** Human-readable
- **Portabel:** Funktioniert überall

**Struktur:**
```
claudedocs/
├── epics/       # EPIC-XXX-description.md
├── stories/     # STORY-XXX-description.md
├── sprints/     # SPRINT-XX.md
└── tasks/       # TASK-XXX-description.md (optional)
```

### 4. Keine separaten Agents ✅

**Entscheidung:** Claude nutzt Skills kontextabhängig, keine separaten Requirements Engineer / Developer / etc. Agents.

**Begründung:**
- Weniger Overhead (kein Agent-Launch)
- Natürlicher: Claude ist "ein Agent mit vielen Skills"
- Flexibler: Skills können kombiniert werden
- User muss keine Agent-Namen kennen

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
- **Cohesion:** Template gehört zu Skill-Logik
- **Progressive Disclosure:** Nur geladen wenn Skill aktiv
- **Modularität:** Skill + Template = Einheit
- **Wiederverwendbarkeit:** Skill kann in andere Projekte kopiert werden

### 6. Ordnerstruktur in CLAUDE.md ✅

**Entscheidung:** Ordnerstruktur-Konventionen in CLAUDE.md (kurz) dokumentieren.

**Begründung:**
- Fundamental für Workflow → sollte immer geladen sein
- Sehr kurz (2-3 Zeilen)
- Alternative (Skill) wäre Overhead für simple Convention

**In CLAUDE.md:**
```markdown
# Project Structure
- Epics: `claudedocs/epics/EPIC-XXX.md`
- Stories: `claudedocs/stories/STORY-XXX.md`
- Sprints: `claudedocs/sprints/SPRINT-XX.md`
```

---

## Empfohlene Architektur

### Vollständige Ordnerstruktur

```
/project-root/
│
├── CLAUDE.md                          # Verhaltensweisen, Workflows (100-200 Zeilen)
│                                      # - Ordnerstruktur-Übersicht
│                                      # - Repository-Konventionen
│                                      # - Verweis auf agentic.md
│
├── agentic.md                         # Vollständiger Projektkontext (tokenoptimiert)
│                                      # - System Overview
│                                      # - Architektur (Detail)
│                                      # - Tech-Stack (Detail)
│                                      # - Design Decisions
│                                      # - Code Structure
│                                      # - Current State
│
├── claudedocs/                        # Agile Artifacts (Markdown)
│   ├── epics/
│   │   └── EPIC-001-kafka-integration.md
│   ├── stories/
│   │   ├── STORY-001-kafka-consumer-setup.md
│   │   ├── STORY-002-message-deserialization.md
│   │   └── STORY-003-port-interface.md
│   ├── sprints/
│   │   ├── SPRINT-01.md
│   │   └── SPRINT-02.md
│   └── tasks/                         # Optional: Technische Tasks
│       └── TASK-001-setup-kafka-docker.md
│
└── .claude/
    ├── skills/
    │   │
    │   ├── agile-workflow/            # Epic/Story/Sprint Management
    │   │   ├── SKILL.md               # Auto-activated when managing Epics/Stories
    │   │   ├── templates/
    │   │   │   ├── epic.md.j2
    │   │   │   ├── story.md.j2
    │   │   │   └── sprint.md.j2
    │   │   └── reference.md           # Ausführliche Workflow-Doku
    │   │
    │   ├── testing-philosophy/        # "Test YOUR Code, Not THE Code"
    │   │   ├── SKILL.md               # Auto-activated when writing tests
    │   │   └── reference.md           # Test Necessity Matrix, Code Classification
    │   │
    │   ├── java-best-practices/       # Coding Guidelines
    │   │   ├── SKILL.md               # Auto-activated when writing Java code
    │   │   └── reference.md           # Spring, Maven, Patterns (1835 Zeilen aus Framework)
    │   │
    │   ├── dependency-analysis/       # Sprint Planning mit ULTRATHINK
    │   │   ├── SKILL.md               # Auto-activated when planning dependencies
    │   │   └── reference.md           # ULTRATHINK Prompts, Dependency Rules
    │   │
    │   └── architecture-decisions/    # ADR Writing
    │       ├── SKILL.md               # Auto-activated when making architecture decisions
    │       ├── templates/
    │       │   └── adr.md.j2
    │       └── reference.md           # ADR Format, Best Practices
    │
    └── settings.local.json            # Permissions, MCP Config (optional)
```

### Datei-Beispiele

#### CLAUDE.md (Beispiel)
```markdown
# Workflow
- Agile: High-Level → Epics → Stories → Sprints
- Lies `agentic.md` bei Projektstart für vollständigen Kontext
- Neue Anforderungen: Flexibel als Stories/Epics hinzufügen

# Project Structure
- Epics: `claudedocs/epics/EPIC-XXX-description.md`
- Stories: `claudedocs/stories/STORY-XXX-description.md`
- Sprints: `claudedocs/sprints/SPRINT-XX.md`
- Tasks: `claudedocs/tasks/TASK-XXX-description.md` (optional)

# Repository Konventionen
- Branch Naming: `feature/STORY-XXX-description`
- Commit Messages: Conventional Commits Format
- Nie direkt committen ohne Bestätigung

# Build & Test
- Maven: `./mvnw clean install`
- Tests nur für Business Logic ("Test YOUR Code, Not THE Code")
- Skills aktivieren sich automatisch (testing-philosophy, java-best-practices)

# Tech Stack (Kurz)
- Java 17, Spring Boot 3.x, Maven
- Architektur: Port & Adapter (Hexagonal)
- Siehe `agentic.md` für Details
```

#### agentic.md (Beispiel)
```markdown
# System Overview
Microservice: Kafka Consumer → Business Logic → Redis Storage

**Purpose:** Verarbeitet Nachrichten aus Kafka Topic, führt Business-Transformationen durch, persistiert Ergebnisse in Redis.

# Architecture
**Pattern:** Port & Adapter (Hexagonal Architecture)

## Component Structure
├── kafka/      # Input Adapter (Port für Messaging)
├── domain/     # Core Business Logic (Ports definiert)
└── storage/    # Output Adapter (Port für Persistence)

## Interface Design
- `InputPort` (domain/): `void processMessage(MessageDTO dto)`
- `OutputPort` (domain/): `void saveResult(ResultEntity entity)`
- Adapters implementieren Ports, Domain kennt nur Interfaces

# Tech Stack (Detail)
- Java 17
- Spring Boot 3.2.0
- Kafka Client 3.6.0
- Redis Client: Lettuce 6.3.0
- Build: Maven 3.9.5

# Design Decisions
- Port & Adapter: Testbarkeit, Framework-Unabhängigkeit
- Redis: Low-Latency, Key-Value perfekt für Result Storage
- Kafka: Event-Driven, Decoupling

# Current State
- Epic: EPIC-001 Kafka Integration (In Progress)
- Sprint: Sprint 1 (STORY-001, STORY-002)
- Next: STORY-003 Port Interface Definition
```

#### .claude/skills/agile-workflow/SKILL.md (Beispiel)
```yaml
---
name: agile-workflow
description: Structures and manages Epics, Stories, and Sprints with templates and dependency analysis
---

Use this skill when creating or managing Epics, Stories, or Sprints.

## Templates
Located in `templates/`:
- `epic.md.j2` - Epic structure
- `story.md.j2` - User Story structure
- `sprint.md.j2` - Sprint plan structure

## File Locations
Create files in:
- **Epics:** `claudedocs/epics/EPIC-XXX-description.md`
- **Stories:** `claudedocs/stories/STORY-XXX-description.md`
- **Sprints:** `claudedocs/sprints/SPRINT-XX.md`

## File Naming Convention
- Epics: `EPIC-001-kafka-integration.md` (zero-padded, lowercase-with-dashes)
- Stories: `STORY-001-kafka-consumer-setup.md`
- Sprints: `SPRINT-01.md`

## Story Structure (INVEST Criteria)
Every story must include:
1. **Title** and **Description** (User Story format: "As a X, I want Y, so that Z")
2. **Acceptance Criteria** (testable, specific)
3. **Story Points** (Fibonacci: 1, 2, 3, 5, 8, 13)
4. **Dependencies** (if any, reference other stories)
5. **Epic Reference** (link to parent Epic)

## Dependency Analysis
Use **ULTRATHINK** for critical dependency analysis when:
- Multiple stories have complex interdependencies
- Architecture decisions affect story order
- Sprint planning requires dependency validation
- Circular dependencies suspected

## Sprint Planning
- Sprint duration: 1-2 weeks
- Story points per sprint: Team capacity (typically 20-30 points)
- Dependencies: Must be resolved before sprint start
- Review dependencies before finalizing sprint plan

See `reference.md` for detailed workflow documentation.
```

#### .claude/skills/agile-workflow/templates/story.md.j2 (Beispiel)
```jinja2
# STORY-{{ id }}: {{ title }}

**Epic:** [EPIC-{{ epic_id }}](../epics/EPIC-{{ epic_id }}-*.md)
**Story Points:** {{ story_points }}
**Sprint:** {{ sprint }} (planned)
**Status:** {{ status }}

## User Story
{{ user_story }}

## Description
{{ description }}

## Acceptance Criteria
{% for criterion in acceptance_criteria %}
- [ ] {{ criterion }}
{% endfor %}

## Technical Notes
{{ technical_notes }}

## Dependencies
{% if dependencies %}
{% for dep in dependencies %}
- [STORY-{{ dep.id }}](STORY-{{ dep.id }}-*.md) - {{ dep.reason }}
{% endfor %}
{% else %}
*No dependencies*
{% endif %}

## Implementation Notes
*To be filled during implementation*

- **Requirement Traceability:** FR-XXX, BR-XXX references
- **Design Decisions:** ADR references if applicable
- **Technical Debt:** Any shortcuts or TODOs

## Review Notes
*To be filled during review*

- **Code Quality:**
- **Test Coverage:**
- **Security Concerns:**

## Definition of Done
- [ ] Code implemented according to acceptance criteria
- [ ] Tests written for business logic (>80% coverage)
- [ ] Code reviewed and approved
- [ ] Documentation updated (if applicable)
- [ ] Integrated into main branch
```

#### .claude/skills/testing-philosophy/SKILL.md (Beispiel)
```yaml
---
name: testing-philosophy
description: Guides testing decisions based on code classification - "Test YOUR Code, Not THE Code"
---

This skill implements the philosophy: **"Test YOUR Code, Not THE Code"**

Only test **business logic**, not frameworks, getters/setters, or generated code.

## Code Classification

**Business Code (MUST test, >80% coverage):**
- Business rules, calculations, transformations
- Domain logic, validation rules
- Complex algorithms
- State machines

**Framework Code (NO tests):**
- Spring Boot Auto-Configuration
- JPA Entity mappings (unless custom logic)
- Controller mappings (unless custom validation)
- Configuration classes

**Generated Code (NO tests):**
- Lombok getters/setters/constructors
- MapStruct mappers
- QueryDSL Q-classes

**Infrastructure Code (Minimal tests):**
- Database repositories: Only custom queries
- Kafka listeners: Only business logic extraction
- REST clients: Only retry/fallback logic

## Test Necessity Matrix

| Code Type | Example | Test Required? | Coverage Goal |
|-----------|---------|----------------|---------------|
| Business Logic | `calculateDiscount()` | YES | >80% |
| Validation Rules | `validateOrder()` | YES | 100% |
| Getters/Setters | `getName()` | NO | 0% |
| JPA Entity | `@Entity User` | NO | 0% |
| Spring Config | `@Configuration` | NO | 0% |
| Custom Query | `@Query("...")` | YES | 100% |
| Kafka Listener | `@KafkaListener` | YES (logic only) | >80% |

## Anti-Patterns (DO NOT do this)

❌ Testing getters/setters:
```java
@Test
void testGetName() {
    user.setName("John");
    assertEquals("John", user.getName());
}
```

❌ Testing Spring Boot auto-configuration:
```java
@Test
void testApplicationContextLoads() {
    assertNotNull(applicationContext);
}
```

❌ Testing framework behavior:
```java
@Test
void testJpaRepositorySave() {
    repository.save(entity);
    verify(entityManager).persist(entity);
}
```

## Best Practices

✅ Test business logic extraction:
```java
@Test
void shouldCalculateDiscountCorrectly() {
    // Business logic test
    BigDecimal result = discountService.calculate(order);
    assertEquals(expectedDiscount, result);
}
```

✅ Test edge cases:
```java
@Test
void shouldHandleNullOrderGracefully() {
    assertThrows(ValidationException.class,
        () -> discountService.calculate(null));
}
```

See `reference.md` for detailed examples and classification rules.
```

---

## Was aus dem Framework übernehmen

### ✅ ÜBERNEHMEN (in Skills umwandeln)

**1. Test Philosophy: "Test YOUR Code, Not THE Code"**
- **Skill:** `testing-philosophy`
- **Inhalt:**
  - Code Classification (Business/Framework/Generated)
  - Test Necessity Matrix
  - Anti-Patterns
  - Coverage Goals (>80% Business Logic, 0% Setup)
- **Quelle:** Framework `.claude/rules/TEST.md`

**2. Java Best Practices (1835 Zeilen)**
- **Skill:** `java-best-practices`
- **Inhalt:**
  - Spring Boot Patterns
  - Maven Standards
  - YAGNI, KISS, Single Responsibility
  - Naming Conventions
  - Error Handling
- **Quelle:** Framework `.claude/rules/JAVA.md`, `MAVEN.md`, `SPRING.md`

**3. Requirement Traceability**
- **Integration:** In `agile-workflow` Skill
- **Konzept:** Jede Methode referenziert FR-XXX/BR-XXX im Javadoc
- **Story Template:** Enthält Requirement IDs
- **Quelle:** Framework Agent-Logik

**4. Dependency Analysis mit ULTRATHINK**
- **Skill:** `dependency-analysis`
- **Inhalt:**
  - ULTRATHINK Prompts für kritische Dependencies
  - Circular Dependency Detection
  - Critical Path Analysis
- **Quelle:** Framework Planner Agent

**5. Templates (Jinja2)**
- **Epic Template:** → `agile-workflow/templates/epic.md.j2`
- **Story Template:** → `agile-workflow/templates/story.md.j2`
- **Sprint Template:** → `agile-workflow/templates/sprint.md.j2`
- **ADR Template:** → `architecture-decisions/templates/adr.md.j2`
- **Quelle:** Framework `.claude/templates/`

**6. Review Philosophy**
- **Skill:** `code-review` (optional, für Self-Review)
- **Inhalt:**
  - Quality Checks (Complexity, Maintainability)
  - Security (OWASP Top 10)
  - Performance (N+1 Queries, Caching)
  - Traceability (FR-XXX Referenzen vorhanden?)
- **Quelle:** Framework Code Reviewer Agent, `.claude/rules/REVIEW.md`

**7. Dynamic Model Selection**
- **Integration:** In Skill-Beschreibungen erwähnen
- **Konzept:** Opus für Architektur, Sonnet für Development, Haiku für Reviews
- **Quelle:** Framework `.claude/config/model-selection.yaml`

**8. Validation Scripts (angepasst)**
- **Build Checker:** → `.claude/scripts/build-checker.sh`
- **Test Validator:** → `.claude/scripts/test-validator.sh`
- **Dependency Validator:** → `.claude/scripts/dependency-validator.sh`
- **Quelle:** Framework `.claude/scripts/`

**9. Anti-Verbosity Rules**
- **Integration:** In CLAUDE.md + alle Skills
- **Konzept:** Token-Optimierung, keine Prosa, fokussiert auf Fakten
- **Quelle:** Framework `.claude/config/anti-verbosity-rules.yaml`

**10. Story Points (Fibonacci)**
- **Integration:** In `agile-workflow` Skill
- **Scale:** 1, 2, 3, 5, 8, 13, 21
- **Quelle:** Framework Planner Agent

---

## Was verwerfen

### ❌ NICHT ÜBERNEHMEN

**1. Starre Commands**
- `/cl-req`, `/cl-arch`, `/cl-plan`, `/cl-dev`, `/cl-review`
- **Grund:** Zu unflexibel, nicht für agile Workflows geeignet
- **Ersatz:** Natürliche Konversation + auto-aktivierte Skills

**2. Phase State Machine**
```
PENDING → IMPLEMENTATION_COMPLETE → REVIEW_IN_PROGRESS →
REVIEW_FIXES_NEEDED → FIXES_COMPLETE → PHASE_COMPLETE
```
- **Grund:** Zu starr, keine Ad-hoc Änderungen möglich
- **Ersatz:** Status in Story-Dateien (Draft/In Progress/Review/Done), flexibel änderbar

**3. Agents als separate Entitäten**
- Requirements Engineer Agent, Solution Architect Agent, Developer Agent, etc.
- **Grund:** Overhead, User muss Commands kennen
- **Ersatz:** Claude nutzt Skills kontextabhängig

**4. Workflow MCP Server (PostgreSQL + MongoDB)**
- **Grund:** Setup-Overhead, Abhängigkeit von DB
- **Ersatz:** Markdown-Dateien in `claudedocs/`

**5. Big Design Up Front (alle Requirements vorab)**
- **Grund:** Wasserfall-Problem, "Wall-of-Text"
- **Ersatz:** High-Level → Epics → Stories iterativ

**6. Mandatory Review Iterations**
- **Grund:** Zu formell, starr
- **Ersatz:** Review bei Bedarf, flexibel

**7. Document Paths Config (YAML)**
- `.claude/config/document-paths.yaml`
- **Grund:** Overhead für simple Ordnerstruktur
- **Ersatz:** Direkt in CLAUDE.md (3 Zeilen)

**8. Review Strategy Config (YAML)**
- `.claude/config/review-strategy.yaml` (Setup/Feature/Critical/Hotfix)
- **Grund:** Zu komplex für flexibles Arbeiten
- **Ersatz:** Review bei Bedarf, nach eigenem Ermessen

**9. Test Necessity Matrix Config (YAML)**
- `.claude/config/test-necessity-matrix.yaml`
- **Grund:** Besser in Skill-Dokumentation
- **Ersatz:** In `testing-philosophy/reference.md` (human-readable)

**10. Documentation Modes Config (YAML)**
- `.claude/config/documentation-modes.yaml`
- **Grund:** Overengineering
- **Ersatz:** Einfache Regel in CLAUDE.md ("token-optimiert, keine Prosa")

---

## Skill-Konzepte

### Core Skills (Must-Have)

#### 1. agile-workflow
**Purpose:** Epic/Story/Sprint Management mit Templates

**Structure:**
```
.claude/skills/agile-workflow/
├── SKILL.md
├── templates/
│   ├── epic.md.j2
│   ├── story.md.j2
│   └── sprint.md.j2
└── reference.md
```

**Auto-activated when:**
- User sagt "Erstelle Epic", "Schreib Stories", "Plan Sprint"
- Keyword-Matching: Epic, Story, Sprint, Backlog, Planning

**Capabilities:**
- Epic Creation (mit Scope, Out-of-Scope)
- Story Slicing (INVEST Criteria, Acceptance Criteria)
- Sprint Planning (Dependencies, Capacity)
- Dependency Analysis (mit ULTRATHINK für komplexe Fälle)

**Templates:**
- Epic: Title, Goal, Scope, Out-of-Scope, Stories, Status
- Story: User Story, Acceptance Criteria, Story Points, Dependencies, Epic Reference
- Sprint: Goal, Stories, Capacity, Start/End Date, Review Notes

#### 2. testing-philosophy
**Purpose:** "Test YOUR Code, Not THE Code" - Business Logic vs Framework

**Structure:**
```
.claude/skills/testing-philosophy/
├── SKILL.md
└── reference.md
```

**Auto-activated when:**
- User sagt "Schreib Tests", "Test Coverage"
- Claude schreibt Code (automatisch, um Tests mit zu generieren)

**Capabilities:**
- Code Classification (Business/Framework/Generated/Infrastructure)
- Test Necessity Decision (basierend auf Typ)
- Coverage Goals (>80% Business, 0% Framework)
- Anti-Pattern Detection (keine Getter/Setter Tests)

**Reference.md enthält:**
- Test Necessity Matrix (Tabelle)
- Beispiele für gute/schlechte Tests
- Edge Case Guidelines

#### 3. java-best-practices
**Purpose:** Spring Boot, Maven, Coding Standards

**Structure:**
```
.claude/skills/java-best-practices/
├── SKILL.md
└── reference.md
```

**Auto-activated when:**
- User sagt "Schreib Java Code", "Implementiere Feature"
- Code-Dateien: `*.java` werden bearbeitet

**Capabilities:**
- Spring Boot Patterns (Controller, Service, Repository)
- Maven Standards (Dependencies, Plugins, Lifecycle)
- YAGNI, KISS, Single Responsibility
- Naming Conventions
- Error Handling (Custom Exceptions, @ControllerAdvice)

**Reference.md enthält:**
- 1835 Zeilen aus Framework JAVA.md
- Spring Boot Best Practices
- Maven Konfiguration
- Code Patterns

#### 4. dependency-analysis
**Purpose:** ULTRATHINK für kritische Dependency-Analyse

**Structure:**
```
.claude/skills/dependency-analysis/
├── SKILL.md
└── reference.md
```

**Auto-activated when:**
- User sagt "Plan Sprint", "Prüfe Abhängigkeiten", "Dependencies"
- Multiple Stories mit potentiellen Dependencies

**Capabilities:**
- ULTRATHINK Prompts für tiefe Analyse
- Circular Dependency Detection
- Critical Path Identification
- Dependency Graph Visualization (Markdown)

**Reference.md enthält:**
- ULTRATHINK Prompt Templates
- Dependency Types (Technical, Business, Data)
- Circular Dependency Resolution Strategies

#### 5. architecture-decisions
**Purpose:** ADR (Architectural Decision Records) erstellen

**Structure:**
```
.claude/skills/architecture-decisions/
├── SKILL.md
├── templates/
│   └── adr.md.j2
└── reference.md
```

**Auto-activated when:**
- User sagt "Architektur-Entscheidung", "ADR", "Design Decision"
- Wichtige Technologie-Wahl (Framework, DB, Pattern)

**Capabilities:**
- ADR Creation (Context, Decision, Consequences, Alternatives)
- ADR Numbering (ADR-001, ADR-002, ...)
- Status Tracking (Proposed, Accepted, Deprecated, Superseded)

**Template:**
- Title, Status, Context, Decision, Consequences, Alternatives, Related ADRs

---

## Praktische Workflow-Beispiele

### Beispiel 1: Neues Projekt starten

**User:**
> "Neues Projekt: Microservice Kafka → Business Logic → Redis. Port & Adapter Architektur. 3 Komponenten: kafka/, domain/, storage/."

**Claude:**
```
[Liest automatisch CLAUDE.md]
[Sieht: "Lies agentic.md bei Projektstart"]
[Erstellt agentic.md mit System Overview]

Verstanden. Ich habe die agentic.md mit folgendem Inhalt erstellt:
- System: Kafka Consumer → Business Logic → Redis Storage
- Architektur: Port & Adapter (Hexagonal)
- Komponenten: kafka/ (Input), domain/ (Core), storage/ (Output)
- Tech-Stack: Java 17, Spring Boot 3.x, Kafka, Redis, Maven

Ich lege auch die Ordnerstruktur an:

claudedocs/
├── epics/
├── stories/
├── sprints/
└── tasks/

Bereit für Epic-Planung. Was ist dein High-Level Ziel für das erste Epic?
```

---

### Beispiel 2: Epic erstellen

**User:**
> "Erstes Epic: Kafka-Integration. Consumer soll Nachrichten lesen, deserialisieren, an Domain weiterleiten."

**Claude:**
```
[Skill 'agile-workflow' aktiviert sich automatisch]
[Nutzt epic.md.j2 Template]

Epic erstellt: claudedocs/epics/EPIC-001-kafka-integration.md

# EPIC-001: Kafka Integration

**Goal:** Kafka Consumer implementieren, der Nachrichten aus Topic liest,
deserialisiert und via Port an Domain weiterleitet.

**Scope:**
- Kafka Consumer Setup
- Message Deserialization (JSON → DTO)
- InputPort Interface Definition
- Adapter-Implementierung (Kafka → InputPort)

**Out-of-Scope:**
- Business Logic (kommt in EPIC-002 Domain)
- Redis Storage (kommt in EPIC-003 Storage)

**Component:** kafka/ (Input Adapter)

Soll ich das Epic in Stories schneiden?
```

---

### Beispiel 3: Stories schneiden

**User:**
> "Ja, schneide in Stories. Achte auf Dependencies."

**Claude:**
```
[Skill 'agile-workflow' + 'dependency-analysis' aktiv]
[Nutzt ULTRATHINK für Dependencies]

Ich analysiere die Dependencies...

[ULTRATHINK: Kafka Consumer muss zuerst existieren, bevor Deserialization
funktioniert. InputPort muss definiert sein, bevor Adapter implementiert wird.
Dependency Chain: STORY-001 → STORY-002 → STORY-003]

3 Stories erstellt:

**STORY-001: Kafka Consumer Setup** (3 Story Points)
- Acceptance Criteria:
  - Consumer liest von Topic "input-messages"
  - Konfiguration via application.yml
  - Health Check zeigt Kafka-Connection Status
- Dependencies: Keine
- File: claudedocs/stories/STORY-001-kafka-consumer-setup.md

**STORY-002: Message Deserialization** (2 Story Points)
- Acceptance Criteria:
  - JSON Messages werden zu MessageDTO deserialisiert
  - Error Handling bei ungültigen Messages (Log + Skip)
  - Dead Letter Queue für fehlerhafte Messages
- Dependencies: STORY-001 (braucht Consumer)
- File: claudedocs/stories/STORY-002-message-deserialization.md

**STORY-003: InputPort Interface** (2 Story Points)
- Acceptance Criteria:
  - InputPort Interface in domain/ definiert
  - Kafka Adapter ruft InputPort.processMessage() auf
  - Unit Tests für Adapter (Mock InputPort)
- Dependencies: STORY-002 (braucht MessageDTO)
- File: claudedocs/stories/STORY-003-inputport-interface.md

**Dependency Graph:**
```
STORY-001 (Consumer)
    ↓
STORY-002 (Deserialization)
    ↓
STORY-003 (InputPort)
```

Sprint-Planung: Soll ich Sprints vorschlagen?
```

---

### Beispiel 4: Sprint planen

**User:**
> "Ja, plan 2 Sprints. Capacity: 5 Story Points pro Sprint."

**Claude:**
```
[Skill 'agile-workflow' aktiv]

Sprint-Planung basierend auf Dependencies und Capacity:

**SPRINT-01** (5 Story Points, 2 Wochen)
- STORY-001: Kafka Consumer Setup (3 SP)
- STORY-002: Message Deserialization (2 SP)
- Goal: Kafka Consumer liest und deserialisiert Nachrichten
- File: claudedocs/sprints/SPRINT-01.md

**SPRINT-02** (2 Story Points, 2 Wochen)
- STORY-003: InputPort Interface (2 SP)
- Goal: Adapter ruft Domain-Port auf (Ende-zu-Ende Integration)
- File: claudedocs/sprints/SPRINT-02.md

Dependencies sind erfüllt: STORY-001 → STORY-002 im selben Sprint,
STORY-003 im nächsten Sprint (braucht STORY-002).

Soll ich mit STORY-001 Implementierung starten?
```

---

### Beispiel 5: Story implementieren

**User:**
> "Ja, implementiere STORY-001."

**Claude:**
```
[Skill 'java-best-practices' + 'testing-philosophy' aktiviert]
[Liest STORY-001 für Acceptance Criteria]

Ich implementiere STORY-001: Kafka Consumer Setup.

Acceptance Criteria:
1. Consumer liest von Topic "input-messages"
2. Konfiguration via application.yml
3. Health Check zeigt Kafka-Connection Status

[Erstellt Dateien:]
- src/main/java/kafka/KafkaConsumerConfig.java
- src/main/java/kafka/MessageConsumer.java
- src/main/resources/application.yml
- src/main/java/kafka/KafkaHealthIndicator.java

[Testing Philosophy: Framework Code (Kafka Config) → keine Tests.
Business Logic (Health Check) → Test schreiben.]

- src/test/java/kafka/KafkaHealthIndicatorTest.java

Implementierung abgeschlossen. Health Check verfügbar unter /actuator/health/kafka.

Soll ich STORY-001 als "Done" markieren oder möchtest du reviewen?
```

---

### Beispiel 6: Neue Anforderung während Sprint

**User:**
> "Neue Anforderung: Wir brauchen auch Dead Letter Queue für fehlerhafte Messages."

**Claude:**
```
[Skill 'agile-workflow' aktiviert]

Ich erstelle eine neue Story für Dead Letter Queue:

**STORY-004: Dead Letter Queue** (3 Story Points)
- Acceptance Criteria:
  - Fehlerhafte Messages werden in DLQ Topic geschrieben
  - Max 3 Retry-Versuche vor DLQ
  - DLQ Topic: "input-messages-dlq"
  - Monitoring: Counter für DLQ Messages
- Dependencies: STORY-001 (Consumer), STORY-002 (Deserialization)
- Epic: EPIC-001 Kafka Integration
- File: claudedocs/stories/STORY-004-dead-letter-queue.md

Da Dependencies (STORY-001, STORY-002) bereits in SPRINT-01 sind,
kann STORY-004 in SPRINT-02 geplant werden.

**Aktualisierte Sprint-Planung:**

SPRINT-02 (5 Story Points):
- STORY-003: InputPort Interface (2 SP)
- STORY-004: Dead Letter Queue (3 SP)

Soll ich SPRINT-02.md aktualisieren?
```

**User:**
> "Ja, aktualisiere SPRINT-02."

**Claude:**
```
[Aktualisiert claudedocs/sprints/SPRINT-02.md]

SPRINT-02 aktualisiert. Neue Story STORY-004 hinzugefügt.

SPRINT-02 ist jetzt bei Capacity (5 SP). Bereit für Implementierung nach SPRINT-01.
```

**→ Siehst du? Flexible Anpassung, keine Workflow-Neustarts nötig!**

---

### Beispiel 7: Architektur-Entscheidung während Entwicklung

**User:**
> "Ich überlege, ob wir für Message Deserialization Jackson oder Gson nutzen sollten."

**Claude:**
```
[Skill 'architecture-decisions' aktiviert]

Das ist eine Architektur-Entscheidung. Ich erstelle ein ADR.

**ADR-001: Message Deserialization Library**

**Status:** Proposed

**Context:**
Kafka Consumer muss JSON Messages in MessageDTO deserialisieren.
Zwei Kandidaten: Jackson (Spring Boot Default) vs. Gson (Google).

**Decision:**
Nutze **Jackson** für Message Deserialization.

**Rationale:**
1. Spring Boot Default: Bereits in Dependencies
2. Bessere Spring Integration (@JsonProperty, @JsonFormat)
3. Performance: Schneller als Gson bei großen Messages
4. Community: Größer, mehr Support

**Consequences:**
- Positive: Keine zusätzliche Dependency, nahtlose Spring-Integration
- Negative: Etwas komplexere API als Gson
- Neutral: Team muss Jackson Annotations lernen (Standard-Wissen)

**Alternatives Considered:**
- **Gson:** Einfachere API, aber zusätzliche Dependency, schlechtere Spring-Integration

**Related ADRs:** None

File: claudedocs/adrs/ADR-001-message-deserialization-library.md

Soll ich Jackson in STORY-002 implementieren?
```

---

## Nächste Schritte

### Phase 1: Core Setup (Essentials)

**1. CLAUDE.md erstellen**
- [ ] Workflow-Beschreibung (Agile Epics → Stories → Sprints)
- [ ] Ordnerstruktur-Konventionen (claudedocs/)
- [ ] Repository-Konventionen (Branch Naming, Commits)
- [ ] Tech-Stack Übersicht (kurz)
- [ ] Verweis auf agentic.md
- [ ] Max 100-200 Zeilen

**2. agentic.md Template erstellen**
- [ ] System Overview Section
- [ ] Architecture Section (Port & Adapter)
- [ ] Tech Stack (Detail) Section
- [ ] Design Decisions Section
- [ ] Code Structure Section
- [ ] Current State Section
- Token-optimiert, keine Prosa

**3. claudedocs/ Ordnerstruktur anlegen**
- [ ] `claudedocs/epics/`
- [ ] `claudedocs/stories/`
- [ ] `claudedocs/sprints/`
- [ ] `claudedocs/tasks/` (optional)
- [ ] `claudedocs/adrs/` (für Architectural Decision Records)

### Phase 2: Core Skills (Must-Have)

**4. agile-workflow Skill erstellen**
- [ ] `.claude/skills/agile-workflow/SKILL.md`
- [ ] `templates/epic.md.j2`
- [ ] `templates/story.md.j2`
- [ ] `templates/sprint.md.j2`
- [ ] `reference.md` (INVEST, Dependencies, Sprint Planning)

**5. testing-philosophy Skill erstellen**
- [ ] `.claude/skills/testing-philosophy/SKILL.md`
- [ ] `reference.md` (Test Necessity Matrix, Examples)
- [ ] Aus Framework TEST.md übernehmen

**6. java-best-practices Skill erstellen**
- [ ] `.claude/skills/java-best-practices/SKILL.md`
- [ ] `reference.md` (1835 Zeilen aus Framework JAVA.md)
- [ ] Spring Boot Patterns
- [ ] Maven Standards

### Phase 3: Advanced Skills (Optional, aber empfohlen)

**7. dependency-analysis Skill erstellen**
- [ ] `.claude/skills/dependency-analysis/SKILL.md`
- [ ] `reference.md` (ULTRATHINK Prompts, Circular Detection)

**8. architecture-decisions Skill erstellen**
- [ ] `.claude/skills/architecture-decisions/SKILL.md`
- [ ] `templates/adr.md.j2`
- [ ] `reference.md` (ADR Format, Numbering, Status)

**9. code-review Skill erstellen (optional)**
- [ ] `.claude/skills/code-review/SKILL.md`
- [ ] `reference.md` (Quality, Security, Performance Checks)

### Phase 4: Testing & Validation

**10. Test mit Beispiel-Projekt**
- [ ] Neues Test-Projekt erstellen (z.B. Kafka Microservice)
- [ ] Epic erstellen lassen
- [ ] Stories schneiden lassen
- [ ] Sprint planen lassen
- [ ] Story implementieren lassen
- [ ] Neue Anforderung hinzufügen (Flexibilität testen)
- [ ] ADR erstellen lassen

**11. Skill-Aktivierung validieren**
- [ ] agile-workflow aktiviert sich bei "Erstelle Epic"?
- [ ] testing-philosophy aktiviert sich beim Test-Schreiben?
- [ ] java-best-practices aktiviert sich beim Java-Code?
- [ ] dependency-analysis aktiviert sich bei Sprint-Planung?

**12. Token-Effizienz prüfen**
- [ ] CLAUDE.md < 200 Zeilen?
- [ ] Skills nutzen Progressive Disclosure?
- [ ] Keine redundante Dokumentation?

### Phase 5: Refinement & Dokumentation

**13. Feedback sammeln & iterieren**
- [ ] Was funktioniert gut?
- [ ] Was muss angepasst werden?
- [ ] Welche Skills fehlen noch?
- [ ] Performance-Probleme?

**14. Skills erweitern (bei Bedarf)**
- [ ] Weitere projektspezifische Skills?
- [ ] Weitere Templates?
- [ ] Weitere Best Practices?

**15. Dokumentation finalisieren**
- [ ] README.md für Plugin erstellen
- [ ] Skill-Dokumentation vervollständigen
- [ ] Beispiel-Projekte dokumentieren

---

## Open Questions & Diskussionspunkte

### Fragen für nächste Session

1. **ADRs Location:**
   - `claudedocs/adrs/` ODER `docs/adrs/`?
   - Zusammen mit Epics/Stories oder separat?

2. **Task-Level:**
   - Brauchen wir `claudedocs/tasks/` oder reichen Stories?
   - Wann sind Tasks sinnvoll vs. Story-Subtasks?

3. **Story Status:**
   - Im Markdown-File (YAML Frontmatter) ODER separates `status.md`?
   - Status-Werte: Draft/Ready/In Progress/Review/Done?

4. **Sprint Retrospectives:**
   - Sollen wir `claudedocs/retrospectives/` hinzufügen?
   - Template für Retro-Notizen?

5. **Skill Priorities:**
   - Welche Skills sind wirklich Must-Have für Start?
   - Welche können später ergänzt werden?

6. **Review Process:**
   - Brauchen wir einen `code-review` Skill?
   - Oder reicht manuelle Review durch User?

7. **Git Integration:**
   - Soll `git-smart-commit` Skill integriert werden?
   - Branch-Naming basierend auf Story-IDs automatisieren?

8. **Epic-Estimation:**
   - Sollen Epics auch Story Points haben (Summe der Stories)?
   - Oder nur High/Medium/Low Effort?

9. **Dependency Visualization:**
   - Mermaid Diagrams für Dependencies in Sprint-Plänen?
   - Automatisch generieren lassen?

10. **Template Customization:**
    - Sollen Templates pro Projekt anpassbar sein?
    - Override-Mechanismus für projektspezifische Templates?

---

## Weitere Aspekte aus Framework (noch nicht diskutiert)

### Aspekte für zukünftige Diskussion

**1. Context Management (Token Optimization)**
- Framework hat Context Extractor, Compression Tools
- Wie handhaben wir große Projekte mit 100+ Stories?
- Brauchen wir Context-Komprimierung?

**2. Verbosity Control**
- Framework hat Anti-Verbosity Rules
- Wie stellen wir sicher, dass Claude nicht zu verbose ist?
- In jedem Skill wiederholen oder zentral in CLAUDE.md?

**3. Model Selection**
- Framework nutzt Opus/Sonnet/Haiku je nach Task
- Sollten wir das in Skills dokumentieren?
- "Use Opus for this Skill" im SKILL.md?

**4. Documentation Export**
- Framework hat `/cl-export` für Markdown-Export
- Brauchen wir das? (Wir haben ja schon Markdown)
- Oder Export in andere Formate (PDF, Confluence)?

**5. Metrics & Tracking**
- Framework trackt Model Usage, Story Points Velocity
- Sollen wir das auch machen?
- Sprint Velocity Tracking in `claudedocs/metrics/`?

**6. Hooks & Automation**
- Framework hat Pre-Commit Hooks, Build Checks
- Sollen wir Git Hooks integrieren?
- Automatische Story-Status-Updates bei Branch-Merge?

**7. Multi-Project Support**
- Wenn man mehrere Projekte hat, wie strukturiert man Skills?
- Global Skills (`.claude/skills/`) vs. Project Skills (`project/.claude/skills/`)?

**8. Team Collaboration**
- Wie teilen mehrere Entwickler Skills?
- Git-Repository für Skills? Plugin Marketplace?

**9. Skill Versioning**
- Wenn Skills sich ändern, wie migriert man?
- Breaking Changes in Templates?

**10. Integration mit anderen Tools**
- Jira, Trello Integration für Epics/Stories?
- GitHub Issues als Stories nutzen?
- MCP Server für Jira?

---

## Zusammenfassung der Entscheidungen

| Aspekt | Entscheidung | Grund |
|--------|--------------|-------|
| **Commands vs Skills** | Skills | Flexibler, auto-aktiviert, natürlich |
| **DB vs Markdown** | Markdown (`claudedocs/`) | Einfacher, versionierbar, flexibel |
| **CLAUDE.md vs agentic.md** | Beide (Hybrid) | CLAUDE.md für Workflows, agentic.md für Kontext |
| **Agents** | Keine separaten Agents | Overhead, Skills reichen |
| **Phase State Machine** | Nein | Zu starr, flexible Status in Stories |
| **Big Design Up Front** | Nein | Iterativ: Epics → Stories |
| **Templates** | In Skills (`agile-workflow/templates/`) | Cohesion, Progressive Disclosure |
| **Ordnerstruktur** | In CLAUDE.md | Fundamental, kurz (3 Zeilen) |
| **Test Philosophy** | Skill `testing-philosophy` | Auto-aktiviert, aus Framework übernommen |
| **Coding Guidelines** | Skill `java-best-practices` | Auto-aktiviert, 1835 Zeilen aus Framework |
| **Dependencies** | Skill `dependency-analysis` + ULTRATHINK | Kritische Analyse bei Bedarf |
| **ADRs** | Skill `architecture-decisions` | Template + Auto-Aktivierung |
| **Review** | Optional Skill `code-review` | Self-Review, aus Framework übernommen |

---

## Links & Ressourcen

### Framework Location
- **Path:** `C:\Dev\repos\agenticai\framework` (Windows)
- **WSL Path:** `/mnt/c/Dev/repos/agenticai/framework`
- **Git:** (nicht angegeben)

### Recherche-Quellen
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [CLAUDE.md Best Practices](https://www.eesel.ai/blog/claude-code-best-practices)
- [Skills vs MCP vs Tools](https://skywork.ai/blog/ai-agent/claude-skills-vs-mcp-vs-llm-tools-comparison-2025/)
- [Agile Epics & Stories](https://www.atlassian.com/agile/project-management/epics-stories-themes)
- [Skills Documentation](https://code.claude.com/docs/en/skills)

### Weitere Dokumentation
- Claude Code Docs: https://docs.claude.com/en/docs/claude-code/
- Agent Skills: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/
- MCP Protocol: https://modelcontextprotocol.io/

---

## Plugin-Architektur: Korrekte Struktur und warum keine CLAUDE.md/agentic.md

### WICHTIG: Plugin vs. Projekt Struktur

**PLUGINS verwenden NICHT `.claude/`!**

**Korrekte Plugin-Struktur:**
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin-Metadaten (PFLICHT)
├── skills/                  # Skills auf ROOT-Ebene!
│   └── my-skill/
│       ├── SKILL.md
│       ├── templates/
│       ├── scripts/
│       └── reference.md
├── commands/                # Custom slash commands (optional)
│   └── custom.md
├── agents/                  # Custom agents (optional)
│   └── specialist.md
└── hooks/                   # Event handlers (optional)
    └── hooks.json
```

**PROJEKT-Struktur (anders!):**
```
my-project/
├── .claude/                 # Für Projekte, NICHT für Plugins!
│   ├── skills/
│   ├── commands/
│   └── settings.local.json
└── src/
```

**Kritischer Unterschied:**
- **Plugins:** `.claude-plugin/plugin.json` + `skills/` auf Root
- **Projekte:** `.claude/` für projektspezifische Konfiguration

**Fehler der wir gemacht haben:**
- ❌ Versuchten `.claude/skills/` in Plugin zu nutzen (falsch!)
- ✅ Korrekt: `skills/` auf Root-Ebene mit `.claude-plugin/plugin.json`

### Warum keine CLAUDE.md/agentic.md in Plugins?

**Ursprüngliche Idee:**
- CLAUDE.md im Projekt-Root für Workflow-Regeln, Repository-Konventionen
- agentic.md im Projekt-Root für Projekt-Kontext (System, Architektur, Tech-Stack)

**Warum das nicht funktioniert:**

1. **Plugin-Installation installiert nur Plugin-Dateien**
   - `.claude-plugin/plugin.json` → Plugin-Metadaten
   - `skills/`, `commands/`, `agents/`, `hooks/` → Plugin-Komponenten
   - CLAUDE.md im Plugin-Root → wird NICHT ins Ziel-Projekt übernommen
   - agentic.md im Plugin-Root → wird NICHT ins Ziel-Projekt übernommen

2. **Manuelle Schritte sind inakzeptabel**
   - User soll Plugin einfach installieren und loslegen können
   - Keine "Kopiere Template X nach Y" Schritte
   - Keine "Initialisiere Projekt" Commands (User weiß oft noch nicht, was der Tech-Stack ist)

3. **Plugin muss "out of the box" funktionieren**
   - Einfach installieren
   - Sofort nutzbar
   - Zero Setup

### Die Lösung: Alles in Skills

**Alle Informationen, die vorher in CLAUDE.md/agentic.md waren, wandern in Skills:**

| CLAUDE.md Inhalt | Neue Location |
|------------------|---------------|
| **Ordnerstruktur** (`claudedocs/epics/`, etc.) | → `agile-workflow` Skill (SKILL.md) |
| **File Naming** (EPIC-001-description.md) | → `agile-workflow` Skill (SKILL.md) |
| **Workflow-Beschreibung** (Epics → Stories → Sprints) | → `agile-workflow` Skill (reference.md) |
| **Testing Philosophy** ("Test YOUR Code, Not THE Code") | → `testing-philosophy` Skill |
| **Java/Spring Guidelines** | → `java-best-practices` Skill |
| **Repository Konventionen** (Branch Naming) | → `git-smart-commit` Skill (bereits vorhanden) |
| **ADR Creation** | → `architecture-decisions` Skill |
| **Dependency Analysis** (ULTRATHINK) | → `dependency-analysis` Skill |

| agentic.md Inhalt | Neue Location |
|-------------------|---------------|
| **System Overview** | → User erstellt bei Bedarf, ODER in Epic/Story Beschreibungen |
| **Architecture** | → ADRs in `claudedocs/adrs/` |
| **Tech Stack** | → Wird aus Projekt erkannt (pom.xml, build.gradle, etc.) |
| **Design Decisions** | → ADRs |
| **Code Structure** | → Aus Projekt-Struktur erkennbar |
| **Current State** | → Epics/Stories/Sprints in `claudedocs/` |

**Resultat:**
- Plugin funktioniert sofort nach Installation
- User sagt: "Erstelle ein Epic für Kafka Integration"
- Claude aktiviert `agile-workflow` Skill automatisch
- Skill WEISS wo Dateien hin gehören (`claudedocs/epics/`)
- Skill nutzt Templates für konsistente Struktur
- Keine Setup-Schritte nötig

### Plugin-Struktur (Final) - KORREKT

```
agenticaiplugin/                   # Plugin Root
├── .claude-plugin/
│   └── plugin.json                # Plugin-Metadaten (name, version, author)
│
├── skills/                        # Skills auf ROOT-Ebene!
│   ├── agile-workflow/            # Epic/Story/Sprint Management
│   │   ├── SKILL.md               # Ordnerstruktur, File Naming, Auto-Activation
│   │   ├── templates/
│   │   │   ├── epic.md.j2
│   │   │   ├── story.md.j2
│   │   │   └── sprint.md.j2
│   │   └── reference.md           # Workflow-Details, INVEST, Dependencies
│   │
│   ├── testing-philosophy/        # "Test YOUR Code, Not THE Code"
│   │   ├── SKILL.md
│   │   └── reference.md           # Test Necessity Matrix, Examples
│   │
│   ├── java-best-practices/       # Spring Boot, Maven, Coding Guidelines
│   │   ├── SKILL.md
│   │   └── reference.md           # 1835 Zeilen aus Framework
│   │
│   ├── dependency-analysis/       # ULTRATHINK für Dependencies
│   │   ├── SKILL.md
│   │   └── reference.md
│   │
│   ├── architecture-decisions/    # ADR Creation
│   │   ├── SKILL.md
│   │   ├── templates/
│   │   │   └── adr.md.j2
│   │   └── reference.md
│   │
│   └── git-smart-commit/          # Bereits vorhanden
│       └── SKILL.md
│
├── commands/                      # (optional, zukünftig)
├── agents/                        # (optional, zukünftig)
├── hooks/                         # (optional, zukünftig)
│
├── FRAMEWORK_REDESIGN_SESSION.md  # Session-Dokumentation
└── README.md                      # Plugin-Dokumentation

(KEINE .claude/ - das ist für Projekte, nicht Plugins!)
(KEINE CLAUDE.md!)
(KEINE agentic.md!)
```

**Installation in Ziel-Projekt:**
```bash
# User installiert Plugin in kafkareader
cd /path/to/kafkareader
# Plugin-Installation (kopiert skills/ ins Projekt)
# Danach: kafkareader/.claude/skills/agile-workflow/ existiert
```

---

## Iterationsplan (Testgetriebene Umsetzung) - ÜBERARBEITET

### Philosophie
Jeder Aspekt wird einzeln umgesetzt, getestet und validiert, bevor zum nächsten übergegangen wird. Iteratives Vorgehen statt Big Bang.

### Test-Locations
- **kafkareader:** `D:\ki\repos\test\kafkareader` - Plugin-Installation und Integration Tests
- **Neue Test-Projekte:** `D:\ki\repos\test\<projektname>` bei Bedarf

---

### Iteration 1: agile-workflow Skill (Komplett)

**Ziel:** Vollständigen agile-workflow Skill erstellen mit Epic/Story/Sprint Funktionalität

**Umfang:**
- `.claude/skills/agile-workflow/` Ordner erstellen
- **SKILL.md** (YAML frontmatter + Instructions):
  - Skill-Beschreibung für Auto-Activation
  - **Ordnerstruktur-Konventionen** (`claudedocs/epics/`, `stories/`, `sprints/`, `tasks/`, `adrs/`)
  - **File Naming Conventions** (EPIC-001-description.md, etc.)
  - Epic/Story/Sprint Erstellung
  - Template-Nutzung
- **templates/** Ordner:
  - `epic.md.j2` - Epic Template (Goal, Scope, Out-of-Scope, Stories)
  - `story.md.j2` - Story Template (User Story, Acceptance Criteria, Story Points, Dependencies)
  - `sprint.md.j2` - Sprint Template (Goal, Stories, Capacity, Duration)
- **reference.md**:
  - Workflow-Beschreibung (High-Level → Epics → Stories → Sprints)
  - INVEST Criteria für Stories
  - Acceptance Criteria Guidelines
  - Story Points (Fibonacci: 1, 2, 3, 5, 8, 13)
  - Dependency Management

**Warum komplett in Iteration 1:**
- Skill muss "out of the box" funktionieren
- Ordnerstruktur-Konventionen gehören in den Skill (nicht in CLAUDE.md)
- Epic + Story + Sprint sind zusammenhängender Workflow
- Validiert Auto-Activation, Templates, Progressive Disclosure

**Test (MIT kafkareader-Projekt):**
1. **Plugin installieren:**
   - Kopiere `.claude/skills/agile-workflow/` nach `D:\ki\repos\test\kafkareader\.claude\skills\`

2. **Neue Claude Code Session in kafkareader starten**

3. **Test: Epic erstellen:**
   ```
   User: "Erstelle ein Epic für Kafka Dead Letter Queue Feature"
   ```
   Prüfen:
   - Skill aktiviert sich automatisch?
   - Ordner `claudedocs/epics/` wird angelegt?
   - Datei: `claudedocs/epics/EPIC-001-kafka-dlq.md`?
   - Enthält: Goal, Scope, Out-of-Scope?
   - Template korrekt gerendert (Jinja2)?

4. **Test: Stories schneiden:**
   ```
   User: "Schneide das Epic in 3-4 Stories"
   ```
   Prüfen:
   - Stories in `claudedocs/stories/`?
   - Naming: `STORY-001-description.md`, `STORY-002-...`, etc.?
   - User Story Format ("As a X, I want Y, so that Z")?
   - Acceptance Criteria vorhanden (mind. 2 pro Story)?
   - Story Points vergeben (Fibonacci)?
   - Epic-Referenz vorhanden?

5. **Test: Sprint planen:**
   ```
   User: "Plan einen Sprint mit diesen Stories, Capacity 8 Story Points"
   ```
   Prüfen:
   - Sprint in `claudedocs/sprints/SPRINT-01.md`?
   - Capacity eingehalten?
   - Stories referenziert?
   - Sprint Goal vorhanden?

6. **Test: File Naming:**
   - Alle Dateien lowercase-with-dashes?
   - Zero-padded IDs (001, 002)?

7. **Test: Ordnerstruktur:**
   ```
   User: "Wo lege ich Tasks ab?"
   ```
   Erwartete Antwort: `claudedocs/tasks/TASK-XXX-description.md`

**Erwartetes Ergebnis:**
- Skill aktiviert sich automatisch bei "Erstelle Epic", "Schneide Stories", "Plan Sprint"
- `claudedocs/` Struktur wird automatisch angelegt
- Dateien folgen Naming Conventions
- Templates werden korrekt genutzt
- Progressive Disclosure funktioniert (reference.md nur bei Bedarf geladen)

**Testdauer:** 20-30 Minuten

**Status:** ⏸️ Ausstehend

---

### Iteration 2: testing-philosophy Skill

**Ziel:** "Test YOUR Code, Not THE Code" Skill erstellen

**Umfang:**
- `.claude/skills/testing-philosophy/` Ordner
- **SKILL.md**:
  - Skill-Beschreibung für Auto-Activation (bei Test-Schreiben)
  - Code Classification (Business/Framework/Generated/Infrastructure)
  - Test Necessity Decision Logic
  - Coverage Goals (>80% Business, 0% Framework)
- **reference.md**:
  - Test Necessity Matrix (Tabelle: Code Type → Test Required?)
  - Anti-Patterns (Getter/Setter Tests, Framework Tests)
  - Good Examples (Business Logic Tests, Edge Cases)
  - Coverage Strategies
  - Aus Framework TEST.md übernehmen und anpassen

**Warum jetzt:**
- Wichtig für Code-Qualität
- Unabhängig von agile-workflow (separat testbar)
- Benötigt Code-Projekt für Test

**Test (MIT kafkareader-Projekt):**
1. Plugin installieren/aktualisieren in kafkareader
2. Neue Session
3. Sagen: "Schreib einen Kafka Consumer Service mit Tests"
4. Prüfen:
   - Skill aktiviert sich automatisch?
   - Testet nur Business Logic (processMessage, validation)?
   - KEINE Tests für Getter/Setter?
   - KEINE Tests für @KafkaListener Framework-Code?
   - Kommentare wie "Framework code, no test needed"?
   - Coverage-Fokus auf Business Logic?

**Erwartetes Ergebnis:**
- Nur relevante Tests werden geschrieben
- Framework-Code wird übersprungen mit Begründung
- Business Logic hat gute Test-Coverage

**Testdauer:** 15-20 Minuten

**Status:** ⏸️ Ausstehend

---

### Iteration 3: java-best-practices Skill

**Ziel:** Spring Boot, Maven, Coding Guidelines Skill erstellen

**Umfang:**
- `.claude/skills/java-best-practices/` Ordner
- **SKILL.md**:
  - Skill-Beschreibung für Auto-Activation (bei Java-Code schreiben)
  - Spring Boot Patterns (Controller, Service, Repository)
  - Naming Conventions
  - YAGNI, KISS, Single Responsibility Principles
- **reference.md**:
  - 1835 Zeilen aus Framework (JAVA.md, MAVEN.md, SPRING.md) übernehmen und anpassen
  - Spring Boot Best Practices
  - Maven Configuration Standards
  - Code Patterns (Error Handling, Logging, etc.)
  - Naming Conventions (Controller, Service, Repository, DTO, Entity)

**Warum jetzt:**
- Code-Qualität Standards
- Unabhängig testbar
- Benötigt Java-Projekt

**Test (MIT kafkareader-Projekt):**
1. Plugin installieren/aktualisieren
2. Sagen: "Erstelle einen Spring Boot REST Controller für Message-Management"
3. Prüfen:
   - Skill aktiviert sich automatisch?
   - Folgt Spring Patterns (@RestController, @Service, @Repository)?
   - Naming Conventions eingehalten (MessageController, MessageService)?
   - Single Responsibility (Controller nur Routing, Service hat Logic)?
   - YAGNI (keine unnötigen Features)?
   - Maven Dependencies sinnvoll?

**Erwartetes Ergebnis:**
- Code folgt Spring Boot Best Practices
- Struktur ist clean (Controller → Service → Repository)
- Naming ist konsistent
- Keine Over-Engineering

**Testdauer:** 15-20 Minuten

**Status:** ⏸️ Ausstehend

---

### Iteration 4: dependency-analysis Skill

**Ziel:** ULTRATHINK für Dependency-Analyse erstellen (optional Integration in agile-workflow)

**Umfang:**
- `.claude/skills/dependency-analysis/` Ordner ODER
- Integration in `agile-workflow` Skill
- **SKILL.md**:
  - Skill-Beschreibung für Auto-Activation (bei "Analysiere Dependencies", Sprint-Planung)
  - ULTRATHINK Trigger-Logic
  - Dependency Types (Technical, Business, Data)
  - Circular Dependency Detection
- **reference.md**:
  - ULTRATHINK Prompt Templates für tiefe Analyse
  - Dependency Graph Generation (Markdown/Mermaid)
  - Critical Path Identification
  - Circular Dependency Resolution Strategies

**Warum jetzt:**
- Kritisches Feature für Story-Reihenfolge
- Verbessert Sprint-Planung aus Iteration 1
- Validiert ULTRATHINK Integration

**Test (MIT kafkareader ODER agile-workflow Test):**
1. Epic mit 4-5 technisch abhängigen Stories erstellen
   Beispiel: "Kafka Consumer → Deserialization → Port Interface → Business Logic"
2. Sagen: "Analysiere Dependencies zwischen diesen Stories"
3. Prüfen:
   - ULTRATHINK wird aktiviert? (sollte sichtbar sein)
   - Dependencies korrekt erkannt?
   - Dependency Graph in Story-Dateien?
   - Circular Dependencies erkannt (falls provoziert)?

**Erwartetes Ergebnis:**
- Dependencies werden automatisch analysiert
- Story-Reihenfolge ist logisch
- Dependency Graph ist visualisiert

**Testdauer:** 15-20 Minuten

**Status:** ⏸️ Ausstehend

---

### Iteration 5: architecture-decisions Skill

**Ziel:** ADR (Architectural Decision Records) Skill erstellen

**Umfang:**
- `.claude/skills/architecture-decisions/` Ordner
- **SKILL.md**:
  - Skill-Beschreibung für Auto-Activation (bei "ADR erstellen", "Architektur-Entscheidung")
  - ADR Numbering Logic (ADR-001, ADR-002, ...)
  - Status Tracking (Proposed, Accepted, Deprecated, Superseded)
- **templates/**:
  - `adr.md.j2` - ADR Template (Title, Status, Context, Decision, Consequences, Alternatives)
- **reference.md**:
  - ADR Format Best Practices
  - When to create ADRs
  - Status Lifecycle
  - Examples

**Warum jetzt:**
- Wichtig für Entscheidungsdokumentation
- Einfach zu testen
- Unabhängig von Code
- Nutzt `claudedocs/adrs/` Struktur aus Iteration 1

**Test (MIT kafkareader ODER Standalone):**
1. Sagen: "Ich überlege zwischen PostgreSQL und MongoDB für User-Daten. Erstelle ein ADR."
2. Prüfen:
   - Skill aktiviert sich automatisch?
   - ADR-Datei in `claudedocs/adrs/`?
   - Format: `ADR-001-database-selection.md`?
   - Struktur vollständig (Context, Decision, Consequences, Alternatives)?
   - Status gesetzt (Proposed/Accepted)?
   - Nummerierung korrekt (001)?

**Erwartetes Ergebnis:**
- ADR wird automatisch erstellt
- Struktur ist konsistent
- Entscheidung ist gut dokumentiert
- Template korrekt genutzt

**Testdauer:** 10-15 Minuten

**Status:** ⏸️ Ausstehend

---

### Iteration 6: Integration Test (End-to-End)

**Ziel:** Gesamten Workflow testen, alle Skills zusammen validieren

**Umfang:**
- Kompletter Workflow: High-Level → Epic → Stories → Sprint → Implementation → ADR
- Validierung aller Skills in Kombination
- Real-World Scenario

**Warum jetzt:**
- Finale Validierung
- Integration zwischen Skills testen
- Real-World Simulation
- Sicherstellen dass Plugin "out of the box" funktioniert

**Test (MIT kafkareader-Projekt):**

**Szenario: "Kafka Dead Letter Queue Feature"**

1. **Plugin komplett installieren:**
   - Alle Skills aus Iteration 1-5 in kafkareader installiert

2. **High-Level Beschreibung:**
   ```
   User: "Ich möchte ein Dead Letter Queue Feature für fehlerhafte Kafka Messages"
   ```

3. **Epic erstellen:**
   ```
   User: "Erstelle ein Epic dafür"
   ```
   Prüfen:
   - `agile-workflow` Skill aktiviert?
   - Epic in `claudedocs/epics/EPIC-001-dead-letter-queue.md`?

4. **Stories schneiden:**
   ```
   User: "Schneide das Epic in Stories"
   ```
   Prüfen:
   - 3-4 Stories erstellt?
   - Dependencies erkannt?
   - Story Points vergeben?

5. **Dependencies analysieren:**
   ```
   User: "Analysiere Dependencies"
   ```
   Prüfen:
   - `dependency-analysis` Skill aktiviert? (falls Iteration 4 gemacht)
   - ULTRATHINK genutzt?
   - Dependencies dokumentiert?

6. **Sprint planen:**
   ```
   User: "Plan einen Sprint, Capacity 8 Points"
   ```
   Prüfen:
   - Sprint in `claudedocs/sprints/SPRINT-01.md`?
   - Dependencies berücksichtigt?

7. **Story implementieren:**
   ```
   User: "Implementiere STORY-001"
   ```
   Prüfen:
   - `java-best-practices` Skill aktiviert?
   - `testing-philosophy` Skill aktiviert?
   - Code folgt Best Practices?
   - Tests nur für Business Logic?

8. **ADR erstellen:**
   ```
   User: "Warum haben wir 3 Retries gewählt? Erstelle ein ADR"
   ```
   Prüfen:
   - `architecture-decisions` Skill aktiviert?
   - ADR in `claudedocs/adrs/`?

9. **Finale Prüfung:**
   - Alle Dateien an richtigen Orten?
   - Naming Conventions eingehalten?
   - Skills aktivieren sich automatisch?
   - Workflow ist flüssig (keine manuellen Eingriffe)?
   - Code-Qualität gut?
   - Tests sinnvoll?

**Erwartetes Ergebnis:**
- Kompletter Workflow funktioniert End-to-End
- Alle Skills arbeiten zusammen
- Keine Brüche oder Fehler
- Plugin funktioniert "out of the box"
- Zero Setup nötig

**Testdauer:** 30-45 Minuten

**Status:** ⏸️ Ausstehend

---

### Iterationsplan - Zusammenfassung (NEU)

| Iteration | Umfang | Test-Projekt | Dauer | Status |
|-----------|--------|--------------|-------|--------|
| 1 | agile-workflow (Komplett: Epic+Story+Sprint) | **kafkareader** | 20-30 min | ⏸️ Ausstehend |
| 2 | testing-philosophy | **kafkareader** | 15-20 min | ⏸️ Ausstehend |
| 3 | java-best-practices | **kafkareader** | 15-20 min | ⏸️ Ausstehend |
| 4 | dependency-analysis (optional) | **kafkareader** | 15-20 min | ⏸️ Ausstehend |
| 5 | architecture-decisions | **kafkareader** | 10-15 min | ⏸️ Ausstehend |
| 6 | Integration E2E (Alle Skills) | **kafkareader** | 30-45 min | ⏸️ Ausstehend |

**Gesamtdauer (geschätzt):** 2-3 Stunden über mehrere Sessions

**Änderungen gegenüber ursprünglichem Plan:**
- ❌ CLAUDE.md + agentic.md entfernt (funktionieren nicht in Plugins)
- ❌ Separate claudedocs/ Struktur Iteration entfernt (ist jetzt in Iteration 1)
- ✅ agile-workflow komplett in Iteration 1 (statt 3 separate Iterationen)
- ✅ Von 10 auf 6 Iterationen reduziert
- ✅ Alle Iterationen nutzen kafkareader für Tests (realistischer)

---

### Nach jeder Iteration

**Checklist:**
- [ ] Implementierung abgeschlossen
- [ ] Test durchgeführt
- [ ] Test erfolgreich
- [ ] Learnings dokumentiert (in dieser Datei)
- [ ] Ggf. Anpassungen gemacht
- [ ] Re-Test bei Anpassungen
- [ ] Plugin in kafkareader installiert/aktualisiert (falls relevant)
- [ ] Status auf ✅ Abgeschlossen gesetzt

**Bei Problemen:**
- Problem dokumentieren (in dieser Datei unter Iteration)
- Lösung erarbeiten
- Anpassen
- Re-Test

---

## Session-Ende

**Datum:** 2025-11-12
**Ergebnis:** Umfassende Analyse und Redesign-Plan für flexibles Agile-Framework mit Skills
**Nächste Session:** Implementation von Iteration 1 (agile-workflow Skill)

**Wichtig für Fortsetzung:**
- Diese Datei lesen
- Framework unter `/mnt/c/Dev/repos/agenticai/framework` verfügbar (für Content-Übernahme)
- Alle Entscheidungen dokumentiert
- **KEINE CLAUDE.md/agentic.md** (funktionieren nicht in Plugins)
- **Alle Konventionen in Skills** (Ordnerstruktur, File Naming, etc.)
- Iterationsplan überarbeitet (6 statt 10 Iterationen)
- Test-Location: `D:\ki\repos\test\kafkareader`

**Nächste Schritte:**
1. Iteration 1: agile-workflow Skill erstellen (SKILL.md + Templates + reference.md)
2. In kafkareader installieren und testen
3. Bei Erfolg: Iteration 2 (testing-philosophy Skill)

**Status:** Ready for Iteration 1 - agile-workflow Skill
