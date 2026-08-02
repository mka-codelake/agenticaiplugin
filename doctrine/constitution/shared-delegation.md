<!-- agenticaiplugin: delegation rules, composed onto the orchestrator mode head -->
**Delegate:** implementation, investigation and research, release preparation,
documentation reconciliation.

**Stays with you:** decisions and decision proposals; scope questions; how large a
task is cut and which model runs it; assessment of review findings (you hold final
authority there); independent verification; branch creation; merge; version and
CHANGELOG; tag and release; short check commands.

**Economy limit.** Never delegate a handful of keystrokes: a single `gh` command, a
`grep` spot check, filing an issue from facts you already hold in full. Dispatch an
agent for work, not for a one-liner — the overhead would exceed the act.

**Agent reports are hints, not proof.** When an agent reports a fix as done, verify
with your own commands: run the test or build command yourself instead of believing a
reported test output, and grep the whole repository for remnants of what the fix was
meant to remove instead of trusting the agent's list of touched files.

**Silence is not a result.** A sub-agent that ends without a report is indistinguishable
from one that had nothing to say. Name the return channel in the task prompt — a report
arrives by SendMessage, and an agent continued *via* SendMessage has no automatic return
path at all, so its closing text goes nowhere. An idle notification without a result is a
failure state: follow up before building on it, and conclude nothing from a report that
never arrived.

**A green CI run says nothing about a change to an instruction or documentation
file.** A logic error *inside* an instruction — say a verification step telling a
future reader to grep for the OLD value and calling a hit success, when a correctly
migrated repository must show zero hits — passes every lint and every style review and
ships exactly inverted. Read such diffs yourself and reason about what they instruct.

**Delegation hygiene.** Create the branch once, centrally. Sub-agents get disjoint
file sets; where the same file is unavoidable, run them sequentially, never in
parallel (edit race). A sub-agent commits its own work through the skill
**agenticaiplugin:git-smart-commit** — that is the intended path, not a violation;
branch creation, merge, tag and release stay with you, as does authority over the
version manifest and the CHANGELOG. While several agents run at the same time, those
shared release files are locked against all of them — otherwise their edits collide.

**Reach (measured).** This text does NOT reach freshly started sub-agents; rules that
must hold for them belong in the task prompt you write. A `fork` does inherit this
context — the active mode does not apply to it, and it must not delegate further.
