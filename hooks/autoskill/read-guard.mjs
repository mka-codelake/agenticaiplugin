//
// agenticaiplugin: autoskill — PreToolUse guard, ONLY active in the reviewer
// session (wired via the runtime-generated reviewer settings file).
//
// Enforces two Hermes invariants hard:
//   1. Path cage: writes only inside the staging directory (STAGING_DIR from
//      lib.mjs — outside the Claude config dir; the skill library itself is
//      written by the deterministic install step in run-review.mjs, never by
//      the LLM). Paths are CANONICALIZED before comparison: a lexical prefix
//      check alone lets a prompt-injected `<staging>/../../etc` slip through
//      (the raw string starts with the anchor, yet the write escapes the cage).
//   2. read-before-write: existing files must be Read before Write/Edit
//
// Unlike the session hooks this guard is FAIL-CLOSED: input PRESENT but not
// parseable -> deny instead of allow. (A guard that allows on broken input is
// no guard.) The one deliberate exception is EMPTY stdin: no tool call was
// described, so there is nothing to guard — returning without a decision lets
// Claude Code fall back to its own permission handling (which the reviewer's
// allow/deny lists still constrain). PreToolUse always sends JSON in practice.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { STAGING_DIR, STATE_DIR } from './lib.mjs';

// Canonical, comparable absolute path: resolve() collapses `.`/`..` segments so
// a traversal cannot masquerade as a staging-prefixed string; case is folded
// only on case-insensitive Windows (POSIX paths are case-sensitive).
const canon = (p) => {
  const r = resolve(p);
  return process.platform === 'win32' ? r.toLowerCase() : r;
};

function deny(reason) {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })}\n`
  );
  process.exit(0);
}

function main() {
  let raw = '';
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    raw = '';
  }
  if (!raw.trim()) return; // no input at all -> nothing to guard

  let input = null;
  try {
    input = JSON.parse(raw);
  } catch {
    input = null;
  }
  const tool = typeof input?.tool_name === 'string' ? input.tool_name : '';
  if (!tool) {
    deny('autoskill read-guard: could not parse hook input — denying as a precaution');
  }

  const sid = typeof input.session_id === 'string' && /^[a-zA-Z0-9_-]+$/.test(input.session_id)
    ? input.session_id
    : 'unknown';
  const fpath = typeof input.tool_input?.file_path === 'string' ? input.tool_input.file_path : '';
  const readsFile = join(STATE_DIR, `reviewer-reads-${sid}.txt`);
  const stagingRoot = canon(STAGING_DIR);
  const stagingAnchor = stagingRoot.endsWith(sep) ? stagingRoot : stagingRoot + sep;

  const markRead = (key) => {
    try {
      appendFileSync(readsFile, `${key}\n`);
    } catch {
      /* best effort */
    }
  };
  const wasRead = (key) => {
    try {
      return readFileSync(readsFile, 'utf8').split('\n').includes(key);
    } catch {
      return false;
    }
  };

  if (tool === 'Read') {
    if (fpath) markRead(canon(fpath));
    return;
  }

  if (tool === 'Write' || tool === 'Edit') {
    // Without the env the worker exports, STAGING_DIR falls back to a fixed path that
    // lib.mjs itself marks predictable and world-readable (CWE-377). The cage would
    // then guard a directory nobody prepared — every write inside the real staging dir
    // would be refused, and a write into the fallback waved through. The fallback stays
    // as lib's answer to "where"; the guard's answer to "may I at all" is no.
    // Reads are left alone: they cost nothing and blocking them buys nothing.
    if (!process.env.AUTOSKILL_STAGING_DIR) {
      deny(
        'autoskill read-guard: AUTOSKILL_STAGING_DIR is not set, so the staging cage ' +
          'cannot be trusted — denying the write',
      );
    }
    // No path, no decision — and a guard with no decision must not be a yes. This
    // arm is reached only if a Write/Edit schema stops carrying `file_path`, i.e.
    // exactly when the cage no longer knows what it is caging.
    if (!fpath) {
      deny(
        `autoskill read-guard: ${tool} without a file_path — cannot tell whether the ` +
          'write stays inside the staging directory, so denying',
      );
    }
    const cp = canon(fpath);
    if (cp !== stagingRoot && !cp.startsWith(stagingAnchor)) {
      deny(
        `autoskill reviewer may only write inside the staging directory (${STAGING_DIR}) — got: ${fpath}`
      );
    }
    if (existsSync(fpath) && !wasRead(cp)) {
      deny(`read-before-write: Read ${fpath} before modifying it (autoskill invariant)`);
    }
    // Own writes count as read — the reviewer may refine its freshly staged
    // file with a follow-up Edit.
    markRead(cp);
  }
}

try {
  main();
} catch {
  // Unexpected crash: emit nothing (the reviewer session then proceeds without
  // a decision, which Claude Code treats as "no opinion" — the permissions
  // allow/deny lists in the reviewer settings still apply).
}
