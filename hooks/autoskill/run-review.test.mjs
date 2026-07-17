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
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = mkdtempSync(join(tmpdir(), 'autoskill-worker-'));
process.env.CLAUDE_CONFIG_DIR = CONFIG_DIR;

const { installStaged, lifecyclePass } = await import('./run-review.mjs');
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

  const report = lifecyclePass({ skillsDir, now, logFn: noLog }).join('\n');
  assert.match(report, /learned-active: aktiv/);
  assert.match(report, /learned-stale: 45d ungenutzt → stale/);
  assert.match(report, /learned-old: 120d ungenutzt → ARCHIVIERT/);
  assert.match(report, /learned-pinned: gepinnt/);
  assert.match(report, /learned-gone: Verzeichnis fehlt/);

  assert.equal(existsSync(join(skillsDir, 'learned-old')), false);
  assert.equal(existsSync(join(STATE_DIR, 'archive', 'learned-old')), true);
  assert.equal(existsSync(join(skillsDir, 'learned-pinned')), true, 'pinned never moved');
  const manifest = readFileSync(LEARNED_LIST, 'utf8');
  assert.doesNotMatch(manifest, /learned-old/);
  assert.doesNotMatch(manifest, /learned-gone/);
  const usage = JSON.parse(readFileSync(join(STATE_DIR, 'usage.json'), 'utf8'));
  assert.equal(usage['learned-stale'].state, 'stale');
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
const prompt = process.argv[process.argv.indexOf('-p') + 1] || '';
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

  const r = spawnSync(
    process.execPath,
    [join(SCRIPT_DIR, 'run-review.mjs'), 'review', transcript, 'e2e'],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: CONFIG_DIR,
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
  assert.equal(existsSync(join(STATE_DIR, 'staging')), false, 'staging cleaned up');
  assert.match(readFileSync(join(STATE_DIR, 'review.log'), 'utf8'), /mode=review session=e2e rc=0/);
});
