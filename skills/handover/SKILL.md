---
description: |
  Save or load a structured cross-session continuity snapshot for the current project.
  Use when a session is approaching context limits or when resuming work after a break.
  Different from auto-memory: this captures a temporal "where was I" snapshot, not persistent semantic facts.
  TRIGGER WORDS: handover, übergabe, snapshot, session-ende, weitermachen morgen.
disable-model-invocation: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(git:*)
  - Bash(gh:*)
  - Bash(date:*)
  - Bash(ls:*)
  - Bash(test:*)
  - Bash(mkdir:*)
  - Glob
effort: medium
---

# Handover — Cross-Session Continuity Snapshot

Save or load a structured snapshot in the current project's auto-memory directory.
Bridges sessions when context fills up or work pauses.

**Conceptual distinction from auto-memory:** Auto-memory holds persistent semantic facts (`user`, `feedback`, `project`, `reference`). A handover is a *temporal* snapshot — "where was I, what's open, what's next" — and is intentionally short-lived.

## Usage

```
/agenticaiplugin:handover [save|load|--help]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Save** (default) | `/agenticaiplugin:handover` or `/agenticaiplugin:handover save` | Capture current state into `<project_memory_dir>/handover.md`. Reads existing snapshot first and reconciles open items rather than blindly overwriting |
| **Load** | `/agenticaiplugin:handover load` | Read existing snapshot back into context with freshness check |

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **No argument or `save`** → Proceed with Save mode.
3. **`load`** → Proceed with Load mode.
4. **Any other argument** → Display the Usage section above verbatim, then STOP.

## Project Memory Directory

The auto-memory directory for the current project is shown in your system prompt's "auto memory" section. It looks like:

```
~/.claude/projects/<encoded-project-path>/memory/
```

Use that exact path. Do not try to compute it — read it from the system prompt.

If the directory doesn't exist yet (first auto-memory interaction in this project), create it with `mkdir -p` before writing.

## Save Mode

### Step 1: Read prior state (if exists)

Check whether a handover snapshot is already present:

```bash
test -f <project_memory_dir>/handover.md && cat <project_memory_dir>/handover.md
```

**If it exists:** read the full content into your active context. Treat it as **prior snapshot state** — the open items, blockers, hands-off list, and planned steps from the last save. Do NOT discard it; in Step 3 you reconcile against it rather than overwrite blindly. This matters most when the user runs `save` without first running `load` — the prior state would otherwise be lost.

**If it does not exist:** this is the first handover for the project — proceed with no prior state.

### Step 2: Gather current state

Run in parallel where possible:

```bash
git status
git log --oneline -10
git branch --show-current
gh pr list 2>/dev/null || true       # only if gh + remote available
gh issue list 2>/dev/null || true    # only if gh + remote available
date -u +%Y-%m-%d                    # ISO date for snapshot
```

From the **active conversation context**, identify:

- What was the focus of this session? What concretely got done?
- What is currently in-progress / unfinished?
- What blockers, hypotheses, or open questions surfaced?
- What did the user say is the next step?
- What should the next session NOT touch without explicit instruction?

### Step 3: Render `handover.md` with reconciliation

Write `<project_memory_dir>/handover.md` (the file is rewritten — but its content is reconciled, not blindly overwritten, see rules below) with this exact structure:

```markdown
---
name: handover
description: "Snapshot vom <YYYY-MM-DD>. <one-line hook>. Veraltet — bei Nutzung Frische gegen aktuelles Repo verifizieren."
type: project
snapshotDate: <YYYY-MM-DD>
---

# <Project Name> — Handover-Snapshot

**Datum:** <YYYY-MM-DD>
**Frische bei Erstellung:** aktuell (Session-Ende)
**Bei Verwendung später:** Stand gegen `git log`, `git status`, `gh issue list`, `gh pr list` verifizieren — Snapshots sind point-in-time, keine Live-Daten.

## Letzter Stand

<What concretely got done in this session, in 2–6 sentences. Reference files, commits, PRs by exact name.>

## Repo-State bei Snapshot

- **Branch:** <current branch>
- **Letzte Commits:** <last 3–5 oneline commits>
- **Working tree:** <"clean" or list of modified/untracked files>

## Offene Items

<Issues, PRs, TODOs, halbfertige Änderungen, currently-broken things. Use a table or bullet list. Include status where known.>

## Strukturelle Blocker / Härtungen

<What's not working that blocks further work. Workarounds in place that need proper hardening. Skip section if nothing applies — don't pad.>

## Geplante nächste Schritte

<Ordered list. Be concrete: file paths, commands, decisions to be made.>

## Wichtige Referenzen

<Knowledge-DB IDs (`aiknowledgedb search "..."`), external doc links, repo-specific gotchas (e.g. `core.fileMode false` lokal nötig). Skip if none.>

## Hands-off-Liste

<Files/areas the next session should NOT modify without explicit user instruction. Be specific about why.>

## Optional: Cursor-Position

<Only if a debugging session or investigation was actively in progress. Otherwise skip.
- Branch + uncommitted changes
- Active hypothesis being tested
- Last command run + its result>
```

**Reconciliation rules** (apply only when prior state exists from Step 1):

- **Items from prior that the current session demonstrably resolved** — PR appears in `git log` as merged, issue closed via `gh issue list`, branch deleted, blocker fixed in a referenced commit → **remove** from the new snapshot.
- **Items from prior NOT mentioned in the current session** → **preserve** as still-open. Default assumption: still relevant unless evidence otherwise. Do not silently drop them just because they weren't discussed today.
- **Items with conflicting status** (prior says X is open, current shows X is resolved) → **current wins** — frischer Stand schlägt älteren.
- **Hands-off-Liste from prior** → **carry forward** to the new snapshot, unless the user explicitly freed a specific entry this session.
- **"Letzter Stand"** section → describe **this session's** work, not a cumulative project history. Each save replaces this section with the most recent activity.
- **"Geplante nächste Schritte"** → reconcile: drop steps that got completed, preserve still-open ones, append new ones from the current session.

If no prior state exists (first save), no reconciliation is needed — write fresh from current session and repo state.

**Rules for writing:**

- Be concrete. "Fixed bug in auth" is useless. "Fixed `validateToken()` in `src/auth.ts:42` to handle null subject claims — now passes test `auth.test.ts:101`" is useful.
- Skip sections that don't apply. Empty headers are noise.
- The `description` frontmatter line is what shows up in MEMORY.md — keep it under ~150 chars.
- Keep total length focused — aim for 2–6 KB. This isn't a project history; it's a state delta for tomorrow.

### Step 4: Update `MEMORY.md`

Read `<project_memory_dir>/MEMORY.md`.

**If a `## Handover` section exists:** replace the line under it.
**If not:** append a new section at the bottom of the file:

```markdown

## Handover
- [Active Handover](handover.md) — Snapshot vom <YYYY-MM-DD>: <kurz-hook>
```

The `<kurz-hook>` is a 5–10-word summary. Examples from real handovers:
- "PR #14 PAT-Setup offen, Workflow getestet"
- "Phase 2 Refactoring durch, Tests grün, PR-Review pending"
- "Auth-Bug reproduziert, Fix-Hypothese formuliert, noch nicht angewandt"

### Step 5: Confirm to user

Show:
- Path to written `handover.md`
- Whether prior state was found and reconciled (e.g. "Reconciled with prior snapshot from 2026-04-20: 2 items resolved, 3 carried forward, 1 new"), or "First handover for this project"
- The exact `MEMORY.md` line that was added/updated
- Reminder: in next session, run `/agenticaiplugin:handover load` to recall.

## Load Mode

### Step 1: Resolve and check existence

Use the project memory dir from the system prompt's auto-memory section.

```bash
test -f <project_memory_dir>/handover.md
```

**If file doesn't exist:**

```
No handover snapshot found in <path>.
Run /agenticaiplugin:handover save in your previous session to create one.
```

STOP — do not fall back to scanning other files.

### Step 2: Freshness check

Read `snapshotDate` from the file's frontmatter. Compute days since against today.

| Age | Action |
|-----|--------|
| ≤ 14 days | Proceed silently |
| 15–30 days | Print a one-line warning, then proceed |
| > 30 days | Print a strong warning, recommend verification before acting |

Warning template (>14 days):

```
⚠️ Snapshot is <N> days old (from <YYYY-MM-DD>).
Repo state has likely changed. Verify open items and "next steps" against
`git log`, `git status`, `gh issue list`, `gh pr list` before acting.
```

### Step 3: Display snapshot

Print the **full content** of `handover.md` to the user. This makes the content part of the active conversation context, so Claude can reason about it directly.

Prefix with a 1-paragraph orientation:

```
Loaded handover from <YYYY-MM-DD> for <project name>.
Summary: <one paragraph synthesizing "Letzter Stand" + "Geplante nächste Schritte">.

---

<full content of handover.md>
```

### Step 4: Suggest verification

After printing, suggest:

- Run `git status` + `git log -5` and compare against "Repo-State bei Snapshot"
- For any open PR/Issue mentioned, verify current status with `gh pr view` / `gh issue view`
- Then pick up at "Geplante nächste Schritte"

Do not perform these checks automatically — the user decides whether to.

## Critical Rules

- **No auto-load.** Never read `handover.md` unless `load` was explicitly invoked, OR as part of `save`'s prior-state read in Step 1. A stale snapshot silently entering context outside these triggers corrupts the new session.
- **One snapshot per project.** No archive, no versioning. Each save rewrites the single `handover.md` — but its content is **reconciled** with the prior state, not blindly overwritten.
- **Save touches only `handover.md` and `MEMORY.md`.** Other memory files are untouched.
- **Load is read-only.** It only displays content; it does not modify any files.
- **Don't pad.** Skip sections that don't apply. A short, accurate handover beats a long, padded one.
- **For a forced fresh start:** the user can `rm <project_memory_dir>/handover.md` manually before running `save`. No flag is provided for this — it's rare enough that explicit deletion is cleaner.
