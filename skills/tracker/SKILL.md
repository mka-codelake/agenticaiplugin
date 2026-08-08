---
description: >
  Work an issue tracker in blocks: map how the issues couple, evaluate each one by
  reproducing rather than reading, implement in dependency order, and hand each PR to the
  owner for merge. Use when set on a backlog rather than a single task. TRIGGER WORDS: work
  the tracker, arbeite den Issue-Tracker ab, backlog abarbeiten, setz dich auf die Issues an.
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

## Read the labels before the issues

Some issues are not yours to take, and that is a property of the issue, not of the backlog.
Two conventional labels carry it:

- **`with-owner`** — may be assessed, never implemented alone. It goes into no block and
  gets no branch. Bring it to the owner instead.
- **`deferred`** — out of scope entirely until the owner reactivates it.

Independent of each other, and they do occur together.

**A word in the title is not a marking.** Measured in the plugin's own repository: an issue
titled "ZURÜCKGESTELLT: …" carried no label for months and kept showing up as normally
selectable, because nothing checked — the rule existed in nobody's text. If a project uses
other label names, learn them before cutting the first block; if it uses none, say so rather
than assuming everything open is fair game.

Noticing mid-run that an issue *should* carry one of these is worth saying out loud, not
handling silently.

## Map the couplings first — before any block is cut

**Do this once, over every open issue, before evaluating anything.** It is the step that
gets skipped, and skipping it means the couplings surface later, by accident, when someone
happens to mention one.

**The coupling is often not in the files.** Two issues can be file-disjoint and still
collide because both release, both touch a generated artifact, or both move citations a
test resolves. A grep-based check finds that class never. Look for shared files, shared
procedure, mechanical constraints, order, and preconditions — and ask which issues are
**overtaken**: one quoting numbers that no longer hold is a candidate for having been
overtaken entirely.

Say plainly which issues are *independent*. A map where everything connects to everything
helps nobody; the separations carry as much weight as the links.

**Cut blocks along the couplings, not along topic similarity.** Topic similarity is what you
fall back on when you have not looked.

## Evaluate before implementing — one agent per issue, in parallel

They only read, so they run at once. State the read-only constraint in each task prompt
rather than assuming it: the always-on rules do not reach a freshly started sub-agent.
**Stop each agent when it has reported**, or it will still be there when the next one starts.

Each agent answers four questions **in this order**:

1. **Should this be built at all?** Is the problem real? What happens if nothing is done —
   who notices, when? Is there a *smaller* solution than the one the issue proposes?
2. **Is the finding still current?**
3. **What would it cost?**
4. **What does it depend on?**

The first question is the one that gets dropped. A review asked only whether a thing is
built right returns findings about everything except its size — see
`agenticaiplugin:council` for the case that established this.

**Reproduce, do not read.** An issue may be months old. Build the case, run the command,
feed the parser a real input. Evaluations that only read the code have been wrong
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
in what order the block runs — then wait for the go, as the doctrine requires for any
design. Implementers work from the evaluation, not from the issue text.

**The evaluation can be wrong.** It has been: a recommended replacement pattern lost matches
and invented a false one, and only the implementing agent noticed, because it ran the
pattern instead of adopting it. Tell implementers to execute anything they write.

## Watch what grows

Track what was ordered and what accrued. In one change set, thirteen ordered edits produced
no follow-up defect, while two unordered additions each introduced one and consumed three
commits stabilising themselves.

Two mechanisms produce that growth, and both are worth naming out loud:

**A rule written and applied in the same change** takes its scope from the rule's reach
rather than from the task. That reach is unbounded by construction.

**A half-fixed defect looks finished.** If the evaluation names a cause and then scopes the
work to the symptom, the issue closes on a scan that still scans nothing. That is the moment
to go back to the order, not to quietly widen it.

## The pull request

**Open it when the branch is complete.** Not for intermediate states — a PR on half a branch
burns review rounds without yielding anything, and there is nothing to look at yet.

**Merge only on the owner's explicit go, every time.** A general approval from an earlier
session does not carry over, and neither does one given for a different kind of work. Keep
building while an approval is pending — on the finished branch or a fresh one from the
default branch; only the merge waits.

## Close the loop

Per issue: post what was implemented, what was refuted, what was split off. **A finding split
off without a destination is lost, not split off** — it needs an issue, or two lines in the
one it came from.

Carry forward what the work produced: measurements worth keeping, a fixture recorded at
cost, a defect found on the way. The next block starts from what this one learned or it
starts from zero.
