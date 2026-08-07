// Guards the `file:line "fragment"` citations in docs/context-map.md. The map
// justifies its own value by every CODE statement being checkable at a named
// line, so a citation that no longer resolves — or that still resolves but now
// points at unrelated content — takes the ground out from under it.
//
// History of what went wrong before this guard checked content: inserting a
// 17-line header into an unrelated file once pointed eight citations into the
// void; a later full check found four more aimed at the wrong content and nine
// in short form without a path. The short forms are gone, but drift kept
// happening — on 2026-08-07 four citations pointed at the wrong content while
// this test was green. Two review passes over the same file found two of them
// and three of them respectively; reading is not a reliable check here, which
// is why each citation now carries a fragment the test can verify itself.
//
// Lives next to its subject, the way hooks/hooks-policy.test.mjs sits next to
// hooks.json — it guards exactly one document, not the repo at large.
// Run with: node --test

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MAP = join(REPO_ROOT, 'docs', 'context-map.md');

// `path/file.ext:12 "fragment"` or `path/file.ext:12-34 "fragment"`, in backticks
// or free-standing. Citations are repo-root relative. The fragment is optional in
// the pattern but NOT optional in the document — a citation matched without one
// fails the test below. Making it optional here is what lets the test name the
// offender instead of silently not seeing it, which is how the earlier short-form
// citations (`SOME_CONST:84-90`, no path, no extension) escaped for months.
const CITATION = /([\w./-]+\.(?:mjs|js|md|json|ya?ml)):(\d+)(?:-(\d+))?(?:\s+"([^"]*)")?/g;

function lineCount(text) {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop(); // trailing newline is not a line
  return lines.length;
}

// Citations span line breaks, and the map wraps its prose, so both sides are
// compared with runs of whitespace collapsed to a single space.
function normalize(s) {
  return s.replace(/\s+/g, ' ').trim();
}

// Where does `fragment` actually sit? Reported on failure so the fix is a
// number, not a search. Joins the file into one normalized string while
// recording which source line every character came from, then maps the first
// occurrence back to its line. No window, no bound on how many lines a
// fragment may wrap across, and the first occurrence is first by construction.
//
// Two earlier attempts scanned fixed windows instead, and both were wrong in a
// way reading did not reveal: the first reported the window's start (off by two
// against a simulated drift), the second trimmed the window from the front and
// so reported the LAST occurrence inside it rather than the first — 1978 of
// 38192 exhaustively enumerated inputs. Neither error was dangerous, but a
// guard against citations stating more than they establish must not do it
// itself.
function locate(lines, fragment) {
  let joined = '';
  const owner = []; // owner[i] = index of the source line that joined[i] came from
  lines.forEach((line, index) => {
    const text = normalize(line);
    if (text === '') return; // blank lines contribute nothing and own nothing
    if (joined !== '') {
      joined += ' ';
      owner.push(index);
    }
    for (let k = 0; k < text.length; k++) {
      joined += text[k];
      owner.push(index);
    }
  });
  const at = joined.indexOf(fragment);
  return at === -1 ? null : owner[at] + 1;
}

// LIMIT OF THIS GUARD — deliberately named here and in the test title:
// it verifies that the quoted fragment appears within the cited line range. It
// does NOT verify that the fragment is unique in the file, so a fragment that
// occurs several times can drift onto another occurrence and stay green. Pick
// fragments distinctive enough that this does not arise. It also cannot judge
// whether the map's *claim* about those lines is a fair reading of them — that
// stays reading work. A test that suggested more coverage than it has would be
// exactly the defect this revision was written to remove; it must not reappear.
test('every file:line citation in the context map carries a fragment found at those lines', () => {
  const text = readFileSync(MAP, 'utf8');

  const citations = new Map(); // deduplicated: literal citation -> [file, from, to, fragment]
  for (const [literal, file, from, to, fragment] of text.matchAll(CITATION)) {
    citations.set(literal, [file, Number(from), Number(to ?? from), fragment]);
  }
  assert.ok(
    citations.size >= 10,
    `only ${citations.size} citations extracted — the extraction pattern is probably broken`,
  );

  const broken = [];
  for (const [citation, [file, from, to, fragment]] of citations) {
    const path = join(REPO_ROOT, file);

    if (!existsSync(path)) {
      broken.push(`${citation}: file does not exist`);
      continue;
    }
    const source = readFileSync(path, 'utf8').split(/\r?\n/);
    if (source.at(-1) === '') source.pop();
    const lines = lineCount(readFileSync(path, 'utf8'));

    if (to > lines) {
      broken.push(`${citation}: file has only ${lines} lines`);
      continue;
    }
    if (from > to) {
      broken.push(`${citation}: inverted line range`);
      continue;
    }
    if (fragment === undefined) {
      broken.push(`${citation}: no verification fragment — append one as "…" after the line number`);
      continue;
    }
    if (normalize(fragment) === '') {
      broken.push(`${citation}: empty verification fragment`);
      continue;
    }

    const wanted = normalize(fragment);
    const cited = normalize(source.slice(from - 1, to).join(' '));
    if (cited.includes(wanted)) continue;

    const found = locate(source, wanted);
    broken.push(
      found === null
        ? `${citation}: fragment not found anywhere in ${file} — the quote or the file changed`
        : `${citation}: fragment not in the cited range; it is at ${file}:${found}`,
    );
  }

  assert.deepEqual(broken, [], 'context-map citations must quote content found at the cited lines');
});

// The line number `locate` reports is the whole value of a failure message here:
// it turns a repointing into a number instead of a search. Two implementations of
// it were wrong before this test existed, and the map's own citations did not
// exercise the cases that broke — they were found by hand-run simulations that
// would otherwise have been lost with the session. This pins them down.
test('locate reports the first line a fragment starts on', () => {
  const at = (lines, fragment) => locate(lines, fragment);

  assert.equal(at(['alpha', 'beta', 'gamma'], 'beta'), 2, 'match inside a single line');
  assert.equal(at(['alpha beta', 'gamma delta'], 'beta gamma'), 1, 'match wrapping two lines');
  assert.equal(at(['alpha', 'beta'], 'nowhere'), null, 'absent fragment');

  // Regression, exhaustively enumerated: a window-trimming implementation
  // reported the LAST occurrence within its window instead of the first.
  assert.equal(at(['dup', 'dup'], 'dup'), 1, 'repeated fragment resolves to the first');
  assert.equal(at(['x', 'dup', 'y', 'dup'], 'dup'), 2, 'repeated fragment, first is not line 1');

  // Blank lines own no characters but still count when numbering.
  assert.equal(at(['alpha', '', '   ', 'omega'], 'omega'), 4, 'blank lines do not shift the count');

  // No bound on how far a fragment may wrap — the earlier window-based versions
  // capped this at three lines and would have missed it.
  assert.equal(at(['a', 'b', 'c', 'd', 'e', 'f'], 'b c d e'), 2, 'match spanning four lines');
});
