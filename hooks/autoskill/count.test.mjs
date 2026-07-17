// Tests for count.mjs (PostToolUse hook) — black-box via spawnSync; isolation
// through a fresh CLAUDE_CONFIG_DIR per fixture (all autoskill paths derive
// from it). Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'count.mjs');

function fixture({ enabled = true } = {}) {
  const configDir = mkdtempSync(join(tmpdir(), 'autoskill-count-'));
  writeFileSync(
    join(configDir, 'agenticaiplugin.config.json'),
    JSON.stringify({ autoskill: { enabled } })
  );
  return {
    configDir,
    stateDir: join(configDir, 'agenticaiplugin.autoskill'),
    run(input, extraEnv = {}) {
      return spawnSync(process.execPath, [SCRIPT], {
        encoding: 'utf8',
        input: typeof input === 'string' ? input : JSON.stringify(input),
        env: { ...process.env, CLAUDE_CONFIG_DIR: configDir, AUTOSKILL_REVIEWER: '', ...extraEnv },
      });
    },
  };
}

const SID = 'sess-1';
const counterOf = (fx) => readFileSync(join(fx.stateDir, 'counters', `${SID}.count`), 'utf8').trim();

test('increments the counter per tool call', () => {
  const fx = fixture();
  for (const _ of [1, 2, 3]) {
    const r = fx.run({ session_id: SID, tool_name: 'Bash', tool_input: {} });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
  }
  assert.equal(counterOf(fx), '3');
});

// The skills library is <CLAUDE_CONFIG_DIR>/skills — NOT a hardcoded
// ".claude/skills". These tests build paths from the fixture's own config dir,
// so they exercise the CONFIG_DIR-aware anchor (a hardcoded substring would
// fail here — that was the blind spot a code review caught).
const skillFile = (fx, ...seg) => join(fx.configDir, 'skills', ...seg);

test('resets the counter on Write/Edit under the skills library (CONFIG_DIR-aware)', () => {
  const fx = fixture();
  fx.run({ session_id: SID, tool_name: 'Bash', tool_input: {} });
  fx.run({ session_id: SID, tool_name: 'Bash', tool_input: {} });
  // feed the path with Windows-style separators to also exercise normalization
  const winStyle = skillFile(fx, 'learned-foo', 'SKILL.md').replace(/\//g, '\\');
  const r = fx.run({ session_id: SID, tool_name: 'Write', tool_input: { file_path: winStyle } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(counterOf(fx), '0', 'backslash paths (Windows) must be normalized and matched');
});

test('a non-default CLAUDE_CONFIG_DIR path still counts as skill work', () => {
  const fx = fixture();
  // sanity: the fixture config dir is a temp path with no ".claude/skills" in it
  assert.doesNotMatch(fx.configDir, /\.claude[\\/]skills/);
  fx.run({ session_id: SID, tool_name: 'Bash', tool_input: {} });
  fx.run({ session_id: SID, tool_name: 'Edit', tool_input: { file_path: skillFile(fx, 'learned-bar', 'reference.md') } });
  assert.equal(counterOf(fx), '0', 'reset must not depend on a hardcoded .claude/skills substring');
});

test('bumps usage for Read on a learned skill file and for Skill tool calls', () => {
  const fx = fixture();
  mkdirSync(fx.stateDir, { recursive: true });
  writeFileSync(join(fx.stateDir, 'learned.list'), 'learned-foo\n');
  fx.run({
    session_id: SID,
    tool_name: 'Read',
    tool_input: { file_path: skillFile(fx, 'learned-foo', 'SKILL.md') },
  });
  fx.run({ session_id: SID, tool_name: 'Skill', tool_input: { skill: 'learned-foo' } });
  fx.run({ session_id: SID, tool_name: 'Skill', tool_input: { skill: 'not-learned' } });
  const usage = JSON.parse(readFileSync(join(fx.stateDir, 'usage.json'), 'utf8'));
  assert.equal(usage['learned-foo'].uses, 2);
  assert.ok(usage['learned-foo'].last_used);
  assert.equal(usage['not-learned'], undefined, 'non-learned skills are not tracked');
});

test('disabled config and reviewer env are hard no-ops', () => {
  const off = fixture({ enabled: false });
  assert.equal(off.run({ session_id: SID, tool_name: 'Bash', tool_input: {} }).status, 0);
  assert.equal(existsSync(join(off.stateDir, 'counters')), false);

  const guard = fixture();
  guard.run({ session_id: SID, tool_name: 'Bash', tool_input: {} }, { AUTOSKILL_REVIEWER: '1' });
  assert.equal(existsSync(join(guard.stateDir, 'counters')), false);
});

test('missing config file means disabled (opt-in default)', () => {
  const fx = fixture();
  writeFileSync(join(fx.configDir, 'agenticaiplugin.config.json'), '{}');
  assert.equal(fx.run({ session_id: SID, tool_name: 'Bash', tool_input: {} }).status, 0);
  assert.equal(existsSync(join(fx.stateDir, 'counters')), false);
});

test('invalid stdin and hostile session ids are ignored, exit 0', () => {
  const fx = fixture();
  assert.equal(fx.run('not json').status, 0);
  assert.equal(fx.run({ tool_name: 'Bash' }).status, 0);
  assert.equal(
    fx.run({ session_id: '../../etc/passwd', tool_name: 'Bash', tool_input: {} }).status,
    0
  );
  // The hostile session_id is rejected by the id validation, so no counter
  // file is written anywhere — in particular nothing escapes the config dir.
  assert.equal(existsSync(join(fx.configDir, 'etc')), false, 'no path escape via session_id');
  assert.equal(existsSync(join(fx.stateDir, 'counters')), false, 'rejected before any write');
});
