//
// agenticaiplugin: autoskill — detached worker: builds the digest, runs the
// headless reviewer (or the curator) and logs the result. Runs AFTER the
// session's answer and never competes with the user's work (Hermes principle).
//
// Invocation: node run-review.mjs <review|curator> [transcript_path] [session_id]
//
// The reviewer must NOT write into the skill library directly: it writes into
// STAGING_DIR (lib.mjs — deliberately OUTSIDE the Claude config dir; see the
// comment there for why, and note that the old "Claude Code blocks writes
// there" reason was measured false in 2.1.223 while the path-traversal reason
// still carries it; enforced by read-guard.mjs via a runtime-generated settings
// file — a static settings JSON cannot resolve the
// staging path), and THIS script installs staged skills deterministically. Only here
// is the library touched: `learned-` prefix and `user-invocable: false` are
// enforced, non-learned skills are protected via the manifest.

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  appendFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARCHIVE_DIR,
  CURATOR_NOTICE,
  LEARNED_LIST,
  PENDING_NOTICE,
  REPORTS_DIR,
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
const USAGE_FILE = join(STATE_DIR, 'usage.json');
const CLAUDE_TIMEOUT_MS = 10 * 60 * 1000;
// Dated reports kept before the oldest are pruned (~3 months at the 7-day interval).
const REPORTS_KEEP = 12;

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
      deny: ['Bash', 'WebFetch', 'WebSearch', 'Agent', 'Task', 'Skill', 'Workflow', 'NotebookEdit'],
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

// ISO string -> epoch seconds, or null when absent/unparseable.
function isoToEpoch(value) {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// Merges fields into one skill's usage entry. `fields` is a callback so it can
// build on the CURRENT entry: usage.json is re-read immediately before the write
// because count.mjs does its own read-modify-write on the same file, and a value
// computed earlier could otherwise clobber a concurrent usage bump.
function mergeUsage(name, fields) {
  const usage = readJson(USAGE_FILE) || {};
  const entry = usage[name] && typeof usage[name] === 'object' ? usage[name] : {};
  usage[name] = { ...entry, ...fields(entry) };
  try {
    writeFileAtomic(USAGE_FILE, `${JSON.stringify(usage, null, 2)}\n`);
  } catch {
    /* best effort — telemetry is diagnostics, never worth failing the caller */
  }
}

// `installed_at` is written once (first install wins), `last_updated` on every
// install. `last_used` is NEVER touched here: reviewer maintenance is not usage,
// and keeping the two apart is what makes the lifecycle clock honest — the
// SKILL.md mtime cannot, because every reviewer patch refreshes it.
function recordInstall(name, stamp = nowIso()) {
  mergeUsage(name, (e) => ({ installed_at: e.installed_at || stamp, last_updated: stamp }));
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
    recordInstall(target);
    if (!isLearnedSkill(target)) appendLearned(target);
    const skillMd = join(targetDir, 'SKILL.md');
    if (existsSync(skillMd)) patchFrontmatter(skillMd, target);
    logFn(`install: '${name}' -> ${targetDir}`);
  }
  return installed;
}

// ── review mode ─────────────────────────────────────────────────────────────

// Fresh, unpredictable, owner-only (0700) staging dir OUTSIDE the config dir.
// mkdtemp gives per-run isolation — no cross-user collision on the shared temp
// root (a single machine-global path breaks the second user with EACCES and
// lets a local attacker read or pre-plant staged skills) and no world-readable
// content. An explicit AUTOSKILL_STAGING_DIR override (tests / a write-
// restricted temp dir) is honored and recreated clean. The chosen path is
// exported via the env so the reviewer's read-guard child cages the very same
// directory. Exported for tests.
export function prepareStaging() {
  let staging = process.env.AUTOSKILL_STAGING_DIR;
  if (staging) {
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true, mode: 0o700 });
  } else {
    staging = mkdtempSync(join(tmpdir(), 'agenticaiplugin-autoskill-'));
    process.env.AUTOSKILL_STAGING_DIR = staging;
  }
  return staging;
}

function buildReviewPrompt(staging, digestFile) {
  const learnedNames = readLearnedList().join(' ');
  const basePrompt = readFileSync(join(SCRIPT_DIR, 'prompts', 'review.md'), 'utf8');
  return `${basePrompt}

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
}

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

  const staging = prepareStaging();
  const prompt = buildReviewPrompt(staging, digestFile);

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
      PENDING_NOTICE,
      `Background skill review (autoskill, ${nowIso()}): ${summary}\n`
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

// Idempotent backfill from review.log. The worker has always logged
// `install: '<name>' -> <dir>` under a `=== <iso> mode=…` header, so install
// history predating the timestamp fields is reconstructable exactly: first hit
// -> installed_at, last hit -> last_updated. Only MISSING fields are filled,
// which makes repeat runs a no-op and needs no state marker. Skills older than
// the log fall back to the SKILL.md mtime — untouched by the reviewer in those
// cases, so still truthful, and freezing it here stops future patches from
// resetting the clock. Returns how many entries were touched. Exported for tests.
export function backfillTimestamps({ logFile = LOG_FILE, skillsDir = SKILLS_DIR } = {}) {
  const first = new Map();
  const last = new Map();
  try {
    let stamp = '';
    for (const line of readFileSync(logFile, 'utf8').split('\n')) {
      const head = /^=== (\S+) /.exec(line);
      if (head) {
        stamp = head[1];
        continue;
      }
      const hit = /^install: .* -> (.+)$/.exec(line);
      if (!hit || !stamp) continue;
      const name = hit[1].trim().split(/[\\/]/).pop();
      if (!name) continue;
      if (!first.has(name)) first.set(name, stamp);
      last.set(name, stamp);
    }
  } catch {
    /* no log yet (fresh install) -> mtime fallback below */
  }

  const usage = readJson(USAGE_FILE) || {};
  let touched = 0;
  for (const name of readLearnedList()) {
    const entry = usage[name] && typeof usage[name] === 'object' ? usage[name] : {};
    if (entry.installed_at && entry.last_updated) continue;
    let installedAt = entry.installed_at || first.get(name);
    if (!installedAt) {
      try {
        installedAt = new Date(statSync(join(skillsDir, name, 'SKILL.md')).mtimeMs)
          .toISOString()
          .replace(/\.\d{3}Z$/, 'Z');
      } catch {
        continue; // neither a log entry nor a file -> nothing trustworthy to write
      }
    }
    usage[name] = {
      ...entry,
      installed_at: installedAt,
      last_updated: entry.last_updated || last.get(name) || installedAt,
    };
    touched++;
  }
  if (touched > 0) {
    try {
      writeFileAtomic(USAGE_FILE, `${JSON.stringify(usage, null, 2)}\n`);
    } catch {
      /* best effort */
    }
  }
  return touched;
}

// Moves a report written before this history existed into the archive, dated by
// its own `# Curator run <iso>` header. Without this, the first run of the new
// code would overwrite the only report the user had — destroying the very
// history the feature introduces. Idempotent: once archived, it is skipped.
function preserveLegacyReport() {
  const legacy = join(STATE_DIR, 'curator-report.md');
  if (!existsSync(legacy)) return;
  let text = '';
  try {
    text = readFileSync(legacy, 'utf8');
  } catch {
    return;
  }
  const stamp = /^# Curator run (\S+)/m.exec(text);
  if (!stamp) return;
  const file = join(REPORTS_DIR, `curator-${stamp[1].replace(/:/g, '')}.md`);
  if (existsSync(file)) return;
  try {
    writeFileAtomic(file, text);
  } catch {
    /* best effort */
  }
}

// Writes the report into the dated history, refreshes the stable
// `curator-report.md` and prunes all but the newest REPORTS_KEEP runs. The
// stable file is a COPY, not a symlink: symlinks need elevated rights on
// Windows and the plugin must stay portable. Returns the dated path.
function writeReport(text, stamp) {
  mkdirSync(REPORTS_DIR, { recursive: true });
  preserveLegacyReport();
  // Colons are illegal in Windows filenames; the trimmed form still sorts
  // lexicographically, which is what the pruning below relies on.
  const file = join(REPORTS_DIR, `curator-${stamp.replace(/:/g, '')}.md`);
  writeFileAtomic(file, text);
  writeFileAtomic(join(STATE_DIR, 'curator-report.md'), text);
  try {
    const kept = readdirSync(REPORTS_DIR)
      .filter((f) => /^curator-.+\.md$/.test(f))
      .sort();
    for (const f of kept.slice(0, Math.max(0, kept.length - REPORTS_KEEP))) {
      rmSync(join(REPORTS_DIR, f), { force: true });
    }
  } catch {
    /* best effort */
  }
  return file;
}

// One-shot notice for the next session — same 💾 channel as the review, but a
// separate file so neither run can overwrite the other's unread message.
function writeCuratorNotice({ stamp, lifecycle, findings, reportFile }) {
  const checked = lifecycle.filter((l) => l.startsWith('- ')).length;
  const count = (re) => lifecycle.filter((l) => re.test(l)).length;
  const parts = [
    `${checked} skill(s) checked`,
    `${count(/→ stale/)} stale`,
    `${count(/→ ARCHIVED/)} archived`,
  ];
  // findings === null means the LLM pass did not run or failed — stay silent
  // rather than report "0 findings", which would read as "library is clean".
  if (findings !== null) parts.push(`${findings} finding(s)`);
  writeFileAtomic(
    CURATOR_NOTICE,
    `Curator run (autoskill, ${stamp}): ${parts.join(', ')}. Report: ${reportFile}\n`
  );
}

// Deterministic lifecycle over the manifest: stale > 30d, archive > 90d,
// NEVER delete, `pinned: true` exempt. Exported for tests.
export function lifecyclePass({ skillsDir = SKILLS_DIR, now = nowEpoch(), logFn = log } = {}) {
  const usage = readJson(USAGE_FILE) || {};
  const lines = [];
  const names = readLearnedList();
  // Provenance suffix — makes visible which of the three timestamps a verdict
  // rests on, so "stale" can be checked rather than believed.
  const day = (iso) => (typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : null);
  const details = (e) => {
    const parts = [e.installed_at ? `installed ${day(e.installed_at)}` : 'installed unknown'];
    if (e.last_updated) parts.push(`updated ${day(e.last_updated)}`);
    parts.push(e.last_used ? `last used ${day(e.last_used)}` : 'never used');
    return `\n  (${parts.join(', ')})`;
  };
  for (const name of names) {
    const dir = join(skillsDir, name);
    if (!existsSync(dir)) {
      removeLearned(name);
      lines.push(`- ${name}: directory missing — removed from the manifest`);
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
      lines.push(`- ${name}: pinned — exempt from automatic transitions`);
      continue;
    }
    const entry = usage[name] && typeof usage[name] === 'object' ? usage[name] : {};
    // Lifecycle clock: real usage first, else the install date. The SKILL.md
    // mtime is a last resort only — every reviewer patch refreshes it, so a
    // maintained-but-never-used skill would never age (the defect this replaces).
    let lastEpoch = isoToEpoch(entry.last_used) ?? isoToEpoch(entry.installed_at);
    if (lastEpoch === null) {
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
        lines.push(
          `- ${name}: unused for ${ageDays}d → ARCHIVED (recoverable: ${join(ARCHIVE_DIR, name)})${details(entry)}`
        );
      } catch {
        lines.push(`- ${name}: archiving failed`);
      }
    } else if (ageDays >= 30) {
      mergeUsage(name, () => ({ state: 'stale' }));
      lines.push(`- ${name}: unused for ${ageDays}d → stale${details(entry)}`);
    } else {
      // "unused for", not "last used": the clock may be running off installed_at
      // for a skill that was never used at all, and the label must not claim a
      // usage that never happened.
      lines.push(`- ${name}: active (unused for ${ageDays}d)${details(entry)}`);
    }
  }
  if (lines.length === 0) lines.push('(no learned skills in the manifest)');
  return lines;
}

function curatorMode(model) {
  if (!existsSync(LEARNED_LIST)) writeFileAtomic(LEARNED_LIST, '');
  const stamp = nowIso();
  const backfilled = backfillTimestamps();
  const lifecycle = lifecyclePass();
  const lines = [
    `# Curator run ${stamp}`,
    '',
    '## Lifecycle (deterministic: stale >30d, archive >90d, never delete)',
    '',
    'Clock: `last_used`, else `installed_at`. The SKILL.md mtime is deliberately',
    'not used — every reviewer patch refreshes it and would keep a maintained but',
    'never-used skill artificially young.',
    '',
    ...lifecycle,
  ];
  if (backfilled > 0) {
    lines.push('', `_Backfilled install timestamps for ${backfilled} skill(s) from review.log._`);
  }

  // LLM pass: find overlaps, PROPOSE consolidation only (read-only).
  let findings = null;
  const learned = readLearnedList();
  if (learned.length > 0) {
    const basePrompt = readFileSync(join(SCRIPT_DIR, 'prompts', 'curator.md'), 'utf8');
    const prompt = `${basePrompt}

--- CONTEXT ---
Skill library directory: ${SKILLS_DIR}
Learned skills (only these are subject to lifecycle/merge proposals): ${learned.join(' ')}`;
    // Intentionally lighter sandbox than reviewMode: the curator is READ-ONLY
    // (no Write/Edit in the allowlist), so it needs neither the staging path
    // cage / read-before-write guard nor an explicit deny list — its output
    // only feeds the report, it never touches the skill library. reviewMode
    // gets the extra --settings/read-guard/acceptEdits layers precisely
    // because it is allowed to Write.
    const { rc, out } = runClaude(prompt, [
      '--model', model,
      '--output-format', 'text',
      '--allowedTools', 'Read,Glob,Grep',
    ]);
    // Graceful degradation (as documented in skills/curator/SKILL.md): if the
    // claude CLI is missing or errored, keep the deterministic lifecycle report
    // and skip the analysis section — never embed raw spawn errors (e.g.
    // "spawn claude ENOENT") in the user-facing report.
    if (rc === 0 && out.trim()) {
      lines.push('', '## LLM analysis (overlaps / consolidation proposals)', out);
      // Count only lines that OPEN with a verdict keyword (optionally bulleted
      // or bold). Prose that merely mentions one — "Recommendation: MERGE …" —
      // restates a finding already counted and must not double up.
      findings = out
        .split('\n')
        .filter((l) => /^[-*\s]*\*{0,2}(MERGE|RENAME|FIX|DELETE-CANDIDATE)\b/.test(l)).length;
    } else {
      lines.push('', '## LLM analysis', '_Skipped — the `claude` CLI is unavailable or failed._');
    }
  }

  const reportFile = writeReport(`${lines.join('\n')}\n`, stamp);
  writeCuratorNotice({ stamp, lifecycle, findings, reportFile });
  log(`=== ${nowIso()} mode=curator done, Report: ${reportFile}`);
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
