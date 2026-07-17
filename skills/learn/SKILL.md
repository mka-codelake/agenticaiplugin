---
description: |
  Distill a source or the current session into exactly one reusable learned skill.
  The user names a source (a directory, URL, pasted notes, or "what we just did")
  and this creates or patches a class-level skill under the user-level skill library.
  Part of the autoskill self-learning mechanism. Invoke via /agenticaiplugin:learn.
user-invocable: true
disable-model-invocation: true
---

# Learn

Targeted skill distillation. The user names a source — a directory, a URL,
pasted notes, or "what we just did" (= the current conversation) — and you
distill from it EXACTLY ONE reusable, class-level skill.

Learned skills install flat into the **user-level** library
`${CLAUDE_CONFIG_DIR:-~/.claude}/skills/learned-<name>/` (cross-project
knowledge; nested folders are not discovered by Claude Code). The manifest of
agent-created skills lives at
`${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.autoskill/learned.list`.

## Usage

```
/agenticaiplugin:learn [<source>|--help]
```

| Argument | Behavior |
|----------|----------|
| *(none)* | Distill the CURRENT conversation |
| `--help` / `-h` | Show this usage, then STOP |
| `<source>` | A path, URL, or free-text description of what to distill |

## Argument Handling

1. **`--help` or `-h`** → display the Usage section above verbatim, then STOP.
2. **No argument** → treat the current conversation as the source (this is a
   valid, common case — do NOT show usage and stop).

## Procedure

1. **Capture the source** with existing tools: directory → Read/Glob/Grep;
   URL → WebFetch; conversation → from the current context; notes → from the
   user input.
2. **Check existing skills:** `Glob` over
   `${CLAUDE_CONFIG_DIR:-~/.claude}/skills/*/SKILL.md` and read the manifest
   `${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.autoskill/learned.list`
   (only skills listed there are learned skills and may be patched; all others
   are protected). If a learned skill already covers the class → PATCH it or
   add a support file (`references/`, `templates/`, `scripts/`) instead of
   creating a new one.
3. **Write the skill** to these HARDLINE standards:
   - Directory `${CLAUDE_CONFIG_DIR:-~/.claude}/skills/learned-<name>/SKILL.md`
     (a direct child of `skills/` — nested folders are not discovered!) and add
     the full name as a new line to the `learned.list` manifest above.
   - `name:` starts with the prefix `learned-` (marks agent-created skills),
     then lowercase-hyphenated at CLASS level (no "fix-X-today", no error
     strings or ticket numbers).
   - `description:` ONE sentence, **maximum 60 characters**, ends with a period
     — count the characters! The skill index truncates at 60.
   - `user-invocable: false` — learned skills are passive background knowledge
     for the model, not commands in the /-menu. Only omit it if the user
     explicitly wants a manually invocable command.
   - No marketing words, no user identity/hostnames/environment-derived names
     (privacy — skills may be shared).
   - Body: when to apply, concrete steps, pitfalls. Short and actionable.
4. **Confirm:** tell the user in one sentence what was created/patched and why
   this granularity was chosen.

## Do NOT capture (anti-capture)

Environment-dependent failures, negative claims about tools, transient errors,
one-off task narratives. If a fix was found: capture the FIX, never "X does
not work" as standing knowledge.

## Note

Distillation also happens automatically in the background: the plugin's
Stop hook triggers the autoskill reviewer once a session has done enough tool
work (opt-in via `agenticaiplugin.config.json`). This command is the manual,
targeted path for when you want to capture something specific right now.
