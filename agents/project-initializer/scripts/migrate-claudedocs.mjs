#!/usr/bin/env node
// agenticaiplugin: complete the claudedocs/{guidelines,adrs} -> .claude/{guidelines,adrs}
// relocation for a project. Deterministic, tested replacement for prompt-driven migration.
//
// Three concerns of one relocation:
//   1. MOVE files from claudedocs/{guidelines,adrs} into .claude/{guidelines,adrs}
//      (only these two subdirs — other claudedocs/ output is left untouched).
//      Conflict policy: NEVER overwrite; a file whose destination exists is left in
//      place and reported as a `conflict`. claudedocs/ is removed only if left empty.
//   2. GITIGNORE: code-review/audit read .claude/{guidelines,adrs}; if .gitignore
//      ignores .claude via a CONTENTS form (`.claude/*`), previously-tracked docs would
//      silently leave git — so append `!.claude/guidelines/` / `!.claude/adrs/`. A
//      WHOLE-TREE form (`.claude/`) cannot be fixed by a negation (git won't re-include a
//      child of an excluded dir) -> NOT auto-edited; reported as `review` for the user.
//   3. CLAUDE.md: rewrite stale `claudedocs/{guidelines,adrs}` path tokens in the
//      project's root CLAUDE.md to `.claude/…` (only these two tokens).
//
// Usage: node migrate-claudedocs.mjs <projectRoot> [--dry-run|--apply]   (default: --dry-run)
// Emits a JSON report (see main). Node stdlib only. Non-destructive in --dry-run.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUBDIRS = ['guidelines', 'adrs'];

// ---- move planning -------------------------------------------------------

function listDir(path) {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

// Move a file, falling back to copy+remove across filesystems (EXDEV — some
// container / WSL bind-mount setups make renameSync fail).
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

// ---- gitignore planning (pure) ------------------------------------------

const WHOLE_TREE = new Set(['.claude', '.claude/', '/.claude', '/.claude/']);
const CONTENTS = new Set(['.claude/*', '/.claude/*', '.claude/**', '/.claude/**']);

// Classify how (if at all) .gitignore ignores .claude, and which negations to add.
// `contentful` = { guidelines: bool, adrs: bool } — only un-ignore subdirs that will
// actually hold files.
export function planGitignore(gitignoreContent, contentful) {
  if (gitignoreContent == null) return { present: false, form: 'none', negationsAppended: [], review: '' };
  const lines = gitignoreContent.split(/\r?\n/).map((l) => l.trim());
  const meaningful = lines.filter((l) => l && !l.startsWith('#'));
  const hasWholeTree = meaningful.some((l) => WHOLE_TREE.has(l));
  const hasContents = meaningful.some((l) => CONTENTS.has(l));

  if (hasWholeTree) {
    return {
      present: true,
      form: 'whole-tree',
      negationsAppended: [],
      review:
        '.gitignore excludes the whole `.claude/` tree; git cannot re-include children of an ' +
        'excluded directory. Change the `.claude/`/`.claude` line to `.claude/*` and add ' +
        '`!.claude/guidelines/` and `!.claude/adrs/` so migrated guidelines/ADRs stay tracked.',
    };
  }
  if (!hasContents) return { present: true, form: 'none', negationsAppended: [], review: '' };

  const negationsAppended = [];
  for (const sub of SUBDIRS) {
    if (!contentful[sub]) continue;
    const already = meaningful.some((l) =>
      [`!.claude/${sub}/`, `!.claude/${sub}`, `!/.claude/${sub}/`, `!/.claude/${sub}`].includes(l)
    );
    if (!already) negationsAppended.push(`!.claude/${sub}/`);
  }
  return { present: true, form: 'contents', negationsAppended, review: '' };
}

// ---- CLAUDE.md planning (pure) ------------------------------------------

export function planClaudeMdRewrites(content) {
  const rewrites = [];
  for (const sub of SUBDIRS) {
    const from = `claudedocs/${sub}`;
    const to = `.claude/${sub}`;
    const count = content.split(from).length - 1;
    if (count > 0) rewrites.push({ from, to, count });
  }
  return rewrites;
}

function applyClaudeMdRewrites(content, rewrites) {
  let out = content;
  for (const r of rewrites) out = out.split(r.from).join(r.to);
  return out;
}

// ---- plan (read-only) ---------------------------------------------------

export function computeMigration(projectRoot) {
  const moved = [];
  const conflicts = [];
  const contentful = {};

  for (const sub of SUBDIRS) {
    const src = join(projectRoot, 'claudedocs', sub);
    const dst = join(projectRoot, '.claude', sub);
    for (const name of listDir(src)) {
      if (existsSync(join(dst, name))) conflicts.push(`claudedocs/${sub}/${name}`);
      else moved.push({ from: `claudedocs/${sub}/${name}`, to: `.claude/${sub}/${name}`, sub, name });
    }
    const destHasFiles = listDir(dst).length > 0;
    const movesInto = moved.some((m) => m.sub === sub);
    const conflictInto = conflicts.some((c) => c.startsWith(`claudedocs/${sub}/`));
    contentful[sub] = destHasFiles || movesInto || conflictInto;
  }

  const giPath = join(projectRoot, '.gitignore');
  const giContent = existsSync(giPath) ? readFileSync(giPath, 'utf8') : null;
  const gitignore = planGitignore(giContent, contentful);

  const cmPath = join(projectRoot, 'CLAUDE.md');
  const cmPresent = existsSync(cmPath);
  const rewrites = cmPresent ? planClaudeMdRewrites(readFileSync(cmPath, 'utf8')) : [];
  const claudeMd = { path: 'CLAUDE.md', present: cmPresent, rewrites };

  return { moved, conflicts, gitignore, claudeMd };
}

// ---- apply ---------------------------------------------------------------

function applyMigration(projectRoot, plan) {
  // 1. moves
  for (const m of plan.moved) {
    const dst = join(projectRoot, '.claude', m.sub);
    mkdirSync(dst, { recursive: true });
    moveFile(join(projectRoot, 'claudedocs', m.sub, m.name), join(dst, m.name));
  }
  // remove now-empty source subdirs
  for (const sub of SUBDIRS) {
    const src = join(projectRoot, 'claudedocs', sub);
    try {
      if (listDir(src).length === 0 && existsSync(src)) rmdirSync(src);
    } catch {
      /* best effort */
    }
  }

  // 2. gitignore negations (append-only, preserve EOL)
  if (plan.gitignore.form === 'contents' && plan.gitignore.negationsAppended.length) {
    const giPath = join(projectRoot, '.gitignore');
    let content = existsSync(giPath) ? readFileSync(giPath, 'utf8') : '';
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    if (content && !/\r?\n$/.test(content)) content += eol;
    content += plan.gitignore.negationsAppended.map((l) => l + eol).join('');
    writeFileSync(giPath, content);
  }

  // 3. CLAUDE.md rewrites
  if (plan.claudeMd.present && plan.claudeMd.rewrites.length) {
    const cmPath = join(projectRoot, 'CLAUDE.md');
    writeFileSync(cmPath, applyClaudeMdRewrites(readFileSync(cmPath, 'utf8'), plan.claudeMd.rewrites));
  }

  // 4. remove claudedocs/ only if now completely empty
  let claudedocsRemoved = false;
  let claudedocsRemaining = [];
  const claudedocs = join(projectRoot, 'claudedocs');
  if (existsSync(claudedocs)) {
    const rest = listDir(claudedocs);
    if (rest.length === 0) {
      try {
        rmdirSync(claudedocs);
        claudedocsRemoved = true;
      } catch {
        /* best effort */
      }
    } else {
      claudedocsRemaining = rest;
    }
  }
  return { claudedocsRemoved, claudedocsRemaining };
}

// ---- CLI -----------------------------------------------------------------

function main(argv) {
  const args = argv.slice(2);
  const projectRoot = args.find((a) => !a.startsWith('--')) || process.cwd();
  const doApply = args.includes('--apply');

  const plan = computeMigration(projectRoot);
  const report = {
    applied: doApply,
    moved: plan.moved.map((m) => `${m.from} -> ${m.to}`),
    conflicts: plan.conflicts,
    claudedocsRemoved: false,
    claudedocsRemaining: [],
    gitignore: plan.gitignore,
    claudeMd: plan.claudeMd,
  };

  if (doApply) {
    const cleanup = applyMigration(projectRoot, plan);
    report.claudedocsRemoved = cleanup.claudedocsRemoved;
    report.claudedocsRemaining = cleanup.claudedocsRemaining;
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

// Only run as a CLI when invoked directly — importing the module (for the exported
// planners) must have no side effects. Compare via realpath: this script is invoked
// through a symlinked plugin path, so argv[1] (symlink) and import.meta.url (realpath)
// differ — a raw string compare would make the CLI a silent no-op.
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
