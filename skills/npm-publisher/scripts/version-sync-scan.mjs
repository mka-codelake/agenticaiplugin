#!/usr/bin/env node
// agenticaiplugin: find hard-coded VERSION constants in a repo's source files, so the
// npm release workflow can sync them to package.json.version (Phase 2.4 Step F) and
// audit them afterwards (Phase 3b).
//
// This replaces a bash block that lived in three copies of Markdown (issue #75). Three
// defects in a row — a fix landing in one copy and not the other (#65), an unquoted repo
// path with suppressed stderr (#70), a missing extension in one copy of three (#72) —
// were all found by reading and by no test, because a fenced block is never executed.
// One executed file, one test suite.
//
// Usage: node version-sync-scan.mjs <repoPath>
//
// Output contract (stdout is the authority, always a single JSON object):
//
//   { "status": "scanned" | "skipped",
//     "reason": "<why nothing was searched>",      // only when status === "skipped"
//     "repoPath": "<the argument, as given>",
//     "scannedDirs": ["src", "lib"],               // relative to repoPath
//     "matches": [ { "file": "<repoPath>/src/v.ts", "line": 12,
//                    "version": "1.2.3", "versions": ["1.2.3"],
//                    "text": "export const VERSION = \"1.2.3\";" } ],
//     "errors":  [ { "path": "...", "message": "EACCES: ..." } ] }
//
//   THE ONLY STATE THAT MAY BE REPORTED AS "versions are in sync":
//     status === "scanned" && errors.length === 0 && matches.length === 0
//
//   Three states stay distinguishable, which is the point of issue #70:
//     hits                  -> status "scanned", matches non-empty
//     searched, nothing     -> status "scanned", matches empty      <- the only clean one
//     never searched        -> status "skipped", matches empty
//   A "skipped" scan is NOT a clean scan: it is reported as "not checked", never as a
//   passing check, and it is never a fix trigger — there is no file and no mismatch to fix.
//
//   Exit codes: 0 = scan concluded (with or without hits, including "skipped"),
//               2 = the scan ran but hit real errors (unreadable directory/file) —
//                   `errors` says which, and the same lines go to stderr,
//               1 = usage error (wrong number of arguments).
//   "skipped" deliberately does NOT get its own exit code: it is a normal outcome for a
//   repo without a source directory, and encoding it twice (exit code AND status) invites
//   the two to drift. Errors do get one, because a non-zero exit is the only signal that
//   survives a caller which ignores the body.
//
// A `SKIPPED (...)` line is additionally written to stderr, verbatim as the bash block
// wrote it. It is not a second output format — it is the human/LLM-visible echo of the
// same fact, and the prose in agents/npm-publisher.md refers to it by that name.
//
// Node stdlib only, no dependencies, read-only.

import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Candidate source directories, relative to the repo path, in this order. */
export const SRC_DIRS = ['src', 'app/src', 'lib'];

/**
 * Which files are searched. The list covers the JS/TS family plus the languages a
 * published npm package routinely carries a *native* half in: Python, Go, Rust, and the
 * full mobile bridge — Java and Kotlin on Android, Swift and Objective-C (.m/.mm) on iOS.
 * Covering only one half was the defect behind issue #72.
 */
export const EXTENSIONS = [
  '.ts', '.js', '.mjs', '.cjs',
  '.py', '.go', '.rs',
  '.java', '.kt', '.swift', '.m', '.mm',
];

/**
 * Which lines count as a version constant. Ported verbatim from the grep -rEn pattern.
 * The optional `@` admits the idiomatic Objective-C literal `@"1.2.3"` alongside the
 * C-style `"1.2.3"` (issue #72). It stays a single optional character on purpose — no
 * r/f/b for Python, no r# for Rust: none are idiomatic for a version constant, and every
 * admitted prefix widens the false-positive surface. Exactly three numeric segments, so
 * `"1.2"` and `"nicht.eine.version"` do not match, and `@@"1.2.3"` does not either.
 */
export const VERSION_PATTERN = /(?:VERSION|version)\s*[:=]\s*@?['"]([0-9]+\.[0-9]+\.[0-9]+)['"]/g;

// ---- the three silent grep behaviours, decided explicitly (issue #75, point 8) --------
//
// Each is a deliberate KEEP: this change replaces the mechanism, not the semantics. A
// different finding set would silently re-open the class of bug it is meant to close.
//
// 1. SYMLINKS — not followed, matching `grep -r` (which `-R` would follow). Neither
//    symlinked directories nor symlinked files are read. Falls out of using the dirent's
//    own type: a symlink reports isSymbolicLink(), never isDirectory()/isFile(), which is
//    the same lstat-based test grep makes. A candidate directory named on the *command
//    line* IS followed even when it is a symlink — `[ -d ]` and grep both follow those,
//    hence statSync (not lstatSync) below.
// 2. BINARY FILES — skipped, matching grep, which reports "binary file matches" on stderr
//    and emits no file:line: record. Detected by a NUL byte anywhere in the file; grep
//    only inspects its first buffer, so this is a superset — a file with a NUL past the
//    first 32 KB is skipped here and reported by grep. Accepted: source files carrying a
//    version constant are not binary, and skipping is the safe direction (a skipped file
//    cannot produce a false version match).
// 3. node_modules / dist / build BELOW a candidate directory — NOT excluded, matching
//    grep, which has no such exclusion today. Excluding them would suppress real false
//    positives (`lib/` is often build output) but it is a behaviour change and belongs in
//    its own decision, not smuggled in here (issue #75, open question 4).

function isBinary(buf) {
  return buf.includes(0);
}

/** Directory entries, sorted, so the report is deterministic across filesystems. */
function listSorted(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function scanFile(file, matches, errors) {
  let buf;
  try {
    buf = readFileSync(file);
  } catch (err) {
    errors.push({ path: file, message: err.message });
    return;
  }
  if (isBinary(buf)) return;

  // One record per matching LINE, not per match — grep -n parity. A line with two
  // constants stays one record; `versions` then carries both, `version` the first.
  const lines = buf.toString('utf8').split('\n');
  for (const [i, raw] of lines.entries()) {
    const text = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    VERSION_PATTERN.lastIndex = 0;
    const versions = [...text.matchAll(VERSION_PATTERN)].map((m) => m[1]);
    if (versions.length === 0) continue;
    matches.push({ file, line: i + 1, version: versions[0], versions, text });
  }
}

function walk(dir, matches, errors) {
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = listSorted(current);
    } catch (err) {
      errors.push({ path: current, message: err.message });
      continue;
    }
    // Reverse-pushed so the stack pops in sorted order.
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      const full = join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && EXTENSIONS.some((ext) => entry.name.endsWith(ext))) scanFile(full, matches, errors);
    }
  }
}

function isDir(path) {
  try {
    return statSync(path).isDirectory(); // follows symlinks, like `[ -d ]` and grep's argv handling
  } catch {
    return false;
  }
}

export function scan(repoPath) {
  const present = SRC_DIRS.filter((d) => isDir(join(repoPath, d)));

  if (present.length === 0) {
    const reason = isDir(repoPath)
      ? `no source directory found: ${SRC_DIRS.join(', ')}`
      : `repository path does not exist or is not a directory: ${repoPath}`;
    return { status: 'skipped', reason, repoPath, scannedDirs: [], matches: [], errors: [] };
  }

  const matches = [];
  const errors = [];
  for (const d of present) walk(join(repoPath, d), matches, errors);
  // Grep's own output order is filesystem order; sorting makes the report reproducible
  // without changing which lines are found.
  matches.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));

  return { status: 'scanned', repoPath, scannedDirs: present, matches, errors };
}

const USAGE = 'Usage: node version-sync-scan.mjs <repoPath>';

function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (args.length !== 1) {
    process.stderr.write(`${USAGE}\n`);
    return 1;
  }

  const report = scan(args[0]);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  // stderr stays visible on purpose: 2>/dev/null is what turned a failed scan into a
  // silent "in sync" in the first place (issues #65, #70).
  if (report.status === 'skipped') process.stderr.write(`SKIPPED (${report.reason})\n`);
  for (const e of report.errors) process.stderr.write(`ERROR ${e.path}: ${e.message}\n`);

  return report.errors.length > 0 ? 2 : 0;
}

// Compare via realpath: the script is invoked through a symlinked plugin path, so argv[1]
// (symlink) and import.meta.url (realpath) differ — a raw compare would make this a
// silent no-op. Same guard as agents/project-initializer/scripts/*.mjs.
function invokedDirectly() {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  process.exitCode = main(process.argv);
}
