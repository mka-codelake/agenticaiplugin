# Solo Review — Focus Checklist

Used only on the **solo path** (`SKILL.md` → "Solo Review"): you have no `Workflow` tool, you
are a sub-agent or fork, and you review **inline without spawning anything**.

Pick the row that matches the character of the change, read those rule sets from
`specialists/`, and check the diff against them. Rule detail lives in the specialist files —
do not expect it here. Mixed changes: take the union, but stay at 5 rule sets maximum;
prefer the ones covering the riskiest part of the diff.

| Change character | Read these rule sets | Focus questions |
|---|---|---|
| **Core logic** (parsers, services, concurrency, state) | `06a-correctness-bug-detection.md`, `02-security-data-safety.md`, `08-cross-cutting-concerns.md`, `05-solid-code-smells.md` | Does the changed path behave correctly for empty/boundary/error input? Does any caller's behavior change silently? Does a write path cross a thread/transaction boundary and become an unobservable no-op? |
| **UI / templates** | `02-security-data-safety.md`, `06b-code-style-size.md`, `07-dead-code-duplication.md`, `11-documentation-comments.md` | Is user-controlled data escaped at every output point? Is state/logic leaking into the template instead of the layer below? Are markup blocks copy-pasted rather than extracted? |
| **Infrastructure** (Docker, CI, config) | `01-dependencies-versions.md`, `02-security-data-safety.md`, `08-cross-cutting-concerns.md` | Are secrets, tokens, or credentials in files, args, or env defaults? Are image/action/dependency versions pinned and current? Does a failure in the new step fail loudly or pass silently? |
| **Scaffold / project setup** | `01-dependencies-versions.md`, `03-architecture-layers.md`, `11-documentation-comments.md` | Is every added dependency actually used and at its current stable version? Does the directory layout match the project's existing structure? Does the entry documentation describe what was actually generated? |
| **Docs only** | — | No review needed. Report: "No code review needed — documentation/config changes only." |

Severity comes from `shared/issue-classification.md` — read it before classifying.
Project files override these rules: `.claude/guidelines/*.md`, `.claude/adrs/*.md`.
