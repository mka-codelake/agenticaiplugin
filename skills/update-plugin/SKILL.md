---
description: DEPRECATED — Update plugin rules and migrate legacy CLAUDE.md installations
disable-model-invocation: true
effort: low
---

# Update Plugin Command

> **⚠️ DEPRECATED since 0.26.2 — scheduled for removal in a future release.**
>
> This command was a **one-time transition** off the old copied-rules model (it removes
> legacy `.claude/rules/agenticaiplugin-*.md` copies and completes the `claudedocs/` → `.claude/`
> relocation). That migration is now complete across all known installations, so the command
> has served its purpose.
>
> - **You still need it** only if a project was **never transitioned** — recognizable by leftover
>   `.claude/rules/agenticaiplugin-*.md` files or a `claudedocs/{guidelines,adrs}/` layout (the
>   SessionStart transition notice will also flag this). Run it once; then you are done.
> - **You no longer need it** if the project has already been transitioned. Future plugin updates
>   need only `/plugin marketplace update` — there is no recurring per-project step.
>
> The command remains functional for now, but will be **removed in a future release**. It is not
> a general-purpose "update" command and never was.

Updates AgenticAI Plugin to the latest version, including rules and CLAUDE.md migration.

## Usage

```
/agenticaiplugin:update-plugin
```

**DEPRECATED since 0.26.2 — one-time transition, scheduled for removal in a future release.** Only run this if
the project still carries legacy `.claude/rules/agenticaiplugin-*.md` copies or a `claudedocs/`
layout; already-transitioned projects do not need it. See the deprecation note at the top.

No parameters required.

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Any other argument passed** → Display the Usage section above verbatim, then STOP. This command takes no parameters.

## What It Does

Runs a **one-time transition** of an existing installation off the old copied-rules model.
The plugin no longer copies rule files into projects — always-on behavior now comes from the
plugin itself (doctrine via a SessionStart hook, enforcement via a PreToolUse hook). This
command cleans up whatever an older install left behind.

Invokes the `agenticaiplugin:project-initializer` agent in **update** mode.

**IMPORTANT:** Pass the plugin root path so the agent can run the transition scripts.
The plugin root is this skill's base directory, two levels up (i.e., `../../` from `skills/update-plugin/`).
Include it in the agent prompt as `plugin_root: <absolute_path>`.

The agent (all steps deterministic, previewed, and confirmed before applying):

1. **Removes legacy copied rules** — deletes `.claude/rules/agenticaiplugin-*.md` (the plugin
   provides that behavior itself now). The user's own rules are never touched.
2. **Completes the `claudedocs/` → `.claude/` relocation** — moves `guidelines/` and `adrs/`,
   un-ignores them in `.gitignore` when needed (or flags a manual fix), and rewrites stale
   `claudedocs/…` path references in the project's `CLAUDE.md`. Never overwrites.
3. **Clears deprecated leftovers** — `agentic.md`, `claudedocs/testspecs/`, and obsolete
   plugin sections injected into a very old `CLAUDE.md`.

After it has run once, there is nothing per-project left to sync.

## When to Use

Run this once per existing project to transition it. After the transition, future plugin
updates need only the marketplace update — no per-project step:

```bash
# Update the plugin itself (picks up new doctrine/enforcement/skills)
/plugin marketplace update local-dev-marketplace

# Only if a project still carries legacy copied rules or a claudedocs/ layout
# (the SessionStart notice will tell you): transition it once
/agenticaiplugin:update-plugin
```

## Related

- **/agenticaiplugin:init** - Initial project setup (fresh installation)
