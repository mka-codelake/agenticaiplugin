//
// agenticaiplugin: autoskill — detached worker: builds the digest, runs the
// headless reviewer (or the curator) and logs the result. Runs AFTER the
// session's answer and never competes with the user's work (Hermes principle).
//
// Invocation: node run-review.mjs <review|curator> [transcript_path] [session_id]
//
// The reviewer must NOT write into the skill library directly: it writes into
// <stateDir>/staging/ (enforced by read-guard.mjs via a runtime-generated
// settings file — a static settings JSON cannot resolve the plugin install
// path), and THIS script installs staged skills deterministically. Only here
// is the library touched: `learned-` prefix and `user-invocable: false` are
// enforced, non-learned skills are protected via the manifest.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  appendFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARCHIVE_DIR,
  LEARNED_LIST,
  SKILLS_DIR,
  STATE_DIR,
  appendLearned,
  ensureStateDirs,
  isLearnedSkill,
  nowEpoch,
  nowIso,
  readConfig,
  readJson,
  readLearnedList,
  removeLearned,
  writeFileAtomic,
} from './lib.mjs';
import { buildDigest } from './digest.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const LOCK_FILE = join(STATE_DIR, 'review.lock');
const LOG_FILE = join(STATE_DIR, 'review.log');
const CLAUDE_TIMEOUT_MS = 10 * 60 * 1000;

function log(text) {
  try {
    appendFileSync(LOG_FILE, `${text}\n`);
  } catch {
    /* best effort */
  }
}

// Headless Claude call. The PROMPT — which embeds `buildDigest(transcript)`,
// i.e. unsanitized session content — is passed via STDIN, never argv. This is
// the security boundary: `shell: true` is required on Windows to resolve the
// `claude.cmd` npm shim, and under a shell any argv element is re-parsed by
// cmd.exe, so a `"` or `&|<>^` in the transcript would be a command-injection
// vector if the prompt lived in argv. On stdin it cannot reach the shell.
// Only static, plugin-controlled flags go in argv (model is whitelist-
// validated in lib.readConfig); on Windows they are defensively quoted so a
// settings path under a home dir with spaces stays a single argument.
// The AUTOSKILL_REVIEWER env keeps the plugin's own hooks inert in the
// reviewer session.
function runClaude(prompt, args) {
  const win = process.platform === 'win32';
  const argv = win
    ? args.map((a) => (/[\s"&|<>^()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    : args;
  const result = spawnSync('claude', ['-p', ...argv], {
    encoding: 'utf8',
    timeout: CLAUDE_TIMEOUT_MS,
    windowsHide: true,
    shell: win,
    cwd: homedir(),
    input: prompt,
    maxBuffer: 1024 * 1024 * 64,
    env: { ...process.env, AUTOSKILL_REVIEWER: '1' },
  });
  if (result.error) return { rc: -1, out: String(result.error.message || result.error) };
  return { rc: result.status ?? -1, out: `${result.stdout || ''}${result.stderr || ''}` };
}

// Reviewer settings, generated at runtime: permission allow/deny plus the
// PreToolUse read-guard in exec form with the resolved absolute script path.
function writeReviewerSettings() {
  const settings = {
    permissions: {
      allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
      deny: ['Bash', 'WebFetch', 'WebSearch', 'Agent', 'Workflow', 'NotebookEdit'],
    },
    hooks: {
      PreToolUse: [
        {
          matcher: 'Read|Write|Edit',
          hooks: [
            {
              type: 'command',
              command: 'node',
              args: [join(SCRIPT_DIR, 'read-guard.mjs')],
            },
          ],
        },
      ],
    },
  };
  const path = join(STATE_DIR, 'tmp', `reviewer-settings-${process.pid}.json`);
  writeFileAtomic(path, `${JSON.stringify(settings, null, 2)}\n`);
  return path;
}

// ── staged-skill installation (exported for tests) ──────────────────────────

function patchFrontmatter(skillMd, target) {
  let text;
  try {
    text = readFileSync(skillMd, 'utf8');
  } catch {
    return;
  }
  // frontmatter name must match the (possibly renamed) directory
  if (!new RegExp(`^name:\\s*${target}\\s*$`, 'm').test(text)) {
    text = text.replace(/^name:.*$/m, `name: ${target}`);
  }
  // learned skills are passive background knowledge, not commands: enforce
  // user-invocable: false (description stays in context, the model can still
  // load the skill automatically — only the /-menu stays clean).
  if (!/^user-invocable:/m.test(text)) {
    const lines = text.split('\n');
    let seen = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^---\s*$/.test(lines[i])) {
        seen++;
        if (seen === 2) {
          lines.splice(i, 0, 'user-invocable: false');
          break;
        }
      }
    }
    text = lines.join('\n');
  }
  writeFileAtomic(skillMd, text);
}

// Installs every staged skill directory into the library. Deterministic step
// outside the LLM — only here is the library written.
export function installStaged(stagingDir, { skillsDir = SKILLS_DIR, logFn = log } = {}) {
  const installed = [];
  let entries = [];
  try {
    entries = readdirSync(stagingDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    return installed;
  }
  for (const entry of entries) {
    const name = entry.name;
    const target = name.startsWith('learned-') ? name : `learned-${name}`;
    if (!/^learned-[a-z0-9-]+$/.test(target)) {
      logFn(`install: skip '${name}' (invalid name)`);
      continue;
    }
    const targetDir = join(skillsDir, target);
    if (existsSync(targetDir) && !isLearnedSkill(target)) {
      logFn(`install: skip '${target}' (existing skill is protected — not learned)`);
      continue;
    }
    const staged = join(stagingDir, name);
    if (!existsSync(join(staged, 'SKILL.md')) && !existsSync(targetDir)) {
      logFn(`install: skip '${target}' (new skill without SKILL.md)`);
      continue;
    }
    try {
      mkdirSync(targetDir, { recursive: true });
      cpSync(staged, targetDir, { recursive: true, force: true });
    } catch {
      logFn(`install: FAILED for '${target}'`);
      continue;
    }
    installed.push(target);
    if (!isLearnedSkill(target)) appendLearned(target);
    const skillMd = join(targetDir, 'SKILL.md');
    if (existsSync(skillMd)) patchFrontmatter(skillMd, target);
    logFn(`install: '${name}' -> ${targetDir}`);
  }
  return installed;
}

// ── review mode ─────────────────────────────────────────────────────────────

function reviewMode(transcript, sid, model) {
  if (!transcript || !existsSync(transcript)) return;

  let digest = '';
  try {
    digest = buildDigest(transcript);
  } catch {
    return;
  }
  if (!digest) return;
  const digestFile = join(STATE_DIR, 'tmp', `digest-${sid}-${process.pid}.txt`);
  writeFileAtomic(digestFile, `${digest}\n`);

  const staging = join(STATE_DIR, 'staging');
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });

  const learnedNames = readLearnedList().join(' ');
  const basePrompt = readFileSync(join(SCRIPT_DIR, 'prompts', 'review.md'), 'utf8');
  const prompt = `${basePrompt}

--- CONTEXT ---
Skill library directory (READ-ONLY — read existing skills here): ${SKILLS_DIR}
Learned skills you may modify: ${learnedNames || '(none yet)'}
All OTHER skills in the library are PROTECTED — never stage changes to them,
but do read them to avoid creating duplicates.
Staging directory (the ONLY writable location): ${staging}
Session digest file (Read it FIRST, then follow the instructions above): ${digestFile}

To CREATE a skill: Write its files under ${join(staging, '<skill-name>')}/ (SKILL.md required).
To MODIFY a learned skill: Read the original from the library, then Write the
complete updated file(s) under ${join(staging, '<skill-name>')}/ using the same relative
paths. Staged files are installed into the library after you finish; staged
directories without a SKILL.md are only installed if the skill already exists.`;

  const settingsFile = writeReviewerSettings();
  const { rc, out } = runClaude(prompt, [
    '--model', model,
    '--output-format', 'text',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read,Glob,Grep,Write,Edit',
    '--settings', settingsFile,
  ]);

  log(`=== ${nowIso()} mode=review session=${sid} rc=${rc} model=${model}`);
  log(out);
  log('');

  installStaged(staging);
  rmSync(staging, { recursive: true, force: true });

  // SUMMARY line -> notice for the next session (Hermes' 💾 message)
  const summary = (out.split('\n').find((l) => l.startsWith('SUMMARY:')) || '')
    .slice('SUMMARY:'.length)
    .trim();
  if (summary && !/nothing to save/i.test(summary)) {
    writeFileAtomic(
      join(STATE_DIR, 'pending_notice.txt'),
      `Hintergrund-Skill-Review (autoskill, ${nowIso()}): ${summary}\n`
    );
  }

  // cleanup: digest, generated settings, reviewer read-marks
  rmSync(digestFile, { force: true });
  rmSync(settingsFile, { force: true });
  for (const f of readdirSync(STATE_DIR)) {
    if (f.startsWith('reviewer-reads-')) rmSync(join(STATE_DIR, f), { force: true });
  }
}

// ── curator mode ────────────────────────────────────────────────────────────

// Deterministic lifecycle over the manifest: stale > 30d, archive > 90d,
// NEVER delete, `pinned: true` exempt. Exported for tests.
export function lifecyclePass({ skillsDir = SKILLS_DIR, now = nowEpoch(), logFn = log } = {}) {
  const usageFile = join(STATE_DIR, 'usage.json');
  const usage = readJson(usageFile) || {};
  const lines = [];
  const names = readLearnedList();
  for (const name of names) {
    const dir = join(skillsDir, name);
    if (!existsSync(dir)) {
      removeLearned(name);
      lines.push(`- ${name}: Verzeichnis fehlt — aus Manifest entfernt`);
      continue;
    }
    const skillMd = join(dir, 'SKILL.md');
    let frontmatter = '';
    try {
      frontmatter = readFileSync(skillMd, 'utf8');
    } catch {
      frontmatter = '';
    }
    if (/^pinned:\s*true/im.test(frontmatter)) {
      lines.push(`- ${name}: gepinnt — von Auto-Übergängen ausgenommen`);
      continue;
    }
    let lastEpoch = now;
    const lastUsed = usage[name]?.last_used;
    if (typeof lastUsed === 'string' && !Number.isNaN(Date.parse(lastUsed))) {
      lastEpoch = Math.floor(Date.parse(lastUsed) / 1000);
    } else {
      try {
        lastEpoch = Math.floor(statSync(skillMd).mtimeMs / 1000);
      } catch {
        lastEpoch = now;
      }
    }
    const ageDays = Math.floor((now - lastEpoch) / 86400);
    if (ageDays >= 90) {
      try {
        mkdirSync(ARCHIVE_DIR, { recursive: true });
        renameSync(dir, join(ARCHIVE_DIR, name));
        removeLearned(name);
        lines.push(`- ${name}: ${ageDays}d ungenutzt → ARCHIVIERT (wiederherstellbar: ${join(ARCHIVE_DIR, name)})`);
      } catch {
        lines.push(`- ${name}: Archivierung fehlgeschlagen`);
      }
    } else if (ageDays >= 30) {
      const entry = usage[name] && typeof usage[name] === 'object' ? usage[name] : {};
      entry.state = 'stale';
      usage[name] = entry;
      try {
        writeFileAtomic(usageFile, `${JSON.stringify(usage, null, 2)}\n`);
      } catch {
        /* best effort */
      }
      lines.push(`- ${name}: ${ageDays}d ungenutzt → stale`);
    } else {
      lines.push(`- ${name}: aktiv (zuletzt vor ${ageDays}d)`);
    }
  }
  if (lines.length === 0) lines.push('(keine gelernten Skills im Manifest)');
  return lines;
}

function curatorMode(model) {
  if (!existsSync(LEARNED_LIST)) writeFileAtomic(LEARNED_LIST, '');
  const report = join(STATE_DIR, 'curator-report.md');
  const lines = [
    `# Curator-Lauf ${nowIso()}`,
    '',
    '## Lifecycle (deterministisch: stale >30d, Archiv >90d, nie löschen)',
    ...lifecyclePass(),
  ];

  // LLM pass: find overlaps, PROPOSE consolidation only (read-only).
  const learned = readLearnedList();
  if (learned.length > 0) {
    const basePrompt = readFileSync(join(SCRIPT_DIR, 'prompts', 'curator.md'), 'utf8');
    const prompt = `${basePrompt}

--- CONTEXT ---
Skill library directory: ${SKILLS_DIR}
Learned skills (only these are subject to lifecycle/merge proposals): ${learned.join(' ')}`;
    const { out } = runClaude(prompt, [
      '--model', model,
      '--output-format', 'text',
      '--allowedTools', 'Read,Glob,Grep',
    ]);
    lines.push('', '## LLM-Analyse (Überlappungen / Konsolidierungs-Vorschläge)', out);
  }

  writeFileAtomic(report, `${lines.join('\n')}\n`);
  log(`=== ${nowIso()} mode=curator done, Report: ${report}`);
}

// ── entry ───────────────────────────────────────────────────────────────────

function main() {
  const [mode = 'review', transcript = '', sid = 'manual'] = process.argv.slice(2);
  ensureStateDirs();
  const model = readConfig().reviewerModel;
  try {
    if (mode === 'review') {
      reviewMode(transcript, sid, model);
    } else if (mode === 'curator') {
      curatorMode(model);
    }
  } finally {
    rmSync(LOCK_FILE, { force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (err) {
    log(`=== ${nowIso()} worker crashed: ${err?.message || err}`);
    try {
      rmSync(LOCK_FILE, { force: true });
    } catch {
      /* best effort */
    }
  }
}
