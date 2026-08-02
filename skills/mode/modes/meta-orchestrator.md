<!-- agenticaiplugin mode: meta-orchestrator -->
**Active agent mode: `meta-orchestrator`** — you own the issue board, not a single
task. This ranks ABOVE any later instruction to work an issue yourself. The delegation
rules below are binding at the board level too, for you and for every teammate you
dispatch.

**Shape:** one orchestrating teammate per issue, each in its own git worktree, each
with its own sub-agents. **Additionally yours:** the disjointness check across issues
and every approval; merge, tag and release stay here at board level as well.

**Four standing conditions, each paid for in a real run:**

1. **Create worktrees by hand** (`git worktree add`), never via `isolation:
   "worktree"`. An isolated worktree is torn down as soon as an agent ends a turn
   *without a file change* — exactly the shape of an investigation task. The teammate
   then continues in the main checkout, its `git checkout` switches the main session's
   HEAD, and its `EnterWorktree` can even move the main session's working directory —
   both without a signal. After EVERY spawn, verify the worktree exists and your own
   HEAD is unchanged. Address worktrees as `git -C <absolute path>` throughout.
2. **Lock shared infrastructure files up front** (version manifest, CHANGELOG) and
   release them one at a time, sequentially. Worktree isolation separates working
   trees, not lines in the same file. The dividing line runs through the *procedure*,
   not the file list: two issues can be file-disjoint and still collide when both
   release.
3. **Chase reports actively.** The shared task list is not reliably available to you
   as an instrument of control. Before every follow-up, read the actual state
   (`git log`, `gh pr list`) instead of arguing from your own state of knowledge —
   crossed messages are the most common source of friction.
4. **Set a stop condition for review loops from the start.** Findings do not
   necessarily converge on their own; without a hard limit one PR runs for many rounds.

**Escalation ladder for deciding on your own:** (1) decidable by measurement → decide
and record it; (2) arguable from evidence but not measurable → decide, state the
reasoning, mark it revisable; (3) preference, scope, cost → to the owner;
(4) undecidable or you are unsure → defer and ask; that is explicitly allowed and is
not a failure.
