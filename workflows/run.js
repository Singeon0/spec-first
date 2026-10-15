export const meta = {
  name: 'run',
  description: 'spec-first autonomous run: one developer per group of independent criteria, three-critic panel one effort tier above the developer, effort escalation, fusion, final check of every criterion',
  whenToUse: 'Called by the spec-first skill after the owner gave his go on a spec. args: { specPath, projectRoot, criteria: [{ id, text }], groups?: [[ids]], testCommand?, parallel? } with absolute paths; parallel: false when isolated git worktrees cannot serve: they start from the latest commit of the default branch of the session repository, so the project must be that repository, on that commit, with no uncommitted change. Not for a bare slash-command call without args: tell the user to run /spec-first instead.',
  phases: [
    { title: 'Développement', detail: 'opus, one developer per group of criteria; medium, then high, then xhigh after each rejection' },
    { title: 'Critique', detail: 'opus, one tier above the developer (high, then xhigh): tester, owner and maintainer judge each criterion blind to each other' },
    { title: 'Fusion', detail: 'opus high: integrates the isolated groups into the project tree' },
    { title: 'Contrôle final', detail: 'opus, one tier above the highest developer effort: the panel re-checks every criterion on the integrated result' },
  ],
}

// ---------------------------------------------------------------- models
// One role, one model. Opus max is never used here: it is the owner's call.
const DEV_EFFORTS = ['medium', 'high', 'xhigh'] // one tier up after each rejection
// Critics run one tier above the developer they judge: medium → high, high and xhigh → xhigh.
const TIERS = ['low', 'medium', 'high', 'xhigh']
const criticEffort = devEffort => TIERS[Math.min(TIERS.indexOf(devEffort) + 1, TIERS.length - 1)]
const FUSION = { model: 'opus', effort: 'high' }
const REPAIR = { model: 'opus', effort: 'xhigh' }

// ---------------------------------------------------------------- args
let input = args
if (typeof input === 'string') {
  try { input = JSON.parse(input) } catch (e) { input = null }
}
if (!input || !input.specPath || !input.projectRoot || !Array.isArray(input.criteria) || !input.criteria.length) {
  return { error: 'Missing args. Expected { specPath, projectRoot, criteria: [{ id, text }] } with absolute paths.' }
}
const SPEC = input.specPath
const ROOT = String(input.projectRoot).replace(/\/+$/, '')
const CRITERIA = input.criteria.map((c, i) =>
  typeof c === 'string' ? { id: String(i + 1), text: c } : { id: String(c.id != null ? c.id : i + 1), text: String(c.text || '') })
const byId = Object.fromEntries(CRITERIA.map(c => [c.id, c]))

const testCommand = String(input.testCommand || '')

// Groups come from the orchestrator: criteria that may touch the same files share a group
// (one developer). Without groups, one developer takes every criterion.
let groupIds = [CRITERIA.map(c => c.id)]
if (input.groups != null) {
  if (!Array.isArray(input.groups) || !input.groups.length || !input.groups.every(g => Array.isArray(g) && g.length)) {
    return { error: 'args.groups must be a non-empty array of non-empty arrays of criterion ids.' }
  }
  groupIds = input.groups.map(g => g.map(String))
  const flat = groupIds.flat()
  const unknown = flat.filter(id => !byId[id])
  const twice = flat.filter((id, i) => flat.indexOf(id) !== i)
  const missing = CRITERIA.map(c => c.id).filter(id => !flat.includes(id))
  if (unknown.length || twice.length || missing.length) {
    return { error: `args.groups must list every criterion id exactly once.${unknown.length ? ` Unknown: ${unknown.join(', ')}.` : ''}${twice.length ? ` Repeated: ${[...new Set(twice)].join(', ')}.` : ''}${missing.length ? ` Missing: ${missing.join(', ')}.` : ''}` }
  }
}
const GROUPS = groupIds.map((ids, i) => ({ id: String(i + 1), criteria: ids.map(id => byId[id]) }))

// ---------------------------------------------------------------- schemas
const DEV_SCHEMA = {
  type: 'object',
  properties: {
    workspace: { type: 'string', description: 'absolute path of the tree you worked in (`git rev-parse --show-toplevel`, or the project root if not a repo)' },
    branch: { type: 'string', description: 'current branch of that tree, empty if not a repo' },
    changed: { type: 'boolean', description: 'true if you modified or created any file' },
    files: { type: 'array', items: { type: 'string' }, description: 'every file you created, modified or deleted in this round, relative to your workspace' },
    summary: { type: 'string', description: 'what the result now does, in two or three sentences' },
    selfCheck: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['pass', 'fail', 'not run'] },
          evidence: { type: 'string' },
        },
        required: ['id', 'status', 'evidence'],
      },
    },
    decisions: { type: 'array', items: { type: 'string' }, description: 'choices the spec did not settle that change what the owner can see or use, one short sentence each, in French, in plain words (what the result does, not how; no file or library names). Not what you did not do, and not problems outside the spec — the critics report those. Usually empty.' },
    blocker: { type: 'string', description: 'empty unless the spec itself must change or the owner must decide before any progress is possible' },
  },
  required: ['workspace', 'branch', 'changed', 'files', 'summary', 'selfCheck', 'decisions', 'blocker'],
}

const PANEL_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['pass', 'defect', 'unverifiable'] },
          proof: { type: 'string', description: 'what you ran or read and what you observed; for a defect, the reproduction' },
          note: { type: 'string' },
        },
        required: ['id', 'verdict', 'proof'],
      },
    },
    outsideSpec: {
      type: 'array',
      description: 'problems that existed before this run, in parts of the project the spec does not cover, worth the owner\'s attention (security first). Usually empty. Never: a defect of a criterion, an edge case of code written in this run (that goes in the criterion\'s note), other criteria not done yet, uncommitted files.',
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
}

const FUSION_SCHEMA = {
  type: 'object',
  properties: {
    integrated: { type: 'array', items: { type: 'string' }, description: 'ids of the groups whose work is now in the project tree' },
    notIntegrated: { type: 'array', items: { type: 'object', properties: { group: { type: 'string' }, reason: { type: 'string' } }, required: ['group', 'reason'] } },
    conflicts: { type: 'array', items: { type: 'string' }, description: 'each conflict and how it was resolved, in plain words' },
    tests: { type: 'string', description: 'test command run and its outcome' },
    cleanedUp: { type: 'boolean' },
  },
  required: ['integrated', 'notIntegrated', 'conflicts', 'tests', 'cleanedUp'],
}

const REPAIR_SCHEMA = {
  type: 'object',
  properties: {
    changed: { type: 'boolean' },
    summary: { type: 'string' },
    decisions: { type: 'array', items: { type: 'string' } },
  },
  required: ['changed', 'summary', 'decisions'],
}

// ---------------------------------------------------------------- helpers
// agent() returns null when the agent was skipped or died: retry once, then give up.
async function call(prompt, opts) {
  const r = await agent(prompt, opts)
  if (r !== null) return r
  log(`${opts.label} : relance après échec de l'agent`)
  return agent(prompt, { ...opts, label: `${opts.label} (relance)` })
}

const list = cs => cs.map(c => `- [${c.id}] ${c.text}`).join('\n')

const COMMON_RULES = `Rules for everyone in this run:
- Never ask a question: no one will answer. A reversible choice the spec does not settle is yours: make it and report it.
- Stay inside the spec's scope. A problem or improvement outside it is reported, never fixed.
- Never: push, force-push, deploy, send anything outside this machine, delete data you did not create in this run, touch production data. Do not edit the spec file.
- CLAUDE.md and the project's conventions apply as usual.`

// ---------------------------------------------------------------- personas
const PERSONAS = [
  {
    key: 'tester',
    label: 'testeur',
    brief: `You are the TESTER. Run the real result and try to break each criterion: the main path, then edge cases, bad input, empty and boundary values, the exact wording of the criterion. Build it, run it, call it, open it — whatever the criterion's "observable" means. "pass" means you exercised the criterion on the real result and it held; reading code is not enough for "pass". If you cannot run it here (needs a device, a human eye, a credential), the verdict is "unverifiable" and the proof says what is missing.`,
  },
  {
    key: 'owner',
    label: 'propriétaire',
    brief: `You are the OWNER'S ADVOCATE. The project owner wrote this spec; he does not read code. Check that the result does what he meant, not a convenient reading of the words: read the spec's goal and out-of-scope list, CLAUDE.md, earlier specs next to this one and recorded decisions. A defect is: the letter of a criterion is met but its intent is not; a criterion was weakened or reinterpreted; the result contradicts one of his recorded decisions. Proof = the spec or decision text quoted, plus what the result actually does.`,
  },
  {
    key: 'maintainer',
    label: 'mainteneur',
    brief: `You are the MAINTAINER. Read every change made in this run (diff against the baseline below) and look for: security holes introduced, side effects on behaviour that worked before (run the existing tests), changes no criterion needed (scope creep), fragile code that will break on the next change. Attach each defect to the criterion whose change causes it. Problems that existed before this run go in "outsideSpec", never as defects.`,
  },
]

function panelPrompt(persona, criteria, where, context) {
  return `${persona.brief}

You are an independent critic. You do not see the other critics; do not try to agree with anyone. Your job is to find real defects and prove them, not to approve.

Spec: ${SPEC} (read it first: goal, criteria, out of scope).
Criteria to judge — only these:
${list(criteria)}
The spec's other criteria are handled elsewhere in this run and may not be done yet: that is expected, never report it. The run does not commit: untracked or uncommitted files are expected, never report them.

The result lives in: ${where}
${context}

You are read-only: do not modify any file under ${ROOT} or ${where}. Scratch files go in a fresh \`mktemp -d\` directory only.

For each criterion above, one verdict:
- "pass": you checked it and it holds — proof says what you ran or read and what you saw;
- "defect": you PROVED it fails — proof is the reproduction (exact command and observed output, or the concrete input and the wrong behaviour). A suspicion you cannot prove is not a defect: put it in "note";
- "unverifiable": you could not check it — proof says why.

${COMMON_RULES}`
}

// reviews[i] answers personas[i]; a review is null when its agent died twice.
async function panel(criteria, where, context, phaseTitle, tag, effort, personas = PERSONAS) {
  const reviews = await parallel(personas.map(p => () =>
    call(panelPrompt(p, criteria, where, context), { model: 'opus', effort, schema: PANEL_SCHEMA, phase: phaseTitle, label: `${tag} — ${p.label} (opus ${effort})` })))
  return { personas, reviews }
}

// A criterion passes only if the tester verified it AND no critic proved a defect.
function judge(c, { personas, reviews }) {
  const got = personas.map((p, i) => {
    const r = reviews[i]
    const v = r && Array.isArray(r.verdicts) ? r.verdicts.find(x => String(x.id) === c.id) : null
    return { persona: p.key, v }
  })
  const defects = got.filter(g => g.v && g.v.verdict === 'defect' && String(g.v.proof || '').trim())
  if (defects.length) return { status: 'defect', proofs: defects.map(d => `[${d.persona}] ${d.v.proof}`) }
  const missing = got.filter(g => !g.v).map(g => g.persona)
  if (missing.length) return { status: 'unverified', reason: `no verdict from: ${missing.join(', ')}` }
  const tester = got.find(g => g.persona === 'tester')
  if (!tester) return { status: 'unverified', reason: 'no tester in this panel' }
  if (tester.v.verdict !== 'pass') return { status: 'unverified', reason: tester.v.proof }
  return { status: 'validated', proof: tester.v.proof }
}

function collectOutside({ reviews }, sink) {
  for (const r of reviews) for (const o of (r && r.outsideSpec) || []) sink.push(o)
}

// Groups run in parallel, each in its own git worktree, unless the orchestrator passed parallel: false.
// Each isolated developer first checks that its copy can serve; a group whose copy cannot reruns in the project itself.
const MODE = input.parallel !== false && GROUPS.length > 1 ? 'worktree' : 'shared'
const ISOLATION = 'ISOLATION:'
log(`${CRITERIA.length} critère(s), ${GROUPS.length} groupe(s), ${MODE === 'worktree' ? 'en parallèle (copies isolées)' : 'l’un après l’autre dans le projet'}`)

const runFiles = [] // every file the developers reported, relative to the project root
function changesHint(tree, files) {
  const shown = [...new Set(files)].slice(0, 80)
  return tree !== ROOT
    ? `Changes of this run: \`git -C ${tree} diff $(git -C ${ROOT} rev-parse HEAD)\` — this copy started from that commit and its new files are committed.`
    : `Changes of this run: ${shown.length ? `these files, relative to ${ROOT}: ${shown.join(', ')} — and in them \`git -C ${ROOT} diff\`` : 'see the developer summary'}. The project may already have held uncommitted changes before the run: those are not this run's.`
}

// ================================================================= 2. per group: dev → panel → escalate
const decisions = []
const outsideSpec = []
const doneGroups = [] // shared mode: groups already run in the project itself
let topEffort = DEV_EFFORTS[0] // highest developer effort reached in the run

async function runGroup(g, mode) {
  const tag = `Groupe ${g.id}`
  const results = {}
  const files = []
  let pending = g.criteria.slice()
  let where = mode === 'worktree' ? null : ROOT
  let branch = ''
  let feedback = ''
  let blocker = ''
  for (let round = 0; round < DEV_EFFORTS.length && pending.length; round++) {
    const effort = DEV_EFFORTS[round]
    if (round > DEV_EFFORTS.indexOf(topEffort)) topEffort = effort
    const isolated = mode === 'worktree' && where === null
    const workspaceRule = isolated
      ? `You are in an isolated git worktree (your starting directory), separate from the other developers. Before changing anything, check that this copy can serve: it belongs to the same repository as ${ROOT} (\`git rev-parse --git-common-dir\` and \`git -C ${ROOT} rev-parse --git-common-dir\` resolve to the same directory), it starts from the same commit (\`git rev-parse HEAD\` equals \`git -C ${ROOT} rev-parse HEAD\`), ${ROOT} has no uncommitted change to tracked files (\`git -C ${ROOT} status --porcelain --untracked-files=no\` prints nothing), and no untracked file of ${ROOT} matters to your criteria. If a check fails, change nothing and return a blocker starting with "${ISOLATION}" and the reason in a few French words.
Otherwise work only in this copy. When done, commit all your changes on the worktree's current branch (it is temporary: the fusion step brings it into the project and deletes it).`
      : mode === 'worktree' && where !== ROOT
        ? `Your workspace is the git worktree ${where} (branch ${branch}). Every file you read or edit must be under ${where} — not under ${ROOT}. cd there first. When done, commit your changes on that branch.`
        : `Work directly in the project at ${ROOT}. Do not commit unless CLAUDE.md asks for it.`
    const devPrompt = `You are the developer for part of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}.

Spec: ${SPEC} — read it first (goal, criteria, out of scope).
Your criteria:
${list(pending)}
${g.criteria.length > pending.length ? `Already validated in this group, keep them working:\n${list(g.criteria.filter(c => !pending.includes(c)))}\n` : ''}Other criteria of the spec belong to other developers: do not implement them.

${workspaceRule}
${feedback ? `\nThe critics rejected the previous round. Their proof:\n${feedback}\nFix the cause, not the symptom, then re-check every criterion of yours.\n` : ''}
Before returning, check each of your criteria on the real result yourself (run it, run the relevant tests${testCommand ? ` — project tests: \`${testCommand}\`` : ''}) and report honestly in selfCheck: an independent panel will verify it.
Never run commands that rewrite files outside your criteria (repo-wide formatters, lockfile upgrades). If you need a new dependency, add it the project's usual way and say so in your summary.
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec.

${COMMON_RULES}`
    const dev = await call(devPrompt, {
      model: 'opus', effort, schema: DEV_SCHEMA, phase: 'Développement',
      label: `${tag} — dév essai ${round + 1} (opus ${effort})`,
      ...(isolated ? { isolation: 'worktree' } : {}),
    })
    if (!dev) {
      for (const c of pending) results[c.id] = { status: 'failed', rounds: round + 1, reason: 'developer agent died twice' }
      pending = []
      break
    }
    if (isolated && !dev.changed && String(dev.blocker || '').startsWith(ISOLATION)) {
      return { group: g.id, retryShared: dev.blocker.slice(ISOLATION.length).trim() || 'copie isolée inutilisable' }
    }
    if (isolated) {
      where = dev.changed && dev.workspace ? dev.workspace.replace(/\/+$/, '') : ROOT
      branch = dev.changed ? dev.branch : ''
    }
    for (const f of dev.files || []) { files.push(f); runFiles.push(f) }
    for (const d of dev.decisions || []) decisions.push(d)
    if (dev.blocker && !dev.changed) {
      blocker = dev.blocker
      for (const c of pending) results[c.id] = { status: 'blocked', rounds: round + 1, reason: dev.blocker }
      pending = []
      break
    }
    const others = mode === 'shared' ? doneGroups : []
    const context = `${others.length ? `Earlier groups of this run already changed the project for other criteria — those changes are not yours to judge, not defects and not outside-spec issues: criteria ${others.map(o => o.criteria.map(c => c.id).join(', ')).join('; ')}.\n` : ''}Developer's summary (a claim, not evidence): ${dev.summary}
Developer's self-check (a claim, not evidence): ${(dev.selfCheck || []).map(s => `[${s.id}] ${s.status}: ${s.evidence}`).join(' | ')}
${changesHint(where, files)}${testCommand ? `\nProject tests: \`${testCommand}\` (run from ${where}).` : ''}`
    const reviews = await panel(pending, where, context, 'Critique', `${tag} — critique essai ${round + 1}`, criticEffort(effort))
    collectOutside(reviews, outsideSpec)
    const rejected = []
    for (const c of pending) {
      const j = judge(c, reviews)
      if (j.status === 'defect') {
        rejected.push(c)
        results[c.id] = { status: 'failed', rounds: round + 1, effortReached: effort, reason: j.proofs.join('\n') }
      } else {
        results[c.id] = { status: j.status, rounds: round + 1, effortReached: effort, reason: j.reason || '', proof: j.proof || '' }
      }
    }
    log(`${tag} : essai ${round + 1} (opus ${effort}) — ${pending.length - rejected.length}/${pending.length} critère(s) passé(s)`)
    feedback = rejected.map(c => `[${c.id}] ${results[c.id].reason}`).join('\n')
    pending = rejected
  }
  doneGroups.push(g)
  return { group: g.id, criteria: g.criteria.map(c => c.id), where, branch, results, blocker }
}

let groupResults
if (MODE === 'worktree') {
  groupResults = await parallel(GROUPS.map(g => () => runGroup(g, 'worktree')))
  const retry = GROUPS.filter((g, i) => groupResults[i] && groupResults[i].retryShared)
  if (retry.length) {
    log(`Copie isolée impossible (${groupResults.find(r => r && r.retryShared).retryShared}) : ${retry.length} groupe(s) repris l’un après l’autre dans le projet`)
    for (const g of retry) groupResults[GROUPS.indexOf(g)] = await runGroup(g, 'shared')
  }
} else {
  groupResults = []
  for (const g of GROUPS) groupResults.push(await runGroup(g, 'shared'))
}
groupResults = groupResults.map((r, i) => r || {
  group: GROUPS[i].id, criteria: GROUPS[i].criteria.map(c => c.id), where: null, branch: '', blocker: '',
  results: Object.fromEntries(GROUPS[i].criteria.map(c => [c.id, { status: 'failed', rounds: 0, reason: 'group crashed' }])),
})

const status = {}
for (const r of groupResults) Object.assign(status, r.results)

// ================================================================= 3. fusion (isolated groups only)
let fusion = null
if (MODE === 'worktree') {
  const toMerge = groupResults.filter(r => r.where && r.where !== ROOT && r.branch)
  if (toMerge.length) {
    phase('Fusion')
    fusion = await call(`You are the integrator. Several developers worked in parallel, each in its own git worktree, all starting from the current HEAD commit of the project at ${ROOT}. Bring all their work into the working tree of ${ROOT}.

Spec: ${SPEC}
Groups to integrate:
${toMerge.map(r => `- group ${r.group}: branch ${r.branch}, worktree ${r.where}, criteria ${r.criteria.join(', ')} (statuses: ${r.criteria.map(id => `${id}=${status[id].status}`).join(', ')})`).join('\n')}
Criteria text:
${list(CRITERIA)}

1. For each branch, apply its changes since that HEAD to the working tree of ${ROOT} without committing (e.g. \`git -C ${ROOT} cherry-pick --no-commit HEAD..<branch>\`, or \`git -C ${ROOT} diff HEAD <branch> | git -C ${ROOT} apply --3way\`). The working tree of ${ROOT} may already hold changes of groups that ran in it during this run: keep them. Resolve every conflict so that each group's criteria still hold: read both sides and keep both intents.
2. Run the project tests${testCommand ? ` (\`${testCommand}\`)` : ''} from ${ROOT} and fix what the integration broke — only that.
3. Clean up only what this run created: \`git worktree remove\` each worktree listed above and delete each listed branch. Leave ${ROOT} with uncommitted changes; do not commit.

${COMMON_RULES}`, { ...FUSION, schema: FUSION_SCHEMA, phase: 'Fusion', label: 'Fusion (opus high)' })
    if (fusion) log(`Fusion : ${fusion.integrated.length}/${toMerge.length} groupe(s) intégré(s)`)
    else log('Fusion : l’agent a échoué deux fois — rien n’est garanti intégré')
  }
}

// ================================================================= 4. final check on the integrated result
let finalCheck = null
const needFinal = MODE === 'worktree' || GROUPS.length > 1
const finalIds = CRITERIA.filter(c => ['validated', 'unverified'].includes((status[c.id] || {}).status)).map(c => c.id)
if (needFinal && finalIds.length) {
  phase('Contrôle final')
  const ctx = `This is the final check on the integrated project: several groups of criteria were developed separately${fusion ? ' and merged' : ''}; each passed its own review. Look for what the combination broke.
${changesHint(ROOT, runFiles)}${testCommand ? `\nProject tests: \`${testCommand}\`.` : ''}`
  const finalCriteria = finalIds.map(id => byId[id])
  // Groups merged from isolated copies need the full panel; groups run one after the
  // other in the project already saw each other's work, so only regressions remain: the tester.
  const finalPanel = fusion ? PERSONAS : PERSONAS.filter(p => p.key === 'tester')
  const reviews = await panel(finalCriteria, ROOT, ctx, 'Contrôle final', 'Contrôle final', criticEffort(topEffort), finalPanel)
  collectOutside(reviews, outsideSpec)
  const broken = finalCriteria.filter(c => judge(c, reviews).status === 'defect')
  finalCheck = { checked: finalIds, regressions: broken.map(c => c.id), repaired: [] }
  if (broken.length) {
    log(`Contrôle final : ${broken.length} critère(s) cassé(s) par l’assemblage — une réparation (opus xhigh)`)
    const proofs = broken.map(c => `[${c.id}] ${judge(c, reviews).proofs.join(' / ')}`).join('\n')
    const repair = await call(`The integrated project at ${ROOT} broke criteria that passed in isolation. Repair them without breaking the others.

Spec: ${SPEC}
All criteria (all must hold):
${list(CRITERIA)}
Broken, with the critics' proof:
${proofs}

Work in ${ROOT}; do not commit. Re-run the reproduction and the project tests${testCommand ? ` (\`${testCommand}\`)` : ''} before returning.

${COMMON_RULES}`, { ...REPAIR, schema: REPAIR_SCHEMA, phase: 'Contrôle final', label: 'Réparation (opus xhigh)' })
    if (repair) for (const d of repair.decisions || []) decisions.push(d)
    const recheck = await panel(broken, ROOT, ctx + `\nA repair was just made: ${repair ? repair.summary : 'the repair agent failed'}.`, 'Contrôle final', 'Contrôle final — après réparation', criticEffort(REPAIR.effort), PERSONAS)
    collectOutside(recheck, outsideSpec)
    for (const c of finalCriteria) {
      const j = judge(c, broken.includes(c) ? recheck : reviews)
      if (broken.includes(c) && j.status !== 'defect') finalCheck.repaired.push(c.id)
      status[c.id] = { ...status[c.id], status: j.status === 'defect' ? 'failed' : j.status, reason: j.status === 'defect' ? j.proofs.join('\n') : (j.reason || ''), proof: j.proof || '' }
    }
  } else {
    for (const c of finalCriteria) {
      const j = judge(c, reviews)
      status[c.id] = { ...status[c.id], status: j.status, reason: j.reason || '', proof: j.proof || status[c.id].proof || '' }
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
for (const c of CRITERIA) counts[(status[c.id] || { status: 'failed' }).status] += 1
log(`Fin : ${counts.validated}/${CRITERIA.length} validé(s), ${counts.unverified} non vérifié(s), ${counts.failed} en échec, ${counts.blocked} bloqué(s)`)

return {
  mode: groupResults.some(r => r.where && r.where !== ROOT) ? 'worktree' : 'shared',
  groups: GROUPS.map(g => ({ id: g.id, criteria: g.criteria.map(c => c.id) })),
  criteria: CRITERIA.map(c => ({ id: c.id, text: c.text, ...(status[c.id] || { status: 'failed', reason: 'never reviewed' }) })),
  counts,
  blockers: groupResults.filter(r => r.blocker).map(r => ({ group: r.group, question: r.blocker })),
  decisions: [...new Set(decisions)],
  outsideSpec: outside,
  outsideSpecMinor,
  fusion,
  finalCheck,
  testCommand,
}
