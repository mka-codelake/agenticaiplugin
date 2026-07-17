//
// agenticaiplugin: autoskill — shared helpers for all autoskill scripts.
//
// Contract (same as every plugin hook): scripts NEVER fail loudly — on any
// unexpected state they do nothing and exit 0. A broken hook must not disturb
// the session.
//
// State lives OUTSIDE the plugin install dir (which is a marketplace copy,
// overwritten on every update): ${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.autoskill/
//
// Config is the `autoskill` section of agenticaiplugin.config.json in the same
// config dir. Default is DISABLED — autoskill spawns background `claude -p`
// runs, so it is strictly opt-in.

import { appendFileSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
export const CONFIG_FILE = join(CONFIG_DIR, 'agenticaiplugin.config.json');
export const STATE_DIR = join(CONFIG_DIR, 'agenticaiplugin.autoskill');
// Learned skills install flat into the USER-level skill library (cross-project
// knowledge; nested dirs are not discovered by Claude Code).
export const SKILLS_DIR = join(CONFIG_DIR, 'skills');
export const LEARNED_LIST = join(STATE_DIR, 'learned.list');
export const ARCHIVE_DIR = join(STATE_DIR, 'archive');

const DEFAULTS = {
  enabled: false,
  threshold: 10,
  reviewerModel: 'sonnet',
  nudgeInterval: 10,
  curator: { enabled: true, intervalDays: 7 },
};

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// Resolved autoskill config: user values win, missing/invalid keys fall back to
// the defaults above. Explicit `false` values survive (no truthiness traps).
export function readConfig() {
  const section = readJson(CONFIG_FILE)?.autoskill;
  if (!section || typeof section !== 'object') return { ...DEFAULTS, curator: { ...DEFAULTS.curator } };
  const num = (v, d) => (Number.isInteger(v) && v >= 0 ? v : d);
  return {
    enabled: section.enabled === true,
    threshold: num(section.threshold, DEFAULTS.threshold),
    reviewerModel: typeof section.reviewerModel === 'string' && section.reviewerModel
      ? section.reviewerModel
      : DEFAULTS.reviewerModel,
    nudgeInterval: num(section.nudgeInterval, DEFAULTS.nudgeInterval),
    curator: {
      enabled: section.curator?.enabled === true,
      intervalDays: num(section.curator?.intervalDays, DEFAULTS.curator.intervalDays),
    },
  };
}

// Comparable paths: backslashes -> slashes, lowercase (Windows is
// case-insensitive; our comparison anchors are lowercase anyway).
export function normPath(p) {
  return String(p).replace(/\\/g, '/').toLowerCase();
}

export function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function nowEpoch() {
  return Math.floor(Date.now() / 1000);
}

export function ensureStateDirs() {
  mkdirSync(join(STATE_DIR, 'counters'), { recursive: true });
  mkdirSync(join(STATE_DIR, 'tmp'), { recursive: true });
}

export function isLearnedSkill(name) {
  if (!name) return false;
  try {
    return readFileSync(LEARNED_LIST, 'utf8').split('\n').includes(name);
  } catch {
    return false;
  }
}

export function readLearnedList() {
  try {
    return readFileSync(LEARNED_LIST, 'utf8').split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export function appendLearned(name) {
  appendFileSync(LEARNED_LIST, `${name}\n`);
}

export function removeLearned(name) {
  const rest = readLearnedList().filter((n) => n !== name);
  writeFileAtomic(LEARNED_LIST, rest.length ? `${rest.join('\n')}\n` : '');
}

// Atomic write: tmp file + rename (pattern from persona.mjs). Throws on
// failure — callers decide whether that is fatal (worker) or ignored (hook).
export function writeFileAtomic(path, content) {
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, content);
  try {
    renameSync(tmp, path);
  } catch (err) {
    try { rmSync(tmp, { force: true }); } catch { /* best effort */ }
    throw err;
  }
}

// Read the hook JSON from stdin. Returns null on missing/invalid input —
// callers treat that per their own fail-safe policy (hooks: exit 0;
// read-guard: fail-closed deny).
export function readHookInput() {
  try {
    const raw = readFileSync(0, 'utf8');
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function counterFile(sid, ext) {
  return join(STATE_DIR, 'counters', `${sid}.${ext}`);
}

export function readCount(path) {
  try {
    const n = Number.parseInt(readFileSync(path, 'utf8').trim(), 10);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}
