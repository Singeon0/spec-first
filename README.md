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
what can run at the same time and fans it out through the Workflow tool,
picking each sub-agent's model per job — Haiku medium/high for wide cheap
sweeps (aggregated by one Opus), Opus medium for real work, Opus high and
xhigh for critics and hard problems. Never Opus max, never Fable.

Every result is judged the same way:

| Role | Model |
|---|---|
| Developer, one per group of criteria touching the same files | Opus medium → high → xhigh after each rejection |
| Critics: tester, owner's advocate, maintainer, blind to each other | Opus, one tier above the developer (high, then xhigh) |
| Fusion of groups developed in parallel (isolated git worktrees) | Opus high |
| Final check of every criterion on the integrated result | Opus, one tier above the highest developer effort |

A criterion passes only when the tester verified it on the real result
and no critic proved a defect. Three rejected rounds on a criterion stop
the run and go back to the owner.

The plugin ships a ready-made workflow, `spec-first:run`
(`workflows/run.js`), that does all of it for a spec: groups run at once
in isolated copies, then are merged. When isolated copies cannot work
(`parallel: false`, or a developer finds its copy unusable), groups run
one after the other in the project itself. The orchestrator may wrap it
in workflows of its own.

## The end

A spec ends. Once the criteria pass, an Opus sub-agent cleans the
repository: merged branches of the work, leftover worktrees and temporary
files, and whatever the merged change made useless (one local commit,
tests re-run). Remote branches, unmerged branches and anything else that
cannot be undone wait for the owner's yes. The last reply says the spec is
done and stops — no next steps. What the work revealed beyond the spec
(a task wider than planned, a neighbouring problem) is written as a draft
second spec, to launch in a new conversation; the run never grows to
cover it.

`scripts/keep-waiting.sh` keeps the main agent's turn open while a
workflow runs in the background, so a wait never ends the run.
