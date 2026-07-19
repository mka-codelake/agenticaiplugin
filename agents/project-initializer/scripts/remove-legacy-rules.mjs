#!/usr/bin/env node
// agenticaiplugin: remove a project's legacy copied plugin rules
// (.claude/rules/agenticaiplugin-*.md).
//
// Part of the one-time transition off copied rules onto plugin-side doctrine
// (SessionStart hook) + enforcement (PreToolUse hook). The glob is generic, so it
// also sweeps historically-removed rules (e.g. agenticaiplugin-engineering.md,
// agenticaiplugin-protected-dirs.md) that a hardcoded name list would miss. It only
// ever touches files with the `agenticaiplugin-` prefix — the user's own rules are
// never removed.
//
// Usage: node remove-legacy-rules.mjs <projectRoot> [--dry-run|--apply]  (default: --dry-run)
// Emits JSON: { "applied": bool, "removed": ["agenticaiplugin-core.md", ...] }
// Node stdlib only. Non-destructive in --dry-run.

import { readdirSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RULE_FILE = /^agenticaiplugin-.*\.md$/;

export function computeRemovals(projectRoot) {
  const dir = join(projectRoot, '.claude', 'rules');
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    entries = []; // no rules dir -> nothing to remove
  }
  return entries.filter((f) => RULE_FILE.test(f)).sort();
}

export function applyRemovals(projectRoot, removals) {
  const dir = join(projectRoot, '.claude', 'rules');
  for (const f of removals) rmSync(join(dir, f), { force: true });
}

function main(argv) {
  const args = argv.slice(2);
  const projectRoot = args.find((a) => !a.startsWith('--')) || process.cwd();
  const doApply = args.includes('--apply');
  const removed = computeRemovals(projectRoot);
  if (doApply) applyRemovals(projectRoot, removed);
  process.stdout.write(`${JSON.stringify({ applied: doApply, removed }, null, 2)}\n`);
}

// Compare via realpath: invoked through a symlinked plugin path, so argv[1]
// (symlink) and import.meta.url (realpath) differ — a raw compare would no-op.
if (invokedDirectly()) {
  main(process.argv);
}

function invokedDirectly() {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
