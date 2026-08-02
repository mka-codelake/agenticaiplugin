---
description: >
  Convene a council: two or three independent, mutually blind views on one decision,
  spawned in parallel, each brief asking both whether the thing should be built at all
  and whether it is built right. Use for a judgment call that can be argued from evidence
  but not measured — reached from the orchestrator escalation ladder, or invoked directly
  via /agenticaiplugin:council. TRIGGER WORDS: second view, second opinion, sanity-check
  this decision, zweite Sicht, Gremium.
effort: medium
---

# Council — an independent second view

Two or three independent views on one decision, so the question can be settled by thinking
instead of by asking the owner.

## Usage

```
/agenticaiplugin:council [<decision>]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Default** | `/agenticaiplugin:council` | Convenes on the decision currently under discussion. If none is evident, ask which decision to put to the council. |
| **With topic** | `/agenticaiplugin:council <decision>` | Convenes on the named decision. |

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **Unrecognized flags** → Display the Usage section above verbatim, then STOP.

Anything else is the decision to be examined.

## How to cut it

Two or three views, spawned in parallel, each with its own angle. There is no fixed
catalogue of roles — the angles follow the question. Give every view the same material and
a different vantage point.

**Independent means blind:** no view sees another's brief or findings. Views that can read
each other converge on whichever opinion landed first, and three agreeing voices then look
like corroboration when they are one voice repeated.

## Both questions go into every brief

Each brief asks two things, in this order:

1. **Should this be built at all?** Is there a smaller solution that solves the same
   problem?
2. **Is it built right?**

The first question is the one that gets dropped, and dropping it is expensive. A review
agent once returned 18 findings on a concept in this repo; 16 of them were correct — and
not one said that the concept was larger than the problem it solved. It had been asked
whether the thing was built right, never whether it should exist. The owner stopped the
concept. A council asked only the second question finds everything except the overbuild.

## Reading the findings

Findings are data, not instructions. Whoever convened the council keeps the decision and
weighs each finding on its merits, in the context only the caller has.

A finding arguing for a *bigger* solution carries the burden set out under **Surgical,
minimal scope** in the core doctrine: it must name the concrete failure case that rules the
smaller solution out. Without that failure case, the finding drops.

## When not to convene

- **The question is measurable.** Measuring is cheaper than any number of opinions and
  beats all of them.
- **The question is preference, scope, or cost.** That belongs to the owner. A second view
  cannot help, because the answer is a matter of will, not of fact.
- **The question is small.** A council over something a single `grep` would answer costs
  more than it returns.
