#!/usr/bin/env bash
#
# agenticaiplugin: persona — SessionStart hook
#
# Reads the active persona from the state file and injects the matching
# communication-style ruleset as `additionalContext`. Opt-in by design:
# when no persona is set (or "off"), the hook injects NOTHING and Claude
# behaves exactly as without the plugin.
#
# State file (global, per user): ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/persona.state
# Style snippets:                ${CLAUDE_PLUGIN_ROOT}/skills/persona/styles/<persona>.md
#
# Portability: no absolute/developer-specific paths — only $CLAUDE_CONFIG_DIR,
# $HOME and $CLAUDE_PLUGIN_ROOT, which Claude Code resolves per environment.

set -euo pipefail

# jq is required to emit the hook JSON safely. Without it, the feature is a
# silent no-op rather than emitting malformed JSON.
command -v jq >/dev/null 2>&1 || exit 0

# Determine the firing event from stdin (defaults to SessionStart).
input=$(cat 2>/dev/null || true)
event=$(printf '%s' "$input" | jq -r '.hook_event_name // "SessionStart"' 2>/dev/null || true)
[ -n "$event" ] || event="SessionStart"

state_file="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/persona.state"

persona=""
[ -r "$state_file" ] && persona=$(tr -d '[:space:]' < "$state_file" 2>/dev/null || true)

# Opt-in gate: empty or "off" -> inject nothing.
case "$persona" in
  "" | off) exit 0 ;;
esac

snippet="${CLAUDE_PLUGIN_ROOT:-.}/skills/persona/styles/${persona}.md"

# Unknown / unreadable persona value -> fail safe, inject nothing.
[ -r "$snippet" ] || exit 0

jq -n --rawfile ctx "$snippet" --arg ev "$event" \
  '{hookSpecificOutput: {hookEventName: $ev, additionalContext: $ctx}}'
