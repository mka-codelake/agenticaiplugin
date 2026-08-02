# Kontext-Landkarte

**Was bringt wann welche Inhalte in wessen Kontext — und woher wissen wir das?**

Diese Karte existiert, weil mehrfach auf Annahmen gebaut wurde, die sich als falsch
erwiesen: eine Reichweite, die nicht bestand; eine Reihenfolge, die nicht galt; eine
Ablage, die nicht mitwanderte. Sie ist die Grundlage für Entscheidungen über Doktrin,
Modi und jede künftige Regel.

## Erhebungsstand

| | |
|---|---|
| **Datum** | 2026-08-02 |
| **Claude Code** | **2.1.220** (`claude --version`) |
| **Plugin** | 0.31.1 |
| **Node** | v24.18.1 (CI: 22) |

Die Claude-Code-Version ist der wichtigste Eintrag dieser Tabelle. Alles unter **DOC**
und **MESS** beschreibt das Verhalten *dieser* Version. Bei einem Update ist der
Änderungsverlauf zwischen der hier genannten und der neuen Version die gezielte
Prüfliste — die Release Notes stehen im
[Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) und in der
Doku unter [Release Notes](https://code.claude.com/docs/en/release-notes).

Ein Beispiel dafür, warum das zählt: Der Roster-Mechanismus für Geschwister-Agenten kam
laut Dokumentation erst mit **v2.1.206** dazu, `COLUMNS`/`LINES` für die Statuszeile mit
**v2.1.153**. Verhalten, das diese Karte als „nicht vorhanden" festhält, kann in einer
späteren Version schlicht existieren.

---

## Wie diese Karte zu lesen ist

Jede Aussage trägt genau einen Herkunftsmarker. **Der Marker ist wichtiger als die
Aussage** — er sagt, was beim nächsten CLI-Update nachzuprüfen ist.

| Marker | Bedeutet | Prüfbar durch |
|---|---|---|
| **DOC** | Offizielle Claude-Code-Dokumentation | URL erneut abrufen, mit Abrufdatum vergleichen |
| **MESS** | Selbst gemessen, mit Methode | Messung wiederholen (Aufbau siehe unten) |
| **CODE** | Aus Plugin-Code ableitbar | `datei:zeile` lesen |
| **ANNAHME** | Behauptet, nirgends belegt | **Nichts** — hier ist zu messen, bevor darauf gebaut wird |

`ANNAHME` ist die wichtigste Kategorie. Mehrere tragende Designentscheidungen des
Plugins stehen bis heute auf unbelegten Kommentaren.

---

## 1. Wer sieht was

Die Kernmatrix. Zeilen = Kontextquelle, Spalten = Kontext, in dem sie ankommt.

| Quelle | Hauptsession | Fork | Sub-Agent (general-purpose, custom) | Explore / Plan |
|---|---|---|---|---|
| SessionStart-`additionalContext` (Doktrin, Modus, Persona) | ja | ja¹ | **nein** | **nein** |
| `CLAUDE.md` (user + projekt) | ja | ja¹ | **ja** | **nein** |
| Skill-Body per `skills:`-Frontmatter | — | ja¹ | **ja** | ja² |
| Skill-Body per Aufruf | ja | ja | ja | ja |
| Git-Status-Snapshot | ja | ja¹ | ja | **nein** |
| Gesprächsverlauf | ja | **ja** | nein | nein |

¹ Ein Fork erbt die gesamte Konversation samt System-Prompt — **DOC**
([sub-agents.md](https://code.claude.com/docs/en/sub-agents.md), 2026-08-02):
*„A fork inherits the entire conversation so far instead of starting fresh."*

² Nicht gesondert geprüft; `skills:`-Preload ist agent-definitionsabhängig.

**Die zentrale Zeile ist die erste.** Sie erklärt, warum Regeln für Sub-Agenten in den
Auftragsprompt gehören und nicht in Doktrin oder Modus-Text.

- **DOC**: *„SessionStart/SessionEnd feuern NICHT für Sub-Agenten (sie haben keine
  Session, nur Context)"* — [sub-agents.md](https://code.claude.com/docs/en/sub-agents.md),
  abgerufen 2026-08-02.
- **MESS** (2026-08-02): Fünf Agent-Typen — `general-purpose`, `Explore`,
  `agenticaiplugin:license-checker`, `agenticaiplugin:pr-review-installer`,
  `code-simplifier` — wurden ohne Tool-Zugriff nach vier Zeichenketten befragt, die
  ausschließlich im injizierten Kontext vorkommen, **plus zwei Kontrollfragen** nach
  einem Doktrin-Block und einem Satz, die es nicht gibt. Alle fünf: Doktrin und Persona
  abwesend, beide Kontrollen korrekt negativ. Beide Custom-Agents beschrieben ihren
  eigenen Systemprompt korrekt — es wurden also tatsächlich Custom-Typen gemessen.
  **Ohne die Negativkontrolle wäre das Ergebnis wertlos gewesen; sie gehört zwingend
  zu jeder Wiederholung.**

Die `Explore`-Anomalie in derselben Messung (sah als einziger auch die `CLAUDE.md`
nicht) ist **DOC**-gedeckt: *„Explore and Plan skip your CLAUDE.md files and the parent
session's git status to keep research fast and inexpensive."* Messung und Dokumentation
decken sich unabhängig — das stützt beide.

### Was Sub-Agenten dennoch erreicht

| Kanal | Reichweite | Marker |
|---|---|---|
| `CLAUDE.md` | alle außer Explore/Plan | **DOC** + **MESS** |
| `skills:` im Agent-Frontmatter | plugin-eigene Agents | **DOC** + **MESS** |
| Der Auftragsprompt | alle | trivial |
| `PreToolUse`/`PostToolUse`-Hooks | greifen auch für Sub-Agent-Tool-Aufrufe | **DOC** |

Die letzte Zeile beantwortet eine bisher offene Frage aus #105: Der git-Commit-Guard
**greift** bei Sub-Agenten. Ein Sub-Agent ohne Kenntnis des Commit-Wegs läuft also in
eine Blockade, nicht an einem Gate vorbei.

Der `skills:`-Kanal ist **MESS**-belegt (2026-08-02, Kontrollvergleich):
`agents/pr-review-installer.md:16` deklariert `skills: git-smart-commit`, und der Agent
meldete den vollständigen Skill-Body in seinem Kontext; `license-checker` ohne
Deklaration meldete nichts dergleichen. Ob dabei der Verzeichnisname oder ein
`name:`-Feld auflöst, ist **DOC**-seitig nicht dokumentiert — **MESS** beantwortet es:
`skills/git-smart-commit/SKILL.md` hat **kein** `name:` und wird trotzdem geladen, also
genügt der Verzeichnisname.

---

## 2. Wann geladen wird

| Mechanismus | Zeitpunkt | Marker |
|---|---|---|
| SessionStart-Hooks | jeder Sitzungsbeginn: `startup`, `resume`, `clear`, `compact`, **`fork`** | **DOC** ([hooks.md](https://code.claude.com/docs/en/hooks.md), 2026-08-02) |
| Skill-`description` | immer im Kontext | **DOC** |
| Skill-Body | **nur bei Aufruf** — *„a skill's body loads only when it's used"* | **DOC** |
| `CLAUDE.md` | Sitzungsbeginn, hierarchisch | **DOC** |

**`fork` ist ein fünfter Matcher, den das Plugin nie bedacht hat.** Die Hooks gaten
bewusst nicht auf `source` (**CODE** `hooks/inject-doctrine.mjs:72-84`), feuern dort also
mit — für Doktrin und Modus vermutlich gewollt, aber ungeprüft.

### Reihenfolge und Zusammenführung — hier steht eine Code-Behauptung gegen die Messung

`hooks/inject-doctrine.mjs:13-14` behauptet: *„Multiple SessionStart hooks'
additionalContext are concatenated by Claude Code."*

| Aspekt | Befund | Marker |
|---|---|---|
| Hooks laufen **parallel**, nicht sequenziell | *„All matching hooks run in parallel (not sequentially)"* | **DOC** |
| Wie mehrere `additionalContext`-Blöcke zusammengeführt werden | **nicht dokumentiert** | DOC-Fehlanzeige |
| Reihenfolge folgt der `hooks.json`-Reihenfolge | **widerlegt** | **MESS** |
| Größengrenze für `additionalContext` | **nicht dokumentiert** | DOC-Fehlanzeige |

**MESS** (2026-08-02): In `hooks/hooks.json` steht `inject-doctrine` an Position 2, die
Persona an Position 3. Im tatsächlichen Sitzungskontext erscheint die **Persona zuerst**.
Beobachtet am eigenen Kontext dieser Sitzung; konsistent mit der dokumentierten
Parallelität.

**Konsequenz, die in `hooks/doctrine/core.md:4-6` bereits umgesetzt ist:** Eine
Überschreibung darf sich niemals auf Position stützen. Sie muss benennen, *was* sie
überschreibt.

---

## 3. Was mitwandert

Entscheidend für die Frage, ob das Plugin auf einer zweiten Maschine dasselbe leistet.

| Quelle | Wandert mit? | Marker |
|---|---|---|
| Plugin-Dateien (`hooks/`, `skills/`, `agents/`, `doctrine/`) | **ja** | **CODE** |
| Projekt-`CLAUDE.md`, `.claude/guidelines/`, `.claude/adrs/` | ja, mit dem Projekt-Repo | **CODE** |
| `~/.claude/CLAUDE.md` | **nein** | **CODE** |
| `~/.claude/rules/` | **nein** | **CODE** |
| Auto-Memory `~/.claude/projects/*/memory/` | **nein** | **CODE** |
| Learned Skills `~/.claude/skills/learned-*/` | **nein** | **CODE** |
| `persona.state`, `mode.state` | **nein** | **CODE** `mode.mjs:44-45` |
| `agenticaiplugin.config.json` (alle Opt-outs) | **nein** | **CODE** |

**Die Konsequenz stand bisher nirgends zusammenhängend:** Nach einer Neuinstallation
läuft das Plugin in **voller Default-Konfiguration** — Doktrin an, git-Guard an,
Autoskill aus, Persona und Modus aus. Alles, was Verhalten abschaltet oder
personalisiert, ist maschinenlokal.

Ebenso: Das gesamte Betriebswissen in den learned skills (19 Skills, davon 4021 Zeilen
allein in den beiden Orchestrierungs-Skills) ist auf einer zweiten Maschine **nicht
vorhanden**. Der `meta-orchestrator`-Modus ist dort schwächer als hier, ohne dass es
sichtbar wäre — siehe #107.

---

## 4. Geltende Regeln, nach Absicherungsgrad

Nicht „welche Regeln gibt es", sondern **welche sind durchgesetzt und welche nur
aufgeschrieben**. Die zweite Gruppe ist die gefährlichere.

### Durch Tests erzwungen

| Regel | Test |
|---|---|
| Hooks in Exec-Form, `node`, `${CLAUDE_PLUGIN_ROOT}/….mjs` | `hooks/hooks-policy.test.mjs:14-36` |
| Keine Shell-Skripte unter `hooks/` (rekursiv) | `hooks/hooks-policy.test.mjs:38-45` |
| Whitelist auch auf dem **Lesepfad** (manipuliertes Statefile) | `persona.test.mjs:122`, `mode.test.mjs:185` |
| `realpath`-Vergleich beim Direktaufruf-Guard (Marketplace-Symlink) | `guard-git-commit.test.mjs:110`, `inject-doctrine.test.mjs:101` |
| `skillDir` im Workflow: kein Default, muss absolut sein | Workflow-Suiten |
| Modus-Text nennt den Commit-Weg, kein absolutes git-Verbot | `mode.test.mjs` (seit 0.31.1, Wirksamkeit nachgewiesen) |

### Nur aufgeschrieben — kein Netz

| Regel | Quelle | Risiko |
|---|---|---|
| **Keine absoluten Pfade in Plugin-Dateien** | `CLAUDE.md:20-26` | Die zentrale Portabilitätsregel ist ungeschützt |
| `## Usage` + `## Argument Handling` bei Kommando-Skills | `docs/plugin-howto.md:796-834` | — |
| `agenticaiplugin:`-Präfix in Invocation-Kontexten | `CLAUDE.md:137-149` | Agent nicht auflösbar |
| Fork + `*.workflow.js` nie kombinieren (#51) | `docs/plugin-howto.md:155-157` | Skript wird stiller toter Code |
| Kommando-Tabellen in `README.md` ↔ `CLAUDE.md` synchron | `CLAUDE.md:110-112` | **bereits gebrochen**: `qa` fehlt in `CLAUDE.md` |

### Pfad-Variablen — undokumentiert, aber tragend

| Variable | Doku | Plugin-Nutzung |
|---|---|---|
| `${CLAUDE_PLUGIN_ROOT}` | **DOC** dokumentiert (Hook-Kontext) | `hooks.json`, Agent-Bodies |
| `${CLAUDE_SKILL_DIR}` | **nicht dokumentiert** | jeder Kommando-Skill |
| `${CLAUDE_CONFIG_DIR}` | **nicht dokumentiert** | alle Statefiles, Config, Autoskill |

Zwei von drei Variablen, an denen tragende Mechanismen hängen, haben **keine
dokumentierte Zusage**. Sie funktionieren, aber niemand hat versprochen, dass sie bleiben.

---

## 5. Offene Annahmen — die Messliste

Tragende Designentscheidungen ohne Beleg. Jede Zeile ist ein Kandidat für eine Messung
mit reproduzierbarem Artefakt.

| Annahme | Steht in | Warum es zählt |
|---|---|---|
| SessionStart feuert bei `compact` **und** der Kontext landet im frisch kompaktierten Fenster | `inject-doctrine.mjs:10-13` | Der Test belegt nur, dass **nicht** auf `source` gegatet wird — nicht die Wirkung |
| `PreCompact` kann Kontext nicht erhalten | `docs/plugin-howto.md:346-347` | DOC bestätigt die Empfehlung, nicht die Begründung |
| `additionalContext` ist „weicher" als eine echte Rule | `docs/plugin-howto.md:347-349` | **DOC** nennt es „system reminder" — Härte unbestimmt |
| Claude Code blockt Write/Edit unter `~/.claude/` | `hooks/autoskill/lib.mjs:27-38` | Tragend für die Staging-Architektur |
| Verschachtelte Skill-Ordner werden nicht entdeckt | `hooks/autoskill/lib.mjs:22-24` | Bestimmt das flache Layout |
| Skill-Index kürzt `description` bei 60 Zeichen | `skills/learn/SKILL.md:54-56` | — |
| Marketplace-Kopie ist ein ungefilterter Baumkopie | `docs/workflow-integration-howto.md:40` | Grund, warum `.workflow.js` mitkommt |
| Skills unter `~/.claude/skills/` hot-reloaden | `docs/plugin-howto.md:416-425` | **Steht in Spannung** zur Marketplace-Update-Regel (`CLAUDE.md:154`) |
| `${CLAUDE_PLUGIN_ROOT}` „ist leer im Tool-Kontext" | `persona.mjs:26`, `mode.mjs:32` | Pauschal formuliert; ein späterer Messnachtrag schränkt es auf die Shell ein — die Skripte tragen die alte Formulierung **unkorrigiert** |

---

## 6. Defekte, die diese Erhebung sichtbar gemacht hat

Nicht Annahmen, sondern Befunde — jeder ein Arbeitsauftrag.

1. **`hooks-policy.test.mjs` prüft nur den Pfad-*String*, nicht ob die Datei existiert.**
   Ein Tippfehler besteht den Test, und der Hook fällt zur Laufzeit stumm aus. Der Test
   suggeriert eine Absicherung, die er nicht liefert. — **CODE** `hooks-policy.test.mjs:28-33`
2. **Kein Test erzwingt, dass die fünf SessionStart-Hooks registriert bleiben.** Wer den
   `mode.mjs inject`-Eintrag löscht, bekommt eine grüne Suite.
3. **`BLOCKS` in `inject-doctrine.mjs:32-36` ist eine feste Liste.** Eine vierte
   Doktrin-Datei würde stumm ignoriert.
4. **Kommando-Tabellen driften bereits** — `qa` steht in `README.md`, fehlt in `CLAUDE.md`.
   Die Change-Checklist nennt genau diesen Slip als häufigen Fehler.
5. **`docs/rules-howto.md` trägt „Status: Januar 2025"** und beschreibt einen Mechanismus,
   den das Plugin bewusst nicht mehr nutzt.

---

## 7. Wie diese Karte geprüft wird

**Bei einem CLI-Update** zuerst die Versionsdifferenz bestimmen — `claude --version`
gegen den Erhebungsstand oben —, dann den Änderungsverlauf zwischen beiden Versionen
lesen. Das ist billiger und vollständiger als jede Zeile neu zu prüfen: Man sucht gezielt
nach Einträgen zu Hooks, `additionalContext`, Sub-Agents, Skills und Frontmatter-Feldern.
Erst was dort auftaucht, wird nachgemessen; danach `DOC`-URLs und Abrufdatum aktualisieren.

**Achtung bei Fehlanzeigen.** Die Karte hält an mehreren Stellen fest, dass etwas *nicht*
dokumentiert ist oder *nicht* existiert. Solche Zeilen altern in die falsche Richtung —
sie werden still falsch, wenn eine neue Version das Fehlende nachliefert. Sie brauchen
bei einem Update mehr Aufmerksamkeit als die positiven Aussagen, nicht weniger.

**Die `MESS`-Zeilen** sind unterschiedlich reproduzierbar:

- *Skriptbar*: Injektionsgröße und Komposition je Modus —
  `mode.mjs inject` mit gesetztem Statefile in einem isolierten `CLAUDE_CONFIG_DIR`.
- *Nicht skriptbar*: Die Reichweitenmessung braucht echte Agenten. Der Aufbau steht in
  Abschnitt 1 und **muss die Negativkontrolle enthalten** — ohne sie ist eine
  Selbstauskunft wertlos.

**Die `ANNAHME`-Zeilen** aus Abschnitt 5 sind der eigentliche Arbeitsvorrat. Eine
Annahme von `ANNAHME` auf `MESS` zu heben, verlangt ein Artefakt im Repo, nicht eine
Erinnerung an eine Messung.

---

## Verwandte Dokumente

- `docs/plugin-howto.md` — Entwicklerreferenz. Wo sie einen Mechanismus sauber
  beschreibt, verweist diese Karte darauf, statt zu duplizieren.
- Issues **#105** (Reichweite), **#107** (Portabilität des Betriebswissens),
  **#108** (Doktrin-Struktur) — die drei offenen Punkte, die aus dieser Karte folgen.
