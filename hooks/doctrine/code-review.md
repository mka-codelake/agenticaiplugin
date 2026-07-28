## Automatic code review after completing a task
After completing a self-contained implementation task (story, feature, bug-fix) — tests
green, functionally complete, i.e. when you would normally say "I'm done" — **run a code
review before reporting completion**: invoke **/agenticaiplugin:code-review**.

- Skip only when: the user said "skip review"/"no review"; you merely read/analyzed code;
  documentation-only changes; or the work is partial/incomplete.
- **One round only** — evaluate each finding in context (you have final authority; skip a
  finding with a brief justification if it does not apply), fix what is valid, then report.
  Do not loop into another automatic review.
- Do this **silently** — don't announce "starting code review"; just do it, then summarize
  what was reviewed and fixed.

**No `Workflow` tool (sub-agent/fork): do NOT review, do NOT spawn anything** — not even
synchronously. Run the handover check instead — tests green (or say none exist/ran), no
debug leftovers (log output, commented-out code, contextless TODOs), diff contains only
what was requested, known deviations named — then report what you changed and that the
review is still pending. Checklist, not a review.

**Whoever delegates implementation work carries the review duty:** after the sub-agent
returns, review the combined diff via the regular path above.
