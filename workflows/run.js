export const meta = {
  name: 'run',
  description: 'spec-first autonomous run: one developer per group of independent criteria, three-critic panel one effort tier above the developer, effort escalation, fusion, final check of every criterion',
  whenToUse: 'Called by the spec-first skill after the owner gave his go on a spec. args: { specPath, projectRoot, baseCommit, criteria: [{ id, text }], groups?: [[ids]], testCommand?, setupCommand? } with absolute paths. Groups always run at once, each developer in a git worktree it creates under <projectRoot>/.claude/worktrees from baseCommit, whatever the branch. projectRoot must be the top of a git repository with nothing uncommitted but the spec file: the skill makes it so before launching. Not for a bare slash-command call without args: tell the user to run /spec-first instead.',
  phases: [
    { title: 'Développement', detail: 'opus, one developer per group of criteria; medium, then high, then xhigh after each rejection' },
    { title: 'Critique', detail: 'opus, one tier above the developer (high, then xhigh): tester, owner and maintainer judge each criterion blind to each other' },
    { title: 'Fusion', detail: 'opus high: integrates the isolated groups into the project tree' },
    { title: 'Contrôle final', detail: 'opus, one tier above the highest developer effort: the panel re-checks every criterion on the merged or reworked result; one opus xhigh repair if something broke' },
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
  return { error: 'Missing args. Expected { specPath, projectRoot, baseCommit, criteria: [{ id, text }] } with absolute paths.' }
}
const SPEC = String(input.specPath)
const ROOT = String(input.projectRoot).replace(/\/+$/, '')
const CRITERIA = input.criteria.map((c, i) =>
  typeof c === 'string' ? { id: String(i + 1), text: c } : { id: String(c.id != null ? c.id : i + 1), text: String(c.text || '') })
const byId = Object.fromEntries(CRITERIA.map(c => [c.id, c]))

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

// Every agent gets its own ten ports, so servers started at the same time never collide.
// Slots: 0 fusion, 1-3 final panel, 4 repair, 5-7 panel after the repair; then 12 per group
// (3 rounds × one developer and three critics).
const portsFor = slot => { const a = 20000 + 10 * (slot % 4500); return `${a}-${a + 9}` }
const portRule = slot => `Ports: anything you start that listens (a server, a service) uses only ports ${portsFor(slot)}, and you stop it before you return.`
const groupSlot = (gi, round, k) => 10 + gi * 12 + round * 4 + k // k: 0 developer, 1-3 critics

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
const DECISIONS_RULE = 'choices the spec did not settle that change what the owner can see or use, one short sentence each, in French, in plain words (what the result does, not how; no file or library names). Not what you did not do, and not problems outside the spec — the critics report those. Usually empty.'

const devSchema = ids => ({
  type: 'object',
  properties: {
    workspace: { type: 'string', description: 'absolute path of the tree you worked in (`git rev-parse --show-toplevel` run there)' },
    branch: { type: 'string', description: 'current branch of that tree' },
    changed: { type: 'boolean', description: 'true if you modified or created any file' },
    files: { type: 'array', items: { type: 'string' }, description: 'every file you created, modified or deleted in this round, relative to your workspace' },
    summary: { type: 'string', description: 'what the result now does, in two or three sentences' },
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
  required: ['workspace', 'branch', 'changed', 'files', 'summary', 'selfCheck', 'decisions', 'blocker'],
})

const panelSchema = ids => ({
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: ids },
          verdict: { type: 'string', enum: ['pass', 'defect', 'unverifiable'] },
          proof: { type: 'string', description: 'what you ran or read and what you observed; for a defect, the reproduction' },
          note: { type: 'string', description: 'a suspicion or an edge case you could not prove: a lead for the developer, never a defect' },
        },
        required: ['id', 'verdict', 'proof'],
      },
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

// Group ids are an enum: the run matches them exactly, and a free-text entry
// ("group 1 (branch …): app.py …") would count as not integrated.
const fusionSchema = ids => ({
  type: 'object',
  properties: {
    integrated: { type: 'array', items: { type: 'string', enum: ids }, description: 'ids of the groups whose work is now in the project tree' },
    notIntegrated: { type: 'array', items: { type: 'object', properties: { group: { type: 'string', enum: ids }, reason: { type: 'string' } }, required: ['group', 'reason'] } },
    conflicts: { type: 'array', items: { type: 'string' }, description: 'each conflict and how it was resolved, in plain words' },
    tests: { type: 'string', description: 'test command run and its outcome' },
    cleanedUp: { type: 'boolean', description: 'true if the worktree and branch of every integrated group are gone' },
  },
  required: ['integrated', 'notIntegrated', 'conflicts', 'tests', 'cleanedUp'],
})

const REPAIR_SCHEMA = {
  type: 'object',
  properties: {
    changed: { type: 'boolean' },
    summary: { type: 'string' },
    decisions: { type: 'array', items: { type: 'string' }, description: DECISIONS_RULE },
  },
  required: ['changed', 'summary', 'decisions'],
}

// ---------------------------------------------------------------- helpers
// agent() returns null when the owner skipped the agent or it died after the tool's own retries:
// never relaunched here.
const list = (cs, tag = 'criteria') => `<${tag}>\n${cs.map(c => `<criterion id="${c.id}">${c.text}</criterion>`).join('\n')}\n</${tag}>`

const COMMON_RULES = `Rules for everyone in this run:
- Never ask a question: no one will answer. A reversible choice the spec does not settle is yours: make it and report it.
- Stay inside the spec's scope. A problem or improvement outside it is reported, never fixed.
- Never: push, force-push, deploy, send anything outside this machine, delete data you did not create in this run, touch production data. Do not edit the spec file.
- Shared resources (database, containers): from a copy, never use the main project's. If a criterion needs one, start your own throwaway instance on your ports and stop it before you return; if you cannot, say what is missing — a critic's verdict is then "unverifiable".
- CLAUDE.md and the project's conventions apply as usual.`

const HOOK_RULE = 'If a commit hook fails, fix the cause when it lies in your changes, otherwise return a blocker; never bypass it (--no-verify).'

// What changed in a tree since the run started. Developers commit in their copies; the project
// itself stays uncommitted until the end of the spec, so its new files may be untracked.
const changesHint = tree => `Changes of this run: \`git -C ${tree} diff ${BASE}\` (the commit the run started from), plus the new files \`git -C ${tree} status --porcelain\` lists as untracked (??). The spec file is not part of the change.`

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
    brief: `You are the MAINTAINER. Read every change made in this run (diff against the commit below) and look for: security holes introduced, side effects on behaviour that worked before (targeted tests; the tester runs the full suite), changes no criterion needed (scope creep), fragile code that will break on the next change. Attach each defect to the criterion whose change causes it. Problems that existed before this run go in "outsideSpec", never as defects.`,
  },
]

function panelPrompt(persona, criteria, where, context, slot) {
  const tests = !testCommand ? ''
    : persona.key === 'tester'
      ? `Project tests: \`${testCommand}\` — run the full suite from ${where}; in this panel, you alone run it. A test that passed before this run and fails now is a defect of the criterion whose change broke it.`
      : `The tester runs the full test suite; you only run targeted tests.`
  return `${persona.brief}

You are an independent critic. You do not see the other critics; do not try to agree with anyone. Your job is to find real defects and prove them, not to approve.

Spec: ${SPEC} (read it first: goal, criteria, out of scope).
Criteria to judge — only these:
${list(criteria)}
The spec's other criteria are handled elsewhere in this run and may not be done yet: that is expected, never report it. Uncommitted or untracked files are expected — the run commits its result at the end: never report them.

The result lives in: ${where}
${context}
${tests}

Do not edit source files under ${ROOT} or ${where}. Build outputs, caches and servers the project's own commands create are fine. Scratch files go in a fresh \`mktemp -d\` directory only.
${portRule(slot)}

For each criterion above, one verdict, with its id exactly as given:
- "pass": you checked it and it holds — proof says what you ran or read and what you saw;
- "defect": you PROVED it fails — proof is the reproduction (exact command and observed output, or the concrete input and the wrong behaviour). A suspicion you cannot prove is not a defect: put it in "note" — the developer gets it as a lead;
- "unverifiable": you could not check it — proof says why.

${COMMON_RULES}`
}

// reviews[i] answers PERSONAS[i]; a review is null when its agent was skipped or died.
async function panel(criteria, where, context, phaseTitle, tag, effort, slot0) {
  const schema = panelSchema(criteria.map(c => c.id))
  return parallel(PERSONAS.map((p, i) => () =>
    agent(panelPrompt(p, criteria, where, context, slot0 + i), { model: 'opus', effort, schema, phase: phaseTitle, label: `${tag} — ${p.label} (opus ${effort})` })))
}

// A criterion passes only if the tester verified it AND no critic proved a defect.
// Notes are leads, never defects: they travel to the next round and to the report.
function judge(c, reviews) {
  const got = PERSONAS.map((p, i) => {
    const r = reviews[i]
    const v = r && Array.isArray(r.verdicts) ? r.verdicts.find(x => String(x.id) === c.id) : null
    return { persona: p.key, v }
  })
  const leads = got.filter(g => g.v && String(g.v.note || '').trim()).map(g => `[${g.persona}] ${g.v.note}`)
  const defects = got.filter(g => g.v && g.v.verdict === 'defect' && String(g.v.proof || '').trim())
  if (defects.length) return { status: 'defect', proofs: defects.map(d => `[${d.persona}] ${d.v.proof}`), leads }
  const missing = got.filter(g => !g.v).map(g => g.persona)
  if (missing.length) return { status: 'unverified', reason: `no verdict from: ${missing.join(', ')}`, leads }
  const tester = got.find(g => g.persona === 'tester')
  if (tester.v.verdict !== 'pass') return { status: 'unverified', reason: tester.v.proof, leads }
  return { status: 'validated', proof: tester.v.proof, leads }
}

const outsideSpec = []
function collectOutside(reviews) {
  for (const r of reviews) for (const o of (r && r.outsideSpec) || []) outsideSpec.push(o)
}

// ================================================================= 1. groups at once
// Several groups: each developer works in its own git worktree made from BASE, all at the same
// time, with no cap on their number. One group: the developer works in the project itself.
// A clean repository is a precondition the skill checks before launch: there is no sequential
// fallback — if a copy still cannot be made, the group is blocked and the owner is told why.
const MODE = GROUPS.length > 1 ? 'worktree' : 'shared'
const ISOLATION = 'ISOLATION:'
log(`${CRITERIA.length} critère(s), ${GROUPS.length} groupe(s), ${MODE === 'worktree' ? 'tous en même temps, chacun dans sa copie' : 'un seul développeur, dans le projet'}`)

const decisions = []
let topEffort = DEV_EFFORTS[0] // highest developer effort reached in the run

function workspaceRule(g, mode, where, branch) {
  if (mode === 'shared') {
    return `Work directly in the project at ${ROOT}. Do not commit: the run's result is committed once, at the end of the spec.`
  }
  const prepare = `${setupCommand
    ? `Prepare it right after creating it: run \`${setupCommand}\` from its root.`
    : `If the project needs what git ignores to run, install its dependencies in the copy the project's usual way and copy its local config (e.g. .env) from ${ROOT}.`} Never link the project's own dependency folders (.venv, node_modules): the tests would run the project's code, not your copy's.`
  if (where) {
    return `Your workspace is your copy ${where} (branch ${branch}), prepared in an earlier round. Every file you edit must be under it, never under ${ROOT}. Read the spec at ${SPEC}. When done, commit your changes on that branch. ${HOOK_RULE}`
  }
  return `Other developers work on other criteria at the same time, so you work in your own copy of the project. First check that one can be made: ${ROOT} is the top of a git repository (\`git -C ${ROOT} rev-parse --show-toplevel\` prints ${ROOT} or the same folder through a symlink) and has no uncommitted change besides the spec (\`${CLEAN_CHECK}\` prints nothing). If a check fails, change nothing, create nothing, and return a blocker starting with "${ISOLATION}" and the reason in a few French words.
Otherwise create your copy from commit ${BASE}, whatever the branch:
\`cd "${ROOT}" && x=$(git rev-parse --git-path info/exclude) && mkdir -p "$(dirname "$x")" .claude/worktrees && { grep -qxF /.claude/worktrees/ "$x" || echo /.claude/worktrees/ >> "$x"; } && d=$(mktemp -d .claude/worktrees/g${g.id}-XXXXXX) && git worktree add -b "spec-first-$(basename "$d")" "$d/wt" ${BASE} && cd "$d/wt" && pwd\`
Work only in that copy: every file you edit must be under it, never under ${ROOT}. Read the spec at ${SPEC}: your copy may lack it or hold an older version.
A copy holds tracked files only. ${prepare} Never commit those files.
When done, commit all your changes on that branch (it is temporary: the fusion brings it into the project, then deletes it). ${HOOK_RULE} Return that copy as workspace and its branch as branch, even if you changed nothing. These checks and this copy are plumbing: never mention them in decisions.`
}

async function runGroup(g, gi, mode) {
  const tag = `Groupe ${g.id}`
  const ids = g.criteria.map(c => c.id)
  const results = {}
  let pending = g.criteria.slice()
  let where = mode === 'worktree' ? '' : ROOT
  let branch = ''
  let feedback = ''
  let blocker = ''
  for (let round = 0; round < DEV_EFFORTS.length && pending.length; round++) {
    const effort = DEV_EFFORTS[round]
    if (round > DEV_EFFORTS.indexOf(topEffort)) topEffort = effort
    const isolated = mode === 'worktree' && !where
    const done = g.criteria.filter(c => !pending.includes(c))
    const devPrompt = `You are the developer for part of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}.

Spec: ${SPEC} — read it first (goal, criteria, out of scope).
Your criteria:
${list(pending)}
${done.length ? `Already validated in this group — keep them working:\n${list(done, 'validated_criteria')}\n` : ''}Other criteria of the spec belong to other developers: do not implement them.

${workspaceRule(g, mode, mode === 'worktree' ? where : ROOT, branch)}
${portRule(groupSlot(gi, round, 0))}
${feedback}
Before returning, check each of your criteria on the real result yourself (run it, run the relevant tests${testCommand ? ` — project tests: \`${testCommand}\`` : ''}) and report honestly in selfCheck: an independent panel will verify it.
Never run commands that rewrite files outside your criteria (repo-wide formatters, lockfile upgrades). If you need a new dependency, add it the project's usual way and say so in your summary.
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec.

${COMMON_RULES}`
    const dev = await agent(devPrompt, {
      model: 'opus', effort, schema: devSchema(ids), phase: 'Développement',
      label: `${tag} — dév essai ${round + 1} (opus ${effort})`,
    })
    if (!dev) {
      for (const c of pending) results[c.id] = { status: 'failed', rounds: round + 1, reason: 'developer agent skipped or died' }
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
        return { group: g.id, criteria: ids, where: kept ? ws : '', branch: kept ? String(dev.branch || '') : '', results, blocker: reason }
      }
      where = ws
      branch = String(dev.branch || '')
    }
    for (const d of dev.decisions || []) decisions.push(d)
    if (dev.blocker) {
      blocker = dev.blocker
      if (!dev.changed) {
        for (const c of pending) results[c.id] = { status: 'blocked', rounds: round + 1, reason: blocker }
        pending = []
        break
      }
    }
    const context = `<developer_claims>
Summary: ${dev.summary}
Self-check: ${(dev.selfCheck || []).map(s => `[${s.id}] ${s.status}: ${s.evidence}`).join(' | ') || 'none'}
</developer_claims>
These are claims, not evidence.
${changesHint(where)}`
    const reviews = await panel(pending, where, context, 'Critique', `${tag} — critique essai ${round + 1}`, criticEffort(effort), groupSlot(gi, round, 1))
    collectOutside(reviews)
    const rejected = []
    const leads = []
    for (const c of pending) {
      const j = judge(c, reviews)
      for (const l of j.leads) leads.push(`[${c.id}] ${l}`)
      if (j.status === 'defect') {
        rejected.push(c)
        results[c.id] = { status: 'failed', rounds: round + 1, effortReached: effort, reason: j.proofs.join('\n'), leads: j.leads }
      } else {
        results[c.id] = { status: j.status, rounds: round + 1, effortReached: effort, reason: j.reason || '', proof: j.proof || '', leads: j.leads }
      }
    }
    log(`${tag} : essai ${round + 1} (opus ${effort}) — ${pending.length - rejected.length}/${pending.length} critère(s) passé(s)`)
    if (blocker) {
      // The developer said the spec must change: another round cannot fix that.
      for (const c of rejected) results[c.id] = { ...results[c.id], status: 'blocked', reason: blocker }
      pending = []
      break
    }
    feedback = rejected.length ? `
The critics rejected the previous round. Fix the cause, not the symptom.
<critic_proofs>
${rejected.map(c => `[${c.id}] ${results[c.id].reason}`).join('\n')}
</critic_proofs>${leads.length ? `
<critic_leads>
Unproven suspicions, not defects: check them while you work.
${leads.join('\n')}
</critic_leads>` : ''}
` : ''
    pending = rejected
  }
  return { group: g.id, criteria: ids, where: mode === 'worktree' ? where : '', branch, results, blocker }
}

const groupResults = (await parallel(GROUPS.map((g, gi) => () => runGroup(g, gi, MODE)))).map((r, i) => r || {
  group: GROUPS[i].id, criteria: GROUPS[i].criteria.map(c => c.id), where: '', branch: '', blocker: '',
  results: Object.fromEntries(GROUPS[i].criteria.map(c => [c.id, { status: 'failed', rounds: 0, reason: 'group crashed' }])),
})

const status = {}
for (const r of groupResults) Object.assign(status, r.results)

// ================================================================= 2. fusion (several groups)
// Only groups the integrator reports as integrated count; the others keep their copy and branch,
// and their criteria are blocked: nothing is validated that is not in the project.
let fusion = null
const integrated = new Set()
if (MODE === 'worktree') {
  const toMerge = groupResults.filter(r => r.where && r.branch)
  if (toMerge.length) {
    phase('Fusion')
    fusion = await agent(`You are the integrator. Several developers worked in parallel, each in its own git worktree made from commit ${BASE} of the project at ${ROOT}. Bring all their work into the working tree of ${ROOT}, without committing.

Spec: ${SPEC}
<groups>
${toMerge.map(r => `- group ${r.group}: branch ${r.branch}, worktree ${r.where}, criteria ${r.criteria.join(', ')} (statuses: ${r.criteria.map(id => `${id}=${status[id].status}`).join(', ')})`).join('\n')}
</groups>
${list(CRITERIA)}

1. For each branch, apply its changes since ${BASE} to the working tree of ${ROOT} without committing (e.g. \`git -C ${ROOT} cherry-pick --no-commit ${BASE}..<branch>\`, or \`git -C ${ROOT} diff ${BASE} <branch> | git -C ${ROOT} apply --3way\`). Resolve every conflict so that each group's criteria still hold: read both sides and keep both intents. The uncommitted spec file stays as it is.
2. If a group added a dependency, install it in the project the usual way. Then run the project tests${testCommand ? ` (\`${testCommand}\`)` : ''} from ${ROOT} and fix what the integration broke — only that.
3. For each group you integrated, and only those: \`git -C ${ROOT} worktree remove --force <worktree>\`, \`git -C ${ROOT} branch -D <branch>\` (its changes are now in the project tree), then \`rmdir "$(dirname <worktree>)"\`. A group you could not integrate stays untouched — worktree and branch — and goes in notIntegrated with the reason.
Do not commit: the run's result is committed once, at the end of the spec.
${portRule(0)}

${COMMON_RULES}`, { ...FUSION, schema: fusionSchema(toMerge.map(r => String(r.group))), phase: 'Fusion', label: 'Fusion (opus high)' })
    const ok = new Set(((fusion && fusion.integrated) || []).map(String))
    for (const r of toMerge) {
      if (ok.has(String(r.group))) { integrated.add(r.group); r.where = ''; r.branch = ''; continue }
      const reason = `Non intégré au projet — travail conservé sur la branche ${r.branch}.`
      for (const id of r.criteria) {
        if (['validated', 'unverified'].includes(status[id].status)) status[id] = { ...status[id], status: 'blocked', reason }
      }
    }
    log(fusion
      ? `Fusion : ${integrated.size}/${toMerge.length} groupe(s) intégré(s)`
      : 'Fusion : l’agent n’a pas abouti — aucun groupe intégré, chaque travail reste sur sa branche')
  }
}

// ================================================================= 3. final check
// Several groups: every criterion is re-checked on the merged project. One group: only when the
// developer reworked after a rejection, since a later round can break what passed earlier.
let finalCheck = null
const reworked = topEffort !== DEV_EFFORTS[0]
const needFinal = MODE === 'worktree' ? integrated.size > 0 : reworked
const finalIds = CRITERIA.filter(c => ['validated', 'unverified'].includes((status[c.id] || {}).status)).map(c => c.id)
if (needFinal && finalIds.length) {
  phase('Contrôle final')
  const ctx = `${MODE === 'worktree'
    ? `This is the final check on the merged project: ${integrated.size} group(s) of criteria were developed separately, each passed its own review, then they were merged. Look for what the combination broke.`
    : 'This is the final check: the developer reworked the code after a rejection, so criteria that passed in an earlier round may have broken. Look for regressions.'}
${changesHint(ROOT)}`
  const finalCriteria = finalIds.map(id => byId[id])
  const reviews = await panel(finalCriteria, ROOT, ctx, 'Contrôle final', 'Contrôle final', criticEffort(topEffort), 1)
  collectOutside(reviews)
  let verdicts = Object.fromEntries(finalCriteria.map(c => [c.id, judge(c, reviews)]))
  const broken = finalCriteria.filter(c => verdicts[c.id].status === 'defect')
  finalCheck = { checked: finalIds, regressions: broken.map(c => c.id), repaired: [] }
  if (broken.length) {
    log(`Contrôle final : ${broken.length} critère(s) cassé(s) — une réparation (opus xhigh), puis tout est re-vérifié`)
    const holding = finalCriteria.filter(c => !broken.includes(c))
    const leads = broken.flatMap(c => verdicts[c.id].leads.map(l => `[${c.id}] ${l}`))
    const repair = await agent(`The project at ${ROOT} broke criteria that had passed ${MODE === 'worktree' ? 'in their own copy, once the groups were merged' : 'in an earlier round'}. Repair them without breaking the others.

Spec: ${SPEC}
${holding.length ? `Must keep holding:\n${list(holding, 'holding_criteria')}\n` : ''}Broken:
${list(broken, 'broken_criteria')}
<critic_proofs>
${broken.map(c => `[${c.id}] ${verdicts[c.id].proofs.join(' / ')}`).join('\n')}
</critic_proofs>${leads.length ? `\n<critic_leads>\nUnproven suspicions, not defects:\n${leads.join('\n')}\n</critic_leads>` : ''}
${changesHint(ROOT)}

Work in ${ROOT} and fix only what broke. Do not commit: the run's result is committed once, at the end of the spec. Re-run the reproduction and the project tests${testCommand ? ` (\`${testCommand}\`)` : ''} before returning.
${portRule(4)}

${COMMON_RULES}`, { ...REPAIR, schema: REPAIR_SCHEMA, phase: 'Contrôle final', label: 'Réparation (opus xhigh)' })
    if (repair) for (const d of repair.decisions || []) decisions.push(d)
    // The repair may break what held: every criterion of the final check is judged again.
    const recheck = await panel(finalCriteria, ROOT, `${ctx}\nA repair was just made: ${repair ? repair.summary : 'the repair agent did not return'}. Judge every criterion again: the repair may have broken others.`, 'Contrôle final', 'Contrôle final — après réparation', criticEffort(REPAIR.effort), 5)
    collectOutside(recheck)
    verdicts = Object.fromEntries(finalCriteria.map(c => [c.id, judge(c, recheck)]))
    finalCheck.repaired = broken.filter(c => verdicts[c.id].status !== 'defect').map(c => c.id)
  }
  for (const c of finalCriteria) {
    const j = verdicts[c.id]
    status[c.id] = {
      ...status[c.id],
      status: j.status === 'defect' ? 'failed' : j.status,
      reason: j.status === 'defect' ? j.proofs.join('\n') : (j.reason || ''),
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
for (const c of CRITERIA) counts[(status[c.id] || { status: 'failed' }).status] += 1
log(`Fin : ${counts.validated}/${CRITERIA.length} validé(s), ${counts.unverified} non vérifié(s), ${counts.failed} en échec, ${counts.blocked} bloqué(s)`)

return {
  mode: MODE,
  baseCommit: BASE,
  groups: groupResults.map(r => ({ id: r.group, criteria: r.criteria, integrated: MODE === 'shared' || integrated.has(r.group) })),
  // Copies and branches still on disk: work that was not merged. The clean-up never deletes them
  // without the owner's yes.
  leftovers: groupResults.filter(r => r.where || r.branch).map(r => ({ group: r.group, worktree: r.where, branch: r.branch })),
  criteria: CRITERIA.map(c => ({ id: c.id, text: c.text, ...(status[c.id] || { status: 'failed', reason: 'never reviewed' }) })),
  counts,
  blockers: groupResults.filter(r => r.blocker).map(r => ({ group: r.group, question: r.blocker })),
  decisions: [...new Set(decisions)],
  outsideSpec: outside,
  outsideSpecMinor,
  fusion,
  finalCheck,
  testCommand,
  setupCommand,
}
