//
// agenticaiplugin: autoskill — PreToolUse guard, ONLY active in the reviewer
// session (wired via the runtime-generated reviewer settings file).
//
// Enforces two Hermes invariants hard:
//   1. Path cage: writes only inside the staging directory
//      (<stateDir>/staging/ — the skill library itself is written by the
//      deterministic install step in run-review.mjs, never by the LLM)
//   2. read-before-write: existing files must be Read before Write/Edit
//
// Unlike the session hooks this guard is FAIL-CLOSED: input PRESENT but not
// parseable -> deny instead of allow. (A guard that allows on broken input is
// no guard.) The one deliberate exception is EMPTY stdin: no tool call was
// described, so there is nothing to guard — returning without a decision lets
// Claude Code fall back to its own permission handling (which the reviewer's
// allow/deny lists still constrain). PreToolUse always sends JSON in practice.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_DIR, normPath, readHookInput } from './lib.mjs';

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
  const stagingAnchor = `${normPath(join(STATE_DIR, 'staging'))}/`;

  const markRead = (np) => {
    try {
      appendFileSync(readsFile, `${np}\n`);
    } catch {
      /* best effort */
    }
  };
  const wasRead = (np) => {
    try {
      return readFileSync(readsFile, 'utf8').split('\n').includes(np);
    } catch {
      return false;
    }
  };

  if (tool === 'Read') {
    if (fpath) markRead(normPath(fpath));
    return;
  }

  if (tool === 'Write' || tool === 'Edit') {
    if (!fpath) return;
    const np = normPath(fpath);
    if (!np.startsWith(stagingAnchor)) {
      deny(
        `autoskill reviewer may only write inside the staging directory (${join(STATE_DIR, 'staging')}) — got: ${fpath}`
      );
    }
    if (existsSync(fpath) && !wasRead(np)) {
      deny(`read-before-write: Read ${fpath} before modifying it (autoskill invariant)`);
    }
    // Own writes count as read — the reviewer may refine its freshly staged
    // file with a follow-up Edit.
    markRead(np);
  }
}

try {
  main();
} catch {
  // Unexpected crash: emit nothing (the reviewer session then proceeds without
  // a decision, which Claude Code treats as "no opinion" — the permissions
  // allow/deny lists in the reviewer settings still apply).
}
