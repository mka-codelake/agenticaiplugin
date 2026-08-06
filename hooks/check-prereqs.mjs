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
// Fail-safe by design: unreadable registry/marker, unknown check types, or
// probe crashes inject NOTHING and exit 0 — this hook must never break a
// session. An unreadable *config* is the one exception, and it is a warning to
// the user rather than context for the model: see the second job below.
// Bootstrap limitation (documented in docs/plugin-howto.md): if the
// missing prerequisite is Node itself, this script cannot run; that case is
// covered by the project-initializer's init/update-time check and the README.
//
// Second job (issue #119): warn the user when that config file exists but
// cannot be read or parsed. Every consumer of the config silently falls back to
// its default in that case — for `autoskill` the default is OFF, so a stray BOM
// or a missing comma switches off a feature the user explicitly enabled, and
// takes the one channel that would have shown it (the review notice) with it.
// The warning goes out as `systemMessage` — visible to the user in the
// terminal, NOT part of the model's context.

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

// Read the user config and classify WHY it did not yield a usable object.
// Deliberately separate from readJson(): that helper conflates "parse error"
// with "the file legitimately contains null", and this warning must not fire
// for a reason it cannot name.
//
// Scope (issue #119) — this covers only the failures that make the WHOLE file
// inert at once: the file cannot be read, is not valid JSON, or does not hold a
// JSON object. It deliberately does NOT validate keys or value types: a typo
// like {"autoskil":...} or a wrong type like {"doctrine":"off"} stays silent.
// Catching those needs a list of known keys kept in sync with the README — a
// drift surface this hook is not worth. Not an oversight; a drawn line.
function readConfig() {
  let raw;
  try {
    raw = readFileSync(CONFIG_FILE, 'utf8');
  } catch (err) {
    // No config at all is the normal case — everything else (a directory, no
    // read permission, an I/O error) is a config the user meant to be read.
    if (err && err.code === 'ENOENT') return { config: null, problem: null };
    return { config: null, problem: `cannot be read (${err?.code || 'read error'})` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { config: null, problem: `is not valid JSON (${err?.message || 'parse error'})` };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { config: null, problem: 'does not contain a JSON object' };
  }
  return { config: parsed, problem: null };
}

// Deliberately NOT debounced through the marker file the way prereqNotice() is.
// The prerequisite notice repeats a state the user cannot always fix; this one
// repeats a state the user alone can fix, and staying silent about it after the
// first session would recreate the exact failure this warning exists to end —
// a setting that is off without anyone saying so. It costs no model context.
function buildConfigWarning(problem) {
  return [
    `agenticaiplugin: ${CONFIG_FILE} ${problem}.`,
    'All plugin settings fall back to their defaults — features you enabled there',
    '(e.g. autoskill) are OFF for this session until the file is fixed.',
  ].join('\n');
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

// Returns the prerequisite notice, or null when nothing is to be reported.
// Keeps its early returns local: the config warning must reach the user even
// when this half stays silent.
function prereqNotice(config) {
  const registry = readJson(REGISTRY_FILE);
  if (!registry || !Array.isArray(registry.prerequisites)) return null;

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
  if (unmet.length === 0) return null;

  const everySession = config?.prereqNotice === 'every-session';
  if (!everySession && !changed) return null;

  return buildNotice(unmet);
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

  const { config, problem } = readConfig();
  const notice = prereqNotice(config);

  // A hook may write exactly ONE JSON object — a second write would produce a
  // second line and break the parse. Both messages go into the same object.
  const out = {};
  if (problem) out.systemMessage = buildConfigWarning(problem);
  if (notice) out.hookSpecificOutput = { hookEventName: event, additionalContext: notice };
  if (Object.keys(out).length === 0) return;

  process.stdout.write(`${JSON.stringify(out)}\n`);
}

try {
  main();
} catch {
  // fail-safe: never break the session
}
