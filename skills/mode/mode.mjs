#!/usr/bin/env node
//
// agenticaiplugin: agent mode — SessionStart hook injection
//
// The plugin has exactly ONE working mode, `orchestrator`, and it is always
// active: no state file, no subcommand that switches it, no config gate. The
// reason is the context itself — an injected block is append-only, so switching
// a mode mid-session leaves the previous text standing in the window next to the
// new one, and the session then holds two descriptions of who executes the work.
// A mode that cannot be switched cannot land in that state. 0.31.4 removed
// `task` and `meta-orchestrator`; their wording is preserved in issue #117.
//
// The composition table below stays a TABLE on purpose, and the snippets stay
// separate files: putting a second mode back has to be a data change (one more
// entry plus its file), not a rebuild of this script.
//
// This directory deliberately has NO SKILL.md — the only one under skills/ without
// one. With the command gone there is nothing for a user to invoke, and a
// description-only skill would still occupy context in every session. Auto-discovery
// keys on SKILL.md files, so a directory without one is simply not a skill; the hook
// reaches this script by path. Restoring the command means restoring that file.
//
// Subcommands:
//   inject  -> hook mode: reads the hook JSON from stdin and emits
//              hookSpecificOutput with the orchestrator snippet. Fail-safe: any
//              unexpected state injects NOTHING rather than breaking the session.
//
// Injection ORDER is not a priority mechanism: SessionStart additionalContext
// blocks do not necessarily appear in hooks.json order (measured). A mode text
// that must outrank other instructions has to say so IN THE TEXT.
//
// Portability: Node only — no bash, no jq (issues #23/#24: bash is not reliably
// selectable for hooks on Windows, and jq is absent on most Windows installs).
// The mode snippets are resolved relative to THIS file (import.meta.url), NOT
// $CLAUDE_PLUGIN_ROOT — that variable is empty in the normal tool context.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODE = 'orchestrator';

// Snippet composition per mode. The rules a delegating mode carries live once in
// shared-delegation.md, which holds NO mode declaration and NO precedence
// sentence: the mode's own file supplies the head, so exactly one "Active agent
// mode" line and exactly one "ranks ABOVE" statement reach the session.
const PARTS = {
  orchestrator: ['orchestrator.md', 'shared-delegation.md'],
};

// Whitelist on the READ path: nothing but these names may be joined onto modes/.
// Deliberately NOT derived from PARTS — a whitelist computed from the very table
// it is meant to guard would assert nothing. It is the second pair of eyes on
// every path that reaches readFileSync, and it is what keeps this path safe if
// the table ever becomes data again.
const ALLOWED_FILES = new Set(['orchestrator.md', 'shared-delegation.md']);

function die(reason) {
  process.stderr.write(`ERROR ${reason}\n`);
  process.exit(1);
}

// SessionStart hook mode.
function inject() {
  let event = 'SessionStart';
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'));
    if (input && typeof input.hook_event_name === 'string' && input.hook_event_name) {
      event = input.hook_event_name;
    }
  } catch {
    // no/invalid stdin -> keep default event
  }

  const files = PARTS[MODE];
  if (!files || !files.every((file) => ALLOWED_FILES.has(file))) return;

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  let snippet;
  try {
    snippet = `${files
      .map((file) => readFileSync(join(scriptDir, 'modes', file), 'utf8').trimEnd())
      .join('\n\n')}\n`;
  } catch {
    return; // unreadable snippet -> inject nothing rather than break the session
  }

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: event, additionalContext: snippet },
    })}\n`
  );
}

const [cmd] = process.argv.slice(2);
switch (cmd) {
  case 'inject':
    inject();
    break;
  case undefined:
  case '':
  case '-h':
  case '--help':
  case 'help':
    process.stderr.write('usage: mode.mjs inject\n');
    process.stderr.write(`mode: ${MODE} (always active, not switchable)\n`);
    process.exit(2);
    break;
  default:
    die(`unknown subcommand: '${cmd}' (expected: inject)`);
}
