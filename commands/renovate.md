# Renovate - Dependency Audit Command

Prüft alle Dependencies im Projekt auf Updates, Deprecations und moderne Alternativen. Generiert einen Report ohne automatische Updates (ähnlich Renovate Bot).

## Usage

```
/agenticaiplugin:renovate [optionen]
```

### Optionen

| Option | Beschreibung |
|--------|--------------|
| (keine) | Vollständiger Audit aller erkannten Tech-Stacks |
| `--stack jvm` | Nur JVM-Dependencies prüfen (Maven/Gradle) |
| `--stack js` | Nur JavaScript-Dependencies prüfen (npm/yarn/pnpm) |
| `--stack python` | Nur Python-Dependencies prüfen (pip/poetry) |
| `--quick` | Schnellmodus: Nur Versionsprüfung, keine Deprecation-Recherche |
| `--save` | Report nach `claudedocs/reports/dependency-audit-{datum}.md` speichern |

### Beispiele

```bash
# Vollständiger Audit aller Stacks
/agenticaiplugin:renovate

# Schnelle Versionsprüfung
/agenticaiplugin:renovate --quick

# Nur JavaScript prüfen und speichern
/agenticaiplugin:renovate --stack js --save

# Vollständiger JVM-Audit
/agenticaiplugin:renovate --stack jvm
```

## Was geprüft wird

Für jede Dependency im Projekt:

1. **Versionsstatus:** Ist die aktuelle Version die neueste stabile?
2. **Deprecation-Status:** Ist die Library deprecated oder end-of-life?
3. **Moderne Alternativen:** Gibt es eine bessere Ersatz-Library?

## Ausführungsanweisungen

Wenn dieses Command aufgerufen wird, führe folgende Schritte aus:

### Schritt 1: Parameter parsen

Extrahiere die Optionen aus dem Command-Aufruf:
- `--stack`: Optional - filtert auf bestimmten Stack (jvm, js, python)
- `--quick`: Quick-Mode Flag
- `--save`: Speichern-Flag

**Validierung:**
- Bei ungültigem `--stack` Wert: Usage anzeigen und abbrechen
- Gültige Stack-Werte: `jvm`, `js`, `python`

### Schritt 2: Tech-Stacks automatisch erkennen

**WICHTIG:** Das Command erkennt automatisch welche Tech-Stacks im Projekt verwendet werden. Es prüft NUR die tatsächlich vorhandenen Stacks, nicht alle möglichen.

Suche nach Manifest-Dateien mit Glob:

```
Patterns:
- pom.xml, **/pom.xml (auf Root und direkte Subdirs beschränken)
- build.gradle, build.gradle.kts
- package.json
- requirements.txt, pyproject.toml, Pipfile
```

**Erkennungslogik (nur gefundene Dateien werden verarbeitet):**
- pom.xml gefunden → JVM (Maven) wird geprüft
- build.gradle gefunden → JVM (Gradle) wird geprüft
- package.json gefunden → JavaScript wird geprüft
- requirements.txt ODER pyproject.toml gefunden → Python wird geprüft

**Verhalten:**
- Ohne `--stack`: Prüfe alle im Projekt **erkannten** Stacks (nicht alle möglichen!)
- Mit `--stack`: Prüfe nur den angegebenen Stack (Fehler wenn nicht vorhanden)
- Keine Manifests gefunden: Fehler anzeigen und abbrechen

**Ausgabe:**
```
Erkannte Tech-Stacks:
- JVM (Maven): pom.xml
- JavaScript (npm): package.json
```

### Schritt 3: Dependencies extrahieren

Für jeden erkannten Stack die Manifest-Datei lesen und parsen.

**JVM (pom.xml):**
- Extrahiere `<dependency>` Elemente
- Notiere groupId, artifactId, version
- Markiere Property-Referenzen (${...})
- Identifiziere Spring Boot Managed Dependencies (ohne version Tag)

**JavaScript (package.json):**
- Extrahiere dependencies und devDependencies
- Parse Semver (^, ~, exact)
- Notiere Package-Name und Version-Constraint

**Python (requirements.txt/pyproject.toml):**
- Extrahiere Package-Namen und Versionen
- Parse Version-Specifier (==, >=, ~=)

**Ausgabe Dependency-Anzahl:**
```
Gefundene Dependencies:
- JVM: 23 Dependencies (15 managed by Spring Boot)
- JavaScript: 45 Dependencies (12 dev)
```

### Schritt 4: Versionsprüfung (API)

Für jede Dependency die neueste Version via Package-Registry-API prüfen.

**API-Aufrufe:**

JVM (Maven Central):
```bash
curl -s "https://search.maven.org/solrsearch/select?q=g:{groupId}+AND+a:{artifactId}&rows=1&wt=json"
```

JavaScript (npm Registry):
```bash
curl -s "https://registry.npmjs.org/{package}/latest"
```

Python (PyPI):
```bash
curl -s "https://pypi.org/pypi/{package}/json"
```

**Für jede Dependency:**
1. Registry-API für neueste Version abfragen
2. Mit aktueller Version vergleichen
3. Kategorisieren:
   - ✓ Aktuell: current >= latest
   - ! Veraltet: current < latest (Gap notieren: Patch/Minor/Major)

**Fehlerbehandlung:**
- API-Timeout → Dependency mit Warnung überspringen
- 404 → Als "Unbekanntes Package" markieren

### Schritt 5: Deprecation & Ersatz-Check (nur Full-Mode)

**Diesen Schritt bei `--quick` überspringen.**

Für Libraries die:
- Veraltet mit Major-Version-Gap sind, ODER
- Auf bekannter Deprecation-Liste stehen

**Bekannte Deprecation-Liste (zuerst prüfen vor WebSearch):**

JVM:
- RestTemplate → RestClient (Spring 6+)
- Joda-Time → java.time
- Commons Lang 2.x → Commons Lang 3
- Log4j 1.x → Logback/Log4j 2
- javax.* → jakarta.* (Spring Boot 3+)
- Hibernate Validator 6.x → 8.x (jakarta)
- Spring Security OAuth → Spring Authorization Server

JavaScript:
- moment.js → date-fns, day.js, Temporal API
- request → axios, node-fetch, got
- node-sass → sass (dart-sass)
- tslint → eslint mit @typescript-eslint
- lodash (komplett) → native ES6+ oder lodash-es
- express-validator 5.x → 7.x (neue API)

Python:
- urllib2 → requests, httpx
- optparse → argparse
- distutils → setuptools
- imp → importlib
- asyncio.coroutine → async/await
- pkg_resources → importlib.resources

**WebSearch für unbekannte Libraries:**
```
"{library} deprecated 2025"
"{library} alternative replacement 2025"
```

**Für jede deprecated Library:**
- Deprecation-Grund notieren
- Empfohlenen Ersatz identifizieren
- Zur "Deprecated" Kategorie hinzufügen

### Schritt 6: Report generieren

Alle Ergebnisse in strukturierten Report kompilieren:

```markdown
# Dependency Audit Report

**Erstellt:** {aktuelles Datum}
**Projekt:** {Projektpfad}
**Tech-Stacks:** {erkannte Stacks}
**Modus:** {Vollständig | Schnellprüfung}

---

## Zusammenfassung

| Status | Anzahl | Aktion |
|--------|--------|--------|
| ✓ Aktuell | {n} | Keine |
| ! Veraltet | {n} | Update empfohlen |
| ⚠ Deprecated | {n} | Migration erforderlich |
| → Ersetzt | {n} | Alternative verfügbar |

---

## {Stack-Name} Dependencies

### Veraltet

| Dependency | Aktuell | Neueste | Gap |
|------------|---------|---------|-----|
| {name} | {current} | {latest} | {Minor/Major} |

### Deprecated

| Dependency | Problem | Ersatz |
|------------|---------|--------|
| {name} | {Grund} | {Alternative} |

### Aktuell

| Dependency | Version |
|------------|---------|
| {name} | {version} |

---

## Empfehlungen

### Priorität 1: Kritisch (Deprecated/Security)
{Liste kritischer Items mit Handlungsempfehlung}

### Priorität 2: Updates empfohlen
{Liste veralteter Items nach Gap-Größe sortiert}

---

*Report erstellt von AgenticAI Plugin renovate command*
```

### Schritt 7: Report ausgeben

**Console-Ausgabe:**
- Vollständigen Report im Markdown-Format anzeigen

**Bei `--save`:**
- Verzeichnis `claudedocs/reports/` erstellen falls nicht vorhanden
- Report speichern als `dependency-audit-{YYYY-MM-DD}.md`
- Speicherort bestätigen:
```
Report gespeichert: claudedocs/reports/dependency-audit-2025-12-11.md
```

## Wichtige Hinweise

1. **Nur Report:** Dieses Command modifiziert KEINE Dateien (außer Report bei --save). Es erstellt nur einen Bericht.
2. **WebSearch-Kosten:** Full-Mode nutzt WebSearch für Deprecation-Checks. Nutze `--quick` für schnellere, günstigere Durchläufe.
3. **Spring Boot Managed:** Bei Spring Boot Projekten werden viele Dependencies vom Parent-POM verwaltet.
4. **Aktualität:** Versionsinformationen werden live von Package-Registries abgefragt.

## Fehlerbehandlung

**Keine Manifest-Dateien gefunden:**
```
Fehler: Keine Dependency-Manifest-Dateien gefunden.

Unterstützte Dateien:
- JVM: pom.xml, build.gradle
- JavaScript: package.json
- Python: requirements.txt, pyproject.toml

Bitte führe dieses Command im Projekt-Root-Verzeichnis aus.
```

**API nicht erreichbar:**
```
Warnung: Konnte Version für {dependency} nicht abrufen.
Grund: {API} nicht erreichbar
Überspringe diese Dependency...
```

**Manifest nicht parsbar:**
```
Warnung: Konnte {manifest} nicht vollständig parsen.
Fahre mit partieller Dependency-Liste fort...
```

## Verwandt

- **technology-advisor-jvm** Skill - JVM Dependency-Recherche
- **technology-advisor-javascript** Skill - JavaScript Dependency-Recherche
- **technology-advisor-python** Skill - Python Dependency-Recherche
