// Guards the Hook Runtime Policy (docs/plugin-howto.md, issues #23/#24):
// plugin hooks must be Node .mjs scripts in exec form — shell-form or shell-script
// hooks regress the Windows breakage this policy exists to prevent.
// Run with: node --test

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const hooksDir = dirname(fileURLToPath(import.meta.url));

test('every registered hook is exec-form node targeting a .mjs script', () => {
  const cfg = JSON.parse(readFileSync(join(hooksDir, 'hooks.json'), 'utf8'));
  const events = Object.entries(cfg.hooks);
  assert.ok(events.length > 0, 'hooks.json must register at least one event');

  for (const [event, matchers] of events) {
    for (const matcher of matchers) {
      for (const hook of matcher.hooks) {
        assert.equal(hook.type, 'command', `${event}: hook type must be "command"`);
        assert.equal(hook.command, 'node', `${event}: command must be "node" (exec form, no shell)`);
        assert.ok(
          Array.isArray(hook.args) && hook.args.length > 0,
          `${event}: args array required — shell form is forbidden`
        );
        assert.match(
          hook.args[0],
          /^\$\{CLAUDE_PLUGIN_ROOT\}\/.+\.mjs$/,
          `${event}: first arg must be a plugin-rooted .mjs script`
        );
      }
    }
  }
});

test('no shell scripts live under hooks/ (recursively)', () => {
  // Recursive so subdirectories like hooks/autoskill/ are covered — a stray
  // .sh/.ps1 dropped anywhere under hooks/ must fail the Hook Runtime Policy.
  const shellFiles = readdirSync(hooksDir, { recursive: true }).filter(
    (f) => f.endsWith('.sh') || f.endsWith('.ps1') || f.endsWith('.bat') || f.endsWith('.cmd')
  );
  assert.deepEqual(shellFiles, [], 'shell scripts under hooks/ violate the Hook Runtime Policy');
});
