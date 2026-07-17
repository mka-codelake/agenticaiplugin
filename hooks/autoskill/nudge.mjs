//
// agenticaiplugin: autoskill — UserPromptSubmit hook.
//
// Injects (a) the result of a finished background review as a note —
// systemMessage goes visibly to the USER in the terminal (Hermes' 💾 message),
// additionalContext additionally informs the model — and (b) every N prompts a
// silent learn nudge (model only; the user must not see it).
//
// Fail-safe: enabled=false or any unexpected state -> emit nothing, exit 0.

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  STATE_DIR,
  counterFile,
  ensureStateDirs,
  readConfig,
  readCount,
  readHookInput,
  writeFileAtomic,
} from './lib.mjs';

const NUDGE_TEXT =
  'Reminder (autoskill): if this session contained a transferable technique, a ' +
  'workaround, or a user correction, capture it with the /agenticaiplugin:learn ' +
  'skill (or directly under ~/.claude/skills/learned-<name>/ plus an entry in ' +
  'learned.list in the autoskill state dir ' +
  '${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.autoskill/) — prefer patching ' +
  'an existing learned skill (learned-*) over creating a new one.';

function main() {
  if (process.env.AUTOSKILL_REVIEWER) return;
  const config = readConfig();
  if (!config.enabled) return;

  const input = readHookInput();
  const sid = typeof input?.session_id === 'string' ? input.session_id : '';

  let ctx = '';
  let userMsg = '';

  // (a) pending notice from a completed background review
  const notice = join(STATE_DIR, 'pending_notice.txt');
  if (existsSync(notice)) {
    let text = '';
    try {
      text = readFileSync(notice, 'utf8').trim();
    } catch {
      text = '';
    }
    if (text) {
      ctx = text;
      userMsg = `💾 ${text}`;
    }
    rmSync(notice, { force: true });
  }

  // (b) periodic nudge
  if (config.nudgeInterval > 0 && sid && !/[^a-zA-Z0-9_-]/.test(sid)) {
    ensureStateDirs();
    const pfile = counterFile(sid, 'prompts');
    const p = readCount(pfile) + 1;
    writeFileAtomic(pfile, `${p}\n`);
    if (p % config.nudgeInterval === 0) {
      ctx = ctx ? `${ctx}\n${NUDGE_TEXT}` : NUDGE_TEXT;
    }
  }

  if (!ctx.trim()) return;

  const out = {
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ctx },
  };
  // systemMessage only for the review notice (the learn nudge is a pure model
  // instruction — the user must not see it).
  if (userMsg) out.systemMessage = userMsg;
  process.stdout.write(`${JSON.stringify(out)}\n`);
}

try {
  main();
} catch {
  // fail-safe: never break the session
}
