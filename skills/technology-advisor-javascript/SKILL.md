---
description: Research current JavaScript/TypeScript library versions before adding dependencies. Use PROACTIVELY when adding to package.json. ALWAYS research — never rely on training data for versions.
user-invocable: false
allowed-tools:
  - WebSearch
  - WebFetch
  - Bash(curl:*)
  - Bash(npm:*)
  - Bash(node:*)
  - Read
  - Glob
  - mcp__context7__*
---

## Rule: ALWAYS Research Before Recommending

Never recommend npm package versions from training data. Always verify current versions.

## Research Workflow

1. **Read** `package.json` — extract Node.js version, framework, TypeScript usage, existing deps
2. **WebSearch** `"[library] JavaScript [current year] best practice"` for current recommendations
3. **npm Registry API** for latest stable version:
   ```bash
   curl "https://registry.npmjs.org/{package}/latest"
   ```
4. **Context7** only for complex decisions requiring deep library comparison
5. **Check** TypeScript support (native .d.ts or @types needed), ESM compatibility, peer dependencies

## Output

For each recommendation include: package name, why chosen (from research), latest version (verified via npm registry), install command, TypeScript/ESM support, and alternatives considered.
