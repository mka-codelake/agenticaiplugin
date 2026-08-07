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
    // `envPatch` overrides the environment the guard child runs with. A key set to
    // undefined is removed — that is how the "worker never exported it" case below
    // is produced, which no test could reach while this harness always set it.
    run(input, envPatch = {}) {
      // Point STAGING_DIR at the fixture: production staging lives outside the
      // config dir, so the guard no longer derives it from CLAUDE_CONFIG_DIR.
      const env = {
        ...process.env,
        CLAUDE_CONFIG_DIR: configDir,
        AUTOSKILL_STAGING_DIR: staging,
        ...envPatch,
      };
      for (const [k, v] of Object.entries(envPatch)) if (v === undefined) delete env[k];
      return spawnSync(process.execPath, [SCRIPT], {
        encoding: 'utf8',
        input: typeof input === 'string' ? input : JSON.stringify(input),
        env,
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

// ---------------------------------------------------------------------------
// The two arms that used to end in a silent yes (#122)
//
// Both were fail-open: a guard that cannot tell whether a write is inside its cage
// let the write happen. That is the worst possible answer for a cage — it fails in
// exactly the situations the cage exists for, and it fails quietly.

test('Write without a file_path is denied, not waved through', () => {
  const fx = fixture();
  for (const tool of ['Write', 'Edit']) {
    const d = decision(fx.run({ session_id: 's1', tool_name: tool, tool_input: {} }));
    assert.equal(d?.permissionDecision, 'deny', `${tool} without file_path must be denied`);
    assert.match(d.permissionDecisionReason, /without a file_path/);
  }
});

test('a write is denied when the worker never exported AUTOSKILL_STAGING_DIR', () => {
  const fx = fixture();
  const input = {
    session_id: 's1',
    tool_name: 'Write',
    tool_input: { file_path: join(fx.staging, 'skill.md') },
  };

  // Same write, env present: allowed. Without this line the test below would also
  // pass if the path itself were being rejected for an unrelated reason.
  assert.equal(fx.run(input).stdout, '', 'control: the same write is allowed with the env set');

  const d = decision(fx.run(input, { AUTOSKILL_STAGING_DIR: undefined }));
  assert.equal(d?.permissionDecision, 'deny');
  assert.match(d.permissionDecisionReason, /AUTOSKILL_STAGING_DIR is not set/);

  // Reads stay allowed — blocking them buys nothing and would break the invariant
  // that a Read must precede an Edit.
  assert.equal(
    fx.run({ session_id: 's1', tool_name: 'Read', tool_input: { file_path: 'x.md' } },
      { AUTOSKILL_STAGING_DIR: undefined }).stdout,
    '',
  );
});
