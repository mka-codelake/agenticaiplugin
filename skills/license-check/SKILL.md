---
description: |
  Check license compatibility of project dependencies, tools, scripts, and LLM models
  against the project's own license. Reports incompatibilities with actionable recommendations.
  Invoke via /agenticaiplugin:license-check.
disable-model-invocation: true
---

# License Check

Scans project dependencies, tools, and LLM model references for license compatibility issues.

## Usage

```
/agenticaiplugin:license-check [options]
```

| Option | Description |
|--------|-------------|
| *(no options)* | Full scan: direct + transitive deps, tools, models, scripts |
| `--quick` | Quick scan: direct dependencies only (no CLI tools needed) |
| `--help` | Show this usage information |

### Examples

```
/agenticaiplugin:license-check
/agenticaiplugin:license-check --quick
```

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** -> Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags or invalid arguments** -> Display the Usage section above verbatim, then STOP.
3. **No argument** -> Proceed with Full Scan mode.
4. **`--quick` passed** -> Proceed with Quick Scan mode.

## What It Does

The `agenticaiplugin:license-checker` agent performs a multi-phase analysis:

1. **Detects** the project's own license (LICENSE file, manifest fields, SPDX identifier)
2. **Scans** dependencies from all detected ecosystems (npm, pip, cargo, go, maven, gradle, .NET)
3. **Identifies** tools, scripts, and LLM model references in code and config
4. **Checks** license compatibility using the compatibility matrix
5. **Reports** findings with severity levels and saves to `claudedocs/license-check-result.md`

### Severity Levels

| Level | Meaning |
|-------|---------|
| **INCOMPATIBLE** | License conflict — must resolve before distribution |
| **WARNING** | Potential issue — needs human review |
| **OK** | Compatible — no action needed |

## Execution

Invoke the `agenticaiplugin:license-checker` agent:

```
Agent(
    subagent_type="agenticaiplugin:license-checker",
    description="Scan project for license compatibility issues",
    prompt="Analyze this project's license compatibility. Mode: {mode}."
)
```

Where `{mode}` is one of: `full` (default), `quick`.

## Related

- **github-publish** — License selection for public release (complementary: choose license first, then check deps)
- **code-review --renovate** — Dependency audit (focuses on versions/security, not license compatibility)
