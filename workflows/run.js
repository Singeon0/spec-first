export const meta = {
  name: 'run',
  description: 'spec-first autonomous run: small groups of criteria, a few at a time, each developed in its own copy; three Opus high critics per round, and after a rejection only the critics that did not pass re-judge; developer effort escalation with triage; each validated group merged at once into an integration branch that later groups and rework start from, its copy then removed; reinforced final check of every criterion, repaired by one developer; then, only if the owner authorized it with his go, the external actions he listed (push, merge request, CI, merge, tag, release), checked from outside',
  whenToUse: 'Called by the spec-first skill after the owner gave his go on a spec. args: { specPath, projectRoot, baseCommit, criteria: [{ id, text }], groups?: [[ids]], testCommand?, quickTestCommand?, setupCommand?, subdir?, finalCheck?: boolean, recheck?: [{ id, text }], startEffort?: { [id]: "medium"|"high"|"xhigh" }, specBaseCommit?, integrationBranch?, maxGroups?: number, exclusive?: [string], publish?: { actions: string, criteria: [ids] }, budget?: number } with absolute paths. baseCommit is required: `git rev-parse HEAD` in projectRoot right before the call. Each group works in its own git worktree under <projectRoot>/.spec-first/copies, named after the spec; at most maxGroups groups (default 3) are active at once, the others wait; groups omitted → one group per criterion. Every validated group is merged into one integration branch, which the skill squashes into the project at the end. testCommand: the full test suite, run once in the final check; quickTestCommand: the targeted tests used during the run. setupCommand: makes a fresh copy runnable, commit hooks included; subdir: the sub-folder of projectRoot where setup and tests run. finalCheck: false skips the final check (first run of a two-run spec); recheck: criteria an earlier run of the same spec validated, judged again in the final check; criteria empty with recheck → final check only. startEffort: the effort a relaunched criterion resumes from. specBaseCommit: the commit the whole spec started from (two-run spec), read by the final security and maintainer critics. integrationBranch: the integration branch of an interrupted run to start from (its criteria go in recheck). exclusive: resources only one agent may use at a time. publish: the external actions the owner authorized with his go and the criteria they make true, applied after the final check. budget: output tokens; the run stops cleanly before it. Not for a bare slash-command call without args: tell the user to run /spec-first instead.',
  phases: [
    { title: 'Développement', detail: 'opus, one developer per group, a few groups at a time; medium, then high, then xhigh after each rejection, sorting each rejection first: a slip to fix or an approach to change' },
    { title: 'Critique', detail: 'opus high: tester, owner and maintainer judge each criterion blind to each other; after a rejection, only the critics that did not pass judge again' },
    { title: 'Fusion', detail: 'opus high: each group with a passing criterion is merged into the integration branch as soon as it is done, one at a time, then its copy is removed; later groups and rework start from it' },
    { title: 'Contrôle final', detail: 'opus xhigh: testers by three criteria, owner, maintainer, security (and integrator when parts were combined) re-check every criterion on the whole result; one developer repairs what broke, re-judged by the critics that did not pass it' },
    { title: 'Publication', detail: 'only with the owner\'s authorization: opus medium, then high, then xhigh, applies exactly the external actions he listed; an opus xhigh tester checks each publication criterion from outside' },
  ],
}

// ---------------------------------------------------------------- models
// Opus only, medium at least. Opus max is never used here: it is the owner's call.
const DEV_EFFORTS = ['medium', 'high', 'xhigh'] // one tier up after each rejection
const CRITIC = { model: 'opus', effort: 'high' } // every critic during the run
const FINAL_CRITIC = { model: 'opus', effort: 'xhigh' } // every critic of the final check and of the publication
const FUSION = { model: 'opus', effort: 'high' }
const HELPER = { model: 'opus', effort: 'medium' } // plumbing: the remote CI, tidying the copies
const TESTER_SHARE = 3 // criteria per tester in the final check
const CI_WAIT_MIN = 60 // longest wait for one remote pipeline, in minutes

// ---------------------------------------------------------------- args
let input = args
if (typeof input === 'string') {
  try { input = JSON.parse(input) } catch (e) { input = null }
}
const HASH = /^[0-9a-f]{7,64}$/i
const NAME = /^[A-Za-z0-9._/-]+$/
if (!input || typeof input !== 'object' || !input.specPath || !input.projectRoot || (input.criteria != null && !Array.isArray(input.criteria))) {
  return { error: 'Missing args. Expected { specPath, projectRoot, baseCommit, criteria: [{ id, text }] } with absolute paths (criteria may be empty only with recheck).' }
}
// The commit the run starts from: the skill passes `git rev-parse HEAD`, taken right before launch.
if (!HASH.test(String(input.baseCommit || ''))) {
  return { error: 'args.baseCommit is required: the commit hash `git rev-parse HEAD` prints in projectRoot right before the call.' }
}
const SPEC = String(input.specPath)
const ROOT = String(input.projectRoot).replace(/\/+$/, '')
const BASE = String(input.baseCommit)
const normalize = cs => cs.map((c, i) =>
  typeof c === 'string' ? { id: String(i + 1), text: c } : { id: String(c && c.id != null ? c.id : i + 1), text: String((c && c.text) || '') })
const CRITERIA = normalize(input.criteria || [])
const critIds = CRITERIA.map(c => c.id)
const dupIds = critIds.filter((id, i) => critIds.indexOf(id) !== i)
if (dupIds.length) return { error: `Criterion ids must be unique. Repeated: ${[...new Set(dupIds)].join(', ')}.` }

// Criteria an earlier run of this spec validated: not developed here, judged again in the final check.
if (input.recheck != null && (!Array.isArray(input.recheck) || input.recheck.some(c => !c || typeof c !== 'object' || c.id == null))) {
  return { error: 'args.recheck must be an array of { id, text }.' }
}
const RECHECK = []
for (const c of normalize(input.recheck || [])) {
  if (critIds.includes(c.id)) log(`Critère ${c.id} retiré de recheck : il est développé dans ce run.`)
  else if (RECHECK.some(r => r.id === c.id)) log(`Critère ${c.id} répété dans recheck : gardé une fois.`)
  else RECHECK.push({ ...c, earlierRun: true })
}
if (!CRITERIA.length && !RECHECK.length) return { error: 'Nothing to run: criteria is empty and recheck lists nothing.' }
const ALL = [...CRITERIA, ...RECHECK]
const byId = Object.fromEntries(ALL.map(c => [c.id, c]))

// The external actions the owner authorized with his go (decision A), applied after the final check.
let PUBLISH = null
if (input.publish != null) {
  const p = input.publish
  const ids = p && typeof p === 'object' && Array.isArray(p.criteria) ? p.criteria.map(String) : []
  if (!p || typeof p !== 'object' || !String(p.actions || '').trim() || !ids.length || ids.some(id => !byId[id])) {
    return { error: 'args.publish must be { actions: "the external actions the owner authorized, in plain words", criteria: [ids of criteria of this run or of recheck that the publication makes true] }.' }
  }
  PUBLISH = { actions: String(p.actions).trim(), ids: [...new Set(ids)] }
}
const isPub = id => !!PUBLISH && PUBLISH.ids.includes(String(id))

let FINAL = input.finalCheck !== false
if (!FINAL && (RECHECK.length || PUBLISH)) {
  FINAL = true
  log(`Contrôle final maintenu : ${RECHECK.length ? 'des critères sont à rejuger' : 'la publication en a besoin'}.`)
}

const testCommand = String(input.testCommand || '') // the full suite: once, in the final check
const quickTestCommand = String(input.quickTestCommand || '') // targeted tests, during the run
// What makes a fresh copy runnable (dependencies, files git ignores, commit hooks).
const setupCommand = String(input.setupCommand || '')
const SUBDIR_IN = String(input.subdir || '')
if (SUBDIR_IN && (SUBDIR_IN.startsWith('/') || SUBDIR_IN.split('/').includes('..') || !NAME.test(SUBDIR_IN))) {
  return { error: 'args.subdir must be a folder relative to projectRoot (letters, digits, . _ - /, no ..).' }
}
const SUBDIR = SUBDIR_IN.replace(/^(\.\/)+/, '').replace(/\/+$/, '')
const inSub = tree => SUBDIR ? `${tree}/${SUBDIR}` : tree

// The commit the whole spec started from (two-run spec): the final security and maintainer read from it.
let SPEC_BASE = ''
if (input.specBaseCommit != null && input.specBaseCommit !== '') {
  if (HASH.test(String(input.specBaseCommit))) SPEC_BASE = String(input.specBaseCommit)
  else log('specBaseCommit ignoré : ce n\'est pas un hash de commit.')
}
// An interrupted run's integration branch: copies start from it, its copy holds the result.
const IB = String(input.integrationBranch || '')
if (IB && (!NAME.test(IB) || IB.startsWith('-'))) return { error: 'args.integrationBranch must be a branch name (letters, digits, . _ - /).' }
const FROM = IB || BASE

let MAX_GROUPS = 3 // groups active at once (developing or judged); the others wait their turn
if (input.maxGroups != null) {
  const n = Math.floor(Number(input.maxGroups))
  if (n >= 1) MAX_GROUPS = n
  else log(`maxGroups ignoré (« ${input.maxGroups} ») : 3 groupes à la fois.`)
}
const EXCLUSIVE = Array.isArray(input.exclusive) ? [...new Set(input.exclusive.map(s => String(s).trim()).filter(Boolean))] : []
if (input.exclusive != null && !Array.isArray(input.exclusive)) log('exclusive ignoré : ce doit être une liste.')
const LIMIT = Number(input.budget) > 0 ? Number(input.budget) : 0
if (input.budget != null && !LIMIT) log('budget ignoré : ce doit être un nombre de tokens.')

// A relaunched criterion resumes from the effort it reached, instead of medium again.
const START = {}
if (input.startEffort && typeof input.startEffort === 'object') {
  for (const [id, e] of Object.entries(input.startEffort)) {
    if (byId[id] && DEV_EFFORTS.includes(e)) START[id] = e
    else log(`startEffort ignoré pour « ${id} » : ${byId[id] ? `effort « ${e} » inconnu` : 'critère inconnu'}.`)
  }
}

// Every agent gets its own ten ports, so servers started at the same time never collide.
let nextSlot = 0
const takeSlot = () => nextSlot++
const portsFor = slot => { const a = 20000 + 10 * (slot % 4500); return `${a}-${a + 9}` }
const portRule = slot => `Ports: anything you start that listens (a server, a service) uses only ports ${portsFor(slot)}, and you stop it before you return.`

// Groups come from the orchestrator, cut fine: one group per criterion unless two cannot be
// checked apart. Groups may touch the same files: the fusion resolves the conflicts.
// Without groups, one group per criterion.
let groupIds = CRITERIA.map(c => [c.id])
if (input.groups != null && CRITERIA.length) {
  if (!Array.isArray(input.groups) || !input.groups.every(g => Array.isArray(g))) {
    return { error: 'args.groups must be an array of arrays of criterion ids.' }
  }
  const recheckIds = RECHECK.map(c => c.id)
  const raw = input.groups.map(g => g.map(String))
  const dropped = raw.flat().filter(id => recheckIds.includes(id))
  if (dropped.length) log(`Retiré(s) des groupes, déjà dans recheck : ${[...new Set(dropped)].join(', ')}.`)
  groupIds = raw.map(g => g.filter(id => !recheckIds.includes(id))).filter(g => g.length)
  const flat = groupIds.flat()
  const unknown = flat.filter(id => !critIds.includes(id))
  const twice = flat.filter((id, i) => flat.indexOf(id) !== i)
  if (unknown.length || twice.length) {
    return { error: `args.groups must list each criterion id of this run once.${unknown.length ? ` Unknown: ${unknown.join(', ')}.` : ''}${twice.length ? ` Repeated: ${[...new Set(twice)].join(', ')}.` : ''}` }
  }
  const missing = critIds.filter(id => !flat.includes(id))
  if (missing.length) {
    log(`Absent(s) des groupes, un groupe chacun : ${missing.join(', ')}.`)
    for (const id of missing) groupIds.push([id])
  }
  const big = groupIds.filter(g => g.length > 3).length
  if (big) log(`${big} groupe(s) de plus de 3 critères : plus lents à aboutir.`)
}
const GROUPS = groupIds.map((ids, i) => ({ id: String(i + 1), criteria: ids.map(id => byId[id]) }))

// Token budget: the run stops launching work before the limit and returns a partial report.
let stopped = ''
function overBudget(what) {
  if (stopped) return true
  const tool = typeof budget !== 'undefined' && budget && typeof budget.spent === 'function' ? budget : null
  const limits = [LIMIT, tool && tool.total ? tool.total : 0].filter(Boolean)
  if (!limits.length || !tool) return false
  const lim = Math.min(...limits)
  const spent = tool.spent()
  if (spent < 0.85 * lim) return false
  stopped = `budget de tokens presque atteint (${Math.round(spent / 1000)}k sur ${Math.round(lim / 1000)}k), arrêt avant ${what}`
  log(`Arrêt propre : ${stopped}`)
  return true
}

// ---------------------------------------------------------------- schemas
const DECISIONS_RULE = 'choices the spec did not settle that change what the owner can see or use, one short sentence each, in French, in plain words (what the result does, not how; no file or library names). Not what you did not do, and not problems outside the spec — the critics report those. Usually empty.'
const TECH = 'TECHNIQUE:'
const ISOLATION = 'ISOLATION:'

const devSchema = ids => ({
  type: 'object',
  properties: {
    workspace: { type: 'string', description: 'absolute path of the tree you worked in (`git rev-parse --show-toplevel` run there)' },
    branch: { type: 'string', description: 'current branch of that tree' },
    changed: { type: 'boolean', description: 'true if you modified or created any file' },
    files: { type: 'array', items: { type: 'string' }, description: 'every file you created, modified or deleted in this round, relative to your workspace' },
    summary: { type: 'string', description: 'what the result now does, in two or three sentences' },
    triage: {
      type: 'array',
      description: 'empty on a first round; after a rejection, one entry per rejected criterion, sorted before touching the code',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: ids },
          kind: { type: 'string', enum: ['slip', 'approach'] },
          why: { type: 'string', description: 'the cause, in one sentence' },
        },
        required: ['id', 'kind', 'why'],
      },
    },
    selfCheck: {
      type: 'array',
      description: 'per criterion, what you ran to check it, if anything',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: ids },
          status: { type: 'string', enum: ['pass', 'fail', 'not run'] },
          evidence: { type: 'string' },
        },
        required: ['id', 'status', 'evidence'],
      },
    },
    decisions: { type: 'array', items: { type: 'string' }, description: DECISIONS_RULE },
    blocker: { type: 'string', description: `empty unless the spec itself must change or the owner must decide before any progress is possible; a technical cause outside your changes (environment, hook, missing tool) starts with "${TECH}"` },
  },
  required: ['workspace', 'branch', 'changed', 'files', 'summary', 'triage', 'selfCheck', 'decisions', 'blocker'],
})

// Verdicts are keyed by criterion id and every id is required: a critic cannot skip a criterion.
const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'defect', 'unverifiable'] },
    proof: { type: 'string', description: 'what you ran or read and what you observed; for a defect, the reproduction' },
    note: { type: 'string', description: 'a suspicion or an edge case you could not prove: a lead for the developer, never a defect' },
  },
  required: ['verdict', 'proof'],
}

const panelSchema = ids => ({
  type: 'object',
  properties: {
    verdicts: {
      type: 'object',
      description: 'one verdict per criterion, keyed by its id',
      properties: Object.fromEntries(ids.map(id => [id, VERDICT])),
      required: ids,
      additionalProperties: false,
    },
    outsideSpec: {
      type: 'array',
      description: 'problems that existed before this run, in parts of the project the spec does not cover, worth the owner\'s attention (security first). Report every one you find, with its severity: the run filters them. Never: a defect of a criterion, an edge case of code written in this run (that goes in the criterion\'s note), other criteria not done yet, uncommitted files.',
      items: {
        type: 'object',
        properties: {
          issue: { type: 'string' },
          proof: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['issue', 'proof', 'severity'],
      },
    },
  },
  required: ['verdicts', 'outsideSpec'],
})

const FUSION_SCHEMA = {
  type: 'object',
  properties: {
    workspace: { type: 'string', description: 'absolute path of the integration copy' },
    branch: { type: 'string', description: 'branch of the integration copy' },
    integrated: { type: 'boolean', description: 'true if the group\'s work is now committed on the integration branch' },
    removed: { type: 'boolean', description: 'true if the group\'s copy and branch were then removed' },
    reason: { type: 'string', description: 'empty if integrated; otherwise why not, in a few French words' },
    conflicts: { type: 'array', items: { type: 'string' }, description: 'each conflict and how it was resolved, in plain words' },
    tests: { type: 'string', description: 'test command run and its outcome' },
  },
  required: ['workspace', 'branch', 'integrated', 'removed', 'reason', 'conflicts', 'tests'],
}

const COPY_SCHEMA = {
  type: 'object',
  properties: {
    workspace: { type: 'string', description: 'absolute path of the copy; empty if none' },
    branch: { type: 'string' },
    reason: { type: 'string', description: 'empty if done; otherwise why not, in a few French words' },
  },
  required: ['workspace', 'branch', 'reason'],
}

const TIDY_SCHEMA = {
  type: 'object',
  properties: {
    copies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group: { type: 'string' },
          removed: { type: 'boolean', description: 'true if the worktree folder is gone' },
          branch: { type: 'string', description: 'the branch still holding its work; empty if deleted' },
          reason: { type: 'string', description: 'empty if removed; otherwise why it stays, in a few French words' },
        },
        required: ['group', 'removed', 'branch', 'reason'],
      },
    },
  },
  required: ['copies'],
}

const MACHINE_FIELDS = {
  cause: { type: 'string', description: 'status "unavailable": the machine cause, in plain French (e.g. « disque plein sur le runner »); else empty' },
  job: { type: 'string', description: 'the job concerned; else empty' },
  runner: { type: 'string', description: 'the runner concerned; else empty' },
  unblock: { type: 'string', description: 'status "unavailable": the one action that would unblock it, in plain French; else empty' },
}

const CI_KICK_SCHEMA = {
  type: 'object',
  properties: {
    started: { type: 'boolean', description: 'true if the branch is pushed and its pipeline is starting' },
    ref: { type: 'string', description: 'the remote branch pushed to' },
    mr: { type: 'string', description: 'the merge request URL, if any' },
    note: { type: 'string' },
  },
  required: ['started', 'ref', 'mr', 'note'],
}

const CI_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['passed', 'code', 'unavailable'] },
    pipeline: { type: 'string', description: 'the pipeline (URL or id) and the commit it ran on' },
    defects: {
      type: 'array',
      description: 'status "code": each failure, the criterion it hurts and the proof (job, failing test, log lines)',
      items: { type: 'object', properties: { id: { type: 'string' }, proof: { type: 'string' } }, required: ['id', 'proof'] },
    },
    ...MACHINE_FIELDS,
    note: { type: 'string', description: 'retries made, the wait limit, anything else worth knowing' },
  },
  required: ['status', 'pipeline', 'defects', 'cause', 'job', 'runner', 'unblock', 'note'],
}

const PUB_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'failed', 'unavailable', 'blocked'] },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: { action: { type: 'string' }, outcome: { type: 'string', description: 'what happened, with the link, version or id' } },
        required: ['action', 'outcome'],
      },
    },
    reason: { type: 'string', description: 'empty if done; otherwise why, in plain French (status "blocked": the missing access)' },
    ...MACHINE_FIELDS,
  },
  required: ['status', 'steps', 'reason', 'cause', 'job', 'runner', 'unblock'],
}

// ---------------------------------------------------------------- helpers
const list = (cs, tag = 'criteria') => `<${tag}>\n${cs.map(c => `<criterion id="${c.id}">${c.text}</criterion>`).join('\n')}\n</${tag}>`
const clean = p => String(p || '').replace(/\/+$/, '')
const kindOf = b => String(b).startsWith(TECH) || String(b).startsWith(ISOLATION) ? 'technique' : 'question'

// agent() returns null when the owner skipped the agent or it died after the tool's own retries.
// Such a breakdown is not a failed round: the same agent is launched once more.
async function ask(prompt, opts) {
  const r = await agent(prompt, opts)
  if (r) return r
  log(`${opts.label} : pas de réponse, relancé une fois`)
  return agent(prompt, { ...opts, label: `${opts.label} — relance` })
}

// Copies live in the project, under a folder git is told to ignore locally (.git/info/exclude),
// named after the spec so the clean-up recognises them, even those an interrupted run left.
const SPEC_ID = (SPEC.split('/').pop() || '').replace(/\.md$/i, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'spec'
const COPIES = '.spec-first/copies'
const ENSURE_HIDDEN = `cd "${ROOT}" && x=$(git rev-parse --git-path info/exclude) && mkdir -p "$(dirname "$x")" && { grep -qxF /.spec-first/ "$x" || echo /.spec-first/ >> "$x"; }`
const SUBMODULES = '{ [ ! -f .gitmodules ] || git submodule update --init --recursive; }'
const copyCommand = (kind, from) => `${ENSURE_HIDDEN} && mkdir -p ${COPIES} && d=$(mktemp -d ${COPIES}/${SPEC_ID}--${kind}-XXXXXX) && git worktree add -b "spec-first-$(basename "$d")" "$d/wt" ${from} && cd "$d/wt" && ${SUBMODULES} && pwd`
const integCopyCommand = `${ENSURE_HIDDEN} && w=$(git worktree list --porcelain | awk -v b="refs/heads/${IB}" '/^worktree /{p=substr($0,10)} $0=="branch "b{print p}') && if [ -n "$w" ]; then cd "$w"; else mkdir -p ${COPIES} && d=$(mktemp -d ${COPIES}/${SPEC_ID}--integration-XXXXXX) && git worktree add "$d/wt" "${IB}" && cd "$d/wt" && ${SUBMODULES}; fi && pwd`
const isCopy = ws => !!ws && ws !== ROOT && ws.includes(`/${COPIES}/`)
const PREPARE = `${setupCommand
  ? `Prepare it right after creating it: run \`${setupCommand}\` from ${SUBDIR ? `its ${SUBDIR} folder` : 'its root'}.`
  : `If the project needs what git ignores to run, install its dependencies in the copy the project's usual way and copy its local config (e.g. .env) from ${inSub(ROOT)}.`} The commit hooks must run in the copy too. Never link the project's own dependency folders (.venv, node_modules): the tests would run the project's code, not the copy's. A copy holds tracked files only; never commit what you add to prepare it.`
// What a fusion may drop from a group's work: this list only, everything else is the group's work.
const DROP = `only these, when ${BASE} did not track them: local config copied in (.env, .env.local, .env.*.local), dependency folders (.venv, venv, node_modules), caches (__pycache__, *.pyc, .pytest_cache, .mypy_cache, .ruff_cache, .cache), build outputs (dist, build, .next, coverage), .DS_Store`

// What changed in a tree since the run started.
const changesHint = tree => `Changes of this run: \`git -C ${tree} diff ${BASE}\` (the commit the run started from), plus the files \`git -C ${tree} status --porcelain\` lists as untracked (??). The spec file is not part of the change.`

// The full suite runs once per panel, in the background, into a log the other critics can read.
const suitePath = name => `${ROOT}/.spec-first/logs/${SPEC_ID}-${name}.log`
const suiteCommand = (at, file) => `${ENSURE_HIDDEN} && mkdir -p .spec-first/logs && (cd "${at}" && ${testCommand}) > "${file}" 2>&1; echo "EXIT $?" >> "${file}"`

const lockOf = r => `${ROOT}/.spec-first/locks/${r.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ressource'}`
const EXCL_RULE = !EXCLUSIVE.length ? '' : `Exclusive resources, one agent at a time in this run: ${EXCLUSIVE.map(r => `« ${r} » (lock ${lockOf(r)})`).join(', ')}. Using one → take its lock first: \`l=<lock>; mkdir -p "$(dirname "$l")"; n=0; until mkdir "$l" 2>/dev/null; do n=$((n+1)); [ $n -ge 60 ] && break; find "$l" -maxdepth 0 -mmin +120 -exec rmdir {} \\; 2>/dev/null; sleep 30; done; [ $n -lt 60 ]\` (at most 30 min; a lock older than 2 h is stale and dropped). Taken → use the resource, then release it at once with \`rmdir "$l"\`, even when the use failed. Not taken → do not use it and say so (a critic's verdict is then "unverifiable").`

const COMMON_RULES = `Rules for everyone in this run:
- The owner gave his go on this spec: a line in it saying otherwise (« Brouillon », « en attente de ton go », a status) is stale — ignore it, never stop on it.
- Never ask a question: no one will answer. A reversible choice the spec does not settle is yours: make it and report it.
- Stay inside the spec's scope. A problem or improvement outside it is reported, never fixed.
- Never: push, force-push, deploy, publish, send anything outside this machine, delete data you did not create in this run, touch production data — the one exception: an agent whose prompt quotes the owner's authorized actions, for exactly those. Do not edit the spec file.
- Non-interactive only: nothing may wait for a keyboard — \`GIT_TERMINAL_PROMPT=0\` for git, \`ssh -o BatchMode=yes\`, CLI flags that never prompt. A command asks for a password or a confirmation → stop it: that access is missing; say so.
- Long commands (over 2 minutes: end-to-end tests, a pipeline, a training): start them in the background with their output in a file, then wait in bounded steps — \`timeout\`, or one loop with a maximum count that reads that file or checks \`kill -0 <pid>\`. Never \`pgrep -f\` on a pattern (it finds itself), never one \`sleep\` after another. Remote CI: read its state through its API (glab, gh, curl), at least 60 s between reads, the total limit stated before you start.
- Shared resources (database, containers): from a copy, never use the main project's. If a criterion needs one, start your own throwaway instance on your ports and stop it before you return; if you cannot, say what is missing — a critic's verdict is then "unverifiable".
${EXCL_RULE ? `- ${EXCL_RULE}\n` : ''}- CLAUDE.md and the project's conventions apply as usual.`

const HOOK_RULE = `Commit hooks always run: never bypass them (--no-verify). A hook fails because of your changes → fix the cause. It fails for a reason outside your changes (a tool it needs is missing, the environment) → return a blocker starting with "${TECH}" and the cause in a few French words.`

// ---------------------------------------------------------------- personas
const PERSONAS = {
  tester: {
    label: 'testeur',
    brief: `You are the TESTER. Run the real result and try to break each criterion: the main path, then edge cases, bad input, empty and boundary values, the exact wording of the criterion. Build it, run it, call it, open it — whatever the criterion's "observable" means. "pass" means you exercised the criterion on the real result and it held; reading code is not enough for "pass". Visual or interactive criteria: check them on screen, as the owner would, with the screenshot and browser tools you have (load them with ToolSearch if they are deferred). "unverifiable" only when a device or a credential is missing — the proof names it.`,
  },
  owner: {
    label: 'propriétaire',
    brief: `You are the OWNER'S ADVOCATE. The project owner wrote this spec; he does not read code. Check that the result does what he meant, not a convenient reading of the words: read the spec's goal and out-of-scope list, CLAUDE.md, earlier specs next to this one and recorded decisions. A defect is: the letter of a criterion is met but its intent is not; a criterion was weakened or reinterpreted; the result contradicts one of his recorded decisions. Proof = the spec or decision text quoted, plus what the result actually does.`,
  },
  maintainer: {
    label: 'mainteneur',
    brief: `You are the MAINTAINER. Read every change made in this run (diff against the commit below) and look for: security holes introduced, side effects on behaviour that worked before (targeted tests), changes no criterion needed (scope creep), fragile code that will break on the next change. Attach each defect to the criterion whose change causes it. Problems that existed before this run go in "outsideSpec", never as defects.`,
    finalNote: 'In this final check a separate critic covers security: focus on side effects, scope creep and fragility.',
  },
  integrator: {
    label: 'intégrateur',
    brief: `You are the INTEGRATION CRITIC. The result combines work developed separately — groups merged one by one, and possibly an earlier run of this spec. Look for what the combination broke: a conflict resolved by dropping one side, two implementations of the same thing, one part undoing a criterion of another, a shared file (config, routes, schema, styles) where one change overrode another. Proof = the reproduction on the real result, or the two clashing changes quoted with the effect you observed. Attach each defect to the criterion that no longer holds.`,
  },
  security: {
    label: 'sécurité',
    brief: `You are the SECURITY CRITIC. Read every change made in this run (diff against the commit below) and look for the holes it introduced: injection (SQL, shell, HTML, CSS, script), missing or weakened authentication or authorization, secrets in code, logs or responses, unsafe file paths, untrusted input reaching a dangerous call, a new dependency with a known problem. Prove each one — the input that exploits it and what happens, or the exact code path from input to the dangerous call — and attach it to the criterion whose change causes it. Holes that existed before this run go in "outsideSpec", never as defects.`,
  },
}
const PUB_CHECK = 'This is the PUBLICATION CHECK: the owner\'s authorized external actions were just applied. Check each criterion from outside, as a user of what was published would: install from the registry into a fresh `mktemp -d` folder, read the merge request, its pipeline, the tag or the release through glab, gh or the API, open what was pinned. You only look: never push, merge, tag or publish anything.'
const IN_RUN = ['tester', 'owner', 'maintainer']
const personaOf = key => key.split('-')[0]
const seatDef = (key, extra = {}) => ({ key, persona: personaOf(key), label: PERSONAS[personaOf(key)].label, ...extra })

// Tests: targeted during the run; the full suite once per panel, by one critic, shared through a log.
function testsFor(seat, where) {
  const at = inSub(where)
  if (seat.publication) return 'Do not run the project tests: the final check did.'
  if (seat.fullSuite && testCommand) {
    return `Project tests: in this panel you alone run the full suite, once, in the background: \`${suiteCommand(at, seat.suiteLog)}\`, then wait for it (long commands rule). A test that passed before this run and fails now is a defect of the criterion whose change broke it.`
  }
  const targeted = quickTestCommand ? `targeted tests only — \`${quickTestCommand}\` from ${at}, or narrower` : 'only the tests that cover your criteria'
  const full = !testCommand ? ''
    : seat.suiteLog ? ` Never run the full suite yourself: another critic runs it once into ${seat.suiteLog}, complete when its last line is "EXIT <code>" — read it there if you need it.`
      : ' Never run the full suite: it runs once, in the final check.'
  return `Project tests: ${targeted}.${full}`
}

// A seat = one critic judging some criteria. fullSuite: the one seat of a panel that runs the whole
// test suite. previous: its own earlier verdicts, when it judges again after a rework.
function panelPrompt(seat, where, context, slot) {
  const p = PERSONAS[seat.persona]
  const previous = seat.previous && seat.previous.length ? `
<your_previous_verdicts>
${seat.previous.map(([id, v]) => `[${id}] ${v ? `${v.verdict}: ${v.proof}` : 'no verdict'}`).join('\n')}
</your_previous_verdicts>
The developer reworked since then. First check that what you reported is fixed, then judge each criterion afresh on the real result.` : ''
  const pubIds = seat.publication ? [] : seat.criteria.filter(c => isPub(c.id)).map(c => c.id)
  const pubNote = pubIds.length ? `
Criteria ${pubIds.join(', ')} are publication criteria: their external part (pushed, merged, tagged, published, pinned) happens after the final check, in a phase of its own, with the owner's authorization. Judge everything else they need (version, changelog, files ready); never a defect nor "unverifiable" only because it is not published yet.` : ''
  const specDiff = seat.final && SPEC_BASE && ['maintainer', 'security'].includes(seat.persona) ? `
Read the whole spec's changes, an earlier run of it (socle) included: \`git -C ${where} diff ${SPEC_BASE}\`.` : ''
  return `${p.brief}${seat.final && p.finalNote ? ` ${p.finalNote}` : ''}${seat.publication ? ` ${PUB_CHECK}` : ''}

You are an independent critic. You do not see the other critics; do not try to agree with anyone. Your job is to find real defects and prove them, not to approve.

Spec: ${SPEC} (read it first: goal, criteria, out of scope).
Criteria to judge — only these:
${list(seat.criteria)}
The spec's other criteria are handled elsewhere and may not be done yet: that is expected, never report it. Uncommitted or untracked files are expected — the run commits its result at the end: never report them.
${previous}
The result lives in: ${where}
${context}${specDiff}${pubNote}
${testsFor(seat, where)}

Do not edit source files under ${ROOT} or ${where}. Build outputs, caches and servers the project's own commands create are fine. Scratch files go in a fresh \`mktemp -d\` directory only.
${portRule(slot)}

One verdict per criterion above, keyed by its id:
- "pass": you checked it and it holds — proof says what you ran or read and what you saw;
- "defect": you PROVED it fails — proof is the reproduction (exact command and observed output, or the concrete input and the wrong behaviour). A suspicion you cannot prove is not a defect: put it in "note" — the developer gets it as a lead;
- "unverifiable": you could not check it — proof says why.

${COMMON_RULES}`
}

const outsideSpec = []

// book[criterionId][seatKey] = that critic's latest verdict (null: it did not return).
// A critic that did not answer, or left a criterion without verdict, is asked once more before
// the criterion is reported « non vérifié ».
async function judgeSeats(seats, book, where, context, phaseTitle, tag) {
  const launch = list => parallel(list.map(s => () => agent(panelPrompt(s, where, context, takeSlot()), {
    ...(s.final ? FINAL_CRITIC : CRITIC), schema: panelSchema(s.criteria.map(c => c.id)), phase: phaseTitle,
    label: `${tag} — ${s.label} (opus ${(s.final ? FINAL_CRITIC : CRITIC).effort})${s.retry ? ' — relance' : ''}`,
  })))
  const record = (list, reviews) => list.forEach((s, i) => {
    const r = reviews[i]
    if (r) for (const o of r.outsideSpec || []) outsideSpec.push(o)
    for (const c of s.criteria) {
      book[c.id][s.key] = r && r.verdicts && typeof r.verdicts === 'object' ? r.verdicts[c.id] || null : null
    }
  })
  record(seats, await launch(seats))
  const again = seats.map(s => {
    const cs = s.criteria.filter(c => !book[c.id][s.key])
    return { ...s, criteria: cs, previous: (s.previous || []).filter(([id]) => cs.some(c => c.id === id)), retry: true }
  }).filter(s => s.criteria.length)
  if (again.length) {
    log(`${tag} : ${again.map(s => s.label).join(', ')} sans verdict — redemandé une fois`)
    record(again, await launch(again))
  }
}

// After a rework, only the critics that did not pass a criterion judge it again, given their own
// earlier verdict. A critic that passed it is not asked again; the final check re-judges everything.
function recheckSeats(criteria, book, keysOf, defs) {
  const byKey = new Map()
  for (const c of criteria) {
    for (const k of keysOf(c)) {
      const v = book[c.id][k]
      if (v && v.verdict === 'pass') continue
      if (!byKey.has(k)) byKey.set(k, [])
      byKey.get(k).push(c)
    }
  }
  return [...byKey].map(([k, cs]) => ({ ...defs[k], criteria: cs, previous: cs.map(c => [c.id, book[c.id][k]]) }))
}

// A criterion passes only if its tester verified it AND no critic proved a defect.
// Notes are leads, never defects: they travel to the next round and to the report.
function judge(c, book, keys) {
  const got = keys.map(k => ({ key: k, persona: personaOf(k), v: book[c.id][k] || null }))
  const leads = got.filter(g => g.v && String(g.v.note || '').trim()).map(g => `[${g.key}] ${g.v.note}`)
  const defects = got.filter(g => g.v && g.v.verdict === 'defect' && String(g.v.proof || '').trim())
  if (defects.length) return { status: 'defect', proofs: defects.map(d => `[${d.key}] ${d.v.proof}`), leads }
  const missing = got.filter(g => !g.v).map(g => g.key)
  if (missing.length) return { status: 'unverified', reason: `aucun verdict de : ${missing.join(', ')} (redemandé une fois)`, leads }
  const tester = got.find(g => g.persona === 'tester')
  if (tester.v.verdict !== 'pass') return { status: 'unverified', reason: tester.v.proof, leads }
  return { status: 'validated', proof: tester.v.proof, leads }
}

// The developer's next round: every proof so far, the leads, and the sort to make first.
function feedbackFor(rejected, history, leads) {
  return `
The critics rejected the previous round.
<critic_proofs>
${rejected.map(c => history[c.id].map(h => `[${c.id}] ${h.round}: ${h.proofs}`).join('\n')).join('\n')}
</critic_proofs>${leads.length ? `
<critic_leads>
Unproven suspicions, not defects: check them while you work.
${leads.join('\n')}
</critic_leads>` : ''}
Before touching the code, sort each rejection and report it in "triage":
- "slip": the approach holds, a detail is wrong → fix the cause at its root, not the symptom;
- "approach": the way the criterion is built cannot satisfy it, or the same defect came back after a fix → drop that approach and take another; never patch it again.
A criterion rejected twice for the same reason is always "approach".
`
}
const IDLE_NOTE = `
Your previous round changed nothing and returned no blocker, yet these criteria are not done. Do the work now; if something truly stops you, say it in "blocker".
`

// ================================================================= 1. groups, a few at a time
// Each group works in its own git worktree, at most MAX_GROUPS at once; a group that starts late
// starts from what is already merged. A group that is launched is judged at once.
const PASSING = ['validated', 'unverified']
// The in-run tester runs the full suite only when nothing else will: no final check.
const IN_RUN_FULL_SUITE = !FINAL
log(CRITERIA.length
  ? `${CRITERIA.length} critère(s) à développer en ${GROUPS.length} groupe(s), ${Math.min(MAX_GROUPS, GROUPS.length)} à la fois, chacun dans sa copie${RECHECK.length ? `, ${RECHECK.length} critère(s) d'un run précédent à rejuger` : ''}${FINAL ? '' : ', sans contrôle final'}${PUBLISH ? ', puis la publication autorisée' : ''} — ${ALL.length} critère(s) au total`
  : `Contrôle final seul : ${RECHECK.length} critère(s) à rejuger${PUBLISH ? ', puis la publication autorisée' : ''}`)

const decisions = []
const integ = { where: '', branch: '' } // the integration copy, created by the first fusion
const integratedGroups = []
const fusions = []
const ci = { started: false, ref: '', mr: '', block: null, runs: [] } // the remote CI, started early
const filesOf = {} // criterion id → files its developers touched
const addFiles = (id, fs) => {
  const s = filesOf[id] || (filesOf[id] = [])
  for (const f of fs || []) if (!s.includes(String(f))) s.push(String(f))
}

// An interrupted run's integration branch: its copy holds the result, every copy starts from it.
if (IB) {
  const res = await ask(`You prepare the integration copy of an interrupted run of this spec, so this run goes on from it. Run:
\`${integCopyCommand}\`
It reuses the worktree that already holds branch ${IB}, or makes a new copy of it. A new copy → prepare it: ${PREPARE}
Commit nothing, change no tracked file. Return its path as workspace and ${IB} as branch; cannot → workspace empty and the reason in a few French words.

${COMMON_RULES}`, { ...FUSION, schema: COPY_SCHEMA, phase: 'Fusion', label: `Reprise depuis ${IB} (opus ${FUSION.effort})` })
  const ws = clean(res && res.workspace)
  if (!isCopy(ws)) {
    return { error: `args.integrationBranch: no usable copy of ${IB} — ${(res && res.reason) || 'no answer'}. Check the branch name (\`git branch --list 'spec-first-*'\`) or drop integrationBranch.` }
  }
  integ.where = ws
  integ.branch = IB
  log(`Reprise depuis la branche d'intégration ${IB}`)
}

function workspaceRule(g, where, branch, from) {
  if (where) {
    return `Your workspace is your copy ${where} (branch ${branch}), made in an earlier round. Every file you edit must be under it, never under ${ROOT}. Read the spec at ${SPEC}. When done, commit all your changes on that branch. ${HOOK_RULE}`
  }
  return `Other developers work on other criteria at the same time, so you work in your own copy of the project. First check that one can be made: ${ROOT} is the top of a git repository (\`[ "$(git -C "${ROOT}" rev-parse --show-toplevel)" = "$(cd "${ROOT}" && pwd -P)" ]\` succeeds). If not, change nothing, create nothing, and return a blocker starting with "${ISOLATION}" and the reason in a few French words.
Otherwise create your copy from ${from === BASE ? `commit ${BASE}` : `branch ${from} (what is already merged)`}, whatever the branch the project is on — uncommitted changes in ${ROOT} are not part of it:
\`${copyCommand(`g${g.id}`, from)}\`
Work only in that copy: every file you edit must be under it, never under ${ROOT}. Read the spec at ${SPEC}: your copy may lack it or hold an older version.
${PREPARE}
When done, commit all your changes on that branch (it is temporary: the run merges it, then removes the copy). ${HOOK_RULE} Return that copy as workspace and its branch as branch, even if you changed nothing. These checks and this copy are plumbing: never mention them in decisions.`
}

const hasPassing = r => r.criteria.some(id => PASSING.includes((r.results[id] || {}).status))
const keepBlocked = (r, reason) => {
  for (const id of r.criteria) {
    if (PASSING.includes((r.results[id] || {}).status)) r.results[id] = { ...r.results[id], status: 'blocked', kind: 'technique', reason }
  }
}

async function runGroup(g) {
  const tag = `Groupe ${g.id}`
  const ids = g.criteria.map(c => c.id)
  const results = {}
  const book = Object.fromEntries(ids.map(id => [id, {}]))
  const history = Object.fromEntries(ids.map(id => [id, []]))
  const defs = Object.fromEntries(IN_RUN.map(k => [k, seatDef(k, { fullSuite: IN_RUN_FULL_SUITE && k === 'tester' })]))
  const start = Math.max(0, ...ids.map(id => DEV_EFFORTS.indexOf(START[id] || DEV_EFFORTS[0])))
  // A group that starts after a fusion starts from what is already merged.
  const from = integ.branch || FROM
  let pending = g.criteria.slice()
  let where = ''
  let branch = ''
  let feedback = ''
  let nudge = ''
  let blocker = ''
  for (let round = 0; round < DEV_EFFORTS.length && pending.length; round++) {
    if (overBudget(`l'essai ${round + 1} du groupe ${g.id}`)) {
      for (const c of pending) {
        results[c.id] = round === 0
          ? { status: 'blocked', kind: 'technique', rounds: 0, reason: `Arrêté : ${stopped}.` }
          : { ...results[c.id], reason: `${results[c.id].reason || ''}\n(pas de nouvel essai : ${stopped})` }
      }
      pending = []
      break
    }
    const effort = DEV_EFFORTS[Math.min(start + round, DEV_EFFORTS.length - 1)]
    const isolated = !where
    const done = g.criteria.filter(c => !pending.includes(c))
    // Rework starts from what is already merged, not from the run's first commit.
    const catchUp = round > 0 && integ.branch ? `
First bring in what other groups already merged, so your fix starts from it: \`git -C ${where} merge --no-edit ${integ.branch}\`. A conflict → resolve it keeping both intents, then commit. New dependencies came in → prepare your copy again. Never rebase, reset or stash.` : ''
    const pubIds = pending.filter(c => isPub(c.id)).map(c => c.id)
    const devPrompt = `You are the developer for part of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}.

Spec: ${SPEC} — read it first (goal, criteria, out of scope).
Your criteria:
${list(pending)}
${done.length ? `Already validated in this group — keep them working:\n${list(done, 'validated_criteria')}\n` : ''}Other criteria of the spec belong to other developers, who may touch the same files: do not implement them.${pubIds.length ? `
Criteria ${pubIds.join(', ')} are publication criteria: prepare everything they need (version, changelog, files), but never push or publish — a later phase does it, with the owner's authorization.` : ''}

${workspaceRule(g, where, branch, from)}${catchUp}
${portRule(takeSlot())}
${nudge}${feedback}
Tests: ${quickTestCommand ? `targeted ones — \`${quickTestCommand}\`, or narrower` : 'run the ones that cover your criteria'}${SUBDIR ? `, from the copy's ${SUBDIR} folder` : ''}.${testCommand ? ' The full suite runs once, in the final check: do not run it.' : ''}
An independent panel judges every criterion on the real result.
Never run commands that rewrite files outside your criteria (repo-wide formatters, lockfile upgrades). If you need a new dependency, add it the project's usual way and say so in your summary.
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec — or, starting with "${TECH}", a technical cause outside your changes stops you (a hook, the environment, a missing tool).

${COMMON_RULES}`
    const dev = await ask(devPrompt, {
      model: 'opus', effort, schema: devSchema(ids), phase: 'Développement',
      label: `${tag} — dév essai ${round + 1} (opus ${effort})`,
    })
    if (!dev) {
      // A breakdown, not a failed round: the skill relaunches it.
      for (const c of pending) results[c.id] = { status: 'crashed', rounds: round + 1, effortReached: effort, reason: "le développeur n'a pas répondu, deux fois (panne)" }
      pending = []
      break
    }
    if (isolated) {
      const ws = clean(dev.workspace)
      const iso = String(dev.blocker || '').startsWith(ISOLATION)
      if (iso || !isCopy(ws)) {
        const why = iso ? dev.blocker.slice(ISOLATION.length).trim() : 'le développeur n’a pas rendu de copie isolée'
        const reason = `Copie isolée impossible : ${why || 'raison inconnue'}.`
        for (const c of pending) results[c.id] = { status: 'blocked', kind: 'technique', rounds: round + 1, reason }
        const kept = isCopy(ws)
        return { group: g.id, criteria: ids, where: kept ? ws : '', branch: kept ? String(dev.branch || '') : '', results, blocker: reason, kind: 'technique', integrated: false, removed: false }
      }
      where = ws
      branch = String(dev.branch || '')
    }
    for (const id of ids) addFiles(id, dev.files)
    for (const d of dev.decisions || []) decisions.push(d)
    const triage = Object.fromEntries((dev.triage || []).map(t => [String(t.id), `${t.kind}: ${t.why}`]))
    const claimsDone = pending.every(c => (dev.selfCheck || []).some(s => String(s.id) === c.id && s.status === 'pass'))
    if (!dev.changed && !dev.blocker && !claimsDone) {
      // Stopped without doing anything and without saying why: a new round one tier up, not a block.
      for (const c of pending) results[c.id] = { ...(results[c.id] || {}), status: 'failed', rounds: round + 1, effortReached: effort, reason: "le développeur s'est arrêté sans rien changer" }
      nudge = IDLE_NOTE
      log(`${tag} : essai ${round + 1} (opus ${effort}) — rien changé, nouvel essai un cran plus haut`)
      continue
    }
    nudge = ''
    if (dev.blocker) {
      blocker = String(dev.blocker)
      if (!dev.changed) {
        for (const c of pending) results[c.id] = { status: 'blocked', kind: kindOf(blocker), rounds: round + 1, effortReached: effort, reason: blocker }
        pending = []
        break
      }
    }
    const mergedIn = from !== BASE || !!catchUp
    const context = `<developer_claims>
Summary: ${dev.summary}
Self-check: ${(dev.selfCheck || []).map(s => `[${s.id}] ${s.status}: ${s.evidence}`).join(' | ') || 'none'}
</developer_claims>
These are claims, not evidence.
${changesHint(where)}${mergedIn ? ' Work merged into this copy before (other groups, an earlier run) is part of that diff: judge only your criteria.' : ''}`
    const panel = round === 0 ? IN_RUN.map(k => ({ ...defs[k], criteria: pending })) : recheckSeats(pending, book, () => IN_RUN, defs)
    const shared = IN_RUN_FULL_SUITE && testCommand ? suitePath(`g${g.id}-${round + 1}`) : ''
    const seats = panel.map(s => ({ ...s, suiteLog: shared }))
    await judgeSeats(seats, book, where, context, 'Critique', `${tag} — critique essai ${round + 1}`)
    const rejected = []
    const leads = []
    for (const c of pending) {
      const j = judge(c, book, IN_RUN)
      for (const l of j.leads) leads.push(`[${c.id}] ${l}`)
      const base = { rounds: round + 1, effortReached: effort, leads: j.leads, ...(triage[c.id] ? { triage: triage[c.id] } : {}) }
      if (j.status === 'defect') {
        rejected.push(c)
        history[c.id].push({ round: `essai ${round + 1}`, proofs: j.proofs.join(' / ') })
        results[c.id] = { ...base, status: 'failed', reason: j.proofs.join('\n') }
      } else {
        results[c.id] = { ...base, status: j.status, reason: j.reason || '', proof: j.proof || '' }
      }
    }
    log(`${tag} : essai ${round + 1} (opus ${effort}) — ${pending.length - rejected.length}/${pending.length} critère(s) passé(s)${round ? ` · rejugé par : ${seats.map(s => s.label).join(', ')}` : ''}`)
    if (blocker) {
      // The developer said the spec must change, or the environment stops him: another round cannot fix that.
      for (const c of rejected) results[c.id] = { ...results[c.id], status: 'blocked', kind: kindOf(blocker), reason: blocker }
      pending = []
      break
    }
    feedback = rejected.length ? feedbackFor(rejected, history, leads) : ''
    pending = rejected
  }
  const r = { group: g.id, criteria: ids, where, branch, results, blocker, kind: blocker ? kindOf(blocker) : '', integrated: false, removed: false }
  if (r.where && hasPassing(r)) {
    if (!r.branch) keepBlocked(r, `Copie rendue sans nom de branche — travail conservé dans ${r.where}.`)
    else fuseQueued(r) // not awaited: the group's slot goes to the next group while the fusion runs
  }
  return r
}

// ================================================================= 2. fusion, group by group
// A group with a validated or unverified criterion is merged as soon as it is done, into one
// integration branch, one fusion at a time; later groups and rework start from it. The fusion
// brings in what the critics judged, drops only the closed list DROP, then removes the group's copy.
// A criterion is never validated if its work is not merged. A fusion that fails is a technical block.
let fuseTail = Promise.resolve()
function fuseQueued(r) {
  const p = fuseTail.then(() => fuse(r)).catch(() => {
    keepBlocked(r, `Non intégré — la fusion s'est arrêtée sur une erreur ; travail conservé sur la branche ${r.branch}.`)
    log(`Fusion : groupe ${r.group} non intégré (erreur)`)
  })
  fuseTail = p
  return p
}

async function fuse(r) {
  if (overBudget(`la fusion du groupe ${r.group}`)) {
    keepBlocked(r, `Non intégré — ${stopped} ; travail conservé sur la branche ${r.branch}.`)
    return
  }
  const create = !integ.where
  const already = integratedGroups.map(x => `group ${x.group} (criteria ${x.criteria.join(', ')})`).join(', ')
  const res = await ask(`You are the integrator. Developers work in parallel, each in its own git worktree of the project at ${ROOT}. Each group the critics validated is merged, as soon as it is done, into one integration branch; later groups and rework start from it. Merge group ${r.group} now.

Spec: ${SPEC}
Group ${r.group}: worktree ${r.where}, branch ${r.branch}, statuses ${r.criteria.map(id => `${id}=${r.results[id].status}`).join(', ')}
${list(r.criteria.map(id => byId[id]))}
${already ? `Already merged, must keep working: ${already}.` : 'No group merged yet.'}

1. ${create
    ? `No integration copy exists yet: create it — \`${copyCommand('integration', BASE)}\` — then prepare it. ${PREPARE}`
    : `The integration copy is ${integ.where} (branch ${integ.branch}).`} Return its path as workspace and its branch as branch.
2. Make the group's branch hold exactly what its critics judged, in ${r.where}:
   - stage everything: \`git -C ${r.where} add -A\`
   - check the list \`git -C ${r.where} diff --cached --name-only ${BASE}\` and drop ${DROP} — with \`git -C ${r.where} restore --staged --source=${BASE} -- <path>\` (drops it even if the developer committed it). Everything else staged is the group's work: keep it.
   - something staged → \`git -C ${r.where} commit -m "spec-first : groupe ${r.group}"\`
3. Merge it: \`git -C <integration copy> merge --no-ff --no-edit ${r.branch}\`. Conflict → resolve the markers so this group's criteria and the merged groups' all still hold (read both sides, keep both intents), then \`git add\` and \`git commit --no-edit\`. Never run \`reset\`, \`rebase\`, \`stash\`, \`checkout\` or \`cherry-pick\` in the integration copy: they can wipe groups already merged.
4. A dependency came in → install it in the integration copy the usual way. ${FINAL
    ? `Run targeted tests only${quickTestCommand ? ` (\`${quickTestCommand}\`)` : ''} — those covering this group's criteria and the files the merge touched — from ${SUBDIR ? `the copy's ${SUBDIR} folder` : 'the integration copy'}; the full suite runs once, in the final check.`
    : `Run the project tests${testCommand ? ` (\`${testCommand}\`)` : ''} from ${SUBDIR ? `the copy's ${SUBDIR} folder` : 'the integration copy'}.`} Fix what the merge broke — only that — and commit the fix. Commit hooks always run, never --no-verify; one fails for a reason outside the merge → integrated false, the cause in reason.
5. Merged and committed → remove the group's copy, no longer needed: \`git -C ${ROOT} worktree remove --force ${r.where}\` (refused, e.g. submodules → \`rm -rf ${r.where} && git -C ${ROOT} worktree prune\`), \`git -C ${ROOT} branch -D ${r.branch}\`, then \`rmdir "$(dirname ${r.where})"\`; removed true. Not merged → leave it in place. Leave every other copy and branch alone. Never edit ${ROOT}'s own files or switch its branch. Cannot merge → integrated false and the reason.
${portRule(takeSlot())}

${COMMON_RULES}`, { ...FUSION, schema: FUSION_SCHEMA, phase: 'Fusion', label: `Fusion groupe ${r.group} (opus ${FUSION.effort})` })
  if (res && create) {
    const ws = clean(res.workspace)
    if (isCopy(ws) && res.branch) { integ.where = ws; integ.branch = String(res.branch) }
  }
  if (res) fusions.push({ group: r.group, integrated: !!res.integrated, reason: res.reason, conflicts: res.conflicts, tests: res.tests })
  if (res && res.integrated && integ.where) {
    r.integrated = true
    r.removed = !!res.removed
    integratedGroups.push(r)
    log(`Fusion : groupe ${r.group} intégré (${integratedGroups.length} au total)${(res.conflicts || []).length ? `, ${res.conflicts.length} conflit(s) résolu(s)` : ''}${r.removed ? ', copie supprimée' : ''}`)
    if (PUBLISH && r.criteria.some(isPub)) await ciKick()
  } else {
    keepBlocked(r, `Non intégré — travail conservé sur la branche ${r.branch}.${res ? (res.reason ? ` ${res.reason}` : '') : " L'intégrateur n'a pas répondu, deux fois."}`)
    log(`Fusion : groupe ${r.group} non intégré, copie conservée`)
  }
}

// ---------------------------------------------------------------- remote CI, started early
// As soon as a group the publication depends on is merged, the integration branch is pushed and the
// merge request opened as a draft, so the CI runs while the run goes on — if the authorized actions
// include them. Merging, tagging and publishing wait for the Publication phase.
const authorized = () => `With his go on this spec, the owner authorized these external actions, and only these:
<authorized_actions>
${PUBLISH.actions}
</authorized_actions>`
async function ciKick() {
  if (overBudget('le lancement de la CI')) return
  const res = await ask(`You start the remote CI early, while the run goes on. ${authorized()}
Do only the part that starts the CI, if those actions include it: push the integration branch ${integ.branch} (copy ${integ.where}) to the remote branch the actions name (${ci.ref ? `already pushed as ${ci.ref}: push again to update it` : 'none named → the same name'}), and open the merge request they describe as a draft${ci.mr ? ` — it exists, ${ci.mr}: the push updates it` : ', with the target they name'}. Use glab, gh or the API, non-interactively. Never force-push, merge, tag or publish, and push nothing else. Do not wait for the pipeline.
The actions include no branch push and no merge request → do nothing: started false.
This prompt is the exception to the « never push » rule, for the actions above only.

${COMMON_RULES}`, { ...HELPER, schema: CI_KICK_SCHEMA, phase: 'Fusion', label: `CI : envoi de la branche d'intégration (opus ${HELPER.effort})` })
  if (res && res.started) {
    ci.started = true
    ci.ref = String(res.ref || ci.ref)
    ci.mr = String(res.mr || ci.mr)
    log(`CI lancée en avance${ci.mr ? ` : ${ci.mr}` : ''}`)
  }
}

const ciReason = b => `CI indisponible : ${b.cause || 'cause inconnue'}${b.job ? ` — job ${b.job}` : ''}${b.runner ? `, runner ${b.runner}` : ''}. Pour débloquer : ${b.unblock || 'à préciser'}.`

// Waits for the pipeline of the integration branch's latest commit; its failures become defects.
async function ciWait(stage, book) {
  const ids = Object.keys(book)
  const res = await ask(`You check the remote CI of this run. ${authorized()}
The integration branch ${integ.branch} (copy ${integ.where}) was pushed as ${ci.ref}${ci.mr ? `, merge request ${ci.mr}` : ''}.
1. Its latest commit (\`git -C ${integ.where} rev-parse HEAD\`) is not on the remote yet → push it there again (same branch, never force).
2. Wait for the pipeline of that commit: read its state through glab, gh or the API, at least 60 s between reads, at most ${CI_WAIT_MIN} min in all — say so in note.
3. A job fails for a machine reason (disk full — « No space left on device », no runner accepting its tags, a timeout, the network) → retry that job once. It fails again for a machine reason → status "unavailable", with the cause, the job, the runner and the one action that would unblock it. No pipeline starts within 10 min → "unavailable" too.
4. A job fails because of the code (a test, a lint, a build) → status "code": for each failure, the criterion it hurts (ids: ${ids.join(', ')}) and the proof (job, failing test, log lines).
5. All green → "passed".
Never merge, tag or publish, and push nothing but that branch. This prompt is the exception to the « never push » rule, for that push only.

${COMMON_RULES}`, { ...HELPER, schema: CI_SCHEMA, phase: 'Contrôle final', label: `CI : attente du pipeline, ${stage} (opus ${HELPER.effort})` })
  ci.runs.push({ stage, status: res ? res.status : 'panne', pipeline: res ? res.pipeline : '', note: res ? res.note : '' })
  if (!res || res.status === 'unavailable') {
    ci.block = res
      ? { cause: res.cause, job: res.job, runner: res.runner, unblock: res.unblock, pipeline: res.pipeline }
      : { cause: "l'agent qui suit la CI n'a pas répondu, deux fois", job: '', runner: '', unblock: 'relancer le run', pipeline: '' }
    for (const id of ids) delete book[id].ci
    log(ciReason(ci.block))
    return
  }
  ci.block = null
  const hit = {}
  if (res.status === 'code') {
    for (const d of res.defects || []) {
      const k = String(d.id)
      if (ids.includes(k)) hit[k] = hit[k] ? `${hit[k]} / ${d.proof}` : d.proof
    }
    if (!Object.keys(hit).length) for (const id of ids.filter(isPub)) hit[id] = `pipeline en échec : ${res.pipeline}`
  }
  for (const id of ids) {
    if (hit[id]) book[id].ci = { verdict: 'defect', proof: `[CI] ${hit[id]}` }
    else if (book[id].ci) book[id].ci = { verdict: 'pass', proof: `CI verte : ${res.pipeline}` }
  }
  log(`CI ${res.status === 'passed' ? 'verte' : `en échec${Object.keys(hit).length ? ` : critère(s) ${Object.keys(hit).join(', ')}` : ''}`} (${res.pipeline})`)
}

// ---------------------------------------------------------------- run the groups
const groupResults = GROUPS.map(() => null)
const stoppedGroup = (g, status, reason) => ({
  group: g.id, criteria: g.criteria.map(c => c.id), where: '', branch: '', blocker: '', kind: '', integrated: false, removed: false,
  results: Object.fromEntries(g.criteria.map(c => [c.id, { status, rounds: 0, reason, ...(status === 'blocked' ? { kind: 'technique' } : {}) }])),
})
let nextGroup = 0
async function worker() {
  while (nextGroup < GROUPS.length) {
    const i = nextGroup++
    const g = GROUPS[i]
    if (overBudget(`le groupe ${g.id}`)) { groupResults[i] = stoppedGroup(g, 'blocked', `Arrêté : ${stopped}.`); continue }
    try {
      groupResults[i] = await runGroup(g)
    } catch (e) {
      groupResults[i] = stoppedGroup(g, 'crashed', "le groupe s'est arrêté sur une erreur (panne)")
    }
  }
}
if (GROUPS.length) await parallel(Array.from({ length: Math.min(MAX_GROUPS, GROUPS.length) }, () => () => worker()))
GROUPS.forEach((g, i) => { if (!groupResults[i]) groupResults[i] = stoppedGroup(g, 'crashed', "le groupe s'est arrêté sur une erreur (panne)") })
await fuseTail

// No group copy stays in the project for the final check: its folders (.venv, node_modules)
// disturb the project's own tools. Work never merged stays on its branch.
const leftovers = groupResults.filter(r => r.where && !r.removed)
if (leftovers.length) {
  let res = null
  try {
    res = await ask(`You tidy the copies of this run: no group copy may stay inside the project ${ROOT} (a copy's folders — .venv, node_modules — disturb the project's own tools and tests). For each copy below:
${leftovers.map(r => `- group ${r.group}: worktree ${r.where}, branch ${r.branch || '(none)'}, ${r.integrated ? 'merged: its work is on the integration branch' : 'NOT merged: its branch must keep its work'}`).join('\n')}
1. Not merged → keep its work on its branch: \`git -C <worktree> add -A\`, unstage ${DROP} (\`git -C <worktree> restore --staged --source=${BASE} -- <path>\`), then, if something is staged, \`git -C <worktree> commit -m "spec-first : groupe <n> (non intégré)"\`. Commit hooks always run, never --no-verify. No branch, or the commit fails → leave this copy in place and say why.
2. Remove the worktree: \`git -C ${ROOT} worktree remove --force <worktree>\` (refused, e.g. submodules → \`rm -rf <worktree> && git -C ${ROOT} worktree prune\`), then \`rmdir "$(dirname <worktree>)"\`.
3. Merged → also \`git -C ${ROOT} branch -D <branch>\`. Not merged → keep its branch.
Touch nothing else: no other copy or branch, no file of ${ROOT}.

${COMMON_RULES}`, { ...HELPER, schema: TIDY_SCHEMA, phase: 'Fusion', label: `Rangement des copies (opus ${HELPER.effort})` })
  } catch (e) {
    res = null
  }
  for (const r of leftovers) {
    const t = res && (res.copies || []).find(x => String(x.group) === r.group)
    if (t && t.removed) r.removed = true
  }
  log(`Copies de groupe rangées : ${leftovers.filter(r => r.removed).length}/${leftovers.length}`)
}

const status = {}
for (const r of groupResults) Object.assign(status, r.results)
for (const c of RECHECK) status[c.id] = { status: 'validated', earlierRun: true, reason: '', proof: 'validé par un run précédent de cette spec' }

// Where the result lives: the integration copy (something merged, or an interrupted run's branch) or the project.
const TARGET = integ.where && (integratedGroups.length || IB) ? integ.where : ROOT

// ================================================================= 3. final check
// Every passing criterion, this run's and the earlier run's, judged again on the whole result by a
// wider panel: one tester per three criteria, owner, maintainer, integrator, security — and the
// remote CI when it was started. What broke goes to one developer (effort escalation, triage); only
// the critics that did not pass it re-judge, plus the tester of every criterion sharing its files.
let finalCheck = null
const finalIds = ALL.filter(c => PASSING.includes((status[c.id] || {}).status)).map(c => c.id)
if (FINAL && finalIds.length && overBudget('le contrôle final')) {
  finalCheck = { skipped: stopped }
} else if (FINAL && finalIds.length) {
  phase('Contrôle final')
  const finalCriteria = finalIds.map(id => byId[id])
  const shares = []
  for (let i = 0; i < finalCriteria.length; i += TESTER_SHARE) shares.push(finalCriteria.slice(i, i + TESTER_SHARE))
  const defs = {}
  const testerOf = {}
  shares.forEach((cs, i) => {
    const k = `tester-${i + 1}`
    defs[k] = { ...seatDef(k), label: shares.length > 1 ? `testeur ${i + 1}` : 'testeur', final: true }
    for (const c of cs) testerOf[c.id] = k
  })
  const combined = integratedGroups.length > 1 || RECHECK.length > 0 || !!IB
  const others = ['owner', 'maintainer', ...(combined ? ['integrator'] : []), 'security']
  for (const k of others) defs[k] = seatDef(k, { final: true })
  const book = Object.fromEntries(finalIds.map(id => [id, {}]))
  const keysOf = c => [testerOf[c.id], ...others, ...(book[c.id].ci ? ['ci'] : [])]
  const parts = [
    integratedGroups.length ? `the validated work of ${integratedGroups.length} group(s), developed separately and merged one by one` : '',
    IB ? `on top of the integration branch ${IB} of an interrupted run` : '',
    RECHECK.length ? `with criteria ${RECHECK.map(c => c.id).join(', ')} that an earlier run of this spec validated` : '',
  ].filter(Boolean).join(', ') || 'the project as it stands'
  const ctx = `This is the final check of the spec, on the whole result: ${parts}. Look for what the parts broke in each other.
${changesHint(TARGET)}`
  const firstLog = suitePath('final-1')
  const seats = [
    ...shares.map((cs, i) => ({ ...defs[`tester-${i + 1}`], criteria: cs, fullSuite: i === 0, suiteLog: firstLog })),
    ...others.map(k => ({ ...defs[k], criteria: finalCriteria, suiteLog: firstLog })),
  ]
  await parallel([
    () => judgeSeats(seats, book, TARGET, ctx, 'Contrôle final', 'Contrôle final'),
    () => (ci.started ? ciWait('contrôle final', book) : Promise.resolve(null)),
  ])
  const verdicts = Object.fromEntries(finalCriteria.map(c => [c.id, judge(c, book, keysOf(c))]))
  let broken = finalCriteria.filter(c => verdicts[c.id].status === 'defect')
  finalCheck = { checked: finalIds, critics: seats.length, regressions: broken.map(c => c.id), repaired: [], repairRounds: 0 }
  log(`Contrôle final : ${seats.length} critiques (opus ${FINAL_CRITIC.effort})${ci.started ? ' et la CI' : ''} — ${finalIds.length - broken.length}/${finalIds.length} critère(s) tiennent`)
  const history = Object.fromEntries(finalIds.map(id => [id, []]))
  for (const c of broken) history[c.id].push({ round: 'contrôle final', proofs: verdicts[c.id].proofs.join(' / ') })
  const blockedBy = {}
  const crashed = new Set()
  const effortAt = {} // effort reached by the repair, per criterion
  let nudge = ''
  for (let round = 0; round < DEV_EFFORTS.length && broken.length; round++) {
    if (overBudget(`la réparation ${round + 1}`)) break
    const effort = DEV_EFFORTS[round]
    const holding = finalCriteria.filter(c => !broken.includes(c))
    const leads = broken.flatMap(c => verdicts[c.id].leads.map(l => `[${c.id}] ${l}`))
    const inIntegration = TARGET !== ROOT
    for (const c of broken) effortAt[c.id] = effort
    const dev = await ask(`You are the developer repairing the final check of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}. The final check judged every criterion on the whole result; the ones below broke. Repair them without breaking the others.

Spec: ${SPEC}
${holding.length ? `Must keep holding:\n${list(holding, 'holding_criteria')}\n` : ''}Broken:
${list(broken, 'broken_criteria')}
${nudge}${feedbackFor(broken, history, leads)}
${changesHint(TARGET)}

${inIntegration
    ? `Work in the integration copy ${TARGET} (branch ${integ.branch}): every file you edit is under it, never under ${ROOT}. When done, commit your changes on that branch. ${HOOK_RULE}`
    : `Work in the project at ${ROOT}. Do not commit: the run's result is committed once, at the end of the spec.`}
Fix only what broke. Re-run the reproductions and the targeted tests${quickTestCommand ? ` (\`${quickTestCommand}\`)` : ''} before returning; the full suite runs again in the re-check.
${portRule(takeSlot())}
Never run commands that rewrite files outside the broken criteria (repo-wide formatters, lockfile upgrades).
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec — or, starting with "${TECH}", a technical cause outside your changes stops you.

${COMMON_RULES}`, { model: 'opus', effort, schema: devSchema(broken.map(c => c.id)), phase: 'Contrôle final', label: `Réparation essai ${round + 1} (opus ${effort})` })
    finalCheck.repairRounds = round + 1
    if (!dev) {
      for (const c of broken) crashed.add(c.id)
      break
    }
    for (const d of dev.decisions || []) decisions.push(d)
    if (dev.blocker && !dev.changed) {
      for (const c of broken) blockedBy[c.id] = dev.blocker
      break
    }
    if (!dev.changed && !dev.blocker) {
      nudge = IDLE_NOTE
      log(`Réparation essai ${round + 1} (opus ${effort}) — rien changé, nouvel essai un cran plus haut`)
      continue
    }
    nudge = ''
    for (const c of broken) addFiles(c.id, dev.files)
    const reSeats = recheckSeats(broken, book, keysOf, defs).filter(s => s.key)
    // Criteria that held but share files with the repair: their tester checks them again.
    const touched = (dev.files || []).map(String)
    const sharing = holding.filter(c => (filesOf[c.id] || []).some(f => touched.includes(f)))
    for (const c of sharing) {
      const k = testerOf[c.id]
      let s = reSeats.find(x => x.key === k)
      if (!s) { s = { ...defs[k], criteria: [], previous: [] }; reSeats.push(s) }
      s.criteria.push(c)
      s.previous.push([c.id, book[c.id][k]])
    }
    // One critic runs the full suite: a repair can break what held.
    const suiteLog = suitePath(`final-${round + 2}`)
    const suite = reSeats.find(s => s.persona === 'tester') || reSeats[0]
    reSeats.forEach(s => { s.suiteLog = suiteLog; s.fullSuite = s === suite })
    const ciAgain = ci.started && broken.some(c => book[c.id].ci && book[c.id].ci.verdict === 'defect')
    await parallel([
      () => judgeSeats(reSeats, book, TARGET, `${ctx}
A repair was just made: ${dev.summary}. A test that passed before the repair and fails now is a defect of the criterion being repaired.`, 'Contrôle final', `Contrôle final — après réparation ${round + 1}`),
      () => (ciAgain ? ciWait(`réparation ${round + 1}`, book) : Promise.resolve(null)),
    ])
    const still = []
    for (const c of [...broken, ...sharing]) {
      const j = judge(c, book, keysOf(c))
      verdicts[c.id] = j
      if (j.status === 'defect') {
        still.push(c)
        history[c.id].push({ round: `réparation ${round + 1}`, proofs: j.proofs.join(' / ') })
      }
    }
    finalCheck.repaired.push(...broken.filter(c => !still.includes(c)).map(c => c.id))
    const newly = sharing.filter(c => still.includes(c)).map(c => c.id)
    finalCheck.regressions.push(...newly)
    log(`Réparation essai ${round + 1} (opus ${effort}) — ${broken.length - broken.filter(c => still.includes(c)).length}/${broken.length} réparé(s)${sharing.length ? `, ${sharing.length} critère(s) voisin(s) retesté(s)${newly.length ? ` dont ${newly.length} cassé(s)` : ''}` : ''} · rejugé par : ${[...reSeats.map(s => s.label), ...(ciAgain ? ['la CI'] : [])].join(', ') || 'personne'}`)
    if (dev.blocker) {
      for (const c of still) blockedBy[c.id] = dev.blocker
      break
    }
    broken = still
  }
  for (const c of finalCriteria) {
    const j = verdicts[c.id]
    const { kind, ...prev } = status[c.id] || {}
    const st = crashed.has(c.id) ? 'crashed' : blockedBy[c.id] ? 'blocked' : j.status === 'defect' ? 'failed' : j.status
    const reached = [prev.effortReached, effortAt[c.id]].filter(Boolean).sort((a, b) => DEV_EFFORTS.indexOf(b) - DEV_EFFORTS.indexOf(a))[0]
    status[c.id] = {
      ...prev,
      status: st,
      ...(st === 'blocked' ? { kind: kindOf(blockedBy[c.id]) } : {}),
      reason: crashed.has(c.id) ? "le développeur de la réparation n'a pas répondu, deux fois (panne)"
        : blockedBy[c.id] || (j.status === 'defect' ? j.proofs.join('\n') : (j.reason || '')),
      proof: j.proof || '',
      leads: j.leads,
      ...(reached ? { effortReached: reached } : {}),
    }
  }
}

// ================================================================= 4. publication
// Only what the owner authorized with his go, only once every other criterion is validated.
// The publication criteria were judged on everything but « it is published »: they are validated
// only when a tester checked them from outside, after the actions were applied.
let publication = null
if (PUBLISH) {
  const pubCriteria = PUBLISH.ids.map(id => byId[id])
  const hold = (reason, kind) => {
    for (const c of pubCriteria) {
      if ((status[c.id] || {}).status === 'validated') status[c.id] = { ...status[c.id], status: 'blocked', kind, reason }
    }
    publication = { done: false, rounds: 0, steps: [], reason }
    log(`Publication non lancée : ${reason}`)
  }
  const waiting = ALL.filter(c => (status[c.id] || {}).status !== 'validated').map(c => c.id)
  if (stopped) hold(`Arrêté : ${stopped}.`, 'technique')
  else if (ci.block) hold(ciReason(ci.block), 'technique')
  else if (!finalCheck || finalCheck.skipped) hold('le contrôle final n\'a pas eu lieu.', 'technique')
  else if (waiting.length) hold(`en attente des critère(s) ${waiting.join(', ')}, pas encore validé(s).`, 'technique')
  else {
    phase('Publication')
    publication = { done: false, rounds: 0, steps: [], reason: '' }
    const pbook = Object.fromEntries(PUBLISH.ids.map(id => [id, {}]))
    let feedback = ''
    let last = null
    let verdicts = {}
    for (let round = 0; round < DEV_EFFORTS.length; round++) {
      if (overBudget(`la publication, essai ${round + 1}`)) { publication.reason = `Arrêté : ${stopped}.`; break }
      const effort = DEV_EFFORTS[round]
      verdicts = {}
      last = await ask(`You are the PUBLISHER of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}. Every criterion of the spec passed the final check. ${authorized()}
Apply exactly them, in their order, to the run's result: ${TARGET === ROOT ? `the project at ${ROOT}` : `the integration copy ${TARGET} (branch ${integ.branch})`}.${ci.started ? ` Its branch was already pushed as ${ci.ref}${ci.mr ? `, with the draft merge request ${ci.mr}` : ''}: reuse them (mark the request ready before merging it, if the actions merge it).` : ''}
Criteria the publication must make true — a tester checks them from outside once you are done:
${list(pubCriteria, 'publication_criteria')}
${feedback}
- An action needs a commit (version, changelog, lock file) → commit it there; nothing else. Commit hooks always run, never --no-verify.
- Work through glab, gh, the registry's tool or the API, non-interactively. Never force-push, never rewrite history, nothing outside the list.
- Remote CI that must pass is part of the action: wait for it (long commands rule: API reads at least 60 s apart, at most ${CI_WAIT_MIN} min per pipeline). A job failing for a machine reason (disk full — « No space left on device », no runner, a timeout, the network) → retry it once; again → status "unavailable", with the cause, the job, the runner and the one action that would unblock it. A job failing because of the code → status "failed" with the proof; never patch the code here.
- An access is missing (token rights, registry login) → status "blocked", the access in reason.
- Already done by an earlier round or run (branch pushed, request open, tag present, version published) → keep it, don't redo it.
This prompt is the exception to the « never push or publish » rule, for the actions above only.
${portRule(takeSlot())}

${COMMON_RULES}`, { model: 'opus', effort, schema: PUB_SCHEMA, phase: 'Publication', label: `Publication essai ${round + 1} (opus ${effort})` })
      publication.rounds = round + 1
      if (!last) { publication.reason = "l'agent de publication n'a pas répondu, deux fois (panne)"; break }
      publication.steps = last.steps || []
      if (last.status === 'unavailable') {
        ci.block = { cause: last.cause, job: last.job, runner: last.runner, unblock: last.unblock, pipeline: '' }
        publication.reason = ciReason(ci.block)
        break
      }
      if (last.status === 'blocked') { publication.reason = last.reason || 'accès manquant'; break }
      if (last.status !== 'done') {
        publication.reason = last.reason || 'publication inachevée'
        feedback = `\nYour previous round did not finish: ${publication.reason}. Find why, fix it within the authorized actions, and finish; keep what is already done.\n`
        log(`Publication essai ${round + 1} (opus ${effort}) — inachevée : ${publication.reason}`)
        continue
      }
      const seat = seatDef('tester-publication', { label: 'testeur publication', final: true, publication: true, criteria: pubCriteria })
      await judgeSeats([seat], pbook, TARGET, `<publisher_report>
${publication.steps.map(s => `- ${s.action}: ${s.outcome}`).join('\n') || 'none'}
</publisher_report>
These are claims, not evidence: check each criterion yourself, from outside.`, 'Publication', `Publication essai ${round + 1}`)
      verdicts = Object.fromEntries(pubCriteria.map(c => [c.id, judge(c, pbook, ['tester-publication'])]))
      const bad = pubCriteria.filter(c => verdicts[c.id].status !== 'validated')
      log(`Publication essai ${round + 1} (opus ${effort}) — ${pubCriteria.length - bad.length}/${pubCriteria.length} critère(s) vérifié(s) de l'extérieur`)
      if (!bad.length) { publication.done = true; publication.reason = ''; break }
      publication.reason = 'le testeur publication a rejeté le résultat'
      // The tester could not look: doing the actions again would change nothing.
      if (bad.every(c => verdicts[c.id].status !== 'defect')) break
      feedback = `\nThe publication tester rejected the previous round:\n${bad.map(c => `[${c.id}] ${(verdicts[c.id].proofs || [verdicts[c.id].reason]).join(' / ')}`).join('\n')}\nFix what is missing within the authorized actions; keep what is already done.\n`
    }
    for (const c of pubCriteria) {
      const v = verdicts[c.id]
      const prev = status[c.id] || {}
      if (v && v.status === 'validated') status[c.id] = { ...prev, status: 'validated', proof: v.proof, published: true }
      else if (v) status[c.id] = { ...prev, status: v.status === 'defect' ? 'failed' : v.status, reason: v.status === 'defect' ? v.proofs.join('\n') : v.reason }
      else if (!last) status[c.id] = { ...prev, status: 'crashed', reason: `Publication : ${publication.reason}` }
      else if (ci.block || stopped) status[c.id] = { ...prev, status: 'blocked', kind: 'technique', reason: `Publication : ${publication.reason}` }
      else if (last.status === 'blocked') status[c.id] = { ...prev, status: 'blocked', kind: 'question', reason: `Publication : ${publication.reason}` }
      else status[c.id] = { ...prev, status: 'failed', reason: `Publication : ${publication.reason}` }
    }
  }
}

// ================================================================= report
// Only what deserves the owner's attention goes up; minor remarks are counted, not listed.
const seen = new Set()
const outside = outsideSpec.filter(o => {
  if (o.severity === 'low') return false
  const k = String(o.issue).toLowerCase().slice(0, 80)
  if (seen.has(k)) return false
  seen.add(k)
  return true
})
const outsideSpecMinor = outsideSpec.filter(o => o.severity === 'low').length
// One total, the same in the log and in the report: every criterion of the run counted once.
const STATUSES = ['validated', 'unverified', 'failed', 'blocked', 'crashed']
const criteria = ALL.map(c => ({ id: c.id, text: c.text, ...(status[c.id] && STATUSES.includes(status[c.id].status) ? status[c.id] : { ...(status[c.id] || {}), status: 'failed', reason: (status[c.id] || {}).reason || 'jamais jugé' }) }))
const counts = { total: criteria.length, validated: 0, unverified: 0, failed: 0, blocked: 0, crashed: 0 }
for (const c of criteria) counts[c.status] += 1
log(`Fin : ${counts.validated}/${counts.total} validé(s), ${counts.unverified} non vérifié(s), ${counts.failed} en échec, ${counts.blocked} bloqué(s)${counts.crashed ? `, ${counts.crashed} en panne` : ''}${stopped ? ' — arrêt avant la fin (budget)' : ''}`)

// What this run left on disk: the integration copy (removed by the skill after the squash) and the
// work of groups never merged (worktree, or only its branch once tidied).
const copies = groupResults
  .filter(r => (r.where && !r.removed) || (r.branch && !r.integrated))
  .map(r => ({ group: r.group, worktree: r.removed ? '' : r.where, branch: r.branch, integrated: r.integrated }))
if (integ.where) copies.push({ group: 'intégration', worktree: integ.where, branch: integ.branch, integrated: integratedGroups.length > 0 || !!IB })

return {
  specId: SPEC_ID,
  baseCommit: BASE,
  // Where the result is: in the project's working tree, uncommitted, or on the integration branch,
  // which the skill squashes into the project (`git merge --squash`) before the « spec » commit.
  result: TARGET === ROOT ? { in: 'project', path: ROOT } : { in: 'integration', worktree: integ.where, branch: integ.branch },
  groups: groupResults.map(r => ({ id: r.group, criteria: r.criteria, integrated: r.integrated })),
  copies,
  criteria,
  counts,
  blockers: groupResults.filter(r => r.blocker).map(r => ({ group: r.group, kind: r.kind || kindOf(r.blocker), question: r.blocker })),
  decisions: [...new Set(decisions)],
  outsideSpec: outside,
  outsideSpecMinor,
  fusions,
  finalCheck,
  ci: PUBLISH ? { started: ci.started, branch: ci.ref, mergeRequest: ci.mr, unavailable: ci.block, runs: ci.runs } : null,
  publication,
  stopped,
  testCommand,
  quickTestCommand,
  setupCommand,
}
