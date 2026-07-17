//
// agenticaiplugin: autoskill — transcript JSONL -> compact review digest.
//
// Port of the standalone digest.sh + digest.jq. Extracts user texts, assistant
// texts, and tool calls (name + truncated arguments). Thinking blocks and tool
// results are deliberately excluded. Output is capped to the LAST `maxLines`
// digest lines (cost control for the reviewer; the most recent turns matter
// most — Hermes' _digest_history pattern).
//
// Exported as a function (imported by run-review.mjs, unit-testable) plus a
// CLI entry: `node digest.mjs <transcript.jsonl> [maxLines]`.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USER_MAX = 1500;
const ASSISTANT_MAX = 800;
const TOOL_ARGS_MAX = 120;
export const DEFAULT_MAX_LINES = 500;

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && typeof b === 'object' && b.type === 'text')
      .map((b) => b.text || '')
      .join(' ');
  }
  return '';
}

function digestEntry(entry) {
  if (!entry || typeof entry !== 'object') return [];
  const content = entry.message?.content;
  if (entry.type === 'user') {
    const t = textOf(content ?? '');
    return t.length > 0 ? [`USER: ${t.slice(0, USER_MAX)}`] : [];
  }
  if (entry.type === 'assistant') {
    const blocks = Array.isArray(content) ? content : [];
    const tools = blocks
      .filter((b) => b && typeof b === 'object' && b.type === 'tool_use')
      .map((b) => `${b.name || '?'}(${JSON.stringify(b.input ?? {}).slice(0, TOOL_ARGS_MAX)})`);
    const txt = blocks
      .filter((b) => b && typeof b === 'object' && b.type === 'text')
      .map((b) => b.text || '')
      .join(' ')
      .replace(/\s+/g, ' ');
    const out = [];
    if (tools.length > 0) out.push(`ASSISTANT[tools]: ${tools.join('; ')}`);
    if (txt.length > 0) out.push(`ASSISTANT: ${txt.slice(0, ASSISTANT_MAX)}`);
    return out;
  }
  return [];
}

// Transcript JSONL -> digest string (may be empty). Unparseable lines are
// skipped silently — a partially written transcript must not kill the digest.
export function buildDigest(transcriptPath, maxLines = DEFAULT_MAX_LINES) {
  const raw = readFileSync(transcriptPath, 'utf8');
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    out.push(...digestEntry(entry));
  }
  return out.slice(-maxLines).join('\n');
}

// CLI entry (mirrors digest.sh: transcript arg required, exit 1 when unusable)
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [transcript, maxArg] = process.argv.slice(2);
  if (!transcript) process.exit(1);
  try {
    const max = Number.parseInt(maxArg, 10);
    const digest = buildDigest(transcript, Number.isInteger(max) && max > 0 ? max : DEFAULT_MAX_LINES);
    if (digest) process.stdout.write(`${digest}\n`);
  } catch {
    process.exit(1);
  }
}
