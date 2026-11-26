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
what can run at the same time, keeps anything from running twice, and fans
it out through the Workflow tool. There is one profile: every sub-agent is
Opus, effort high at least — high for developers on their first round, the
fusion, the helpers and the socle's tester; xhigh for a developer after a
rejection, and for the reviewers, live testers and repair of the review.
Never Sonnet, Haiku or Fable, never Opus max: speed never comes from a
cheaper model. The orchestrator never writes its own copy of a workflow:
what it would change is an argument.

Criteria are cut fine — one observable behaviour each. A run (a
one-sentence spec for a small reversible task gets one developer and one
tester instead):

| Role | Model |
|---|---|
| Inventory, always first: checks the suite command, records the test commands in it, makes or finds the spec's integration branch and lists the criteria already merged on it, which the run skips | Opus high |
| Developer, one per criterion (two share one only when one can't be checked without the other): his own check stands — the command he ran and its decisive output; he runs only the tests of what he touches | Opus high → xhigh after a rejection or a failed check |
| Tester of the socle, only for a group at least two others build on, before its fusion | Opus high |
| Fusion, group by group as soon as each is done, into one integration branch that later rework starts from; only the tests of the files changed on both sides | Opus high |
| Quick suite, once, at the end of the run, on the merged result | Opus high |
| Repair, if the quick suite is red — twice at most | Opus xhigh |

A run's criteria come back « non vérifié »: only their developer checked
them. The review judges every one of them.

### One command for every test suite

`scripts/suite` is copied by the orchestrator to
`<project>/.spec-first/bin/suite` before each workflow. Every whole suite —
the quick one, the full one, a criterion's own slow suite (`heavy`) — goes
through it: `suite quick|full|heavy:<id>`. Its ledger is keyed by the git
tree: a result already obtained on the same tree is read, a suite already
running is joined, a failure is never kept as a pass, a copy with
uncommitted files is refused. No agent runs a whole suite by hand, so the
same suite never runs twice on one tree.

### Resuming

Developer commits carry `Spec-First-Criterion: <id>`; the fusion alone
writes `Spec-First-Validated: <ids>` on the integration branch
(`spec-first-<spec>--integration`). A run that was interrupted (stopped,
session closed, context compacted, a usage limit) is simply launched again
with the same arguments: its inventory reads those trailers and skips what
is merged. It never relies on the Workflow cache.

## The review

Once every criterion is developed and merged, a second workflow,
`spec-first:review` (`workflows/review.js`), judges the whole spec once:

| Role | Model |
|---|---|
| Preparation: checks the suite command, records the test commands, makes the review copy when none is given | Opus high |
| Six reviewers, one angle each — owner's advocate, reliability, security, performance, integration and maintenance, usage — each reading the whole spec and every commit of it | Opus xhigh |
| Live testers, one per slice of about eight criteria — two at least, six at most —, all at the same time: each starts its own instance of the real result on its own ports and drives it with Chrome DevTools in its own isolated browser context, along user journeys that cover every criterion | Opus xhigh |
| Suite agent: the full suite once while the panel works, and again after each repair (free when the tree did not change) | Opus high |
| Merging duplicate findings | Opus high |
| The reviewers' unproven leads, tried live in parallel, each by the tester of its slice | Opus xhigh |
| One developer repairs every proven blocking or major defect, in one batch; the reviewer that raised each one re-judges it, the testers of the slices the repair touches replay theirs (replay scripts first, live where one fails or where the repair reaches), the other slices replay their scripts — three rounds at most | Opus xhigh |

A browser is never an exclusive resource: each tester has its own window.
Minor defects are reported in one line, never proven, never repaired. A criterion the review still
rejects goes back to a development run (`rejectedBy` from the review's
`relaunch`: the proof goes to its developer), then to the review with `focus`: only the reviewers that
rejected it judge again, with a live replay — never the full panel twice.
The review also starts the remote CI and, once it passes, applies the
external actions the owner authorized; a commit the remote already has is
never pushed again, and nothing local runs again after an external wait.
The two workflows are separate on purpose: either can run without the other.

After a rejection the developer first sorts the cause: a slip is fixed at
the root, an approach that can't satisfy the criterion is replaced, never
patched twice, a fault of the environment (a config file, a setting) is
fixed there without touching the code. A criterion passes only when a live
tester of the review verified it on the real result and no reviewer proved
a defect. Three rejected rounds → the
criterion is relaunched from the effort it reached — every criterion to
relaunch together, in one run, with the same arguments; failing again, it goes back
to the owner — but only once everything else is done. A technical block
(remote CI unavailable, a machine down, a fusion that failed, an agent
that never answered) is never relaunched as is and never turned into a
question: the owner gets its cause and the one action that lifts it.

Every run goes through `spec-first:run` (`workflows/run.js`). The
orchestrator may wrap the workflow in workflows of its
own (research before the developers start, for instance); when the
Workflow tool is missing or fails, it falls back to plain sub-agents.
Either way the rules stay the same: models, efforts, the suite command,
the review. When the workflow returns `{error}`, the orchestrator
first fixes the arguments it names and relaunches it. The owner's
« accélère » is answered from the measured time report, never by a cheaper
model or more groups by reflex; « reprends » and « relance » are the same
arguments again.

The run first makes or finds the integration copy of the project; then groups run
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
Every agent gets its own ports, the same ones when the run is launched again.

Its arguments, and when the orchestrator passes them:

| Argument | When |
|---|---|
| `specBrief` | always, to the run and the review: the spec's goal, out-of-scope list and « Limites », word for word — the agents then never open the spec file |
| `groups` | criteria that can't be checked apart share a group (three at most); omitted → one group per criterion |
| `quickTestCommand` | whenever the project has tests: the fast subset, run once at the end of the run on the merged result — never by a developer or a fusion |
| `testCommand` | the full suite: recorded by the run, run by the review |
| `heavy` | a criterion whose own check is a slow suite: its developer runs it once, at his last commit; the others read the ledger |
| `setupCommand` | when a fresh copy needs dependencies, local config or what the commit hooks need to run (never a hook installer); it must leave the copy clean |
| `subdir` | in a monorepo: the project's folder; copies are made at the repository top, setup and tests run from it |
| `maxGroups` | groups active at once, three by default: lower on a small machine, higher only when groups ready to start wait for a slot |
| `dependsOn` | the dependency graph of the spec: a group starts as soon as what it builds on is merged, without holding a slot while it waits — one run for the whole spec; a group at least two others build on is the socle |
| `exclusive` | a resource two criteria would use at once (a GPU machine, a device, a fixed port), with the criteria that need it: the run lends it to one agent at a time — never a browser |
| `publish` | the criteria the publication makes true: prepared in the run, published by the review |
| `budget` | when the owner set a token limit: the run stops cleanly before it — as it does after three agents in a row die (a usage limit, an API outage); its `resume` says how to go on: the same arguments again |
| `recheck` | only after the work was committed into the project between two runs: the criteria already developed, not developed again |
| `startEffort` | a relaunched criterion resumes from the effort it reached |
| `envRepair` | a criterion broken by its environment or configuration: a targeted repair |
| `rejectedBy` | a criterion relaunched after « en échec » or after the review: `{ proof }` goes to its developer on his first round |
| `integrationBranch` | only to go on from another branch than the spec's own |

`profil`, `simples` and `finalCheck` are accepted and ignored.

The review's own arguments: `baseCommit` (the spec's first commit), every
criterion, `workspace` and `branch` (the run's integration copy),
`testCommand`, `heavy`, `journeys` (the testers' slices, when the order of
the criteria does not follow the user's journeys), `publish`, `focus`,
`waitRound`.

### Before the go, and before each launch

The go request shows the plan of the run in a line or two: how many
criteria, in how many levels of the dependency graph, the longest chain,
how many are developed at once, and a duration — estimated, or drawn from
the project's last time report. A dependency that is only a contract (a
format, a route, a schema) is moved into the socle as an observable
criterion, to keep the graph at three or four levels. Before each launch
the orchestrator installs the suite command, times the quick suite, checks
that a fresh copy is clean after its setup, that no variable of its own
shell overrides the project's configuration, and that `exclusive` does not
put the run in single file.

### The time report

`scripts/bilan.py` (Python standard library) reads the transcripts of a
workflow and reports where the time went: per phase and per agent (time in
commands, time thinking, time waiting), how many agents really worked at
once, every whole-suite run and its minutes, the critical path. The
orchestrator runs it after every run and every review; three plain lines
go to the owner, the detail to `.spec-first/bilans/`.

```
python3 scripts/bilan.py <session-dir> <wf-id> [--project <root>] [--spec <specId>] [--out <file>]
```

Criteria the others build on (« socle ») are drawn as a dependency graph
when the spec is shaped, and the whole spec goes in one run: independent
criteria start at once, dependent ones as soon as what they build on is
merged — one integration copy, one review. Two runs never overlap
on the same repository. Several repositories → one run each: independent ones
are launched together, a dependent one once the upstream publication is
done, all under the same `/goal` line. The
orchestrator checks a long run once an hour: an agent stuck since the
last check → the workflow is stopped and launched again the same way,
after one line saying what is redone.

Before the go, Claude checks each criterion against the owner's limits
(his recorded decisions, CLAUDE.md, « ne touche pas à X ») on every
branch, file and source it reaches: a criterion that can't be met without
crossing one is settled with him before the launch, and his exact words,
exceptions included, go in the spec's « Limites ». It also checks every
access the run needs (registry, ssh, tokens, protected branches, remote CI
runners) and lists, in one line, every external action
the run will take: publish a version, push a branch — including the early
push that starts the CI during the run —, open and merge a merge request,
tag. The owner's go authorizes those actions, and only those (`publish`).
Merging, tagging and publishing run at the end of the review, once it
passes; a fresh tester checks them from outside. When they go through a
remote CI, its pipeline starts with the review and its failures join the
review's repair. No agent ever waits for something outside the machine (a
pipeline, a registry, a human review, a deployment): the review stops cleanly
with what it waits for, where to look and the command that tells it is
done; Claude watches it outside and resumes the review where it
stopped. Each time a workflow returns, Claude writes its readable state
(step, criteria, waits) to `.spec-first/copies/<spec>--etat.md`.

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
spec (left by an interrupted run), the run's logs and state file, the suite ledger, temporary files, and
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

## Tests

```
node --test tests/*.test.mjs
```

They run the workflows with a fake `agent` and a `parallel` that, like the
Workflow runtime, hands back copies of the jobs' results. `run-prompts` and
`prompt-size` replay the arguments of real runs (`tests/fixtures/`) and check the
rules sent to the agents, and that the prompts are no bigger than the baseline
(`tests/fixtures/baseline-1.10.0.json`).

```
node tests/measure.mjs run tests/fixtures/run-qualispectra-sprint6.json
node tests/measure.mjs review tests/fixtures/review-qualispectra-sprint6.json
```

print the number of agents and the size of their prompts, per phase.
`suite.test.mjs` plays the suite command on a throwaway git repository;
`bilan.test.mjs` plays the time report on a synthetic session folder.
