// Tests for the SessionStart doctrine injection hook (issues #77, #117).
// Black-box CLI (spawn + JSON stdin) plus a buildContext unit test.
//
// Since the constitution and the themes were unified into this one script, the
// central property is no longer "the right blocks are injected" but "the
// constitution is injected unconditionally, and only the themes are switchable".
// Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildContext } from './inject-doctrine.mjs';

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HOOKS_DIR, 'inject-doctrine.mjs');
const DOCTRINE_DIR = join(dirname(HOOKS_DIR), 'doctrine');

// Sentinels must be unique to their own file. `Never assume` was not: the mode text
// quotes the base rule verbatim, so deleting base.md left six assertions green.
const BASE_SENTINEL = /# AgenticAI — Core working doctrine/;
const MODE_SENTINEL = /Active agent mode: `orchestrator`/;
const DELEGATION_SENTINEL = /hints, not proof/;
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
    assert.match(ctx, BASE_SENTINEL);
    assert.match(ctx, MODE_SENTINEL);
    assert.match(ctx, DELEGATION_SENTINEL);
    assert.match(ctx, REVIEW_SENTINEL);
    assert.match(ctx, PR_MONITOR_SENTINEL);
  });
}

test('echoes back the hook_event_name', () => {
  const out = JSON.parse(run({ hook_event_name: 'SessionStart', source: 'startup' }));
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
});

test('defaults the event when stdin is empty or invalid JSON', () => {
  for (const input of ['', 'not-json']) {
    const res = spawnSync(process.execPath, [SCRIPT], {
      input,
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'doc-cfg-')) },
    });
    assert.equal(res.status, 0);
    assert.equal(JSON.parse(res.stdout).hookSpecificOutput.hookEventName, 'SessionStart');
  }
});

function withConfig(cfg) {
  const dir = mkdtempSync(join(tmpdir(), 'doc-cfg-'));
  writeFileSync(join(dir, 'agenticaiplugin.config.json'), JSON.stringify(cfg));
  return dir;
}

// The point of 0.31.4, carried over from the retired mode script: the mode is not
// a setting, and neither is the base doctrine. The `doctrine.core` switch is gone;
// a config file left over from before must not disable anything.
test('the constitution cannot be switched off by a leftover core switch', () => {
  for (const cfg of [
    { doctrine: { core: 'off' } },
    { doctrine: { core: 'off', codeReview: 'off', prReviewMonitoring: 'off' } },
    { agentMode: 'off' },
  ]) {
    const ctx = contextOf(
      run({ hook_event_name: 'SessionStart', source: 'startup' }, { CLAUDE_CONFIG_DIR: withConfig(cfg) })
    );
    assert.ok(ctx, `config ${JSON.stringify(cfg)} must still inject the constitution`);
    assert.match(ctx, BASE_SENTINEL, `base.md missing for config ${JSON.stringify(cfg)}`);
    assert.match(ctx, MODE_SENTINEL, `orchestrator.md missing for config ${JSON.stringify(cfg)}`);
  }
});

test('doctrine.codeReview = "off" omits the review block and nothing else', () => {
  const ctx = contextOf(
    run({ hook_event_name: 'SessionStart', source: 'startup' }, { CLAUDE_CONFIG_DIR: withConfig({ doctrine: { codeReview: 'off' } }) })
  );
  assert.ok(ctx);
  assert.doesNotMatch(ctx, REVIEW_SENTINEL);
  assert.match(ctx, BASE_SENTINEL);
  assert.match(ctx, MODE_SENTINEL);
  assert.match(ctx, DELEGATION_SENTINEL);
  assert.match(ctx, PR_MONITOR_SENTINEL);
});

test('doctrine.prReviewMonitoring = "off" omits the PR monitoring block and nothing else', () => {
  const ctx = contextOf(
    run({ hook_event_name: 'SessionStart', source: 'startup' }, { CLAUDE_CONFIG_DIR: withConfig({ doctrine: { prReviewMonitoring: 'off' } }) })
  );
  assert.ok(ctx);
  assert.doesNotMatch(ctx, PR_MONITOR_SENTINEL);
  assert.match(ctx, BASE_SENTINEL);
  assert.match(ctx, MODE_SENTINEL);
  assert.match(ctx, DELEGATION_SENTINEL);
  assert.match(ctx, REVIEW_SENTINEL);
});

// Order is part of the contract: constitution (base, then the mode head, then the
// shared delegation rules), themes after. A block that arrives before the base
// doctrine reads as a rule without its frame.
test('the five blocks arrive in the agreed order', () => {
  const ctx = contextOf(run({ hook_event_name: 'SessionStart', source: 'startup' }));
  const positions = [BASE_SENTINEL, MODE_SENTINEL, DELEGATION_SENTINEL, REVIEW_SENTINEL, PR_MONITOR_SENTINEL].map(
    (sentinel) => ctx.search(sentinel)
  );
  assert.ok(positions.every((p) => p >= 0), 'every block must be present');
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), 'blocks must appear in the declared order');
});

// The composed constitution must not claim two active modes or rank itself twice:
// shared-delegation.md carries neither a mode declaration nor a precedence
// sentence, the mode head supplies both exactly once.
test('the composed constitution declares exactly one mode and one precedence', () => {
  const ctx = contextOf(run({ hook_event_name: 'SessionStart', source: 'startup' }));
  assert.equal(ctx.match(/Active agent mode:/g).length, 1);
  assert.equal(ctx.match(/ranks ABOVE/g).length, 1);
});

// 0.31.0 shipped "No sub-agent touches git operations", which forbade what the
// base doctrine prescribes (sub-agents commit via agenticaiplugin:git-smart-commit).
// No test caught it. Guard the class, not just the one wording.
test('the mode text points sub-agents at the sanctioned commit path', () => {
  const ctx = contextOf(run({ hook_event_name: 'SessionStart', source: 'startup' }));
  assert.match(ctx, /git-smart-commit/, 'the mode text must name the sanctioned commit path');
  assert.doesNotMatch(
    ctx,
    /no sub-agent touches git/i,
    'an absolute git ban contradicts the doctrine — name what stays with the orchestrator instead',
  );
});

// Fail-open on the config side — the counterpart to the fail-safe on the doctrine
// side. What it protects against: a typo in agenticaiplugin.config.json silently
// switching a theme off, which looks exactly like a normal session.
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
  assert.match(ctx, BASE_SENTINEL);
  assert.match(ctx, MODE_SENTINEL);
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
    '{"doctrine": {"codeReview": false}}',
    '"off"',
    'null',
  ]) {
    const ctx = contextOf(
      run({ hook_event_name: 'SessionStart', source: 'startup' }, { CLAUDE_CONFIG_DIR: withRawConfig(raw) })
    );
    assert.ok(ctx, `config ${JSON.stringify(raw)} must still inject`);
    assert.match(ctx, BASE_SENTINEL, `base block missing for config ${JSON.stringify(raw)}`);
    assert.match(ctx, MODE_SENTINEL, `mode block missing for config ${JSON.stringify(raw)}`);
    assert.match(ctx, REVIEW_SENTINEL, `review block missing for config ${JSON.stringify(raw)}`);
    assert.match(ctx, PR_MONITOR_SENTINEL, `PR monitoring block missing for config ${JSON.stringify(raw)}`);
  }
});

test('missing config = all blocks present', () => {
  const ctx = buildContext(null);
  assert.ok(ctx);
  assert.match(ctx, BASE_SENTINEL);
  assert.match(ctx, MODE_SENTINEL);
  assert.match(ctx, REVIEW_SENTINEL);
  assert.match(ctx, PR_MONITOR_SENTINEL);
});

// Fail-safe on the doctrine side: a broken installation must cost the session
// nothing but the doctrine text — never an error at session start.
test('unreadable doctrine files are a silent no-op, not a crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'doc-broken-'));
  const script = join(dir, 'inject-doctrine.mjs');
  cpSync(SCRIPT, script); // copied WITHOUT a doctrine/ directory beside it
  const res = spawnSync(process.execPath, [script], {
    input: '{}',
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: mkdtempSync(join(tmpdir(), 'doc-cfg-')) },
  });
  assert.equal(res.status, 0);
  assert.equal(res.stdout, '');
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
  assert.match(ctx, BASE_SENTINEL);
  assert.match(ctx, MODE_SENTINEL);
});

test('doctrine/ holds exactly the files the composition names', () => {
  assert.deepEqual(
    readdirSync(join(DOCTRINE_DIR, 'constitution')).sort(),
    ['base.md', 'orchestrator.md', 'shared-delegation.md'],
    'a leftover snippet of a removed mode ships dead weight into every installation',
  );
  assert.deepEqual(
    readdirSync(join(DOCTRINE_DIR, 'themes')).sort(),
    ['code-review.md', 'pr-review-monitoring.md'],
  );
});
