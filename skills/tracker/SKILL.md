---
description: >
  Work an issue tracker in blocks: map how the issues couple, evaluate each one by
  reproducing rather than reading, implement in dependency order, and hand each PR to the
  owner for merge. Use when set on a backlog rather than a single task — the value is in
  the order and the cutting, not in the speed. TRIGGER WORDS: work the tracker, arbeite
  den Issue-Tracker ab, backlog abarbeiten, setz dich auf die Issues an.
effort: high
---

# Tracker — working a backlog without losing the thread

Single issues need no procedure. This one exists because a backlog has a property a task
does not: **the issues know things about each other, and none of them says so.**

## Usage

```
/agenticaiplugin:tracker [<scope>]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Default** | `/agenticaiplugin:tracker` | Works all open issues, in blocks. |
| **Scoped** | `/agenticaiplugin:tracker <scope>` | Restricts to a label, a milestone, or a named set. |

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags** → Display the Usage section above verbatim, then STOP.

Anything else names the scope.

## Map the couplings first — before any block is cut

**Do this once, over every open issue, before evaluating anything.** It is the step that
gets skipped, and skipping it means the couplings surface later, by accident, when someone
happens to mention one.

Look for five kinds, and note that the first is the least important:

- **Shared files** — check in the repository, not from the issue text
- **Shared procedure** — release, version manifest, CHANGELOG, a review workflow. *The
  coupling is often not in the files:* two issues can be file-disjoint and still collide
  because both release. A grep-based check finds this class never.
- **Mechanical constraints** — a guard that forces a file into a PR of its own, a lock, a
  generated artifact. Find them before they find you.
- **Order** — A before B, because B would otherwise redo A's work or build on a stale state
- **Precondition** — B only becomes arguable once A is decided

And ask which issues are **overtaken**: an issue quoting numbers that no longer hold (test
counts, byte sizes, line numbers) is a candidate for having been overtaken entirely.

Say plainly which issues are *independent*. A map where everything connects to everything
helps nobody; the separations carry as much weight as the links.

**Cut blocks along the couplings, not along topic similarity.** Topic similarity is what
you fall back on when you have not looked.

## Evaluate before implementing — one agent per issue, in parallel

Read-only, no writes to the repository, no state-changing git. Each agent answers four
questions **in this order**:

1. **Should this be built at all?** Is the problem real? What happens if nothing is done —
   who notices, when? Is there a *smaller* solution than the one the issue proposes?
2. **Is the finding still current?**
3. **What would it cost?**
4. **What does it depend on?**

**The first question is the one that gets dropped, and dropping it is expensive.** Measured
in this repository: a review agent returned 18 findings on a concept, 16 of them correct,
and not one said the concept was larger than the problem it solved. It had been asked
whether the thing was built right, never whether it should exist.

**Reproduce, do not read.** An issue may be months old. Build the case, run the command,
feed the parser a real input. Evaluations that only read the code have been wrong here
repeatedly — one issue rested for months on the premise that a tool was unavailable, and
the tool was installed. Ask each agent to state plainly what it *measured* and what it only
*read*.

Give each agent the skepticism its issue deserves: whether the demanded test infrastructure
can ever be operated, whether the artifact it wants to protect has changed even once,
whether a guard fails open or closed. A generic brief produces generic findings.

**Post each evaluation into its issue.** What is not written down is gone with the session,
and the next round starts by measuring it again.

## Hand the block to the owner before implementing

Present the evaluations together: per issue what is real, what shrank, what fell away, and
in what order the block runs. Then implement — the agent's ground is the evaluation, not
the issue text.

**The evaluation can be wrong.** It has been: a recommended replacement pattern lost matches
and invented a false one, and only the implementing agent noticed, because it ran the
pattern instead of adopting it. Tell implementers to execute anything they write.

## Watch what grows

Track what was ordered and what accrued. In one PR here, thirteen ordered edits produced no
follow-up defect, while two unordered additions each introduced one and consumed three
commits stabilising themselves.

Two mechanisms produce that growth, and both are worth naming out loud:

**A rule written and applied in the same change** takes its scope from the rule's reach
rather than from the task. That reach is unbounded by construction.

**A half-fixed defect looks finished.** If the evaluation names a cause and then scopes the
work to the symptom, the issue closes on a scan that still scans nothing. That is the moment
to go back to the order, not to quietly widen it.

When a change set has grown well past what was ordered, **convene a council before merging**
— not afterwards, when it is a retrospective. Its question is proportionality, not
correctness; the review rounds have covered correctness. See `agenticaiplugin:council`.

## The pull request

**Open it when the branch is complete.** Not for intermediate states — a PR on half a branch
burns review rounds without yielding anything, and there is nothing to look at yet.

**Every push ends with the review monitor, or it does not happen.** A push and a second
task do not belong in the same step; that is exactly how the monitor gets dropped. It has
been dropped twice here in one day, both times while attention was on something else.

Keep monitoring until a round yields nothing valid — repeats, nitpicks and noise do not
count. Assess every finding on its merits; you hold the authority to skip one with a stated
reason. If rounds keep producing new findings without converging, stop and hand the
decision to the owner rather than turning the loop further.

**Merge only on the owner's explicit go, every time.** A general approval from another
session does not carry over. Keep building while an approval is pending — on the finished
branch or a fresh one from the default branch; only the merge waits.

## Close the loop

Per issue: post what was implemented, what was refuted, what was split off. **A finding
split off without a destination is lost, not split off** — it needs an issue, or two lines
in the one it came from.

Carry forward what the work produced: measurements worth keeping, a fixture recorded at
cost, a defect found on the way. The next block starts from what this one learned or it
starts from zero.

## Delegation hygiene

Sub-agents share one working tree unless you say otherwise, and two of them committing at
once collide in the index — evaluations run parallel because they only read; implementations
run one at a time. Stop each agent when it reports, or it will still be there when the next
one starts. Have each report back over the named channel; an idle notice without a result is
a failure state, not a completion.
