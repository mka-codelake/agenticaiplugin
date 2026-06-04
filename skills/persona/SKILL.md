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

The persona takes full effect at the next session start (the hook injects it).
For `set`/`off`, also apply the change immediately for the rest of the current
session, so the user sees it right away.

Resolve the state file path in every command:

```bash
STATE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/persona.state"
```

### `show`

```bash
{ [ -r "$STATE" ] && tr -d '[:space:]' < "$STATE"; } || true
```

Report `⧉ persona: <value>` — or `⧉ persona: off` if the output is empty.

### `list`

Output this table verbatim (do not run a command):

| Persona | Restriction |
|---------|-------------|
| `off` | normal Claude behavior (default) |
| `writer` | decorative, eloquent, explaining — most verbose |
| `engineer` | concise, factual — drops filler/pleasantries/hedging |
| `telegrapher` | brief — adds abbreviations, arrows, drops articles |
| `caveman` | ultra-terse — adds 1–3 word sentences, no lists |

### `off` / `reset`

```bash
rm -f "$STATE"
```

Report `⧉ persona: off (updated)`. From now on in this session, respond with
your normal communication style.

### `writer` / `engineer` / `telegrapher` / `caveman`

```bash
mkdir -p "$(dirname "$STATE")" && printf '%s\n' "<persona>" > "$STATE"
```

Report `⧉ persona: <persona> (updated)`. From now on in this session, apply the
`<persona>` communication style (writer = decorative/eloquent; engineer =
concise/factual; telegrapher = brief/abbreviating; caveman = ultra-terse).
