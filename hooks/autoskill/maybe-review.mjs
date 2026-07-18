//
// agenticaiplugin: autoskill — Stop hook: checks the iteration counter and
// spawns the review worker DETACHED when the threshold is reached. Also
// checks the lazy-curator timer (Hermes pattern: no cron/task scheduler
// needed). Must return immediately — the worker runs after the session's
// answer and never competes with the user's work.
//
// Fail-safe: enabled=false or any unexpected state -> do nothing, exit 0.

import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
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

// Atomically acquire the lock. First clear a stale lock (crashed worker, older
// than 10 min), then O_EXCL-create the lock file: exactly one caller can create
// it, so the check-and-acquire is a single atomic step. Returns true only for
// that caller — closes the race where two Stop hooks both see "free" and each
// spawn a worker that then collides on the staging dir and learned.list.
function tryTakeLock(mode) {
  try {
    const raw = readFileSync(LOCK_FILE, 'utf8');
    const ts = Number.parseInt(raw.trim().split(/\s+/)[1], 10);
    if (nowEpoch() - (Number.isInteger(ts) ? ts : 0) >= LOCK_STALE_SECONDS) {
      rmSync(LOCK_FILE, { force: true });
    }
  } catch {
    // no lock file (or unreadable) -> the create below decides
  }
  let fd;
  try {
    fd = openSync(LOCK_FILE, 'wx'); // O_EXCL: throws if the lock already exists
  } catch {
    return false; // another worker holds it
  }
  try {
    writeSync(fd, `${process.pid} ${nowEpoch()} ${mode}\n`);
  } finally {
    closeSync(fd);
  }
  return true;
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
  if (count >= config.threshold && transcript && existsSync(transcript) && tryTakeLock('review')) {
    writeFileAtomic(cfile, '0\n');
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
    if (now - last >= config.curator.intervalDays * 86400 && tryTakeLock('curator')) {
      writeFileAtomic(lastFile, `${now}\n`);
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
