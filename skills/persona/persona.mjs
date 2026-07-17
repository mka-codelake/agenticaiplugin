#!/usr/bin/env node
//
// agenticaiplugin: persona — state management CLI + SessionStart hook
//
// Single source of truth for the persona state file AND the hook injection.
// The /agenticaiplugin:persona skill calls the CLI subcommands (it does NOT
// inline the write) so the state change is a real, verified action instead of
// a prompt code-block the model might skip. The plugin's SessionStart hook
// calls the `inject` subcommand (exec form: `node <this file> inject`).
//
// Subcommands:
//   show        -> prints "OK persona=<value>"  (value is "off" when unset)
//   set <name>  -> validates, writes atomically, reads back, prints "OK persona=<name>"
//   off|reset   -> removes the state file,       prints "OK persona=off"
//   inject      -> hook mode: reads hook JSON from stdin, emits hookSpecificOutput
//                  with the active persona's style snippet; silent no-op when no
//                  persona is set ("off" = opt-in gate) or the snippet is unknown.
//
// CLI output contract: exactly one line "OK persona=<value>" on success (the
// skill echoes this back), or "ERROR <reason>" on stderr + non-zero exit.
//
// Portability: Node only — no bash, no jq (issues #23/#24: bash is not reliably
// selectable for hooks on Windows, and jq is absent on most Windows installs).
// State path uses only $CLAUDE_CONFIG_DIR / the home directory. The style
// snippets are resolved relative to THIS file (import.meta.url), NOT
// $CLAUDE_PLUGIN_ROOT — that variable is empty in the normal tool context.
// The allowed persona values here are the authority; they must match the
// style snippets in styles/.

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATE_FILE = join(
  process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'),
  'persona.state'
);
const VALID = ['writer', 'engineer', 'telegrapher', 'caveman'];

function die(reason) {
  process.stderr.write(`ERROR ${reason}\n`);
  process.exit(1);
}

function attempt(fn, reason) {
  try {
    return fn();
  } catch {
    die(reason);
  }
}

function readState() {
  try {
    return readFileSync(STATE_FILE, 'utf8').replace(/\s/g, '');
  } catch {
    return '';
  }
}

function show() {
  process.stdout.write(`OK persona=${readState() || 'off'}\n`);
}

function off() {
  attempt(() => rmSync(STATE_FILE, { force: true }), 'cannot remove state file');
  process.stdout.write('OK persona=off\n');
}

function set(persona) {
  if (!persona) die(`missing persona (expected: ${VALID.join(' ')})`);
  if (!VALID.includes(persona)) {
    die(`invalid persona: '${persona}' (expected: ${VALID.join(' ')})`);
  }

  attempt(() => mkdirSync(dirname(STATE_FILE), { recursive: true }), 'cannot create config dir');

  // atomic write: tmp file + rename, then read-back verification
  const tmp = `${STATE_FILE}.tmp.${process.pid}`;
  attempt(() => writeFileSync(tmp, `${persona}\n`), 'cannot write state file');
  try {
    renameSync(tmp, STATE_FILE);
  } catch {
    try { rmSync(tmp, { force: true }); } catch { /* best effort */ }
    die('cannot move state file into place');
  }

  const readBack = readState();
  if (readBack !== persona) {
    die(`write verification failed (state holds '${readBack}')`);
  }
  process.stdout.write(`OK persona=${readBack}\n`);
}

// SessionStart hook mode. Fail-safe by design: any unexpected state injects
// NOTHING rather than breaking the session — with no persona set the plugin
// must behave exactly as if it were not installed (opt-in gate).
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

  const persona = readState();
  if (!persona || persona === 'off') return;
  // Whitelist also on the READ path: a tampered state file (readState strips
  // only whitespace, so "../x" would survive) must not steer the snippet path
  // outside styles/.
  if (!VALID.includes(persona)) return;

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  let snippet;
  try {
    snippet = readFileSync(join(scriptDir, 'styles', `${persona}.md`), 'utf8');
  } catch {
    return; // unknown/unreadable persona value -> inject nothing
  }

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: event, additionalContext: snippet },
    })}\n`
  );
}

const [cmd, arg] = process.argv.slice(2);
switch (cmd) {
  case 'show':
    show();
    break;
  case 'off':
  case 'reset':
    off();
    break;
  case 'set':
    set(arg);
    break;
  case 'inject':
    inject();
    break;
  case undefined:
  case '':
  case '-h':
  case '--help':
  case 'help':
    process.stderr.write('usage: persona.mjs <show|set <persona>|off|inject>\n');
    process.stderr.write(`personas: ${VALID.join(' ')}\n`);
    process.exit(2);
    break;
  default:
    die(`unknown subcommand: '${cmd}' (expected: show|set|off|inject)`);
}
