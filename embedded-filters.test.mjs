// Executes the `node -e` filters that are embedded in shipped markdown (issue #87).
//
// These filters are the only thing standing between a failed external command and a
// clean-looking report: `npm audit` writes its ENOLOCK object to *stdout* with exit 0,
// `gradle` prints a header and nothing else for a broken build, `dotnet` prints a table
// instead of JSON on an old SDK. Every one of those must end in a loud abort, and the
// happy path must produce the exact rows the caller then judges licences or advisories
// against. Thirteen commits touched such a line in three days, and nothing ran them.
//
// The filters are EXTRACTED from the markdown, never retyped. A copy in this file would
// only prove that two texts agree — the failure mode that got
// skills/npm-publisher/version-sync-includes.test.mjs deleted in ec431d3. What is asserted
// here is behaviour: exit code, stdout content, and a non-empty stderr on the error paths.
// Message wording is deliberately NOT asserted; it is prose and changes for good reasons.
//
// The marker is the invocation line itself — `node -e '` at end of line opens a snippet,
// a line starting with `'` closes it. No convention was introduced into the markdown.
//
// Scope: the filters that read stdin and write stdout. The four source-map scanners take a
// path in process.argv and the tilde resolver takes a string; they are extracted (and
// covered by the quoting check) but not run. The grep/find patterns of #100/#102/#104 are
// the same defect class in another language and stay out — covering them here would turn
// this file into the harness #87 was cut down from.
//
// Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

const AGENT = 'agents/npm-publisher.md';
const NPM_REF = 'skills/npm-publisher/reference.md';
const LIC_REF = 'skills/license-check/reference.md';
const SOURCES = [AGENT, NPM_REF, LIC_REF];

/** Every `node -e` snippet in `file`, as { file, line, body }. */
function extractFilters(file) {
  const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/node -e '$/.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith("'")) j++;
    assert.ok(j < lines.length, `${file}:${i + 1}: unterminated node -e snippet`);
    found.push({ file, line: i + 1, body: lines.slice(i + 1, j).join('\n') });
    i = j;
  }
  return found;
}

/**
 * The one snippet in `file` whose body matches `signature`. Both halves of that
 * contract are asserted: zero matches means the test silently stopped covering
 * anything, more than one means the signature no longer identifies a single filter.
 */
function filterBody(file, signature) {
  const hits = extractFilters(file).filter((f) => signature.test(f.body));
  assert.equal(hits.length, 1, `${file}: expected exactly 1 filter matching ${signature}`);
  return hits[0].body;
}

/** Runs a filter body the way the shell would, with `stdin` piped in. */
function run(body, stdin) {
  return spawnSync(process.execPath, ['-e', body], { input: stdin, encoding: 'utf8' });
}

/**
 * rc 1 plus a *named* diagnosis on stderr — the whole point of every error path below.
 *
 * The crash check is not decoration. An uncaught TypeError also exits 1 and also writes to
 * stderr, so "rc 1 and stderr is not empty" passes just as happily for a filter that fell
 * over as for one that recognized the situation. Measured: dropping the `!a.metadata` guard
 * from the audit filter made it crash on the ENOLOCK body, and this assertion was the only
 * thing that noticed. Stack frames are matched instead of the message, so the wording stays
 * free to change.
 */
function assertLoudAbort(result, what) {
  assert.equal(result.status, 1, `${what}: expected exit 1, got ${result.status}`);
  assert.ok(result.stderr.trim().length > 0, `${what}: aborted without saying why`);
  assert.ok(
    !/^\s+at /m.test(result.stderr),
    `${what}: crashed instead of naming the cause — ${result.stderr.split('\n')[0]}`,
  );
}

const fixture = (name) => readFileSync(join(REPO_ROOT, 'skills/license-check/fixtures', name), 'utf8');

// ---------------------------------------------------------------------------
// The quoting layer

// The snippets live inside single-quoted shell arguments, so a `'` anywhere in the body
// ends the argument early and hands the rest to the shell. node -e receives the body
// directly here, which means no test below could ever catch that — this one can.
test('no embedded filter contains a single quote', () => {
  // Both characters, because the shape has to survive two contexts: a `'` closes the
  // argument early in either, and a `$` is expanded by the shell when the pipeline runs
  // inside `$( )`. plugin-howto.md states the contract as "no `'` and no `$`".
  const offenders = SOURCES.flatMap(extractFilters)
    .filter((f) => f.body.includes("'") || f.body.includes('$'))
    .map((f) => `${f.file}:${f.line} (${f.body.includes("'") ? "'" : '$'})`);
  assert.deepEqual(offenders, [], "a `'` closes the shell argument early; a `$` is expanded inside `$( )`");
});

// ---------------------------------------------------------------------------
// license-check: Gradle
//
// Fixtures are the recorded output of Gradle 9.6.1 on a project with a Spring Boot BOM,
// a conflict, a `strictly` constraint and a project reference (issue #101). The oracle
// beside it comes from Gradle's own artifactView, not from reading the tree.

const gradle = () => filterBody(LIC_REF, /gradle printed no dependency coordinates/);

test('gradle filter loses no coordinate the classpath actually carries', () => {
  const r = run(gradle(), fixture('gradle-dependencies.txt'));
  assert.equal(r.status, 0, r.stderr);
  const got = r.stdout.trim().split('\n');
  const oracle = fixture('gradle-dependencies.oracle.txt').trim().split('\n');

  assert.deepEqual(oracle.filter((c) => !got.includes(c)), [], 'coordinates lost by the filter');
  // Known and accepted overreporting: the two BOM modules are nodes in the tree but are
  // POM-only, so they reach no classpath. A licence scan looks them up and gets a valid
  // answer; the cost is two rows that are not a shipped dependency.
  assert.deepEqual(got.filter((c) => !oracle.includes(c)), [
    'com.fasterxml.jackson:jackson-bom:2.17.2',
    'org.springframework.boot:spring-boot-dependencies:3.3.2',
  ]);
  // The four documented line shapes, each resolved to what is really on the classpath.
  assert.ok(got.includes('com.google.guava:guava:31.0-jre'), 'plain');
  assert.ok(got.includes('commons-codec:commons-codec:1.17.0'), 'conflict resolution');
  assert.ok(got.includes('org.slf4j:slf4j-api:2.0.13'), 'rich version constraint');
  assert.ok(got.includes('org.apache.commons:commons-lang3:3.14.0'), 'version from the BOM');
  assert.ok(!got.some((c) => c.includes('project')), "`\\--- project ':core'` is not a coordinate");
});

// Constructed from Gradle's documented output shape, not recorded: a build whose
// runtimeClasspath is empty. This is a legitimate project, and the abort is still right for a
// licence scan — but the message used to offer only broken causes, which is why it now names
// the empty configuration first.
const EMPTY_TREE = [
  '',
  '------------------------------------------------------------',
  "Root project 'demo'",
  '------------------------------------------------------------',
  '',
  "runtimeClasspath - Runtime classpath of source set 'main'.",
  'No dependencies',
  '',
].join('\n');

test('gradle filter aborts loudly when it cannot read the tree', () => {
  assertLoudAbort(run(gradle(), ''), 'empty input');
  assertLoudAbort(run(gradle(), 'FAILURE: Build failed with an exception.\n'), 'build failure');
  assertLoudAbort(run(gradle(), EMPTY_TREE), 'project without dependencies');
  // Constructed, not recorded: a readable coordinate next to one whose version the filter
  // cannot reach. The readable line is what makes this a test of `odd > 0` — without it the
  // empty-result branch aborts anyway and the counter could be deleted unnoticed. Half a
  // tree must not pass as a full scan.
  assertLoudAbort(
    run(gradle(), '+--- com.google.guava:guava:31.0-jre\n+--- org.slf4j:slf4j-api:{strictly 2.0.13}\n'),
    'unreadable coordinate beside a readable one',
  );
});

// ---------------------------------------------------------------------------
// license-check: .NET
//
// Recorded from .NET SDK 8.0.423 over a two-project solution (issue #101). The absolute
// project paths of that run were replaced by relative ones — the filter never reads the
// `path` field, and a developer path must not ship inside the plugin.

const dotnet = () => filterBody(LIC_REF, /dotnet list package returned no project list/);

test('dotnet filter reports every package once and resolves the top-level tie-break', () => {
  const r = run(dotnet(), fixture('dotnet-list-package.json'));
  assert.equal(r.status, 0, r.stderr);
  const rows = JSON.parse(r.stdout);
  assert.equal(rows.length, 34, 'one row per distinct id:version across both projects');
  // Newtonsoft.Json is transitive in App and top-level in Lib. Top-level must win, or the
  // licence report calls a direct dependency someone else's problem.
  assert.deepEqual(rows.filter((p) => p.id === 'Newtonsoft.Json'), [
    { id: 'Newtonsoft.Json', version: '13.0.3', transitive: false, resolved: true },
  ]);
});

test('dotnet filter aborts loudly when it gets no project list', () => {
  assertLoudAbort(run(dotnet(), ''), 'empty input');
  // Stand-in for an SDK before 7.0.200, which does not know --format json and prints the
  // aligned table instead. Valid text, invalid JSON.
  assertLoudAbort(run(dotnet(), 'Project "App" has the following package references\n'), 'table');
  assertLoudAbort(run(dotnet(), '{"version":1,"projects":{}}'), 'projects is not an array');
  // Projects but no packages: dotnet restore was not run. Valid JSON that would otherwise
  // pass as an empty, successful licence scan.
  assertLoudAbort(run(dotnet(), '{"version":1,"projects":[{"frameworks":[]}]}'), 'no packages');
});

// ---------------------------------------------------------------------------
// npm-publisher: git log

// The separators are what `--pretty=format:"%H%x1f%s%x1f%b%x1e"` produces: US between the
// fields, RS between the records. The pipe in the second subject is the case that made the
// old `%H|%s|%b` format unparseable — here it must stay inside the subject.
const US = String.fromCharCode(31); // US, from %x1f
const RS = String.fromCharCode(30); // RS, from %x1e
const GIT_LOG = [
  `${'a'.repeat(40)}${US}feat: add thing${US}BREAKING CHANGE: gone${RS}`,
  `${'b'.repeat(40)}${US}fix: pipe | in subject${US}plain body${RS}`,
].join('\n');

const EXPECTED_COMMITS = [
  { hash: 'a'.repeat(12), subject: 'feat: add thing', breaking: true },
  { hash: 'b'.repeat(12), subject: 'fix: pipe | in subject', breaking: false },
];

for (const [file, signature, unwrap, emptyRangeIsOk] of [
  [AGENT, /git log record is not hash/, (o) => o.commits, 'no commits is a valid range'],
  [NPM_REF, /git log returned no commits/, (o) => o, null],
]) {
  const gitLog = () => filterBody(file, signature);

  test(`${file}: git log filter keeps subject and BREAKING CHANGE, drops the body`, () => {
    const r = run(gitLog(), GIT_LOG);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(unwrap(JSON.parse(r.stdout)), EXPECTED_COMMITS);
  });

  test(`${file}: git log filter aborts when the format string did not survive`, () => {
    // git wrote a diagnosis instead of records — no separators at all.
    assertLoudAbort(run(gitLog(), 'fatal: ambiguous argument\n'), 'git error text');
    // A short hash means the record boundaries slipped, not that the commit is short.
    assertLoudAbort(run(gitLog(), `deadbeef${US}subject${US}body${RS}`), 'truncated hash');
  });

  test(`${file}: git log filter handles empty input as documented`, () => {
    const r = run(gitLog(), '');
    if (emptyRangeIsOk) {
      assert.equal(r.status, 0, `${emptyRangeIsOk}: ${r.stderr}`);
      assert.deepEqual(JSON.parse(r.stdout), { commits: [] });
    } else {
      assertLoudAbort(r, 'empty range against a published tag');
    }
  });
}

// ---------------------------------------------------------------------------
// npm-publisher: npm pack / view / audit / outdated

test('npm pack filter prints the tarball name, and aborts when there is none', () => {
  const pack = filterBody(AGENT, /npm pack produced no tarball name/);
  const r = run(pack, '[{"id":"pkg@1.0.0","filename":"pkg-1.0.0.tgz","size":4711}]');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'pkg-1.0.0.tgz');

  // Without the abort the audit unpacks nothing and reports a clean package it never opened.
  assertLoudAbort(run(pack, ''), 'empty input');
  assertLoudAbort(run(pack, 'npm ERR! code E404'), 'not JSON');
  assertLoudAbort(run(pack, '[{}]'), 'no filename');
});

test('npm view filter summarizes the version list and separates absent from broken', () => {
  const view = filterBody(AGENT, /npm view returned no version list/);
  const versions = ['0.9.0', ...Array.from({ length: 11 }, (_, i) => `1.${i}.0`)];
  const r = run(view, JSON.stringify(versions));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), {
    exists: true,
    count: 12,
    latest: '1.10.0',
    recent: versions.slice(-10),
  });

  // Documented non-error: an unpublished package is a valid state, not a failure.
  const absent = run(view, '{"error":{"code":"E404","summary":"Not found"}}');
  assert.equal(absent.status, 0, absent.stderr);
  assert.deepEqual(JSON.parse(absent.stdout), { exists: false });

  assertLoudAbort(run(view, '[]'), 'empty list');
  assertLoudAbort(run(view, '"Not Found"'), 'a message where a version list belongs');
  assertLoudAbort(run(view, ''), 'empty input');
});

test('npm audit filter reports the tally and the high/critical rows', () => {
  const audit = filterBody(AGENT, /npm audit produced no usable report/);
  const counts = { info: 0, low: 1, moderate: 0, high: 1, critical: 0, total: 2 };
  const r = run(audit, JSON.stringify({
    metadata: { vulnerabilities: counts },
    vulnerabilities: {
      lodash: { severity: 'high', range: '<4.17.21', fixAvailable: true },
      ms: { severity: 'low', range: '<2.0.0', fixAvailable: false },
    },
  }));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), {
    counts,
    highOrCritical: [{ name: 'lodash', severity: 'high', range: '<4.17.21', fixAvailable: true }],
  });

  // The real ENOLOCK body: npm writes this to *stdout* and exits 0. Read as a report it
  // says "no vulnerabilities"; the filter must call it what it is.
  assertLoudAbort(
    run(audit, '{"error":{"code":"ENOLOCK","summary":"This command requires an existing lockfile.","detail":"Try creating one first with: npm i --package-lock-only"}}'),
    'ENOLOCK',
  );
  assertLoudAbort(run(audit, ''), 'empty input');
  assertLoudAbort(run(audit, '{"vulnerabilities":{}}'), 'no metadata');
});

test('npm outdated filter flags major drift only when both versions are known', () => {
  const outdated = filterBody(AGENT, /npm outdated produced no parseable report/);
  const r = run(outdated, JSON.stringify({
    lodash: { current: '3.10.1', wanted: '3.10.1', latest: '4.17.21' },
    // After --package-lock-only there is no node_modules and thus no `current`. Comparing
    // a missing current against latest would flag every such package as a laggard.
    ms: { wanted: '2.1.3', latest: '2.1.3' },
  }));
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), [
    { name: 'lodash', current: '3.10.1', wanted: '3.10.1', latest: '4.17.21', majorBehind: true },
    { name: 'ms', wanted: '2.1.3', latest: '2.1.3', majorBehind: false },
  ]);

  // Documented non-error: an up-to-date project yields `{}` → `[]`.
  const clean = run(outdated, '{}');
  assert.equal(clean.status, 0, clean.stderr);
  assert.deepEqual(JSON.parse(clean.stdout), []);

  assertLoudAbort(run(outdated, ''), 'empty input');
  assertLoudAbort(run(outdated, '[]'), 'array where an object belongs');
  assertLoudAbort(run(outdated, 'npm ERR! code ENOLOCK'), 'not JSON');
});
