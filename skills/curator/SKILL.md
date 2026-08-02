---
description: |
  Curate the learned-skill library: deterministic lifecycle maintenance
  (stale > 30 days, archive > 90 days, never delete, pinned exempt) plus an
  LLM analysis for overlap and quality findings. Part of the autoskill
  self-learning mechanism. Invoke via /agenticaiplugin:curator.
user-invocable: true
disable-model-invocation: true
---

# Curator

Runs the autoskill curator pass: deterministic lifecycle maintenance
(stale > 30 days, archive > 90 days, **never delete**, `pinned: true` exempt)
plus a read-only LLM analysis for overlap and quality findings.

## Usage

```
/agenticaiplugin:curator [--help]
```

| Argument | Behavior |
|----------|----------|
| *(none)* | Run the curator pass |
| `--help` / `-h` | Show this usage, then STOP |

## Argument Handling

1. **`--help` or `-h`** → display the Usage section above verbatim, then STOP.
2. **Any other argument** → display the Usage section above verbatim, then STOP
   (the curator takes no parameters).

## Procedure

The worker lives at `${CLAUDE_PLUGIN_ROOT}/hooks/autoskill/run-review.mjs`.

1. Run the curator worker in the foreground with the Bash tool:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/hooks/autoskill/run-review.mjs" curator
   ```
   (May take 1–3 minutes because of the LLM pass.)
2. Read the report:
   `${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.autoskill/curator-report.md`
   (a copy of the newest run; the dated history lives in `.../reports/`).
3. Summarize the key results to the user:
   - Lifecycle transitions (stale / archived)
   - Consolidation proposals (MERGE / RENAME / FIX / DELETE-CANDIDATE)
4. **Never merge or delete automatically** — apply consolidations only after
   the user's explicit approval. Archived skills are recoverable under
   `${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.autoskill/archive/`.

**Prerequisite — Node.js and the `claude` CLI:** the worker needs `node` on
PATH, and the LLM analysis pass needs the `claude` CLI. If `claude` is absent
the deterministic lifecycle report is still produced; only the overlap
analysis is skipped.

## Notes

- Learned skills live flat under `${CLAUDE_CONFIG_DIR:-~/.claude}/skills/<name>/`;
  which of them are agent-created (and thus curator-managed) is recorded in the
  manifest `.../agenticaiplugin.autoskill/learned.list`. All other skills are
  protected.
- Usage data: `.../agenticaiplugin.autoskill/usage.json`. Three timestamps are
  kept apart per skill: `installed_at` (first install), `last_updated` (every
  reinstall by the background reviewer) and `last_used` (actual usage — a `Skill`
  invocation or a Read of one of its files, recorded by the PostToolUse hook).
  **The lifecycle clock is `last_used`, else `installed_at`** — never the
  `SKILL.md` mtime, which every reviewer patch refreshes and which would keep a
  maintained but unused skill artificially young. Missing timestamps are
  backfilled from `review.log` on the next run.
- Reports: each run is written to `.../reports/curator-<timestamp>.md`, the
  newest twelve are kept. A run also leaves a one-line summary that the next
  prompt shows once (💾) and then consumes.
- Otherwise the pass runs automatically and lazily via the Stop hook; the
  interval is configured in `agenticaiplugin.config.json`
  (`autoskill.curator.intervalDays`, `autoskill.curator.enabled`).
