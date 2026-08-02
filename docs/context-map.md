# Context Map

**What puts which content into whose context, and when — and how do we know?**

This map exists because assumptions were repeatedly built on that turned out to be
wrong: a reach that did not hold; an order that did not apply; a storage location that
did not travel along. It is the basis for decisions about doctrine, modes, and every
future rule.

## Survey baseline

| | |
|---|---|
| **Date** | 2026-08-02 |
| **Claude Code** | **2.1.220** (`claude --version`) |
| **Plugin** | 0.31.1 |
| **Node** | v24.18.1 (CI: 22) |

The Claude Code version is the most important entry in this table. Everything under
**DOC** and **MEASURED** describes the behavior of *that* version. On an update, the
change history between the version named here and the new one is the targeted checklist
— the release notes are in the
[Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) and in the
docs under [Release Notes](https://code.claude.com/docs/en/release-notes).

An example of why this counts: according to the documentation, the roster mechanism for
sibling agents only arrived with **v2.1.206**, `COLUMNS`/`LINES` for the status line with
**v2.1.153**. Behavior this map records as "not present" may simply exist in a later
version.

---

## How to read this map

Every statement carries exactly one provenance marker. **The marker matters more than the
statement** — it says what has to be re-checked at the next CLI update.

| Marker | Means | Verifiable by |
|---|---|---|
| **DOC** | Official Claude Code documentation | Re-fetch the URL, compare against the retrieval date |
| **MEASURED** | Measured first-hand, with a method | Repeat the measurement (setup see below) |
| **CODE** | Derivable from plugin code | Read `file:line` |
| **ASSUMED** | Claimed, evidenced nowhere | **Nothing** — this is where measuring has to happen before anything is built on it |

`ASSUMED` is the most important category. Several load-bearing design decisions of the
plugin rest on unsubstantiated comments to this day.

---

## 1. Who sees what

The core matrix. Rows = context source, columns = context it arrives in.

| Source | Main session | Fork | Sub-agent (general-purpose, custom) | Explore / Plan |
|---|---|---|---|---|
| SessionStart `additionalContext` (doctrine, mode, persona) | yes | yes¹ | **no** | **no** |
| `CLAUDE.md` (user + project) | yes | yes¹ | **yes** | **no** |
| Skill body via `skills:` frontmatter | — | yes¹ | **yes** | yes² |
| Skill body via invocation | yes | yes | yes | yes |
| Git status snapshot | yes | yes¹ | yes | **no** |
| Conversation history | yes | **yes** | no | no |

¹ A fork inherits the entire conversation including the system prompt — **DOC**
([sub-agents.md](https://code.claude.com/docs/en/sub-agents.md), 2026-08-02):
*"A fork inherits the entire conversation so far instead of starting fresh."*

² Not separately verified; `skills:` preload depends on the agent definition.

**The central row is the first one.** It explains why rules for sub-agents belong in the
task prompt and not in doctrine or mode text.

- **DOC**: *"SessionStart/SessionEnd do NOT fire for sub-agents (they have no session,
  only context)"* — [sub-agents.md](https://code.claude.com/docs/en/sub-agents.md),
  retrieved 2026-08-02.
- **MEASURED** (2026-08-02): Five agent types — `general-purpose`, `Explore`,
  `agenticaiplugin:license-checker`, `agenticaiplugin:pr-review-installer`,
  `code-simplifier` — were asked, without tool access, about four strings that occur
  exclusively in the injected context, **plus two control questions** about a doctrine
  block and a sentence that do not exist. All five: doctrine and persona absent, both
  controls correctly negative. Both custom agents described their own system prompt
  correctly — so custom types were in fact what got measured.
  **Without the negative control the result would have been worthless; it is a
  mandatory part of any repetition.**

The `Explore` anomaly in the same measurement (the only one that also did not see
`CLAUDE.md`) is **DOC**-backed: *"Explore and Plan skip your CLAUDE.md files and the
parent session's git status to keep research fast and inexpensive."* Measurement and
documentation agree independently — that supports both.

### What reaches sub-agents nonetheless

| Channel | Reach | Marker |
|---|---|---|
| `CLAUDE.md` | all except Explore/Plan | **DOC** + **MEASURED** |
| `skills:` in the agent frontmatter | plugin-owned agents | **DOC** + **MEASURED** |
| The task prompt | all | trivial |
| `PreToolUse`/`PostToolUse` hooks | apply to sub-agent tool calls too | **DOC** |

The last row answers a question left open in #105: the git-commit guard **does** apply to
sub-agents. A sub-agent unaware of the commit path therefore runs into a block, not past
a gate.

The `skills:` channel is **MEASURED**-backed (2026-08-02, control comparison):
`agents/pr-review-installer.md:10` declares `skills: git-smart-commit`, and the agent
reported the complete skill body in its context; `license-checker` without the
declaration reported nothing of the sort. Whether the directory name or a `name:` field
resolves here is not documented on the **DOC** side — **MEASURED** answers it:
`skills/git-smart-commit/SKILL.md` has **no** `name:` and is loaded anyway, so the
directory name suffices.

---

## 2. When loading happens

| Mechanism | Point in time | Marker |
|---|---|---|
| SessionStart hooks | every session start: `startup`, `resume`, `clear`, `compact`, **`fork`** | **DOC** ([hooks.md](https://code.claude.com/docs/en/hooks.md), 2026-08-02) |
| Skill `description` | always in context | **DOC** |
| Skill body | **only on invocation** — *"a skill's body loads only when it's used"* | **DOC** |
| `CLAUDE.md` | session start, hierarchical | **DOC** |

**`fork` is a fifth matcher the plugin never accounted for.** The hooks deliberately do
not gate on `source` (**CODE** `hooks/inject-doctrine.mjs:72-84`), so they fire there as
well — presumably intended for doctrine and mode, but unverified.

### Order and merging — here a code claim stands against the measurement

`hooks/inject-doctrine.mjs:13-14` claims: *"Multiple SessionStart hooks'
additionalContext are concatenated by Claude Code."*

| Aspect | Finding | Marker |
|---|---|---|
| Hooks run **in parallel**, not sequentially | *"All matching hooks run in parallel (not sequentially)"* | **DOC** |
| How multiple `additionalContext` blocks are merged | **not documented** | DOC gap |
| Order follows the `hooks.json` order | **refuted** | **MEASURED** |
| Size limit for `additionalContext` | **not documented** | DOC gap |

**MEASURED** (2026-08-02): In `hooks/hooks.json`, `inject-doctrine` sits at position 2,
the persona at position 3. In the actual session context the **persona appears first**.
Observed on this session's own context; consistent with the documented parallelism.

**Consequence, already implemented in `hooks/doctrine/core.md:4-6`:** An override must
never rely on position. It has to name *what* it overrides.

---

## 3. What travels along

Decisive for the question of whether the plugin delivers the same thing on a second
machine.

| Source | Travels along? | Marker |
|---|---|---|
| Plugin files (`hooks/`, `skills/`, `agents/`, `doctrine/`) | **yes** | **CODE** |
| Project `CLAUDE.md`, `.claude/guidelines/`, `.claude/adrs/` | yes, with the project repo | **CODE** |
| `~/.claude/CLAUDE.md` | **no** | **CODE** |
| `~/.claude/rules/` | **no** | **CODE** |
| Auto-memory `~/.claude/projects/*/memory/` | **no** | **CODE** |
| Learned skills `~/.claude/skills/learned-*/` | **no** | **CODE** |
| `persona.state`, `mode.state` | **no** | **CODE** `skills/mode/mode.mjs:44-45` |
| `agenticaiplugin.config.json` (all opt-outs) | **no** | **CODE** |

**The consequence has never been stated in one place:** after a fresh installation the
plugin runs in **full default configuration** — doctrine on, git guard on, autoskill off,
persona and mode off. Everything that switches behavior off or personalizes it is
machine-local.

Likewise: the entire operational knowledge in the learned skills (19 skills, 4021 lines
of them in the two orchestration skills alone) is **not present** on a second machine.
The `meta-orchestrator` mode is weaker there than here, without that being visible —
see #107.

---

## 4. Rules in force, by degree of enforcement

Not "which rules exist", but **which are enforced and which are merely written down**.
The second group is the more dangerous one.

### Enforced by tests

| Rule | Test |
|---|---|
| Hooks in exec form, `node`, `${CLAUDE_PLUGIN_ROOT}/….mjs` | `hooks/hooks-policy.test.mjs:14-36` |
| No shell scripts under `hooks/` (recursive) | `hooks/hooks-policy.test.mjs:38-45` |
| Whitelist on the **read path** too (tampered state file) | `skills/persona/persona.test.mjs:122`, `skills/mode/mode.test.mjs:185` |
| `realpath` comparison in the direct-invocation guard (marketplace symlink) | `hooks/guard-git-commit.test.mjs:110`, `hooks/inject-doctrine.test.mjs:101` |
| `skillDir` in the workflow: no default, must be absolute | Workflow suites |
| Mode text names the commit path, no blanket git ban | `mode.test.mjs` (since 0.31.1, effectiveness demonstrated) |

### Merely written down — no safety net

| Rule | Source | Risk |
|---|---|---|
| **No absolute paths in plugin files** | `CLAUDE.md:20-26` | The central portability rule is unprotected |
| `## Usage` + `## Argument Handling` for command skills | `docs/plugin-howto.md:813-851` | — |
| `agenticaiplugin:` prefix in invocation contexts | `CLAUDE.md:138-150` | Agent not resolvable |
| Never combine fork + `*.workflow.js` (#51) | `docs/plugin-howto.md:172-174` | Script becomes silent dead code |
| Command tables in `README.md` ↔ `CLAUDE.md` in sync | `CLAUDE.md:111-113` | **already broken**: `qa` missing in `CLAUDE.md` |

### Path variables — undocumented, yet load-bearing

| Variable | Docs | Plugin usage |
|---|---|---|
| `${CLAUDE_PLUGIN_ROOT}` | **DOC** documented (hook context) | `hooks.json`, agent bodies |
| `${CLAUDE_SKILL_DIR}` | **not documented** | every command skill |
| `${CLAUDE_CONFIG_DIR}` | **not documented** | all state files, config, autoskill |

Two of three variables that load-bearing mechanisms hang on have **no documented
guarantee**. They work, but nobody has promised they will stay.

---

## 5. Open assumptions — the measurement list

Load-bearing design decisions without evidence. Every row is a candidate for a
measurement with a reproducible artifact.

| Assumption | Stated in | Why it counts |
|---|---|---|
| SessionStart fires on `compact` **and** the context lands in the freshly compacted window | `hooks/inject-doctrine.mjs:10-13` | The test only proves that there is **no** gating on `source` — not the effect |
| `PreCompact` cannot preserve context | `docs/plugin-howto.md:360-361` | DOC confirms the recommendation, not the rationale |
| `additionalContext` is "softer" than a real rule | `docs/plugin-howto.md:362-363` | **DOC** calls it a "system reminder" — strength undetermined |
| Claude Code blocks Write/Edit under `~/.claude/` | `hooks/autoskill/lib.mjs:27-38` | Load-bearing for the staging architecture |
| Nested skill folders are not discovered | `hooks/autoskill/lib.mjs:22-24` | Determines the flat layout |
| Skill index truncates `description` at 60 characters | `skills/learn/SKILL.md:60-61` | — |
| The marketplace copy is an unfiltered tree copy | `docs/workflow-integration-howto.md:37` | Reason why `.workflow.js` comes along |
| Skills under `~/.claude/skills/` hot-reload | `docs/plugin-howto.md:433-442` | **Stands in tension** with the marketplace update rule (`CLAUDE.md:155`) |
| `${CLAUDE_PLUGIN_ROOT}` "is empty in the tool context" | `skills/persona/persona.mjs:26`, `skills/mode/mode.mjs:32` | Stated as a blanket claim; a later measurement addendum narrows it to the shell — the scripts carry the old wording **uncorrected** |

---

## 6. Defects this survey made visible

Not assumptions but findings — each one a work item.

1. **`hooks-policy.test.mjs` only checks the path *string*, not whether the file exists.**
   A typo passes the test, and the hook fails silently at runtime. A test that suggests a
   safeguard it does not deliver. — **CODE** `hooks/hooks-policy.test.mjs:28-33`
2. **No test enforces that the five SessionStart hooks stay registered.** Delete the
   `mode.mjs inject` entry and you get a green suite.
3. **`BLOCKS` in `hooks/inject-doctrine.mjs:32-36` is a fixed list.** A fourth doctrine file
   would be silently ignored.
4. **The command tables are already drifting** — `qa` is in `README.md`, missing in `CLAUDE.md`.
   The change checklist names exactly this slip as a common mistake.
5. **`docs/rules-howto.md` dates from January 2025** and describes a mechanism the
   plugin deliberately no longer uses. Its header now says so explicitly; the content
   itself is still unverified.

---

## 7. How this map gets verified

**On a CLI update**, first determine the version difference — `claude --version` against
the survey baseline above — then read the change history between the two versions. That
is cheaper and more complete than re-checking every line: you look specifically for
entries on hooks, `additionalContext`, sub-agents, skills, and frontmatter fields. Only
what shows up there gets re-measured; afterwards update the `DOC` URLs and retrieval date.

**Watch out for negative findings.** In several places the map records that something is
*not* documented or does *not* exist. Such lines age in the wrong direction — they turn
quietly false when a new version supplies what was missing. On an update they need more
attention than the positive statements, not less.

**The `MEASURED` rows** differ in reproducibility:

- *Scriptable*: injection size and composition per mode —
  `mode.mjs inject` with the state file set in an isolated `CLAUDE_CONFIG_DIR`.
- *Not scriptable*: the reach measurement needs real agents. The setup is in section 1
  and **must include the negative control** — without it, a self-report is worthless.

**The `ASSUMED` rows** from section 5 are the actual backlog. Lifting an assumption from
`ASSUMED` to `MEASURED` requires an artifact in the repo, not a memory of a measurement.

---

## Related documents

- `docs/plugin-howto.md` — developer reference. Where it describes a mechanism cleanly,
  this map points there instead of duplicating.
- Issues **#105** (reach), **#107** (portability of the operational knowledge),
  **#108** (doctrine structure) — the three open items that follow from this map.
