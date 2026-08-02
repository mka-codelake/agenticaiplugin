// Guards the Hook Runtime Policy (docs/plugin-howto.md, issues #23/#24):
// plugin hooks must be Node .mjs scripts in exec form — shell-form or shell-script
// hooks regress the Windows breakage this policy exists to prevent.
// Run with: node --test

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const hooksDir = dirname(fileURLToPath(import.meta.url));
const pluginRoot = dirname(hooksDir);

/** Resolve a `${CLAUDE_PLUGIN_ROOT}/…` hook arg against this checkout. */
function resolveHookScript(arg) {
  return join(pluginRoot, arg.replace('${CLAUDE_PLUGIN_ROOT}/', ''));
}

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
        // The pattern check above only proves the path *looks* right. A typo
        // passes it and the hook then fails silently at runtime — a guard that
        // suggests a safeguard it does not deliver. So resolve the path against
        // this checkout and require the script to actually be there.
        const script = resolveHookScript(hook.args[0]);
        assert.ok(existsSync(script), `${event}: hook script does not exist: ${hook.args[0]}`);
      }
    }
  }
});

// Nothing stops a SessionStart entry from being dropped: deleting one leaves a
// green suite, and the missing injection is invisible until someone notices the
// behavior is gone. Pin the roster — adding a startup hook is a deliberate act
// and must be reflected here.
test('SessionStart registers exactly the five expected startup scripts', () => {
  const cfg = JSON.parse(readFileSync(join(hooksDir, 'hooks.json'), 'utf8'));
  const registered = (cfg.hooks.SessionStart ?? [])
    .flatMap((matcher) => matcher.hooks)
    .map((hook) => basename(hook.args[0]));

  assert.deepEqual(
    registered.sort(),
    [
      'check-prereqs.mjs',
      'check-transition-pending.mjs',
      'inject-doctrine.mjs',
      'mode.mjs',
      'persona.mjs',
    ],
    'a SessionStart hook was added or removed — confirm the change and update this list'
  );
});

test('no shell scripts live under hooks/ (recursively)', () => {
  // Recursive so subdirectories like hooks/autoskill/ are covered — a stray
  // .sh/.ps1 dropped anywhere under hooks/ must fail the Hook Runtime Policy.
  const shellFiles = readdirSync(hooksDir, { recursive: true }).filter(
    (f) => f.endsWith('.sh') || f.endsWith('.ps1') || f.endsWith('.bat') || f.endsWith('.cmd')
  );
  assert.deepEqual(shellFiles, [], 'shell scripts under hooks/ violate the Hook Runtime Policy');
});
