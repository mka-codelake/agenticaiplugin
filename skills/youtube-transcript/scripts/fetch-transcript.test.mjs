// Tests for fetch-transcript.mjs — Node stdlib only, run with:
//   node --test
//
// Black-box through the public CLI contract (no internals imported), matching the
// repo convention (persona.test.mjs, check-prereqs.test.mjs). Covers argument
// handling and video-id validation — the paths reachable without network I/O.
// Caption-track selection and json3 parsing are exercised end-to-end against the
// live API during manual verification; they are pure functions and are not
// exported solely for testing (engineering rule: no API widening for tests).

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "fetch-transcript.mjs");

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

test("--help prints usage to stdout and exits 0", () => {
  const r = run(["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^Usage: fetch-transcript\.mjs/);
});

test("-h is an alias for --help", () => {
  const r = run(["-h"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^Usage:/);
});

test("no argument prints usage to stderr and exits 2", () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^Usage:/);
  assert.equal(r.stdout, "");
});

test("unknown option is rejected with exit 2", () => {
  const r = run(["--bogus"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown option: --bogus/);
});

test("a source with no extractable video id fails with exit 2", () => {
  const r = run(["https://example.com/not-a-video"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Could not extract a video ID/);
});
