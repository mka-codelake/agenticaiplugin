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

`{skill_dir}` = the absolute path of THIS skill's directory. The worker lives
at `{skill_dir}/../../hooks/autoskill/run-review.mjs`.

1. Run the curator worker in the foreground with the Bash tool:
   ```bash
   node "{skill_dir}/../../hooks/autoskill/run-review.mjs" curator
   ```
   (May take 1–3 minutes because of the LLM pass.)
2. Read the report:
   `${CLAUDE_CONFIG_DIR:-~/.claude}/agenticaiplugin.autoskill/curator-report.md`.
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
- Usage data: `.../agenticaiplugin.autoskill/usage.json` (maintained by the
  PostToolUse hook).
- Otherwise the pass runs automatically and lazily via the Stop hook; the
  interval is configured in `agenticaiplugin.config.json`
  (`autoskill.curator.intervalDays`, `autoskill.curator.enabled`).
