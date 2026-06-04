# Workflow Integration How-To (binding pattern)

> **Status:** Binding outcome of spike #9. This document is the **single, authoritative**
> integration pattern for calling repo-local `Workflow` scripts from a `SKILL.md`.
> Issues #10 (`code-review`) and #11 (`architecture-audit`) implement against it.
>
> Every decision below was verified with a real proof-of-concept (see
> [Appendix: PoC evidence](#appendix-poc-evidence)). Where the IST-skeletons in
> #10/#11 disagree with this document, **this document wins** (the skeletons are
> illustrative, not normative — spike #9, question F).

---

## 0. What the `Workflow` feature is (one paragraph)

`Workflow` runs a deterministic JavaScript orchestration script in a **sandbox**
(no filesystem, no shell — only the `agent()`/`parallel()`/`pipeline()` hooks).
The main model launches it via the `Workflow` tool with either an inline `script`
or a `scriptPath` to a file on disk, plus an optional `args` value. The script
fans out subagents (which *do* have normal tools), returns structured data, and
the main model takes it from there. We use `scriptPath` (repo-local file) for all
plugin skills.

---

## 1. Decision table (questions A–J)

| # | Question | **Decision** |
|---|----------|--------------|
| **A** | Script location & naming | `skills/<skill>/<name>.workflow.js`, **one file per skill** (`review.workflow.js`, `audit.workflow.js`). Use a `skills/<skill>/workflow/` subdir only if a skill ever needs multiple scripts. |
| **B** | How `SKILL.md` calls the script | Main model resolves **`{skill_dir}`** (absolute path of the skill's own directory — same mechanism `skills/qa/` already uses in production) and builds `scriptPath = {skill_dir}/<name>.workflow.js`. **Do not** rely on `${CLAUDE_PLUGIN_ROOT}` in shell — it is empty in the normal tool context (verified). |
| **C** | Input passing | One **structured object** via the tool's `args` field, with a stable shape (see §4). **Critical empirical finding:** `args` arrives in the script as a **JSON string**, not a parsed object → the script MUST normalize: `const input = typeof args === "string" ? JSON.parse(args) : (args ?? {})`. Flags are **fields**, never a bare array. |
| **D** | Sandbox I/O boundary | Main model collects all inputs **before** the call and writes all output **after** the call. The script touches **no files**. Exception: a final in-workflow `agent()` is allowed only when a synthesis step genuinely needs every prior result in one reasoning context (e.g. #11's consolidation stage). |
| **E** | Opt-in & fallback | The `SKILL.md` instruction to call `Workflow` **is** the opt-in (state it explicitly). Strategy = **graceful fallback**: keep the existing prompt-based `orchestration.md` path usable when the feature is unavailable/declined. Consequence: `orchestration.md`/`reference.md` MUST stay a complete spec. |
| **F** | Hook form | **Globals after the `meta` block.** No `export default async function ({...})`, no `input` parameter (verified: `input` is `undefined`). Use `agent`, `parallel`, `pipeline`, `phase`, `log`, `args`, `budget`, `workflow` directly. Canonical skeleton in §3. |
| **G** | Schema / model / phases | JSON schemas live **inline** as `const …Schema = {…}`. Per-specialist model choice lives in a **registry constant**. `meta.phases` titles MUST match the `phase()` calls. |
| **H** | Packaging | `.workflow.js` **is** distributed. Verified: the install copy is a full, unfiltered tree copy (it contains `.j2`, `.xml`, `.svg`, `.iml`, `.yml`, dotfiles, even `.idea/`); `plugin.json` has no `files` whitelist; `.gitignore` has no `*.js` rule (`git check-ignore` → not ignored). The live file appears in the cache copy at the next version bump/re-copy. |
| **I** | Resume & local testing | Iterate with `scriptPath` + `resumeFromRunId` (cached agents return instantly). See §6. |
| **J** | Single source of truth | **Script is authoritative for control flow & activation.** The `.md` files (`orchestration.md`, specialist/analyzer rule files) remain authoritative for the **domain content** and human-readable rules. Keep them consistent. |

---

## 2. The flow in three actors

```
┌─ SKILL.md (main model, full tools) ──────────────────────────────┐
│ 1. Parse mode/flags, run --help / arg validation                 │
│ 2. Collect inputs: git diff, file lists, ctx flags, date, scope  │
│ 3. Resolve scriptPath = {skill_dir}/<name>.workflow.js           │
│ 4. Call Workflow tool { scriptPath, args: <structured object> }  │
│ 7. Receive structured return → render report → WRITE to claudedocs│
└──────────────────────────────────────────────────────────────────┘
        │ args (JSON)                         ▲ structured result
        ▼                                     │
┌─ <name>.workflow.js (sandbox, NO fs) ────────────────────────────┐
│ 5. const input = typeof args==="string" ? JSON.parse(args) : args │
│    orchestrate agents (parallel/pipeline), pure-JS reduce         │
│ 6. return structured data  (writes nothing)                      │
└──────────────────────────────────────────────────────────────────┘
        │ agent() spawns                       ▲ schema-validated objects
        ▼                                      │
┌─ subagents (normal tools: Read/Grep/WebSearch/…) ────────────────┐
│ read rule files, analyze, return schema-validated findings        │
└──────────────────────────────────────────────────────────────────┘
```

The only thing the sandbox script does is orchestrate and compute. **Reads
before, writes after — both outside the script.**

---

## 3. Canonical correct skeleton (question F + G)

```javascript
// skills/<skill>/<name>.workflow.js

export const meta = {
  name: "my-skill",
  description: "One-line summary shown in the permission dialog.",
  // meta.phases titles MUST equal the phase() arguments below.
  phases: [{ title: "Analyze" }, { title: "Reduce" }],
};

// (C) Args arrive as a JSON STRING in the current client — normalize defensively.
const input = typeof args === "string" ? JSON.parse(args) : (args ?? {});
const { mode, files, diff, ctx, flags, scope, date } = input;

// (G) Schemas are inline consts.
const FINDING_SCHEMA = {
  type: "object",
  required: ["id", "result"],
  properties: { id: { type: "string" }, result: { type: "string" } },
};

// (G) Per-task model choice as a registry constant.
const TASKS = [
  { id: "a", rule: "rules/a.md", model: "opus" },
  { id: "b", rule: "rules/b.md", model: "haiku" },
];

// (F) Globals are used directly — NO `export default`, NO `input` parameter.
phase("Analyze");
const results = await parallel(
  TASKS.map((t) => () =>
    agent(buildPrompt(t, { files, diff, ctx }), {
      schema: FINDING_SCHEMA,
      model: t.model,
      label: t.id,
      phase: "Analyze",
    })
  )
);

// (D) Pure-JS reduction — no filesystem, no shell.
phase("Reduce");
const ok = results.filter(Boolean); // failed agents resolve to null in parallel/pipeline
return { mode, count: ok.length, findings: ok };

function buildPrompt(task, ctx) {
  // String assembly ONLY. Never read a file here — the subagent reads its own
  // rule file (it has normal tools); the sandbox script does not.
  return `Read ${task.rule} and apply it. Context: ${JSON.stringify(ctx)}`;
}
```

**Anti-pattern (what the IST-skeletons wrongly show):**

```javascript
// ❌ WRONG — this hook form does not exist in the Workflow API.
export default async function ({ agent, pipeline, parallel, phase, log, input }) {
  const { mode } = input; // `input` is undefined; destructured params are not provided
}
```

---

## 4. The `args` convention (question C)

The main model passes **one structured object**. Stable shape across all skills
(omit fields a given skill doesn't need):

```jsonc
{
  "mode":  "diff",                 // "diff" | "single-file" | "complete" | "renovate" | …
  "files": ["src/a.ts", "src/b.ts"],
  "diff":  "<unified diff text>",  // or full file contents for complete/single-file modes
  "ctx":   { "source": true, "tests": false, "layers": 3, "newDeps": false,
             "guidelines": true, "adrs": true },
  "flags": { "quick": false, "save": true, "stack": "node" }, // flags are FIELDS, not an array
  "scope": "src/module",          // optional path scope
  "date":  "2026-06-04"           // YYYY-MM-DD — pass in; Date.now()/new Date() throw in the sandbox
}
```

Rules:

- **Flags are object fields** (`flags.quick`), never `args.includes("--quick")` — the
  IST-skeletons' array assumption is wrong.
- **The script must `JSON.parse` when `typeof args === "string"`** (see §3). This is
  not optional — it is the observed runtime behavior.
- **Dates/timestamps come in via `args.date`.** `Date.now()`, `Math.random()`, and
  arg-less `new Date()` throw inside the sandbox (they would break resume).

---

## 5. Opt-in & graceful fallback (question E)

1. `SKILL.md` states explicitly: *"Call the `Workflow` tool with `scriptPath = {skill_dir}/<name>.workflow.js` and the `args` below."* That instruction is the opt-in.
2. If the feature is unavailable or the user declines, **fall back** to the existing
   prompt-based orchestration documented in `orchestration.md`. Therefore
   `orchestration.md`/`reference.md` must remain a **complete** specification of the
   activation matrix, sequencing, model choice, consolidation, and report format —
   they are not reduced to stubs by this migration.
3. Non-interactive contexts (cron/headless) may not be able to grant the opt-in →
   another reason the prompt-based path stays alive.

---

## 6. Local testing & resume (question I)

- **First run:** call `Workflow` with `scriptPath` (absolute) + `args`. The tool
  returns a `Run ID`.
- **Iterate:** edit the `.workflow.js`, then re-invoke
  `Workflow({ scriptPath, resumeFromRunId: "<run id>" })`. The longest unchanged
  prefix of `agent()` calls returns cached results instantly; only edited/new calls
  re-run. (For pure orchestration-logic changes with the same agents, this is
  near-instant.)
- **Inspect:** use `/workflows` to watch live, or `TaskOutput` on the returned task id.
- **Diagnosing `args`:** if values are missing, first check `typeof args` — it is a
  string, not an object (see §4).

---

## 7. Migration checklist (for #10 and #11)

- [ ] Script at `skills/<skill>/<name>.workflow.js`, canonical hook form (§3).
- [ ] `SKILL.md`: keep mode parsing, `--help`, arg validation, input collection;
      add the explicit `Workflow` call with `{skill_dir}`-resolved `scriptPath`.
- [ ] `args` normalized with the `JSON.parse` guard; flags as fields.
- [ ] Script writes **nothing**; main model writes the report after return
      (`code-review` → `claudedocs/code-review-result.md`;
      `architecture-audit` → `claudedocs/architecture-audit-YYYY-MM-DD.md`).
- [ ] Schemas inline; model registry constant; `meta.phases` ↔ `phase()` match.
- [ ] `orchestration.md` kept as complete fallback spec (question E).
- [ ] Failure handling: failed agents resolve to **`null`** in `parallel`/`pipeline`
      (filter with `.filter(Boolean)`) — **do not** rely on `agent(...).catch()`.
- [ ] Behavior-parity test on a small repo against the documented orchestration.

---

## Appendix: PoC evidence

A throwaway PoC skill (`skills/workflow-poc/`, removed after the spike) proved the
mechanics end-to-end. Reproduced runs (client `claude-code_2-1-162`):

| Run | `args` passed | Observed in script | Proves |
|-----|---------------|--------------------|--------|
| `wf_e3019435` | `{echo, topics:[3]}` (object) | `args.echo=undefined`, defaults used | args is **not** a ready object |
| `wf_b29baef2` | `{echo, topics, nested}` | `typeof args === "string"`; `input` is `undefined` | **C**: args = JSON string; **F**: no `input` global |
| `wf_846896e0` | `{echo:"spike-9-final-marker", topics:[3]}` | after `JSON.parse`: echo round-tripped, 3 agents fanned out, 3 schema-valid answers, script wrote nothing | **B/C/D/E/G** end-to-end |

Packaging (**H**): install copy at
`~/.claude/plugins/cache/local-dev-marketplace/agenticaiplugin/<version>/` is a
full unfiltered tree copy (contains `.j2/.xml/.svg/.iml/.yml/.gitignore/.idea/…`);
no `files` whitelist in `plugin.json`; `git check-ignore skills/code-review/review.workflow.js`
→ not ignored. A `.workflow.js` is therefore shipped like any sibling file.

---

## Risks surfaced by the spike

- **`args` string-parsing is mandatory.** Every migration must apply the
  `JSON.parse` guard or all inputs silently fall back to defaults (this exact bug
  was reproduced twice before the fix).
- **`${CLAUDE_PLUGIN_ROOT}` is not a reliable shell variable** in the tool context
  (empty). Path resolution uses `{skill_dir}`.
- **No `agent().catch()` failure handling.** Failures surface as `null`; use
  `.filter(Boolean)`. The IST-skeletons' `.catch()` would not fire.
