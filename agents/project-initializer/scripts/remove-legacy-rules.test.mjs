// Tests for remove-legacy-rules.mjs — Node stdlib only, run with: node --test
// Black-box CLI (spawn + JSON report) plus the exported computeRemovals unit.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { computeRemovals } from './remove-legacy-rules.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'remove-legacy-rules.mjs');

function proj(rules = []) {
  const root = mkdtempSync(join(tmpdir(), 'rlr-'));
  if (rules.length) {
    const dir = join(root, '.claude', 'rules');
    mkdirSync(dir, { recursive: true });
    for (const f of rules) writeFileSync(join(dir, f), '# rule');
  }
  return root;
}
function run(root, ...flags) {
  const r = spawnSync(process.execPath, [SCRIPT, root, ...flags], { encoding: 'utf8' });
  return JSON.parse(r.stdout);
}

const CURRENT = ['agenticaiplugin-core.md', 'agenticaiplugin-code-review.md', 'agenticaiplugin-git-commit.md'];

test('dry-run lists rules without removing them', () => {
  const root = proj(CURRENT);
  const report = run(root);
  assert.equal(report.applied, false);
  assert.equal(report.removed.length, 3);
  for (const f of CURRENT) assert.ok(existsSync(join(root, '.claude/rules', f)), `${f} still present`);
});

test('--apply removes all agenticaiplugin-*.md, including historically-removed ones', () => {
  const root = proj([...CURRENT, 'agenticaiplugin-protected-dirs.md', 'agenticaiplugin-engineering.md']);
  const report = run(root, '--apply');
  assert.equal(report.applied, true);
  assert.equal(report.removed.length, 5);
  for (const f of report.removed) assert.equal(existsSync(join(root, '.claude/rules', f)), false);
});

test("the user's own (non-prefixed) rules are never touched", () => {
  const root = proj([...CURRENT, 'my-team-rules.md']);
  run(root, '--apply');
  assert.ok(existsSync(join(root, '.claude/rules/my-team-rules.md')), 'user rule kept');
  assert.equal(existsSync(join(root, '.claude/rules/agenticaiplugin-core.md')), false);
});

test('no rules dir is a clean no-op', () => {
  const root = proj();
  const report = run(root, '--apply');
  assert.deepEqual(report.removed, []);
});

test('computeRemovals is pure (import has no side effects, returns sorted list)', () => {
  const root = proj(CURRENT);
  const removed = computeRemovals(root);
  assert.deepEqual(removed, [...CURRENT].sort());
  for (const f of CURRENT) assert.ok(existsSync(join(root, '.claude/rules', f)), 'compute did not delete');
});
