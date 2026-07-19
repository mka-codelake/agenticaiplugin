# Task: Deprecated Cleanup & Directory Migration

This task is executed by the project-initializer coordinator during UPDATE workflow.
**MANDATORY:** Execute BEFORE anything else, even if all rules are up to date.

## A) Deprecated File Cleanup: agentic.md

```bash
ls agentic.md 2>/dev/null
```

**If agentic.md EXISTS → DELETE IT:**
```bash
rm agentic.md
```

## B) Migrate guidelines/ + adrs/ from claudedocs/ to .claude/ (via script)

Older installations kept project guidelines and ADRs under `claudedocs/`; they now live
under `.claude/`. Run the deterministic migration script.

**Prerequisite:** `node` on PATH (see `prerequisites.json`, `id: "node"`). If `node` is
missing, report it and skip this migration — the rest of the update still runs.

```bash
node "{plugin_root}/agents/project-initializer/scripts/migrate-claudedocs.mjs" .
```

The script moves `claudedocs/{guidelines,adrs}` into `.claude/{guidelines,adrs}`,
**never overwriting** an existing destination file. Parse its JSON report:

- `moved` — files migrated.
- `conflicts` — source files whose destination already existed (left in place). If this
  is non-empty, use AskUserQuestion to let the user resolve each conflict; do **not**
  overwrite automatically.
- `claudedocsRemoved` — `true` if `claudedocs/` was empty afterward and removed.
- `claudedocsRemaining` — other files still in `claudedocs/` (legitimate report outputs
  such as `code-review-result.md`); leave them, no action needed.

## C) Deprecated Directory Cleanup: claudedocs/testspecs/

The oldest installations used `claudedocs/testspecs/` — never read by any skill and
superseded by ADRs (now under `.claude/adrs/`).

```bash
ls -d claudedocs/testspecs 2>/dev/null
```

**If claudedocs/testspecs/ EXISTS:**
- Check if empty: `ls claudedocs/testspecs/ 2>/dev/null`
- **If empty →** Remove it: `rmdir claudedocs/testspecs`
- **If NOT empty →** Do NOT delete. Show WARNING:
  ```
  ⚠ WARNING: claudedocs/testspecs/ still contains files.
    This directory is deprecated (ADRs now live in .claude/adrs/).
    Please migrate or remove files manually, then delete the directory.
  ```

## D) Report

After all checks, produce a single aggregated report:

```
Deprecated Cleanup & Migration:
  ✓ Removed deprecated agentic.md                       (only if removed)
  ✓ Migrated [N] guidelines/ADR file(s) to .claude/     (only if migrated)
  ⚠ [N] migration conflict(s) — asked user              (only if conflicts)
  ✓ Removed empty claudedocs/testspecs/                 (only if removed)
  ⚠ claudedocs/testspecs/ contains files                (only if non-empty)
  No deprecated items found.                             (only if nothing to do)
```

Only show lines that apply. If nothing was found/changed, show the "No deprecated items found" line.
