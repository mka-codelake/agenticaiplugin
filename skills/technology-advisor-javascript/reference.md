# Technology Advisor JavaScript - Reference

## npm Registry API

### Endpoint

```
https://registry.npmjs.org/{package}/latest
```

### Example Requests

**Express:**
```bash
curl "https://registry.npmjs.org/express/latest"
```

**Axios:**
```bash
curl "https://registry.npmjs.org/axios/latest"
```

**React:**
```bash
curl "https://registry.npmjs.org/react/latest"
```

**TypeScript:**
```bash
curl "https://registry.npmjs.org/typescript/latest"
```

### Response Format

```json
{
  "name": "axios",
  "version": "1.7.2",
  "description": "Promise based HTTP client for the browser and node.js",
  "main": "index.js",
  "types": "index.d.ts",
  "scripts": {
    "test": "..."
  },
  "dependencies": {
    "follow-redirects": "^1.15.6",
    "form-data": "^4.0.0"
  },
  "peerDependencies": {},
  "engines": {
    "node": ">=12.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/axios/axios.git"
  },
  "keywords": ["http", "ajax", "promise"],
  "license": "MIT"
}
```

### Parse Version

**Using grep:**
```bash
curl "https://registry.npmjs.org/axios/latest" | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4
```

**Expected output:**
```
1.7.2
```

### Check Peer Dependencies

**Using npm info:**
```bash
npm info {package} peerDependencies
```

**Example:**
```bash
npm info @types/react peerDependencies
```

**Output:**
```json
{ react: "^18" }
```

## Context7 MCP Server Integration

### When to Use Context7

**Use Context7 when you need:**
- ✅ Deep understanding of library features and API
- ✅ Framework-specific integration patterns (React, Vue, Angular)
- ✅ Detailed comparison between multiple libraries
- ✅ Best practices for complex library usage
- ✅ Migration guides (e.g., moment.js → date-fns)

**Do NOT use Context7 for:**
- ❌ Simple version lookup (use npm registry API instead)
- ❌ Well-known libraries with obvious choices (express, axios, lodash)
- ❌ Quick decisions when WebSearch provides clear answer

### Context7 Tools

#### 1. mcp__context7__resolve-library-id

**Purpose:** Find the library ID in Context7's knowledge base

**Input:**
```
Query: "[library name] javascript" or "[library name] npm"
```

**Examples:**
```
"axios javascript"
"vitest npm"
"date-fns javascript"
"react router npm"
```

**Output:**
```
library_id: "axios"
```

#### 2. mcp__context7__get-library-docs

**Purpose:** Retrieve detailed documentation and patterns

**Input:**
```
library_id: "axios"
```

**Output:**
- Feature overview
- API reference
- Integration patterns
- Best practices
- Common use cases

### Example Workflow with Context7

**Scenario:** User needs testing framework, unsure between jest and vitest

**Step 1: WebSearch**
```
Query: "jest vs vitest 2025 Node.js testing"
Results: vitest is faster, better ESM support, similar API to jest
```

**Step 2: Context7 (for detailed comparison)**
```
1. mcp__context7__resolve-library-id("vitest npm")
   → library_id: "vitest"

2. mcp__context7__get-library-docs(library_id)
   → Features:
     - Vite-powered (extremely fast)
     - Native ESM support
     - Jest-compatible API
     - TypeScript support out-of-the-box

3. Compare with jest (if needed)
```

**Step 3: Version Lookup (Web)**
```
npm registry: vitest
→ Version: 1.6.0
```

**Output:**
```markdown
### Recommendation: vitest

**Why:**
- WebSearch: 10x faster than jest, modern ESM support
- Context7: Vite-powered, jest-compatible API, excellent DX
- Native TypeScript support, hot module reload for tests
- Growing community, backed by Vite ecosystem

**Latest Version:** 1.6.0 (verified via npm registry)

**Installation:**
``bash
npm install -D vitest@1.6.0
``

**package.json:**
``json
{
  "devDependencies": {
    "vitest": "^1.6.0"
  },
  "scripts": {
    "test": "vitest"
  }
}
``

**TypeScript:** Native support ✅
**ESM Support:** Yes ✅ (native ESM)
**Node.js Compatibility:** Node.js 18+
**Context7 Used:** Yes (for feature comparison with jest)
**Alternative:** jest (if you need broader ecosystem compatibility or existing jest setup)
```

## Common Scenarios

### Scenario 1: HTTP Client for Node.js

**User:** "I need an HTTP client for making API requests"

**Process:**

1. **Read package.json:**
   ```json
   {
     "engines": {
       "node": ">=20.0.0"
     },
     "devDependencies": {
       "typescript": "^5.4.5"
     }
   }
   ```
   → Node.js 20+, TypeScript project

2. **WebSearch:**
   ```
   "HTTP client Node.js 2025 best practice"
   ```
   → Result: axios (most popular), node-fetch (native Fetch API), got (advanced features)

3. **npm registry API:**
   ```bash
   curl "https://registry.npmjs.org/axios/latest"
   ```
   → Version: 1.7.2

4. **TypeScript Check:**
   → axios includes native TypeScript definitions ✅

**Output:**
```markdown
### Recommendation: axios

**Why:**
- Most popular HTTP client (100M+ weekly downloads)
- Promise-based API with interceptors
- Native TypeScript support
- Works in both Node.js and browsers
- Excellent error handling and request/response transformation

**Latest Version:** 1.7.2 (verified via npm registry)

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
**ESM Support:** Yes ✅ (dual mode)
**Node.js Compatibility:** Node.js 12+
**Peer Dependencies:** None
**Context7 Used:** No
**Alternative:** node-fetch (if you prefer native Fetch API style), got (if you need retries, pagination, HTTP/2)
```

### Scenario 2: Replace Deprecated moment.js

**User:** "Using moment.js for date handling"

**Process:**

1. **Detect deprecated usage:**
   - moment.js is in maintenance mode (no new features)
   - Large bundle size (problematic for frontend)
   - Mutable API (error-prone)

2. **WebSearch:**
   ```
   "moment.js alternative 2025 JavaScript"
   ```
   → Result: date-fns (modular, immutable), day.js (lightweight)

3. **npm registry API:**
   ```bash
   curl "https://registry.npmjs.org/date-fns/latest"
   ```
   → Version: 3.6.0

**Output:**
```markdown
### Recommendation: Migrate from moment.js to date-fns

**Why:**
- moment.js is in maintenance mode (no new features)
- date-fns is modular (tree-shakeable, smaller bundles)
- Immutable API (more predictable, fewer bugs)
- Native TypeScript support
- 12M+ weekly downloads, actively maintained

**Latest Version:** 3.6.0 (verified via npm registry)

**Migration:**

**Old (moment.js):**
``javascript
import moment from 'moment';

const tomorrow = moment().add(1, 'days').format('YYYY-MM-DD');
``

**New (date-fns):**
``javascript
import { addDays, format } from 'date-fns';

const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
``

**Installation:**
``bash
npm install date-fns@3.6.0
npm uninstall moment
``

**package.json:**
``json
{
  "dependencies": {
    "date-fns": "^3.6.0"
  }
}
``

**TypeScript:** Native support ✅
**ESM Support:** Yes ✅
**Node.js Compatibility:** Node.js 14+
**Bundle Size:** ~18KB (tree-shakeable) vs moment.js ~232KB
**Context7 Used:** No
**Alternative:** day.js (if you need moment.js-compatible API and minimal migration)
**Deprecated:** moment.js (migrate away from this)
```

### Scenario 3: Testing Framework for New Project

**User:** "Set up testing for new Node.js project"

**Process:**

1. **Read package.json:**
   ```json
   {
     "type": "module",
     "engines": {
       "node": ">=20.0.0"
     }
   }
   ```
   → ESM project, Node.js 20+

2. **WebSearch:**
   ```
   "Node.js testing framework 2025 ESM"
   ```
   → Result: vitest (fast, ESM-native), jest (mature ecosystem)

3. **npm registry API:**
   ```bash
   curl "https://registry.npmjs.org/vitest/latest"
   ```
   → Version: 1.6.0

**Output:**
```markdown
### Recommendation: vitest

**Why:**
- Vite-powered (10x faster than jest)
- Native ESM support (perfect for your module project)
- Jest-compatible API (easy migration if needed)
- Native TypeScript support, no config needed
- Hot module reload for tests

**Latest Version:** 1.6.0 (verified via npm registry)

**Installation:**
``bash
npm install -D vitest@1.6.0
``

**package.json:**
``json
{
  "devDependencies": {
    "vitest": "^1.6.0"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
``

**TypeScript:** Native support ✅
**ESM Support:** Yes ✅ (native ESM, perfect for your project)
**Node.js Compatibility:** Node.js 18+
**Peer Dependencies:** None
**Context7 Used:** No
**Alternative:** jest (if you need broader ecosystem or existing plugins)
```

### Scenario 4: TypeScript Type Definitions

**User:** "Need TypeScript types for express"

**Process:**

1. **Check if express has native TS support:**
   ```bash
   curl "https://registry.npmjs.org/express/latest" | grep '"types"'
   ```
   → express does NOT have native TypeScript

2. **Search for @types:**
   ```bash
   npm search @types/express
   ```
   → @types/express available

3. **npm registry API:**
   ```bash
   curl "https://registry.npmjs.org/@types/express/latest"
   ```
   → Version: 4.17.21

**Output:**
```markdown
### Recommendation: @types/express

**Why:**
- express does not include native TypeScript definitions
- @types/express provides community-maintained type definitions
- Part of DefinitelyTyped (high-quality, well-maintained)

**Latest Version:** 4.17.21 (verified via npm registry)

**Installation:**
``bash
npm install -D @types/express@4.17.21
``

**package.json:**
``json
{
  "dependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}
``

**TypeScript:** @types package ✅
**Node.js Compatibility:** Matches express version
**Peer Dependencies:** express (ensure version compatibility)
**Context7 Used:** No
```

### Scenario 5: Validation Library

**User:** "Need request validation for Express API"

**Process:**

1. **Read package.json:**
   ```json
   {
     "dependencies": {
       "express": "^4.19.2"
     },
     "devDependencies": {
       "typescript": "^5.4.5"
     }
   }
   ```
   → Express + TypeScript

2. **WebSearch:**
   ```
   "request validation Node.js Express 2025"
   ```
   → Result: zod (TypeScript-first), joi (mature), yup (simple)

3. **npm registry API:**
   ```bash
   curl "https://registry.npmjs.org/zod/latest"
   ```
   → Version: 3.23.8

**Output:**
```markdown
### Recommendation: zod

**Why:**
- TypeScript-first validation library
- Excellent type inference (TypeScript types from schema)
- Zero dependencies, small bundle size
- Great DX, chainable API
- 10M+ weekly downloads

**Latest Version:** 3.23.8 (verified via npm registry)

**Installation:**
``bash
npm install zod@3.23.8
``

**package.json:**
``json
{
  "dependencies": {
    "zod": "^3.23.8"
  }
}
``

**Usage Example:**
``typescript
import { z } from 'zod';
import express from 'express';

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(18)
});

app.post('/users', (req, res) => {
  const result = userSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }
  // result.data is fully typed!
});
``

**TypeScript:** Native support ✅ (excellent type inference)
**ESM Support:** Yes ✅
**Node.js Compatibility:** Node.js 12+
**Peer Dependencies:** None
**Context7 Used:** No
**Alternative:** joi (if you prefer non-TS-first approach), yup (simpler API)
```

## Decision Heuristics

### Priority Order

When choosing between multiple libraries:

1. **Active Maintenance** (highest priority)
   - Weekly npm downloads (indicator of usage)
   - Recent commits (within 6 months)
   - Active issue/PR handling
   - Regular releases

2. **TypeScript Support** (if project uses TS)
   - Native TS support > @types/package > No support
   - Type inference quality
   - Generic support

3. **ESM Support** (important for modern Node.js)
   - Native ESM preferred
   - Dual mode (ESM + CommonJS) acceptable
   - CommonJS-only for legacy only

4. **Community Support**
   - Weekly downloads (npm)
   - GitHub stars
   - StackOverflow questions/answers
   - Corporate backing (Google, Meta, Vercel, etc.)

5. **Performance**
   - Benchmarks available
   - Bundle size (for frontend)
   - Runtime performance

### Red Flags

**Avoid packages with these characteristics:**

- ❌ **No updates >1 year** (unless extremely stable)
- ❌ **Deprecated or archived** (e.g., moment.js, request)
- ❌ **Replaced by newer package** (e.g., moment.js → date-fns)
- ❌ **Known security vulnerabilities** (check npm audit)
- ❌ **Very low weekly downloads** (<1000, unless very new)
- ❌ **Poor TypeScript support** (if project uses TS)
- ❌ **No ESM support** (for modern Node.js projects)
- ❌ **Large bundle size** (for frontend libraries)

### Framework-Specific Patterns

**React:**
- Prefer React-specific packages (e.g., react-hook-form > generic form library)
- Check React version compatibility (peer dependencies)
- Hooks-based libraries preferred over HOCs/render props

**Express:**
- Prefer Express middleware pattern
- Check Express version compatibility
- Native TypeScript support important

**Next.js:**
- Prefer Next.js-specific integrations
- Check SSR compatibility
- Bundle size critical (affects page load)

## Package Manager Comparison

### npm (default)

**Install:**
```bash
npm install {package}
npm install -D {package}  # devDependency
```

**Lock file:** `package-lock.json`

**Speed:** Medium

### yarn

**Install:**
```bash
yarn add {package}
yarn add -D {package}  # devDependency
```

**Lock file:** `yarn.lock`

**Speed:** Fast

### pnpm

**Install:**
```bash
pnpm add {package}
pnpm add -D {package}  # devDependency
```

**Lock file:** `pnpm-lock.yaml`

**Speed:** Fastest
**Disk usage:** Most efficient (content-addressable storage)

## Quick Reference: Common Libraries

### HTTP Clients
- **axios** ✅ (Promise-based, interceptors, 100M+ weekly downloads)
- **node-fetch** ✅ (Native Fetch API style, lightweight)
- **got** (Advanced features: retries, pagination, HTTP/2)
- ❌ **request** (deprecated, use axios/node-fetch)

### Testing
- **vitest** ✅ (Fast, ESM-native, jest-compatible)
- **jest** ✅ (Mature ecosystem, widely used)
- **mocha** + **chai** (Classic combo, flexible)
- ❌ **ava** (less active development)

### Validation
- **zod** ✅ (TypeScript-first, type inference)
- **joi** ✅ (Mature, widely used)
- **yup** (Simple, React-friendly)

### Date Handling
- **date-fns** ✅ (Modular, tree-shakeable, immutable)
- **day.js** (Lightweight, moment.js-compatible API)
- ❌ **moment.js** (deprecated, large bundle, mutable)

### Utilities
- **lodash-es** ✅ (ESM version, tree-shakeable)
- **ramda** (Functional programming style)
- ❌ **lodash** (use lodash-es for better tree-shaking)

### Web Frameworks
- **express** ✅ (Most popular, mature, middleware ecosystem)
- **fastify** (High performance, schema validation)
- **hapi** (Enterprise-grade, configuration-centric)
- **koa** (Lightweight, from Express creators)

### Frontend Frameworks
- **React** ✅ (Most popular, large ecosystem)
- **Vue** ✅ (Progressive, gentle learning curve)
- **Angular** (Full framework, TypeScript-first)
- **Svelte** (Compile-time framework, no virtual DOM)

### State Management (React)
- **zustand** ✅ (Simple, hooks-based, lightweight)
- **Redux Toolkit** ✅ (Official Redux with less boilerplate)
- **jotai** (Atomic state, Recoil-inspired)
- ❌ **Redux** (use Redux Toolkit instead)

### Form Handling (React)
- **react-hook-form** ✅ (Performant, minimal re-renders)
- **formik** (Feature-rich, more opinionated)
- **react-final-form** (Subscription-based, flexible)

### Logging
- **winston** ✅ (Feature-rich, transports, levels)
- **pino** (High performance, JSON logging)
- **bunyan** (JSON logging, CLI tools)

### Process Management
- **pm2** ✅ (Production process manager, cluster mode)
- **nodemon** (Development auto-restart)

## TypeScript Integration

### Native TypeScript Support

**Prefer packages with native TS support:**
```typescript
// Package includes .d.ts files
import axios from 'axios';  // axios has native TS support
```

**Benefits:**
- First-class type support
- Better type inference
- Maintained by library authors
- No version mismatch issues

### DefinitelyTyped (@types)

**For packages without native TS:**
```typescript
// Need separate @types package
import express from 'express';
// Also install: @types/express
```

**Installation:**
```bash
npm install express
npm install -D @types/express
```

**Version matching:**
- @types versions usually match package versions
- e.g., express@4.19.2 → @types/express@4.17.x

## ESM vs CommonJS

### ESM (Modern, Preferred)

**package.json:**
```json
{
  "type": "module"
}
```

**Import syntax:**
```javascript
import express from 'express';
import { readFile } from 'fs/promises';
```

**Benefits:**
- Tree-shaking (smaller bundles)
- Static analysis
- Modern standard

### CommonJS (Legacy)

**Import syntax:**
```javascript
const express = require('express');
const fs = require('fs');
```

**When to use:**
- Legacy projects
- Libraries not ESM-compatible yet

### Dual Mode

**Best practice for library authors:**
```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

## Common Pitfalls

### Pitfall 1: Peer Dependency Conflicts

**Problem:**
```bash
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! peer react@"^18.0.0" from react-router-dom@6.20.0
```

**Solution:**
Check peer dependencies and upgrade/downgrade as needed:
```bash
npm info react-router-dom peerDependencies
```

### Pitfall 2: @types Version Mismatch

**Problem:**
```typescript
// TypeScript errors due to version mismatch
import express from 'express';
```

**Solution:**
Match @types version with package version:
```bash
npm install express@4.19.2
npm install -D @types/express@4.17.21
```

### Pitfall 3: Using Deprecated Packages

**Problem:**
```javascript
// moment.js is deprecated
import moment from 'moment';
```

**Solution:**
```javascript
// Use modern alternative
import { format, addDays } from 'date-fns';
```

### Pitfall 4: ESM/CommonJS Mixing

**Problem:**
```javascript
// ESM project trying to use CommonJS package
import oldPackage from 'old-commonjs-package';  // Error!
```

**Solution:**
Either:
1. Find ESM-compatible alternative
2. Use dynamic import: `const pkg = await import('package')`
3. Switch to CommonJS (not recommended)

## Additional Resources

### Official Documentation
- npm registry: https://www.npmjs.com/
- npm CLI docs: https://docs.npmjs.com/
- Node.js: https://nodejs.org/
- TypeScript: https://www.typescriptlang.org/

### Package Quality Checks
- npm trends: https://npmtrends.com/ (compare packages)
- bundlephobia: https://bundlephobia.com/ (check bundle size)
- npm-stat: https://npm-stat.com/ (download statistics)

### Security
- npm audit: `npm audit`
- Snyk: https://snyk.io/
- Socket: https://socket.dev/

### Version Management
- npm-check-updates: `npx npm-check-updates`
- Renovate Bot: Automated dependency updates
- Dependabot: GitHub's dependency updater
