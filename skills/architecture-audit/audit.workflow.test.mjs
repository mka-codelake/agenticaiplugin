// Tests for the architecture-audit workflow (skillDir guard, rating math).
// Run with: node --test
//
// Why this file reads the workflow as TEXT instead of importing it:
// audit.workflow.js is NOT an importable module. It is a sandbox script for the
// Workflow runtime and uses top-level `await` outside a module plus helpers the
// runtime injects (`agent`, `log`, `phase`), so importing it as ESM executes an
// audit instead of loading definitions. The sandbox also has no filesystem and no
// module resolution (docs/workflow-integration-howto.md, pattern D), so the script
// cannot be split into an importable helper module either.
//
// Instead we cut the pure blocks out of the real source and evaluate them in a
// `node:vm` context — same approach as skills/code-review/review.workflow.test.mjs.
// The assertions run against the ORIGINAL code, so no copy can silently drift.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const WORKFLOW = join(dirname(fileURLToPath(import.meta.url)), 'audit.workflow.js');
const SRC = readFileSync(WORKFLOW, 'utf8');

// Cut one top-level block out of the source. Anchored at column 0 on both ends,
// which is the file's formatting for every top-level declaration.
function cut(re, label) {
  const m = SRC.match(re);
  assert.ok(m, `could not extract ${label} from audit.workflow.js — has its formatting changed?`);
  return m[0];
}

const BLOCKS = [
  cut(/^const SCORE = \{.*?\};$/m, 'SCORE'),
  cut(/^const GRADES = \[.*?\];/m, 'GRADES'),
  cut(/^const WEIGHTS = \{[\s\S]*?^\};$/m, 'WEIGHTS'),
  cut(/^function weightedAverage\([\s\S]*?^\}$/m, 'weightedAverage()'),
  cut(/^const ANALYZERS = \[[\s\S]*?^\];$/m, 'ANALYZERS'),
  cut(/^function isAbsolutePath\([\s\S]*?^\}$/m, 'isAbsolutePath()'),
  cut(/^function requireAbsoluteSkillDir\([\s\S]*?^\}$/m, 'requireAbsoluteSkillDir()'),
];

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  `${BLOCKS.join('\n\n')}\nglobalThis.__extracted = { WEIGHTS, weightedAverage, ANALYZERS, requireAbsoluteSkillDir };`,
  sandbox,
  { filename: 'audit.workflow.js (extracted blocks)' }
);
const { WEIGHTS, weightedAverage, requireAbsoluteSkillDir } = sandbox.__extracted;
// Array.from re-homes the registry into this realm — a vm-realm array has a
// foreign Array.prototype, which deepStrictEqual reports as unequal.
const ANALYZERS = Array.from(sandbox.__extracted.ANALYZERS);

// ---- skillDir guard (#69) ----------------------------------------------
// skillDir is interpolated into analyzer prompts as a read instruction. An analyzer
// runs with the target project as CWD, so a relative value reads nothing and the audit
// rates without its rule files — the guard turns that silent failure into a loud one.

test('the guard accepts absolute paths on every platform the plugin runs on', () => {
  for (const dir of [
    '/home/u/.claude/plugins/agenticaiplugin/skills/architecture-audit', // POSIX
    '/',
    'C:\\Users\\Max\\.claude\\plugins\\p\\skills\\architecture-audit',   // Windows drive, backslash
    'c:/Users/Max/.claude/plugins/p/skills/architecture-audit',          // Windows drive, forward slash
    '\\\\server\\share\\plugins\\p\\skills\\architecture-audit',         // UNC
  ]) {
    assert.equal(requireAbsoluteSkillDir(dir), dir, `should accept ${dir}`);
  }
});

test('the guard rejects relative paths — including the removed default', () => {
  for (const dir of [
    'skills/architecture-audit', // the default this guard replaced
    './skills/architecture-audit',
    '../architecture-audit',
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
  assert.throws(() => requireAbsoluteSkillDir('skills/architecture-audit'), /"skills\/architecture-audit"/);
  assert.throws(() => requireAbsoluteSkillDir(undefined), /undefined/);
});

test('audit.workflow.js declares no default for skillDir and calls the guard', () => {
  assert.doesNotMatch(SRC, /skillDir\s*=\s*["']/, 'skillDir must not have a default value');
  assert.match(SRC, /^requireAbsoluteSkillDir\(skillDir\);$/m, 'the guard must run at the input block');
});

// ---- rating math (mirrors shared/rating-scale.md) -----------------------

test('the weight table matches shared/rating-scale.md — 01 and 03 count double', () => {
  assert.deepEqual({ ...WEIGHTS }, {
    pattern: 2,             // Analyzer 01 — Architecture Pattern
    dependencyDirection: 2, // Analyzer 03 — Dependency Direction
    componentBoundaries: 1,
    namingConsistency: 1,
    apiInterfaceBoundaries: 1,
    instantiationWiring: 1,
    structuralVisibility: 1,
  });
});

test('a uniform set of ratings averages to that same grade', () => {
  for (const g of ['A', 'B', 'C', 'D', 'E']) {
    const all = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, g]));
    assert.equal(weightedAverage(all), g, `all-${g}`);
  }
});

test('N/A dimensions drop out of the average instead of counting as zero', () => {
  const withNA = { pattern: 'A', componentBoundaries: 'A', dependencyDirection: 'N/A' };
  assert.equal(weightedAverage(withNA), 'A');
});

test('an all-N/A rating set yields N/A rather than a fabricated grade', () => {
  assert.equal(weightedAverage({ pattern: 'N/A', componentBoundaries: 'N/A' }), 'N/A');
});

test('the double-weighted pattern rating pulls the average toward itself', () => {
  // pattern E (×2) against one B: (1+1+4)/4 = 1.5 -> rounds into the D/E band, below B.
  const pulled = weightedAverage({ pattern: 'E', componentBoundaries: 'B' });
  assert.ok(['E', 'D'].includes(pulled), `expected E or D, got ${pulled}`);
});

// ---- analyzer registry --------------------------------------------------

test('every analyzer points at a rules file and only uses known model tiers', () => {
  for (const a of ANALYZERS) {
    assert.match(a.file, /^\d\d-[a-z0-9-]+\.md$/, `analyzer ${a.id} rules file`);
    assert.ok(['haiku', 'sonnet', 'opus'].includes(a.model), `analyzer ${a.id} model: ${a.model}`);
    assert.ok(WEIGHTS[a.key] !== undefined, `analyzer ${a.id} key ${a.key} has no rating weight`);
  }
});
