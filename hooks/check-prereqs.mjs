#!/usr/bin/env node
//
// agenticaiplugin: prerequisite check — SessionStart hook (issue #25)
//
// Reads the central registry (<plugin>/prerequisites.json), probes every
// declared prerequisite, and injects a short additionalContext notice when
// any are unmet — naming the prerequisite, the affected features, and a
// platform-specific install hint. No bare errors, no stack traces.
//
// Notice frequency (user config ${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.config.json):
//   { "prereqNotice": "on-change" }      -> default: notify only when the set of
//                                           unmet prerequisites differs from the
//                                           last reported state (marker file)
//   { "prereqNotice": "every-session" }  -> notify on every session start while
//                                           anything is unmet
//
// Marker file: ${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.prereqs.state
//
// Fail-safe by design: unreadable registry/config/marker, unknown check types,
// or probe crashes inject NOTHING and exit 0 — this hook must never break a
// session. Bootstrap limitation (documented in docs/plugin-howto.md): if the
// missing prerequisite is Node itself, this script cannot run; that case is
// covered by the project-initializer's init/update-time check and the README.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROBE_TIMEOUT_MS = 3000;
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const CONFIG_FILE = join(CONFIG_DIR, 'agenticaiplugin.config.json');
const MARKER_FILE = join(CONFIG_DIR, 'agenticaiplugin.prereqs.state');
const REGISTRY_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'prerequisites.json');

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// Probe one prerequisite. Unknown check types count as met (fail-safe: a newer
// registry must not produce false alarms with an older checker).
function probe(check) {
  if (!check || check.type !== 'binary') return { ok: true };
  let result;
  try {
    result = spawnSync(check.name, [check.versionArg || '--version'], {
      encoding: 'utf8',
      timeout: PROBE_TIMEOUT_MS,
      windowsHide: true,
      // On Windows, npm-installed CLIs (e.g. `claude`) are `.cmd` shims that a
      // direct (non-shell) spawn cannot resolve — it would report a present
      // tool as missing. `check.name`/`versionArg` come from the plugin's own
      // registry (never user input), so the shell carries no injection surface.
      shell: process.platform === 'win32',
    });
  } catch {
    return { ok: false, reason: 'not found' };
  }
  if (result.error || result.status !== 0) return { ok: false, reason: 'not found' };
  if (check.minMajor) {
    // Some tools print their version to stderr (e.g. `java -version`), so match
    // against both streams. Only the matched token is echoed into the notice —
    // never raw subprocess output (it feeds the model's context).
    const version = /v?(\d+)(\.\d+)*/.exec(`${result.stdout || ''}${result.stderr || ''}`);
    if (version && Number(version[1]) < check.minMajor) {
      return { ok: false, reason: `found ${version[0]}, need major >= ${check.minMajor}` };
    }
  }
  return { ok: true };
}

// Resolve a dotted path (e.g. "autoskill.enabled") against the config object.
function configPath(config, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), config);
}

// An entry with a `requiredWhen` gate is only probed when the referenced config
// value matches — so a prerequisite for an opt-in feature (default off) does not
// nag users who never enabled it. Missing/unreadable config -> gate is NOT
// satisfied (opt-in default), so the entry is skipped.
function gateSatisfied(gate, config) {
  if (!gate || typeof gate.config !== 'string') return true;
  return configPath(config, gate.config) === gate.equals;
}

function writeMarker(unmetIds) {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    const tmp = `${MARKER_FILE}.tmp.${process.pid}`;
    writeFileSync(tmp, `${JSON.stringify({ unmet: unmetIds })}\n`);
    renameSync(tmp, MARKER_FILE);
  } catch {
    // marker is best-effort; worst case the notice repeats next session
  }
}

function buildNotice(unmet) {
  const lines = unmet.map((u) => {
    // Unknown platform -> show all hints (same fallback the project-initializer
    // procedure prescribes — keep the two implementations aligned).
    const hint =
      u.hints?.[process.platform] ||
      (u.hints && Object.values(u.hints).join('  |  ')) ||
      'see README';
    return `- \`${u.id}\` (${u.reason}) — required by: ${(u.features || []).join(', ')}.\n  Install: ${hint}`;
  });
  return [
    '<!-- agenticaiplugin prerequisite check -->',
    '**agenticaiplugin — unmet prerequisites detected.** Relay this notice to the user',
    'at the start of your first reply (briefly, no drama), then continue normally.',
    'The listed features will not work until the prerequisite is installed; all',
    'other plugin features are unaffected.',
    '',
    ...lines,
    '',
    'Notice frequency is configurable in `agenticaiplugin.config.json` in the Claude',
    'config dir: `{"prereqNotice": "on-change"}` (default) or `"every-session"`.',
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
    // no/invalid stdin -> keep default event
  }

  const registry = readJson(REGISTRY_FILE);
  if (!registry || !Array.isArray(registry.prerequisites)) return;

  const config = readJson(CONFIG_FILE);

  const unmet = [];
  for (const entry of registry.prerequisites) {
    if (!gateSatisfied(entry.requiredWhen, config)) continue;
    const result = probe(entry.check);
    if (!result.ok) unmet.push({ ...entry, reason: result.reason });
  }

  const unmetIds = unmet.map((u) => u.id).sort();
  const lastReported = readJson(MARKER_FILE);
  const lastIds = Array.isArray(lastReported?.unmet) ? [...lastReported.unmet].sort() : null;
  const changed = JSON.stringify(unmetIds) !== JSON.stringify(lastIds);

  if (changed) writeMarker(unmetIds);
  if (unmet.length === 0) return;

  const everySession = config?.prereqNotice === 'every-session';
  if (!everySession && !changed) return;

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: event, additionalContext: buildNotice(unmet) },
    })}\n`
  );
}

try {
  main();
} catch {
  // fail-safe: never break the session
}
