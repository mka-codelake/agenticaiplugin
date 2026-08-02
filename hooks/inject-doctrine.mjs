#!/usr/bin/env node
//
// agenticaiplugin: doctrine injection — SessionStart hook.
//
// Injects the plugin's always-on behavioral doctrine (doctrine/**/*.md) as
// additionalContext. This replaces the copied `.claude/rules/` files: the
// doctrine lives once in the plugin and is injected every session, so there is
// nothing per-project to copy or keep in sync. The texts sit under doctrine/ at
// the repo root, not under hooks/ — they are content, not hook mechanics; this
// script is the only piece of mechanics involved.
//
// Fires on EVERY SessionStart source (startup/resume/clear/compact) and NEVER
// gates on `source` — so the doctrine is re-injected after each compaction
// (SessionStart fires with source:"compact" and its additionalContext lands in
// the freshly-compacted context). Multiple SessionStart hooks' additionalContext
// are concatenated by Claude Code.
//
// Injection ORDER is not a priority mechanism: SessionStart additionalContext
// blocks do not necessarily appear in hooks.json order (measured). Text that
// must outrank other instructions has to say so IN THE TEXT.
//
// The CONSTITUTION (base + the active mode) has NO opt-out switch. That was the
// explicit decision of 0.31.4: whoever installs the plugin has this mode and
// cannot change it. The reason is the context itself — an injected block is
// append-only, so switching mid-session leaves the previous text standing in the
// window next to the new one, and the session then holds two descriptions of who
// executes the work. Something that cannot be switched cannot land in that state.
// The former `doctrine.core` switch is gone; a leftover `"core": "off"` in an
// existing config file is simply ignored, never an error.
//
// Config (${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.config.json):
//   { "doctrine": { "codeReview": "off", "prReviewMonitoring": "off" } }
// A THEME block is injected unless its key === "off" (absent/other value = on).
//
// Fail-safe in two directions, and they deliberately point opposite ways:
//   * An unreadable or unexpectedly shaped CONFIG injects EVERYTHING. Only the
//     exact string "off" on the exact key switches a block off, so a typo in
//     agenticaiplugin.config.json cannot silently disable a theme — the one
//     failure mode nobody would notice, because the session looks normal.
//   * Unreadable DOCTRINE files, or any crash, inject NOTHING and exit 0. A
//     broken installation costs the doctrine, never the session. An individual
//     unreadable file drops its own block and leaves the rest standing.
//
// Portability: Node only — no bash, no jq (issues #23/#24: bash is not reliably
// selectable for hooks on Windows, and jq is absent on most Windows installs).
// The doctrine files are resolved relative to THIS file (import.meta.url), NOT
// $CLAUDE_PLUGIN_ROOT — that variable is empty in the normal tool context.

import { readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const CONFIG_FILE = join(CONFIG_DIR, 'agenticaiplugin.config.json');
const DOCTRINE_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), 'doctrine');

const MODE = 'orchestrator';

// Snippet composition per mode. This stays a TABLE on purpose, and the snippets
// stay separate files: putting a second mode back has to be a data change (one
// more entry plus its file), not a rebuild of this script. The rules a delegating
// mode carries live once in shared-delegation.md, which holds NO mode declaration
// and NO precedence sentence: the mode's own file supplies the head, so exactly
// one "Active agent mode" line and exactly one "ranks ABOVE" statement reach the
// session. 0.31.4 removed `task` and `meta-orchestrator`; their wording is
// preserved in issue #117.
const MODE_PARTS = {
  orchestrator: ['constitution/orchestrator.md', 'constitution/shared-delegation.md'],
};

// Order is fixed here: constitution first (base, then the active mode), themes
// after. Themes are the only switchable part.
const CONSTITUTION = ['constitution/base.md', ...(MODE_PARTS[MODE] ?? [])];
const THEMES = [
  { key: 'codeReview', file: 'themes/code-review.md' },
  { key: 'prReviewMonitoring', file: 'themes/pr-review-monitoring.md' },
];

// Whitelist on the READ path: nothing but these names may be joined onto
// doctrine/. Deliberately NOT derived from the lists above — a whitelist computed
// from the very tables it is meant to guard would assert nothing. It is the
// second pair of eyes on every path that reaches readFileSync, and it is what
// keeps this path safe if a table ever becomes data again.
const ALLOWED_FILES = new Set([
  'constitution/base.md',
  'constitution/orchestrator.md',
  'constitution/shared-delegation.md',
  'themes/code-review.md',
  'themes/pr-review-monitoring.md',
]);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function readDoctrine(file) {
  if (!ALLOWED_FILES.has(file)) return null;
  try {
    return readFileSync(join(DOCTRINE_DIR, file), 'utf8').trim();
  } catch {
    return null;
  }
}

// Compose the constitution plus the enabled themes. Returns null when nothing is
// enabled or readable (caller then injects nothing).
export function buildContext(config) {
  const files = [
    ...CONSTITUTION,
    ...THEMES.filter((theme) => config?.doctrine?.[theme.key] !== 'off').map((theme) => theme.file),
  ];

  const parts = [];
  for (const file of files) {
    const body = readDoctrine(file);
    if (body) parts.push(body);
  }
  if (parts.length === 0) return null;
  return [
    '<!-- agenticaiplugin doctrine -->',
    '**AgenticAI plugin doctrine (always-on).** Apply throughout this session.',
    '',
    parts.join('\n\n'),
  ].join('\n');
}

function main() {
  let event = 'SessionStart';
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'));
    if (input && typeof input.hook_event_name === 'string' && input.hook_event_name) {
      event = input.hook_event_name;
    }
  } catch {
    // no/invalid stdin -> keep default event; never gate on source
  }

  const context = buildContext(readJson(CONFIG_FILE));
  if (!context) return;

  process.stdout.write(
    `${JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } })}\n`
  );
}

// Only run as a hook when invoked directly — importing the module (the test suite
// does, for buildContext) must NOT read stdin or emit. Compare via realpath: the
// plugin loads through a symlinked marketplace path, so argv[1] (symlink) and
// import.meta.url (realpath) differ — a raw string compare leaves the hook inert.
if (invokedDirectly()) {
  try {
    main();
  } catch {
    // fail-safe: never break the session
  }
}

function invokedDirectly() {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
