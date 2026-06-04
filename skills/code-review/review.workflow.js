// Multi-specialist code review — detect -> adversarially verify -> consolidate.
// Migration of skills/code-review (issue #10) onto the Workflow feature.
//
// Integration pattern: docs/workflow-integration-howto.md (spike #9).
//   - Hook form: globals after meta block, no `export default`, no `input`.
//   - args arrives as a JSON string -> JSON.parse guard below.
//   - Sandbox: this script touches NO files. The main model collects inputs
//     (git diff, ctx, manifests, skillDir, date) before, and writes the report
//     after. Subagents read rule files via the absolute `skillDir`.
//   - Failure handling: failed agents resolve to null (no reject) AND are wrapped
//     in try/catch — both are handled defensively; never `.catch()`-only.
//
// Authoritative for: activation matrix, phase sequencing, dedup/sort, verify pass.
// orchestration.md remains the human-readable spec + prompt-based fallback.

export const meta = {
  name: "code-review",
  description: "Multi-specialist code review: detect, adversarially verify, consolidate findings.",
  phases: [
    { title: "Phase 1: Dependencies" },
    { title: "Phase 2: Specialists" },
    { title: "Verify" },
    { title: "Consolidate" },
  ],
};

const PHASE = {
  deps: "Phase 1: Dependencies",
  specialists: "Phase 2: Specialists",
  verify: "Verify",
  consolidate: "Consolidate",
};

// ── Config ───────────────────────────────────────────────────────────────
const VERIFIERS = 3;                 // odd -> clear majority
const SEVERITY_ORDER = { Critical: 0, Warning: 1, Suggestion: 2 };
const VERIFIED_SEVERITIES = ["Critical", "Warning"]; // Suggestions skip verify (cost)

// ── Schemas (mirror shared/specialist-output-format.md + issue-classification.md) ──
const findingsSchema = {
  type: "object",
  required: ["findings"],
  properties: {
    specialist: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        required: ["severity", "file", "line", "description", "rule"],
        properties: {
          severity: { enum: ["Critical", "Warning", "Suggestion"] },
          file: { type: "string" },
          line: { type: "integer" },           // 0 = file-level / not line-specific
          description: { type: "string" },
          rule: { type: "string" },            // "{Category} → {Rule}"
          fix: { type: "string" },             // Critical/Warning
          impact: { type: "string" },          // Warning
          benefit: { type: "string" },         // Suggestion
        },
      },
    },
  },
};

// Verifier verdict: structured, no free text parsing.
const verdictSchema = {
  type: "object",
  required: ["verdict", "reasoning"],
  properties: {
    verdict: { enum: ["confirmed", "refuted", "uncertain"] },
    reasoning: { type: "string" },
    corrected_severity: { enum: ["Critical", "Warning", "Suggestion", "drop"] },
  },
};

// ── Specialist registry — activation + per-specialist model as real JS logic ──
// Models 1:1 with orchestration.md "Model selection per specialist".
const DEP_SPEC = { id: "01", name: "Dependencies & Versions", file: "01-dependencies-versions.md", model: "haiku" };
const SPECIALISTS = [
  { id: "02", name: "Security & Data Safety",     file: "02-security-data-safety.md",     model: "opus",   when: (c) => c.source },
  { id: "03", name: "Architecture & Layers",      file: "03-architecture-layers.md",      model: "opus",   when: (c) => c.source && (c.layers >= 3 || c.newDeps) },
  { id: "04", name: "Design Patterns (GoF)",      file: "04-design-patterns.md",          model: "haiku",  when: (c) => c.source },
  { id: "05", name: "SOLID & Code Smells",        file: "05-solid-code-smells.md",        model: "sonnet", when: (c) => c.source },
  { id: "06", name: "Code Quality & Correctness", file: "06-code-quality-correctness.md", model: "haiku",  when: (c) => c.source },
  { id: "07", name: "Dead Code & Duplication",    file: "07-dead-code-duplication.md",    model: "haiku",  when: (c) => c.source },
  { id: "08", name: "Cross-Cutting Concerns",     file: "08-cross-cutting-concerns.md",   model: "sonnet", when: (c) => c.source },
  { id: "09", name: "Test Quality",               file: "09-test-quality.md",             model: "haiku",  when: (c) => c.tests },
  { id: "10", name: "Test Completeness & Infra",  file: "10-test-completeness-infra.md",  model: "haiku",  when: (c) => c.source },
  { id: "11", name: "Documentation & Comments",   file: "11-documentation-comments.md",   model: "haiku",  when: (c) => c.source },
];

// ── Input (spike #9: args may be a JSON string) ──────────────────────────
const input = typeof args === "string" ? JSON.parse(args) : (args ?? {});
const {
  mode = "diff",
  skillDir = "skills/code-review",
  files = [],
  diff = null,
  ctx = {},
  flags = {},
  manifests = [],
  date = "",
} = input;

// ════════════════════════════════════════════════════════════════════════
// --renovate: single-specialist dependency audit, NO verify pass
// (findings are registry-verifiable; orchestration.md Dependency Audit Flow).
// ════════════════════════════════════════════════════════════════════════
if (mode === "renovate") {
  phase(PHASE.deps);
  const out = await safeAgent(
    buildRenovatePrompt({ skillDir, manifests, flags }),
    { schema: findingsSchema, model: "haiku", label: "01 Dependency Audit", phase: PHASE.deps }
  );
  const findings = tag(out?.findings, DEP_SPEC);
  return {
    mode,
    date,
    renovate: true,
    findings: dedupeAndSort(findings),
    perSpecialist: [{ id: "01", name: DEP_SPEC.name, status: out ? "complete" : "failed", counts: count(findings) }],
    dropped: [],
  };
}

// ════════════════════════════════════════════════════════════════════════
// Standard review: diff | single-file | complete
// ════════════════════════════════════════════════════════════════════════

// ── Phase 1: Dependencies & Versions (sequential; context for Phase 2) ──
phase(PHASE.deps);
const phase1Out = await safeAgent(
  buildSpecialistPrompt(DEP_SPEC, { mode, files, diff, ctx, skillDir, phase1Summary: null }),
  { schema: findingsSchema, model: DEP_SPEC.model, label: "01 Dependencies", phase: PHASE.deps }
);
const phase1Findings = tag(phase1Out?.findings, DEP_SPEC);
const phase1Status = phase1Out ? "complete" : "failed";
const phase1Summary = summarize(phase1Findings, phase1Status);

// ── Activation as code (orchestration.md Selection Logic) ──
const active = SPECIALISTS.filter((s) => s.when(ctx));

// Docs/config-only: no Phase 2 specialists (parity with orchestration.md).
if (!ctx.source && !ctx.tests) {
  return {
    mode,
    date,
    note: "No code review needed — documentation/config changes only.",
    findings: dedupeAndSort(phase1Findings),
    perSpecialist: [specStatus(DEP_SPEC, phase1Status, phase1Findings)],
    activated: ["01"],
    dropped: [],
    phase1Status,
  };
}

// ── Phase 2 + Verify as a pipeline: each specialist's findings flow into
// verification without a global barrier (a fast haiku specialist verifies
// while a slow opus specialist is still analyzing). ──
phase(PHASE.specialists);
const reviewed = await pipeline(
  active,
  (spec) => runSpecialist(spec, { mode, files, diff, ctx, skillDir, phase1Summary }), // Stage 1
  (res) => verifySpecialistFindings(res, { mode, diff, ctx, skillDir })               // Stage 2
);

// ── Consolidation as deterministic JS (orchestration.md Step 2-4) ──
phase(PHASE.consolidate);
const valid = reviewed.filter(Boolean);
const kept = valid.flatMap((r) => r.kept);
const lowConf = valid.flatMap((r) => r.lowConf);   // refuted Criticals — excluded from findings, NOT silently dropped
const dropped = valid.flatMap((r) => r.dropped);   // refuted Warnings — audit trail only

// Main findings = survivors only. Refuted Criticals go to lowConfidence (auditable),
// refuted Warnings go to dropped (auditable) — neither pollutes the main report.
const consolidated = dedupeAndSort([...phase1Findings, ...kept]);
const lowConfidence = dedupeAndSort(lowConf);

const perSpecialist = [
  specStatus(DEP_SPEC, phase1Status, phase1Findings),
  ...active.map((spec) => {
    const r = valid.find((x) => x.spec.id === spec.id);
    if (!r) return specStatus(spec, "failed", []);
    return { id: spec.id, name: spec.name, status: r.status, counts: count(r.kept) };
  }),
  ...SPECIALISTS.filter((s) => !s.when(ctx)).map((s) => ({ id: s.id, name: s.name, status: "skipped", skipReason: skipReason(s, ctx), counts: count([]) })),
].sort((a, b) => a.id.localeCompare(b.id));

return {
  mode,
  date,
  findings: consolidated,
  lowConfidence,           // refuted Criticals (false-negative safety net) — show in an auditable section
  dropped,                 // refuted Warnings (verified false positives) — audit trail
  activated: active.map((s) => s.id),
  perSpecialist,
  phase1Status,
};

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

// agent() that never throws and never rejects: null on any failure.
async function safeAgent(prompt, opts) {
  try {
    const out = await agent(prompt, opts);
    return out ?? null;
  } catch (e) {
    log(`agent failed (${opts.label}): ${e?.message ?? e}`);
    return null;
  }
}

async function runSpecialist(spec, c) {
  const out = await safeAgent(
    buildSpecialistPrompt(spec, c),
    { schema: findingsSchema, model: spec.model, label: `${spec.id} ${spec.name}`, phase: PHASE.specialists }
  );
  if (!out) return { spec, status: "failed", findings: [] };
  return { spec, status: "complete", findings: tag(out.findings, spec) };
}

// Adversarial verify of one specialist's findings. Returns kept/dropped/lowConf.
async function verifySpecialistFindings(res, c) {
  const toVerify = res.findings.filter((f) => VERIFIED_SEVERITIES.includes(f.severity));
  const passthrough = res.findings.filter((f) => !VERIFIED_SEVERITIES.includes(f.severity)); // Suggestions

  const verdicts = await parallel(toVerify.map((f) => () => verifyFinding(f, c)));

  const kept = [...passthrough];
  const dropped = [];
  const lowConf = [];

  verdicts.forEach((v, i) => {
    const f = toVerify[i];
    if (!v) { kept.push(f); return; }                 // verify failed entirely -> keep finding (no false negative)
    if (v.survived) {
      const sev = v.correctedSeverity && v.correctedSeverity !== f.severity ? v.correctedSeverity : f.severity;
      kept.push({ ...f, severity: sev, ...(sev !== f.severity ? { originalSeverity: f.severity } : {}), confidence: v.confidence });
    } else if (f.severity === "Critical") {
      lowConf.push({ ...f, lowConfidence: true, confidence: v.confidence, verdicts: v.verdicts }); // never silently drop a Critical
    } else {
      dropped.push({ ...f, confidence: v.confidence, verdicts: v.verdicts });
    }
  });

  return { spec: res.spec, status: res.status, kept, dropped, lowConf };
}

// N independent verifiers try to REFUTE one finding. Survives iff confirmed > refuted.
async function verifyFinding(f, c) {
  const model = f.severity === "Critical" ? "opus" : "sonnet";
  const raw = await parallel(
    Array.from({ length: VERIFIERS }, () => () =>
      safeAgent(buildVerifierPrompt(f, c), { schema: verdictSchema, model, label: `verify ${f.file}:${f.line}`, phase: PHASE.verify })
    )
  );
  const ok = raw.filter(Boolean);
  if (ok.length === 0) return null; // total verify failure -> caller keeps the finding
  const confirmed = ok.filter((v) => v.verdict === "confirmed").length;
  const refuted = ok.filter((v) => v.verdict === "refuted").length; // uncertain counts as non-confirmation
  return {
    survived: confirmed > refuted,
    confidence: confirmed / ok.length,
    verdicts: ok,
    correctedSeverity: majorityCorrectedSeverity(ok),
  };
}

// If a clear majority of verdicts agree on one valid (non-drop) severity, use it.
function majorityCorrectedSeverity(verdicts) {
  const tally = {};
  for (const v of verdicts) {
    const s = v.corrected_severity;
    if (!s || s === "drop" || !(s in SEVERITY_ORDER)) continue;
    tally[s] = (tally[s] || 0) + 1;
  }
  let best = null, bestN = 0;
  for (const [s, n] of Object.entries(tally)) if (n > bestN) { best = s; bestN = n; }
  return bestN > verdicts.length / 2 ? best : null;
}

// ── Deterministic dedup + sort (orchestration.md Step 3/4) ──
// Key = file:line AND description similarity. Higher severity wins; tie-break:
// more specific rule. Different findings on the same line are NOT merged.
function dedupeAndSort(findings) {
  const groups = new Map(); // basename:line -> [merged findings]
  for (const f of findings) {
    // Specialists report paths inconsistently (absolute vs relative). Key on the
    // basename (also the IST report format `[FileName:Line]`) so the same issue
    // flagged by multiple specialists collapses regardless of path style.
    const file = basename(f.file);
    const key = `${file}:${f.line}`;
    const bucket = groups.get(key) || [];
    const match = bucket.find((g) => descSimilar(g.description, f.description));
    if (!match) {
      bucket.push({ ...f, file, alsoFlaggedBy: [] });
    } else {
      const keep = pickFinding(match, f);
      const other = keep === match ? f : match;
      Object.assign(match, keep, {
        file,
        alsoFlaggedBy: dedupeNames([...(match.alsoFlaggedBy || []), other.specialist]),
      });
    }
    groups.set(key, bucket);
  }
  const all = [...groups.values()].flat();
  return all.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      String(a.specialist).localeCompare(String(b.specialist)) ||
      String(a.file).localeCompare(String(b.file)) ||
      (a.line || 0) - (b.line || 0)
  );
}

function pickFinding(a, b) {
  const sa = SEVERITY_ORDER[a.severity] ?? 9;
  const sb = SEVERITY_ORDER[b.severity] ?? 9;
  if (sa !== sb) return sa < sb ? a : b;        // higher severity wins
  return ruleSpecificity(b.rule) > ruleSpecificity(a.rule) ? b : a; // tie-break: more specific rule
}
function ruleSpecificity(rule) { return (rule || "").includes("→") ? (rule.length + 100) : (rule || "").length; }

function descSimilar(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return true; // no description -> treat same-line as same finding
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union > 0 && inter / union >= 0.34;
}
function tokens(s) {
  return new Set(String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2));
}
function basename(p) { return String(p || "").split(/[\\/]/).pop(); }
function dedupeNames(a) { return [...new Set(a.filter(Boolean))]; }

function tag(findings, spec) {
  return (findings || []).map((f) => ({ ...f, specialist: spec.name, specialistId: spec.id }));
}
function count(findings) {
  return {
    critical: findings.filter((f) => f.severity === "Critical").length,
    warning: findings.filter((f) => f.severity === "Warning").length,
    suggestion: findings.filter((f) => f.severity === "Suggestion").length,
  };
}
function specStatus(spec, status, findings) {
  return { id: spec.id, name: spec.name, status, counts: count(findings) };
}
function skipReason(spec, c) {
  if (spec.id === "03") return "needs 3+ layers or new dependencies";
  if (spec.id === "09") return "no test files modified";
  return "no source files modified";
}
function summarize(findings, status) {
  if (status !== "complete") return "Phase 1 (Dependencies & Versions) failed — no version context available.";
  if (!findings.length) return "Phase 1 found no dependency/version issues.";
  return findings.map((f) => `- [${f.severity}] ${f.file}:${f.line} ${f.description} (${f.rule})`).join("\n");
}

// ── Prompt builders (full templates from orchestration.md — research step,
// rules file, guidelines/ADR override, priority hierarchy all preserved) ──
function buildSpecialistPrompt(spec, c) {
  const { mode, files, diff, ctx, skillDir, phase1Summary } = c;
  return [
    `You are a code review specialist for [${spec.name}].`,
    ``,
    `## Step 1: Research Current Standards`,
    `BEFORE reviewing any code, identify the project's technology stack from the files`,
    `and Phase 1 context, then research CURRENT best practices for the detected`,
    `language(s), framework(s) and their versions, and key libraries. Use WebSearch or`,
    `Context7 (resolve-library-id -> query-docs) for "[framework] [version] best practices",`,
    `migration guides (if Phase 1 found an outdated version), and language coding standards.`,
    `This keeps the review based on up-to-date standards, not outdated patterns.`,
    ``,
    `## Step 2: Read Your Rules`,
    `Read your review rules file: ${skillDir}/specialists/${spec.file}`,
    `Severity definitions: ${skillDir}/shared/issue-classification.md`,
    ``,
    ctx.guidelines
      ? `## Project Guidelines (OVERRIDE skill rules on conflict)\nRead and apply: claudedocs/guidelines/*.md`
      : ``,
    ctx.adrs
      ? `## Architectural Decision Records\nRead and respect: claudedocs/adrs/*.md — treat ADRs as authoritative; flag code that contradicts documented decisions, and do NOT flag code that conforms to an ADR.`
      : ``,
    ``,
    `## Files to Review`,
    files.length ? files.map((f) => `- ${f}`).join("\n") : "- (see diff below)",
    mode === "diff" && diff
      ? `\n## Review Context (focus on changed lines)\n\`\`\`diff\n${diff}\n\`\`\``
      : `\n## Review Context\nMode: ${mode}. Read the listed files in full (you have file tools).`,
    phase1Summary
      ? `\n## Phase 1 Context (Dependencies & Versions)\n${phase1Summary}\nConsider this when making recommendations.`
      : ``,
    ``,
    `## Instructions`,
    `1. Identify the tech stack from the files and Phase 1 context.`,
    `2. Research current standards for the detected language, framework, libraries.`,
    `3. Read your specialist rules file and the severity definitions.`,
    `4. Apply your specialist rules AND current technology standards.`,
    `5. **Priority on conflict:** Project Guidelines > ADRs > Current Standards > Specialist Rules.`,
    `6. Return findings via the required schema only. severity ∈ {Critical,Warning,Suggestion};`,
    `   file; line (0 if not line-specific); description (one sentence); rule as "{Category} → {Rule}";`,
    `   fix for Critical/Warning; impact for Warning; benefit for Suggestion.`,
    `7. If no issues found, return an empty findings array.`,
    `8. Do NOT fix code, generate patches, or modify files — findings only.`,
  ].filter((l) => l !== ``).join("\n");
}

function buildVerifierPrompt(f, c) {
  const { mode, diff, ctx, skillDir } = c;
  return [
    `You are an adversarial verifier. Another reviewer produced the finding below.`,
    `Your job is to REFUTE it. Return "confirmed" ONLY if, after a serious attempt to`,
    `refute it, you cannot. Default to "refuted" when the finding does not hold, and to`,
    `"uncertain" only when the evidence is genuinely insufficient.`,
    ``,
    `## Finding under review`,
    `- Severity: ${f.severity}`,
    `- Location: ${f.file}:${f.line}`,
    `- Description: ${f.description}`,
    `- Rule: ${f.rule}`,
    f.fix ? `- Proposed fix: ${f.fix}` : ``,
    ``,
    `## How to verify`,
    `1. Read the actual code at ${f.file} (around line ${f.line}); you have file tools.`,
    `2. Check the claim against the real code, the diff, and the tech stack.`,
    ctx.guidelines ? `3. Check claudedocs/guidelines/*.md — a finding that contradicts a project guideline is refuted (or its severity corrected).` : ``,
    ctx.adrs ? `4. Check claudedocs/adrs/*.md — if the code conforms to a documented ADR, the finding is refuted (false positive).` : ``,
    `   Severity reference: ${skillDir}/shared/issue-classification.md.`,
    mode === "diff" && diff ? `\n## Diff context\n\`\`\`diff\n${diff}\n\`\`\`` : ``,
    ``,
    `## Common false positives to watch for`,
    `- "SQL injection" on a query that is in fact parameterized / uses bound parameters.`,
    `- "Layer violation" that is explicitly sanctioned by an ADR.`,
    `- "Hardcoded secret" that is a placeholder, test fixture, or example value.`,
    `- A severity that is too high for the actual impact (use corrected_severity).`,
    ``,
    `## Output`,
    `Return the verdict via the required schema: verdict ∈ {confirmed,refuted,uncertain};`,
    `reasoning (1-2 sentences); corrected_severity if the finding is real but mis-severitied`,
    `(or "drop" if it should not appear at all).`,
  ].filter((l) => l !== ``).join("\n");
}

function buildRenovatePrompt(c) {
  const { skillDir, manifests, flags } = c;
  return [
    `You are the Dependency Audit specialist. Perform a comprehensive dependency audit`,
    `for the ENTIRE project (not just changed files).`,
    ``,
    `## Your Rules`,
    `Read: ${skillDir}/specialists/01-dependencies-versions.md`,
    `## Registry APIs & Manifest Detection`,
    `Read: ${skillDir}/shared/known-deprecations.md`,
    `## Severity Definitions`,
    `Read: ${skillDir}/shared/issue-classification.md`,
    ``,
    `## Scope`,
    `Check ALL dependencies in the project.`,
    flags.stack ? `Only check ${flags.stack} dependencies.` : ``,
    flags.quick ? `Skip deprecation research — only check version currency.` : `Also check for deprecated/EOL libraries via WebSearch.`,
    ``,
    `## Manifest Files`,
    manifests.length ? manifests.map((m) => `- ${m}`).join("\n") : `- (detect via the patterns in known-deprecations.md)`,
    ``,
    `## Instructions`,
    `1. Read the manifest file(s) and extract all dependencies.`,
    `2. For each dependency, verify the latest stable version via the registry API.`,
    flags.quick ? `` : `3. Use WebSearch to check for deprecated/EOL libraries.`,
    `4. Return findings via the required schema (Critical/Warning/Suggestion).`,
  ].filter((l) => l !== ``).join("\n");
}
