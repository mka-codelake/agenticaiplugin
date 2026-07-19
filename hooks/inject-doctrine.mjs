#!/usr/bin/env node
//
// agenticaiplugin: doctrine injection — SessionStart hook.
//
// Injects the plugin's always-on behavioral doctrine (hooks/doctrine/*.md) as
// additionalContext. This replaces the copied `.claude/rules/` files: the
// doctrine lives once in the plugin and is injected every session, so there is
// nothing per-project to copy or keep in sync.
//
// Fires on EVERY SessionStart source (startup/resume/clear/compact) and NEVER
// gates on `source` — so the doctrine is re-injected after each compaction
// (SessionStart fires with source:"compact" and its additionalContext lands in
// the freshly-compacted context). Multiple SessionStart hooks' additionalContext
// are concatenated by Claude Code.
//
// Config (${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.config.json):
//   { "doctrine": { "core": "off", "codeReview": "off" } }
// A block is injected unless its key === "off" (absent/other value = on). If all
// blocks are off, nothing is emitted.
//
// Fail-safe: unreadable config/doctrine or any crash injects NOTHING and exits 0.

import { readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const CONFIG_FILE = join(CONFIG_DIR, 'agenticaiplugin.config.json');
const DOCTRINE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'doctrine');

const BLOCKS = [
  { key: 'core', file: 'core.md' },
  { key: 'codeReview', file: 'code-review.md' },
];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function readDoctrine(file) {
  try {
    return readFileSync(join(DOCTRINE_DIR, file), 'utf8').trim();
  } catch {
    return null;
  }
}

// Compose the enabled doctrine blocks. Returns null when nothing is enabled or
// readable (caller then injects nothing).
export function buildContext(config) {
  const parts = [];
  for (const block of BLOCKS) {
    if (config?.doctrine?.[block.key] === 'off') continue;
    const body = readDoctrine(block.file);
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
