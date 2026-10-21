export const meta = {
  name: 'run',
  description: 'spec-first autonomous run: small groups of criteria developed all at once, each in its own copy; three Opus high critics per round, and after a rejection only the critics that did not pass re-judge; developer effort escalation with triage; each validated group merged at once into an integration branch that later rework starts from; reinforced final check of every criterion, repaired by one developer',
  whenToUse: 'Called by the spec-first skill after the owner gave his go on a spec. args: { specPath, projectRoot, baseCommit, criteria: [{ id, text }], groups?: [[ids]], testCommand?, setupCommand?, finalCheck?: boolean, recheck?: [{ id, text }], startEffort?: { [id]: "medium"|"high"|"xhigh" } } with absolute paths. Several groups: each developer works in a git worktree it creates under <projectRoot>/.spec-first/copies from baseCommit; every validated group is merged into one integration branch, which the skill squashes into the project at the end. finalCheck: false skips the final check (first run of a two-run spec); recheck: criteria an earlier run of the same spec validated, judged again in the final check; startEffort: the effort a relaunched criterion resumes from. projectRoot must be the top of a git repository with nothing uncommitted but the spec file: the skill makes it so before launching. Not for a bare slash-command call without args: tell the user to run /spec-first instead.',
  phases: [
    { title: 'Développement', detail: 'opus, one developer per group; medium, then high, then xhigh after each rejection, sorting each rejection first: a slip to fix or an approach to change' },
    { title: 'Critique', detail: 'opus high: tester, owner and maintainer judge each criterion blind to each other; after a rejection, only the critics that did not pass judge again' },
    { title: 'Fusion', detail: 'opus high: each group with a passing criterion is merged into the integration branch as soon as it is done, one at a time; later rework starts from it' },
    { title: 'Contrôle final', detail: 'opus xhigh: testers by three criteria, owner, maintainer, security (and integrator when parts were combined) re-check every criterion on the whole result; one developer repairs what broke, re-judged by the critics that did not pass it' },
  ],
}

// ---------------------------------------------------------------- models
// Opus only, medium at least. Opus max is never used here: it is the owner's call.
const DEV_EFFORTS = ['medium', 'high', 'xhigh'] // one tier up after each rejection
const CRITIC = { model: 'opus', effort: 'high' } // every critic during the run
const FINAL_CRITIC = { model: 'opus', effort: 'xhigh' } // every critic of the final check
const FUSION = { model: 'opus', effort: 'high' }
const TESTER_SHARE = 3 // criteria per tester in the final check

// ---------------------------------------------------------------- args
let input = args
if (typeof input === 'string') {
  try { input = JSON.parse(input) } catch (e) { input = null }
}
if (!input || !input.specPath || !input.projectRoot || !Array.isArray(input.criteria) || !input.criteria.length) {
  return { error: 'Missing args. Expected { specPath, projectRoot, baseCommit, criteria: [{ id, text }] } with absolute paths.' }
}
const SPEC = String(input.specPath)
const ROOT = String(input.projectRoot).replace(/\/+$/, '')
const normalize = cs => cs.map((c, i) =>
  typeof c === 'string' ? { id: String(i + 1), text: c } : { id: String(c.id != null ? c.id : i + 1), text: String(c.text || '') })
const CRITERIA = normalize(input.criteria)
// Criteria an earlier run of this spec validated: not developed here, judged again in the final check.
if (input.recheck != null && (!Array.isArray(input.recheck) || input.recheck.some(c => !c || typeof c !== 'object' || c.id == null))) {
  return { error: 'args.recheck must be an array of { id, text }.' }
}
const RECHECK = input.recheck ? normalize(input.recheck).map(c => ({ ...c, earlierRun: true })) : []
const FINAL = input.finalCheck !== false
if (!FINAL && RECHECK.length) return { error: 'args.recheck needs the final check: drop finalCheck: false.' }
const ALL = [...CRITERIA, ...RECHECK]
const allIds = ALL.map(c => c.id)
const dupIds = allIds.filter((id, i) => allIds.indexOf(id) !== i)
if (dupIds.length) return { error: `Criterion ids must be unique across criteria and recheck. Repeated: ${[...new Set(dupIds)].join(', ')}.` }
const byId = Object.fromEntries(ALL.map(c => [c.id, c]))

const testCommand = String(input.testCommand || '')
// What makes a fresh copy runnable (dependencies, files git ignores), run from the copy's root.
const setupCommand = String(input.setupCommand || '')
// The commit the run starts from: the skill passes `git rev-parse HEAD`, taken right before launch.
if (input.baseCommit != null && !/^[0-9a-f]{7,64}$/i.test(String(input.baseCommit))) {
  return { error: 'args.baseCommit must be a commit hash (`git rev-parse HEAD` in projectRoot).' }
}
const BASE = input.baseCommit ? String(input.baseCommit) : `$(git -C "${ROOT}" rev-parse HEAD)`
// The spec is the one file allowed to be uncommitted when the run starts.
const SPEC_REL = SPEC.startsWith(ROOT + '/') ? SPEC.slice(ROOT.length + 1) : ''
const CLEAN_CHECK = `git -C "${ROOT}" status --porcelain --untracked-files=no -- .${SPEC_REL ? ` ':(exclude)${SPEC_REL}'` : ''}`

// A relaunched criterion resumes from the effort it reached, instead of medium again.
const START = input.startEffort && typeof input.startEffort === 'object' ? input.startEffort : {}
for (const [id, e] of Object.entries(START)) {
  if (!byId[id] || !DEV_EFFORTS.includes(e)) return { error: `args.startEffort: unknown criterion "${id}" or effort "${e}" (medium, high, xhigh).` }
}

// Every agent gets its own ten ports, so servers started at the same time never collide.
let nextSlot = 0
const takeSlot = () => nextSlot++
const portsFor = slot => { const a = 20000 + 10 * (slot % 4500); return `${a}-${a + 9}` }
const portRule = slot => `Ports: anything you start that listens (a server, a service) uses only ports ${portsFor(slot)}, and you stop it before you return.`

// Groups come from the orchestrator, cut fine: one group per criterion unless two cannot be
// checked apart. Groups may touch the same files: the fusion resolves the conflicts.
// Without groups, one developer takes every criterion.
let groupIds = [CRITERIA.map(c => c.id)]
if (input.groups != null) {
  if (!Array.isArray(input.groups) || !input.groups.length || !input.groups.every(g => Array.isArray(g) && g.length)) {
    return { error: 'args.groups must be a non-empty array of non-empty arrays of criterion ids.' }
  }
  groupIds = input.groups.map(g => g.map(String))
  const flat = groupIds.flat()
  const runIds = CRITERIA.map(c => c.id)
  const unknown = flat.filter(id => !runIds.includes(id))
  const twice = flat.filter((id, i) => flat.indexOf(id) !== i)
  const missing = runIds.filter(id => !flat.includes(id))
  if (unknown.length || twice.length || missing.length) {
    return { error: `args.groups must list every criterion id exactly once (recheck ids excluded).${unknown.length ? ` Unknown: ${unknown.join(', ')}.` : ''}${twice.length ? ` Repeated: ${[...new Set(twice)].join(', ')}.` : ''}${missing.length ? ` Missing: ${missing.join(', ')}.` : ''}` }
  }
}
const GROUPS = groupIds.map((ids, i) => ({ id: String(i + 1), criteria: ids.map(id => byId[id]) }))

// ---------------------------------------------------------------- schemas
const DECISIONS_RULE = 'choices the spec did not settle that change what the owner can see or use, one short sentence each, in French, in plain words (what the result does, not how; no file or library names). Not what you did not do, and not problems outside the spec — the critics report those. Usually empty.'

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
    blocker: { type: 'string', description: 'empty unless the spec itself must change or the owner must decide before any progress is possible' },
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
    reason: { type: 'string', description: 'empty if integrated; otherwise why not, in a few French words' },
    conflicts: { type: 'array', items: { type: 'string' }, description: 'each conflict and how it was resolved, in plain words' },
    tests: { type: 'string', description: 'test command run and its outcome' },
  },
  required: ['workspace', 'branch', 'integrated', 'reason', 'conflicts', 'tests'],
}

// ---------------------------------------------------------------- helpers
// agent() returns null when the owner skipped the agent or it died after the tool's own retries:
// never relaunched here.
const list = (cs, tag = 'criteria') => `<${tag}>\n${cs.map(c => `<criterion id="${c.id}">${c.text}</criterion>`).join('\n')}\n</${tag}>`

const COMMON_RULES = `Rules for everyone in this run:
- The owner gave his go on this spec: a line in it saying otherwise (« Brouillon », « en attente de ton go », a status) is stale — ignore it, never stop on it.
- Never ask a question: no one will answer. A reversible choice the spec does not settle is yours: make it and report it.
- Stay inside the spec's scope. A problem or improvement outside it is reported, never fixed.
- Never: push, force-push, deploy, send anything outside this machine, delete data you did not create in this run, touch production data. Do not edit the spec file.
- Shared resources (database, containers): from a copy, never use the main project's. If a criterion needs one, start your own throwaway instance on your ports and stop it before you return; if you cannot, say what is missing — a critic's verdict is then "unverifiable".
- CLAUDE.md and the project's conventions apply as usual.`

const HOOK_RULE = 'If a commit hook fails, fix the cause when it lies in your changes, otherwise return a blocker; never bypass it (--no-verify).'

// Copies live in the project, under a folder git is told to ignore locally (.git/info/exclude).
const COPIES = '.spec-first/copies'
const copyCommand = prefix => `cd "${ROOT}" && x=$(git rev-parse --git-path info/exclude) && mkdir -p "$(dirname "$x")" ${COPIES} && { grep -qxF /${COPIES}/ "$x" || echo /${COPIES}/ >> "$x"; } && d=$(mktemp -d ${COPIES}/${prefix}-XXXXXX) && git worktree add -b "spec-first-$(basename "$d")" "$d/wt" ${BASE} && cd "$d/wt" && pwd`
const PREPARE = `${setupCommand
  ? `Prepare it right after creating it: run \`${setupCommand}\` from its root.`
  : `If the project needs what git ignores to run, install its dependencies in the copy the project's usual way and copy its local config (e.g. .env) from ${ROOT}.`} Never link the project's own dependency folders (.venv, node_modules): the tests would run the project's code, not the copy's. A copy holds tracked files only; never commit what you add to prepare it.`

// What changed in a tree since the run started.
const changesHint = tree => `Changes of this run: \`git -C ${tree} diff ${BASE}\` (the commit the run started from), plus the files \`git -C ${tree} status --porcelain\` lists as untracked (??). The spec file is not part of the change.`

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
const IN_RUN = ['tester', 'owner', 'maintainer']
const personaOf = key => key.split('-')[0]
const seatDef = (key, extra = {}) => ({ key, persona: personaOf(key), label: PERSONAS[personaOf(key)].label, ...extra })

// A seat = one critic judging some criteria. fullSuite: the one seat of a panel that runs the whole
// test suite. previous: its own earlier verdicts, when it judges again after a rework.
function panelPrompt(seat, where, context, slot) {
  const p = PERSONAS[seat.persona]
  const tests = !testCommand ? ''
    : seat.fullSuite
      ? `Project tests: \`${testCommand}\` — run the full suite from ${where}; in this panel, you alone run it. A test that passed before this run and fails now is a defect of the criterion whose change broke it.`
      : seat.persona === 'tester'
        ? `Project tests (\`${testCommand}\`): run only the tests that cover your criteria; the full suite is run elsewhere.`
        : 'Run only targeted tests; the full suite is run elsewhere.'
  const previous = seat.previous && seat.previous.length ? `
<your_previous_verdicts>
${seat.previous.map(([id, v]) => `[${id}] ${v ? `${v.verdict}: ${v.proof}` : 'no verdict'}`).join('\n')}
</your_previous_verdicts>
The developer reworked since then. First check that what you reported is fixed, then judge each criterion afresh on the real result.` : ''
  return `${p.brief}${seat.final && p.finalNote ? ` ${p.finalNote}` : ''}

You are an independent critic. You do not see the other critics; do not try to agree with anyone. Your job is to find real defects and prove them, not to approve.

Spec: ${SPEC} (read it first: goal, criteria, out of scope).
Criteria to judge — only these:
${list(seat.criteria)}
The spec's other criteria are handled elsewhere and may not be done yet: that is expected, never report it. Uncommitted or untracked files are expected — the run commits its result at the end: never report them.
${previous}
The result lives in: ${where}
${context}
${tests}

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
async function judgeSeats(seats, book, where, context, phaseTitle, tag) {
  const reviews = await parallel(seats.map(s => () => agent(panelPrompt(s, where, context, takeSlot()), {
    ...(s.final ? FINAL_CRITIC : CRITIC), schema: panelSchema(s.criteria.map(c => c.id)), phase: phaseTitle,
    label: `${tag} — ${s.label} (opus ${(s.final ? FINAL_CRITIC : CRITIC).effort})`,
  })))
  seats.forEach((s, i) => {
    const r = reviews[i]
    if (r) for (const o of r.outsideSpec || []) outsideSpec.push(o)
    for (const c of s.criteria) {
      book[c.id][s.key] = r && r.verdicts && typeof r.verdicts === 'object' ? r.verdicts[c.id] || null : null
    }
  })
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
  if (missing.length) return { status: 'unverified', reason: `aucun verdict de : ${missing.join(', ')}`, leads }
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

// ================================================================= 1. groups at once
// Several groups: each developer works in its own git worktree made from BASE, all at the same
// time, with no cap on their number. One group: the developer works in the project itself.
// A clean repository is a precondition the skill checks before launch: there is no sequential
// fallback — if a copy still cannot be made, the group is blocked and the owner is told why.
const MODE = GROUPS.length > 1 ? 'worktree' : 'shared'
const ISOLATION = 'ISOLATION:'
const PASSING = ['validated', 'unverified']
// The in-run tester runs the full suite only when nothing else will: no fusion, no final check.
const IN_RUN_FULL_SUITE = MODE === 'shared' && !FINAL
log(`${CRITERIA.length} critère(s), ${GROUPS.length} groupe(s), ${MODE === 'worktree' ? 'tous en même temps, chacun dans sa copie' : 'un seul développeur, dans le projet'}${RECHECK.length ? `, ${RECHECK.length} critère(s) d'un run précédent à rejuger` : ''}${FINAL ? '' : ', sans contrôle final'}`)

const decisions = []
const integ = { where: '', branch: '' } // the integration copy, created by the first fusion
const integratedGroups = []
const fusions = []

function workspaceRule(g, where, branch) {
  if (MODE === 'shared') {
    return `Work directly in the project at ${ROOT}. Do not commit: the run's result is committed once, at the end of the spec.`
  }
  if (where) {
    return `Your workspace is your copy ${where} (branch ${branch}), made in an earlier round. Every file you edit must be under it, never under ${ROOT}. Read the spec at ${SPEC}. When done, commit all your changes on that branch. ${HOOK_RULE}`
  }
  return `Other developers work on other criteria at the same time, so you work in your own copy of the project. First check that one can be made: ${ROOT} is the top of a git repository (\`git -C ${ROOT} rev-parse --show-toplevel\` prints ${ROOT} or the same folder through a symlink) and has no uncommitted change besides the spec (\`${CLEAN_CHECK}\` prints nothing). If a check fails, change nothing, create nothing, and return a blocker starting with "${ISOLATION}" and the reason in a few French words.
Otherwise create your copy from commit ${BASE}, whatever the branch:
\`${copyCommand(`g${g.id}`)}\`
Work only in that copy: every file you edit must be under it, never under ${ROOT}. Read the spec at ${SPEC}: your copy may lack it or hold an older version.
${PREPARE}
When done, commit all your changes on that branch (it is temporary: the run merges it; the copy is removed at the end of the spec). ${HOOK_RULE} Return that copy as workspace and its branch as branch, even if you changed nothing. These checks and this copy are plumbing: never mention them in decisions.`
}

const hasPassing = r => r.criteria.some(id => PASSING.includes((r.results[id] || {}).status))
const keepBlocked = (r, reason) => {
  for (const id of r.criteria) {
    if (PASSING.includes((r.results[id] || {}).status)) r.results[id] = { ...r.results[id], status: 'blocked', reason }
  }
}

async function runGroup(g, groupIndex) {
  const tag = `Groupe ${g.id}`
  const ids = g.criteria.map(c => c.id)
  const results = {}
  const book = Object.fromEntries(ids.map(id => [id, {}]))
  const history = Object.fromEntries(ids.map(id => [id, []]))
  const defs = Object.fromEntries(IN_RUN.map(k => [k, seatDef(k, { fullSuite: IN_RUN_FULL_SUITE && k === 'tester' })]))
  const start = Math.max(0, ...ids.map(id => DEV_EFFORTS.indexOf(START[id] || DEV_EFFORTS[0])))
  let pending = g.criteria.slice()
  let where = MODE === 'worktree' ? '' : ROOT
  let branch = ''
  let feedback = ''
  let blocker = ''
  for (let round = 0; round < DEV_EFFORTS.length && pending.length; round++) {
    const effort = DEV_EFFORTS[Math.min(start + round, DEV_EFFORTS.length - 1)]
    const isolated = MODE === 'worktree' && !where
    const done = g.criteria.filter(c => !pending.includes(c))
    // Rework starts from what is already merged, not from the run's first commit.
    const catchUp = MODE === 'worktree' && round > 0 && integ.branch ? `
First bring in what other groups already merged, so your fix starts from it: \`git -C ${where} merge --no-edit ${integ.branch}\`. A conflict → resolve it keeping both intents, then commit. New dependencies came in → prepare your copy again. Never rebase, reset or stash.` : ''
    const devPrompt = `You are the developer for part of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}.

Spec: ${SPEC} — read it first (goal, criteria, out of scope).
Your criteria:
${list(pending)}
${done.length ? `Already validated in this group — keep them working:\n${list(done, 'validated_criteria')}\n` : ''}Other criteria of the spec belong to other developers, who may touch the same files: do not implement them.

${workspaceRule(g, MODE === 'worktree' ? where : ROOT, branch)}${catchUp}
${portRule(takeSlot())}
${feedback}${testCommand ? `\nProject tests: \`${testCommand}\`.` : ''}
An independent panel judges every criterion on the real result.
Never run commands that rewrite files outside your criteria (repo-wide formatters, lockfile upgrades). If you need a new dependency, add it the project's usual way and say so in your summary.
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec.

${COMMON_RULES}`
    const dev = await agent(devPrompt, {
      model: 'opus', effort, schema: devSchema(ids), phase: 'Développement',
      label: `${tag} — dév essai ${round + 1} (opus ${effort})`,
    })
    if (!dev) {
      for (const c of pending) results[c.id] = { status: 'failed', rounds: round + 1, effortReached: effort, reason: "le développeur n'a pas répondu" }
      pending = []
      break
    }
    if (isolated) {
      const ws = String(dev.workspace || '').replace(/\/+$/, '')
      const iso = String(dev.blocker || '').startsWith(ISOLATION)
      if (iso || !ws || ws === ROOT) {
        const why = iso ? dev.blocker.slice(ISOLATION.length).trim() : 'le développeur n’a pas rendu de copie isolée'
        const reason = `Copie isolée impossible : ${why || 'raison inconnue'}.`
        for (const c of pending) results[c.id] = { status: 'blocked', rounds: round + 1, reason }
        const kept = ws && ws !== ROOT
        return { group: g.id, criteria: ids, where: kept ? ws : '', branch: kept ? String(dev.branch || '') : '', results, blocker: reason, integrated: false }
      }
      where = ws
      branch = String(dev.branch || '')
    }
    for (const d of dev.decisions || []) decisions.push(d)
    const triage = Object.fromEntries((dev.triage || []).map(t => [String(t.id), `${t.kind}: ${t.why}`]))
    if (dev.blocker) {
      blocker = dev.blocker
      if (!dev.changed) {
        for (const c of pending) results[c.id] = { status: 'blocked', rounds: round + 1, effortReached: effort, reason: blocker }
        pending = []
        break
      }
    }
    const context = `<developer_claims>
Summary: ${dev.summary}
Self-check: ${(dev.selfCheck || []).map(s => `[${s.id}] ${s.status}: ${s.evidence}`).join(' | ') || 'none'}
</developer_claims>
These are claims, not evidence.
${changesHint(where)}${catchUp ? ' Work of other groups merged into this copy is part of that diff: judge only your criteria.' : ''}`
    const seats = round === 0 ? IN_RUN.map(k => ({ ...defs[k], criteria: pending })) : recheckSeats(pending, book, () => IN_RUN, defs)
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
      // The developer said the spec must change: another round cannot fix that.
      for (const c of rejected) results[c.id] = { ...results[c.id], status: 'blocked', reason: blocker }
      pending = []
      break
    }
    feedback = rejected.length ? feedbackFor(rejected, history, leads) : ''
    pending = rejected
  }
  const r = { group: g.id, criteria: ids, where: MODE === 'worktree' ? where : '', branch, results, blocker, integrated: false }
  if (MODE === 'worktree' && r.where && hasPassing(r)) {
    if (!r.branch) keepBlocked(r, `Copie rendue sans nom de branche — travail conservé dans ${r.where}.`)
    else await fuseQueued(r)
  }
  return r
}

// ================================================================= 2. fusion, group by group
// A group with a validated or unverified criterion is merged as soon as it is done, into one
// integration branch, one fusion at a time; the rework of other groups then starts from it.
// The fusion brings in exactly what the critics judged and deletes nothing: every copy stays until
// the end of the spec (§8 of the skill). A criterion is never validated if its work is not merged.
let fuseTail = Promise.resolve()
function fuseQueued(r) {
  const p = fuseTail.then(() => fuse(r))
  fuseTail = p.then(() => {}, () => {})
  return p
}

async function fuse(r) {
  const create = !integ.where
  const already = integratedGroups.map(x => `group ${x.group} (criteria ${x.criteria.join(', ')})`).join(', ')
  const res = await agent(`You are the integrator. Developers work in parallel, each in its own git worktree made from commit ${BASE} of the project at ${ROOT}. Each group the critics validated is merged, as soon as it is done, into one integration branch; later rework starts from it. Merge group ${r.group} now.

Spec: ${SPEC}
Group ${r.group}: worktree ${r.where}, branch ${r.branch}, statuses ${r.criteria.map(id => `${id}=${r.results[id].status}`).join(', ')}
${list(r.criteria.map(id => byId[id]))}
${already ? `Already merged, must keep working: ${already}.` : 'No group merged yet.'}

1. ${create
    ? `No integration copy exists yet: create it — \`${copyCommand('integration')}\` — then prepare it. ${PREPARE}`
    : `The integration copy is ${integ.where} (branch ${integ.branch}).`} Return its path as workspace and its branch as branch.
2. Make the group's branch hold exactly what its critics judged, in ${r.where}:
   - stage everything: \`git -C ${r.where} add -A\`
   - check the list \`git -C ${r.where} diff --cached --name-only ${BASE}\` and drop what is not the group's work — local config copied in (.env), dependency folders, caches, build outputs: \`git -C ${r.where} restore --staged --source=${BASE} -- <path>\` (drops it even if the developer committed it)
   - something staged → \`git -C ${r.where} commit -m "spec-first : groupe ${r.group}"\`
3. Merge it: \`git -C <integration copy> merge --no-ff --no-edit ${r.branch}\`. Conflict → resolve the markers so this group's criteria and the merged groups' all still hold (read both sides, keep both intents), then \`git add\` and \`git commit --no-edit\`. Never run \`reset\`, \`rebase\`, \`stash\`, \`checkout\` or \`cherry-pick\` in the integration copy: they can wipe groups already merged.
4. A dependency came in → install it in the integration copy the usual way. Run the project tests${testCommand ? ` (\`${testCommand}\`)` : ''} from the integration copy; fix what the merge broke — only that — and commit the fix. ${HOOK_RULE}
5. Leave every copy and branch in place: they are removed at the end of the spec. Never edit ${ROOT}'s own files or switch its branch. Cannot merge → integrated false and the reason.
${portRule(takeSlot())}

${COMMON_RULES}`, { ...FUSION, schema: FUSION_SCHEMA, phase: 'Fusion', label: `Fusion groupe ${r.group} (opus ${FUSION.effort})` })
  if (res && create) {
    const ws = String(res.workspace || '').replace(/\/+$/, '')
    if (ws && ws !== ROOT && res.branch) { integ.where = ws; integ.branch = String(res.branch) }
  }
  if (res) fusions.push({ group: r.group, integrated: !!res.integrated, reason: res.reason, conflicts: res.conflicts, tests: res.tests })
  if (res && res.integrated && integ.where) {
    r.integrated = true
    integratedGroups.push(r)
    log(`Fusion : groupe ${r.group} intégré (${integratedGroups.length} au total)${(res.conflicts || []).length ? `, ${res.conflicts.length} conflit(s) résolu(s)` : ''}`)
  } else {
    keepBlocked(r, `Non intégré — travail conservé sur la branche ${r.branch}.${res && res.reason ? ` ${res.reason}` : ''}`)
    log(`Fusion : groupe ${r.group} non intégré, copie conservée`)
  }
}

const groupResults = (await parallel(GROUPS.map((g, gi) => () => runGroup(g, gi)))).map((r, i) => r || {
  group: GROUPS[i].id, criteria: GROUPS[i].criteria.map(c => c.id), where: '', branch: '', blocker: '', integrated: false,
  results: Object.fromEntries(GROUPS[i].criteria.map(c => [c.id, { status: 'failed', rounds: 0, reason: "le groupe s'est arrêté sur une erreur" }])),
})
await fuseTail

const status = {}
for (const r of groupResults) Object.assign(status, r.results)
for (const c of RECHECK) status[c.id] = { status: 'validated', earlierRun: true, reason: '', proof: 'validé par un run précédent de cette spec' }

// Where the result lives: the integration copy (several groups, something merged) or the project.
const TARGET = MODE === 'worktree' && integ.where && integratedGroups.length ? integ.where : ROOT

// ================================================================= 3. final check
// Every passing criterion, this run's and the earlier run's, judged again on the whole result by a
// wider panel: one tester per three criteria, owner, maintainer, integrator, security. What broke
// goes to one developer (effort escalation, triage); only the critics that did not pass it re-judge.
let finalCheck = null
const finalIds = ALL.filter(c => PASSING.includes((status[c.id] || {}).status)).map(c => c.id)
if (FINAL && finalIds.length) {
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
  const combined = MODE === 'worktree' || RECHECK.length > 0
  const others = ['owner', 'maintainer', ...(combined ? ['integrator'] : []), 'security']
  for (const k of others) defs[k] = seatDef(k, { final: true })
  const keysOf = c => [testerOf[c.id], ...others]
  const book = Object.fromEntries(finalIds.map(id => [id, {}]))
  const parts = [
    MODE === 'worktree' ? `the validated work of ${integratedGroups.length} group(s), developed separately and merged one by one` : 'the work of one developer',
    RECHECK.length ? `on top of an earlier run of this spec, whose criteria ${RECHECK.map(c => c.id).join(', ')} passed before this run started` : '',
  ].filter(Boolean).join(', ')
  const ctx = `This is the final check of the spec, on the whole result: ${parts}. Look for what the parts broke in each other.
${changesHint(TARGET)}`
  const seats = [
    ...shares.map((cs, i) => ({ ...defs[`tester-${i + 1}`], criteria: cs, fullSuite: i === 0 })),
    ...others.map(k => ({ ...defs[k], criteria: finalCriteria })),
  ]
  await judgeSeats(seats, book, TARGET, ctx, 'Contrôle final', 'Contrôle final')
  const verdicts = Object.fromEntries(finalCriteria.map(c => [c.id, judge(c, book, keysOf(c))]))
  let broken = finalCriteria.filter(c => verdicts[c.id].status === 'defect')
  finalCheck = { checked: finalIds, critics: seats.length, regressions: broken.map(c => c.id), repaired: [], repairRounds: 0 }
  log(`Contrôle final : ${seats.length} critiques (opus ${FINAL_CRITIC.effort}) — ${finalIds.length - broken.length}/${finalIds.length} critère(s) tiennent`)
  const history = Object.fromEntries(finalIds.map(id => [id, []]))
  for (const c of broken) history[c.id].push({ round: 'contrôle final', proofs: verdicts[c.id].proofs.join(' / ') })
  const blockedBy = {}
  for (let round = 0; round < DEV_EFFORTS.length && broken.length; round++) {
    const effort = DEV_EFFORTS[round]
    const holding = finalCriteria.filter(c => !broken.includes(c))
    const leads = broken.flatMap(c => verdicts[c.id].leads.map(l => `[${c.id}] ${l}`))
    const inIntegration = TARGET !== ROOT
    const dev = await agent(`You are the developer repairing the final check of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}. The final check judged every criterion on the whole result; the ones below broke. Repair them without breaking the others.

Spec: ${SPEC}
${holding.length ? `Must keep holding:\n${list(holding, 'holding_criteria')}\n` : ''}Broken:
${list(broken, 'broken_criteria')}
${feedbackFor(broken, history, leads)}
${changesHint(TARGET)}

${inIntegration
    ? `Work in the integration copy ${TARGET} (branch ${integ.branch}): every file you edit is under it, never under ${ROOT}. When done, commit your changes on that branch. ${HOOK_RULE}`
    : `Work in the project at ${ROOT}. Do not commit: the run's result is committed once, at the end of the spec.`}
Fix only what broke. Re-run the reproductions and the project tests${testCommand ? ` (\`${testCommand}\`)` : ''} before returning.
${portRule(takeSlot())}
Never run commands that rewrite files outside the broken criteria (repo-wide formatters, lockfile upgrades).
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec.

${COMMON_RULES}`, { model: 'opus', effort, schema: devSchema(broken.map(c => c.id)), phase: 'Contrôle final', label: `Réparation essai ${round + 1} (opus ${effort})` })
    finalCheck.repairRounds = round + 1
    if (!dev) break
    for (const d of dev.decisions || []) decisions.push(d)
    if (dev.blocker && !dev.changed) {
      for (const c of broken) blockedBy[c.id] = dev.blocker
      break
    }
    const reSeats = recheckSeats(broken, book, keysOf, defs)
    // One critic runs the full suite: a repair can break what held.
    const suite = reSeats.find(s => s.persona === 'tester') || reSeats[0]
    if (suite) suite.fullSuite = true
    await judgeSeats(reSeats, book, TARGET, `${ctx}
A repair was just made: ${dev.summary}. A test that passed before the repair and fails now is a defect of the criterion being repaired.`, 'Contrôle final', `Contrôle final — après réparation ${round + 1}`)
    const still = []
    for (const c of broken) {
      const j = judge(c, book, keysOf(c))
      verdicts[c.id] = j
      if (j.status === 'defect') {
        still.push(c)
        history[c.id].push({ round: `réparation ${round + 1}`, proofs: j.proofs.join(' / ') })
      }
    }
    finalCheck.repaired.push(...broken.filter(c => !still.includes(c)).map(c => c.id))
    log(`Réparation essai ${round + 1} (opus ${effort}) — ${broken.length - still.length}/${broken.length} réparé(s) · rejugé par : ${reSeats.map(s => s.label).join(', ')}`)
    if (dev.blocker) {
      for (const c of still) blockedBy[c.id] = dev.blocker
      break
    }
    broken = still
  }
  for (const c of finalCriteria) {
    const j = verdicts[c.id]
    status[c.id] = {
      ...status[c.id],
      status: blockedBy[c.id] ? 'blocked' : j.status === 'defect' ? 'failed' : j.status,
      reason: blockedBy[c.id] || (j.status === 'defect' ? j.proofs.join('\n') : (j.reason || '')),
      proof: j.proof || '',
      leads: j.leads,
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
const counts = { validated: 0, unverified: 0, failed: 0, blocked: 0 }
for (const c of ALL) counts[(status[c.id] || { status: 'failed' }).status] += 1
log(`Fin : ${counts.validated}/${ALL.length} validé(s), ${counts.unverified} non vérifié(s), ${counts.failed} en échec, ${counts.blocked} bloqué(s)`)

const copies = groupResults.filter(r => r.where).map(r => ({ group: r.group, worktree: r.where, branch: r.branch, integrated: r.integrated }))
if (integ.where) copies.push({ group: 'intégration', worktree: integ.where, branch: integ.branch, integrated: integratedGroups.length > 0 })

return {
  mode: MODE,
  baseCommit: BASE,
  // Where the result is: in the project's working tree, uncommitted, or on the integration branch,
  // which the skill squashes into the project (`git merge --squash`) before the « spec » commit.
  result: TARGET === ROOT ? { in: 'project', path: ROOT } : { in: 'integration', worktree: integ.where, branch: integ.branch },
  groups: groupResults.map(r => ({ id: r.group, criteria: r.criteria, integrated: MODE === 'shared' || r.integrated })),
  // Every copy this run made, still on disk. At the end of the spec the clean-up removes the
  // integrated ones (their work is in the « spec » commit); the others wait for the owner's yes.
  copies,
  criteria: ALL.map(c => ({ id: c.id, text: c.text, ...(status[c.id] || { status: 'failed', reason: 'jamais jugé' }) })),
  counts,
  blockers: groupResults.filter(r => r.blocker).map(r => ({ group: r.group, question: r.blocker })),
  decisions: [...new Set(decisions)],
  outsideSpec: outside,
  outsideSpecMinor,
  fusions,
  finalCheck,
  testCommand,
  setupCommand,
}
