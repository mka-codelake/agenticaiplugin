// Executes the "Require a workflow-only PR" step of BOTH artifacts that carry it:
// the shipped template, and this repository's own .github/workflows/claude-review.yml.
//
// That step is the only thing standing between a PR that touches the review workflow
// itself and a green check with no review behind it: the action compares the workflow
// against the default branch, skips itself when they differ, and exits green — for
// *every* file in the PR, not just the workflow. The guard has to notice that and say
// so. It is bash inside a YAML block scalar, it grew from two branches to six in #136,
// and until this file nothing ran it.
//
// Why both artifacts and not just the template: the earlier version of this file ran
// the cases against the template alone. The repository's own copy then sat behind it
// for two PRs — three of its cases exited 0 in silence — and no test went red, because
// no test ever looked at the file that actually runs. Checking a stand-in and reporting
// on the original is the same defect the assertions below exist to catch, one level up.
//
// The failure class has landed twice inside the guard itself. The first guard read an
// empty file list as "workflow untouched" and waved the PR through; the test written
// for it wrote that reading down as the expectation instead of catching it. Hence the
// shape of the assertions below: every case pins the exit code AND what was said, and
// the silent cases assert that nothing at all was said — because "silent" is exactly
// what a guard that stopped looking also produces.
//
// The script is EXTRACTED from each artifact, never retyped. A copy here would only
// prove two texts agree — and would keep passing after the artifact changed, which is
// how the earlier version came to check something that no longer existed. If the
// extraction stops finding the step, the anchors below fail loudly rather than leaving
// the suite green over nothing.
//
// Platform: the step is bash and calls `gh --jq`, so running it needs `bash` and `jq`.
// The plugin's hooks are Node-only for Windows' sake (docs/plugin-howto.md) and a test
// that goes red on Windows would be a regression, so a missing tool SKIPS these cases —
// visibly, one skip line per case and per artifact, so nobody mistakes the skip for
// coverage. The extraction contract and the equality assertion are pure Node and run
// everywhere.
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
const REPO = join(HERE, '../..');
const STEP = '- name: Require a workflow-only PR';

/** The path the guard derives from GITHUB_WORKFLOW_REF, i.e. the file it protects. */
const WF = '.github/workflows/claude-review.yml';

// The two artifacts differ in form, not in guard: the template escapes Actions
// expressions as Jinja string literals, this repository's file carries them raw.
// Every case below runs against both.
const ARTIFACTS = [
  { label: 'template', path: join(HERE, 'templates/claude-review.yml.j2') },
  { label: 'this repo', path: join(REPO, WF) },
];

// ---------------------------------------------------------------------------
// Extraction
//
// Everything here throws with a named cause and names the artifact it was reading.
// A structural change (step renamed, `run:` folded differently, real Jinja logic moved
// into the script) must break this file audibly; the one outcome that must never happen
// is an extractor that returns something empty and a suite that then asserts nothing.

/**
 * Turns `{{ '<literal>' }}` back into `<literal>`.
 *
 * That is the only difference in form between the two artifacts: the template has to
 * hide `${{ … }}` from Jinja, so it wraps it in a string literal. Undoing exactly that
 * wrapper — and nothing else — leaves the two texts comparable while any real Jinja
 * (`{% … %}`, `{{ variable }}`) survives and is caught by the assertions below.
 * A no-op on the repository's file.
 */
const unescapeJinjaLiterals = (text) => text.replace(/\{\{\s*'([^']*)'\s*\}\}/g, '$1');

/** The whole guard step — name, `if:`, `env:`, `run:` — dedented to column 0. */
function extractStep({ label, path }) {
  const lines = unescapeJinjaLiterals(readFileSync(path, 'utf8')).split('\n');

  const starts = lines.flatMap((l, i) => (l.includes(STEP) ? [i] : []));
  assert.equal(starts.length, 1, `expected exactly one \`${STEP}\` in the ${label} artifact (${path})`);

  const at = starts[0];
  const indent = lines[at].match(/^\s*/)[0].length;
  const step = [lines[at].slice(indent)];
  for (let i = at + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { step.push(''); continue; }
    if (line.match(/^\s*/)[0].length <= indent) break; // next step, or the end of `steps:`
    step.push(line.slice(indent));
  }
  while (step.length && step.at(-1) === '') step.pop();
  return step;
}

/**
 * The `run:` body of the guard step, dedented to column 0.
 *
 * Cut out of the step rather than out of the file, so a `run: |` belonging to some
 * later step can never stand in for a guard whose own block was renamed away.
 */
function extractGuard(artifact) {
  const { label } = artifact;
  const step = extractStep(artifact);

  const runAt = step.findIndex((l) => /^\s*run: \|\s*$/.test(l));
  assert.notEqual(runAt, -1, `no \`run: |\` block inside the guard step of the ${label} artifact`);

  const indent = step[runAt].match(/^\s*/)[0].length + 2;
  const body = [];
  for (let i = runAt + 1; i < step.length; i++) {
    const line = step[i];
    if (line.trim() === '') { body.push(''); continue; }
    if (line.match(/^\s*/)[0].length < indent) break; // next key of the same step
    body.push(line.slice(indent));
  }
  while (body.length && body.at(-1) === '') body.pop();

  const script = body.join('\n');
  // Anchors, not decoration: each one is something the harness below feeds or fakes.
  // If one is gone, the run would still "pass" while exercising something else.
  assert.ok(body.length >= 30, `${label}: extracted only ${body.length} lines — the step did not come out whole`);
  assert.ok(script.includes('GITHUB_WORKFLOW_REF'), `${label}: extracted script no longer reads GITHUB_WORKFLOW_REF`);
  assert.ok(script.includes('gh api'), `${label}: extracted script no longer calls \`gh api\``);
  // Today the guard's `run:` body holds no Actions expression and no Jinja at all —
  // the `${{ … }}` values live in `env:`, above it. If one ever moves into the body,
  // this fires for both artifacts, and rightly so: the harness runs the body as plain
  // bash, and an unresolved `${{ … }}` or `{% … %}` would make it exercise a text the
  // runner never sees. The fix then is to teach the harness that value, not to widen
  // the unescaping.
  assert.ok(
    !script.includes('{{') && !script.includes('{%'),
    `${label}: extracted script carries an unresolved \`{{\`/\`{%\` — it is not plain bash`,
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
function runGuard(artifact, { files, fail = false, env = {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'wf-guard-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), FAKE_GH);
  chmodSync(join(bin, 'gh'), 0o755);

  const script = join(dir, 'guard.sh');
  writeFileSync(script, extractGuard(artifact));

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
// The structural contract, per artifact
//
// Deliberately NOT skipped: pure Node, and it runs where bash does not. Everything
// below skips on Windows, and a renamed step or a refolded `run:` block would then go
// unnoticed on exactly the platform that never executes the script — the extraction
// breaking quietly is the one failure this file was written to rule out.

for (const art of ARTIFACTS) {
  test(`[${art.label}] the guard step is still where the harness looks for it`, () => {
    assert.ok(extractGuard(art).trim().length > 0);
  });
}

// ---------------------------------------------------------------------------
// The two artifacts are one step in two dresses
//
// This assertion ADDS to the cases below, it does not stand in for them.
//
// What it buys: it catches drift the moment one side is touched, in one place and with
// a diff to look at, instead of as a scatter of failing cases whose common cause has to
// be pieced together. And it covers the whole step — `if:` and `env:` as well as the
// script. That is not padding: before #139 this repository's file read the guarded path
// from a `WORKFLOW_FILE` key in its step `env:` that the template never had. The two
// scripts were comparable; the step around them was not, and no case below would notice,
// because the harness supplies the environment itself.
//
// Why the cases still run twice anyway: this assertion is a claim about form, and forms
// get relaxed. The moment the template gains real Jinja in its script — it is a
// template, that is a plausible future — this comparison has to be loosened or dropped,
// and every statement about the file that actually runs would go with it if the cases
// only ever exercised the template. That is precisely how the repository's copy came to
// sit two PRs behind with three silent cases in it. Running both costs a few hundred
// milliseconds and keeps the verdicts independent of each other.

test('template and repo workflow carry the same guard step', () => {
  const [a, b] = ARTIFACTS.map((art) => extractStep(art));
  const [an, bn] = ARTIFACTS.map((art) => art.label);

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    assert.fail(
      `the guard step differs at line ${i + 1} of the step:\n` +
        `  ${an}: ${a[i] === undefined ? '(step ends here)' : JSON.stringify(a[i])}\n` +
        `  ${bn}: ${b[i] === undefined ? '(step ends here)' : JSON.stringify(b[i])}\n` +
        'Both artifacts must carry the same guard. If the change belongs in only one of ' +
        'them, that is the finding — say so rather than relaxing this test.',
    );
  }
});

// ---------------------------------------------------------------------------
// The nine cases that end green, and the four that end red — run against both artifacts
//
// Marked ← #136 are the three that ran silently green before that PR: a rename away
// from the tracked path (twice) and a truncated file list. They are the reason the
// notice text is asserted and not just the exit code — all three "passed" on exit code
// alone while reporting the PR as untouched. The same three then went on running
// silently green in this repository's own file until #139, which is why the loop below
// exists at all.

for (const art of ARTIFACTS) {
  const at = `[${art.label}]`;
  const run = (spec) => runGuard(art, spec);

  test(`${at} untouched PR: exit 0 and not a word`, { skip: SKIP }, () => {
    const r = run({ files: [file('modified', 'README.md'), file('added', 'src/a.js')] });
    assert.equal(r.code, 0);
    assert.equal(r.log.trim(), '', 'a PR that leaves the workflow alone must produce no annotation');
    assert.equal(r.summary.trim(), '');
  });

  test(`${at} workflow modified, alone in the PR: exit 0 with a notice that no review ran`, { skip: SKIP }, () => {
    const r = run({ files: [file('modified', WF)] });
    assert.equal(r.code, 0);
    assert.match(r.log, /::notice::This PR only changes \.github\/workflows\/claude-review\.yml/);
    assert.match(r.summary, /No review ran — workflow-only PR/);
  });

  test(`${at} workflow modified alongside other files: exit 1 and a split order`, { skip: SKIP }, () => {
    const r = run({ files: [file('modified', WF), ...others(2)] });
    assert.equal(r.code, 1);
    assert.match(r.log, /::error::This PR changes .* alongside 2 other file\(s\)/);
    assert.doesNotMatch(r.log, /::notice::/, 'a rejected PR must not also carry a green notice');
    assert.match(r.summary, /Split this pull request/);
    assert.match(r.summary, /Land the change to .* as its own PR, and merge it/);
  });

  test(`${at} workflow added, alone: exit 0, named as the bootstrap PR`, { skip: SKIP }, () => {
    const r = run({ files: [file('added', WF)] });
    assert.equal(r.code, 0, 'the first PR must stay green — the setup order depends on it');
    assert.match(r.log, /::notice::.*does not exist on the default branch yet/);
    assert.match(r.summary, /Read this diff by hand before merging/);
    assert.doesNotMatch(r.summary, /went unreviewed/, 'there is no other file in this PR');
  });

  test(`${at} workflow added alongside other files: exit 0, but the summary counts what went unreviewed`, { skip: SKIP }, () => {
    const r = run({ files: [file('added', WF), ...others(1)] });
    assert.equal(r.code, 0, 'splitting cannot help before the workflow is on the default branch');
    assert.match(r.log, /::notice::.*does not exist on the default branch yet/);
    assert.match(r.summary, /\*\*The other 1 file\(s\) in this PR went unreviewed with it\.\*\*/);
  });

  test(`${at} workflow renamed AWAY from the tracked path, alone: exit 0, and the notice names the rename`, { skip: SKIP }, () => {
    // ← #136. `filename` is the NEW path, so matching it alone finds nothing here and the
    // guard used to report "untouched" — exit 0 without a word, while the action skipped
    // itself because the file had moved. Same exit code as a healthy run; only the text
    // tells them apart, which is why the text is asserted.
    const r = run({ files: [file('renamed', '.github/workflows/review.yml', WF)] });
    assert.equal(r.code, 0);
    assert.match(
      r.log,
      /::notice::This PR only renames \.github\/workflows\/claude-review\.yml to \.github\/workflows\/review\.yml/,
    );
  });

  test(`${at} workflow renamed AWAY from the tracked path, with other files: exit 1`, { skip: SKIP }, () => {
    // ← #136. This one went green *and* let the PR through.
    const r = run({ files: [file('renamed', '.github/workflows/review.yml', WF), ...others(2)] });
    assert.equal(r.code, 1);
    assert.match(r.log, /::error::This PR renames .* to .* alongside 2 other file\(s\)/);
  });

  test(`${at} a file renamed TOWARD the tracked path, alone: exit 0 with a notice`, { skip: SKIP }, () => {
    // The new path matches, so `state` is "renamed" from the first lookup and `moved_to`
    // is empty: the wording stays "changes", which is right — the diff is at that path.
    const r = run({ files: [file('renamed', WF, '.github/workflows/old.yml')] });
    assert.equal(r.code, 0);
    assert.match(r.log, /::notice::This PR only changes \.github\/workflows\/claude-review\.yml/);
  });

  test(`${at} empty file list from a successful call: exit 1, not "untouched"`, { skip: SKIP }, () => {
    // The original defect. Every PR has at least one file, so an empty list is a lookup
    // that did not work — and reading it as "untouched" is what waved a PR through.
    const r = run({ files: [] });
    assert.equal(r.code, 1);
    assert.match(r.log, /::error::.*the API call succeeded but returned nothing/);
  });

  test(`${at} failing \`gh\`: exit 1 without a verdict`, { skip: SKIP }, () => {
    const r = run({ fail: true });
    assert.equal(r.code, 1);
    assert.doesNotMatch(r.log, /::notice::/, 'a failed lookup must not end in a green annotation');
  });

  // Every GITHUB_WORKFLOW_REF from which no path can be read has to end the step, because
  // the guard's own answer to "no path" is to match nothing — and it reports matching
  // nothing as "untouched". Each case below is run against a PR that DOES change the
  // workflow next to another file, i.e. one the guard must reject: a green exit here is
  // not a lenient reading, it is the guard walking past the thing it exists to catch.
  //
  // The value-without-a-path cases were a measured defect, not a hypothetical. The strip
  // `${GITHUB_WORKFLOW_REF#*/*/}` only cuts when the shape matches; with fewer than two
  // slashes it hands back the value unchanged, and the emptiness check then waves through
  // a `workflow_file` of "acme/widget" — non-empty, matching no file, exit 0 without a
  // word. The trailing case is the one a plain shape test still misses: two slashes are
  // there, so the shape passes, but the path part is empty once "@<ref>" comes off.
  for (const [refLabel, ref, expected] of [
    ['unset', '', /::error::GITHUB_WORKFLOW_REF is not set/],
    ['owner/repo, nothing to strip', 'acme/widget', /::error::GITHUB_WORKFLOW_REF is "acme\/widget", which yields no/],
    ['a single word', 'acme', /::error::GITHUB_WORKFLOW_REF is "acme", which yields no/],
    ['right shape, empty path part', 'acme/widget/@refs/heads/main', /which yields no <owner>\/<repo>\/<path>/],
  ]) {
    test(`${at} GITHUB_WORKFLOW_REF ${refLabel}: exit 1 with the cause named`, { skip: SKIP }, () => {
      const r = run({
        files: [file('modified', WF), ...others(1)],
        env: { GITHUB_WORKFLOW_REF: ref },
      });
      assert.equal(r.code, 1, 'a PR that changes the workflow must not pass on an unreadable ref');
      assert.match(r.log, expected);
      assert.doesNotMatch(r.log, /::notice::/, 'nothing was checked, so nothing may be waved through');
    });
  }

  // The two aborts must stay distinguishable in the log: "the variable is missing" and
  // "the variable holds something unusable" send whoever reads it to different places.
  test(`${at} the unset and the unreadable ref do not share one message`, { skip: SKIP }, () => {
    const pr = [file('modified', WF), ...others(1)];
    const unset = run({ files: pr, env: { GITHUB_WORKFLOW_REF: '' } });
    const junk = run({ files: pr, env: { GITHUB_WORKFLOW_REF: 'acme/widget' } });
    assert.notEqual(unset.log.trim(), junk.log.trim());
    assert.doesNotMatch(unset.log, /is "/, 'there is no value to quote when the variable is unset');
    assert.match(junk.log, /acme\/widget/, 'the unusable value belongs in the message');
  });

  test(`${at} ${CAP} files without the workflow among them: exit 1, naming the cap`, { skip: SKIP }, () => {
    // ← #136. At the cap the list may be cut off and "not in the list" stops meaning
    // "untouched", so the guard must refuse instead of ruling on a PR it never saw whole.
    const r = run({ files: others(CAP) });
    assert.equal(r.code, 1);
    assert.match(r.log, new RegExp(`::error::PR #42 reports ${CAP} changed files, the maximum`));
    assert.match(r.log, /the list may be truncated/);
  });

  test(`${at} ${CAP} files with the workflow among them: exit 1 as a split, not as a truncation`, { skip: SKIP }, () => {
    // The cap check must not swallow a case that was decided on evidence: the workflow IS
    // in the list, so the reason given has to be the split — same exit code, different
    // instruction to the author.
    const r = run({ files: [file('modified', WF), ...others(CAP - 1)] });
    assert.equal(r.code, 1);
    assert.match(r.log, new RegExp(`::error::This PR changes .* alongside ${CAP - 1} other file\\(s\\)`));
    assert.doesNotMatch(r.log, /may be truncated/, 'the workflow was seen — truncation is not the reason');
  });
}
