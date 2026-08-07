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
// number, not a search. Scans windows of the same height as the citation (at
// least three lines, so a fragment that wraps is still located). The window
// start is not the answer — a window may begin lines above the match — so it
// is then trimmed from the front to the first line the match still needs.
// Reporting the window start instead was off by two lines when this was
// checked against a simulated drift, which is the same defect in miniature
// that this whole guard exists to catch: a number stated more precisely than
// it was established.
function locate(lines, fragment, height) {
  const span = Math.max(height, 3);
  for (let i = 0; i < lines.length; i++) {
    if (!normalize(lines.slice(i, i + span).join(' ')).includes(fragment)) continue;
    let start = i;
    while (
      start < i + span - 1 &&
      normalize(lines.slice(start + 1, i + span).join(' ')).includes(fragment)
    ) {
      start++;
    }
    return start + 1;
  }
  return null;
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

    const found = locate(source, wanted, to - from + 1);
    broken.push(
      found === null
        ? `${citation}: fragment not found anywhere in ${file} — the quote or the file changed`
        : `${citation}: fragment not in the cited range; it is at ${file}:${found}`,
    );
  }

  assert.deepEqual(broken, [], 'context-map citations must quote content found at the cited lines');
});
