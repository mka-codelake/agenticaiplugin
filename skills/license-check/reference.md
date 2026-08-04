# License Check — Reference

Detailed rules for the `license-checker` agent. Load sections on demand during execution.

---

## 1. License Compatibility Matrix

### 1.1 License Categories

| Category | Licenses | Key Property |
|----------|----------|-------------|
| **Permissive** | MIT, BSD-2-Clause, BSD-3-Clause, ISC, Unlicense, CC0-1.0, 0BSD, Zlib | No restrictions on derivative works |
| **Permissive+Patent** | Apache-2.0 | Permissive with explicit patent grant |
| **Weak Copyleft** | LGPL-2.1, LGPL-3.0, MPL-2.0, EPL-2.0 | Copyleft limited to modified files or linked library |
| **Strong Copyleft** | GPL-2.0, GPL-3.0 | Derivative works must use same license |
| **Network Copyleft** | AGPL-3.0 | Network use triggers copyleft |
| **Non-OSI** | SSPL, Elastic License 2.0, BSL 1.1, RSALv2, FSL | Not OSI-approved, various commercial restrictions |
| **Proprietary** | Commercial, no-license, custom EULA | Cannot redistribute without permission |

### 1.2 Compatibility Table

**Read as:** Row = project license, Column = dependency license. Result = compatibility status.

| Project ↓ / Dep → | Permissive | Apache-2.0 | LGPL-2.1 | LGPL-3.0 | MPL-2.0 | GPL-2.0 | GPL-3.0 | AGPL-3.0 | Non-OSI | Proprietary |
|--------------------|-----------|------------|----------|----------|---------|---------|---------|----------|---------|-------------|
| **MIT** | OK | OK | WARNING | WARNING | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **BSD-*-Clause** | OK | OK | WARNING | WARNING | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **Apache-2.0** | OK | OK | WARNING | WARNING | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **LGPL-2.1** | OK | OK | OK | INCOMPAT | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **LGPL-3.0** | OK | OK | OK | OK | OK | INCOMPAT | OK | INCOMPAT | WARNING | INCOMPAT |
| **MPL-2.0** | OK | OK | OK | OK | OK | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **GPL-2.0** | OK | INCOMPAT | OK | INCOMPAT | OK | OK | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |
| **GPL-3.0** | OK | OK | OK | OK | OK | INCOMPAT | OK | INCOMPAT | WARNING | INCOMPAT |
| **AGPL-3.0** | OK | OK | OK | OK | OK | INCOMPAT | OK | OK | WARNING | INCOMPAT |
| **Proprietary** | OK | OK | WARNING | WARNING | WARNING | INCOMPAT | INCOMPAT | INCOMPAT | WARNING | INCOMPAT |

**LGPL WARNING explanation:** LGPL dependencies are OK when dynamically linked. Static linking or bundling may trigger copyleft. Mark as WARNING with note: "LGPL — verify linking method."

**MPL-2.0 in Proprietary:** File-level copyleft only. Modified MPL files must stay MPL, but rest of project can remain proprietary. Mark as WARNING.

**MPL-2.0 in GPL-2.0:** MPL 2.0 Section 3.3 provides explicit GPL compatibility. MPL-licensed code can be distributed under GPL terms. Mark as OK.

### 1.3 Special Cases

**Dual-Licensed Packages (OR expressions):**
- `MIT OR Apache-2.0` — pick the license compatible with your project
- Always choose the most permissive compatible option
- Status: OK if at least one option is compatible

**Combined Licenses (AND expressions):**
- `MIT AND BSD-2-Clause` — both conditions apply simultaneously
- Check compatibility of EACH license individually
- Status: worst of all individual checks

**License Exceptions (WITH operator):**
- `GPL-2.0-only WITH Classpath-exception-2.0` — exception relaxes copyleft for linking
- Common in Java ecosystem (OpenJDK)
- Treat as less restrictive than base license

**"Or later" Versions:**
- `GPL-2.0-or-later` — can be treated as GPL-3.0 if that's more compatible
- `LGPL-2.1-or-later` — can be treated as LGPL-3.0

**Missing License:**
- No LICENSE file AND no license field in manifest → assume Proprietary
- Always mark as WARNING with recommendation to contact maintainer

---

## 2. Per-Ecosystem Detection Methods

### 2.1 npm (Node.js)

**Detection:** `package.json` exists

**License field:** `package.json` → `.license` (SPDX string)

**Dependency fields:**
- `.dependencies` — production (HIGH risk)
- `.devDependencies` — development only (LOW risk)
- `.peerDependencies` — user-installed (HIGH risk)
- `.optionalDependencies` — optional (MEDIUM risk)

**Quick mode:** Read `package.json` only, extract direct dependency names.

**Full mode:**
```bash
npm ls --json --all | node -e '
let d;
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) { d = null; }
if (!d || typeof d !== "object" || Array.isArray(d) || typeof d.name !== "string") {
  console.error("npm ls produced no project tree - no package.json in this directory, or see the npm error above");
  process.exit(1);
}
const seen = new Map();
let missing = 0;
const walk = (node) => {
  for (const [name, info] of Object.entries((node && node.dependencies) || {})) {
    if (!info || info.missing) { missing++; continue; }
    const key = name + "@" + (info.version || "unknown");
    if (seen.has(key)) { continue; }
    seen.set(key, info.version ? { name, version: info.version } : { name, version: null, installed: false });
    walk(info);
  }
};
walk(d);
if (missing > 0) {
  console.error("npm ls reports unmet dependencies (" + missing + ") - node_modules is absent or incomplete, fall back to quick mode");
  process.exit(1);
}
console.log(JSON.stringify([...seen.values()], null, 2));
'
```
Prints one `{name, version}` row per distinct package of the full tree (direct +
transitive), deduplicated — the raw tree repeats every package at every position it
occupies and carries a `resolved` URL for each. Rows the tree has no version for carry
`{version: null, installed: false}`; see the optional-dependency note below before
counting them as scanned.

**The unmet-dependency count is the point of this filter, not its size.** Without
`node_modules`, `npm ls --json` still emits a populated `dependencies` object — every entry
just carries `"missing": true` instead of a version, and the `npm error code ELSPROBLEMS`
that says so goes to **stderr**, which the previous `2>/dev/null` discarded. A naive reader
sees a tree-shaped document and reports a clean full scan over zero packages. Now the
command aborts, npm's own diagnosis is visible above it, and quick mode is the documented
fallback. A project with genuinely no dependencies is a different shape — npm omits
`dependencies` entirely but still names the project — and yields `[]` with exit 0, not an
error.

The `name` check covers the quietest variant of the same failure: run from a directory
without a `package.json`, `npm ls --json --all` prints `{}` and exits **0 with an empty
stderr**. There is no diagnosis to miss, which is exactly why the shape has to be asserted
here — `{}` is not an empty project, it is the wrong working directory.

**A platform-specific optional dependency is not an unmet one, and npm does not confuse
the two.** For `fsevents` (`os: darwin`) on Linux, `npm ls --json --all` emits the entry as
an **empty object** — `"fsevents": {}` — with no `missing` flag, nothing in `problems`, no
`ELSPROBLEMS`, and exit 0. Measured both as a direct `optionalDependencies` entry and
transitively through `chokidar`. So the unmet count above never fires for it, and a
platform check in this filter would be dead code: the flag it would test is never set on
this path.

Those entries still surface, as `{name, version: null, installed: false}`, and that is
deliberate — do **not** read them as scanned. The package is absent here but ships on the
platform it targets, so its licence still counts for a cross-platform release; it simply
cannot be resolved from this tree. Look such a row up via the registry (`npm info <name>
license`) instead of treating the local absence as a clean result. Verified against the
mixed case: with `fsevents` present as `{}` *and* a genuinely uninstalled required
dependency in the same tree, only the required one raises the count and the command aborts.

**Per-dependency license check:**
```bash
npm info {package} license
```
Seven bytes on success (`WTFPL`, measured against `left-pad`), so there is nothing here worth
filtering — but the `2>/dev/null` had to go. An unknown or unpublished package makes npm write
**nothing** to stdout and put its 488-byte `E404` explanation on stderr, and the redirect left
an empty line that reads exactly like a package which declares no licence at all. Run once per
dependency, that silently turns unverifiable packages into unlicensed ones. **An empty answer
here is not "no licence declared"** — check the exit code and treat a non-zero one as
unverifiable.

**Lock files:** `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

**Common non-standard license strings:** `"BSD"` → `BSD-2-Clause`, `"ISC License"` → `ISC`, `"WTFPL"` → permissive

### 2.2 Python (pip)

**Detection:** `pyproject.toml`, `setup.py`, `setup.cfg`, or `requirements.txt` exists

**License field:** `pyproject.toml` → `[project] license` (SPDX expression, PEP 621)

**Dependency fields:**
- `pyproject.toml` → `[project.dependencies]` — production
- `pyproject.toml` → `[project.optional-dependencies]` — extras (varies)
- `requirements.txt` — all (assume production unless filename indicates otherwise)
- `requirements-dev.txt`, `dev-requirements.txt` — development only

**Quick mode:** Parse manifest files for dependency names.

**Full mode:**
```bash
pip show -v {package} | grep -iE "^License:|^ +License :: "
```
For each dependency. If pip not installed, fall back to quick mode.

**`pip show` alone answers `License:` with an empty value for packages that do have one.**
Measured on this machine: `setuptools` and `wheel` both print `License: ` with nothing after
it, while their metadata carries `License :: OSI Approved :: MIT License` in the classifier
block that only `-v` prints. Reading the `License:` line alone therefore reports two MIT
packages as undeclared. Matching both lines costs 51–73 B of output per dependency (the raw
`pip show -v` is 1.1–3.7 KB, which the grep never lets through) and answers `pip` with
`License: MIT` plus its classifier, `requests` with `Apache 2.0`.

**The `2>/dev/null` went for the reason it went in the JavaScript section.** A package that is
not installed makes pip write `WARNING: Package(s) not found: …` to stderr and nothing to
stdout, so the grep matches nothing and exits 1 — output identical to a package whose metadata
declares no licence. With stderr visible those two are one line apart. The empty-`License:`
case above shows why this matters here specifically: an empty result is *common* in this
ecosystem and must not be conflated with a failed lookup.

**Lock files:** `poetry.lock`, `Pipfile.lock`, `uv.lock`

**Fallback:** Python classifiers (`License :: OSI Approved :: MIT License`) — less reliable but sometimes only source.

### 2.3 Rust (Cargo)

**Detection:** `Cargo.toml` exists

**License field:** `[package] license` (SPDX expression, enforced by crates.io)

**Dependency fields:**
- `[dependencies]` — production
- `[dev-dependencies]` — development only
- `[build-dependencies]` — build time (MEDIUM risk)

**Quick mode:** Parse `Cargo.toml` for dependency names and their `package` fields if specified.

**Full mode:**
```bash
cargo metadata --format-version 1 | node -e '
let meta;
try { meta = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) { meta = null; }
if (!meta || !Array.isArray(meta.packages)) {
  console.error("cargo metadata produced no package list - see the cargo error above");
  process.exit(1);
}
const rows = meta.packages.map(p => ({ name: p.name, license: p.license, source: p.source }));
console.log(JSON.stringify(rows, null, 2));
'
```
Prints a JSON array with one `{name, license, source}` row per dependency (direct +
transitive). Most reliable ecosystem for license detection.

`cargo`'s stderr is deliberately **not** redirected to `/dev/null`: a missing `cargo`
otherwise exits 0 with no output, which is indistinguishable from "this project has no
Rust dependencies". If the command aborts with `cargo metadata produced no package list`,
the cause is printed directly above it — fall back to quick mode instead of reporting an
empty dependency set.

**Lock files:** `Cargo.lock`

### 2.4 Go

**Detection:** `go.mod` exists

**License field:** None — Go has NO standard license metadata in modules.

**Dependency fields:**
- `go.mod` → `require` blocks — all dependencies

**Quick mode:** Parse `go.mod` for module paths.

**Full mode:**
```bash
go mod graph | node -e '
const raw = require("fs").readFileSync(0, "utf8").trim();
if (!raw) {
  console.error("go mod graph produced no output - see the go error above");
  process.exit(1);
}
const mods = new Set();
for (const line of raw.split("\n")) {
  for (const ref of line.trim().split(/\s+/)) {
    if (ref.lastIndexOf("@") > 0) mods.add(ref);
  }
}
if (mods.size === 0) {
  console.error("go mod graph produced no versioned modules - the output is not a dependency graph");
  process.exit(1);
}
console.log([...mods].sort().join("\n"));
'
```
Prints one sorted `module@version` line per distinct module. License detection requires
inspecting `LICENSE` files in module cache or repository.

`go mod graph` prints one line per dependency *edge*, not per module, so the same module
reappears once for every dependant: measured against `prometheus/prometheus` v2.53.0 that
is 3876 lines / **314 KB** describing 1246 modules, which the deduplication brings to 54 KB.
The output stays line-based rather than becoming JSON — the source is not JSON, and wrapping
1246 modules in objects made it *twice* as large as the plain list.

Stderr is deliberately no longer discarded: outside a module directory `go` writes
`go.mod file not found …` there and nothing to stdout, which `2>/dev/null` turned into an
empty dependency set indistinguishable from a Go project without dependencies.

**License detection strategy for Go:**
1. Check `$GOPATH/pkg/mod/{module}@{version}/LICENSE` if module cache exists
2. Otherwise, mark as UNKNOWN and recommend manual review
3. Go is the least reliable ecosystem for automated license detection

### 2.5 Maven (Java)

**Detection:** `pom.xml` exists

**License field:** `<licenses><license><name>` + `<url>` in pom.xml

**Dependency fields:**
- `<dependencies>` → `<dependency>` elements
- Check `<scope>`: `compile`/`runtime` = production, `test` = development, `provided` = deployment env

**Quick mode:** Parse `pom.xml` for dependency coordinates (groupId:artifactId:version).

**Full mode:**
```bash
mvn -B dependency:tree -DoutputType=text | node -e '
const raw = require("fs").readFileSync(0, "utf8");
const lines = raw.split("\n");
const mods = new Set();
let built = false;
let odd = 0;
for (const line of lines) {
  if (line.indexOf("BUILD SUCCESS") >= 0) { built = true; continue; }
  const t = line.replace(/^\[INFO\][ |+\\-]*/, "");
  if (t === line || t.split(":").length < 5) continue;
  if (!/^[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+:/.test(t)) continue;
  const m = t.match(/^([A-Za-z0-9_.-]+(?::[A-Za-z0-9_.+-]+){4,5})(?![A-Za-z0-9_.:+-])/);
  if (!m) { odd++; continue; }
  const f = m[1].split(":");
  const classifier = f.length === 6 ? f[3] + ":" : "";
  mods.add(f[0] + ":" + f[1] + ":" + classifier + f[f.length - 2] + ":" + f[f.length - 1]);
}
if (!built || mods.size === 0 || odd > 0) {
  for (const line of lines) {
    if (line.indexOf("[ERROR]") >= 0 || line.indexOf("BUILD FAILURE") >= 0) console.error(line);
  }
  console.error(!built
    ? "mvn did not report BUILD SUCCESS - no pom.xml here, or the build failed"
    : odd > 0
      ? "mvn printed " + odd + " coordinate-shaped lines this filter could not read - the result is incomplete, do not report it as a full scan"
      : "mvn built successfully but printed no dependency coordinates - empty tree, or the output format changed");
  process.exit(1);
}
console.log([...mods].sort().join("\n"));
'
```
Prints one sorted `groupId:artifactId[:classifier]:version:scope` line per distinct coordinate.
License extraction requires checking each dependency's POM; `scope` is kept because `test` and
`provided` dependencies are judged differently (see the field table above).

**A Maven coordinate has five fields or six, and reading only five drops dependencies without
a sound.** A classified artifact prints as
`groupId:artifactId:packaging:classifier:version:scope` — measured against
`io.netty:netty-transport-native-epoll:jar:linux-x86_64:4.1.111.Final:compile`, a direct
dependency that a five-field pattern skips entirely while the seven unclassified rows around it
parse fine, so no guard fires and the licence report is short one package. Native-transport and
`test-jar`/`sources` dependencies are exactly where classifiers occur, which is why the fields
are counted from the **end** (scope last, version second-to-last) rather than by position, and
why the classifier is carried into the key — two rows differing only in classifier are two
artifacts with potentially different licences.

**The `odd` counter is the other half of that lesson.** Whatever else this filter does, it must
not let a line it cannot read pass as a line that was not there: any row that still looks like
a coordinate but does not parse aborts the whole scan. Two shapes are excluded from that count
on purpose, both verified against real output — the root project line
(`com.example:probe:jar:1.0.0`, four fields and no scope, since the project is not a dependency
of itself) and Maven's `Finished at: 2026-…T…:…:…` footer, whose colons come from the clock.

**Maven's problem is not the tree, it is everything around it.** Against a cold local
repository — the normal state on a build agent — `mvn dependency:tree` for a project with a
*single* dependency printed **144,391 B in 458 lines, of which 442 were download progress and
3 were the answer**; the filter reduces that to 128 B. `-B` (batch mode) alone already halves
it to 63,575 B by dropping the byte-by-byte progress bars, which is why it is in the command
rather than left to the filter.

**The output is lines, not JSON, and that is a measured choice.** Warm — everything cached, 19
modules — the raw command is 1,966 B, and a JSON array of `{group, artifact, version, scope}`
objects over the same 19 modules came to **2,413 B**: the filter made the output *larger* than
what it filtered. The same trade-off decided the Go section above. Coordinate lines are
shorter than Maven's tree lines because the `[INFO] +- ` prefix and the `:jar:` packaging
segment fall away, so the line form wins in both the warm and the cold case.

**`2>/dev/null` was not just useless here, it was misleading.** Maven writes its entire log —
including build failures — to **stdout**; stderr stays empty. Running without a `pom.xml`
produces exit 1 and 1,323 B of Maven log on stdout, so the redirect suppressed nothing at all
while implying the failure path was handled. What it *did* hide is the one case that matters:
with Maven not installed, the shell writes `mvn: command not found` to stderr, leaves stdout
empty, and exits 127 — the redirect turned an absent toolchain into a project with no
dependencies.

**Because Maven diagnoses on stdout, the filter has to hand the diagnosis back itself.** This
is the opposite of every other command in this file, where "do not redirect stderr" is enough:
here the explanation travels *inside the pipe*, so a filter that only prints its own message
swallows the very lines that say what went wrong. Hence the `[ERROR]` replay before the abort
— without it the caller gets a one-line complaint and no Maven output at all. The
`BUILD SUCCESS` assertion is the matching half: it is the only marker in that stream that
tells a real tree from a log which merely contains the word "dependency".

**License name normalization (Maven uses free-form text):**
- `"The Apache Software License, Version 2.0"` → `Apache-2.0`
- `"GNU General Public License, version 2"` → `GPL-2.0-only`
- `"MIT License"` → `MIT`
- `"Eclipse Public License 2.0"` → `EPL-2.0`

### 2.6 Gradle (Java/Kotlin)

**Detection:** `build.gradle` or `build.gradle.kts` exists

**Dependency fields:** `dependencies { }` block
- `implementation` / `api` — production
- `testImplementation` — development only
- `compileOnly` — compile time (varies)

**Quick mode:** Parse build file for dependency declarations.

**Full mode:**
```bash
gradle -q dependencies --configuration runtimeClasspath | node -e '
const raw = require("fs").readFileSync(0, "utf8");
const mods = new Set();
let odd = 0;
for (const line of raw.split("\n")) {
  const t = line.replace(/^[ |+\\-]*(?:---)? */, "");
  if (!/^[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+(?![A-Za-z0-9_.-])/.test(t)) continue;
  const base = t.match(/^([A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+)(?::([A-Za-z0-9_.+-]+))?/);
  const arrow = t.match(/-> ([A-Za-z0-9_.+-]+)/);
  const version = arrow ? arrow[1] : base && base[3];
  if (!base || !version) { odd++; continue; }
  mods.add(base[1] + ":" + base[2] + ":" + version);
}
if (mods.size === 0 || odd > 0) {
  console.error(odd > 0
    ? "gradle printed " + odd + " coordinate-shaped lines this filter could not read - the result is incomplete, do not report it as a full scan"
    : "gradle printed no dependency coordinates - the configuration is empty, or this is not a gradle project, the configuration name is wrong, or the build failed; see the gradle output above");
  process.exit(1);
}
console.log([...mods].sort().join("\n"));
'
```
Prints one sorted `group:artifact:version` line per distinct coordinate — same line form and
same reasoning as Maven and Go above. No scope column here: the configuration is chosen in the
command, so every row shares it.

Use `./gradlew` in place of `gradle` where the project ships a wrapper — which is the common
case and the one to prefer, since it pins the Gradle version.

License detection same as Maven (POM-based).

**Gradle needs the version taken from the right place, and a coordinate is not always three
fields.** Five shapes appear in a real tree — every one of them observed in the measured run
below. The third and fourth are what a plain `group:artifact:version` pattern drops without a
sound; the fifth is one this filter reads although Gradle says it is not a dependency:

| line | version on the classpath | why |
|---|---|---|
| `org.springframework:spring-context:6.1.11` | `6.1.11` | plain |
| `com.google.guava:guava:31.0-jre -> 33.2.1-jre` | `33.2.1-jre` | conflict resolution |
| `org.slf4j:slf4j-api:{strictly 2.0.13} -> 2.0.13` | `2.0.13` | rich version constraint — `{` ends the third field early |
| `org.apache.commons:commons-lang3 -> 3.14.0` | `3.14.0` | **no version in the build file at all** |
| `commons-codec:commons-codec:1.16.1 -> 1.17.0 (c)` | `1.17.0` | constraint from a BOM — per Gradle's own legend "a dependency constraint, **not a dependency**" |

The fourth is not exotic. Declaring dependencies without a version and letting a BOM or
platform supply it is the normal arrangement in Spring Boot projects, and the coordinate then
carries only *two* colon-separated fields before the arrow. So: the version comes from after
the arrow whenever there is one — it is the one actually on the classpath, and taking the
declared one would report a version that is not in the build — the third field is optional, and
anything still shaped like a coordinate that yields no version at all raises `odd` and aborts.
Same rule as Maven, same reason: a line this filter cannot read must not pass as a line that
was not there.

**A project with no dependencies at all aborts here too**, with `No dependencies` under the
configuration heading and nothing else to read. That is a legitimate build, not a broken one —
the message names it first for that reason. Stopping is still the right move for a licence
scan: an empty result that means "nothing declared" and one that means "the scan never ran"
are indistinguishable to the reader, so the caller has to confirm which it is.

Header lines, the configuration description and `(n) - dependencies omitted` carry no colon
pair and are skipped before that test — as is `\--- project ':core'`, where the space in front
of the quoted name keeps a project-to-project reference (no external licence to look up) out of
the count. That test ends in a negative lookahead rather than the `$` anchor it reads like it
wants: `$` is forbidden inside these single-quoted scripts (see `docs/plugin-howto.md`), and
`(?![A-Za-z0-9_.-])` is satisfied by end-of-line as well as by the space or colon that follows
a coordinate.

**The `(c)` rows are read, and that is the one place this snippet reports too much rather than
too little.** A constraint line carries a full coordinate, so nothing in the test above sets it
apart from a real dependency. Measured on the tree of the run below: its 11 `(c)` lines yielded
8 distinct coordinates, and every one of them already stood in the tree as a real dependency row
as well — Gradle shows a constraint only for a module the build actually resolves, so the marker
alone costs nothing. That this holds *always* is an expectation, not a measurement.

**What does leak through is the BOM module itself.** `spring-boot-dependencies` and
`jackson-bom` appear as nodes of the tree, but they are POM-only and land on no classpath; the
filter reported them, Gradle's own resolution did not — 2 of 35 reported rows in the measured
run. **So a report from this snippet can name BOM artifacts that are not actually shipped.**
That is the reverse of the failure this section was written against: nothing goes missing
quietly, two rows are added quietly. Both were Apache-2.0 here, so the verdict held, but a
reviewer chasing every reported coordinate should know that a POM-only aggregator may be among
them. Suppressing them would mean deciding from the tree text alone which coordinates are
POM-only, which the text does not say — naming the limit is the cheaper half of that trade.

**The `2>/dev/null` here was the pure form of the failure this fixes.** With Gradle absent the
shell writes `command not found` to stderr, stdout stays empty, exit is 127 — measured, both
for `gradle` and for `./gradlew` in a directory without a wrapper (151 B and 162 B of stderr
respectively). With stderr discarded, all of that reaches the caller as an empty dependency
list.

> **Verified against a running Gradle — 9.6.1 on Java 25, 2026-08-04.** A two-module build
> pulling in the Spring Boot BOM, Guava, Beam, a `strictly` constraint and a project reference
> produced a 91-line tree; the filter read it end to end with `odd = 0` and reported 35
> coordinates. The oracle was Gradle's own resolution
> (`configurations.runtimeClasspath.incoming.artifactView`), not a reading of the same text:
> **of the 33 artifacts actually on the classpath, none went missing.** The two surplus rows are
> the BOM overreporting described above, and every shape in the table occurred for real —
> including `{strictly …}`, which never turns up without its arrow, since Gradle prints the
> resolved version after it even when nothing conflicts. The failure forms are measured
> separately: an empty tree, a wrong configuration name and a broken build file each exit
> non-zero with a named cause and Gradle's own error left on stderr.
>
> Unverified beyond that run: other Gradle versions, whether a constraint can ever name a
> module that appears nowhere else in the tree, and the `odd > 0` abort itself — no line of
> that tree was coordinate-shaped without yielding a version.

### 2.7 .NET (C#)

**Detection:** `*.sln` or `*.csproj` exists

**License field:** `<PackageLicenseExpression>` in `.csproj` (SPDX)

**Dependency fields:** `<PackageReference>` elements in `.csproj`

**Quick mode:** Parse `.csproj` for PackageReference elements.

**Full mode:**
```bash
dotnet list package --include-transitive --format json | node -e '
let d;
try { d = JSON.parse(require("fs").readFileSync(0, "utf8")); } catch (e) { d = null; }
if (!d || typeof d !== "object" || !Array.isArray(d.projects)) {
  console.error("dotnet list package returned no project list - not a project directory, restore not run, or the command failed; see the error above");
  process.exit(1);
}
const mods = new Map();
for (const p of d.projects) {
  for (const f of p.frameworks || []) {
    for (const kind of ["topLevelPackages", "transitivePackages"]) {
      for (const pkg of f[kind] || []) {
        if (!pkg.id) continue;
        const version = pkg.resolvedVersion || pkg.requestedVersion || null;
        const transitive = kind === "transitivePackages";
        const key = pkg.id + ":" + version;
        const prev = mods.get(key);
        if (prev && !(prev.transitive && !transitive)) continue;
        mods.set(key, { id: pkg.id, version, transitive, resolved: version !== null });
      }
    }
  }
}
if (mods.size === 0) {
  console.error("dotnet reported projects but no packages - run dotnet restore first, or this project has no PackageReference");
  process.exit(1);
}
console.log(JSON.stringify([...mods.values()], null, 2));
'
```

**`--format json` is the point of this rewrite, not the filter around it.** The default output
is a per-framework table of aligned columns, repeated for every target framework of every
project in the solution, with an `(A)` marker column and a trailing legend — no stable field
boundaries to parse. The JSON form carries the same data keyed by name, exposes
`resolvedVersion` (what is actually on disk) separately from the `requestedVersion` range in
the project file, and separates top-level from transitive packages, a distinction the licence
report needs and the table conveys only by which section a row happens to sit in.

**`2>/dev/null` hid the same 127 as everywhere else.** Without the .NET SDK the shell writes
`command not found` to stderr, prints nothing to stdout, and exits 127 (measured: 151 B of
stderr) — indistinguishable from a clean scan once stderr is gone. The second guard covers the
quieter case: on SDK 9 and earlier the command does not restore on its own, so run before
`dotnet restore` it reports the projects but no packages — valid JSON that would otherwise pass
as an empty, successful licence scan.

**A `transitivePackages` entry is not necessarily a NuGet package.** Project-to-project
references appear in that array alongside real packages with no field distinguishing them — a
known and still-open gap in the JSON report. They have no NuGet licence metadata, so looking
one up will fail; treat a lookup miss on a transitive entry as "possibly a project reference"
before reporting it as an unlicensed dependency. **Not reproduced on SDK 8.0.423:** in the
measured solution below the project reference stayed out of `transitivePackages` entirely. The
advice is kept because acting on it costs nothing and the gap is reported for other SDK
versions — read it as a case to be ready for, not as behaviour observed here.

**An entry without a version is reported, not dropped**, as `{version: null, resolved: false}`
— the same treatment `npm ls` gives a platform-specific optional dependency further up this
file, and for the same reason: a row this filter cannot resolve must not leave silently, or the
scan reports fewer dependencies than the project has and looks clean doing it. Dropping is
what a `continue` here would do, and aborting would be worse still, since an unresolved entry
is a routine occurrence in a multi-project solution rather than a broken run. Look such rows up
against NuGet before counting them as scanned.

**Which is why the deduplication resolves ties instead of letting the last write win.** The key
is `id:version`, so the same package listed once as top-level and once as transitive — across
projects or frameworks of a solution — lands on one key, and with `version` being `null` for
every unresolved row, keeping those makes such collisions common rather than rare. A plain
`set` would let whichever entry came last decide, so a package could be reported as transitive
in one run and top-level in the next depending on iteration order. Top-level wins explicitly:
it is the stronger statement about the project, and it is the one that decides whether a
licence obligation is direct.

> **Verified against a running dotnet — SDK 8.0.423 on Linux, 2026-08-04.** A two-project
> solution (`Serilog.Sinks.File`, `Microsoft.Extensions.Hosting`, plus a project reference)
> emitted 35 package entries, 34 of them distinct; the filter returned 34 and exit 0, so
> **nothing was dropped.** The field names above are the ones the SDK actually writes. The
> tie-break is not merely described but was triggered for real: `Newtonsoft.Json:13.0.3` arrived
> transitive from one project and top-level from the other, and left as `"transitive": false`.
> Both failure forms abort loudly — an empty stream and a non-JSON stream each exit non-zero
> with a named cause. Not exercised there: an entry without a resolvable version, since every
> package in that solution resolved — the `{version: null}` path above remains reasoned, not
> observed.
>
> **The version floor stands, and reaching it is not a silent failure.** `--format json` still
> needs **.NET SDK 7.0.200 or newer**, but an older SDK has only two ways to react: reject the
> option, leaving stdout empty, or print the table, which makes `JSON.parse` throw. Both end in
> the abort above, so no separate version check is warranted. Measured through a text-output
> stand-in — no pre-7.0.200 SDK was on hand.
>
> **On .NET 10 the command is spelled `dotnet package list`** — the arguments are unchanged.
> `dotnet list package` is the form for SDK 9 and earlier. Not exercised in the run above.

**Per-package license:** NuGet metadata (requires network access or local cache).

---

## 3. LLM Model Licenses

### 3.1 Model License Table

| Model Family | License | Commercial Use | Key Restrictions | SPDX |
|-------------|---------|---------------|-----------------|------|
| Llama 2/3 (Meta) | Meta Community License | Conditional | 700M MAU limit; no training competing LLMs | — |
| CodeLlama | Meta Community License | Conditional | Same as Llama | — |
| Mistral (open) | Apache-2.0 | Yes | Standard Apache terms | `Apache-2.0` |
| Mixtral | Apache-2.0 | Yes | Standard Apache terms | `Apache-2.0` |
| Codestral | Mistral AI Non-Production License | No | Research/testing only | — |
| Phi-2/3 (Microsoft) | MIT | Yes | Permissive | `MIT` |
| Gemma (Google) | Gemma Terms of Use | Yes | Use restrictions (no harm) | — |
| Falcon (TII) | Apache-2.0 (most) | Yes | Check per model size | `Apache-2.0` |
| Qwen (Alibaba) | Various | Check per model | Some Apache, some custom | — |
| StableDiffusion | CreativeML Open RAIL-M | Yes | Use restrictions (no deepfakes, harm) | — |
| Whisper (OpenAI) | MIT | Yes | Permissive | `MIT` |
| GPT-* (OpenAI) | Proprietary API | Via API only | ToS apply, no weights | — |
| Claude (Anthropic) | Proprietary API | Via API only | ToS apply, no weights | — |
| Gemini (Google) | Proprietary API | Via API only | ToS apply, no weights | — |

### 3.2 Detection Patterns

Grep for these patterns in code and config files:

```
llama[-_ ]?[234]|codellama|mistral|mixtral|codestral|gpt-[34]|gpt-4o|claude[-_ ]?[234]|claude[-_ ]?opus|claude[-_ ]?sonnet|claude[-_ ]?haiku|gemini|gemma|phi-[234]|qwen|falcon|stable[-_ ]?diffusion|dall[-_ ]?e|whisper|deepseek
```

**Search in file types:**
`*.py`, `*.js`, `*.ts`, `*.java`, `*.go`, `*.rs`, `*.yaml`, `*.yml`, `*.json`, `*.toml`, `*.env`, `*.cfg`, `*.ini`, `Dockerfile`, `docker-compose*.yml`

**False positive mitigation:**
- Skip matches inside comments or documentation files (*.md)
- Verify match is in a model name/config context (e.g., key like `model`, `model_name`, `llm`, `engine`)
- Skip matches in dependency lock files (already covered by Phase 2)

### 3.3 Compatibility Notes

| Project License | Llama | Mistral/Mixtral | Phi | OpenAI API | Proprietary models |
|----------------|-------|-----------------|-----|------------|-------------------|
| MIT | WARNING | OK | OK | OK | OK |
| Apache-2.0 | WARNING | OK | OK | OK | OK |
| GPL-3.0 | WARNING | OK | OK | OK | WARNING |
| Proprietary | WARNING | OK | OK | OK | OK |

**Llama WARNING:** Meta Community License has restrictions (MAU limit, no competing LLM training) that are not compatible with fully open redistribution. Always flag for human review.

**API-only models (GPT, Claude, Gemini):** No license compatibility issue since no model weights are distributed. Only flag if the project bundles model weights (not API calls).

---

## 4. Known Problem Patterns

### 4.1 GPL Dependencies in Permissive/Proprietary Projects

Most common conflict. If project is MIT/Apache/Proprietary and any production dependency is GPL-2.0 or GPL-3.0: **INCOMPATIBLE**.

**Recommendations:**
1. Find alternative permissive-licensed library
2. If no alternative: consider relicensing project under GPL
3. If dev-only: document that it's not distributed (change to WARNING)

### 4.2 License-Changed Packages

Known packages that changed from permissive to restrictive licenses:

| Package | Old License | New License | Breaking Version | Alternative |
|---------|-------------|-------------|-----------------|-------------|
| Redis | BSD-3-Clause | SSPL / RSALv2 | 7.4+ | Valkey (BSD) |
| Elasticsearch | Apache-2.0 | SSPL / Elastic License 2.0 | 7.11+ | OpenSearch (Apache) |
| MongoDB | AGPL-3.0 | SSPL | 4.0+ | — |
| Terraform | MPL-2.0 | BSL 1.1 | 1.6+ | OpenTofu (MPL) |
| Grafana | Apache-2.0 | AGPL-3.0 | 7.0+ | — |
| Sentry | BSD-3-Clause | FSL (Functional Source License) | self-hosted | — |
| CockroachDB | Apache-2.0 | BSL 1.1 | — | — |

**Detection:** If a dependency matches this list AND the version is at or above the breaking version, flag as WARNING with note about the license change and available alternatives.

### 4.3 Missing License

No LICENSE file AND no license field in manifest → **assume Proprietary**.

Always mark as **WARNING** with recommendation:
- "No license found for {package}. Assume proprietary — cannot use without explicit permission."
- "Contact maintainer or use alternative package."

### 4.4 Dev vs Production Scope

| Scope | Risk Level | Status when Incompatible |
|-------|-----------|-------------------------|
| Production (dependencies, api) | High | INCOMPATIBLE |
| Peer (peerDependencies) | High | INCOMPATIBLE |
| Development (devDependencies, test) | Low | WARNING |
| Build (buildDependencies) | Medium | WARNING |
| Optional | Varies | WARNING |

Dev-only dependencies are not distributed with the software, so copyleft typically doesn't trigger. However, some interpretations disagree — flag as WARNING, not INCOMPATIBLE.

### 4.5 Transitive Dependencies

A transitive dependency with an incompatible license is just as problematic as a direct one.

- **Full mode:** Catches these via `npm ls --all`, `cargo metadata`, etc.
- **Quick mode:** Does NOT check transitive deps (by design — trade-off for speed)
- Always note in report if running in quick mode: "Transitive dependencies not checked. Run full scan for comprehensive analysis."

### 4.6 SPDX Expression Parsing

| Pattern | Meaning | How to Evaluate |
|---------|---------|----------------|
| `MIT` | Single license | Check directly |
| `MIT OR Apache-2.0` | User choice | OK if ANY option is compatible |
| `MIT AND BSD-2-Clause` | Both apply | Check EACH; worst result wins |
| `GPL-2.0-only WITH Classpath-exception-2.0` | License + exception | Exception relaxes base license |
| `GPL-2.0-or-later` | Version flexibility | Can treat as GPL-3.0 if more compatible |
| `UNLICENSED` | Proprietary (npm convention) | Treat as Proprietary |
| `SEE LICENSE IN <file>` | Custom license | Read file, mark as WARNING if unclear |

---

## 5. Report Template

```markdown
# License Compatibility Report

**Project:** {project_name}
**License:** {license_name} ({spdx_id}) — {category}
**Date:** {YYYY-MM-DD}
**Mode:** {full|quick}

---

## Summary

| Metric | Count |
|--------|-------|
| Items checked | {total} |
| Incompatible | {incompat_count} |
| Warnings | {warning_count} |
| OK | {ok_count} |

**Verdict:** {ONE OF: "All clear — no compatibility issues found." | "Warnings found — review recommended before distribution." | "Incompatible licenses detected — must resolve before distribution."}

---

## Findings

{Only show INCOMPATIBLE and WARNING items. If none, show "No issues found."}

| # | Item | Version | License | Scope | Status | Issue |
|---|------|---------|---------|-------|--------|-------|
| {n} | {name} | {version} | {license} | {scope} | {status} | {brief description} |

---

## LLM Models

{Only show if LLM model references were found.}

| Model | License | Status | Notes |
|-------|---------|--------|-------|
| {model} | {license} | {status} | {notes} |

---

## Recommendations

{Numbered list with one actionable item per INCOMPATIBLE/WARNING finding.}

1. **{item}** ({status}): {recommendation}

---

## Coverage Notes

{Include if applicable:}
- Ecosystems scanned: {list}
- Tools not available: {list of ecosystem tools that were not installed}
- Quick mode: Transitive dependencies not checked.
```

---

## 6. Integration Hooks

### 6.1 Standalone Invocation

Via slash command:
```
/agenticaiplugin:license-check
/agenticaiplugin:license-check --quick
```

### 6.2 Programmatic Invocation from Other Skills/Agents

Other skills can invoke the license-checker agent directly:

```
Agent(
    subagent_type="agenticaiplugin:license-checker",
    description="Check dependency license compatibility",
    prompt="Check license compatibility for this project. Mode: quick. Project license: Apache-2.0 (Apache-2.0)."
)
```

**Parameters in prompt:**
- `Mode: full` or `Mode: quick` — scan depth
- `Project license: {name} ({SPDX})` — if provided, agent skips Phase 1 (license detection)

### 6.3 github-publish Integration

The `github-publish` SKILL.md offers an optional license check after the github-publisher agent completes. The question is asked at skill level (not inside the agent, since the agent has no Agent tool).

Flow:
1. github-publisher agent finishes (license created/detected)
2. SKILL.md asks user: "Would you also like to run a license compatibility check?"
3. If yes: SKILL.md spawns the license-checker agent with the known project license

```
Agent(
    subagent_type="agenticaiplugin:license-checker",
    description="Check dependency license compatibility",
    prompt="Check license compatibility for this project. Mode: {quick|full}. Project license: {license_name} ({SPDX})."
)
```

The license-checker runs its full workflow — report is displayed and saved to `claudedocs/license-check-result.md`. Phase 1 is skipped since the project license is provided in the prompt.
