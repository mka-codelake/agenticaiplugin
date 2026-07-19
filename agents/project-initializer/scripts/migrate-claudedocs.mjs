#!/usr/bin/env node
// agenticaiplugin: migrate a project's claudedocs/{guidelines,adrs} into .claude/{guidelines,adrs}.
//
// Deterministic, tested replacement for prompt-driven folder migration. Moves ONLY
// the guidelines/ and adrs/ subdirectories (the plugin-relevant ones) — any other
// claudedocs/ content is left untouched (it belongs to other features, e.g.
// license-check-result.md and review/audit reports).
//
// Conflict policy: NEVER overwrite. A source file whose destination path already
// exists is left in place and reported as a `conflict` (the caller then asks the user).
//
// Cleanup: after migration, claudedocs/ is removed ONLY if it is completely empty;
// otherwise it is left as-is, with no prompt (remaining files are legitimate output).
//
// Usage: node migrate-claudedocs.mjs <projectRoot>   (default: cwd)
// Emits JSON: { "moved": [], "conflicts": [], "claudedocsRemoved": bool, "claudedocsRemaining": [] }
//
// Node stdlib only.

import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';

const SUBDIRS = ['guidelines', 'adrs'];

// Move a file, falling back to copy+remove when src and dst are on different
// filesystems (renameSync throws EXDEV — e.g. some container / WSL bind-mount setups).
function moveFile(from, to) {
  try {
    renameSync(from, to);
  } catch (err) {
    if (err && err.code === 'EXDEV') {
      copyFileSync(from, to);
      rmSync(from, { force: true });
    } else {
      throw err;
    }
  }
}

function migrateSubdir(projectRoot, subdir, moved, conflicts) {
  const src = join(projectRoot, 'claudedocs', subdir);
  const dst = join(projectRoot, '.claude', subdir);
  let entries;
  try {
    entries = readdirSync(src);
  } catch {
    return; // source subdir missing -> nothing to do
  }
  mkdirSync(dst, { recursive: true });
  for (const name of entries) {
    const to = join(dst, name);
    if (existsSync(to)) {
      conflicts.push(`claudedocs/${subdir}/${name}`); // never overwrite user content
      continue;
    }
    moveFile(join(src, name), to);
    moved.push(`claudedocs/${subdir}/${name} -> .claude/${subdir}/${name}`);
  }
  // remove the now-(possibly)-empty source subdir
  try {
    if (readdirSync(src).length === 0) rmdirSync(src);
  } catch {
    // best-effort
  }
}

function main(argv) {
  const projectRoot = argv[2] || process.cwd();
  const moved = [];
  const conflicts = [];
  for (const sub of SUBDIRS) migrateSubdir(projectRoot, sub, moved, conflicts);

  // Remove claudedocs/ only if now completely empty; otherwise leave it (foreign output).
  let claudedocsRemoved = false;
  let claudedocsRemaining = [];
  const claudedocs = join(projectRoot, 'claudedocs');
  try {
    const rest = readdirSync(claudedocs);
    if (rest.length === 0) {
      rmdirSync(claudedocs);
      claudedocsRemoved = true;
    } else {
      claudedocsRemaining = rest;
    }
  } catch {
    // claudedocs/ missing -> nothing
  }

  process.stdout.write(
    `${JSON.stringify({ moved, conflicts, claudedocsRemoved, claudedocsRemaining }, null, 2)}\n`
  );
}

main(process.argv);
