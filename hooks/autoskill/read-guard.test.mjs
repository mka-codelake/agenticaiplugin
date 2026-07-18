// Tests for read-guard.mjs (PreToolUse guard of the reviewer session) —
// black-box via spawnSync with a fresh CLAUDE_CONFIG_DIR. Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'read-guard.mjs');

function fixture() {
  const configDir = mkdtempSync(join(tmpdir(), 'autoskill-guard-'));
  const stateDir = join(configDir, 'agenticaiplugin.autoskill');
  const staging = join(stateDir, 'staging');
  mkdirSync(staging, { recursive: true });
  return {
    configDir,
    stateDir,
    staging,
    run(input) {
      return spawnSync(process.execPath, [SCRIPT], {
        encoding: 'utf8',
        input: typeof input === 'string' ? input : JSON.stringify(input),
        // Point STAGING_DIR at the fixture: production staging lives outside the
        // config dir, so the guard no longer derives it from CLAUDE_CONFIG_DIR.
        env: { ...process.env, CLAUDE_CONFIG_DIR: configDir, AUTOSKILL_STAGING_DIR: staging },
      });
    },
  };
}

const decision = (r) => (r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : null);

test('Write inside staging is allowed (no decision emitted)', () => {
  const fx = fixture();
  const r = fx.run({
    session_id: 's1',
    tool_name: 'Write',
    tool_input: { file_path: join(fx.staging, 'learned-x', 'SKILL.md') },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, '');
});

test('Write outside staging is denied (path cage)', () => {
  const fx = fixture();
  const r = fx.run({
    session_id: 's1',
    tool_name: 'Write',
    tool_input: { file_path: join(fx.configDir, 'skills', 'learned-x', 'SKILL.md') },
  });
  const d = decision(r);
  assert.equal(d.permissionDecision, 'deny');
  assert.match(d.permissionDecisionReason, /staging/);
});

test('REGRESSION: path traversal is denied — a ".." escape prefixed with staging must not pass the cage', () => {
  const fx = fixture();
  // A raw (un-normalized) file_path that STARTS WITH the staging anchor yet
  // resolves outside it. A lexical startsWith() check would wrongly allow this;
  // canonicalization must catch it. Forward slashes: path.resolve handles both.
  const escape = `${fx.staging}/../../../../etc/passwd`;
  const r = fx.run({ session_id: 's1', tool_name: 'Write', tool_input: { file_path: escape } });
  const d = decision(r);
  assert.equal(d.permissionDecision, 'deny', 'traversal out of the cage must be denied');
  assert.match(d.permissionDecisionReason, /staging/);
});

test('read-before-write: existing file must be Read first; own writes count as read', () => {
  const fx = fixture();
  const file = join(fx.staging, 'learned-x-SKILL.md');
  writeFileSync(file, 'existing');

  const denied = fx.run({ session_id: 's1', tool_name: 'Edit', tool_input: { file_path: file } });
  assert.equal(decision(denied).permissionDecision, 'deny');
  assert.match(decision(denied).permissionDecisionReason, /read-before-write/);

  fx.run({ session_id: 's1', tool_name: 'Read', tool_input: { file_path: file } });
  const allowed = fx.run({ session_id: 's1', tool_name: 'Edit', tool_input: { file_path: file } });
  assert.equal(allowed.stdout, '', 'after Read the Edit passes');

  // a fresh Write marks the path as read for follow-up Edits
  const newFile = join(fx.staging, 'new.md');
  fx.run({ session_id: 's1', tool_name: 'Write', tool_input: { file_path: newFile } });
  writeFileSync(newFile, 'staged');
  const followUp = fx.run({ session_id: 's1', tool_name: 'Edit', tool_input: { file_path: newFile } });
  assert.equal(followUp.stdout, '', 'own write counts as read');
});

test('fail-closed: unparseable input is denied, other tools pass', () => {
  const fx = fixture();
  const broken = fx.run('{not json');
  assert.equal(decision(broken).permissionDecision, 'deny');
  assert.match(decision(broken).permissionDecisionReason, /could not parse/);

  assert.equal(fx.run({ session_id: 's1', tool_name: 'Glob', tool_input: {} }).stdout, '');
});
