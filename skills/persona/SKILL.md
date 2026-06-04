---
description: |
  Set or show the agent's communication persona (writer/engineer/telegrapher/caveman),
  adjusting response verbosity and token usage. Opt-in: no persona is active by default,
  so the plugin never changes Claude's behavior until a persona is explicitly set.
  Invoke via /agenticaiplugin:persona.
user-invocable: true
disable-model-invocation: true
effort: low
model: haiku
---

# Persona

Sets the agent's communication style by writing a one-word state file that the
plugin's SessionStart hook reads to inject the matching ruleset into every new
session. **Opt-in:** with no persona set, the hook injects nothing and Claude
behaves normally.

State file (global, per user): `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/persona.state`

## Usage

```
/agenticaiplugin:persona [<persona>|show|list|off|--help]
```

| Argument | Behavior |
|----------|----------|
| *(none)* / `--help` / `-h` | Show this usage, then STOP |
| `show` | Print the currently active persona (`off` if none) |
| `list` | List all personas with a one-line restriction summary |
| `writer` | Set persona: decorative, eloquent, explaining (least terse) |
| `engineer` | Set persona: concise, factual, accurate |
| `telegrapher` | Set persona: brief, factual, abbreviating |
| `caveman` | Set persona: ultra-terse, stuttering (most terse) |
| `off` / `reset` | Deactivate → back to normal behavior |

## Argument Handling

**Check BEFORE doing anything:**

1. **No argument, `--help`, or `-h`** → display the Usage section above verbatim, then STOP.
2. **Unrecognized argument** (not one of `show`, `list`, `writer`, `engineer`,
   `telegrapher`, `caveman`, `off`, `reset`) → display the Usage section above
   verbatim, then STOP.

## Instructions

All state changes go through the helper script `persona.sh`. This makes the write
a **real, verified action** instead of a code block that could be skipped.

`{skill_dir}` = the absolute path of THIS skill's directory (resolve it the way
the other plugin skills do). The script lives at `{skill_dir}/persona.sh`.

> **For `show`, `set`, and `off` you MUST invoke the Bash tool to run the script,
> then report the persona from its `OK persona=<value>` output line. Do NOT merely
> display the command, and do NOT fabricate the output: if you did not actually see
> an `OK persona=...` line in the tool result, the change did NOT happen — say so
> instead of reporting success.**

The persona also takes effect at the next session start (the hook injects it from
the state file). For `set`/`off`, additionally apply the change immediately for the
rest of the current session so the user sees it right away.

### `show`

Run with the Bash tool:

```bash
bash "{skill_dir}/persona.sh" show
```

From the `OK persona=<value>` line, report `⧉ persona: <value>`.

### `list`

Output this table verbatim (no command needed):

| Persona | Restriction |
|---------|-------------|
| `off` | normal Claude behavior (default) |
| `writer` | decorative, eloquent, explaining — most verbose |
| `engineer` | concise, factual — drops filler/pleasantries/hedging |
| `telegrapher` | brief — adds abbreviations, arrows, drops articles |
| `caveman` | ultra-terse — adds 1–3 word sentences, no lists |

### `off` / `reset`

Run with the Bash tool:

```bash
bash "{skill_dir}/persona.sh" off
```

On `OK persona=off`, report `⧉ persona: off (updated)`, then respond with your
normal communication style for the rest of this session.

### `writer` / `engineer` / `telegrapher` / `caveman`

Run with the Bash tool (substitute the chosen persona for `<persona>`):

```bash
bash "{skill_dir}/persona.sh" set <persona>
```

- On `OK persona=<persona>`: report `⧉ persona: <persona> (updated)` and apply that
  style immediately for the rest of this session (writer = decorative/eloquent;
  engineer = concise/factual; telegrapher = brief/abbreviating; caveman = ultra-terse).
- On `ERROR <reason>` (or no `OK` line): report the error and STOP — do not claim
  the persona was set.
