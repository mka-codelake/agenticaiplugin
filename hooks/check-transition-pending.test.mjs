// Tests for the transition-pending notice hook (SessionStart). Black-box via CLI
// spawn with JSON stdin and an isolated CLAUDE_CONFIG_DIR. Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-transition-pending.mjs');

function project() {
  return mkdtempSync(join(tmpdir(), 'ctp-proj-'));
}
function installRule(root, name = 'agenticaiplugin-core.md') {
  const dir = join(root, '.claude', 'rules');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), '# rule');
}
function legacyDocs(root) {
  mkdirSync(join(root, 'claudedocs', 'guidelines'), { recursive: true });
}
// Each run gets a fresh config dir unless one is supplied (so the on-change marker
// starts empty).
function run(root, { cfgDir = mkdtempSync(join(tmpdir(), 'ctp-cfg-')), config } = {}) {
  if (config) writeFileSync(join(cfgDir, 'agenticaiplugin.config.json'), JSON.stringify(config));
  const r = spawnSync(process.execPath, [SCRIPT], {
    input: JSON.stringify({ hook_event_name: 'SessionStart', cwd: root }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfgDir },
  });
  return { stdout: r.stdout || '', cfgDir };
}
function notice(stdout) {
  return stdout.trim() ? JSON.parse(stdout)?.hookSpecificOutput?.additionalContext ?? '' : '';
}

test('notifies when legacy copied rules are present', () => {
  const root = project();
  installRule(root);
  const { stdout } = run(root);
  assert.match(notice(stdout), /update-plugin/);
  assert.match(notice(stdout), /agenticaiplugin-core\.md/);
});

test('notifies when a legacy claudedocs structure is present', () => {
  const root = project();
  legacyDocs(root);
  const { stdout } = run(root);
  assert.match(notice(stdout), /claudedocs/);
});

test('silent when nothing legacy is present', () => {
  const { stdout } = run(project());
  assert.equal(stdout.trim(), '');
});

test('on-change de-dup: second identical session is silent', () => {
  const root = project();
  installRule(root);
  const first = run(root);
  assert.notEqual(first.stdout.trim(), '');
  const second = run(root, { cfgDir: first.cfgDir });
  assert.equal(second.stdout.trim(), '');
});

test('disabled via { transitionNotice: "off" }', () => {
  const root = project();
  installRule(root);
  const { stdout } = run(root, { config: { transitionNotice: 'off' } });
  assert.equal(stdout.trim(), '');
});

test('legacy alias { rulesUpdateNotice: "off" } is honored', () => {
  const root = project();
  installRule(root);
  const { stdout } = run(root, { config: { rulesUpdateNotice: 'off' } });
  assert.equal(stdout.trim(), '');
});
