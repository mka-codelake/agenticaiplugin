// Tests for parse-rule-header.mjs — Node stdlib only, run with: node --test
//
// Direct unit tests of the module's public function (it is a pure, exported helper,
// not a CLI). Pins the edge cases both callers (sync-rules, the notice hook) rely on:
// full header, missing Plugin-Version (pre-0.5.1 rules), no header, empty/nullish
// input, malformed version, and multi-digit versions.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRuleHeader } from './parse-rule-header.mjs';

test('parses both rule version and plugin version', () => {
  const r = parseRuleHeader('<!--\n  AgenticAI Plugin Rule v1.2\n  Plugin-Version: 0.19.1\n-->');
  assert.deepEqual(r, { ruleVersion: '1.2', pluginVersion: '0.19.1' });
});

test('missing Plugin-Version (pre-0.5.1) -> pluginVersion null', () => {
  const r = parseRuleHeader('<!--\n  AgenticAI Plugin Rule v1.0\n-->');
  assert.deepEqual(r, { ruleVersion: '1.0', pluginVersion: null });
});

test('no header at all -> both null', () => {
  assert.deepEqual(parseRuleHeader('# just a heading\n'), { ruleVersion: null, pluginVersion: null });
});

test('empty and nullish input -> both null', () => {
  assert.deepEqual(parseRuleHeader(''), { ruleVersion: null, pluginVersion: null });
  assert.deepEqual(parseRuleHeader(undefined), { ruleVersion: null, pluginVersion: null });
  assert.deepEqual(parseRuleHeader(null), { ruleVersion: null, pluginVersion: null });
});

test('malformed Plugin-Version (not X.Y.Z) is ignored, rule version still parsed', () => {
  const r = parseRuleHeader('AgenticAI Plugin Rule v2.0\nPlugin-Version: draft');
  assert.equal(r.ruleVersion, '2.0');
  assert.equal(r.pluginVersion, null);
});

test('multi-digit versions parse correctly', () => {
  const r = parseRuleHeader('AgenticAI Plugin Rule v10.11\nPlugin-Version: 12.0.34');
  assert.deepEqual(r, { ruleVersion: '10.11', pluginVersion: '12.0.34' });
});
