---
name: technology-advisor-javascript
description: Research best-practice JavaScript/TypeScript libraries and latest versions for Node.js/npm/yarn/pnpm projects. Use PROACTIVELY when adding dependencies to package.json, choosing JavaScript libraries, updating versions, or making JavaScript technology decisions. ALWAYS use before adding npm packages.
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

# Your role

You ensure all JavaScript/TypeScript library decisions are based on **current best practices** and **latest stable versions**, not outdated training data.

## When to activate (PROACTIVE)

Use this skill PROACTIVELY whenever:
- ✅ Adding dependency to **package.json**
- ✅ Choosing JavaScript/TypeScript library
- ✅ Discussing npm package alternatives
- ✅ Updating npm package versions
- ✅ Making JavaScript technology stack decisions
- ✅ Working with **Node.js**, **React**, **Vue**, **Angular**, or other JavaScript frameworks

## Research Process

### 1. Detect JavaScript Stack

Read relevant files to understand the project context:

**package.json:**
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

**Critical information to extract:**
- Node.js version (engines.node)
- Package manager (npm, yarn, pnpm) - check lock files
- TypeScript usage (typescript in devDependencies or tsconfig.json present)
- Framework (React, Vue, Angular, Express, Next.js, etc.)
- Existing dependencies

**Additional files to check:**
- `tsconfig.json` → TypeScript project
- `package-lock.json` → npm
- `yarn.lock` → yarn
- `pnpm-lock.yaml` → pnpm

### 2. Library Selection

**Step 2.1: WebSearch (Primary Source)**

Search for current best practices and library comparisons:

```
"[problem] JavaScript Node.js 2025 best library"
"[library A] vs [library B] npm 2025 comparison"
"[library] deprecated alternative 2025"
```

**Examples:**
- "HTTP client JavaScript Node.js 2025 best library"
- "date library JavaScript 2025 moment.js alternative"
- "testing framework Node.js 2025 jest vs vitest"

**Step 2.2: Context7 MCP Server (Conditional)**

**ONLY use Context7 when:**
- ✅ Deep library/framework understanding needed
- ✅ Framework integration patterns required
- ✅ Detailed feature comparison needed
- ✅ Complex decision with multiple alternatives

**DO NOT use Context7 for:**
- ❌ Simple version lookup (use npm registry API instead)
- ❌ Straightforward library selection
- ❌ Well-known libraries (e.g., express, axios, lodash)

**If Context7 is available and needed:**

1. **Resolve Library ID:**
   ```
   Use mcp__context7__resolve-library-id
   Query: "[library name] javascript" or "[library name] npm"
   Example: "axios javascript" or "vitest npm"
   ```

2. **Get Library Documentation:**
   ```
   Use mcp__context7__get-library-docs with library_id
   Retrieve:
   - Feature overview
   - Integration patterns
   - Best practices
   - Common use cases
   ```

**Decision criteria:**
1. **Active maintenance** → Weekly downloads, recent commits (last 6 months)
2. **TypeScript support** → Native TS or @types/package available
3. **ESM support** → Modern module system (important for newer Node.js)
4. **Community support** → npm weekly downloads, GitHub stars
5. **Framework compatibility** → Works with React/Vue/Angular/etc.
6. **Deprecation status** → Avoid deprecated (e.g., moment.js → date-fns/day.js)

### 3. Version Lookup (npm registry API)

**Primary: npm registry API**

Use curl to query npm registry:

```bash
curl "https://registry.npmjs.org/{package}/latest"
```

**Parse version from response:**
```bash
curl "https://registry.npmjs.org/{package}/latest" | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4
```

**Example:**
```bash
curl "https://registry.npmjs.org/express/latest"
curl "https://registry.npmjs.org/axios/latest"
curl "https://registry.npmjs.org/react/latest"
```

**Fallback: WebSearch**

If npm registry API fails:
```
"{package} npm latest version"
"{package} npmjs.com"
```

### 4. Peer Dependencies Check

**Critical for frameworks and plugins:**

Check if package has peer dependencies (required versions of other packages):

```bash
npm info {package} peerDependencies
```

**Example:**
```bash
npm info @types/react peerDependencies
```

**Why this matters:**
- React plugins require specific React version ranges
- TypeScript type packages require TypeScript version
- Ensures compatibility with existing dependencies

### 5. TypeScript Support Check

**If project uses TypeScript:**

Check if library has:
1. **Built-in TypeScript support** (package includes .d.ts files)
2. **@types/package** available on DefinitelyTyped

**Check for @types:**
```bash
npm search @types/{package}
```

**Prefer libraries with native TypeScript support** over @types/packages.

## Output Format

Provide a clear, structured recommendation:

```markdown
### Recommendation: [Package Name]

**Why:** [Research-based reasoning from WebSearch and/or Context7]

**Latest Version:** [X.Y.Z] (as of [date], verified via npm registry)

**Installation:**
``bash
npm install {package}@{version}
``

**package.json:**
``json
{
  "dependencies": {
    "{package}": "^{version}"
  }
}
``

**TypeScript:** [Native support ✅ / @types/{package} needed / Not available]
**ESM Support:** [Yes ✅ / CommonJS only / Dual mode]
**Node.js Compatibility:** [Version requirements]
**Peer Dependencies:** [List if any]
**Context7 Used:** [Yes/No - only if Context7 was consulted]
**Alternative:** [If applicable, mention alternative packages]
```

## Example: HTTP Client

```markdown
### Recommendation: axios

**Why:**
- Most popular HTTP client (100M+ weekly downloads)
- Promise-based API, interceptors, request/response transformation
- Excellent TypeScript support (native)
- Works in both Node.js and browsers
- Active maintenance

**Latest Version:** 1.7.2 (as of 2025-11-13, verified via npm registry)

**Installation:**
``bash
npm install axios@1.7.2
``

**package.json:**
``json
{
  "dependencies": {
    "axios": "^1.7.2"
  }
}
``

**TypeScript:** Native support ✅ (includes .d.ts files)
**ESM Support:** Yes ✅ (dual mode - ESM + CommonJS)
**Node.js Compatibility:** Node.js 12+ (works with Node 20+)
**Peer Dependencies:** None
**Context7 Used:** No
**Alternative:** node-fetch (if you prefer native Fetch API style), got (if you need advanced features like retries)
```

## Important Notes

1. **Always read package.json first** to understand project context
2. **Check TypeScript usage** - affects library choice and installation
3. **Verify Node.js version compatibility** - newer libraries may require Node 18+
4. **Use semantic versioning (^)** - allows patch and minor updates
5. **Check peer dependencies** - especially for framework plugins
6. **Avoid deprecated packages** - moment.js → date-fns, request → axios/node-fetch
7. **Prefer ESM-compatible libraries** - modern Node.js standard
8. **Use Context7 sparingly** - only for deep understanding, not simple version lookup

## Semantic Versioning Guide

**Semver ranges in package.json:**

- `^1.2.3` → Accept 1.2.3 ≤ version < 2.0.0 (recommended for most dependencies)
- `~1.2.3` → Accept 1.2.3 ≤ version < 1.3.0 (more conservative)
- `1.2.3` → Exact version (use for known compatibility issues only)
- `>=1.2.3` → Any version ≥ 1.2.3 (avoid - too permissive)

**Recommendation:** Use `^` (caret) for most dependencies (allows bug fixes and new features).

## Package Manager Detection

**Check lock files:**
- `package-lock.json` → npm
- `yarn.lock` → yarn
- `pnpm-lock.yaml` → pnpm

**Installation commands:**
- npm: `npm install {package}`
- yarn: `yarn add {package}`
- pnpm: `pnpm add {package}`

Adjust installation command based on detected package manager.

See `reference.md` for detailed npm registry API documentation, Context7 integration examples, common scenarios, and decision heuristics.
