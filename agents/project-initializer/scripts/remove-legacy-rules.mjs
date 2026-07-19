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

import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv);
}
