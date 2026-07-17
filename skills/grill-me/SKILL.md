---
description: >
  Relentlessly interview the user to stress-test a plan, design, or decision until
  you reach shared understanding. Walks the decision tree branch by branch, one
  question at a time, each with a recommended answer. Stateless — writes nothing.
  Invoke via /agenticaiplugin:grill-me.
disable-model-invocation: true
effort: high
---

# Grill Me

Stress-test a plan, design, or decision through a relentless one-question-at-a-time
interview, until you and the user reach a shared understanding. Stateless: nothing is
written, the only artifact is the sharpened understanding in the conversation.

## Usage

```
/agenticaiplugin:grill-me [<topic>]
```

| Mode | Command | Description |
|------|---------|-------------|
| **Default** | `/agenticaiplugin:grill-me` | Grills the plan/decision currently in the conversation. If none is evident, ask the user what to grill first. |
| **With Topic** | `/agenticaiplugin:grill-me caching strategy` | Uses the free-text as the subject of the interview. |

## Argument Handling

**Check BEFORE executing any steps:**

1. **`--help` passed** → Display the Usage section above verbatim, then STOP.
2. **No argument** → Grill the plan/decision in the current context. If none is
   evident, ask the user what they want to grill, then proceed.
3. **Free-text argument** → Use it as the subject of the interview, then proceed.

## Instructions

Interview the user relentlessly about every aspect of the subject until you reach a
shared understanding. Walk down each branch of the decision tree, resolving
dependencies between decisions one by one — settle a parent decision before the
choices that hang off it.

**Rules of the interview:**

- **One question at a time.** Ask a single question, then wait for the answer before
  continuing. Asking multiple questions at once is bewildering.
- **Recommend an answer.** For every question, provide your own recommended answer with
  brief reasoning, so the user reacts to a proposal instead of a blank prompt.
- **Look up facts, ask only for decisions.** If something can be determined from the
  environment (filesystem, tools, code, docs), look it up yourself rather than asking.
  The *decisions* are the user's — put each one to them and wait.
- **Surface the implicit.** The goal is not fast agreement; it is to make every implicit
  call explicit, so nothing important is left silently assumed.
- **Do not act yet.** Do not implement, edit, or commit anything until the user confirms
  you have reached a shared understanding.

When the tree has been walked and the user confirms, give a concise summary of the
settled decisions.
