// Tests for version-sync-scan.mjs — Node stdlib only, run with: node --test
//
// Black-box through the CLI (spawn the real script against a temp repo, parse the JSON
// report), matching the repo convention in agents/project-initializer/scripts/*.test.mjs.
//
// What these pin, and why each one exists:
//   - The THREE STATES stay distinguishable (issue #70): hits / searched-and-empty /
//     never-searched. Only the middle one may be reported as "in sync", so the empty
//     match list alone is never enough — status and stderr are asserted together.
//   - The `SKIPPED (...)` line reaches stderr verbatim. Losing it is exactly how #70
//     happened, and the prose in agents/npm-publisher.md refers to it by that wording.
//   - Every extension of the unified list is searched and an uncovered one is not. This
//     replaces skills/npm-publisher/version-sync-includes.test.mjs, the drift guard from
//     issue #72: with one copy of the list left there is nothing to compare it against,
//     so the guard is superseded by testing the behaviour instead of the copies.
//   - The constant shapes, including the idiomatic Objective-C literal @"1.2.3" (#72)
//     and the near-misses that must NOT match.
//   - Paths with a space (#70) and with an apostrophe (#65) — the two quoting defects.
//   - The three silent grep behaviours the port had to decide explicitly (#75, point 8):
//     symlinks not followed, binary files skipped, node_modules NOT excluded. A test per
//     decision, so a later change to any of them is a deliberate one.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'version-sync-scan.mjs');

/** A fresh repo root. `label` lets a test put a space or an apostrophe in the path. */
function repo(label = 'r') {
  const root = join(mkdtempSync(join(tmpdir(), 'vss-')), label);
  mkdirSync(root, { recursive: true });
  return root;
}

function write(root, rel, body) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
  return p;
}

function run(root) {
  const r = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
  return { status: r.status, stderr: r.stderr, report: JSON.parse(r.stdout) };
}

/** Matched files as `src/a.ts` style paths, relative to the repo root. */
function found(report, root) {
  return report.matches.map((m) => m.file.slice(root.length + 1).replaceAll('\\', '/')).sort();
}

// ---- the three states ----------------------------------------------------

test('hits: reports file, line and version per matching line', () => {
  const root = repo();
  write(root, 'src/a.ts', 'const x = 1;\nexport const VERSION = "1.2.3";\n');
  const { status, stderr, report } = run(root);

  assert.equal(status, 0);
  assert.equal(report.status, 'scanned');
  assert.deepEqual(report.scannedDirs, ['src']);
  assert.equal(report.errors.length, 0);
  assert.equal(report.matches.length, 1);
  assert.equal(report.matches[0].file, join(root, 'src/a.ts'));
  assert.equal(report.matches[0].line, 2, 'line number is 1-based, like grep -n');
  assert.equal(report.matches[0].version, '1.2.3');
  assert.equal(report.matches[0].text, 'export const VERSION = "1.2.3";');
  assert.equal(stderr, '', 'a completed scan says nothing on stderr');
});

test('searched and empty: the only state that may be reported as in sync', () => {
  const root = repo();
  write(root, 'src/a.ts', 'export const NAME = "app";\n');
  const { status, stderr, report } = run(root);

  assert.equal(status, 0);
  assert.equal(report.status, 'scanned', 'scanned, not skipped — the source dir existed');
  assert.deepEqual(report.matches, []);
  assert.deepEqual(report.errors, []);
  assert.ok(!stderr.includes('SKIPPED'), 'no SKIPPED: this scan really ran');
});

test('never searched: no source directory yields SKIPPED, not an empty clean scan', () => {
  const root = repo();
  write(root, 'index.js', 'const VERSION = "1.2.3";\n'); // outside every candidate dir
  const { status, stderr, report } = run(root);

  assert.equal(report.status, 'skipped');
  assert.equal(report.reason, 'no source directory found: src, app/src, lib');
  assert.deepEqual(report.scannedDirs, []);
  assert.deepEqual(report.matches, [], 'empty — but status says why, so it is not "in sync"');
  assert.match(stderr, /^SKIPPED \(no source directory found: src, app\/src, lib\)$/m);
  assert.equal(status, 0, 'a repo without a source dir is a normal outcome, not an error');
});

test('a nonexistent repo path is skipped with its own reason, never reported as clean', () => {
  const { status, stderr, report } = run(join(repo(), 'does-not-exist'));

  assert.equal(report.status, 'skipped');
  assert.match(report.reason, /repository path does not exist/);
  assert.deepEqual(report.matches, []);
  assert.match(stderr, /^SKIPPED \(repository path does not exist/m);
  assert.equal(status, 0);
});

// ---- which directories are searched --------------------------------------

test('searches all three candidate directories and recurses into them', () => {
  const root = repo();
  write(root, 'src/deep/nested/a.ts', 'const VERSION = "1.0.0";\n');
  write(root, 'app/src/b.js', 'const VERSION = "2.0.0";\n');
  write(root, 'lib/c.mjs', 'const VERSION = "3.0.0";\n');
  const { report } = run(root);

  assert.deepEqual(report.scannedDirs, ['src', 'app/src', 'lib']);
  assert.deepEqual(found(report, root), ['app/src/b.js', 'lib/c.mjs', 'src/deep/nested/a.ts']);
});

test('ignores version constants outside the candidate directories', () => {
  const root = repo();
  write(root, 'src/a.ts', 'const NAME = "app";\n');
  write(root, 'scripts/build.js', 'const VERSION = "1.2.3";\n');
  const { report } = run(root);

  assert.equal(report.status, 'scanned');
  assert.deepEqual(report.matches, []);
});

// ---- which files are searched (supersedes the #72 drift guard) -----------

// Spelled out rather than imported from the script: the point is to pin the behaviour
// independently of the constant, so a shrunk list fails here instead of agreeing with itself.
const COVERED = ['ts', 'js', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'kt', 'swift', 'm', 'mm'];

test('searches every extension of the unified list and only those', () => {
  const root = repo();
  for (const ext of COVERED) write(root, `src/v.${ext}`, 'const VERSION = "1.2.3";\n');
  for (const ext of ['rb', 'php', 'txt', 'json', 'md']) {
    write(root, `src/v.${ext}`, 'const VERSION = "9.9.9";\n');
  }
  const { report } = run(root);

  assert.deepEqual(
    found(report, root),
    COVERED.map((e) => `src/v.${e}`).sort(),
    'the native half of a package (java/kt/swift/m/mm) is covered too — issue #72'
  );
});

// ---- which lines count as a version constant ----------------------------

test('matches the idiomatic Objective-C literal as well as the C-style one', () => {
  const root = repo();
  write(root, 'src/A.m', 'static NSString *const VERSION = @"1.2.3";\n');
  write(root, 'src/B.mm', 'static const char *VERSION = "1.2.3";\n');
  const { report } = run(root);

  assert.deepEqual(found(report, root), ['src/A.m', 'src/B.mm'], 'the optional @ — issue #72');
});

test('matches both the colon and the equals form, upper and lower case', () => {
  const root = repo();
  write(root, 'src/a.ts', 'const VERSION = "1.0.0";\n');
  write(root, 'src/c.js', '{ version: "3.0.0" }\n');
  const { report } = run(root);

  assert.deepEqual(found(report, root), ['src/a.ts', 'src/c.js']);
});

// Documented limitation, carried over unchanged from the grep pattern: the separator must
// be followed by the literal, so a TypeScript type annotation between the two hides the
// constant. Verified against GNU grep 3.11 with the original pattern — pinned here so the
// gap is a known one rather than a surprise, and so closing it is a deliberate change.
test('a type annotation between the separator and the literal is not matched', () => {
  const root = repo();
  write(root, 'src/b.ts', 'const version: string = "2.0.0";\n');
  const { report } = run(root);

  assert.deepEqual(report.matches, []);
});

test('near-misses do not match', () => {
  const root = repo();
  write(
    root,
    'src/neg.js',
    [
      'const VERSION = @"nicht.eine.version";', // not numeric
      'const VERSION = "1.2";', // two segments, not three
      'const VERSION = @@"1.2.3";', // double prefix, only one @ is admitted
      'const Version = "1.2.3";', // capitalised, and the pattern is case-sensitive
      'const VERSION = 1.2.3;', // unquoted
      'const RELEASE = "1.2.3";', // not a version identifier
      '',
    ].join('\n')
  );
  const { report } = run(root);

  assert.equal(report.status, 'scanned');
  assert.deepEqual(report.matches, []);
});

test('two constants on one line stay one record, like grep -n', () => {
  const root = repo();
  write(root, 'src/a.js', 'const VERSION = "1.1.1"; const version = "2.2.2";\n');
  const { report } = run(root);

  assert.equal(report.matches.length, 1, 'one output record per matching LINE, not per match');
  assert.equal(report.matches[0].version, '1.1.1', 'version is the first constant on the line');
  assert.deepEqual(report.matches[0].versions, ['1.1.1', '2.2.2'], 'both stay visible');
});

// ---- paths that broke the shell version ---------------------------------

test('a repo path containing a space is scanned, not silently split', () => {
  const root = repo('my repo');
  write(root, 'src/a.ts', 'const VERSION = "1.2.3";\n');
  const { report } = run(root);

  assert.equal(report.status, 'scanned', 'issue #70: an unquoted path scanned nothing and read as clean');
  assert.deepEqual(found(report, root), ['src/a.ts']);
});

test('a repo path containing an apostrophe is scanned', () => {
  const root = repo("michael's repo");
  write(root, 'src/a.ts', 'const VERSION = "1.2.3";\n');
  const { report } = run(root);

  assert.equal(report.status, 'scanned', 'issue #65');
  assert.deepEqual(found(report, root), ['src/a.ts']);
});

// ---- the three silent grep behaviours, each decided on purpose (#75.8) ---

test('symlinked directories and files below a candidate are not followed', () => {
  const root = repo();
  write(root, 'src/a.ts', 'const VERSION = "1.0.0";\n');
  write(root, 'outside/hidden.ts', 'const VERSION = "9.9.9";\n');
  symlinkSync(join(root, 'outside'), join(root, 'src/linkdir'));
  symlinkSync(join(root, 'outside/hidden.ts'), join(root, 'src/linkfile.ts'));
  const { report } = run(root);

  assert.deepEqual(found(report, root), ['src/a.ts'], 'grep -r does not follow symlinks; -R would');
  assert.deepEqual(report.errors, [], 'skipping a symlink is not an error');
});

test('a candidate directory that IS a symlink is still searched', () => {
  const root = repo();
  write(root, 'elsewhere/a.ts', 'const VERSION = "1.2.3";\n');
  symlinkSync(join(root, 'elsewhere'), join(root, 'src'));
  const { report } = run(root);

  assert.deepEqual(report.scannedDirs, ['src'], '[ -d ] follows symlinks, and so does grep for its argv');
  assert.equal(report.matches.length, 1);
});

test('binary files are skipped even when they contain a matching line', () => {
  const root = repo();
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src/bin.js'), Buffer.concat([Buffer.from('const VERSION = "4.5.6";'), Buffer.from([0]), Buffer.from('\n')]));
  write(root, 'src/text.js', 'const VERSION = "1.2.3";\n');
  const { report } = run(root);

  assert.deepEqual(found(report, root), ['src/text.js'], 'grep emits no file:line: record for a binary file');
});

test('node_modules below a candidate directory is NOT excluded', () => {
  const root = repo();
  write(root, 'src/node_modules/dep.js', 'const VERSION = "7.7.7";\n');
  write(root, 'lib/dist/bundle.js', 'const VERSION = "8.8.8";\n');
  const { report } = run(root);

  assert.deepEqual(
    found(report, root),
    ['lib/dist/bundle.js', 'src/node_modules/dep.js'],
    'grep has no such exclusion today; adding one is a behaviour change of its own (issue #75, Q4)'
  );
});

// ---- real errors stay visible -------------------------------------------

const asRoot = process.getuid?.() === 0 ? 'chmod 000 does not restrict root' : false;

test('an unreadable directory is a visible error, not a silent empty result', { skip: asRoot }, () => {
  const root = repo();
  write(root, 'src/a.ts', 'const VERSION = "1.2.3";\n');
  const locked = join(root, 'src/locked');
  mkdirSync(locked);
  writeFileSync(join(locked, 'b.ts'), 'const VERSION = "9.9.9";\n');
  chmodSync(locked, 0o000);
  try {
    const { status, stderr, report } = run(root);

    assert.equal(report.errors.length, 1, 'the failure is reported, not swallowed by 2>/dev/null');
    assert.match(stderr, /^ERROR .*locked/m);
    assert.equal(status, 2, 'non-zero: an empty match list from a failed scan must not read as in sync');
    assert.deepEqual(found(report, root), ['src/a.ts'], 'the readable part is still scanned');
  } finally {
    chmodSync(locked, 0o700);
  }
});

// ---- CLI contract --------------------------------------------------------

test('a missing argument is a usage error, not a scan of the cwd', () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });

  assert.equal(r.status, 1);
  assert.equal(r.stdout, '', 'no report — nothing was scanned');
  assert.match(r.stderr, /Usage: node version-sync-scan\.mjs <repoPath>/);
});

test('--help prints usage and succeeds', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });

  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: node version-sync-scan\.mjs <repoPath>/);
});
