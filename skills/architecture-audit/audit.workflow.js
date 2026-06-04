// Architecture audit — deterministic orchestration of the 7-analyzer audit.
// Migration of skills/architecture-audit (issue #11) onto the Workflow feature.
// Follows the pattern established by skills/code-review/review.workflow.js (#10)
// and docs/workflow-integration-howto.md (#9).
//
//   - Hook form: globals after meta block, no `export default`, no `input`.
//   - args arrives as a JSON string -> JSON.parse guard below.
//   - Sandbox: this script touches NO files. Discovery + tech-stack detection run
//     in the main model BEFORE (need Bash/Glob); the report is rendered + written
//     AFTER. Subagents read analyzer rule files via the absolute `skillDir` and
//     examine project files themselves.
//   - The overall rating is EXACT JS arithmetic (rating-scale.md), not LLM math.
//   - Date comes via args.date — Date.now()/new Date() throw in the sandbox.

export const meta = {
  name: "architecture-audit",
  description: "Deterministic 7-analyzer architecture audit with exact weighted rating math.",
  phases: [
    { title: "Pattern Recognition" },
    { title: "Dimension Analysis" },
    { title: "Consolidation" },
  ],
};

const PHASE = { p1: "Pattern Recognition", p2: "Dimension Analysis", cons: "Consolidation" };

// ── Exact rating math (mirrors shared/rating-scale.md) ──────────────────────
const SCORE = { A: 5, B: 4, C: 3, D: 2, E: 1 };
const GRADES = ["E", "D", "C", "B", "A"]; // index = score - 1
const WEIGHTS = {
  pattern: 2,             // Analyzer 01 — double
  dependencyDirection: 2, // Analyzer 03 — double
  componentBoundaries: 1,
  namingConsistency: 1,
  apiInterfaceBoundaries: 1,
  instantiationWiring: 1,
  structuralVisibility: 1,
};

// ratings: { dimensionKey: "A".."E" | "N/A" }. N/A excluded from numerator AND
// denominator. A=5..E=1. Weighted average rounded half-up (Math.round(2.5)===3).
function weightedAverage(ratings) {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const r = ratings[key];
    if (!r || r === "N/A" || !(r in SCORE)) continue;
    weightedSum += SCORE[r] * weight;
    weightTotal += weight;
  }
  if (weightTotal === 0) return "N/A";
  const avg = weightedSum / weightTotal;
  return GRADES[Math.round(avg) - 1];
}

// ── Schemas ─────────────────────────────────────────────────────────────────
const ratingEnum = ["A", "B", "C", "D", "E", "N/A"];

const phase1Schema = {
  type: "object",
  required: ["rating", "patternName", "confidence", "expectedRules", "summary", "report"],
  properties: {
    rating: { enum: ratingEnum },
    patternName: { type: "string" },
    confidence: { enum: ["Clear", "Partial", "Mixed", "Unclear"] },
    expectedRules: { type: "string" }, // forwarded to Phase 2
    summary: { type: "string" },       // one-liner for the rating overview table
    report: { type: "string" },        // full markdown block
  },
};

const analyzerSchema = {
  type: "object",
  required: ["rating", "summary", "report"],
  properties: {
    rating: { enum: ratingEnum },
    summary: { type: "string" }, // one-liner for the rating overview table
    report: { type: "string" },  // full markdown block (kept out of orchestrator context)
  },
};

const consolidationSchema = {
  type: "object",
  required: ["crossCuttingThemes", "strengths", "concerns", "recommendations"],
  properties: {
    crossCuttingThemes: { type: "array", items: { type: "string" } }, // 3+ analyzers = same concern
    strengths: { type: "array", items: { type: "string" } },          // deduped, grouped
    concerns: { type: "array", items: { type: "string" } },           // sorted by flag frequency
    recommendations: { type: "array", items: { type: "string" } },    // 3-5, prioritized
  },
};

// ── Analyzer registry — model choice 1:1 with orchestration.md Step 4 ──
const ANALYZERS = [
  { key: "componentBoundaries",    id: "02", name: "Component Boundaries",     file: "02-component-boundaries.md",    model: "sonnet" },
  { key: "dependencyDirection",    id: "03", name: "Dependency Direction",     file: "03-dependency-direction.md",    model: "sonnet" },
  { key: "namingConsistency",      id: "04", name: "Naming Consistency",       file: "04-naming-consistency.md",      model: "haiku"  },
  { key: "apiInterfaceBoundaries", id: "05", name: "API/Interface Boundaries", file: "05-api-interface-boundaries.md", model: "sonnet" },
  { key: "instantiationWiring",    id: "06", name: "Instantiation & Wiring",   file: "06-instantiation-wiring.md",    model: "sonnet" },
  { key: "structuralVisibility",   id: "07", name: "Structural Visibility",    file: "07-structural-visibility.md",   model: "haiku"  },
];

// ── Input (spike #9: args may be a JSON string) ──────────────────────────────
const input = typeof args === "string" ? JSON.parse(args) : (args ?? {});
const {
  skillDir = "skills/architecture-audit",
  projectStructureSummary = "",
  techStackProfile = "",
  fileList = [],
  scope = "",
  date = "",
  guidelines = false,
  adrs = false,
} = input;

const ctx = { projectStructureSummary, techStackProfile, fileList, scope, skillDir, guidelines, adrs };

// ── Phase 1: Pattern Recognition (sequential; result feeds Phase 2) ──
phase(PHASE.p1);
const p1 = await safeAgent(
  buildPhase1Prompt(ctx),
  { model: "sonnet", schema: phase1Schema, label: "01 Pattern Recognition", phase: PHASE.p1 }
);
const phase1Degraded = !p1;
const phase1 = p1 ?? {
  rating: "N/A",
  patternName: "Unrecognized",
  confidence: "Unclear",
  expectedRules: "GENERAL_BEST_PRACTICES",
  summary: "Phase 1 failed — analyzers evaluated against general best practices.",
  report: "Analysis not available.",
};
if (phase1Degraded) log("Phase 1 failed — Phase 2 evaluates against general best practices.");

// ── Phase 2: Analyzers 02-07 (parallel WITH barrier; all need Phase 1 output) ──
phase(PHASE.p2);
const results = await parallel(
  ANALYZERS.map((a) => async () => {
    const out = await safeAgent(
      buildAnalyzerPrompt(a, ctx, phase1),
      { model: a.model, schema: analyzerSchema, label: `${a.id} ${a.name}`, phase: PHASE.p2 }
    );
    if (!out) {
      return { key: a.key, id: a.id, name: a.name, rating: "N/A", summary: "Analysis not available.", report: "Analysis not available.", failed: true };
    }
    return { key: a.key, id: a.id, name: a.name, rating: out.rating, summary: out.summary, report: out.report };
  })
);

// ── Phase 3: Consolidation — exact rating math + synthesis agent ──
phase(PHASE.cons);
const ratings = { pattern: phase1.rating };
for (const r of results) ratings[r.key] = r.rating;
const overallRating = weightedAverage(ratings); // exact, reproducible

// Synthesis needs ALL analyzer outputs in one reasoning context (orchestration.md
// Step 5.4-5.6). Doing it as an in-workflow agent keeps the voluminous report
// blocks out of the orchestrator's context (migration goal 2).
const synthesis = await safeAgent(
  buildConsolidationPrompt(phase1, results, ctx),
  { model: "sonnet", schema: consolidationSchema, label: "Consolidation", phase: PHASE.cons }
) ?? { crossCuttingThemes: [], strengths: [], concerns: [], recommendations: [] };

return {
  date,
  scope: scope || "full project",
  overallRating,
  overallLabel: gradeLabel(overallRating),
  ratings,
  phase1Degraded,
  phase1: {
    patternName: phase1.patternName,
    confidence: phase1.confidence,
    rating: phase1.rating,
    summary: phase1.summary,
    report: phase1.report,
  },
  analyzers: results.map(({ key, id, name, rating, summary, report }) => ({ key, id, name, rating, summary, report })),
  synthesis,
};

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

async function safeAgent(prompt, opts) {
  try {
    const out = await agent(prompt, opts);
    return out ?? null; // schema violation / skip -> null -> treated as N/A
  } catch (e) {
    log(`agent failed (${opts.label}): ${e?.message ?? e}`);
    return null;
  }
}

function gradeLabel(g) {
  return { A: "Exemplary", B: "Solid", C: "Adequate", D: "Weak", E: "Absent/Chaotic", "N/A": "Not Applicable" }[g] || g;
}

function header(name) {
  return [
    `You are an architecture analyzer for [${name}].`,
    ``,
    `You are performing an ARCHITECTURE AUDIT (not a code review). Your task: DESCRIBE`,
    `and ASSESS, not find bugs or demand fixes.`,
  ];
}

function commonContext(ctx) {
  return [
    `## Output Format`,
    `Follow: ${ctx.skillDir}/shared/analyzer-output-format.md`,
    `## Rating Scale`,
    `Use: ${ctx.skillDir}/shared/rating-scale.md`,
    ``,
    `## Project Structure`,
    ctx.projectStructureSummary || "(none provided)",
    ``,
    `## Tech Stack`,
    ctx.techStackProfile || "(none provided)",
    ctx.guidelines ? `\n## Project Guidelines (Context)\nRead: claudedocs/guidelines/*.md` : ``,
    ctx.adrs ? `\n## Architectural Decision Records\nRead: claudedocs/adrs/*.md — respect documented decisions.` : ``,
    ``,
    `## Source Files to Examine`,
    ctx.fileList.length ? ctx.fileList.map((f) => `- ${f}`).join("\n") : "- (use the structure summary above; examine representative source files)",
    ctx.scope ? `\nScope: restrict analysis to ${ctx.scope}.` : ``,
  ];
}

function buildPhase1Prompt(ctx) {
  return [
    ...header("Pattern Recognition"),
    ``,
    `## Your Analysis Dimension`,
    `Read your analysis rules: ${ctx.skillDir}/analyzers/01-pattern-recognition.md`,
    ...commonContext(ctx),
    ``,
    `## Instructions`,
    `1. Read your analyzer rules, the output format, and the rating scale.`,
    `2. Examine the project structure and representative files (you have file tools).`,
    `3. Identify the architecture pattern and confidence (Clear/Partial/Mixed/Unclear).`,
    `4. Define the expected architecture rules (returned as expectedRules for Phase 2).`,
    `5. Assign a rating (A-E, or N/A with reason) with evidence (dirs, paths, imports).`,
    `6. Return via the required schema: rating, patternName, confidence, expectedRules,`,
    `   summary (one line for the rating-overview table), report (full markdown block).`,
    `7. Be ANALYTICAL and DESCRIPTIVE, not prescriptive.`,
  ].filter((l) => l !== ``).join("\n");
}

function buildAnalyzerPrompt(a, ctx, phase1) {
  return [
    ...header(a.name),
    ``,
    `## Your Analysis Dimension`,
    `Read your analysis rules: ${ctx.skillDir}/analyzers/${a.file}`,
    ...commonContext(ctx),
    ``,
    `## Detected Architecture Pattern (Phase 1)`,
    `Pattern: ${phase1.patternName} (confidence: ${phase1.confidence})`,
    `Expected rules: ${phase1.expectedRules}`,
    phase1.report && phase1.report !== "Analysis not available."
      ? `Phase 1 detail:\n${phase1.report}`
      : `Phase 1 was not available — evaluate against general architectural best practices and note this.`,
    `The detected pattern defines the EXPECTED rules against which you evaluate your dimension.`,
    ``,
    `## Instructions`,
    `1. Read your analyzer rules, the output format, and the rating scale.`,
    `2. Examine the relevant project files (you have file tools).`,
    `3. Evaluate your dimension against the expected rules from Phase 1.`,
    `4. Assign a rating (A-E, or N/A with reason) with evidence.`,
    `5. Return via the required schema: rating, summary (one line for the rating-overview`,
    `   table), report (full markdown block per the output format).`,
    `6. Be ANALYTICAL and DESCRIPTIVE, not prescriptive.`,
  ].filter((l) => l !== ``).join("\n");
}

function buildConsolidationPrompt(phase1, results, ctx) {
  const blocks = [
    `### Architecture Pattern (01)\nRating: ${phase1.rating}\n${phase1.report}`,
    ...results.map((r) => `### ${r.name} (${r.id})\nRating: ${r.rating}\n${r.report}`),
  ].join("\n\n");
  return [
    `You are consolidating an architecture audit. You are given every analyzer's output.`,
    `Synthesize across them (this is the only step that sees all dimensions at once).`,
    ``,
    `## Analyzer Outputs`,
    blocks,
    ``,
    `## Instructions (orchestration.md Step 5.4-5.6)`,
    `- crossCuttingThemes: concerns mentioned by 3+ analyzers, surfaced as cross-cutting themes.`,
    `- strengths: collect all "What Works Well" items across analyzers, deduplicate, group by theme.`,
    `- concerns: collect all "Deviations & Concerns", group by theme, sort by how many analyzers flagged them.`,
    `- recommendations: derive 3-5 prioritized, high-level recommendations from the concerns,`,
    `  phrased as "Consider..." / "To improve..."; address pattern-level concerns before cosmetic ones.`,
    `Return via the required schema (four string arrays). Be constructive, not prescriptive.`,
  ].join("\n");
}
