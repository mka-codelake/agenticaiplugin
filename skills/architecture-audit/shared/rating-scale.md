# Architecture Audit Rating Scale

All analyzers use this A-E scale to rate their dimension. Ratings assess **consistency and quality of implementation**, not modernity or trendiness.

---

## Rating Definitions

| Rating | Label | Definition |
|--------|-------|------------|
| **A** | Exemplary | Pattern clearly defined, consistently applied throughout, well-enforced (tests, tooling, or conventions) |
| **B** | Solid | Pattern well-defined with minor, isolated deviations that don't undermine the overall approach |
| **C** | Adequate | Pattern recognizable but with noticeable gaps or inconsistencies across the codebase |
| **D** | Weak | Pattern fragmented or only partially present; significant portions deviate or lack structure |
| **E** | Absent/Chaotic | No recognizable pattern, or implementation contradicts the stated/expected pattern |

---

## Rating Guidelines

- **Assess consistency, not modernity.** A well-executed Layered Architecture can earn an A. A poorly applied Hexagonal Architecture may get a D.
- **Each analyzer rates only its own dimension.** Do not let findings from one dimension influence another's rating.
- **Evidence-based.** Every rating must cite specific files, directories, imports, or patterns as evidence.
- **N/A is valid** when a dimension genuinely doesn't apply (e.g., Instantiation & Wiring in a purely functional codebase with no DI).
- **B is not a consolation prize.** Reserve A for genuinely exemplary implementations; B indicates real quality with minor blemishes.
- **D vs. E:** D means "there's something here but it's inconsistent." E means "there's nothing here, or what's here contradicts itself."

---

## Overall Rating Calculation

The orchestrator computes the overall rating as a **weighted average**:

| Dimension | Weight |
|-----------|--------|
| Architecture Pattern (01) | 2x |
| Dependency Direction (03) | 2x |
| Component Boundaries (02) | 1x |
| Naming Consistency (04) | 1x |
| API/Interface Boundaries (05) | 1x |
| Instantiation & Wiring (06) | 1x |
| Structural Visibility (07) | 1x |

**Conversion:** A=5, B=4, C=3, D=2, E=1. Compute weighted average, round to nearest letter grade. Dimensions rated N/A are excluded from the calculation.

**Rounding rule (deterministic):** Round **half up** — a weighted average of exactly x.5 rounds to x+1 (e.g., 2.5 → C, 3.5 → B). This is what `Math.round` does for positive numbers and what `audit.workflow.js` (`weightedAverage`) implements, so identical inputs always produce the identical grade.
