// Tests for run-review.mjs — unit tests for the deterministic pieces
// (installStaged, lifecyclePass) via import, plus an end-to-end review run
// against a stub `claude` executable on PATH. Run with: node --test
//
// CLAUDE_CONFIG_DIR is set BEFORE the dynamic import: lib.mjs resolves all
// state paths at module load, so every test in this file shares one isolated
// config dir; per-test isolation happens via distinct skills dirs.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = mkdtempSync(join(tmpdir(), 'autoskill-worker-'));
process.env.CLAUDE_CONFIG_DIR = CONFIG_DIR;

const { backfillTimestamps, installStaged, lifecyclePass, prepareStaging } = await import(
  './run-review.mjs'
);
const STATE_DIR = join(CONFIG_DIR, 'agenticaiplugin.autoskill');
mkdirSync(join(STATE_DIR, 'tmp'), { recursive: true });

const LEARNED_LIST = join(STATE_DIR, 'learned.list');
const noLog = () => {};

function stageSkill(stagingDir, name, frontmatter) {
  const dir = join(stagingDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), frontmatter);
  return dir;
}

test('REGRESSION: prepareStaging yields a fresh 0700 temp dir outside the config dir; override honored & wiped clean', () => {
  const saved = process.env.AUTOSKILL_STAGING_DIR;
  try {
    // Default: no override -> per-run mkdtemp, exported to the env so the
    // read-guard child cages the same dir. Not a fixed, world-readable, shared
    // path (that broke multi-user hosts and allowed pre-planting staged skills).
    delete process.env.AUTOSKILL_STAGING_DIR;
    const s = prepareStaging();
    assert.ok(existsSync(s), 'staging created');
    assert.ok(!s.startsWith(CONFIG_DIR), `must live outside the config dir: ${s}`);
    assert.equal(process.env.AUTOSKILL_STAGING_DIR, s, 'exported for the read-guard child');
    if (process.platform !== 'win32') {
      assert.equal(statSync(s).mode & 0o777, 0o700, 'owner-only perms (no world read / pre-plant)');
    }
    rmSync(s, { recursive: true, force: true });

    // Override: honored, and any stale content from a prior run is wiped.
    const override = join(mkdtempSync(join(tmpdir(), 'ovr-')), 'staging');
    mkdirSync(override, { recursive: true });
    writeFileSync(join(override, 'stale.txt'), 'old');
    process.env.AUTOSKILL_STAGING_DIR = override;
    assert.equal(prepareStaging(), override, 'override honored');
    assert.equal(existsSync(join(override, 'stale.txt')), false, 'stale content wiped');
    rmSync(override, { recursive: true, force: true });
  } finally {
    if (saved === undefined) delete process.env.AUTOSKILL_STAGING_DIR;
    else process.env.AUTOSKILL_STAGING_DIR = saved;
  }
});

test('installStaged: enforces learned- prefix, patches frontmatter, updates manifest', () => {
  writeFileSync(LEARNED_LIST, '');
  const staging = mkdtempSync(join(tmpdir(), 'staging-'));
  const skillsDir = mkdtempSync(join(tmpdir(), 'skills-'));
  stageSkill(staging, 'repo-cloning', '---\nname: repo-cloning\ndescription: X.\n---\n\nBody\n');

  const installed = installStaged(staging, { skillsDir, logFn: noLog });
  assert.deepEqual(installed, ['learned-repo-cloning']);
  const md = readFileSync(join(skillsDir, 'learned-repo-cloning', 'SKILL.md'), 'utf8');
  assert.match(md, /^name: learned-repo-cloning$/m, 'frontmatter name matches renamed dir');
  assert.match(md, /^user-invocable: false$/m, 'passivity is enforced');
  assert.match(readFileSync(LEARNED_LIST, 'utf8'), /^learned-repo-cloning$/m);
});

test('installStaged: protects existing non-learned skills and rejects invalid names', () => {
  writeFileSync(LEARNED_LIST, '');
  const staging = mkdtempSync(join(tmpdir(), 'staging-'));
  const skillsDir = mkdtempSync(join(tmpdir(), 'skills-'));
  mkdirSync(join(skillsDir, 'learned-protected'));
  writeFileSync(join(skillsDir, 'learned-protected', 'SKILL.md'), 'original');
  stageSkill(staging, 'learned-protected', '---\nname: learned-protected\n---\n');
  stageSkill(staging, 'Bad Name!', '---\nname: x\n---\n');
  stageSkill(staging, 'no-skill-md-here', '---\n---\n');
  rmSync(join(staging, 'no-skill-md-here', 'SKILL.md'));

  const installed = installStaged(staging, { skillsDir, logFn: noLog });
  assert.deepEqual(installed, []);
  assert.equal(
    readFileSync(join(skillsDir, 'learned-protected', 'SKILL.md'), 'utf8'),
    'original',
    'not in the manifest -> protected, never overwritten'
  );
});

test('installStaged: updates to manifest-listed skills pass, user-invocable not duplicated', () => {
  writeFileSync(LEARNED_LIST, 'learned-known\n');
  const staging = mkdtempSync(join(tmpdir(), 'staging-'));
  const skillsDir = mkdtempSync(join(tmpdir(), 'skills-'));
  mkdirSync(join(skillsDir, 'learned-known'));
  writeFileSync(join(skillsDir, 'learned-known', 'SKILL.md'), 'old');
  stageSkill(
    staging,
    'learned-known',
    '---\nname: learned-known\nuser-invocable: false\n---\n\nnew body\n'
  );

  assert.deepEqual(installStaged(staging, { skillsDir, logFn: noLog }), ['learned-known']);
  const md = readFileSync(join(skillsDir, 'learned-known', 'SKILL.md'), 'utf8');
  assert.match(md, /new body/);
  assert.equal(md.match(/user-invocable/g).length, 1);
  assert.equal(
    readFileSync(LEARNED_LIST, 'utf8').split('\n').filter((n) => n === 'learned-known').length,
    1,
    'manifest entry not duplicated'
  );
});

test('lifecyclePass: missing dir -> manifest cleanup; pinned exempt; stale/archive transitions', () => {
  const skillsDir = mkdtempSync(join(tmpdir(), 'skills-'));
  const now = Math.floor(Date.now() / 1000);
  const iso = (daysAgo) => new Date((now - daysAgo * 86400) * 1000).toISOString();

  for (const [name, frontmatter] of [
    ['learned-active', '---\nname: learned-active\n---\n'],
    ['learned-stale', '---\nname: learned-stale\n---\n'],
    ['learned-old', '---\nname: learned-old\n---\n'],
    ['learned-pinned', '---\nname: learned-pinned\npinned: true\n---\n'],
  ]) {
    mkdirSync(join(skillsDir, name), { recursive: true });
    writeFileSync(join(skillsDir, name, 'SKILL.md'), frontmatter);
  }
  writeFileSync(
    LEARNED_LIST,
    'learned-active\nlearned-stale\nlearned-old\nlearned-pinned\nlearned-gone\n'
  );
  writeFileSync(
    join(STATE_DIR, 'usage.json'),
    JSON.stringify({
      'learned-active': { uses: 5, last_used: iso(3) },
      'learned-stale': { uses: 1, last_used: iso(45) },
      'learned-old': { uses: 1, last_used: iso(120) },
      'learned-pinned': { uses: 0, last_used: iso(200) },
    })
  );

  const entries = lifecyclePass({ skillsDir, now, logFn: noLog });
  const report = entries.join('\n');
  const activeEntry = entries.find((l) => l.startsWith('- learned-active:'));
  assert.match(activeEntry, /active \(unused for 3d\)/);
  assert.match(
    activeEntry,
    /last used \d{4}-\d{2}-\d{2}/,
    'a skill with real usage shows its usage date, not "never used"'
  );
  assert.match(report, /learned-stale: unused for 45d → stale/);
  assert.match(report, /learned-old: unused for 120d → ARCHIVED/);
  assert.match(report, /learned-pinned: pinned/);
  assert.match(report, /learned-gone: directory missing/);

  assert.equal(existsSync(join(skillsDir, 'learned-old')), false);
  assert.equal(existsSync(join(STATE_DIR, 'archive', 'learned-old')), true);
  assert.equal(existsSync(join(skillsDir, 'learned-pinned')), true, 'pinned never moved');
  const manifest = readFileSync(LEARNED_LIST, 'utf8');
  assert.doesNotMatch(manifest, /learned-old/);
  assert.doesNotMatch(manifest, /learned-gone/);
  const usage = JSON.parse(readFileSync(join(STATE_DIR, 'usage.json'), 'utf8'));
  assert.equal(usage['learned-stale'].state, 'stale');
});

test('REGRESSION: the lifecycle clock ignores the SKILL.md mtime — a maintained but unused skill still ages', () => {
  const skillsDir = mkdtempSync(join(tmpdir(), 'skills-'));
  const now = Math.floor(Date.now() / 1000);
  const iso = (daysAgo) => new Date((now - daysAgo * 86400) * 1000).toISOString();
  mkdirSync(join(skillsDir, 'learned-maintained'), { recursive: true });
  // Written just now, so the mtime is NOW — exactly what the old clock read,
  // which is why a skill the reviewer keeps patching could never go stale.
  writeFileSync(
    join(skillsDir, 'learned-maintained', 'SKILL.md'),
    '---\nname: learned-maintained\n---\n'
  );
  writeFileSync(LEARNED_LIST, 'learned-maintained\n');
  writeFileSync(
    join(STATE_DIR, 'usage.json'),
    JSON.stringify({ 'learned-maintained': { installed_at: iso(45), last_updated: iso(0) } })
  );

  const report = lifecyclePass({ skillsDir, now, logFn: noLog }).join('\n');
  assert.match(
    report,
    /learned-maintained: unused for 45d → stale/,
    'installed_at drives the clock; a reviewer patch must not reset it'
  );
  assert.match(report, /never used/, 'provenance suffix names the missing usage');
});

test('backfillTimestamps: reconstructs install dates from review.log, fills only missing fields', () => {
  const skillsDir = mkdtempSync(join(tmpdir(), 'skills-'));
  for (const n of ['learned-a', 'learned-b', 'learned-c']) {
    mkdirSync(join(skillsDir, n), { recursive: true });
    writeFileSync(join(skillsDir, n, 'SKILL.md'), `---\nname: ${n}\n---\n`);
  }
  writeFileSync(LEARNED_LIST, 'learned-a\nlearned-b\nlearned-c\n');
  // learned-b already carries both stamps -> must survive untouched.
  writeFileSync(
    join(STATE_DIR, 'usage.json'),
    JSON.stringify({
      'learned-b': {
        uses: 2,
        installed_at: '2026-01-01T00:00:00Z',
        last_updated: '2026-01-02T00:00:00Z',
      },
    })
  );
  const logFile = join(STATE_DIR, 'tmp', 'fixture.log');
  writeFileSync(
    logFile,
    [
      '=== 2026-07-01T10:00:00Z mode=review session=s1 rc=0 model=sonnet',
      "install: 'a' -> /somewhere/skills/learned-a",
      '=== 2026-07-20T10:00:00Z mode=review session=s2 rc=0 model=sonnet',
      "install: 'learned-a' -> /somewhere/skills/learned-a",
      "install: 'b' -> /somewhere/skills/learned-b",
      '',
    ].join('\n')
  );

  const touched = backfillTimestamps({ logFile, skillsDir });
  const usage = JSON.parse(readFileSync(join(STATE_DIR, 'usage.json'), 'utf8'));
  assert.equal(usage['learned-a'].installed_at, '2026-07-01T10:00:00Z', 'first install wins');
  assert.equal(usage['learned-a'].last_updated, '2026-07-20T10:00:00Z', 'last install date');
  assert.equal(usage['learned-b'].installed_at, '2026-01-01T00:00:00Z', 'existing stamps kept');
  assert.equal(usage['learned-b'].uses, 2, 'unrelated fields preserved');
  assert.ok(usage['learned-c'].installed_at, 'pre-log skill falls back to the SKILL.md mtime');
  assert.equal(touched, 2);
  assert.equal(backfillTimestamps({ logFile, skillsDir }), 0, 'idempotent: second run is a no-op');
});

test('installStaged: installed_at is written once, last_updated on every install, last_used never', () => {
  writeFileSync(LEARNED_LIST, '');
  writeFileSync(join(STATE_DIR, 'usage.json'), '{}');
  const staging = mkdtempSync(join(tmpdir(), 'staging-'));
  const skillsDir = mkdtempSync(join(tmpdir(), 'skills-'));
  stageSkill(staging, 'learned-stamped', '---\nname: learned-stamped\n---\n\nv1\n');

  installStaged(staging, { skillsDir, logFn: noLog });
  const first = JSON.parse(readFileSync(join(STATE_DIR, 'usage.json'), 'utf8'))['learned-stamped'];
  assert.ok(first.installed_at, 'installed_at set on first install');
  assert.equal(first.last_updated, first.installed_at);
  assert.equal(first.last_used, undefined, 'reviewer maintenance is not usage');

  // Backdate the entry so the second install is distinguishable from the first.
  writeFileSync(
    join(STATE_DIR, 'usage.json'),
    JSON.stringify({
      'learned-stamped': {
        installed_at: '2026-01-01T00:00:00Z',
        last_updated: '2026-01-01T00:00:00Z',
        uses: 3,
        last_used: '2026-02-01T00:00:00Z',
      },
    })
  );
  installStaged(staging, { skillsDir, logFn: noLog });
  const second = JSON.parse(readFileSync(join(STATE_DIR, 'usage.json'), 'utf8'))['learned-stamped'];
  assert.equal(second.installed_at, '2026-01-01T00:00:00Z', 'first install wins');
  assert.notEqual(second.last_updated, '2026-01-01T00:00:00Z', 'refreshed on re-install');
  assert.equal(second.last_used, '2026-02-01T00:00:00Z', 'usage untouched by an install');
  assert.equal(second.uses, 3, 'usage counter untouched by an install');
});

// ── end-to-end review run against a stub claude ─────────────────────────────

test('review mode e2e: stub claude stages a skill, worker installs it and leaves a notice', () => {
  writeFileSync(LEARNED_LIST, '');
  rmSync(join(STATE_DIR, 'pending_notice.txt'), { force: true });
  const skillsDir = join(CONFIG_DIR, 'skills');
  mkdirSync(skillsDir, { recursive: true });

  const binDir = mkdtempSync(join(tmpdir(), 'stub-bin-'));
  const stub = join(binDir, 'claude');
  writeFileSync(
    stub,
    `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
// The worker passes the prompt via STDIN (not argv) — read it from fd 0.
const prompt = fs.readFileSync(0, 'utf8');
const m = /Staging directory \\(the ONLY writable location\\): (.+)/.exec(prompt);
if (m) {
  const dir = path.join(m[1].trim(), 'stub-technique');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\\nname: stub-technique\\ndescription: Stub.\\n---\\n\\nBody\\n');
}
console.log('SUMMARY: Created stub-technique.');
`
  );
  chmodSync(stub, 0o755);

  const transcript = join(STATE_DIR, 'tmp', 'transcript.jsonl');
  writeFileSync(transcript, `${JSON.stringify({ type: 'user', message: { content: 'hi' } })}\n`);
  writeFileSync(join(STATE_DIR, 'review.lock'), '1 1 review\n');

  // Staging lives OUTSIDE the config dir in production (sensitive-zone guard);
  // isolate it per fixture so the run is hermetic and the cleanup check is exact.
  const stagingScratch = join(mkdtempSync(join(tmpdir(), 'autoskill-e2e-')), 'staging');

  const r = spawnSync(
    process.execPath,
    [join(SCRIPT_DIR, 'run-review.mjs'), 'review', transcript, 'e2e'],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: CONFIG_DIR,
        AUTOSKILL_STAGING_DIR: stagingScratch,
        AUTOSKILL_REVIEWER: '1',
        PATH: `${binDir}:${process.env.PATH}`,
      },
    }
  );
  assert.equal(r.status, 0, r.stderr);

  const installedMd = join(skillsDir, 'learned-stub-technique', 'SKILL.md');
  assert.ok(existsSync(installedMd), 'staged skill installed with learned- prefix');
  assert.match(readFileSync(installedMd, 'utf8'), /^user-invocable: false$/m);
  assert.match(readFileSync(LEARNED_LIST, 'utf8'), /^learned-stub-technique$/m);
  assert.match(
    readFileSync(join(STATE_DIR, 'pending_notice.txt'), 'utf8'),
    /Created stub-technique\./
  );
  assert.equal(existsSync(join(STATE_DIR, 'review.lock')), false, 'lock released');
  assert.equal(existsSync(stagingScratch), false, 'staging cleaned up');
  assert.equal(existsSync(join(STATE_DIR, 'staging')), false, 'no staging left under the config dir');
  assert.match(readFileSync(join(STATE_DIR, 'review.log'), 'utf8'), /mode=review session=e2e rc=0/);
});

test('curator mode degrades gracefully when claude is absent (no raw ENOENT in the report)', () => {
  writeFileSync(LEARNED_LIST, 'learned-x\n');
  const skillsDir = join(CONFIG_DIR, 'skills');
  mkdirSync(join(skillsDir, 'learned-x'), { recursive: true });
  writeFileSync(join(skillsDir, 'learned-x', 'SKILL.md'), '---\nname: learned-x\n---\n');

  const emptyBin = mkdtempSync(join(tmpdir(), 'empty-bin-')); // a PATH with no `claude`
  const r = spawnSync(process.execPath, [join(SCRIPT_DIR, 'run-review.mjs'), 'curator'], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: CONFIG_DIR, AUTOSKILL_REVIEWER: '1', PATH: emptyBin },
  });
  assert.equal(r.status, 0, r.stderr);
  const report = readFileSync(join(STATE_DIR, 'curator-report.md'), 'utf8');
  assert.match(report, /## Lifecycle/, 'deterministic lifecycle report is still produced');
  assert.match(report, /Skipped — the `claude` CLI is unavailable or failed/);
  assert.doesNotMatch(report, /ENOENT/, 'raw spawn error must not leak into the user-facing report');
});

test('curator mode: dated report history pruned to 12, stable copy kept, one-shot notice written', () => {
  writeFileSync(LEARNED_LIST, 'learned-x\n');
  const skillsDir = join(CONFIG_DIR, 'skills');
  mkdirSync(join(skillsDir, 'learned-x'), { recursive: true });
  writeFileSync(join(skillsDir, 'learned-x', 'SKILL.md'), '---\nname: learned-x\n---\n');
  const reportsDir = join(STATE_DIR, 'reports');
  mkdirSync(reportsDir, { recursive: true });
  rmSync(join(STATE_DIR, 'curator_notice.txt'), { force: true });
  // 15 older runs; names sort before this run's, so they are the pruning target.
  for (let i = 1; i <= 15; i++) {
    const day = String(i).padStart(2, '0');
    writeFileSync(join(reportsDir, `curator-2020-01-${day}T000000Z.md`), 'old');
  }

  const emptyBin = mkdtempSync(join(tmpdir(), 'empty-bin-'));
  const r = spawnSync(process.execPath, [join(SCRIPT_DIR, 'run-review.mjs'), 'curator'], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: CONFIG_DIR, AUTOSKILL_REVIEWER: '1', PATH: emptyBin },
  });
  assert.equal(r.status, 0, r.stderr);

  const files = readdirSync(reportsDir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  assert.equal(files.length, 12, 'history pruned to the newest 12');
  const newest = join(reportsDir, files[files.length - 1]);
  assert.notEqual(readFileSync(newest, 'utf8'), 'old', 'newest entry is this run');
  assert.doesNotMatch(files[files.length - 1], /:/, 'no colons — Windows-safe filename');
  assert.equal(
    readFileSync(newest, 'utf8'),
    readFileSync(join(STATE_DIR, 'curator-report.md'), 'utf8'),
    'curator-report.md is a copy of the newest run, not a symlink'
  );

  const notice = readFileSync(join(STATE_DIR, 'curator_notice.txt'), 'utf8');
  assert.match(notice, /^Curator run \(autoskill, /);
  assert.match(notice, /1 skill\(s\) checked, 0 stale, 0 archived/);
  assert.doesNotMatch(notice, /finding\(s\)/, 'no LLM pass -> no findings claim');
});
