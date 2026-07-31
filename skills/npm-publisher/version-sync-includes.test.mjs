// Guards the version-sync grep against copy drift (issue #72):
// the block that *syncs* source-file VERSION constants and the block that *audits*
// them must search the same file types. When they diverge, the cutting phase rewrites
// constants the audit can no longer find — and in --audit-only mode the audit block is
// the only sync defense there is, so its empty result gets reported as "in sync".
// That divergence (*.java synced but not audited) is exactly how #72 happened, and it
// survived two releases because nothing enforced the coupling.
// Run with: node --test
//
// Blocks are located by *content*, not by position: every fenced ```bash block in the
// two files that contains the version-sync grep signature counts. Line numbers and
// surrounding prose can therefore be reworded freely without turning this test red for
// the wrong reason, while a fourth copy is picked up automatically — it cannot be the
// version-sync grep without carrying the signature.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const skillDir = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(skillDir, '..', '..');

const SOURCES = [
  join(pluginRoot, 'agents', 'npm-publisher.md'),
  join(pluginRoot, 'skills', 'npm-publisher', 'reference.md'),
];

// Both halves must be present: SRC_DIRS alone also matches unrelated pre-filter snippets,
// and the VERSION regex alone would match the tarball-scanning greps further down.
const SIGNATURE = [/SRC_DIRS/, /\(VERSION\|version\)/];

/** Every version-sync grep block in `file`, as { file, startLine, includes }. */
function findVersionSyncBlocks(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const blocks = [];
  let start = -1;

  for (const [i, line] of lines.entries()) {
    if (start === -1) {
      if (line.trim() === '```bash') start = i;
      continue;
    }
    if (line.trim() !== '```') continue;

    const body = lines.slice(start + 1, i).join('\n');
    if (SIGNATURE.every((re) => re.test(body))) {
      blocks.push({
        file: file.slice(pluginRoot.length + 1),
        startLine: start + 1, // 1-based, the fence itself
        includes: [...body.matchAll(/--include="([^"]+)"/g)].map((m) => m[1]),
      });
    }
    start = -1;
  }
  return blocks;
}

const blocks = SOURCES.flatMap(findVersionSyncBlocks);
const where = (b) => `${b.file}:${b.startLine}`;

// Exact count, deliberately. Rewording cannot change it — only adding or removing a copy
// can, and both are cases a human must look at. A fourth copy is the agreed trigger to
// extract a shared snippet instead of copying again (issue #72); bump this number only
// together with that decision.
const EXPECTED_COPIES = 3;

test('all known version-sync grep copies are still present', () => {
  assert.equal(
    blocks.length,
    EXPECTED_COPIES,
    `expected ${EXPECTED_COPIES} version-sync grep blocks, found ${blocks.length}:\n` +
      blocks.map((b) => `  - ${where(b)}`).join('\n') +
      `\nA removed copy means the guard below no longer covers it. An added copy is the ` +
      `signal to extract a shared snippet rather than copy a fourth time (issue #72).`
  );
});

test('every version-sync grep searches the same file extensions', () => {
  const [reference, ...rest] = blocks;
  assert.ok(reference.includes.length > 0, `${where(reference)}: no --include= flags found`);

  for (const block of rest) {
    if (block.includes.join(' ') === reference.includes.join(' ')) continue;

    const missing = reference.includes.filter((e) => !block.includes.includes(e));
    const extra = block.includes.filter((e) => !reference.includes.includes(e));
    const detail = [
      missing.length ? `missing ${missing.join(', ')}` : null,
      extra.length ? `additionally covers ${extra.join(', ')}` : null,
      missing.length || extra.length ? null : 'same extensions in a different order',
    ]
      .filter(Boolean)
      .join('; ');

    assert.fail(
      `--include list drift: ${where(block)} ${detail} — compared against ${where(reference)}.\n` +
        `  ${where(reference)}: ${reference.includes.join(' ')}\n` +
        `  ${where(block)}: ${block.includes.join(' ')}\n` +
        `What the cutting phase syncs, the audit must be able to find again — see issue #72.`
    );
  }
});
