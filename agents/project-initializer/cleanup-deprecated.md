# Task: Deprecated Cleanup & Directory Setup

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

## B) Deprecated Directory Cleanup: claudedocs/testspecs/

```bash
ls -d claudedocs/testspecs 2>/dev/null
```

**If claudedocs/testspecs/ EXISTS:**
- Check if empty: `ls claudedocs/testspecs/ 2>/dev/null`
- **If empty →** Remove it: `rmdir claudedocs/testspecs`
- **If NOT empty →** Do NOT delete. Show WARNING:
  ```
  ⚠ WARNING: claudedocs/testspecs/ still contains files.
    This directory is deprecated (replaced by claudedocs/adrs/).
    Please migrate or remove files manually, then delete the directory.
  ```

## C) Directory Setup: claudedocs/adrs/

```bash
ls -d claudedocs/adrs 2>/dev/null
```

**If claudedocs/adrs/ does NOT exist →** Create it:
```bash
mkdir -p claudedocs/adrs
```

## D) Report

After all checks, produce a single aggregated report:

```
Deprecated Cleanup & Directory Setup:
  ✓ Removed deprecated agentic.md          (only if removed)
  ✓ Removed empty claudedocs/testspecs/    (only if removed)
  ⚠ claudedocs/testspecs/ contains files   (only if non-empty)
  ✓ Created claudedocs/adrs/               (only if newly created)
  No deprecated items found.               (only if nothing to do)
```

Only show lines that apply. If nothing was found/changed, show the "No deprecated items found" line.
