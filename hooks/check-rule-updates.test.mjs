// Tests for check-rule-updates.mjs — Node stdlib only, run with: node --test
//
// Black-box through the SessionStart hook contract: spawn the real hook with a JSON
// stdin ({cwd, hook_event_name}) and an isolated CLAUDE_CONFIG_DIR, then inspect the
// emitted additionalContext. The hook compares the temp project's .claude/rules/
// against the plugin's real rules-templates/ (via computeActions).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK = join(HERE, 'check-rule-updates.mjs');
const TEMPLATES = join(HERE, '..', 'rules-templates');

const tempProj = () => mkdtempSync(join(tmpdir(), 'cru-proj-'));
const tempCfg = () => mkdtempSync(join(tmpdir(), 'cru-cfg-'));

function run(cwd, configDir, extraInput = {}) {
  const r = spawnSync(process.execPath, [HOOK], {
    encoding: 'utf8',
    input: JSON.stringify({ hook_event_name: 'SessionStart', cwd, ...extraInput }),
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
  return { status: r.status, stdout: r.stdout };
}

function installCurrentRules(proj) {
  const dst = join(proj, '.claude', 'rules');
  mkdirSync(dst, { recursive: true });
  for (const f of readdirSync(TEMPLATES)) copyFileSync(join(TEMPLATES, f), join(dst, f));
}

function outdate(proj, name = 'agenticaiplugin-core') {
  writeFileSync(
    join(proj, '.claude', 'rules', `${name}.md`),
    '<!--\n  AgenticAI Plugin Rule v0.9\n  Plugin-Version: 0.7.0\n-->\n'
  );
}

function notice(stdout) {
  if (!stdout.trim()) return null;
  return JSON.parse(stdout).hookSpecificOutput.additionalContext;
}

test('silent when no plugin rules installed and no claudedocs', () => {
  const { status, stdout } = run(tempProj(), tempCfg());
  assert.equal(status, 0);
  assert.equal(stdout.trim(), '');
});

test('silent when installed rules are current', () => {
  const proj = tempProj();
  installCurrentRules(proj);
  assert.equal(run(proj, tempCfg()).stdout.trim(), '');
});

test('notifies when an installed rule is outdated', () => {
  const proj = tempProj();
  installCurrentRules(proj);
  outdate(proj);
  const n = notice(run(proj, tempCfg()).stdout);
  assert.ok(n && /update-plugin/.test(n), 'notice points to update-plugin');
});

test('notifies when a legacy claudedocs structure is present', () => {
  const proj = tempProj();
  installCurrentRules(proj);
  mkdirSync(join(proj, 'claudedocs', 'guidelines'), { recursive: true });
  const n = notice(run(proj, tempCfg()).stdout);
  assert.ok(n && /claudedocs/.test(n), 'notice mentions the migration');
});

test('on-change de-dup: a second identical session is silent', () => {
  const proj = tempProj();
  const cfg = tempCfg();
  installCurrentRules(proj);
  outdate(proj);
  assert.ok(notice(run(proj, cfg).stdout), 'first run notifies');
  assert.equal(run(proj, cfg).stdout.trim(), '', 'second identical run is silent');
});

test('disabled via config { rulesUpdateNotice: "off" }', () => {
  const proj = tempProj();
  const cfg = tempCfg();
  installCurrentRules(proj);
  outdate(proj);
  writeFileSync(join(cfg, 'agenticaiplugin.config.json'), JSON.stringify({ rulesUpdateNotice: 'off' }));
  assert.equal(run(proj, cfg).stdout.trim(), '');
});
