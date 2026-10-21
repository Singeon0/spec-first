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
high for every critic of the run and the fusion, Opus xhigh for every critic of the final check and the publication tester, high then xhigh for a developer after
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
criterion is relaunched from the effort it reached — every criterion to
relaunch together, in one run, one group each; failing again, it goes back
to the owner — but only once everything else is done. A technical block
(remote CI unavailable, a machine down, a fusion that failed, an agent
that never answered) is never relaunched as is and never turned into a
question: the owner gets its cause and the one action that lifts it.

The plugin ships a ready-made workflow, `spec-first:run`
(`workflows/run.js`), that does all of it for a spec, and every run goes
through it. The orchestrator may wrap the workflow in workflows of its
own (research before the developers start, for instance); when the
Workflow tool is missing or fails, it falls back to plain sub-agents.
Either way the rules stay the same: models, efforts, the three critics,
the final check. When the workflow returns `{error}`, the orchestrator
first fixes the arguments it names and relaunches it. The owner's
« accélère », « reprends » or « relance » become arguments of the same
workflow (more groups at once, a resume, the criteria left).

The run first makes an integration copy of the project; then groups run
at once (one per criterion when none are given), each developer in its
own copy (`.spec-first/copies/<spec>--…`, hidden from git locally), made
from the integration branch, never in the project itself. Groups may
touch the same files: the fusion resolves conflicts. Each group's copy is
removed as soon as it is merged; the integration copy holds the result
until the orchestrator squashes it into the project, then the clean-up
removes it, along with any orphan copy of the same spec. Work that could
not be merged stays on its branch and waits for the owner's yes. The run
starts from a clean git repository: the owner never commits by hand —
work in progress is committed by Claude, with his go, before launching.
Every agent gets its own ports, the same ones when the run is resumed.

Its arguments, and when the orchestrator passes them:

| Argument | When |
|---|---|
| `groups` | criteria that can't be checked apart share a group (three at most); omitted → one group per criterion |
| `testCommand` | the full suite, run only in the final check, once |
| `quickTestCommand` | whenever the full suite takes minutes: developers, critics and fusions run this fast subset |
| `setupCommand` | when a fresh copy needs dependencies, local config or the commit hooks' environment to run |
| `subdir` | in a monorepo: the project's folder; copies are made at the repository top, setup and tests run from it |
| `maxGroups` | groups active at once, three by default: lower on a small machine, higher when the owner asks to speed up |
| `dependsOn` | a criterion builds on another of the same run: its group starts once the other is merged |
| `exclusive` | a resource two criteria would use at once (a GPU machine, a device, a fixed port), with the criteria that need it: the run lends it to one agent at a time |
| `publish` | the external actions the owner's go authorized, and the criteria they make true |
| `budget` | when the owner set a token limit: the run stops cleanly before it |
| `finalCheck: false` | run 1 of a two-run spec (« socle ») |
| `recheck` | criteria an earlier run validated, judged again in the final check; with `criteria: []`, the final check alone — how a « non vérifié » criterion is judged again |
| `startEffort` | a relaunched criterion resumes from the effort it reached |
| `specBaseCommit` | every later run of a spec (run 2 of a socle, a relaunch): the final security and maintainer read the whole spec's changes |
| `integrationBranch` | resuming an interrupted run whose run id is lost: the new run starts from the branch it left |

Criteria the others build on (« socle ») run first, in a run of their
own; a second run builds on them and its final check judges every
criterion of the spec. Two runs never overlap on the same repository: a
socle criterion to take again goes into the next run, in its own copy
like any other. Several repositories → one run each: independent ones
are launched together, a dependent one once the upstream publication is
done, all under the same `/goal` line. A run interrupted (stopped,
session closed, context compacted) is resumed with the Workflow tool's
`resumeFromRunId` and the same arguments — finished agents come back
from cache — or, failing that, with `integrationBranch`. The
orchestrator checks a long run once an hour: an agent stuck since the
last check → the workflow is stopped and resumed the same way.

Before the go, Claude checks every access the run needs (registry, ssh,
tokens, remote CI runners) and lists, in one line, every external action
the run will take: publish a version, push a branch — including the early
push that starts the CI during the run —, open and merge a merge request,
tag. The owner's go authorizes those actions, and only those (`publish`).
Merging, tagging and publishing run after the final check, once every
other criterion is validated; a fresh tester checks them from outside.
When they go through a remote CI, its pipeline starts as soon as the
first group they depend on is merged, and its result counts in the final
check.

A criterion held back only because criteria it depends on did not pass
comes back « en attente des dépendances »: not a failure of its own, not
a technical block. It is relaunched as is in the next relaunch, together
with those criteria. A publication criterion is one case of this rule —
it depends on every other criterion — and comes back with the same
`publish`.

## The end

A spec ends. Once the criteria pass, the result is committed locally
(« spec : <nom> »), then an Opus sub-agent cleans the repository in a
second local commit (« nettoyage : <nom> », tests re-run): the
integration copy once squashed, any orphan copy or branch of the same
spec (left by an interrupted run), the run's logs, temporary files, and
whatever the merged change made useless. Nothing is pushed beyond the actions the
go authorized; when the publication merged the result on the remote, the
local branch is brought to it instead of squashed. Copies that were never
merged, any `spec-first-*` copy or branch of another spec, remote
branches and anything else that cannot be undone wait for the owner's
yes. The last
reply says the spec is done and stops — no next steps. What the work
revealed beyond the spec (a task wider than planned, a neighbouring
problem) is written as a draft second spec, to launch in a new
conversation; the run never grows to cover it.

While a workflow runs in the background, the main agent ends its turn on a
one-line status and never polls; the workflow's completion notification
resumes the run, so the owner never has to type « continue ».
