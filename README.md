# spec-first

Claude Code plugin/skill: spec-first workflow.

The project owner sets intent and acceptance criteria; Claude owns the
implementation end-to-end. After the owner's go on the spec, the main
agent orchestrates one autonomous run until the criteria pass, without
stopping to ask. Short plain replies, verdict first; the
owner's decisions outrank code; settled points stay settled.

## Install

```
/plugin marketplace add Singeon0/spec-first
/plugin install spec-first@spec-first
```

## Usage

Invoke with `/spec-first` in a session; it stays active until you say to
stop.

## The run

During the run the main agent is an orchestrator: it cuts the work into
what can run at the same time and fans it out through the Workflow tool.
Every sub-agent is Opus, medium at least: Opus medium for real work, Opus
high for every critic of the run and the fusion, Opus xhigh for every critic of the final check, high then xhigh for a developer after
each rejection. Never Sonnet, Haiku or Fable, never Opus max.

Criteria are cut fine — one observable behaviour each — so that more of
them run at once. Every result of a run is judged the same way (a
one-sentence spec for a small reversible task gets one developer and one
tester instead):

| Role | Model |
|---|---|
| Developer, one per criterion (two share one only when one can't be checked without the other) | Opus medium → high → xhigh after each rejection |
| Critics: tester, owner's advocate, maintainer, blind to each other; after a rejection only those that did not pass judge again | Opus high |
| Fusion, group by group as soon as each is done, into one integration branch that later rework starts from | Opus high |
| Final check of every criterion on the whole result: one tester per three criteria, owner's advocate, maintainer, security, and an integrator when parts were combined | Opus xhigh |
| Repair, if the final check finds a criterion broken — only the critics that did not pass it judge again | Opus medium → high → xhigh |

After a rejection the developer first sorts the cause: a slip is fixed at
the root, an approach that can't satisfy the criterion is replaced, never
patched twice. A criterion passes only when the tester verified it on the
real result and no critic proved a defect. Three rejected rounds → the
criterion is relaunched alone from the effort it reached; failing again,
it goes back to the owner — but only once everything else is done.

The plugin ships a ready-made workflow, `spec-first:run`
(`workflows/run.js`), that does all of it for a spec: groups run at once,
each developer in its own copy of the project (`.spec-first/copies/`,
hidden from git locally) made from the commit the run starts from, on any
branch. Groups may touch the same files: the fusion resolves conflicts.
The result lands on an integration branch that the orchestrator squashes
into the project. Criteria the others build on (« socle ») run first, in a
run of their own; a second run builds on them and its final check judges
every criterion of the spec. The `/goal` line given at launch covers both
runs. The copies stay until the end of the spec. The run starts from a
clean git repository: the owner never commits by hand — work in progress
is committed by Claude, with his go, before launching; there is no
sequential mode. A `setupCommand` makes each copy runnable (dependencies,
local config), and every agent gets its own ports. The orchestrator may
wrap the workflow in workflows of its own.

## The end

A spec ends. Once the criteria pass, the result is committed locally
(« spec : <nom> »), then an Opus sub-agent cleans the repository in a
second local commit (« nettoyage : <nom> », tests re-run): this run's
merged copies (worktrees and branches), temporary files, and whatever
the merged change made useless. Nothing is pushed. Copies that were never
merged, any other `spec-first-*` copy or branch, remote branches and
anything else that cannot be undone wait for the owner's yes. The last
reply says the spec is done and stops — no next steps. What the work
revealed beyond the spec (a task wider than planned, a neighbouring
problem) is written as a draft second spec, to launch in a new
conversation; the run never grows to cover it.

While a workflow runs in the background, the main agent ends its turn on a
one-line status and never polls; the workflow's completion notification
resumes the run, so the owner never has to type « continue ».
