# Claude Code Rules - How To Guide

> **Stand:** Januar 2025
> **Zweck:** Referenzdokumentation für Claude Code Rules - was sie sind, wie sie funktionieren, und wie sie sich zu Plugins verhalten.

---

## Was sind Claude Code Rules?

**Modulare, pfad-spezifische Projektanweisungen** in `.claude/rules/*.md`. Sie ergänzen `CLAUDE.md` mit konditionaler, dateitypspezifischer Guidance.

**Kerncharakteristik:** Rules sind **pfad-spezifisch** - sie gelten nur, wenn Claude mit Dateien arbeitet, die dem angegebenen Glob-Pattern entsprechen.

---

## Drei Memory-Ebenen

Claude Code hat drei Ebenen für Rules:

| Ebene | Location | Wer betroffen? | Geteilt? |
|-------|----------|----------------|----------|
| **Enterprise** | System-Pfade (s.u.) | Alle User auf Maschine | IT-managed |
| **Project** | `.claude/rules/*.md` | Team via git | Ja (committed) |
| **User** | `~/.claude/rules/*.md` | Nur du (alle Projekte) | Nein (persönlich) |

### Enterprise-Pfade (nach OS)

- **macOS:** `/Library/Application Support/ClaudeCode/CLAUDE.md`
- **Linux:** `/etc/claude-code/CLAUDE.md`
- **Windows:** `C:\Program Files\ClaudeCode\CLAUDE.md`

---

## Verzeichnisstruktur

```
projekt/
├── .claude/
│   ├── CLAUDE.md              # Allgemeine Projektanweisungen (immer geladen)
│   ├── CLAUDE.local.md        # Persönliche Anweisungen (gitignored)
│   └── rules/
│       ├── code-style.md      # Ohne paths: → gilt für alle Dateien
│       ├── java.md            # Mit paths: → nur für bestimmte Dateien
│       ├── security.md        # Sicherheitsregeln
│       └── frontend/          # Unterverzeichnisse unterstützt
│           ├── react.md
│           └── styling.md
```

**Auto-Discovery:** Alle `.md` Dateien in `.claude/rules/` werden automatisch gefunden - keine Registrierung nötig.

---

## Syntax mit YAML Frontmatter

### Basis-Syntax

```markdown
---
paths: src/**/*.java
---

# Java Guidelines

- Constructor-based Dependency Injection
- Layered Architecture: Controller → Service → Repository
- Keine Business-Logik in Controllern
```

### Frontmatter-Felder

| Feld | Beschreibung |
|------|--------------|
| `paths` | Glob-Pattern(s) für welche Dateien die Rule gilt |

**Wenn `paths` fehlt:** Rule gilt für alle Dateien (unconditional).

### Mehrere Patterns

**Komma-getrennt:**
```markdown
---
paths: src/**/*.ts, tests/**/*.test.ts
---
```

**Brace-Expansion (effizienter):**
```markdown
---
paths: src/**/*.{ts,tsx}
---
```

**Komplex:**
```markdown
---
paths: {src,lib}/**/*.ts, tests/**/*.test.ts
---
```

### Unterstützte Glob-Patterns

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | Alle TypeScript-Dateien in allen Verzeichnissen |
| `src/**/*` | Alle Dateien unter `src/` |
| `*.md` | Markdown-Dateien im Projekt-Root |
| `src/components/*.tsx` | React-Komponenten in spezifischem Verzeichnis |
| `src/**/*.{ts,tsx}` | Sowohl `.ts` als auch `.tsx` Dateien |

---

## Rules vs. CLAUDE.md

| Aspekt | Rules (`.claude/rules/`) | CLAUDE.md |
|--------|--------------------------|-----------|
| **Struktur** | Mehrere fokussierte Dateien | Eine große Datei |
| **Scope** | Pfad-spezifisch (konditional) | Gilt für alles |
| **Use Case** | Sprach-/Themen-spezifisch | Allgemeine Projektguidance |
| **Beispiel** | "Gilt NUR für TypeScript" | "Allgemeine Coding-Standards" |
| **Organisation** | Unterverzeichnisse möglich | Flach (mit Headings) |
| **Discovery** | Automatisch aus Verzeichnis | Muss an bestimmten Pfaden existieren |

### Typische Organisation

```
.claude/
├── CLAUDE.md                # Allgemein: Architektur, Workflows, Setup
└── rules/
    ├── code-style.md        # Gilt für alle Dateien
    ├── security.md          # Gilt für alle Dateien
    ├── frontend/
    │   ├── react.md         # paths: src/**/*.tsx
    │   └── styling.md       # paths: src/styles/**/*.scss
    └── backend/
        ├── api.md           # paths: src/api/**/*.ts
        └── database.md      # paths: src/db/**/*.ts
```

---

## Hierarchie und Priorität

**Ladereihenfolge (höchste zu niedrigster Priorität):**

1. Enterprise Policy (höchste - kann nicht überschrieben werden)
2. Command-line Arguments
3. Local Project Rules (`.claude/CLAUDE.local.md`)
4. Shared Project Rules (`.claude/rules/*.md`)
5. User-level Rules (`~/.claude/rules/*.md`)
6. User Memory (`~/.claude/CLAUDE.md`)

**Project-Rules überschreiben User-Rules.**

---

## Project Rules vs. User Rules

### Project Rules (`.claude/rules/*.md`)

- Im Projektverzeichnis gespeichert
- In Source Control eingecheckt (git)
- Gilt für alle Team-Mitglieder
- Projekt-spezifische Guidance
- **Höhere Priorität** als User Rules

### User Rules (`~/.claude/rules/*.md`)

- Im Home-Verzeichnis des Users
- Persönliche Präferenzen für alle Projekte
- NICHT in Source Control
- Wird vor Project Rules in der Hierarchie geladen
- **Niedrigere Priorität** als Project Rules

### Beispiel-Szenario

```
~/.claude/rules/
├── my-preferences.md     # Persönliche Style-Präferenzen
└── workflows.md          # Persönliche Workflows

projekt/.claude/rules/
├── code-style.md         # Team-Standard (überschreibt persönliche Präferenzen)
├── testing.md            # Team Testing-Konventionen
└── security.md           # Firmen-Sicherheitsstandards
```

---

## Plugins und Rules

### Wichtig: Plugins können KEINE Rules direkt definieren

**Warum?**
- Plugins leben außerhalb des Projektkontexts
- Rules müssen in `.claude/rules/` des **Benutzerprojekts** liegen
- Plugins werden in Claude Code's Plugin-Verzeichnis installiert

### Was Plugins KÖNNEN

- **Skills** definieren (auto-geladener Kontext via `SKILL.md`)
- **Agents** definieren (spezialisierte Sub-Agents)
- **Commands** definieren (Slash-Commands)

### Was Plugins NICHT KÖNNEN

- `.claude/rules/*.md` Dateien direkt definieren
- Projektstruktur im User-Repository überschreiben

### Best Practice für Plugin-bereitgestellte Rules

Plugins sollten einen **Command** anbieten (wie `/agenticaiplugin:init`), der:

1. `.claude/rules/` Verzeichnis im User-Projekt erstellt
2. Es mit Template-Rule-Dateien befüllt
3. User erlaubt, anzupassen und in git zu committen

**Das hält Rules portabel und wartbar** (sie sind im Projekt, nicht im Plugin).

---

## Fähigkeiten und Limitationen

### Fähigkeiten

| Feature | Beschreibung |
|---------|--------------|
| Pfad-spezifische Anwendung | `paths: src/**/*.java` |
| Mehrere Rule-Dateien | Nach Thema und Sprache organisieren |
| Unterverzeichnisse | Hierarchische Organisation |
| Symlinks | Gemeinsame Rules über Projekte teilen |
| Zirkuläre Symlink-Erkennung | Wird sauber behandelt |
| Rekursive Discovery | Alle `.md` in Unterverzeichnissen gefunden |
| Scoped Loading | User/Project/Enterprise Ebenen |
| Lazy Loading | Rules nur geladen wenn nötig (pfad-spezifisch) |
| Rich Markdown | Volle Markdown-Syntax unterstützt |

### Limitationen

| Limitation | Beschreibung |
|------------|--------------|
| Keine dynamische Generation | Rules sind statische Dateien |
| Keine Rule-Vererbung | Kein Mechanismus zum Erweitern/Überschreiben |
| Keine Rule-Versionierung | Kein eingebautes Version Control |
| Keine Rule-Validierung | Syntax-Fehler erst beim Laden erkannt |
| Keine Rule-Tests | Kein Mechanismus zum Testen der Anwendung |
| Nur Pfad-Patterns | Kann nicht auf Dateiinhalt konditionieren |
| Kein konditionelles Laden innerhalb | `paths` ist alles-oder-nichts |
| Keine Prioritäts-/Reihenfolge-Kontrolle | Mehrere passende Rules laden in Discovery-Reihenfolge |

---

## Praktische Beispiele

### Beispiel 1: Java/Spring Boot

```markdown
---
paths: src/**/*.java
---

# Java/Spring Boot Standards

## Architektur
- Layered: Controllers → Services → Repositories
- @RestController, @Service, @Repository verwenden
- Constructor-based Dependency Injection

## Testing
- @SpringBootTest für Integration Tests
- TestContainers für Datenbank-Tests
- Externe Services mocken
```

### Beispiel 2: TypeScript/React

```markdown
---
paths: src/**/*.{ts,tsx}
---

# TypeScript/React Guidelines

## Component Structure
- Functional Components mit Hooks
- Props mit Interfaces typisieren
- Components als default exportieren

## Testing
- Tests in `__tests__/` schreiben
- React Testing Library verwenden
- Minimum 80% Coverage erreichen
```

### Beispiel 3: Sicherheitsregeln (alle Dateien)

```markdown
---
# Kein paths Feld = gilt für alle Dateien
---

# Security Standards

## API Keys und Credentials
- NIEMALS API Keys committen, Environment Variables nutzen
- Mit API_KEY, ACCESS_TOKEN prefixen
- In .env.example dokumentieren

## Datenbank
- Alle Queries mit parametrisierten Statements
- Keine rohe SQL-Konkatenation
- Alle Inputs validieren
```

---

## Workflow: Rules zum Projekt hinzufügen

### Schritt 1: Rules-Verzeichnis erstellen

```bash
mkdir -p .claude/rules
```

### Schritt 2: Rule-Dateien erstellen

```bash
# Code Style Rules
cat > .claude/rules/code-style.md << 'EOF'
---
paths: src/**/*.{ts,tsx}
---

# TypeScript Code Style

- 2-Space Indentation
- `const` statt `let` bevorzugen
- JSDoc-Kommentare für public Functions
EOF

# Testing Rules
cat > .claude/rules/testing.md << 'EOF'
---
# Kein paths = gilt für alle Dateien
---

# Testing Standards

- Tests für Business Logic schreiben
- Minimum 80% Coverage für kritische Pfade
- AAA Pattern: Arrange, Act, Assert
EOF
```

### Schritt 3: In git committen

```bash
git add .claude/rules/
git commit -m "docs: add Claude Code rules for project"
```

---

## Advanced Patterns

### Pattern 1: Nach Layer organisiert

```
rules/
├── frontend/
│   ├── react.md      # paths: src/components/**/*.tsx
│   ├── styling.md    # paths: src/styles/**/*.scss
│   └── hooks.md      # paths: src/hooks/**/*.ts
├── backend/
│   ├── api.md        # paths: src/api/**/*.ts
│   ├── database.md   # paths: src/db/**/*.ts
│   └── models.md     # paths: src/models/**/*.ts
└── shared/
    ├── testing.md    # Kein paths = alle Dateien
    └── git.md        # Kein paths = alle Dateien
```

### Pattern 2: Shared Rules mit Symlinks

```bash
# Shared Rules Repo klonen
git clone https://github.com/company/shared-claude-rules ~/shared-rules

# Im Projekt verlinken
ln -s ~/shared-rules .claude/rules/company-standards

# Symlink committen
git add .claude/rules/company-standards
git commit -m "feat: add shared company standards"
```

### Pattern 3: User-Level persönliche Präferenzen

```
~/.claude/rules/
├── my-style.md       # Persönliche Indentation, Naming Conventions
├── workflows.md      # Persönliche Git Workflows
└── tooling.md        # Persönliche Tool-Präferenzen
```

---

## Zusammenfassung

| Aspekt | Details |
|--------|---------|
| **Was** | Modulare, pfad-spezifische Projektanweisungen |
| **Wo** | `.claude/rules/*.md` (Projekt), `~/.claude/rules/*.md` (User), System-Pfade (Enterprise) |
| **Wie** | Markdown-Dateien mit optionalem YAML Frontmatter mit `paths` Glob-Patterns |
| **Scope** | Project Rules überschreiben User Rules; User Rules gelten global |
| **Auto-load** | Alle `.md` in `.claude/rules/` auto-discovered |
| **Plugins** | Können KEINE Rules definieren, aber Init-Commands anbieten |
| **Relation zu CLAUDE.md** | Rules sind pfad-spezifische Alternativen; CLAUDE.md ist unconditional |
| **Syntax** | Markdown + YAML Frontmatter mit optionalem `paths: glob/pattern` |

---

## Quellen

- [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory.md)
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings.md)
- [Claude Code - Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Using CLAUDE.MD files](https://claude.com/blog/using-claude-md-files)
- [NikiforovAll/claude-code-rules](https://github.com/NikiforovAll/claude-code-rules) - Praktische Beispiele
