// Tests for mode.mjs (issue #77) — Node stdlib only, run with:
//   node --test
//
// Black-box through the public CLI contract (no internals imported): every case
// spawns `node mode.mjs <subcommand>` with CLAUDE_CONFIG_DIR pointing at a fresh
// temp dir, matching how the skill and the SessionStart hook invoke it.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'mode.mjs');
const MODES = ['task', 'orchestrator', 'meta-orchestrator'];

function freshConfigDir() {
  return mkdtempSync(join(tmpdir(), 'mode-test-'));
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
  assert.equal(r.stdout, 'OK mode=off\n');
});

test('set rejects a missing mode', () => {
  const r = run(['set'], { configDir: freshConfigDir() });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^ERROR missing mode/);
});

test('set rejects an invalid mode and writes no state', () => {
  const dir = freshConfigDir();
  const r = run(['set', 'supervisor'], { configDir: dir });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^ERROR invalid mode: 'supervisor'/);
  assert.ok(!existsSync(join(dir, 'mode.state')));
});

test('set accepts every valid mode and persists it atomically', () => {
  for (const mode of MODES) {
    const dir = freshConfigDir();
    const r = run(['set', mode], { configDir: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, `OK mode=${mode}\n`);
    assert.equal(readFileSync(join(dir, 'mode.state'), 'utf8'), `${mode}\n`);
    assert.equal(run(['show'], { configDir: dir }).stdout, `OK mode=${mode}\n`);
  }
});

test('set creates the config dir when missing', () => {
  const dir = join(freshConfigDir(), 'nested', 'claude');
  const r = run(['set', 'orchestrator'], { configDir: dir });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(join(dir, 'mode.state'), 'utf8'), 'orchestrator\n');
});

test('off removes the state file (reset is an alias)', () => {
  for (const sub of ['off', 'reset']) {
    const dir = freshConfigDir();
    run(['set', 'task'], { configDir: dir });
    const r = run([sub], { configDir: dir });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, 'OK mode=off\n');
    assert.ok(!existsSync(join(dir, 'mode.state')));
  }
});

test('inject emits the hookSpecificOutput contract for every active mode', () => {
  for (const mode of MODES) {
    const dir = freshConfigDir();
    run(['set', mode], { configDir: dir });
    const r = run(['inject'], {
      configDir: dir,
      input: '{"hook_event_name":"SessionStart","source":"startup"}',
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`mode: ${mode}`));
  }
});

// meta-orchestrator says the delegation rules apply to it as well, and only ONE
// snippet is ever injected — so those rules have to arrive with it. Whoever sets
// meta-orchestrator must hold every applicable rule without looking anything up.
test('meta-orchestrator injects the shared delegation rules together with the board rules', () => {
  const dir = freshConfigDir();
  run(['set', 'meta-orchestrator'], { configDir: dir });
  const text = JSON.parse(run(['inject'], { configDir: dir, input: '{}' }).stdout)
    .hookSpecificOutput.additionalContext;

  assert.match(text, /hints, not proof/, 'shared delegation rules must be present');
  assert.match(text, /own the issue board/, 'board-level rules must be present');
  assert.match(text, /Economy limit/);
  assert.match(text, /green CI run/);
  assert.match(text, /Delegation hygiene/);
  assert.match(text, /git worktree add/);

  // 0.31.0 shipped "No sub-agent touches git operations", which forbade what the
  // core doctrine prescribes (sub-agents commit via agenticaiplugin:git-smart-commit).
  // No test caught it. Guard the class, not just the one wording.
  assert.match(text, /git-smart-commit/, 'the mode text must point sub-agents at the sanctioned commit path');
  assert.doesNotMatch(
    text,
    /no sub-agent touches git/i,
    'an absolute git ban contradicts the doctrine — name what stays with the orchestrator instead',
  );

  // Exactly one mode declaration and one precedence statement — the composed
  // snippet must not claim two active modes or rank itself twice.
  assert.equal(text.match(/Active agent mode:/g).length, 1);
  assert.equal(text.match(/ranks ABOVE/g).length, 1);
  assert.match(text, /Active agent mode: `meta-orchestrator`/);
});

test('orchestrator gets the shared rules but not the board-level rules', () => {
  const dir = freshConfigDir();
  run(['set', 'orchestrator'], { configDir: dir });
  const text = JSON.parse(run(['inject'], { configDir: dir, input: '{}' }).stdout)
    .hookSpecificOutput.additionalContext;

  assert.match(text, /hints, not proof/);
  assert.doesNotMatch(text, /own the issue board/);
  assert.doesNotMatch(text, /git worktree add/);
  assert.doesNotMatch(text, /Escalation ladder/);

  assert.equal(text.match(/Active agent mode:/g).length, 1);
  assert.equal(text.match(/ranks ABOVE/g).length, 1);
  assert.match(text, /Active agent mode: `orchestrator`/);
});

test('task gets neither the shared nor the board-level rules', () => {
  const dir = freshConfigDir();
  run(['set', 'task'], { configDir: dir });
  const text = JSON.parse(run(['inject'], { configDir: dir, input: '{}' }).stdout)
    .hookSpecificOutput.additionalContext;

  assert.doesNotMatch(text, /Economy limit/);
  assert.doesNotMatch(text, /own the issue board/);
  assert.equal(text.match(/Active agent mode:/g).length, 1);
});

test('inject passes an alternate hook_event_name through', () => {
  const dir = freshConfigDir();
  run(['set', 'task'], { configDir: dir });
  const r = run(['inject'], { configDir: dir, input: '{"hook_event_name":"Resume"}' });
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'Resume');
});

test('inject defaults the event when stdin is empty or invalid JSON', () => {
  const dir = freshConfigDir();
  run(['set', 'task'], { configDir: dir });
  for (const input of ['', 'not-json']) {
    const r = run(['inject'], { configDir: dir, input });
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'SessionStart');
  }
});

test('inject is a silent no-op when the mode is unset or off (opt-in gate)', () => {
  const unset = run(['inject'], { configDir: freshConfigDir(), input: '{}' });
  assert.equal(unset.status, 0);
  assert.equal(unset.stdout, '');

  const dir = freshConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'mode.state'), 'off\n');
  const off = run(['inject'], { configDir: dir, input: '{}' });
  assert.equal(off.status, 0);
  assert.equal(off.stdout, '');
});

test('inject is a silent no-op for a tampered/unknown state value (no path escape)', () => {
  const tamperedValues = [
    'supervisor',
    '../mode',
    '../../etc/passwd',
    'task/../orchestrator',
    '../persona/styles/engineer',
  ];
  for (const tampered of tamperedValues) {
    const dir = freshConfigDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'mode.state'), `${tampered}\n`);
    const r = run(['inject'], { configDir: dir, input: '{}' });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '', `state '${tampered}' must inject nothing`);
  }
});

test('inject is disabled by { "agentMode": "off" } in the plugin config', () => {
  const dir = freshConfigDir();
  run(['set', 'orchestrator'], { configDir: dir });
  writeFileSync(join(dir, 'agenticaiplugin.config.json'), JSON.stringify({ agentMode: 'off' }));
  const r = run(['inject'], { configDir: dir, input: '{}' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  // The CLI itself keeps working — only the injection is gated.
  assert.equal(run(['show'], { configDir: dir }).stdout, 'OK mode=orchestrator\n');
});

test('a broken config file does not suppress the injection', () => {
  const dir = freshConfigDir();
  run(['set', 'task'], { configDir: dir });
  writeFileSync(join(dir, 'agenticaiplugin.config.json'), '{ not json');
  const r = run(['inject'], { configDir: dir, input: '{}' });
  assert.equal(r.status, 0);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /mode: task/);
});

test('usage exits 2, unknown subcommand exits 1', () => {
  for (const args of [[], ['--help'], ['-h']]) {
    const usage = run(args, { configDir: freshConfigDir() });
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /^usage:/);
  }

  const unknown = run(['frobnicate'], { configDir: freshConfigDir() });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /^ERROR unknown subcommand/);
});
