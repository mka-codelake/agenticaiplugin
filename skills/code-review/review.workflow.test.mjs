// Tests for the code-review activation matrix (SPECIALISTS.when, skipsPhase2, skipReason).
// Run with: node --test
//
// Why this file reads the workflow as TEXT instead of importing it:
// review.workflow.js is NOT an importable module. It is a sandbox script for the
// Workflow runtime and uses top-level `return` (legal only inside the runtime's
// wrapper) — importing it as ESM fails with "SyntaxError: Illegal return statement".
// The sandbox also has no filesystem and no module resolution
// (docs/workflow-integration-howto.md, pattern D), so the script cannot be split
// into an importable helper module either.
//
// Instead we cut the pure blocks out of the real source and evaluate them in a
// `node:vm` context. That way the assertions run against the ORIGINAL rules —
// no copy of the activation matrix lives in this file, so it cannot silently
// drift from the workflow.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const WORKFLOW = join(dirname(fileURLToPath(import.meta.url)), 'review.workflow.js');
const SRC = readFileSync(WORKFLOW, 'utf8');

// Cut one top-level block out of the source. Anchored at column 0 on both ends,
// which is the file's formatting for every top-level declaration.
function cut(re, label) {
  const m = SRC.match(re);
  assert.ok(m, `could not extract ${label} from review.workflow.js — has its formatting changed?`);
  return m[0];
}

const BLOCKS = [
  cut(/^const SPECIALISTS = \[[\s\S]*?^\];$/m, 'SPECIALISTS'),
  cut(/^function skipsPhase2\([\s\S]*?^\}$/m, 'skipsPhase2()'),
  cut(/^function skipReason\([\s\S]*?^\}$/m, 'skipReason()'),
  cut(/^function isAbsolutePath\([\s\S]*?^\}$/m, 'isAbsolutePath()'),
  cut(/^function requireAbsoluteSkillDir\([\s\S]*?^\}$/m, 'requireAbsoluteSkillDir()'),
];

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  `${BLOCKS.join('\n\n')}\nglobalThis.__extracted = { SPECIALISTS, skipsPhase2, skipReason, requireAbsoluteSkillDir };`,
  sandbox,
  { filename: 'review.workflow.js (extracted blocks)' }
);
const { skipsPhase2, skipReason, requireAbsoluteSkillDir } = sandbox.__extracted;
// Array.from re-homes the registry into this realm — a vm-realm array has a
// foreign Array.prototype, which deepStrictEqual reports as unequal.
const SPECIALISTS = Array.from(sandbox.__extracted.SPECIALISTS);

// A ctx as the main model builds it before invoking the workflow.
const ctx = (o = {}) => ({ source: false, tests: false, infra: false, layers: 0, newDeps: false, ...o });
const activeIds = (c) => SPECIALISTS.filter((s) => s.when(c)).map((s) => s.id);
const spec = (id) => {
  const s = SPECIALISTS.find((x) => x.id === id);
  assert.ok(s, `specialist ${id} not found in SPECIALISTS`);
  return s;
};

// ---- extraction sanity: the cut blocks are the ones actually in use ------

test('the top-level guard really calls skipsPhase2(ctx)', () => {
  // If someone inlines the condition again, the skipsPhase2 tests below would
  // still pass while testing dead code. This ties them to the real call site.
  assert.match(SRC, /^if \(skipsPhase2\(ctx\)\) \{$/m);
});

test('SPECIALISTS covers exactly the documented ids', () => {
  assert.deepEqual(
    SPECIALISTS.map((s) => s.id),
    ['02', '03', '04', '05', '06a', '06b', '07', '08', '09', '10', '11', '12']
  );
});

// ---- activation matrix --------------------------------------------------

test('infra-only diff activates 10 and 12 — and nothing else', () => {
  assert.deepEqual(activeIds(ctx({ infra: true })), ['10', '12']);
});

test('source-only diff does not activate 12 (infra specialist)', () => {
  const ids = activeIds(ctx({ source: true }));
  assert.ok(!ids.includes('12'), `12 must stay inactive without infra, got: ${ids.join(',')}`);
  assert.deepEqual(ids, ['02', '04', '05', '06a', '06b', '07', '08', '10', '11']);
});

test('test-only diff activates 09 — and nothing else', () => {
  assert.deepEqual(activeIds(ctx({ tests: true })), ['09']);
});

test('09 (Test Quality) is inactive without test files', () => {
  assert.equal(spec('09').when(ctx({ source: true, infra: true })), false);
});

test('10 (Test Completeness & Infra) activates on source OR infra', () => {
  assert.equal(spec('10').when(ctx({ source: true })), true);
  assert.equal(spec('10').when(ctx({ infra: true })), true);
  assert.equal(spec('10').when(ctx({ tests: true })), false);
});

// ---- specialist 03: source AND (layers >= 3 OR newDeps) -----------------

test('03 activates via the layers branch (source + layers >= 3)', () => {
  assert.equal(spec('03').when(ctx({ source: true, layers: 3 })), true);
  assert.equal(spec('03').when(ctx({ source: true, layers: 7 })), true);
});

test('03 activates via the newDeps branch (source + new dependencies)', () => {
  assert.equal(spec('03').when(ctx({ source: true, newDeps: true })), true);
});

test('03 stays inactive with source but neither branch satisfied', () => {
  assert.equal(spec('03').when(ctx({ source: true, layers: 2 })), false);
});

test('03 is never active without source, however strong the other signals', () => {
  assert.equal(spec('03').when(ctx({ layers: 9, newDeps: true })), false);
  assert.equal(spec('03').when(ctx({ infra: true, tests: true, layers: 9, newDeps: true })), false);
});

// ---- skipsPhase2 --------------------------------------------------------

test('skipsPhase2 is true for a docs-only diff', () => {
  assert.equal(skipsPhase2(ctx()), true);
});

test('skipsPhase2 is true for a manifest-only diff (newDeps, no files of substance)', () => {
  assert.equal(skipsPhase2(ctx({ newDeps: true })), true);
});

for (const kind of ['source', 'tests', 'infra']) {
  test(`skipsPhase2 is false as soon as ${kind} is set`, () => {
    assert.equal(skipsPhase2(ctx({ [kind]: true })), false);
  });
}

// ---- skipReason ---------------------------------------------------------

test('skipReason explains the specific gate for 03, 09, 10 and 12', () => {
  assert.equal(skipReason(spec('03'), ctx()), 'needs 3+ layers or new dependencies');
  assert.equal(skipReason(spec('09'), ctx()), 'no test files modified');
  assert.equal(skipReason(spec('10'), ctx()), 'no source or infra/config files modified');
  assert.equal(skipReason(spec('12'), ctx()), 'no infra/config files modified');
});

test('skipReason falls back to the source-files default for every other specialist', () => {
  for (const id of ['02', '04', '05', '06a', '06b', '07', '08', '11']) {
    assert.equal(skipReason(spec(id), ctx()), 'no source files modified', `specialist ${id}`);
  }
});

// ---- model tiering ------------------------------------------------------

test('every specialist runs on its assigned model tier', () => {
  const expected = {
    '02': 'opus',   // Security & Data Safety
    '03': 'opus',   // Architecture & Layers
    '04': 'sonnet', // Design Patterns (GoF)
    '05': 'sonnet', // SOLID & Code Smells
    '06a': 'opus',  // Correctness & Bug Detection
    '06b': 'haiku', // Code Style & Size
    '07': 'haiku',  // Dead Code & Duplication
    '08': 'opus',   // Cross-Cutting Concerns
    '09': 'haiku',  // Test Quality
    '10': 'sonnet', // Test Completeness & Infra
    '11': 'haiku',  // Documentation & Comments
    '12': 'opus',   // Infrastructure & Configuration
  };
  assert.deepEqual(Object.fromEntries(SPECIALISTS.map((s) => [s.id, s.model])), expected);
});

test('12 (Infrastructure & Configuration) runs on opus', () => {
  assert.equal(spec('12').model, 'opus');
});

test('every specialist points at a rules file and only uses known model tiers', () => {
  for (const s of SPECIALISTS) {
    assert.match(s.file, /^\d\d[ab]?-[a-z0-9-]+\.md$/, `specialist ${s.id} rules file`);
    assert.ok(['haiku', 'sonnet', 'opus'].includes(s.model), `specialist ${s.id} model: ${s.model}`);
  }
});

// ---- skillDir guard (#69) ----------------------------------------------
// skillDir is interpolated into specialist prompts as a read instruction. A specialist
// runs with the target project as CWD, so a relative value reads nothing and the review
// proceeds without rules — the guard turns that silent failure into a loud one.

test('the guard accepts absolute paths on every platform the plugin runs on', () => {
  for (const dir of [
    '/home/u/.claude/plugins/agenticaiplugin/skills/code-review', // POSIX
    '/',
    'C:\\Users\\Max\\.claude\\plugins\\p\\skills\\code-review',   // Windows drive, backslash
    'c:/Users/Max/.claude/plugins/p/skills/code-review',          // Windows drive, forward slash
    '\\\\server\\share\\plugins\\p\\skills\\code-review',         // UNC
  ]) {
    assert.equal(requireAbsoluteSkillDir(dir), dir, `should accept ${dir}`);
  }
});

test('the guard rejects relative paths — including the removed default', () => {
  for (const dir of [
    'skills/code-review', // the default this guard replaced
    './skills/code-review',
    '../code-review',
    'C:relative\\path',   // drive-relative, not absolute
    '\\rooted-no-drive',  // drive-less root, not absolute on Windows
  ]) {
    assert.throws(() => requireAbsoluteSkillDir(dir), /skillDir must be an absolute path/, `should reject ${dir}`);
  }
});

test('the guard rejects a missing or non-string skillDir', () => {
  for (const dir of [undefined, null, '', 0, {}, ['/abs']]) {
    assert.throws(() => requireAbsoluteSkillDir(dir), /skillDir must be an absolute path/, `should reject ${JSON.stringify(dir)}`);
  }
});

test('the guard error names the offending value so it is diagnosable', () => {
  assert.throws(() => requireAbsoluteSkillDir('skills/code-review'), /"skills\/code-review"/);
  assert.throws(() => requireAbsoluteSkillDir(undefined), /undefined/);
});

test('review.workflow.js declares no default for skillDir and calls the guard', () => {
  assert.doesNotMatch(SRC, /skillDir\s*=\s*["']/, 'skillDir must not have a default value');
  assert.match(SRC, /^requireAbsoluteSkillDir\(skillDir\);$/m, 'the guard must run at the input block');
});
