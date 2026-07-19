#!/usr/bin/env node
// agenticaiplugin: sync a project's .claude/rules/ against the plugin's rule templates.
//
// Deterministic replacement for the prompt-driven update/removal logic that used to
// live in agents/project-initializer/update-agenticai.md. The template SET is the
// single source of truth:
//   - template present, not installed        -> create
//   - both present, rule version differs      -> update
//   - installed, NO template (deprecated)     -> delete   <- the removal path the old
//                                                             version-table compare
//                                                             could not express
//   - both present, same rule version         -> up-to-date (skip; version-based by design)
//
// Usage:
//   node sync-rules.mjs <projectRoot> <pluginRoot> [--dry-run|--apply]   (default: --dry-run)
//
// Emits a JSON report to stdout:
//   { "applied": <bool>, "actions": [ {
//       "id", "file", "action",
//       "installedRuleVersion", "templateRuleVersion",
//       "installedPluginVersion"   // observed BEFORE apply — the update "What's New"
//                                  // step consumes this pre-apply value
//   } ] }
//
// Node stdlib only. Reads the plugin templates from <pluginRoot>/rules-templates/ and
// the installed rules from <projectRoot>/.claude/rules/. A missing rules dir is treated
// as "nothing installed" (not an error).

import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseRuleHeader } from './parse-rule-header.mjs';

const RULE_FILE = /^agenticaiplugin-.*\.md$/;

function listRules(dir) {
  try {
    return readdirSync(dir).filter((f) => RULE_FILE.test(f));
  } catch {
    return []; // dir missing -> nothing there
  }
}

function readHeader(path) {
  try {
    return parseRuleHeader(readFileSync(path, 'utf8'));
  } catch {
    return { ruleVersion: null, pluginVersion: null };
  }
}

export function computeActions(projectRoot, pluginRoot) {
  const templatesDir = join(pluginRoot, 'rules-templates');
  const installedDir = join(projectRoot, '.claude', 'rules');
  const templates = new Set(listRules(templatesDir));
  const installed = new Set(listRules(installedDir));
  const actions = [];
  for (const file of [...new Set([...templates, ...installed])].sort()) {
    const inTpl = templates.has(file);
    const inInst = installed.has(file);
    const tpl = inTpl ? readHeader(join(templatesDir, file)) : null;
    const inst = inInst ? readHeader(join(installedDir, file)) : null;
    let action;
    if (inTpl && !inInst) action = 'create';
    else if (!inTpl && inInst) action = 'delete';
    else if (tpl.ruleVersion !== inst.ruleVersion) action = 'update';
    else action = 'up-to-date';
    actions.push({
      id: basename(file, '.md'),
      file,
      action,
      installedRuleVersion: inst ? inst.ruleVersion : null,
      templateRuleVersion: tpl ? tpl.ruleVersion : null,
      installedPluginVersion: inst ? inst.pluginVersion : null,
    });
  }
  return { actions, templatesDir, installedDir };
}

function applyActions(actions, templatesDir, installedDir) {
  mkdirSync(installedDir, { recursive: true });
  for (const a of actions) {
    if (a.action === 'create' || a.action === 'update') {
      copyFileSync(join(templatesDir, a.file), join(installedDir, a.file));
    } else if (a.action === 'delete') {
      rmSync(join(installedDir, a.file), { force: true });
    }
  }
}

function main(argv) {
  const args = argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const pos = args.filter((a) => !a.startsWith('--'));
  const projectRoot = pos[0] || process.cwd();
  const pluginRoot = pos[1];
  if (!pluginRoot) {
    process.stderr.write('Usage: sync-rules.mjs <projectRoot> <pluginRoot> [--dry-run|--apply]\n');
    process.exit(2);
  }
  const doApply = flags.has('--apply');
  const { actions, templatesDir, installedDir } = computeActions(projectRoot, pluginRoot);
  if (doApply) applyActions(actions, templatesDir, installedDir);
  process.stdout.write(`${JSON.stringify({ applied: doApply, actions }, null, 2)}\n`);
}

// Run only as a CLI (allow importing computeActions in-process without side effects).
if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv);
}
