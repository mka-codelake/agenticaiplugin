// Tests for nudge.mjs (UserPromptSubmit hook) — black-box via spawnSync with a
// fresh CLAUDE_CONFIG_DIR per fixture. Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'nudge.mjs');

function fixture(config = { enabled: true, nudgeInterval: 3 }) {
  const configDir = mkdtempSync(join(tmpdir(), 'autoskill-nudge-'));
  writeFileSync(
    join(configDir, 'agenticaiplugin.config.json'),
    JSON.stringify({ autoskill: config })
  );
  const stateDir = join(configDir, 'agenticaiplugin.autoskill');
  mkdirSync(stateDir, { recursive: true });
  return {
    configDir,
    stateDir,
    run(input = { session_id: 'sess-1' }, extraEnv = {}) {
      return spawnSync(process.execPath, [SCRIPT], {
        encoding: 'utf8',
        input: JSON.stringify(input),
        env: { ...process.env, CLAUDE_CONFIG_DIR: configDir, AUTOSKILL_REVIEWER: '', ...extraEnv },
      });
    },
  };
}

test('pending notice: systemMessage (💾) + additionalContext, notice file consumed', () => {
  const fx = fixture();
  writeFileSync(join(fx.stateDir, 'pending_notice.txt'), 'Review-Ergebnis: 1 Skill gepatcht\n');
  const r = fx.run();
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(out.hookSpecificOutput.additionalContext, /1 Skill gepatcht/);
  assert.equal(out.systemMessage, '💾 Review-Ergebnis: 1 Skill gepatcht');
  assert.equal(existsSync(join(fx.stateDir, 'pending_notice.txt')), false, 'notice is one-shot');
  assert.equal(fx.run().stdout, '', 'second prompt: nothing left to say');
});

test('every Nth prompt injects the learn nudge WITHOUT a systemMessage', () => {
  const fx = fixture({ enabled: true, nudgeInterval: 3 });
  assert.equal(fx.run().stdout, '');
  assert.equal(fx.run().stdout, '');
  const r = fx.run();
  const out = JSON.parse(r.stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /Reminder \(autoskill\)/);
  assert.match(out.hookSpecificOutput.additionalContext, /agenticaiplugin:learn/);
  assert.equal(out.systemMessage, undefined, 'the nudge is model-only');
  assert.equal(fx.run().stdout, '', 'counter continues past the interval');
});

test('notice and nudge combine into one additionalContext', () => {
  const fx = fixture({ enabled: true, nudgeInterval: 1 });
  writeFileSync(join(fx.stateDir, 'pending_notice.txt'), 'Notiz\n');
  const out = JSON.parse(fx.run().stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /^Notiz\nReminder \(autoskill\)/);
  assert.equal(out.systemMessage, '💾 Notiz');
});

test('nudgeInterval 0 disables the nudge; disabled/reviewer are hard no-ops', () => {
  const fx = fixture({ enabled: true, nudgeInterval: 0 });
  for (const _ of Array(5)) assert.equal(fx.run().stdout, '');

  const off = fixture({ enabled: false, nudgeInterval: 1 });
  writeFileSync(join(off.stateDir, 'pending_notice.txt'), 'Notiz\n');
  assert.equal(off.run().stdout, '');
  assert.equal(existsSync(join(off.stateDir, 'pending_notice.txt')), true, 'disabled: untouched');

  const guard = fixture({ enabled: true, nudgeInterval: 1 });
  assert.equal(guard.run({ session_id: 's' }, { AUTOSKILL_REVIEWER: '1' }).stdout, '');
});

test('missing/invalid stdin: notice still delivered (no session counter)', () => {
  const fx = fixture({ enabled: true, nudgeInterval: 1 });
  writeFileSync(join(fx.stateDir, 'pending_notice.txt'), 'Notiz\n');
  const r = spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf8',
    input: '',
    env: { ...process.env, CLAUDE_CONFIG_DIR: fx.configDir, AUTOSKILL_REVIEWER: '' },
  });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.systemMessage, '💾 Notiz');
});
