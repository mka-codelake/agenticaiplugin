---
description: |
  Set or show the agent's working mode (task/orchestrator/meta-orchestrator), which
  decides whether the main session executes work itself, delegates and verifies, or
  owns a whole issue board. Opt-in: no mode is active by default, so the plugin never
  changes how Claude divides the work until a mode is explicitly set.
  Invoke via /agenticaiplugin:mode.
user-invocable: true
disable-model-invocation: true
effort: low
model: haiku
---

# Agent Mode

Sets the agent's working mode by writing a one-word state file that the plugin's
SessionStart hook reads to inject the matching mode text into every new session.
**Opt-in:** with no mode set, the hook injects nothing and Claude behaves normally.

The mode governs the **division of labor** (who executes), not the communication
style — that is `/agenticaiplugin:persona`, and both are independent.

State file (global, per user): `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/mode.state`

## Usage

```
/agenticaiplugin:mode [<mode>|show|list|off|--help]
```

| Argument | Behavior |
|----------|----------|
| *(none)* / `--help` / `-h` / `help` | Show this usage, then STOP |
| `show` | Print the currently active mode (`off` if none) |
| `list` | List all modes with a one-line summary |
| `task` | Set mode: the session executes the work itself; delegation is the exception |
| `orchestrator` | Set mode: the session decides, verifies and coordinates; implementation is delegated |
| `meta-orchestrator` | Set mode: the session owns the issue board — one orchestrating teammate per issue |
| `off` / `reset` | Deactivate → back to normal behavior |

## Argument Handling

**Check BEFORE doing anything:**

1. **No argument, `--help`, `-h`, or `help`** → display the Usage section above verbatim, then STOP.
2. **Unrecognized argument** (not one of `show`, `list`, `task`, `orchestrator`,
   `meta-orchestrator`, `off`, `reset`) → display the Usage section above verbatim,
   then STOP.

## Instructions

All state changes go through the helper script `mode.mjs` (Node, cross-platform — no
bash/jq required). This makes the write a **real, verified action** instead of a code
block that could be skipped.

The script lives at `${CLAUDE_SKILL_DIR}/mode.mjs`.

> **For `show`, `set`, and `off` you MUST invoke the Bash tool to run the script,
> then report the mode from its `OK mode=<value>` output line. Do NOT merely display
> the command, and do NOT fabricate the output: if you did not actually see an
> `OK mode=...` line in the tool result, the change did NOT happen — say so instead
> of reporting success.**

**Prerequisite — Node.js:** the script requires `node` on PATH. If the command fails
because `node` is not found, do NOT claim the mode was changed. Instead tell the user
that the mode feature (including its SessionStart hook) requires Node.js, and show the
install hint for their platform read from the central prerequisite registry at
`${CLAUDE_PLUGIN_ROOT}/prerequisites.json` (entry `id: "node"`, field `hints` — the
registry is the single source of truth for install guidance).

The mode also takes effect at the next session start (the hook injects it from the
state file). For `set`/`off`, additionally apply the change immediately for the rest
of the current session so the user sees it right away.

### `show`

Run with the Bash tool:

```bash
node "${CLAUDE_SKILL_DIR}/mode.mjs" show
```

From the `OK mode=<value>` line, report `⧉ mode: <value>`.

### `list`

Output this table verbatim (no command needed):

| Mode | Division of labor |
|------|-------------------|
| `off` | normal Claude behavior (default) — no mode text is injected |
| `task` | the session executes itself; delegation only for real parallelism or context volume |
| `orchestrator` | the session decides, verifies, coordinates; implementation, research, release prep and doc sync are delegated |
| `meta-orchestrator` | the session owns the issue board: one orchestrating teammate per issue, each in its own worktree |

### `off` / `reset`

Run with the Bash tool:

```bash
node "${CLAUDE_SKILL_DIR}/mode.mjs" off
```

On `OK mode=off`, report `⧉ mode: off (updated)`, then work in your normal way for the
rest of this session.

### `task` / `orchestrator` / `meta-orchestrator`

Run with the Bash tool (substitute the chosen mode for `<mode>`):

```bash
node "${CLAUDE_SKILL_DIR}/mode.mjs" set <mode>
```

- On `OK mode=<mode>`: report `⧉ mode: <mode> (updated)`, then read
  `${CLAUDE_SKILL_DIR}/modes/<mode>.md` — plus `${CLAUDE_SKILL_DIR}/modes/shared-delegation.md`
  for `orchestrator` and `meta-orchestrator`, which is what the hook injects alongside
  them — and apply it for the rest of this session.
- On `ERROR <reason>` (or no `OK` line): report the error and STOP — do not claim the
  mode was set.

## Notes

- **`orchestrator` and `meta-orchestrator` are composed**, not layered: each injects
  its own head plus the shared `modes/shared-delegation.md`. Only one snippet is ever
  injected, so a mode may never point at rules living in another mode's file.
- **Injection order is not priority.** SessionStart `additionalContext` blocks do not
  necessarily appear in `hooks.json` order. A mode text that must outrank other
  instructions states that in its own text.
- **The injection does not reach freshly started sub-agents** (measured). Rules that
  must hold for a sub-agent belong in its task prompt.
- **Opt-out:** `{"agentMode":"off"}` in `agenticaiplugin.config.json` suppresses the
  injection while leaving the CLI usable.
