// Tests for sync-rules.mjs — Node stdlib only, run with: node --test
//
// Black-box through the CLI contract (spawn the real script against temp
// project/plugin roots, parse the JSON report), matching the repo convention
// (persona.test.mjs, check-prereqs.test.mjs). Exercises the four classifications,
// the pure-removal apply path, and the pre-apply Plugin-Version field that the
// update "What's New" step depends on.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'sync-rules.mjs');

function ruleContent(ruleV, pluginV) {
  const pv = pluginV ? `\n  Plugin-Version: ${pluginV}` : '';
  return `---\n# No paths\n---\n\n<!--\n  AgenticAI Plugin Rule v${ruleV}${pv}\n-->\n\n# Rule body\n`;
}

// templates/installed: { name: [ruleVersion, pluginVersion|null] }
function setup(templates, installed) {
  const plugin = mkdtempSync(join(tmpdir(), 'sr-plugin-'));
  const proj = mkdtempSync(join(tmpdir(), 'sr-proj-'));
  const tdir = join(plugin, 'rules-templates');
  const idir = join(proj, '.claude', 'rules');
  mkdirSync(tdir, { recursive: true });
  mkdirSync(idir, { recursive: true });
  for (const [name, [rv, pv]] of Object.entries(templates)) {
    writeFileSync(join(tdir, `agenticaiplugin-${name}.md`), ruleContent(rv, pv));
  }
  for (const [name, [rv, pv]] of Object.entries(installed)) {
    writeFileSync(join(idir, `agenticaiplugin-${name}.md`), ruleContent(rv, pv));
  }
  return { plugin, proj, idir };
}

function run(proj, plugin, mode) {
  const r = spawnSync(process.execPath, [SCRIPT, proj, plugin, mode], { encoding: 'utf8' });
  return { status: r.status, report: JSON.parse(r.stdout) };
}

const actionFor = (report, id) => report.actions.find((a) => a.id === `agenticaiplugin-${id}`);
const installed = (idir, name) => join(idir, `agenticaiplugin-${name}.md`);

test('classifies create / update / delete / up-to-date', () => {
  const { plugin, proj } = setup(
    { core: ['1.0', '0.8.0'], 'code-review': ['1.2', '0.19.1'], 'new-rule': ['1.0', '0.25.0'] },
    { core: ['1.0', '0.8.0'], 'code-review': ['1.0', '0.9.0'], 'old-rule': ['1.0', '0.7.0'] }
  );
  const { report } = run(proj, plugin, '--dry-run');
  assert.equal(actionFor(report, 'core').action, 'up-to-date');
  assert.equal(actionFor(report, 'code-review').action, 'update');
  assert.equal(actionFor(report, 'new-rule').action, 'create');
  assert.equal(actionFor(report, 'old-rule').action, 'delete');
});

test('report carries the pre-apply Plugin-Version of installed rules', () => {
  const { plugin, proj } = setup(
    { 'code-review': ['1.2', '0.19.1'] },
    { 'code-review': ['1.0', '0.9.0'] }
  );
  const { report } = run(proj, plugin, '--dry-run');
  assert.equal(actionFor(report, 'code-review').installedPluginVersion, '0.9.0');
});

test('--dry-run does not mutate the filesystem', () => {
  const { plugin, proj, idir } = setup(
    { core: ['1.0', '0.8.0'] },
    { core: ['1.0', '0.8.0'], 'protected-dirs': ['1.1', '0.8.6'] }
  );
  run(proj, plugin, '--dry-run');
  assert.ok(existsSync(installed(idir, 'protected-dirs')), 'dry-run must not delete');
});

test('--apply deletes a rule with no template (pure removal case)', () => {
  const { plugin, proj, idir } = setup(
    { core: ['1.0', '0.8.0'] },
    { core: ['1.0', '0.8.0'], 'protected-dirs': ['1.1', '0.8.6'] }
  );
  assert.ok(existsSync(installed(idir, 'protected-dirs')));
  const { report } = run(proj, plugin, '--apply');
  assert.equal(actionFor(report, 'protected-dirs').action, 'delete');
  assert.equal(existsSync(installed(idir, 'protected-dirs')), false, 'deprecated rule removed');
  assert.ok(existsSync(installed(idir, 'core')), 'up-to-date rule untouched');
});

test('--apply creates missing and updates outdated rules from template content', () => {
  const { plugin, proj, idir } = setup(
    { core: ['1.0', '0.8.0'], 'new-rule': ['1.0', '0.25.0'] },
    { core: ['0.9', '0.7.0'] }
  );
  run(proj, plugin, '--apply');
  assert.ok(existsSync(installed(idir, 'new-rule')), 'created');
  assert.match(readFileSync(installed(idir, 'core'), 'utf8'), /Rule v1\.0/, 'updated to template version');
});
