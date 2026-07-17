// Tests for check-prereqs.mjs (issue #25) — Node stdlib only, run with:
//   node --test
//
// Black-box: each fixture copies the real script into a temp plugin skeleton
// (tmp/hooks/check-prereqs.mjs + tmp/prerequisites.json) so the script's own
// registry resolution (relative to its location) is exercised unchanged, and
// spawns it with CLAUDE_CONFIG_DIR pointing at a fresh temp dir — exactly how
// the SessionStart hook invokes it.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REAL_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-prereqs.mjs');
const MISSING_BINARY = 'agenticaiplugin-definitely-missing-binary';

function makeFixture(registry) {
  const root = mkdtempSync(join(tmpdir(), 'prereqs-test-'));
  mkdirSync(join(root, 'hooks'));
  copyFileSync(REAL_SCRIPT, join(root, 'hooks', 'check-prereqs.mjs'));
  if (registry !== undefined) {
    writeFileSync(
      join(root, 'prerequisites.json'),
      typeof registry === 'string' ? registry : JSON.stringify(registry)
    );
  }
  const configDir = join(root, 'claude-config');
  return { root, configDir, script: join(root, 'hooks', 'check-prereqs.mjs') };
}

function run(fixture, { input = '{"hook_event_name":"SessionStart"}' } = {}) {
  return spawnSync(process.execPath, [fixture.script], {
    encoding: 'utf8',
    input,
    env: { ...process.env, CLAUDE_CONFIG_DIR: fixture.configDir },
  });
}

function registryWith(...entries) {
  return { prerequisites: entries };
}

const metEntry = {
  id: 'node',
  check: { type: 'binary', name: 'node', versionArg: '--version', minMajor: 18 },
  features: ['persona'],
  hints: { linux: 'apt', win32: 'winget', darwin: 'brew' },
};

const unmetEntry = {
  id: 'ghost',
  check: { type: 'binary', name: MISSING_BINARY },
  features: ['future feature'],
  hints: { linux: 'install ghost via apt', win32: 'install ghost via winget', darwin: 'install ghost via brew' },
};

test('all prerequisites met: no output, exit 0', () => {
  const fx = makeFixture(registryWith(metEntry));
  const r = run(fx);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, '');
});

test('unmet prerequisite: emits notice with id, features, and platform hint', () => {
  const fx = makeFixture(registryWith(metEntry, unmetEntry));
  const r = run(fx);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.match(ctx, /`ghost`/);
  assert.match(ctx, /future feature/);
  assert.match(ctx, /install ghost via/);
  assert.doesNotMatch(ctx, /`node`/, 'met prerequisites must not be listed');
});

test('default on-change: same unmet state is reported only once', () => {
  const fx = makeFixture(registryWith(unmetEntry));
  assert.notEqual(run(fx).stdout, '');
  assert.equal(run(fx).stdout, '', 'second session with unchanged state must be silent');
});

test('config every-session: repeats the notice while unmet', () => {
  const fx = makeFixture(registryWith(unmetEntry));
  mkdirSync(fx.configDir, { recursive: true });
  writeFileSync(join(fx.configDir, 'agenticaiplugin.config.json'), '{"prereqNotice":"every-session"}');
  assert.notEqual(run(fx).stdout, '');
  assert.notEqual(run(fx).stdout, '', 'every-session must re-notify');
});

test('on-change: a changed unmet set re-triggers the notice', () => {
  const fx = makeFixture(registryWith(unmetEntry));
  assert.notEqual(run(fx).stdout, '');
  const second = { ...unmetEntry, id: 'ghost2', check: { type: 'binary', name: MISSING_BINARY } };
  writeFileSync(join(fx.root, 'prerequisites.json'), JSON.stringify(registryWith(unmetEntry, second)));
  assert.match(run(fx).stdout, /ghost2/, 'newly unmet prerequisite must re-trigger');
});

test('recovery and regression: met clears the marker, unmet again re-reports', () => {
  const fx = makeFixture(registryWith(unmetEntry));
  assert.notEqual(run(fx).stdout, '');
  writeFileSync(join(fx.root, 'prerequisites.json'), JSON.stringify(registryWith(metEntry)));
  assert.equal(run(fx).stdout, '', 'recovered state must be silent');
  writeFileSync(join(fx.root, 'prerequisites.json'), JSON.stringify(registryWith(unmetEntry)));
  assert.notEqual(run(fx).stdout, '', 'regression after recovery must re-report');
});

test('minMajor violation is reported with the found version', () => {
  const tooNew = { ...metEntry, id: 'node-future', check: { ...metEntry.check, minMajor: 9999 } };
  const fx = makeFixture(registryWith(tooNew));
  const ctx = JSON.parse(run(fx).stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /need major >= 9999/);
});

test('fail-safe: missing or corrupt registry emits nothing, exit 0', () => {
  for (const registry of [undefined, 'not-json{{{']) {
    const fx = makeFixture(registry);
    const r = run(fx);
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  }
});

test('fail-safe: corrupt config falls back to on-change default', () => {
  const fx = makeFixture(registryWith(unmetEntry));
  mkdirSync(fx.configDir, { recursive: true });
  writeFileSync(join(fx.configDir, 'agenticaiplugin.config.json'), '{{{broken');
  assert.notEqual(run(fx).stdout, '');
  assert.equal(run(fx).stdout, '', 'corrupt config must behave like on-change');
});

test('unknown check types count as met (forward compatibility)', () => {
  const fx = makeFixture(registryWith({ id: 'exotic', check: { type: 'quantum' }, features: [], hints: {} }));
  assert.equal(run(fx).stdout, '');
});

test('fail-safe: empty or malformed stdin still works, event defaults to SessionStart', () => {
  for (const input of ['', 'not-json']) {
    const fx = makeFixture(registryWith(unmetEntry));
    const r = run(fx, { input });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'SessionStart');
  }
});

test('unknown platform: all hints are listed (fallback aligned with project-initializer)', () => {
  const foreign = ['win32', 'darwin', 'linux'].filter((p) => p !== process.platform).slice(0, 2);
  const entry = {
    ...unmetEntry,
    hints: { [foreign[0]]: 'hint-alpha', [foreign[1]]: 'hint-beta' },
  };
  const fx = makeFixture(registryWith(entry));
  const ctx = JSON.parse(run(fx).stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /hint-alpha/);
  assert.match(ctx, /hint-beta/);
});

test('marker file records the current unmet set', () => {
  const fx = makeFixture(registryWith(unmetEntry));
  run(fx);
  const marker = JSON.parse(readFileSync(join(fx.configDir, 'agenticaiplugin.prereqs.state'), 'utf8'));
  assert.deepEqual(marker.unmet, ['ghost']);
});
