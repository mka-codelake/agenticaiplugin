// Repo-level hygiene guards for markdown that ships with the plugin.
// Both suites below guard classes of defect that so far only a human PR review
// caught. They live in one root-level file because neither has a single module
// to sit next to: the first walks every markdown file in the repo, the second
// couples doctrine/**/*.md to three summaries in three different directories.
// Run with: node --test

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

/** Markdown files that are part of the repo: tracked plus new-but-not-ignored. */
function repoMarkdownFiles() {
  const git = spawnSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '*.md'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(git.status, 0, `git ls-files failed: ${git.stderr}`);
  const files = git.stdout.split('\0').filter(Boolean);
  assert.ok(files.length > 50, `expected the repo markdown corpus, got ${files.length} files`);
  return files;
}

// A docs file once ended with the literal lines `</content>` and `</invoke>` —
// fragments of tool-call syntax that a translating agent wrote into the text.
// The file is listed as a key file in CLAUDE.md, i.e. future agents read it, so
// in form and effect it is a prompt injection even though it arose harmlessly.
//
// Tag names covered: the elements of the tool-call wire format an agent can leak
// while writing a file — the invocation envelope (`function_calls`), the call
// (`invoke`), its arguments (`parameter`), the file payload (`content`), and the
// result envelope (`function_results`), each with an optional namespace prefix
// (`antml:`), opening or closing.
//
// RULE (this is what keeps the guard usable): only a line that consists of
// *nothing but* such a tag is an offense. Documentation may talk about the
// syntax — inline, in backticks, in prose — because those lines carry other
// text as well. The cost of that rule: an example that puts a bare tag on its
// own line inside a fenced code block would be flagged; write such an example
// inline or indented with surrounding text.
const TOOL_CALL_TAG_LINE =
  /^<\/?(?:[a-z][\w.-]*:)?(?:invoke|function_calls|function_results|parameter|content)\b[^>]*>$/;

test('no markdown file carries a bare tool-call syntax fragment on its own line', () => {
  const offenders = [];
  for (const file of repoMarkdownFiles()) {
    const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (TOOL_CALL_TAG_LINE.test(line.trim())) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(
    offenders,
    [],
    'tool-call syntax fragments in shipped markdown read as prompt injection to the next agent',
  );
});

// ---------------------------------------------------------------------------

// The doctrine rule `Explain WHAT and WHY before changing code` was renamed to
// `Present the design before implementing` in doctrine/constitution/base.md. Three
// places summarize the doctrine in prose and kept carrying the old name; two
// were fixed because a reviewer named them, the third surfaced a round later.
//
// The table below is the documented place of that coupling. Per doctrine
// heading it holds one characteristic marker *per summary file* — not one
// marker for all three, because the three paraphrase differently ("ask instead
// of assume" vs. "ask-before-assuming"), and a marker loose enough to match all
// wordings would be too loose to fail on a rename.
//
// Two checks follow from it:
//   1. The set of H2 headings in doctrine/**/*.md equals the set of table
//      keys. Renaming, adding or dropping a rule turns this red first.
//   2. Every marker occurs in its summary file. Whoever fixes check 1 lands in
//      this table and is dragged past the summaries in the process.
//
// Accepted cost: rewording a summary without touching the doctrine also turns
// the test red. That is a prompt to re-check the marker, not a defect — the
// markers are matched case-insensitively against whitespace-normalized text, so
// pure reflow or reformatting does not trip it.
//
// SUMMARY_FILES is the floor, not the ceiling: these three summarize EVERY rule,
// one per audience — README.md for the outside, skills/help/SKILL.md inside a
// session, docs/architecture.md for whoever works on the plugin. So every heading
// must have a marker for each of them. Other files reference a single rule
// (skills/council/SKILL.md quotes one heading by name) — they are listed under
// that heading alone, and the coverage check below therefore requires the three,
// not exactly the three.
const SUMMARY_FILES = ['README.md', 'skills/help/SKILL.md', 'docs/architecture.md'];

const DOCTRINE_SUMMARY_MARKERS = {
  'Never assume — ask': {
    'README.md': /ask instead of assume/i,
    'skills/help/SKILL.md': /ask instead of assume/i,
    'docs/architecture.md': /ask[\s-]before[\s-]assuming/i,
  },
  'Present the design before implementing': {
    'README.md': /present the design and wait for a go before implementing/i,
    'skills/help/SKILL.md': /present the design before implementing/i,
    'docs/architecture.md': /present[\s-]the[\s-]design[\s-]and[\s-]wait[\s-]for[\s-]a[\s-]go/i,
  },
  'Surgical, minimal scope': {
    'README.md': /minimal scope/i,
    'skills/help/SKILL.md': /minimal scope/i,
    // docs/architecture.md states this rule twice: once in the doctrine summary
    // it now carries, once as a paraphrase of its own ("the smallest wins") in
    // the scope section. The marker guards the summary — that is what
    // SUMMARY_FILES is for — so the paraphrase gets no second key here.
    'docs/architecture.md': /minimal scope/i,
    'skills/council/SKILL.md': /surgical, minimal scope/i, // names the heading verbatim
  },
  'Be honest and transparent': {
    'README.md': /honest/i,
    'skills/help/SKILL.md': /honest/i,
    'docs/architecture.md': /honest/i,
  },
  Commits: {
    'README.md': /commit path/i,
    'skills/help/SKILL.md': /git commits via skill/i,
    'docs/architecture.md': /raw `git commit`/i,
  },
  'Automatic code review after completing a task': {
    'README.md': /automatic code[\s-]review/i,
    'skills/help/SKILL.md': /automatic code[\s-]review/i,
    'docs/architecture.md': /automatic code[\s-]review/i,
  },
  'PR review monitoring': {
    'README.md': /PR[\s-]review[\s-]monitoring/i,
    'skills/help/SKILL.md': /PR[\s-]review[\s-]monitoring/i,
    'docs/architecture.md': /PR[\s-]review[\s-]monitoring/i,
  },
};

function doctrineHeadings() {
  const dir = join(REPO_ROOT, 'doctrine');
  const git = spawnSync('git', ['ls-files', '-z', 'doctrine/constitution/*.md', 'doctrine/themes/*.md'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, `git ls-files failed: ${git.stderr}`);
  const files = git.stdout.split('\0').filter(Boolean);
  assert.ok(files.length > 0, 'no doctrine files found — the guard would be vacuous');

  const headings = [];
  for (const file of files) {
    const text = readFileSync(join(REPO_ROOT, file), 'utf8');
    for (const m of text.matchAll(/^##\s+(.+?)\s*$/gm)) headings.push(m[1]);
  }
  assert.ok(headings.length > 0, `no H2 headings found under ${dir}`);
  return headings;
}

test('every doctrine rule has an entry in the summary marker table', () => {
  assert.deepEqual(
    doctrineHeadings().sort(),
    Object.keys(DOCTRINE_SUMMARY_MARKERS).sort(),
    'a doctrine rule was renamed, added or removed — update the marker table above ' +
      'and the summaries in ' + markerFiles().join(', '),
  );
});

/** Every file the marker table refers to, the three summaries included. */
function markerFiles() {
  const files = new Set(SUMMARY_FILES);
  for (const markers of Object.values(DOCTRINE_SUMMARY_MARKERS)) {
    for (const file of Object.keys(markers)) files.add(file);
  }
  return [...files];
}

test('every doctrine rule is named in all three doctrine summaries', () => {
  const texts = new Map(
    markerFiles().map((f) => [f, readFileSync(join(REPO_ROOT, f), 'utf8').replace(/\s+/g, ' ')]),
  );

  for (const [heading, markers] of Object.entries(DOCTRINE_SUMMARY_MARKERS)) {
    const missing = SUMMARY_FILES.filter((f) => !(f in markers));
    assert.deepEqual(
      missing,
      [],
      `"${heading}": the marker table must cover every summary file`,
    );
    for (const [file, marker] of Object.entries(markers)) {
      // assert.ok, not assert.match: a failing match would dump the whole
      // normalized file as "actual" and bury the message.
      assert.ok(
        marker.test(texts.get(file)),
        `${file} no longer names the doctrine rule "${heading}" (marker ${marker})`,
      );
    }
  }
});

test('the doctrine summary files exist where the marker table expects them', () => {
  for (const file of markerFiles()) {
    assert.ok(existsSync(join(REPO_ROOT, file)), `${file} is missing — marker table is stale`);
  }
});
