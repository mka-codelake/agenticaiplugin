// Executes the "Require a workflow-only PR" step of templates/claude-review.yml.j2.
//
// That step is the only thing standing between a PR that touches the review workflow
// itself and a green check with no review behind it: the action compares the workflow
// against the default branch, skips itself when they differ, and exits green — for
// *every* file in the PR, not just the workflow. The guard has to notice that and say
// so. It is bash inside a YAML block scalar, it grew from two branches to six in #136,
// and until this file nothing ran it.
//
// The failure class has landed twice here. The first guard read an empty file list as
// "workflow untouched" and waved the PR through; the test written for it wrote that
// reading down as the expectation instead of catching it. Hence the shape of the
// assertions below: every case pins the exit code AND what was said, and the silent
// cases assert that nothing at all was said — because "silent" is exactly what a guard
// that stopped looking also produces.
//
// The script is EXTRACTED from the shipped template, never retyped. A copy here would
// only prove two texts agree — and would keep passing after the template changed, which
// is how the earlier version came to check something that no longer existed. If the
// extraction stops finding the step, the anchors below fail loudly rather than leaving
// the suite green over nothing.
//
// Platform: the step is bash and calls `gh --jq`, so running it needs `bash` and `jq`.
// The plugin's hooks are Node-only for Windows' sake (docs/plugin-howto.md) and a test
// that goes red on Windows would be a regression, so a missing tool SKIPS these cases —
// visibly, one skip line per case, so nobody mistakes the skip for coverage. The
// extraction contract itself is pure Node and runs everywhere.
//
// Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(HERE, 'templates/claude-review.yml.j2');
const STEP = '- name: Require a workflow-only PR';

/** The path the guard derives from GITHUB_WORKFLOW_REF, i.e. the file it protects. */
const WF = '.github/workflows/claude-review.yml';

// ---------------------------------------------------------------------------
// Extraction
//
// Everything here throws with a named cause. A structural change to the template
// (step renamed, `run:` folded differently, Jinja moved into the script) must break
// this file audibly; the one outcome that must never happen is an extractor that
// returns something empty and a suite that then asserts nothing.

/** The `run:` body of the guard step, dedented to column 0. */
function extractGuard() {
  const lines = readFileSync(TEMPLATE, 'utf8').split('\n');

  const starts = lines.flatMap((l, i) => (l.includes(STEP) ? [i] : []));
  assert.equal(starts.length, 1, `expected exactly one \`${STEP}\` in ${TEMPLATE}`);

  const runAt = lines.findIndex((l, i) => i > starts[0] && /^\s*run: \|\s*$/.test(l));
  assert.notEqual(runAt, -1, `no \`run: |\` block after \`${STEP}\``);

  const indent = lines[runAt].match(/^\s*/)[0].length + 2;
  const body = [];
  for (let i = runAt + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { body.push(''); continue; }
    if (line.match(/^\s*/)[0].length < indent) break; // next key or next step
    body.push(line.slice(indent));
  }
  while (body.length && body.at(-1) === '') body.pop();

  const script = body.join('\n');
  // Anchors, not decoration: each one is something the harness below feeds or fakes.
  // If one is gone, the run would still "pass" while exercising something else.
  assert.ok(body.length >= 30, `extracted only ${body.length} lines — the step did not come out whole`);
  assert.ok(script.includes('GITHUB_WORKFLOW_REF'), 'extracted script no longer reads GITHUB_WORKFLOW_REF');
  assert.ok(script.includes('gh api'), 'extracted script no longer calls `gh api`');
  assert.ok(
    !script.includes('{{') && !script.includes('{%'),
    'extracted script carries Jinja markers — it would not run as plain bash',
  );
  return script + '\n';
}

// ---------------------------------------------------------------------------
// Harness

const has = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;
const missing = ['bash', 'jq'].filter((c) => !has(c));
// `false` means "run it"; a string is printed as the skip reason for every case.
const SKIP = missing.length ? `needs ${missing.join(' and ')} on PATH (Windows: expected)` : false;

/**
 * A stand-in for `gh` that answers `gh api …/files --paginate --jq EXPR` by applying
 * EXPR with the real jq to a fixture. Real jq on purpose: the `--jq` expression is part
 * of the guard — dropping `.previous_filename` from it is one of the defects this file
 * exists to catch, and a hand-rolled stub would answer for jq instead of asking it.
 * FIXTURE=__fail__ plays a failing API call.
 */
const FAKE_GH = `#!/usr/bin/env bash
set -u
if [ "$FIXTURE" = "__fail__" ]; then
  echo "gh: HTTP 502" >&2
  exit 1
fi
expr=""
prev=""
for arg in "$@"; do
  if [ "$prev" = "--jq" ]; then expr="$arg"; fi
  prev="$arg"
done
if [ -z "$expr" ]; then
  echo "fake gh: no --jq expression in: $*" >&2
  exit 1
fi
jq -r "$expr" < "$FIXTURE"
`;

/**
 * Runs the guard once.
 *
 * `bash --noprofile --norc -e` mirrors what Actions does with a `run:` step that names
 * no `shell:` — `bash -e {0}`. No `-o pipefail`: adding it would make the harness
 * stricter than the runtime and could hide a difference rather than show one. The
 * profile flags only keep a developer's shell config out of the run.
 */
function runGuard({ files, fail = false, env = {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'wf-guard-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), FAKE_GH);
  chmodSync(join(bin, 'gh'), 0o755);

  const script = join(dir, 'guard.sh');
  writeFileSync(script, extractGuard());

  const fixture = fail ? '__fail__' : join(dir, 'files.json');
  if (!fail) writeFileSync(fixture, JSON.stringify(files));

  const summaryPath = join(dir, 'summary.md');
  writeFileSync(summaryPath, '');

  const res = spawnSync('bash', ['--noprofile', '--norc', '-e', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      FIXTURE: fixture,
      GITHUB_WORKFLOW_REF: `acme/widget/${WF}@refs/heads/main`,
      GITHUB_REPOSITORY: 'acme/widget',
      PR_NUMBER: '42',
      RUNNER_TEMP: dir,
      GITHUB_STEP_SUMMARY: summaryPath,
      GH_TOKEN: 'x',
      ...env,
    },
  });

  return {
    code: res.status,
    log: (res.stdout ?? '') + (res.stderr ?? ''),
    summary: readFileSync(summaryPath, 'utf8'),
  };
}

/** One entry of the `gh api …/files` response. */
const file = (status, filename, previous_filename) =>
  previous_filename === undefined ? { status, filename } : { status, filename, previous_filename };

/** `n` unrelated files, so a case can be "the workflow plus other things". */
const others = (n) => Array.from({ length: n }, (_, i) => file('modified', `src/file-${i}.txt`));

// The API caps a pull request at 3000 files, `--paginate` included. Both cap cases use
// exactly that number, because the guard's condition is `-ge 3000`.
const CAP = 3000;

// ---------------------------------------------------------------------------
// The structural contract
//
// Deliberately NOT skipped: it is pure Node and runs where bash does not. Everything
// below it skips on Windows, and a renamed step or a refolded `run:` block would then
// go unnoticed on exactly the platform that never executes the script — the extraction
// breaking quietly is the one failure this file was written to rule out.

test('the guard step is still where the harness looks for it', () => {
  assert.ok(extractGuard().trim().length > 0);
});

// ---------------------------------------------------------------------------
// The nine cases that end green, and the four that end red
//
// Marked ← #136 are the three that ran silently green before that PR: a rename away
// from the tracked path (twice) and a truncated file list. They are the reason the
// notice text is asserted and not just the exit code — all three "passed" on exit code
// alone while reporting the PR as untouched.

test('untouched PR: exit 0 and not a word', { skip: SKIP }, () => {
  const r = runGuard({ files: [file('modified', 'README.md'), file('added', 'src/a.js')] });
  assert.equal(r.code, 0);
  assert.equal(r.log.trim(), '', 'a PR that leaves the workflow alone must produce no annotation');
  assert.equal(r.summary.trim(), '');
});

test('workflow modified, alone in the PR: exit 0 with a notice that no review ran', { skip: SKIP }, () => {
  const r = runGuard({ files: [file('modified', WF)] });
  assert.equal(r.code, 0);
  assert.match(r.log, /::notice::This PR only changes \.github\/workflows\/claude-review\.yml/);
  assert.match(r.summary, /No review ran — workflow-only PR/);
});

test('workflow modified alongside other files: exit 1 and a split order', { skip: SKIP }, () => {
  const r = runGuard({ files: [file('modified', WF), ...others(2)] });
  assert.equal(r.code, 1);
  assert.match(r.log, /::error::This PR changes .* alongside 2 other file\(s\)/);
  assert.doesNotMatch(r.log, /::notice::/, 'a rejected PR must not also carry a green notice');
  assert.match(r.summary, /Split this pull request/);
  assert.match(r.summary, /Land the change to .* as its own PR, and merge it/);
});

test('workflow added, alone: exit 0, named as the bootstrap PR', { skip: SKIP }, () => {
  const r = runGuard({ files: [file('added', WF)] });
  assert.equal(r.code, 0, 'the first PR must stay green — the setup order depends on it');
  assert.match(r.log, /::notice::.*does not exist on the default branch yet/);
  assert.match(r.summary, /Read this diff by hand before merging/);
  assert.doesNotMatch(r.summary, /went unreviewed/, 'there is no other file in this PR');
});

test('workflow added alongside other files: exit 0, but the summary counts what went unreviewed', { skip: SKIP }, () => {
  const r = runGuard({ files: [file('added', WF), ...others(1)] });
  assert.equal(r.code, 0, 'splitting cannot help before the workflow is on the default branch');
  assert.match(r.log, /::notice::.*does not exist on the default branch yet/);
  assert.match(r.summary, /\*\*The other 1 file\(s\) in this PR went unreviewed with it\.\*\*/);
});

test('workflow renamed AWAY from the tracked path, alone: exit 0, and the notice names the rename', { skip: SKIP }, () => {
  // ← #136. `filename` is the NEW path, so matching it alone finds nothing here and the
  // guard used to report "untouched" — exit 0 without a word, while the action skipped
  // itself because the file had moved. Same exit code as a healthy run; only the text
  // tells them apart, which is why the text is asserted.
  const r = runGuard({ files: [file('renamed', '.github/workflows/review.yml', WF)] });
  assert.equal(r.code, 0);
  assert.match(
    r.log,
    /::notice::This PR only renames \.github\/workflows\/claude-review\.yml to \.github\/workflows\/review\.yml/,
  );
});

test('workflow renamed AWAY from the tracked path, with other files: exit 1', { skip: SKIP }, () => {
  // ← #136. This one went green *and* let the PR through.
  const r = runGuard({ files: [file('renamed', '.github/workflows/review.yml', WF), ...others(2)] });
  assert.equal(r.code, 1);
  assert.match(r.log, /::error::This PR renames .* to .* alongside 2 other file\(s\)/);
});

test('a file renamed TOWARD the tracked path, alone: exit 0 with a notice', { skip: SKIP }, () => {
  // The new path matches, so `state` is "renamed" from the first lookup and `moved_to`
  // is empty: the wording stays "changes", which is right — the diff is at that path.
  const r = runGuard({ files: [file('renamed', WF, '.github/workflows/old.yml')] });
  assert.equal(r.code, 0);
  assert.match(r.log, /::notice::This PR only changes \.github\/workflows\/claude-review\.yml/);
});

test('empty file list from a successful call: exit 1, not "untouched"', { skip: SKIP }, () => {
  // The original defect. Every PR has at least one file, so an empty list is a lookup
  // that did not work — and reading it as "untouched" is what waved a PR through.
  const r = runGuard({ files: [] });
  assert.equal(r.code, 1);
  assert.match(r.log, /::error::.*the API call succeeded but returned nothing/);
});

test('failing `gh`: exit 1 without a verdict', { skip: SKIP }, () => {
  const r = runGuard({ fail: true });
  assert.equal(r.code, 1);
  assert.doesNotMatch(r.log, /::notice::/, 'a failed lookup must not end in a green annotation');
});

test('missing GITHUB_WORKFLOW_REF: exit 1 rather than comparing against an empty path', { skip: SKIP }, () => {
  // An empty path makes every comparison "matches everything" — or, as here, nothing —
  // and the guard would report untouched for a PR it never checked.
  //
  // Known gap, deliberately not asserted here because it would be a red test rather than
  // a covered case: the abort triggers on an EMPTY path only. `GITHUB_WORKFLOW_REF` with
  // too few slashes to strip (`acme/widget`) leaves `workflow_file` holding that raw
  // string — non-empty, matching no file, so the guard reports untouched and exits 0
  // without a word for a PR that does change the workflow. Measured. Actions always sets
  // the full ref, so this needs the same "if it ever does not" that motivated the abort.
  const r = runGuard({ files: [file('modified', WF)], env: { GITHUB_WORKFLOW_REF: '' } });
  assert.equal(r.code, 1);
  assert.match(r.log, /::error::GITHUB_WORKFLOW_REF yielded no workflow path/);
});

test(`${CAP} files without the workflow among them: exit 1, naming the cap`, { skip: SKIP }, () => {
  // ← #136. At the cap the list may be cut off and "not in the list" stops meaning
  // "untouched", so the guard must refuse instead of ruling on a PR it never saw whole.
  const r = runGuard({ files: others(CAP) });
  assert.equal(r.code, 1);
  assert.match(r.log, new RegExp(`::error::PR #42 reports ${CAP} changed files, the maximum`));
  assert.match(r.log, /the list may be truncated/);
});

test(`${CAP} files with the workflow among them: exit 1 as a split, not as a truncation`, { skip: SKIP }, () => {
  // The cap check must not swallow a case that was decided on evidence: the workflow IS
  // in the list, so the reason given has to be the split — same exit code, different
  // instruction to the author.
  const r = runGuard({ files: [file('modified', WF), ...others(CAP - 1)] });
  assert.equal(r.code, 1);
  assert.match(r.log, new RegExp(`::error::This PR changes .* alongside ${CAP - 1} other file\\(s\\)`));
  assert.doesNotMatch(r.log, /may be truncated/, 'the workflow was seen — truncation is not the reason');
});
