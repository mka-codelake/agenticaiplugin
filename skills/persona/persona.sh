#!/usr/bin/env bash
#
# agenticaiplugin: persona — state-management CLI
#
# Single source of truth for the persona state file. The /agenticaiplugin:persona
# skill calls this script (it does NOT inline the write) so the state change is a
# real, verified action instead of a prompt code-block the model might skip.
#
# Subcommands:
#   show        -> prints "OK persona=<value>"  (value is "off" when unset)
#   set <name>  -> validates, writes atomically, reads back, prints "OK persona=<name>"
#   off|reset   -> removes the state file,       prints "OK persona=off"
#
# Output contract: exactly one line "OK persona=<value>" on success (the skill
# echoes this back), or "ERROR <reason>" on stderr + non-zero exit on failure.
#
# Portability: only $CLAUDE_CONFIG_DIR / $HOME — no absolute or developer paths.
# The allowed persona values here are the authority; they must match the style
# snippets in styles/ and the SessionStart hook.

set -euo pipefail

STATE_FILE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/persona.state"
VALID="writer engineer telegrapher caveman"

die() { printf 'ERROR %s\n' "$*" >&2; exit 1; }

read_state() {
  if [ -r "$STATE_FILE" ]; then
    tr -d '[:space:]' < "$STATE_FILE"
  fi
}

cmd="${1:-}"
case "$cmd" in
  show)
    v="$(read_state)"
    printf 'OK persona=%s\n' "${v:-off}"
    ;;

  off | reset)
    rm -f "$STATE_FILE"
    printf 'OK persona=off\n'
    ;;

  set)
    p="${2:-}"
    [ -n "$p" ] || die "missing persona (expected: $VALID)"
    valid=0
    for v in $VALID; do [ "$p" = "$v" ] && valid=1; done
    [ "$valid" -eq 1 ] || die "invalid persona: '$p' (expected: $VALID)"

    mkdir -p "$(dirname "$STATE_FILE")" || die "cannot create config dir"
    tmp="${STATE_FILE}.tmp.$$"
    printf '%s\n' "$p" > "$tmp" || die "cannot write state file"
    mv -f "$tmp" "$STATE_FILE" || die "cannot move state file into place"

    # read-back verification: only report success if the file really holds $p
    rb="$(read_state)"
    [ "$rb" = "$p" ] || die "write verification failed (state holds '$rb')"
    printf 'OK persona=%s\n' "$rb"
    ;;

  "" | -h | --help | help)
    printf 'usage: persona.sh <show|set <persona>|off>\n' >&2
    printf 'personas: %s\n' "$VALID" >&2
    exit 2
    ;;

  *)
    die "unknown subcommand: '$cmd' (expected: show|set|off)"
    ;;
esac
