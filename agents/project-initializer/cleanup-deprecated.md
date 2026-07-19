# Task: One-time Transition & Deprecated Cleanup

This task is executed by the project-initializer coordinator during UPDATE workflow.
**MANDATORY:** Execute BEFORE anything else.

It performs the one-time transition off the old copied-rules model onto the plugin's
doctrine/enforcement hooks, plus legacy directory cleanup. All steps are deterministic
(tested Node scripts) and non-destructive: they preview via `--dry-run`, then apply only
after confirmation.

**Prerequisite for the script steps:** `node` on PATH (see `prerequisites.json`,
`id: "node"`). If `node` is missing, report it and skip the script-driven steps (A, C) —
the remaining steps still run.

## A) Remove legacy copied plugin rules

Older installations copied the plugin's rules into `.claude/rules/agenticaiplugin-*.md`.
The plugin now injects this behavior itself (SessionStart doctrine + PreToolUse
enforcement), so the copies are obsolete and must be removed.

Preview:
```bash
node "{plugin_root}/agents/project-initializer/scripts/remove-legacy-rules.mjs" . --dry-run
```

Parse the JSON report (`{ "removed": [...] }`). If `removed` is non-empty, show the list
and confirm with AskUserQuestion ("Remove [N] legacy plugin rule(s)? The plugin now
provides this behavior via hooks."). On yes:
```bash
node "{plugin_root}/agents/project-initializer/scripts/remove-legacy-rules.mjs" . --apply
```
The glob is generic, so historically-removed rules (e.g. `engineering`, `protected-dirs`)
are swept too. The user's own (non-`agenticaiplugin-`) rules are never touched.

## B) Deprecated file cleanup: agentic.md

```bash
ls agentic.md 2>/dev/null
```
**If `agentic.md` EXISTS → delete it:** `rm agentic.md`

## C) Complete the guidelines/adrs relocation (claudedocs/ → .claude/)

Older installations kept project guidelines and ADRs under `claudedocs/`; they now live
under `.claude/`, which is where code review / architecture audit read them. Run the
migration in dry-run first to preview the full plan:

```bash
node "{plugin_root}/agents/project-initializer/scripts/migrate-claudedocs.mjs" . --dry-run
```

Parse the JSON report and preview:
- `moved` — files that will move into `.claude/{guidelines,adrs}`.
- `conflicts` — source files whose destination already exists. **Never overwrite:** if
  non-empty, use AskUserQuestion to let the user resolve each conflict manually.
- `gitignore` — `{ form, negationsAppended, review }`. If `form` is `"contents"` and
  `negationsAppended` is non-empty, those `!.claude/…` lines will be appended so the
  migrated docs stay tracked. If `form` is `"whole-tree"`, `review` explains the manual
  `.gitignore` fix needed (git cannot re-include a child of an excluded directory) — the
  script will NOT edit `.gitignore`; surface `review` to the user.
- `claudeMd.rewrites` — stale `claudedocs/{guidelines,adrs}` path tokens in the project's
  `CLAUDE.md` that will be rewritten to `.claude/…`.

If anything is planned (moves, gitignore additions, CLAUDE.md rewrites), confirm with
AskUserQuestion, then apply:
```bash
node "{plugin_root}/agents/project-initializer/scripts/migrate-claudedocs.mjs" . --apply
```
The apply report adds `claudedocsRemoved` (`true` if `claudedocs/` was left empty and
removed) and `claudedocsRemaining` (legitimate other outputs left in place, e.g.
`license-check-result.md`).

## D) Deprecated directory cleanup: claudedocs/testspecs/

```bash
ls -d claudedocs/testspecs 2>/dev/null
```
**If it EXISTS:**
- Empty → remove: `rmdir claudedocs/testspecs`
- Not empty → do NOT delete; warn:
  ```
  ⚠ WARNING: claudedocs/testspecs/ still contains files.
    This directory is deprecated (ADRs now live in .claude/adrs/).
    Please migrate or remove files manually, then delete the directory.
  ```

## E) Report

Produce a single aggregated report; only show lines that apply:

```
Transition & Deprecated Cleanup:
  ✓ Removed [N] legacy plugin rule(s) from .claude/rules/     (only if removed)
  ✓ Removed deprecated agentic.md                             (only if removed)
  ✓ Migrated [N] guidelines/ADR file(s) to .claude/           (only if migrated)
  ✓ Un-ignored .claude/guidelines|adrs in .gitignore          (only if negations appended)
  ⚠ .gitignore needs a manual fix (see note)                  (only if gitignore.review)
  ✓ Rewrote [N] claudedocs path(s) in CLAUDE.md               (only if rewrites)
  ⚠ [N] migration conflict(s) — asked user                    (only if conflicts)
  ✓ Removed empty claudedocs/testspecs/                       (only if removed)
  No legacy or deprecated items found.                        (only if nothing to do)
```
