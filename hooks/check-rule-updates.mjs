#!/usr/bin/env node
//
// agenticaiplugin: rule-update notice — SessionStart hook.
//
// Notifies (once, on change, per project) when a project's installed .claude/rules/
// are out of date relative to the plugin's rule templates (outdated, missing, or
// deprecated), or when a legacy claudedocs/{guidelines,adrs} structure is present and
// can be migrated. It NEVER changes anything — the user runs /agenticaiplugin:update-plugin.
//
// Config (${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.config.json):
//   { "rulesUpdateNotice": "off" }            -> disable this hook entirely
//   { "rulesUpdateNotice": "every-session" }  -> notify every session while pending
//   (default: notify only when the pending state changes — tracked PER PROJECT)
//
// Per-project marker: ${CLAUDE_CONFIG_DIR}/agenticaiplugin.rules-notice.<projhash>.state
// (a global marker would thrash when switching between projects).
//
// Reuses computeActions() from the sync-rules script so the "what's outdated" logic is
// identical to what /update-plugin applies. Fail-safe: any error injects nothing and
// exits 0 — this hook must never break a session. Bootstrap: if Node is missing the
// hook can't run at all; that case is covered by the init/update-time prerequisite check.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeActions } from '../agents/project-initializer/scripts/sync-rules.mjs';

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const CONFIG_FILE = join(CONFIG_DIR, 'agenticaiplugin.config.json');
const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

function markerFile(root) {
  const hash = createHash('sha256').update(root).digest('hex').slice(0, 16);
  return join(CONFIG_DIR, `agenticaiplugin.rules-notice.${hash}.state`);
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

function buildNotice(changed, missing, migration) {
  const lines = [
    '<!-- agenticaiplugin rule-update notice -->',
    '**agenticaiplugin — update available.** Relay this to the user briefly, then continue.',
  ];
  if (changed.length) {
    lines.push(
      `- Installed rules are out of date (${changed.join(', ')}). Run \`/agenticaiplugin:update-plugin\`.`
    );
  }
  if (missing.length) {
    lines.push(
      `- New rules available to install (${missing.join(', ')}). Run \`/agenticaiplugin:update-plugin\`.`
    );
  }
  if (migration) {
    lines.push(
      '- Legacy `claudedocs/guidelines|adrs` structure found — `/agenticaiplugin:update-plugin` migrates it to `.claude/`.'
    );
  }
  lines.push(
    '',
    'Notice only — nothing changes automatically. Disable with `{"rulesUpdateNotice":"off"}` in agenticaiplugin.config.json.'
  );
  return lines.join('\n');
}

function main() {
  const config = readJson(CONFIG_FILE);
  if (config?.rulesUpdateNotice === 'off') return;

  const input = readInput();
  const root = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
  const event =
    typeof input.hook_event_name === 'string' && input.hook_event_name
      ? input.hook_event_name
      : 'SessionStart';

  // (a) rule state — only for projects that actually have the plugin installed.
  // Split "missing" (a template not yet installed) from "changed" (installed but
  // outdated/deprecated) so the wording stays accurate for a partial install.
  let missing = [];
  let changed = [];
  try {
    const { actions } = computeActions(root, PLUGIN_ROOT);
    const installedCount = actions.filter((a) => a.action !== 'create').length;
    if (installedCount > 0) {
      missing = actions.filter((a) => a.action === 'create').map((a) => a.id);
      changed = actions
        .filter((a) => a.action === 'update' || a.action === 'delete')
        .map((a) => `${a.id}:${a.action}`);
    }
  } catch {
    // sync logic unavailable -> no rule notice
  }

  // (b) legacy claudedocs structure present in this project
  const migration =
    existsSync(join(root, 'claudedocs', 'guidelines')) || existsSync(join(root, 'claudedocs', 'adrs'));

  if (missing.length === 0 && changed.length === 0 && !migration) return;

  // per-project on-change de-dup
  const marker = markerFile(root);
  const stateKey = JSON.stringify({
    changed: [...changed].sort(),
    missing: [...missing].sort(),
    migration,
  });
  const last = readJson(marker);
  const stateChanged = JSON.stringify(last?.key ?? null) !== JSON.stringify(stateKey);
  if (stateChanged) writeMarker(marker, { key: stateKey });

  const everySession = config?.rulesUpdateNotice === 'every-session';
  if (!everySession && !stateChanged) return;

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: buildNotice(changed, missing, migration),
      },
    })}\n`
  );
}

try {
  main();
} catch {
  // fail-safe: never break the session
}
