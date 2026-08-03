// Guards the `file:line` citations in docs/context-map.md. The map justifies
// its own value by every CODE statement being checkable at a named line, so a
// citation that no longer resolves takes the ground out from under it. Inserting
// a 17-line header into an unrelated file once pointed eight citations into the
// void; a later full check found four more aimed at the wrong content and nine
// in short form without a path.
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

// `path/file.ext:12` or `path/file.ext:12-34`, in backticks or free-standing.
// Citations are repo-root relative. A short form without a path (`SOME_CONST:84-90`)
// carries no file extension, so the pattern does not match it at all: such a
// citation is skipped in silence, neither checked nor reported. Write citations
// with their path, or this guard never sees them.
const CITATION = /([\w./-]+\.(?:mjs|js|md|json|ya?ml)):(\d+)(?:-(\d+))?/g;

function lineCount(text) {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop(); // trailing newline is not a line
  return lines.length;
}

// LIMIT OF THIS GUARD — deliberately named in the test title as well:
// it catches total failure only (file gone, line past the end of the file). It
// does NOT catch drift, i.e. a citation that still resolves but now points at
// different content after lines were inserted above it — and drift was the more
// frequent case. Verifying the claim against the cited lines stays reading work.
// A test that suggested more coverage than it has would be exactly the defect
// the hooks-policy existence check was added to fix; it must not reappear here.
test('every file:line citation in the context map resolves — existence only, not content drift', () => {
  const text = readFileSync(MAP, 'utf8');

  const citations = new Map(); // deduplicated: literal citation -> [file, from, to]
  for (const [literal, file, from, to] of text.matchAll(CITATION)) {
    citations.set(literal, [file, Number(from), Number(to ?? from)]);
  }
  assert.ok(
    citations.size >= 10,
    `only ${citations.size} citations extracted — the extraction pattern is probably broken`,
  );

  const broken = [];
  for (const [citation, [file, from, to]] of citations) {
    const path = join(REPO_ROOT, file);

    if (!existsSync(path)) {
      broken.push(`${citation}: file does not exist`);
      continue;
    }
    const lines = lineCount(readFileSync(path, 'utf8'));
    if (to > lines) broken.push(`${citation}: file has only ${lines} lines`);
    else if (from > to) broken.push(`${citation}: inverted line range`);
  }

  assert.deepEqual(broken, [], 'context-map citations must point at lines that exist');
});
