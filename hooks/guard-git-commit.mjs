#!/usr/bin/env node
//
// agenticaiplugin: git-commit guard — PreToolUse hook.
//
// Hard-blocks a raw `git commit` and steers the model to the git-smart-commit
// skill (/agenticaiplugin:gitme), which commits via a sanctioned path. The
// skill signals "this commit is sanctioned" by committing with an inert git
// config token: `git -c agenticai.gitme=1 commit …`. git accepts and ignores
// the throwaway `agenticai.gitme` key, the command still starts with `git`
// (so it matches the skill's `Bash(git:*)` allow-list without a prompt), and
// the token is deterministic — a human/other agent would never type it.
//
// Detection tokenizes the command (never regexes the raw string) so look-alikes
// are handled correctly:
//   deny : `git commit`, `git commit --amend`, `FOO=1 git commit`,
//          `git add -A && git commit`
//   allow: `git -c agenticai.gitme=1 commit`, `git log --grep=commit`,
//          `git commit-graph write`, `echo "git commit"`
//
// FAIL-OPEN by design: unparseable/empty stdin, a non-Bash tool, or any crash
// emits nothing (= allow). A guard that denied on broken input would block every
// commit in the session. This is workflow enforcement, not a security sandbox —
// shell aliases/functions, `eval`, and `$(…)` command substitution that produce
// `git commit` are NOT detected (the reviewer's read-guard is the real sandbox).
//
// Disable with { "gitCommitGuard": "off" } in agenticaiplugin.config.json.

import { readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const CONFIG_FILE = join(CONFIG_DIR, 'agenticaiplugin.config.json');
const SENTINEL = 'agenticai.gitme=1';

// git global options that take a SEPARATE-arg value (so the value is not the
// subcommand). `=`-forms (e.g. --git-dir=…) are single tokens handled generically.
const VALUE_OPTS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// Split a compound command into top-level segments at &&, ||, ;, |, & and
// newlines — respecting single/double quotes and backslash escapes.
export function splitSegments(command) {
  const segments = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      cur += ch;
      if (ch === '\\' && quote === '"' && i + 1 < command.length) {
        cur += command[++i];
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '\\' && i + 1 < command.length) {
      cur += ch + command[++i];
      continue;
    }
    if (ch === '\n') {
      segments.push(cur);
      cur = '';
      continue;
    }
    const two = command.slice(i, i + 2);
    if (two === '&&' || two === '||') {
      segments.push(cur);
      cur = '';
      i++;
      continue;
    }
    if (ch === ';' || ch === '|' || ch === '&') {
      segments.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  segments.push(cur);
  return segments.map((s) => s.trim()).filter((s) => s.length > 0);
}

// Split a single segment into shell tokens, stripping quotes and honoring
// backslash escapes.
export function tokenize(segment) {
  const tokens = [];
  let cur = '';
  let has = false;
  let quote = null;
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (quote) {
      if (ch === '\\' && quote === '"' && i + 1 < segment.length) {
        cur += segment[++i];
        has = true;
      } else if (ch === quote) {
        quote = null;
      } else {
        cur += ch;
        has = true;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      has = true;
      continue;
    }
    if (ch === '\\' && i + 1 < segment.length) {
      cur += segment[++i];
      has = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (has) {
        tokens.push(cur);
        cur = '';
        has = false;
      }
      continue;
    }
    cur += ch;
    has = true;
  }
  if (has) tokens.push(cur);
  return tokens;
}

// Classify a (possibly compound) command: is any segment a raw `git commit`
// without the sanctioned sentinel?
export function classify(command) {
  for (const segment of splitSegments(command)) {
    const tokens = tokenize(segment);
    let idx = 0;
    // Skip leading VAR=value environment assignments.
    while (idx < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[idx])) idx++;
    if (tokens[idx] !== 'git') continue;
    idx++;
    let sanctioned = false;
    // Consume git's own global options to reach the subcommand.
    while (idx < tokens.length) {
      const t = tokens[idx];
      if (VALUE_OPTS.has(t)) {
        if (t === '-c' && tokens[idx + 1] === SENTINEL) sanctioned = true;
        idx += 2;
        continue;
      }
      if (t.startsWith('-')) {
        idx++;
        continue;
      }
      break;
    }
    if (tokens[idx] === 'commit' && !sanctioned) {
      return { isRawCommit: true, sanctioned: false };
    }
  }
  return { isRawCommit: false, sanctioned: false };
}

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
  // Never interfere with the autoskill reviewer session (it denies Bash wholesale
  // anyway; this keeps the guard predictable and side-effect-free there).
  if (process.env.AUTOSKILL_REVIEWER) return;

  let raw = '';
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    raw = '';
  }
  if (!raw.trim()) return; // no input -> nothing to guard (fail-open)

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return; // unparseable -> fail-open
  }
  if (input?.tool_name !== 'Bash') return;

  const config = readJson(CONFIG_FILE);
  if (config?.gitCommitGuard === 'off') return;

  const command = typeof input?.tool_input?.command === 'string' ? input.tool_input.command : '';
  if (!command) return;

  if (classify(command).isRawCommit) {
    deny(
      'Raw `git commit` is blocked by agenticaiplugin. Commit via /agenticaiplugin:gitme ' +
        '(the git-smart-commit skill), which groups changes into atomic commits. ' +
        'To bypass intentionally, set {"gitCommitGuard":"off"} in agenticaiplugin.config.json.'
    );
  }
}

// Only run as a hook when invoked directly — importing the module (the test
// suite does, for the exported parser) must NOT read stdin or emit a decision.
// Compare via realpath: the plugin is loaded through a symlinked marketplace
// path, so process.argv[1] (the symlink) and import.meta.url (node resolves it
// to the realpath) differ — a raw string compare would leave the hook inert.
if (invokedDirectly()) {
  try {
    main();
  } catch {
    // Fail-open: any unexpected error emits nothing and allows the tool call.
  }
}

function invokedDirectly() {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
