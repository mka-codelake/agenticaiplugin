// Tests for persona.mjs (issues #23/#24 rewrite) — Node stdlib only, run with:
//   node --test
//
// Black-box through the public CLI contract (no internals imported): every case
// spawns `node persona.mjs <subcommand>` with CLAUDE_CONFIG_DIR pointing at a
// fresh temp dir, matching how the skill and the SessionStart hook invoke it.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'persona.mjs');

function freshConfigDir() {
  return mkdtempSync(join(tmpdir(), 'persona-test-'));
}

function run(args, { configDir, input = '' } = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    input,
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
}

test('show without state reports off', () => {
  const r = run(['show'], { configDir: freshConfigDir() });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'OK persona=off\n');
});

test('set rejects a missing persona', () => {
  const r = run(['set'], { configDir: freshConfigDir() });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^ERROR missing persona/);
});

test('set rejects an invalid persona', () => {
  const dir = freshConfigDir();
  const r = run(['set', 'klingon'], { configDir: dir });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^ERROR invalid persona: 'klingon'/);
  assert.ok(!existsSync(join(dir, 'persona.state')));
});

test('set accepts every valid persona and persists it atomically', () => {
  for (const persona of ['writer', 'engineer', 'telegrapher', 'caveman']) {
    const dir = freshConfigDir();
    const r = run(['set', persona], { configDir: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, `OK persona=${persona}\n`);
    assert.equal(readFileSync(join(dir, 'persona.state'), 'utf8'), `${persona}\n`);
    assert.equal(run(['show'], { configDir: dir }).stdout, `OK persona=${persona}\n`);
  }
});

test('set creates the config dir when missing', () => {
  const dir = join(freshConfigDir(), 'nested', 'claude');
  const r = run(['set', 'writer'], { configDir: dir });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(join(dir, 'persona.state'), 'utf8'), 'writer\n');
});

test('off removes the state file (reset is an alias)', () => {
  for (const sub of ['off', 'reset']) {
    const dir = freshConfigDir();
    run(['set', 'engineer'], { configDir: dir });
    const r = run([sub], { configDir: dir });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, 'OK persona=off\n');
    assert.ok(!existsSync(join(dir, 'persona.state')));
  }
});

test('inject emits the hookSpecificOutput contract for an active persona', () => {
  const dir = freshConfigDir();
  run(['set', 'engineer'], { configDir: dir });
  const r = run(['inject'], {
    configDir: dir,
    input: '{"hook_event_name":"SessionStart","source":"startup"}',
  });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(out.hookSpecificOutput.additionalContext, /persona: engineer/);
});

test('inject passes an alternate hook_event_name through', () => {
  const dir = freshConfigDir();
  run(['set', 'writer'], { configDir: dir });
  const r = run(['inject'], { configDir: dir, input: '{"hook_event_name":"Resume"}' });
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'Resume');
});

test('inject defaults the event when stdin is empty or invalid JSON', () => {
  const dir = freshConfigDir();
  run(['set', 'writer'], { configDir: dir });
  for (const input of ['', 'not-json']) {
    const r = run(['inject'], { configDir: dir, input });
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'SessionStart');
  }
});

test('inject is a silent no-op when persona is unset or off (opt-in gate)', () => {
  const unset = run(['inject'], { configDir: freshConfigDir(), input: '{}' });
  assert.equal(unset.status, 0);
  assert.equal(unset.stdout, '');

  const dir = freshConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'persona.state'), 'off\n');
  const off = run(['inject'], { configDir: dir, input: '{}' });
  assert.equal(off.status, 0);
  assert.equal(off.stdout, '');
});

test('inject is a silent no-op for a tampered/unknown state value (no path escape)', () => {
  for (const tampered of ['klingon', '../persona', '../../etc/passwd', 'engineer/../writer']) {
    const dir = freshConfigDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'persona.state'), `${tampered}\n`);
    const r = run(['inject'], { configDir: dir, input: '{}' });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '', `state '${tampered}' must inject nothing`);
  }
});

test('usage exits 2, unknown subcommand exits 1', () => {
  const usage = run([], { configDir: freshConfigDir() });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^usage:/);

  const unknown = run(['frobnicate'], { configDir: freshConfigDir() });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /^ERROR unknown subcommand/);
});
