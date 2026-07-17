// Tests for maybe-review.mjs (Stop hook) — black-box via spawnSync with a
// fresh CLAUDE_CONFIG_DIR; the detached worker runs against a stub `claude`
// that answers "Nothing to save.". Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'maybe-review.mjs');
const SID = 'stop-1';

// Default config disables the lazy curator so the review-trigger tests are not
// perturbed by it (curator defaults to ON now); the dedicated curator test
// passes its own config that enables it.
function fixture(config = { enabled: true, threshold: 3, curator: { enabled: false } }) {
  const configDir = mkdtempSync(join(tmpdir(), 'autoskill-stop-'));
  writeFileSync(
    join(configDir, 'agenticaiplugin.config.json'),
    JSON.stringify({ autoskill: config })
  );
  const stateDir = join(configDir, 'agenticaiplugin.autoskill');
  mkdirSync(join(stateDir, 'counters'), { recursive: true });

  const binDir = join(configDir, 'stub-bin');
  mkdirSync(binDir);
  const stub = join(binDir, 'claude');
  writeFileSync(stub, '#!/usr/bin/env node\nconsole.log("SUMMARY: Nothing to save.");\n');
  chmodSync(stub, 0o755);

  const transcript = join(configDir, 'transcript.jsonl');
  writeFileSync(transcript, `${JSON.stringify({ type: 'user', message: { content: 'hi' } })}\n`);

  return {
    configDir,
    stateDir,
    transcript,
    setCount(n) {
      writeFileSync(join(stateDir, 'counters', `${SID}.count`), `${n}\n`);
    },
    count() {
      return readFileSync(join(stateDir, 'counters', `${SID}.count`), 'utf8').trim();
    },
    run(extraEnv = {}) {
      return spawnSync(process.execPath, [SCRIPT], {
        encoding: 'utf8',
        input: JSON.stringify({ session_id: SID, transcript_path: transcript }),
        env: {
          ...process.env,
          CLAUDE_CONFIG_DIR: configDir,
          AUTOSKILL_REVIEWER: '',
          PATH: `${binDir}:${process.env.PATH}`,
          ...extraEnv,
        },
      });
    },
  };
}

async function waitForLockRelease(stateDir, timeoutMs = 10000) {
  const lock = join(stateDir, 'review.lock');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!existsSync(lock)) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

test('below threshold: no lock, counter untouched', () => {
  const fx = fixture();
  fx.setCount(2);
  assert.equal(fx.run().status, 0);
  assert.equal(existsSync(join(fx.stateDir, 'review.lock')), false);
  assert.equal(fx.count(), '2');
});

test('at threshold: counter reset, worker spawned detached and releases the lock', async () => {
  const fx = fixture();
  fx.setCount(3);
  const r = fx.run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fx.count(), '0', 'counter reset immediately');
  assert.ok(await waitForLockRelease(fx.stateDir), 'worker finished and removed the lock');
  const log = readFileSync(join(fx.stateDir, 'review.log'), 'utf8');
  assert.match(log, new RegExp(`mode=review session=${SID} rc=0`));
  assert.equal(
    existsSync(join(fx.stateDir, 'pending_notice.txt')),
    false,
    '"Nothing to save." leaves no notice'
  );
});

test('fresh lock blocks a second spawn; stale lock is cleaned up', () => {
  const fx = fixture();
  const now = Math.floor(Date.now() / 1000);
  writeFileSync(join(fx.stateDir, 'review.lock'), `1 ${now} review\n`);
  fx.setCount(3);
  assert.equal(fx.run().status, 0);
  assert.equal(fx.count(), '3', 'fresh lock: nothing triggered');

  writeFileSync(join(fx.stateDir, 'review.lock'), `1 ${now - 700} review\n`);
  assert.equal(fx.run().status, 0);
  assert.equal(fx.count(), '0', 'stale lock (>600s) cleaned, review triggered');
});

test('lazy curator: triggers after intervalDays, timer persisted', async () => {
  const fx = fixture({
    enabled: true,
    threshold: 99,
    curator: { enabled: true, intervalDays: 7 },
  });
  fx.setCount(0);
  assert.equal(fx.run().status, 0);
  assert.ok(existsSync(join(fx.stateDir, 'curator_last_run')), 'first run seeds the timer');
  assert.ok(await waitForLockRelease(fx.stateDir), 'curator worker finished');
  assert.ok(existsSync(join(fx.stateDir, 'curator-report.md')), 'report written');

  const seeded = readFileSync(join(fx.stateDir, 'curator_last_run'), 'utf8');
  assert.equal(fx.run().status, 0);
  assert.equal(
    readFileSync(join(fx.stateDir, 'curator_last_run'), 'utf8'),
    seeded,
    'within the interval the timer does not move'
  );
});

test('disabled config and reviewer env are hard no-ops', () => {
  const off = fixture({ enabled: false, threshold: 1 });
  off.setCount(5);
  assert.equal(off.run().status, 0);
  assert.equal(off.count(), '5');
  assert.equal(existsSync(join(off.stateDir, 'review.lock')), false);

  const guard = fixture();
  guard.setCount(5);
  assert.equal(guard.run({ AUTOSKILL_REVIEWER: '1' }).status, 0);
  assert.equal(guard.count(), '5');
});
