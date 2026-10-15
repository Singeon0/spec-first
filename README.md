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

The skill calls the plugin's workflow `spec-first:run`
(`workflows/run.js`). Each role runs on the cheapest model that does it
well:

| Role | Model |
|---|---|
| Scout: files per criterion, repo state, test command | Haiku medium |
| Developer, one per group of criteria touching the same files | Opus medium → high → xhigh after each rejection |
| Critics: tester, owner's advocate, maintainer, blind to each other | Opus xhigh |
| Fusion of groups developed in parallel (isolated git worktrees) | Opus high |
| Final check of every criterion on the integrated result | Opus xhigh |

A criterion passes only when the tester verified it on the real result
and no critic proved a defect. Three rejected rounds on a criterion stop
the run and go back to the owner. Groups run in parallel only on a clean
git repository the session runs in; otherwise one after the other in the
project itself.

`scripts/keep-waiting.sh` keeps the main agent's turn open while the
workflow runs in the background, so a wait never ends the run.
