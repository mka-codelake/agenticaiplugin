// agenticaiplugin: parse a rule file's HTML-comment version header.
//
// Shared by sync-rules.mjs (update/removal) and the update-notice hook, so both
// read rule versions the same way. Node stdlib only; no I/O here (caller passes
// the file content).
//
// Header shape (rules-templates/agenticaiplugin-*.md and their installed copies):
//   <!--
//     AgenticAI Plugin Rule v1.2
//     Plugin-Version: 0.19.1
//   -->
//
// `pluginVersion` is null for rules that predate the Plugin-Version line (e.g.
// agenticaiplugin-core.md) — treat that as "unknown".

export function parseRuleHeader(content) {
  const text = content || '';
  const rule = /AgenticAI Plugin Rule v(\d+\.\d+)/.exec(text);
  const plugin = /Plugin-Version:\s*(\d+\.\d+\.\d+)/.exec(text);
  return {
    ruleVersion: rule ? rule[1] : null,
    pluginVersion: plugin ? plugin[1] : null,
  };
}
