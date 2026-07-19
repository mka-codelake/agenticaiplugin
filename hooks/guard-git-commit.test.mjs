// Tests for the git-commit guard (PreToolUse). Black-box CLI (spawn + JSON stdin)
// plus direct unit tests on the exported classify() parser.
// Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { classify, splitSegments, tokenize } from './guard-git-commit.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'guard-git-commit.mjs');

// Spawn the hook with a raw stdin string and optional env. Returns { stdout }.
function run(stdin, env = {}) {
  const res = spawnSync(process.execPath, [SCRIPT], {
    input: stdin,
    encoding: 'utf8',
    // Neutralize any real config in the caller's home by default.
    env: { ...process.env, CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'ggc-cfg-')), ...env },
  });
  return { stdout: res.stdout || '', status: res.status };
}

function bash(command, env) {
  return run(JSON.stringify({ tool_name: 'Bash', tool_input: { command } }), env);
}

function isDeny(stdout) {
  if (!stdout.trim()) return false;
  const out = JSON.parse(stdout);
  return out?.hookSpecificOutput?.permissionDecision === 'deny';
}

// ---- deny cases ---------------------------------------------------------

for (const cmd of [
  'git commit -m x',
  'git commit --amend',
  'FOO=1 git commit',
  'git add -A && git commit -m x',
  'git -C /repo commit -m x',
  'git -c user.name=x commit -m y',
]) {
  test(`denies: ${cmd}`, () => {
    const { stdout } = bash(cmd);
    assert.ok(isDeny(stdout), `expected deny for: ${cmd}`);
    assert.match(stdout, /gitme/, 'deny reason should point to /agenticaiplugin:gitme');
  });
}

// ---- allow cases (empty stdout = no decision) ---------------------------

for (const cmd of [
  'git -c agenticai.gitme=1 commit -m x',
  'git add -A && git -c agenticai.gitme=1 commit -m x',
  'git log --grep=commit',
  'git commit-graph write',
  'echo "git commit"',
  'git show',
  'git status',
]) {
  test(`allows: ${cmd}`, () => {
    const { stdout } = bash(cmd);
    assert.equal(stdout.trim(), '', `expected no output (allow) for: ${cmd}`);
  });
}

// ---- inert cases --------------------------------------------------------

test('non-Bash tool is ignored', () => {
  const { stdout } = run(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' } }));
  assert.equal(stdout.trim(), '');
});

test('empty stdin is a no-op (fail-open)', () => {
  const { stdout } = run('');
  assert.equal(stdout.trim(), '');
});

test('malformed JSON is a no-op (fail-open)', () => {
  const { stdout } = run('{not json');
  assert.equal(stdout.trim(), '');
});

test('AUTOSKILL_REVIEWER session is inert', () => {
  const { stdout } = bash('git commit -m x', { AUTOSKILL_REVIEWER: '1' });
  assert.equal(stdout.trim(), '');
});

test('config { gitCommitGuard: "off" } disables the guard', () => {
  const cfgDir = mkdtempSync(join(tmpdir(), 'ggc-off-'));
  writeFileSync(join(cfgDir, 'agenticaiplugin.config.json'), JSON.stringify({ gitCommitGuard: 'off' }));
  const { stdout } = bash('git commit -m x', { CLAUDE_CONFIG_DIR: cfgDir });
  assert.equal(stdout.trim(), '');
});

// ---- symlink invocation (marketplace scenario) --------------------------

// The plugin is loaded through a symlinked marketplace path; the "run as main"
// guard must survive that (argv[1] is the symlink, import.meta.url the realpath).
test('runs when invoked via a symlinked path (does not silently no-op)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ggc-link-'));
  const link = join(dir, 'guard-git-commit.mjs');
  symlinkSync(SCRIPT, link);
  const res = spawnSync(process.execPath, [link], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'ggc-cfg-')) },
  });
  assert.ok(isDeny(res.stdout || ''), 'guard must still deny when invoked via a symlink');
});

// ---- direct unit tests on the parser ------------------------------------

test('classify: raw commit variants', () => {
  assert.equal(classify('git commit -m x').isRawCommit, true);
  assert.equal(classify('git commit --amend').isRawCommit, true);
  assert.equal(classify('FOO=1 git commit').isRawCommit, true);
  assert.equal(classify('git add -A && git commit -m x').isRawCommit, true);
});

test('classify: sanctioned + look-alikes are not raw commits', () => {
  assert.equal(classify('git -c agenticai.gitme=1 commit -m x').isRawCommit, false);
  assert.equal(classify('git log --grep=commit').isRawCommit, false);
  assert.equal(classify('git commit-graph write').isRawCommit, false);
  assert.equal(classify('echo "git commit"').isRawCommit, false);
  assert.equal(classify('').isRawCommit, false);
});

test('splitSegments respects quotes and operators', () => {
  assert.deepEqual(splitSegments('git add -A && git commit'), ['git add -A', 'git commit']);
  assert.deepEqual(splitSegments('echo "a && b"'), ['echo "a && b"']);
  assert.deepEqual(splitSegments('a; b | c'), ['a', 'b', 'c']);
});

test('tokenize strips quotes', () => {
  assert.deepEqual(tokenize('git commit -m "hello world"'), ['git', 'commit', '-m', 'hello world']);
  assert.deepEqual(tokenize("git -c agenticai.gitme=1 commit"), ['git', '-c', 'agenticai.gitme=1', 'commit']);
});
