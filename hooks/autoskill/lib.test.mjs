// Tests for lib.mjs readConfig — CLAUDE_CONFIG_DIR is set before the dynamic
// import so CONFIG_FILE resolves into an isolated dir; readConfig re-reads the
// file on every call, so one fixture dir serves all cases. Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, normalize } from 'node:path';
import { test } from 'node:test';

const CONFIG_DIR = mkdtempSync(join(tmpdir(), 'autoskill-lib-'));
process.env.CLAUDE_CONFIG_DIR = CONFIG_DIR;
const { readConfig } = await import('./lib.mjs');
const CONFIG_FILE = join(CONFIG_DIR, 'agenticaiplugin.config.json');
const write = (obj) => writeFileSync(CONFIG_FILE, typeof obj === 'string' ? obj : JSON.stringify(obj));

test('missing/empty/invalid config falls back to safe defaults (disabled)', () => {
  write('{}');
  const d = readConfig();
  assert.equal(d.enabled, false);
  assert.equal(d.threshold, 10);
  assert.equal(d.reviewerModel, 'sonnet');
  assert.equal(d.nudgeInterval, 10);
  assert.deepEqual(d.curator, { enabled: true, intervalDays: 7 });

  write('{{{not json');
  assert.equal(readConfig().enabled, false, 'corrupt config -> defaults, never throws');
});

test('explicit false values survive (no truthiness traps)', () => {
  write({ autoskill: { enabled: false, curator: { enabled: false } } });
  const c = readConfig();
  assert.equal(c.enabled, false);
  assert.equal(c.curator.enabled, false);
});

test('the documented README config enables autoskill AND keeps the curator on', () => {
  // exactly what the README tells users to write — the curator key is omitted
  write({ autoskill: { enabled: true } });
  const c = readConfig();
  assert.equal(c.enabled, true);
  assert.equal(c.curator.enabled, true, 'lazy curator must stay on by default');
  assert.equal(c.curator.intervalDays, 7);
});

test('user values win; non-integer/negative numbers fall back', () => {
  write({ autoskill: { enabled: true, threshold: 3, nudgeInterval: 0, curator: { intervalDays: 14 } } });
  const c = readConfig();
  assert.equal(c.enabled, true);
  assert.equal(c.threshold, 3);
  assert.equal(c.nudgeInterval, 0);
  assert.equal(c.curator.intervalDays, 14);
  assert.equal(c.curator.enabled, true, 'curator.enabled defaults to true when the key is omitted');

  write({ autoskill: { threshold: -5, nudgeInterval: 2.5 } });
  const bad = readConfig();
  assert.equal(bad.threshold, 10, 'negative -> default');
  assert.equal(bad.nudgeInterval, 10, 'non-integer -> default');
});

test('REGRESSION: STAGING_DIR never lives under the Claude config dir (write-blocked "sensitive" zone)', () => {
  // Root cause of the v0.22.x rollout bug: staging under ~/.claude/ made every
  // reviewer Write fail with a "sensitive file" error. STAGING_DIR is computed
  // at import time from env, so probe it in a child process with a controlled
  // CLAUDE_CONFIG_DIR. Guards the invariant, not the current path choice.
  const lib = new URL('./lib.mjs', import.meta.url).href;
  const probe = (env) => {
    const code =
      `import * as m from ${JSON.stringify(lib)};` +
      `process.stdout.write(JSON.stringify({ staging: m.STAGING_DIR, config: m.CONFIG_DIR }));`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };

  // A realistic ~/.claude config dir, no staging override.
  const fakeClaude = join(tmpdir(), 'fake-home', '.claude');
  const { staging, config } = probe({ CLAUDE_CONFIG_DIR: fakeClaude, AUTOSKILL_STAGING_DIR: '' });
  assert.equal(config, fakeClaude);
  assert.ok(
    !normalize(staging).startsWith(normalize(fakeClaude)),
    `staging must live OUTSIDE the config dir — got: ${staging}`
  );
  assert.ok(
    !/[/\\]\.claude([/\\]|$)/.test(staging),
    `staging must not sit under any .claude directory — got: ${staging}`
  );

  // The override still wins — tests and the escape hatch depend on it.
  const forced = join(tmpdir(), 'forced-staging');
  assert.equal(probe({ AUTOSKILL_STAGING_DIR: forced }).staging, forced);
});

test('reviewerModel is whitelisted to a safe charset (argv injection guard)', () => {
  write({ autoskill: { reviewerModel: 'claude-opus-4-8' } });
  assert.equal(readConfig().reviewerModel, 'claude-opus-4-8', 'valid alias kept');

  for (const hostile of ['sonnet; rm -rf ~', 'a b', 'x"y', 'a|b', '$(id)', '']) {
    write({ autoskill: { reviewerModel: hostile } });
    assert.equal(readConfig().reviewerModel, 'sonnet', `rejected: ${JSON.stringify(hostile)}`);
  }
});
