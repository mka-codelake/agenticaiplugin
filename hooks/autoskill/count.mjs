//
// agenticaiplugin: autoskill — PostToolUse hook: iteration counter + usage
// telemetry.
//
// Hermes semantics: the counter rises per tool call and resets on skill work
// (Write/Edit under .claude/skills/ — deliberately broad: manual skill
// maintenance also counts as "skill work done"). Usage telemetry counts
// learned-skill usage (Read on a skill file, or invocation via the Skill
// tool) into state/usage.json.
//
// Fail-safe: enabled=false or any unexpected state -> do nothing, exit 0.
// AUTOSKILL_REVIEWER guards against recursion from the background reviewer
// session (plugin hooks run there too).

import { join } from 'node:path';
import {
  STATE_DIR,
  counterFile,
  ensureStateDirs,
  isLearnedSkill,
  normPath,
  nowIso,
  readConfig,
  readCount,
  readHookInput,
  readJson,
  writeFileAtomic,
} from './lib.mjs';

function skillFromPath(np) {
  const rest = np.split('/.claude/skills/')[1] || '';
  return rest.split('/')[0];
}

function bumpUsage(skill) {
  if (!skill || skill === '.archive') return;
  const usageFile = join(STATE_DIR, 'usage.json');
  const usage = readJson(usageFile) || {};
  const entry = usage[skill] && typeof usage[skill] === 'object' ? usage[skill] : {};
  entry.uses = (Number.isInteger(entry.uses) ? entry.uses : 0) + 1;
  entry.last_used = nowIso();
  usage[skill] = entry;
  writeFileAtomic(usageFile, `${JSON.stringify(usage, null, 2)}\n`);
}

function main() {
  if (process.env.AUTOSKILL_REVIEWER) return;
  if (!readConfig().enabled) return;

  const input = readHookInput();
  if (!input) return;
  const sid = typeof input.session_id === 'string' ? input.session_id : '';
  if (!sid || /[^a-zA-Z0-9_-]/.test(sid)) return;
  const tool = typeof input.tool_name === 'string' ? input.tool_name : '';
  const fpath = typeof input.tool_input?.file_path === 'string' ? input.tool_input.file_path : '';
  const np = fpath ? normPath(fpath) : '';
  const inSkills = np.includes('/.claude/skills/');

  ensureStateDirs();
  const cfile = counterFile(sid, 'count');

  if ((tool === 'Write' || tool === 'Edit') && inSkills) {
    writeFileAtomic(cfile, '0\n');
  } else {
    writeFileAtomic(cfile, `${readCount(cfile) + 1}\n`);
  }

  if (tool === 'Read' && inSkills) {
    const name = skillFromPath(np);
    if (isLearnedSkill(name)) bumpUsage(name);
  } else if (tool === 'Skill') {
    const name = typeof input.tool_input?.skill === 'string' ? input.tool_input.skill : '';
    if (name && isLearnedSkill(name)) bumpUsage(name);
  }
}

try {
  main();
} catch {
  // fail-safe: never break the session
}
