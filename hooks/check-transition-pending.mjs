#!/usr/bin/env node
//
// agenticaiplugin: transition-pending notice — SessionStart hook.
//
// The plugin no longer ships copied `.claude/rules/` — behavior now comes from
// plugin-side doctrine (SessionStart) + enforcement (PreToolUse) hooks. This hook
// notifies (once, on change, per project) when a project still carries LEGACY state
// that the one-time transition should clean up:
//   - copied plugin rules:  .claude/rules/agenticaiplugin-*.md
//   - old docs layout:      claudedocs/{guidelines,adrs}
// It NEVER changes anything — the user runs /agenticaiplugin:update-plugin.
//
// Config (${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.config.json):
//   { "transitionNotice": "off" }            -> disable this hook entirely
//   { "transitionNotice": "every-session" }  -> notify every session while pending
//   (default: notify only when the pending state changes — tracked PER PROJECT)
// The former key `rulesUpdateNotice` is still honored as a legacy alias.
//
// Per-project marker: ${CLAUDE_CONFIG_DIR}/agenticaiplugin.transition-notice.<projhash>.state
// Fail-safe: any error injects nothing and exits 0 — this hook must never break a session.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const CONFIG_FILE = join(CONFIG_DIR, 'agenticaiplugin.config.json');
const RULE_FILE = /^agenticaiplugin-.*\.md$/;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function readInput() {
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'));
    return input && typeof input === 'object' ? input : {};
  } catch {
    return {};
  }
}

function legacyRules(root) {
  try {
    return readdirSync(join(root, '.claude', 'rules')).filter((f) => RULE_FILE.test(f)).sort();
  } catch {
    return [];
  }
}

function markerFile(root) {
  const hash = createHash('sha256').update(root).digest('hex').slice(0, 16);
  return join(CONFIG_DIR, `agenticaiplugin.transition-notice.${hash}.state`);
}

function writeMarker(file, state) {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    const tmp = `${file}.tmp.${process.pid}`;
    writeFileSync(tmp, `${JSON.stringify(state)}\n`);
    renameSync(tmp, file);
  } catch {
    // best-effort; worst case the notice repeats next session
  }
}

function buildNotice(rules, migration) {
  const lines = [
    '<!-- agenticaiplugin transition-pending notice -->',
    '**agenticaiplugin — one-time transition available.** Relay this to the user briefly, then continue.',
  ];
  if (rules.length) {
    lines.push(
      `- Legacy copied plugin rules found (${rules.join(', ')}). The plugin now injects this behavior itself — run \`/agenticaiplugin:update-plugin\` to remove them.`
    );
  }
  if (migration) {
    lines.push(
      '- Legacy `claudedocs/guidelines|adrs` structure found — `/agenticaiplugin:update-plugin` migrates it to `.claude/`.'
    );
  }
  lines.push(
    '',
    'Notice only — nothing changes automatically. Disable with `{"transitionNotice":"off"}` in agenticaiplugin.config.json.'
  );
  return lines.join('\n');
}

function main() {
  const config = readJson(CONFIG_FILE);
  const setting = config?.transitionNotice ?? config?.rulesUpdateNotice; // legacy alias
  if (setting === 'off') return;

  const input = readInput();
  const root = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
  const event =
    typeof input.hook_event_name === 'string' && input.hook_event_name
      ? input.hook_event_name
      : 'SessionStart';

  const rules = legacyRules(root);
  const migration =
    existsSync(join(root, 'claudedocs', 'guidelines')) || existsSync(join(root, 'claudedocs', 'adrs'));

  if (rules.length === 0 && !migration) return;

  const marker = markerFile(root);
  const stateKey = JSON.stringify({ rules, migration });
  const last = readJson(marker);
  const stateChanged = JSON.stringify(last?.key ?? null) !== JSON.stringify(stateKey);
  if (stateChanged) writeMarker(marker, { key: stateKey });

  const everySession = setting === 'every-session';
  if (!everySession && !stateChanged) return;

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: event, additionalContext: buildNotice(rules, migration) },
    })}\n`
  );
}

try {
  main();
} catch {
  // fail-safe: never break the session
}
