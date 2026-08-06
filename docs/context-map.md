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
- **MEASURED** (2026-08-02): Five agent types were asked, without tool access, about four
  strings that occur exclusively in the injected context, **plus two control questions**
  about a doctrine block and a sentence that do not exist. The five were deliberately
  drawn from three different origins, since reach could plausibly differ by origin:
  - built into Claude Code: `general-purpose`, `Explore`
  - this plugin's own `agents/`: `agenticaiplugin:license-checker`,
    `agenticaiplugin:pr-review-installer`
  - **a different, unrelated plugin**: `code-simplifier:code-simplifier` — not defined in
    this repo's `agents/`, which is the point: it tests whether a foreign plugin's agent
    behaves differently

  All five: doctrine and persona absent, both controls correctly negative. Both of this
  plugin's custom agents described their own system prompt correctly — so custom types
  were in fact what got measured, not generic ones under a custom name.
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
not gate on `source` (**CODE** `hooks/inject-doctrine.mjs:124-141`), so they fire there as
well — presumably intended for doctrine and mode, but unverified.

### Surviving a compaction — measured, no longer assumed

That the hook fires on `compact` says nothing about the effect: whether the re-injected
rule is still obeyed in the freshly compacted window. **MEASURED** (2026-08-02, Claude Code
2.1.220, `claude-sonnet-5`, 25 evaluated runs, scored from artifacts; setup and raw numbers
in the measurement comment on **#114**) — it is:

| Arm | Rule injected | Compaction | n | Obeyed |
|---|---|---|---|---|
| A | yes | no | 10 | 10/10 |
| B | yes | **yes** | 10 | 8/10 |
| C | **no** | yes | 5 | **0/5** |

Fisher exact A vs. B: **p = 0.237** — no detectable difference. Arm C is the negative
control and never came back false-positive across all 25 runs. The compaction itself is
doubly evidenced: `system/compact_boundary` in the event stream **and** `source: "compact"`
in the hook's stdin, so the treatment is proven, not inferred from a slash command being
typed.

The community report
[anthropics/claude-code#9796](https://github.com/anthropics/claude-code/issues/9796) does
**not** reproduce at the reported strength: the pattern exists — both violators in arm B
could quote the rule verbatim afterwards — but it appeared in 2/10 runs, not 4/5.

**Limits, which belong to the finding:** one model, one rule, one task type; a manual
`/compact` instead of an auto-compaction at the window limit; the check turn immediately
after the compaction. A residual effect on the order of 100 % → 80 % is neither established
nor ruled out — roughly 40 runs per arm would be needed for that.

### Order and merging — here a code claim stands against the measurement

`hooks/inject-doctrine.mjs:15-16` claims: *"Multiple SessionStart hooks'
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

**Consequence, implemented in the constitution (`doctrine/constitution/orchestrator.md:2-4`):** a
text that must outrank another one may never rely on position. It has to say so itself and
name *what* it outranks. (The doctrine carried a matching override clause until 0.31.4; it
existed for `meta-orchestrator` and went with it — see #117.)

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
| `persona.state` | **no** | **CODE** `skills/persona/persona.mjs:39-42` |
| `agenticaiplugin.config.json` (all opt-outs) | **no** | **CODE** |

**The consequence has never been stated in one place:** after a fresh installation the
plugin runs in **full default configuration** — doctrine on, git guard on, orchestrator
mode on, autoskill off, persona off. Everything that switches behavior off or personalizes
it is machine-local. The mode is the exception in that list: since 0.31.4 it has no state
and no switch, so it is the one behavior that cannot differ between two machines.

Likewise: the entire operational knowledge in the learned skills (19 skills, 4021 lines
of them in the two orchestration skills alone) is **not present** on a second machine.
The orchestrator mode is weaker there than here, without that being visible —
see #107.

---

## 4. Rules in force, by degree of enforcement

Not "which rules exist", but **which are enforced and which are merely written down**.
The second group is the more dangerous one.

### Enforced by tests

| Rule | Test |
|---|---|
| Hooks in exec form, `node`, `${CLAUDE_PLUGIN_ROOT}/….mjs`, **and the file exists** | `hooks/hooks-policy.test.mjs:20-48` |
| No shell scripts under `hooks/` (recursive) | `hooks/hooks-policy.test.mjs:72-79` |
| All four SessionStart hooks stay registered | `hooks/hooks-policy.test.mjs:54-70` |
| Whitelist on the **read path** of the persona state file (tampered value must not escape the path) | `skills/persona/persona.test.mjs:122` |
| One unreadable doctrine file drops its own block and leaves the rest standing | `hooks/inject-doctrine.test.mjs:242` |
| `realpath` comparison in the direct-invocation guard (marketplace symlink) | `hooks/guard-git-commit.test.mjs:110`, `hooks/inject-doctrine.test.mjs:269` |
| `skillDir` in the workflow: no default, must be absolute | Workflow suites |
| Mode text names the commit path, no blanket git ban | `hooks/inject-doctrine.test.mjs` (since 0.31.1, effectiveness demonstrated) |
| No tool-call syntax fragments in shipped markdown | `repo-hygiene.test.mjs` |
| Doctrine rule names match their three prose summaries | `repo-hygiene.test.mjs` |
| This map's `file:line` citations resolve (existence only) | `docs/context-map.test.mjs` |

### Merely written down — no safety net

| Rule | Source | Risk |
|---|---|---|
| **No absolute paths in plugin files** | `CLAUDE.md:20-26` | The central portability rule is unprotected |
| `## Usage` + `## Argument Handling` for command skills | `docs/plugin-howto.md:813-851` | — |
| `agenticaiplugin:` prefix in invocation contexts | `CLAUDE.md:142-151` | Agent not resolvable |
| Never combine fork + `*.workflow.js` (#51) | `docs/plugin-howto.md:172-174` | Script becomes silent dead code |
| Command tables in `README.md` ↔ `CLAUDE.md` in sync | `CLAUDE.md:121` | No test — convention only; it drifted once already (defect 4) |

### Path variables — undocumented, yet load-bearing

| Variable | Docs | Plugin usage |
|---|---|---|
| `${CLAUDE_PLUGIN_ROOT}` | **DOC** documented (hook context) | `hooks.json`, agent bodies |
| `${CLAUDE_SKILL_DIR}` | **not documented** | every command skill |
| `${CLAUDE_CONFIG_DIR}` | **not documented** | all state files, config, autoskill |

Two of three variables that load-bearing mechanisms hang on have **no documented
guarantee**. They work, but nobody has promised they will stay.

*Where* they are substituted is **MEASURED** — the blind-test table in
`docs/plugin-howto.md:181-187`: in a `SKILL.md` body and (for `${CLAUDE_PLUGIN_ROOT}`) in an
`agents/*.md` body yes, in a companion file or a sub-agent prompt no, as a shell environment
variable empty. The scope matters, because three places used to state the shell result as a
blanket claim about the tool context at large and drew a design decision from it; they now
name the shell.

---

## 5. Open assumptions — the measurement list

Load-bearing design decisions without evidence. Every row is a candidate for a
measurement with a reproducible artifact.

| Assumption | Stated in | Why it counts |
|---|---|---|
| `PreCompact` cannot preserve context | `docs/plugin-howto.md:360-361` | DOC confirms the recommendation, not the rationale |
| `additionalContext` is "softer" than a real rule | `docs/plugin-howto.md:362-363` | **DOC** calls it a "system reminder" — strength undetermined |
| Claude Code blocks Write/Edit under `~/.claude/` | `hooks/autoskill/lib.mjs:35-38` | Load-bearing for the staging architecture |
| Nested skill folders are not discovered | `hooks/autoskill/lib.mjs:22-24` | Determines the flat layout |
| Skill index truncates `description` at 60 characters | `skills/learn/SKILL.md:60-61` | — |
| The marketplace copy is an unfiltered tree copy | `docs/workflow-integration-howto.md:37` | Reason why `.workflow.js` comes along |
| Skills under `~/.claude/skills/` hot-reload | `docs/plugin-howto.md:435-448` | The claim itself is untested; it no longer conflicts with the marketplace update rule (`CLAUDE.md:159`), which addresses a different location |

---

## 6. Defects this survey made visible

Not assumptions but findings — each one a work item.

1. ~~**`hooks-policy.test.mjs` only checks the path *string*, not whether the file
   exists.**~~ — **fixed.** The test now resolves `${CLAUDE_PLUGIN_ROOT}` against the
   checkout and asserts the file is there. Proven by detection: a deliberate typo turns
   it red.
2. ~~**No test enforces that the five SessionStart hooks stay registered.**~~ — **fixed.**
   The roster is compared as a set, so an *added* hook fails too — deliberately, to keep
   the roster a conscious decision.
3. **A new doctrine file is silently ignored.** `MODE_PARTS`, `CONSTITUTION` and `THEMES`
   in `hooks/inject-doctrine.mjs:72-83` name every file that gets injected. Dropping a
   file into `doctrine/` therefore does nothing, and nothing says so. **Still open** — and
   note that defect 1 was the same class: a mechanism that stays silent instead of
   failing.
4. ~~**The command tables are already drifting** — `qa` is in `README.md`, missing in
   `CLAUDE.md`.~~ — **fixed** in the same PR that added this map. No test guards the
   tables against the next drift.
5. ~~**`docs/rules-howto.md` dates from January 2025** and describes a mechanism the
   plugin deliberately no longer uses.~~ — **fixed.** The single part still in force —
   how the plugin delivers always-on behavior — moved verbatim into
   `docs/architecture.md`, which also took the file's place as the third doctrine
   summary in `repo-hygiene.test.mjs`. The remaining 431 lines documented
   `.claude/rules/` mechanics the plugin never used and were deleted rather than
   re-verified.

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

- *Scriptable*: injection size and composition of the whole doctrine — pipe a
  SessionStart hook JSON into `hooks/inject-doctrine.mjs` and read the
  `additionalContext` back. Needs no state to reproduce; the constitution carries no
  switch, so only the two theme blocks depend on the config directory at all.
- *Not scriptable*: the reach measurement needs real agents. The setup is in section 1
  and **must include the negative control** — without it, a self-report is worthless.
- *Single-process only*: the compaction measurement in section 2 breaks silently across
  processes. `claude -p --resume` fires `SessionStart` with `source: "resume"` and thereby
  re-injects the doctrine, so any multi-process variant measures the opposite of the
  question. Only a single process driven through `--input-format stream-json`, in which
  compaction and check turns share one context, answers it. This wrecked the first attempt
  and is as mandatory to a repetition as the negative control.
- *Producing that control*: copy the plugin directory and **delete the doctrine files
  you want absent** from the copy, then run `claude --plugin-dir <copy>`. Since the
  unification there is one hook entry for everything, so dropping it from
  `hooks/hooks.json` now removes the entire doctrine — usable as an all-or-nothing
  control, but too coarse to isolate one block. Deleting individual files is the finer
  instrument and works because an unreadable file drops its own block and leaves the
  rest standing (**MEASURED** 2026-08-03, against `hooks/inject-doctrine.mjs`: full
  8751 bytes; without `constitution/orchestrator.md` 7793 bytes with base, delegation
  rules and both themes intact; without both constitution mode files 5015 bytes with
  base and themes intact — UTF-8 bytes of `additionalContext`, not characters: the
  doctrine holds multi-byte punctuation, so the two differ). There is
  deliberately **no switch** for this — a config key
  or an environment variable would be an opt-out through the back door, and not being
  switchable is the guarantee 0.31.4 makes. Every measurement this map rests on used a
  throwaway plugin in an empty directory rather than the installation, so this is the
  established path, not a workaround.

**The `ASSUMED` rows** from section 5 are the actual backlog. Lifting an assumption from
`ASSUMED` to `MEASURED` requires a setup someone else can rerun, written down where the
claim stands — not a memory of a measurement. Where that write-up lives is secondary;
that it is reachable from the claim is not.

---

## Related documents

- `docs/plugin-howto.md` — developer reference. Where it describes a mechanism cleanly,
  this map points there instead of duplicating.
- Issues **#105** (reach), **#107** (portability of the operational knowledge),
  **#108** (doctrine structure) — the three open items that follow from this map.
