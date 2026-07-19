// Tests for migrate-claudedocs.mjs — Node stdlib only, run with: node --test
//
// Black-box through the CLI (spawn the real script against a temp project root,
// parse the JSON report), matching the repo convention. Pins: default dry-run is
// non-mutating; --apply moves files, appends .gitignore negations (contents form),
// flags whole-tree gitignore for manual review, rewrites CLAUDE.md path tokens;
// conflict policy (never overwrite -> report); empty-claudedocs cleanup; foreign
// output left untouched.
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

import { planClaudeMdRewrites, planGitignore } from './migrate-claudedocs.mjs';

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
function run(root, ...flags) {
  const r = spawnSync(process.execPath, [SCRIPT, root, ...flags], { encoding: 'utf8' });
  return { status: r.status, report: JSON.parse(r.stdout) };
}

// ---- move / conflict / cleanup (now via --apply) ------------------------

test('--apply moves guidelines and adrs into .claude and removes empty claudedocs', () => {
  const root = proj();
  write(root, 'claudedocs/guidelines/style.md', 'g');
  write(root, 'claudedocs/adrs/0001.md', 'a');
  const { report } = run(root, '--apply');
  assert.ok(existsSync(join(root, '.claude/guidelines/style.md')), 'guideline moved');
  assert.ok(existsSync(join(root, '.claude/adrs/0001.md')), 'adr moved');
  assert.equal(existsSync(join(root, 'claudedocs')), false, 'empty claudedocs removed');
  assert.equal(report.applied, true);
  assert.equal(report.claudedocsRemoved, true);
  assert.equal(report.conflicts.length, 0);
  assert.equal(report.moved.length, 2);
});

test('default (no flag) is dry-run: nothing moves, plan is reported', () => {
  const root = proj();
  write(root, 'claudedocs/guidelines/style.md', 'g');
  const { report } = run(root);
  assert.equal(report.applied, false);
  assert.ok(existsSync(join(root, 'claudedocs/guidelines/style.md')), 'source untouched in dry-run');
  assert.equal(existsSync(join(root, '.claude/guidelines/style.md')), false, 'dest not created in dry-run');
  assert.equal(report.moved.length, 1);
});

test('never overwrites: destination collision is reported, source kept', () => {
  const root = proj();
  write(root, 'claudedocs/guidelines/style.md', 'SOURCE');
  write(root, '.claude/guidelines/style.md', 'EXISTING');
  const { report } = run(root, '--apply');
  assert.deepEqual(report.conflicts, ['claudedocs/guidelines/style.md']);
  assert.equal(readFileSync(join(root, '.claude/guidelines/style.md'), 'utf8'), 'EXISTING', 'not overwritten');
  assert.ok(existsSync(join(root, 'claudedocs/guidelines/style.md')), 'source kept for the user to resolve');
});

test('leaves foreign claudedocs output alone with no prompt', () => {
  const root = proj();
  write(root, 'claudedocs/guidelines/style.md', 'g');
  write(root, 'claudedocs/license-check-result.md', 'report');
  const { report } = run(root, '--apply');
  assert.ok(existsSync(join(root, '.claude/guidelines/style.md')), 'guideline still migrated');
  assert.ok(existsSync(join(root, 'claudedocs/license-check-result.md')), 'foreign output untouched');
  assert.equal(report.claudedocsRemoved, false);
  assert.deepEqual(report.claudedocsRemaining, ['license-check-result.md']);
});

test('no claudedocs at all is a clean no-op', () => {
  const root = proj();
  const { report } = run(root, '--apply');
  assert.deepEqual(report.moved, []);
  assert.equal(report.claudedocsRemoved, false);
});

// ---- gitignore ----------------------------------------------------------

test('gitignore contents form: --apply appends the negations', () => {
  const root = proj();
  write(root, 'claudedocs/adrs/0001.md', 'a');
  write(root, '.gitignore', '.claude/*\n!.claude/rules/\n');
  const { report } = run(root, '--apply');
  assert.equal(report.gitignore.form, 'contents');
  assert.deepEqual(report.gitignore.negationsAppended, ['!.claude/adrs/']);
  const gi = readFileSync(join(root, '.gitignore'), 'utf8');
  assert.match(gi, /!\.claude\/adrs\//);
});

test('gitignore whole-tree form: not auto-edited, flagged for review', () => {
  const root = proj();
  write(root, 'claudedocs/adrs/0001.md', 'a');
  write(root, '.gitignore', 'node_modules\n.claude/\n');
  const { report } = run(root, '--apply');
  assert.equal(report.gitignore.form, 'whole-tree');
  assert.deepEqual(report.gitignore.negationsAppended, []);
  assert.match(report.gitignore.review, /whole|re-include|\.claude\/\*/i);
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), 'node_modules\n.claude/\n', 'gitignore untouched');
});

test('gitignore none: nothing added', () => {
  const root = proj();
  write(root, 'claudedocs/adrs/0001.md', 'a');
  write(root, '.gitignore', 'node_modules\ndist\n');
  const { report } = run(root, '--apply');
  assert.equal(report.gitignore.form, 'none');
  assert.deepEqual(report.gitignore.negationsAppended, []);
});

test('planGitignore is idempotent when negation already present', () => {
  const gi = planGitignore('.claude/*\n!.claude/adrs/\n', { guidelines: false, adrs: true });
  assert.deepEqual(gi.negationsAppended, []);
});

// ---- CLAUDE.md rewrite --------------------------------------------------

test('--apply rewrites claudedocs/{guidelines,adrs} tokens in CLAUDE.md', () => {
  const root = proj();
  write(root, 'claudedocs/adrs/0001.md', 'a');
  write(root, 'CLAUDE.md', 'ADRs live in `claudedocs/adrs/` and stories in claudedocs/stories/.');
  const { report } = run(root, '--apply');
  const cm = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
  assert.match(cm, /\.claude\/adrs\//);
  assert.match(cm, /claudedocs\/stories\//, 'unrelated claudedocs paths untouched');
  assert.equal(report.claudeMd.rewrites.find((r) => r.from === 'claudedocs/adrs').count, 1);
});

test('planClaudeMdRewrites is a no-op when no tokens present', () => {
  assert.deepEqual(planClaudeMdRewrites('nothing to see here'), []);
});
