//
// agenticaiplugin: autoskill — Stop hook: checks the iteration counter and
// spawns the review worker DETACHED when the threshold is reached. Also
// checks the lazy-curator timer (Hermes pattern: no cron/task scheduler
// needed). Must return immediately — the worker runs after the session's
// answer and never competes with the user's work.
//
// Fail-safe: enabled=false or any unexpected state -> do nothing, exit 0.

import { existsSync, openSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STATE_DIR,
  counterFile,
  ensureStateDirs,
  nowEpoch,
  readConfig,
  readCount,
  readHookInput,
  writeFileAtomic,
} from './lib.mjs';

const LOCK_FILE = join(STATE_DIR, 'review.lock');
const LOCK_STALE_SECONDS = 600;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

// Lock free? Stale locks (crashed worker) are cleaned up after 10 min.
function lockFree() {
  let raw;
  try {
    raw = readFileSync(LOCK_FILE, 'utf8');
  } catch {
    return true;
  }
  const ts = Number.parseInt(raw.trim().split(/\s+/)[1], 10);
  const age = nowEpoch() - (Number.isInteger(ts) ? ts : 0);
  if (age < LOCK_STALE_SECONDS) return false;
  try {
    rmSync(LOCK_FILE, { force: true });
  } catch {
    return false;
  }
  return true;
}

function takeLock(mode) {
  writeFileAtomic(LOCK_FILE, `${process.pid} ${nowEpoch()} ${mode}\n`);
}

// Detached worker spawn — Windows-compatible replacement for nohup/disown.
// stdout/stderr append to runner.log; the child survives this hook's exit.
function spawnWorker(mode, transcript, sid) {
  const logFd = openSync(join(STATE_DIR, 'runner.log'), 'a');
  const child = spawn(
    process.execPath,
    [join(SCRIPT_DIR, 'run-review.mjs'), mode, transcript, sid],
    {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      windowsHide: true,
      env: { ...process.env, AUTOSKILL_REVIEWER: '1' },
    }
  );
  child.unref();
}

function main() {
  if (process.env.AUTOSKILL_REVIEWER) return;
  const config = readConfig();
  if (!config.enabled) return;

  const input = readHookInput();
  const sid = typeof input?.session_id === 'string' ? input.session_id : '';
  if (!sid || /[^a-zA-Z0-9_-]/.test(sid)) return;
  const transcript = typeof input.transcript_path === 'string' ? input.transcript_path : '';

  ensureStateDirs();

  // ── review trigger ────────────────────────────────────────────────────────
  const cfile = counterFile(sid, 'count');
  const count = readCount(cfile);
  if (count >= config.threshold && transcript && existsSync(transcript) && lockFree()) {
    writeFileAtomic(cfile, '0\n');
    takeLock('review');
    spawnWorker('review', transcript, sid);
    return;
  }

  // ── lazy-curator trigger ──────────────────────────────────────────────────
  if (config.curator.enabled) {
    const lastFile = join(STATE_DIR, 'curator_last_run');
    let last = 0;
    try {
      const n = Number.parseInt(readFileSync(lastFile, 'utf8').trim(), 10);
      last = Number.isInteger(n) ? n : 0;
    } catch {
      last = 0;
    }
    const now = nowEpoch();
    if (now - last >= config.curator.intervalDays * 86400 && lockFree()) {
      writeFileAtomic(lastFile, `${now}\n`);
      takeLock('curator');
      spawnWorker('curator', '', sid);
    }
  }

  // Housekeeping: counter files of finished sessions (> 7 days old)
  const countersDir = join(STATE_DIR, 'counters');
  const cutoff = Date.now() - 7 * 86400 * 1000;
  for (const f of readdirSync(countersDir)) {
    const p = join(countersDir, f);
    try {
      if (statSync(p).mtimeMs < cutoff) unlinkSync(p);
    } catch {
      /* best effort */
    }
  }
}

try {
  main();
} catch {
  // fail-safe: never break the session
}
