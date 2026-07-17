// Tests for digest.mjs — Node stdlib only, run with: node --test

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildDigest } from './digest.mjs';

function transcriptWith(lines) {
  const dir = mkdtempSync(join(tmpdir(), 'autoskill-digest-'));
  const path = join(dir, 'transcript.jsonl');
  writeFileSync(path, lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n'));
  return path;
}

test('extracts user text, assistant text, and tool calls; skips thinking and other types', () => {
  const path = transcriptWith([
    { type: 'user', message: { content: 'please fix the bug' } },
    {
      type: 'assistant',
      message: {
        content: [
          { type: 'thinking', thinking: 'secret reasoning' },
          { type: 'tool_use', name: 'Read', input: { file_path: '/x.js' } },
          { type: 'text', text: 'done,   fixed  it' },
        ],
      },
    },
    { type: 'progress', data: 'noise' },
  ]);
  const digest = buildDigest(path);
  assert.match(digest, /^USER: please fix the bug$/m);
  assert.match(digest, /^ASSISTANT\[tools\]: Read\(\{"file_path":"\/x\.js"\}\)$/m);
  assert.match(digest, /^ASSISTANT: done, fixed it$/m, 'whitespace is collapsed');
  assert.doesNotMatch(digest, /secret reasoning/);
  assert.doesNotMatch(digest, /noise/);
});

test('user content as block array and truncation limits', () => {
  const path = transcriptWith([
    { type: 'user', message: { content: [{ type: 'text', text: 'a'.repeat(2000) }] } },
    {
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', name: 'Bash', input: { command: 'x'.repeat(500) } },
          { type: 'text', text: 'b'.repeat(1000) },
        ],
      },
    },
  ]);
  const [userLine, toolLine, textLine] = buildDigest(path).split('\n');
  assert.equal(userLine.length, 'USER: '.length + 1500);
  assert.ok(toolLine.length <= 'ASSISTANT[tools]: Bash()'.length + 120);
  assert.equal(textLine.length, 'ASSISTANT: '.length + 800);
});

test('caps to the LAST maxLines lines and survives broken JSONL lines', () => {
  const entries = [];
  for (let i = 0; i < 20; i++) entries.push({ type: 'user', message: { content: `msg ${i}` } });
  entries.splice(5, 0, '{broken json', '');
  const digest = buildDigest(transcriptWith(entries), 3);
  const lines = digest.split('\n');
  assert.equal(lines.length, 3);
  assert.deepEqual(lines, ['USER: msg 17', 'USER: msg 18', 'USER: msg 19']);
});

test('empty transcript yields empty digest', () => {
  assert.equal(buildDigest(transcriptWith([])), '');
});
