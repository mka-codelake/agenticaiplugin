// Tests for mode.mjs (issues #77, #117) — Node stdlib only, run with:
//   node --test
//
// Black-box through the public CLI contract (no internals imported): every case
// spawns `node mode.mjs <subcommand>`, matching how the SessionStart hook invokes
// it. Since 0.31.4 there is exactly one mode and it is always active, so the
// central property under test is no longer "the right mode is injected" but
// "something is injected, unconditionally".

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(SKILL_DIR, 'mode.mjs');
const MODES_DIR = join(SKILL_DIR, 'modes');

function freshConfigDir() {
  return mkdtempSync(join(tmpdir(), 'mode-test-'));
}

function run(args, { configDir = freshConfigDir(), input = '', script = SCRIPT } = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    input,
    env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
  });
}

function injectedText(options = {}) {
  const r = run(['inject'], { input: '{}', ...options });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
}

test('inject emits the hookSpecificOutput contract with the orchestrator text', () => {
  const r = run(['inject'], { input: '{"hook_event_name":"SessionStart","source":"startup"}' });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(out.hookSpecificOutput.additionalContext, /Active agent mode: `orchestrator`/);
});

test('inject composes the mode head with the shared delegation rules', () => {
  const text = injectedText();

  assert.match(text, /hints, not proof/, 'shared delegation rules must be present');
  assert.match(text, /Economy limit/);
  assert.match(text, /green CI run/);
  assert.match(text, /Delegation hygiene/);

  // Exactly one mode declaration and one precedence statement — the composed
  // snippet must not claim two active modes or rank itself twice.
  assert.equal(text.match(/Active agent mode:/g).length, 1);
  assert.equal(text.match(/ranks ABOVE/g).length, 1);
});

// 0.31.0 shipped "No sub-agent touches git operations", which forbade what the
// core doctrine prescribes (sub-agents commit via agenticaiplugin:git-smart-commit).
// No test caught it. Guard the class, not just the one wording.
test('the mode text points sub-agents at the sanctioned commit path', () => {
  const text = injectedText();
  assert.match(text, /git-smart-commit/, 'the mode text must name the sanctioned commit path');
  assert.doesNotMatch(
    text,
    /no sub-agent touches git/i,
    'an absolute git ban contradicts the doctrine — name what stays with the orchestrator instead',
  );
});

// The point of 0.31.4: the mode is not a setting. Anything that used to switch
// it off — the removed state file, the removed config gate — must now be inert.
test('injection cannot be switched off by a leftover state file or config gate', () => {
  for (const leftovers of [
    { 'mode.state': 'off\n' },
    { 'mode.state': 'task\n' },
    { 'agenticaiplugin.config.json': JSON.stringify({ agentMode: 'off' }) },
  ]) {
    const dir = freshConfigDir();
    for (const [name, content] of Object.entries(leftovers)) {
      writeFileSync(join(dir, name), content);
    }
    assert.match(
      injectedText({ configDir: dir }),
      /Active agent mode: `orchestrator`/,
      `${Object.keys(leftovers)[0]} must not gate the injection`,
    );
  }
});

test('inject passes an alternate hook_event_name through', () => {
  const r = run(['inject'], { input: '{"hook_event_name":"Resume"}' });
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'Resume');
});

test('inject defaults the event when stdin is empty or invalid JSON', () => {
  for (const input of ['', 'not-json']) {
    const r = run(['inject'], { input });
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'SessionStart');
  }
});

// Fail-safe: a broken installation must cost the session nothing but the mode
// text — never an error at session start.
test('inject is a silent no-op when the snippets are unreadable', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mode-broken-'));
  const script = join(dir, 'mode.mjs');
  cpSync(SCRIPT, script); // copied WITHOUT modes/ next to it
  const r = run(['inject'], { input: '{}', script });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

// The whitelist has no black-box surface left (nothing outside the script feeds
// the path any more), so it is checked at the source. That is the point: it must
// stay in place for the day the table becomes data again.
test('the read path keeps a filename whitelist that admits nothing but the two snippets', () => {
  const source = readFileSync(SCRIPT, 'utf8');

  const declaration = source.match(/const ALLOWED_FILES = new Set\(\[([^\]]*)\]\)/);
  assert.ok(declaration, 'ALLOWED_FILES must exist — it guards every path reaching readFileSync');
  const allowed = [...declaration[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

  assert.deepEqual(allowed.sort(), ['orchestrator.md', 'shared-delegation.md']);
  for (const file of allowed) {
    assert.doesNotMatch(file, /[\\/]|\.\./, 'a whitelisted name must be a bare file name');
    assert.ok(existsSync(join(MODES_DIR, file)), `${file} is whitelisted but missing from modes/`);
  }
  assert.match(source, /ALLOWED_FILES\.has\(/, 'the whitelist must be consulted on the read path');
});

test('modes/ holds exactly the files the composition table names', () => {
  const source = readFileSync(SCRIPT, 'utf8');
  const table = source.match(/const PARTS = \{([\s\S]*?)\n\};/);
  assert.ok(table, 'PARTS must stay a table — re-adding a mode is a data change, not a rewrite');
  assert.equal(
    (table[1].match(/\[/g) ?? []).length,
    1,
    'exactly one mode is expected; a second entry needs its own tests',
  );

  assert.deepEqual(
    readdirSync(MODES_DIR).sort(),
    ['orchestrator.md', 'shared-delegation.md'],
    'a leftover snippet of a removed mode ships dead weight into every installation',
  );
});

test('usage exits 2, unknown subcommand exits 1', () => {
  for (const args of [[], ['--help'], ['-h']]) {
    const usage = run(args);
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /^usage:/);
  }

  const unknown = run(['set']);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /^ERROR unknown subcommand/);
});
