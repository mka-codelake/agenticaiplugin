// Tests for migrate-claudedocs.mjs — Node stdlib only, run with: node --test
//
// Black-box through the CLI (spawn the real script against a temp project root,
// parse the JSON report), matching the repo convention. Pins the conflict policy
// (never overwrite -> report), the empty-claudedocs cleanup, and the leave-foreign-
// output behavior (no prompt).
//
// NOTE: the `claudedocs/...` source paths below are intentional — they set up the
// OLD location so the script can migrate it. Do not rewrite them to `.claude/...`.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'migrate-claudedocs.mjs');

function proj() {
  return mkdtempSync(join(tmpdir(), 'mc-'));
}
function write(root, rel, body) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
  return p;
}
function run(root) {
  const r = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
  return { status: r.status, report: JSON.parse(r.stdout) };
}

test('moves guidelines and adrs into .claude and removes the now-empty claudedocs', () => {
  const root = proj();
  write(root, 'claudedocs/guidelines/style.md', 'g');
  write(root, 'claudedocs/adrs/0001.md', 'a');
  const { report } = run(root);
  assert.ok(existsSync(join(root, '.claude/guidelines/style.md')), 'guideline moved');
  assert.ok(existsSync(join(root, '.claude/adrs/0001.md')), 'adr moved');
  assert.equal(existsSync(join(root, 'claudedocs')), false, 'empty claudedocs removed');
  assert.equal(report.claudedocsRemoved, true);
  assert.equal(report.conflicts.length, 0);
  assert.equal(report.moved.length, 2);
});

test('never overwrites: destination collision is reported, source kept', () => {
  const root = proj();
  write(root, 'claudedocs/guidelines/style.md', 'SOURCE');
  write(root, '.claude/guidelines/style.md', 'EXISTING');
  const { report } = run(root);
  assert.deepEqual(report.conflicts, ['claudedocs/guidelines/style.md']);
  assert.equal(readFileSync(join(root, '.claude/guidelines/style.md'), 'utf8'), 'EXISTING', 'not overwritten');
  assert.ok(existsSync(join(root, 'claudedocs/guidelines/style.md')), 'source kept for the user to resolve');
});

test('leaves foreign claudedocs output alone with no prompt', () => {
  const root = proj();
  write(root, 'claudedocs/guidelines/style.md', 'g');
  write(root, 'claudedocs/license-check-result.md', 'report');
  const { report } = run(root);
  assert.ok(existsSync(join(root, '.claude/guidelines/style.md')), 'guideline still migrated');
  assert.ok(existsSync(join(root, 'claudedocs/license-check-result.md')), 'foreign output untouched');
  assert.equal(report.claudedocsRemoved, false);
  assert.deepEqual(report.claudedocsRemaining, ['license-check-result.md']);
});

test('no claudedocs at all is a clean no-op', () => {
  const root = proj();
  const { report } = run(root);
  assert.deepEqual(report.moved, []);
  assert.equal(report.claudedocsRemoved, false);
});
