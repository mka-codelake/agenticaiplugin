// Tests for the SessionStart doctrine injection hook.
// Black-box CLI (spawn + JSON stdin) plus a buildContext unit test.
// Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildContext } from './inject-doctrine.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'inject-doctrine.mjs');
const CORE_SENTINEL = /Never assume/;
const REVIEW_SENTINEL = /code review after completing/i;
const PR_MONITOR_SENTINEL = /PR review monitoring/;

// Spawn with a fresh (empty) config dir unless one is supplied.
function run(input, env = {}) {
  const res = spawnSync(process.execPath, [SCRIPT], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'doc-cfg-')), ...env },
  });
  return res.stdout || '';
}

function contextOf(stdout) {
  if (!stdout.trim()) return null;
  return JSON.parse(stdout)?.hookSpecificOutput?.additionalContext ?? null;
}

for (const source of ['startup', 'resume', 'clear', 'compact']) {
  test(`injects on source: ${source}`, () => {
    const ctx = contextOf(run({ hook_event_name: 'SessionStart', source }));
    assert.ok(ctx, `expected additionalContext for source ${source}`);
    assert.match(ctx, CORE_SENTINEL);
    assert.match(ctx, REVIEW_SENTINEL);
    assert.match(ctx, PR_MONITOR_SENTINEL);
  });
}

test('echoes back the hook_event_name', () => {
  const out = JSON.parse(run({ hook_event_name: 'SessionStart', source: 'startup' }));
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
});

function withConfig(cfg) {
  const dir = mkdtempSync(join(tmpdir(), 'doc-cfg-'));
  writeFileSync(join(dir, 'agenticaiplugin.config.json'), JSON.stringify(cfg));
  return dir;
}

test('doctrine.core = "off" omits the core block', () => {
  const ctx = contextOf(
    run({ hook_event_name: 'SessionStart', source: 'startup' }, { CLAUDE_CONFIG_DIR: withConfig({ doctrine: { core: 'off' } }) })
  );
  assert.ok(ctx);
  assert.doesNotMatch(ctx, CORE_SENTINEL);
  assert.match(ctx, REVIEW_SENTINEL);
});

test('doctrine.codeReview = "off" omits the review block', () => {
  const ctx = contextOf(
    run({ hook_event_name: 'SessionStart', source: 'startup' }, { CLAUDE_CONFIG_DIR: withConfig({ doctrine: { codeReview: 'off' } }) })
  );
  assert.ok(ctx);
  assert.match(ctx, CORE_SENTINEL);
  assert.doesNotMatch(ctx, REVIEW_SENTINEL);
});

test('doctrine.prReviewMonitoring = "off" omits the PR monitoring block', () => {
  const ctx = contextOf(
    run({ hook_event_name: 'SessionStart', source: 'startup' }, { CLAUDE_CONFIG_DIR: withConfig({ doctrine: { prReviewMonitoring: 'off' } }) })
  );
  assert.ok(ctx);
  assert.match(ctx, CORE_SENTINEL);
  assert.match(ctx, REVIEW_SENTINEL);
  assert.doesNotMatch(ctx, PR_MONITOR_SENTINEL);
});

test('all off = no output', () => {
  const out = run(
    { hook_event_name: 'SessionStart', source: 'startup' },
    { CLAUDE_CONFIG_DIR: withConfig({ doctrine: { core: 'off', codeReview: 'off', prReviewMonitoring: 'off' } }) }
  );
  assert.equal(out.trim(), '');
});

// Fail-open on the config side — the counterpart to the fail-safe on the doctrine
// side. Until 0.31.4 this class was covered only by a test in skills/mode, which
// went with the mode state; the guarantee is inject-doctrine's own and belongs
// here. What it protects against: a typo in agenticaiplugin.config.json silently
// switching the doctrine off, which looks exactly like a normal session.
function withRawConfig(text) {
  const dir = mkdtempSync(join(tmpdir(), 'doc-cfg-'));
  writeFileSync(join(dir, 'agenticaiplugin.config.json'), text);
  return dir;
}

test('a broken config file does not suppress the doctrine', () => {
  const ctx = contextOf(
    run({ hook_event_name: 'SessionStart', source: 'startup' }, { CLAUDE_CONFIG_DIR: withRawConfig('{ not json') })
  );
  assert.ok(ctx, 'unparsable config must inject the full doctrine, not nothing');
  assert.match(ctx, CORE_SENTINEL);
  assert.match(ctx, REVIEW_SENTINEL);
  assert.match(ctx, PR_MONITOR_SENTINEL);
});

// Valid JSON in a shape the code does not expect. `{"doctrine":"off"}` is the
// plausible typo — someone reaching for "turn the doctrine off" — and it must
// leave everything ON rather than half-match its way into disabling a block.
test('an unexpectedly shaped config does not suppress any block', () => {
  for (const raw of [
    '',
    '{"doctrine": "off"}',
    '{"doctrine": null}',
    '{"doctrine": ["off"]}',
    '{"doctrine": true}',
    '{"doctrine": {"core": false}}',
    '"off"',
    'null',
  ]) {
    const ctx = contextOf(
      run({ hook_event_name: 'SessionStart', source: 'startup' }, { CLAUDE_CONFIG_DIR: withRawConfig(raw) })
    );
    assert.ok(ctx, `config ${JSON.stringify(raw)} must still inject`);
    assert.match(ctx, CORE_SENTINEL, `core block missing for config ${JSON.stringify(raw)}`);
    assert.match(ctx, REVIEW_SENTINEL, `review block missing for config ${JSON.stringify(raw)}`);
    assert.match(ctx, PR_MONITOR_SENTINEL, `PR monitoring block missing for config ${JSON.stringify(raw)}`);
  }
});

test('missing config = all blocks present', () => {
  const ctx = buildContext(null);
  assert.ok(ctx);
  assert.match(ctx, CORE_SENTINEL);
  assert.match(ctx, REVIEW_SENTINEL);
  assert.match(ctx, PR_MONITOR_SENTINEL);
});

// The plugin loads via a symlinked marketplace path; injection must still fire.
test('injects when invoked via a symlinked path (does not silently no-op)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'doc-link-'));
  const link = join(dir, 'inject-doctrine.mjs');
  symlinkSync(SCRIPT, link);
  const res = spawnSync(process.execPath, [link], {
    input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'compact' }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'doc-cfg-')) },
  });
  const ctx = contextOf(res.stdout || '');
  assert.ok(ctx, 'doctrine must inject even when invoked via a symlink');
  assert.match(ctx, CORE_SENTINEL);
});
