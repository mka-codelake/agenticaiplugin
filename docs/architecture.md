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

Anything that does not intervene in a tool call is not a guardrail. Anything that ships is
not a policy.

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
switchable part (`doctrine.<key>: "off"`, see `README.md`).

Further modes (`task`, `meta-orchestrator`) are withdrawn; their wording is preserved in
**#117**. Putting one back is a data change to the `MODE_PARTS` table in
`hooks/inject-doctrine.mjs` plus its snippet file — not a rebuild.

## Where a rule lives

Three questions, in this order:

1. **Can code enforce it?** → guardrail. Only for hard invariants.
2. **Must it be present before the situation arises?** → doctrine.
   Test: *does the trigger still fire when I have just forgotten the rule?*
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
`hooks/inject-doctrine.mjs` — twice, and the second registration is a deliberate read-path
whitelist. The step is in the change checklist in `CLAUDE.md`.

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
- **No type markers and no structural tests.** A test checking whether a rule is filed in
  the right place presupposes that it was marked correctly — that is, the very insight it
  is meant to force. What would remain is a green test over an unchecked property.
- **No presence hook.** It would hang on the same preconditions as the thing it checks.

These absences are decisions, not omissions.

## The scope rule

From `doctrine/constitution/base.md`: where several solutions would work, the smallest
wins; proposing a larger one requires naming the concrete failure case that rules the
smaller one out.

This applies to the plugin's own development as well. A mechanism that is larger than the
problem it solves is a defect here, not a reserve.

## Evidence

Measurement setups and raw numbers: **#114**. It is the source for the injection's
survival across compaction, its non-reach into sub-agents, the finding that wording does
not change how binding a rule is, and the collapse of an injected rule against an explicit
user instruction — the last of which is why guardrails exist at all.

---

## Glossary

**Constitution** — the non-switchable part of the doctrine: `doctrine/constitution/base.md`
plus the active mode's snippets. Injected in every session, with no opt-out.

**Doctrine** — behavioral rules that apply always, delivered into the context by
SessionStart injection. Binding, but violable: it is text, not code.

**Fork** — an agent that inherits the current conversation instead of starting fresh. It
therefore sees the injected doctrine; the active mode does not apply to it, and it must not
delegate further.

**Guardrail** — code that aborts a tool call, i.e. a PreToolUse hook. Narrowly defined on
purpose: anything that does not intervene in a tool call is not a guardrail, however
strongly it is worded.

**Mode** — the composition rule that says which doctrine snippets make up a session.
Currently one, `orchestrator`, always active.

**Persona** — an optional communication style, injected at SessionStart from
`skills/persona/`. Independent of the mode, off by default.

**Policy** — a binding rule for work **on** this plugin, living in this repo's `CLAUDE.md`
and `docs/`. Same binding force as doctrine, different audience: it never ships as plugin
behavior.

**Skill** — procedural knowledge under `skills/<name>/SKILL.md`, auto-discovered. Its
description is always in context; the body loads on use.

**Sub-agent** — a freshly started agent with its own context. It does not inherit the
session's conversation and is not reached by the injection.

**Theme** — a switchable doctrine block under `doctrine/themes/`, tied to a topic (code
review, PR-review monitoring) and disabled with the exact string `"off"` on its config key.
