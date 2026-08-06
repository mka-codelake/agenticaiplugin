# AgenticAI Plugin — Architecture

**What the plugin is made of, and where a new rule belongs.**

This file answers where something goes. `docs/context-map.md` answers a different
question — what arrives in whose context, and how we know. Where a statement here rests on
a measurement, it points there instead of repeating it.

## What the plugin is

A collection of tools plus a small body of rules that records the way of working which
would otherwise have to be agreed again in every session. **Not a process framework.**

## The building blocks

| Block | What | How it takes effect | Violable |
|---|---|---|---|
| **Guardrail** | Code that aborts a tool call | PreToolUse hook | no |
| **Doctrine** | Behavioral rules that always apply | SessionStart injection | yes |
| **Persona** | Communication style | SessionStart injection | yes |
| **Skill** | Procedural knowledge, on demand | loaded when needed | n/a |
| **Policy** | Rules for work **on** the plugin | `CLAUDE.md` and `docs/` of this repo | yes |

Anything that does not intervene in a tool call is not a guardrail. Anything that ships **as
plugin behavior** is not a policy — this repo's `docs/` travels with the plugin, but nothing
in it reaches a user's session.

There is currently exactly one guardrail: `hooks/guard-git-commit.mjs` blocks a raw
`git commit` and steers to the commit skill. The doctrine and the persona are injected by
`hooks/inject-doctrine.mjs` and `skills/persona/persona.mjs inject`, both registered in
`hooks/hooks.json` as SessionStart hooks. The persona is opt-in and off until it is set;
the doctrine is not.

## The mode

A **mode** is the composition rule for a session's doctrine — not a state anyone selects:

```
session doctrine = constitution/base.md          always
                 + the active mode's snippets    constitution/orchestrator.md
                                                 + constitution/shared-delegation.md
                 + themes/…                      unless switched off
```

There is currently one mode, `orchestrator`. It is active in every session and cannot be
switched off; there is no state file and no config key for it. The themes are the only
switchable part (`doctrine.<key>: "off"`, see `README.md`). Beyond composition the mode
carries a decision procedure — the escalation ladder in
`doctrine/constitution/orchestrator.md`, which sets how far a session decides on its own
before it asks the owner.

Further modes (`task`, `meta-orchestrator`) are withdrawn; their wording is preserved in
**#117**. Putting one back is a data change to the `MODE_PARTS` table in
`hooks/inject-doctrine.mjs` plus its snippet file — not a rebuild.

## Where a rule lives

Three questions, in this order:

1. **Can code enforce it?** → guardrail. Only for hard invariants.
2. **Must it be present before the situation arises?**
   Test: *does the trigger still fire when I have just forgotten the rule?*
   **No → doctrine. Yes → skill.**
   The code-review rule belongs here even though it could be triggered — it is aimed at
   one's own carelessness, and that is exactly when nobody loads a skill.
3. **Otherwise** → skill.

**Within a theme:** the *trigger* is injected, the *procedure* lives in the skill. The
trigger includes its negative conditions — a skip condition inside the skill would mean
loading the skill to learn that you do not need it.

**Exception:** rules that protect against **foreign content** (review findings, agent
reports) stay injected. Foreign content often arrives with a single command, without any
skill loading.

A doctrine file dropped into `doctrine/` is not injected until it is registered in
`hooks/inject-doctrine.mjs`, in `CONSTITUTION` or `THEMES`. The step is in the change
checklist in `CLAUDE.md`.

## Two rules for writing

**No duplication.** A rule stands in one place. If it stands in two, the cut is wrong.

**Context costs, but reliability comes first.** Where moving text into a skill costs
reliability, the text stays injected.

## Sub-agents

The injection does **not** reach them (measured; see `docs/context-map.md` §1). Rules that
must hold for a sub-agent belong in the task prompt the orchestrator writes. No second
channel, no separate files. A `fork` is the exception: it inherits the conversation, hence
the doctrine too.

## What deliberately does not exist

- **No detection of a missing `node`.** If the interpreter fails, every hook fails —
  silently. `hooks/check-prereqs.mjs` cannot cover this case, because it is itself a Node
  script. Any mechanism against it costs more than it returns: a second interpreter
  produces a permanent error on every platform and covers only one, and a permanent false
  alarm trains people to skip exactly the messages that signal a real outage. Measured: two
  incidents in 16 days, both recovered within minutes.

This absence is a decision, not an omission.

## The scope rule

From `doctrine/constitution/base.md`: where several solutions would work, the smallest
wins; proposing a larger one requires naming the concrete failure case that rules the
smaller one out.

This applies to the plugin's own development as well. A mechanism that is larger than the
problem it solves is a defect here, not a reserve.

## Evidence

Measurement setups and raw numbers: **#114**. It is the source for the injection's
non-reach into sub-agents, the finding that wording does not change how binding a rule is,
and the collapse of an injected rule against an explicit user instruction — the last of
which is why guardrails exist at all. The same issue also carries the compaction
measurement (2026-08-02, `claude-sonnet-5`, 25 runs): with the rule injected, the compacted
arm obeyed it 8/10 against 10/10 uncompacted — Fisher exact p = 0.237, no detectable
difference — while the uninjected control arm obeyed it 0/5. The injection therefore
survives a compaction.

The limits belong to that result. One model, one rule, one task type; manual `/compact`
instead of an auto-compaction at the window limit; the check turn immediately after the
compaction. A residual effect on the order of 100 % → 80 % is neither established nor ruled
out — that would take roughly 40 runs per arm.

---

## Glossary

Only terms the sections above do not already define. Guardrail, doctrine, persona, skill
and policy are in the building-block table; mode, fork and sub-agent are defined where they
are used.

**Constitution** — the non-switchable part of the doctrine: `doctrine/constitution/base.md`
plus the active mode's snippets. The name appears in the code (`CONSTITUTION`) and in
`docs/context-map.md`, but nowhere as a switch: it has no opt-out.
