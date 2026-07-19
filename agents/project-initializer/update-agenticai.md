# Task: Strip Legacy Plugin Sections from CLAUDE.md

This task is executed by the project-initializer coordinator during UPDATE workflow, after
the transition cleanup.

The plugin used to (in a very old era) inject its rules as sections directly into a project's
`CLAUDE.md`. Those sections are now obsolete — the plugin provides this behavior itself via
doctrine (SessionStart hook) and enforcement (PreToolUse hook), so leaving them would only
duplicate/contradict the injected doctrine. This task removes them, preserving the user's own
content. Modern installations have no such sections and this task is a no-op.

## Step 1: Detect legacy plugin sections

If `CLAUDE.md` does not exist → nothing to do, report "No legacy CLAUDE.md content." and STOP.

Read `CLAUDE.md` and split it into sections by `## ` (level-2) headers. A section is a
**plugin section (remove)** if its header matches any of:

| Header pattern | |
|---|---|
| `Never Make Assumptions` (with or without `🚨 CRITICAL:`) | remove |
| `Automatic Code Review After Task Completion` | remove |
| `Project-Specific Guidelines` (regardless of the path it references) | remove |
| `Protected Test Directories` (with or without `CRITICAL:`) | remove |
| `Protected User Configuration` (with or without `CRITICAL:`) | remove |

All other sections are **project content (keep)**. If no plugin section matches → report
"No legacy plugin content in CLAUDE.md." and STOP.

## Step 2: Back up, strip, and write back

```bash
cp CLAUDE.md CLAUDE.md.backup
```
Report: `Backup created: CLAUDE.md.backup`

Build the cleaned content: keep the file title (`# …`), all project sections, and the
whitespace/comments between kept sections; drop the plugin sections.

**If the result is "empty"** (only whitespace, only the title line, only HTML comments, or
less than ~50 characters of real content) → `rm CLAUDE.md` and report the file was deleted
(backup kept).

**Otherwise** → write the cleaned content back to `CLAUDE.md`.

## Step 3: Report

```
CLAUDE.md Cleanup:
  ✓ Removed [N] legacy plugin section(s)
  ✓ Kept [N] project section(s)                 (or: CLAUDE.md deleted — no project content)
  ✓ Backup: CLAUDE.md.backup
```
