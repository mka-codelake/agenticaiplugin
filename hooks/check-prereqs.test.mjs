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
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

function configFile(fixture) {
  mkdirSync(fixture.configDir, { recursive: true });
  return join(fixture.configDir, 'agenticaiplugin.config.json');
}

function writeConfigRaw(fixture, contents) {
  const path = configFile(fixture);
  writeFileSync(path, contents);
  return path;
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
  writeConfigRaw(fx, '{{{broken');
  assert.match(JSON.parse(run(fx).stdout).hookSpecificOutput.additionalContext, /`ghost`/);
  // Second run: the prerequisite notice must fall silent (on-change default),
  // while the config warning stays — the two halves are independent (#119).
  const second = JSON.parse(run(fx).stdout);
  assert.equal(second.hookSpecificOutput, undefined, 'corrupt config must behave like on-change');
  assert.match(second.systemMessage, /is not valid JSON/);
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

test('requiredWhen gate: unmet entry is skipped unless its feature is enabled', () => {
  const gated = {
    ...unmetEntry,
    requiredWhen: { config: 'autoskill.enabled', equals: true },
  };
  const writeConfig = (fx, obj) => {
    mkdirSync(fx.configDir, { recursive: true });
    writeFileSync(join(fx.configDir, 'agenticaiplugin.config.json'), JSON.stringify(obj));
  };

  // no config at all -> gate not satisfied -> silent
  assert.equal(run(makeFixture(registryWith(gated))).stdout, '');

  // feature disabled -> gate not satisfied -> silent
  const off = makeFixture(registryWith(gated));
  writeConfig(off, { autoskill: { enabled: false } });
  assert.equal(run(off).stdout, '');

  // feature enabled -> gate satisfied -> the unmet prerequisite is reported
  const on = makeFixture(registryWith(gated));
  writeConfig(on, { autoskill: { enabled: true } });
  assert.match(run(on).stdout, /`ghost`/);
});

// --- unreadable/unparsable config is reported to the user (issue #119) -------
//
// Every consumer of agenticaiplugin.config.json silently falls back to its
// default when the file cannot be parsed — for autoskill that default is OFF.
// These tests pin the warning, and the counter-checks below pin that it stays
// silent for configs that actually work.

// The registry half is silent here (`node` is met), so each case also proves
// the warning does not depend on the prerequisite notice being emitted.
function warningFor(contents) {
  const fx = makeFixture(registryWith(metEntry));
  writeConfigRaw(fx, contents);
  const r = run(fx);
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test('config warning: broken JSON is reported even when all prerequisites are met', () => {
  const out = warningFor('{"autoskill":{"enabled":true}');
  assert.match(out.systemMessage, /agenticaiplugin\.config\.json is not valid JSON/);
  assert.match(out.systemMessage, /autoskill/, 'must name what the user loses');
  assert.equal(out.hookSpecificOutput, undefined, 'no prerequisite notice was due');
});

test('config warning: an empty config file is reported', () => {
  assert.match(warningFor('').systemMessage, /is not valid JSON/);
});

test('config warning: a UTF-8 BOM in front of valid JSON is reported', () => {
  // Notepad/PowerShell write the BOM by default and JSON.parse rejects it —
  // the config looks correct in an editor but has no effect whatsoever.
  const out = warningFor('﻿{"autoskill":{"enabled":true}}');
  assert.match(out.systemMessage, /is not valid JSON/);
});

test('config warning: a non-object root is reported', () => {
  for (const contents of ['"off"', 'null', '[]']) {
    assert.match(
      warningFor(contents).systemMessage,
      /does not contain a JSON object/,
      `root ${contents} must be reported`
    );
  }
});

test('config warning: a directory in place of the config file is reported', () => {
  const fx = makeFixture(registryWith(metEntry));
  mkdirSync(join(fx.configDir, 'agenticaiplugin.config.json'), { recursive: true });
  const out = JSON.parse(run(fx).stdout);
  assert.match(out.systemMessage, /cannot be read/);
});

test(
  'config warning: an unreadable config file is reported',
  { skip: process.platform === 'win32' ? 'POSIX permissions only' : false },
  () => {
    const fx = makeFixture(registryWith(metEntry));
    const path = writeConfigRaw(fx, '{"autoskill":{"enabled":true}}');
    chmodSync(path, 0o000);
    try {
      readFileSync(path, 'utf8');
      return; // running as root: the file stays readable, nothing to assert
    } catch {
      // expected — the fixture really is unreadable for this user
    }
    const out = JSON.parse(run(fx).stdout);
    assert.match(out.systemMessage, /cannot be read \(EACCES\)/);
  }
);

test('config warning: a working config produces no warning', () => {
  // The counter-check: without it the tests above could not show that the
  // warning distinguishes anything at all.
  const fx = makeFixture(registryWith(metEntry));
  writeConfigRaw(fx, '{"autoskill":{"enabled":true},"prereqNotice":"every-session"}');
  assert.equal(run(fx).stdout, '', 'valid config + met prerequisites must stay silent');

  // ... and with no config file at all (the normal case) it also stays silent.
  assert.equal(run(makeFixture(registryWith(metEntry))).stdout, '');
});

test('config warning: key typos and wrong value types are NOT covered (documented limit)', () => {
  // Deliberate scope boundary: no key list, no schema. These configs parse, so
  // they stay silent even though they have no effect. Pinned so the limit is a
  // decision on record rather than an accident.
  for (const contents of ['{"autoskil":{"enabled":true}}', '{"doctrine":"off"}']) {
    const fx = makeFixture(registryWith(metEntry));
    writeConfigRaw(fx, contents);
    assert.equal(run(fx).stdout, '', `${contents} is out of scope for the warning`);
  }
});

test('config warning and prerequisite notice share one JSON object', () => {
  // A hook may write exactly one JSON object; two writes would emit two lines
  // and break the parse on the reading side.
  const fx = makeFixture(registryWith(unmetEntry));
  writeConfigRaw(fx, '{{{broken');
  const r = run(fx);
  assert.equal(r.stdout.trimEnd().split('\n').length, 1, 'exactly one line of stdout');
  const out = JSON.parse(r.stdout);
  assert.match(out.systemMessage, /is not valid JSON/);
  assert.match(out.hookSpecificOutput.additionalContext, /`ghost`/);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
});
