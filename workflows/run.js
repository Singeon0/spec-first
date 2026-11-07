export const meta = {
  name: 'run',
  description: 'spec-first development run: small groups of criteria, a few at a time, each developed in its own copy, a group starting as soon as what it depends on is merged; three Opus high critics per round, and after a rejection only the critics that did not pass re-judge; developer effort escalation with triage (a slip, an approach, or the environment); a criterion broken only by its environment or configuration gets a targeted repair re-judged by the critics that rejected it; each validated group merged at once into an integration branch that later groups and rework start from, its copy then removed; the run ends with a light check of its own changes (a few Opus high judges, a quick non-regression) unless finalCheck is false. The review of the whole spec (a fixed panel, live tests) and the publication are a separate workflow: spec-first:review. profil « rapide »: Sonnet and Haiku, no critics during the run',
  whenToUse: 'Called by the spec-first skill after the owner gave his go on a spec; spec-first:review follows once every criterion passes. args: { specPath, projectRoot, baseCommit, criteria: [{ id, text }], groups?: [[ids]], quickTestCommand?, setupCommand?, subdir?, finalCheck?: "light"|false, recheck?: [{ id, text, unverified? }], startEffort?: { [id]: "medium"|"high"|"xhigh" }, envRepair?: { [id]: { defect, critics? } }, rejectedBy?: { [id]: [critics] | { critics, proof } }, integrationBranch?, maxGroups?: number, exclusive?: { [resource]: [ids] } | [string], publish?: { actions: string, criteria: [ids] }, dependsOn?: { [id]: [ids] }, budget?: number, profil?: "standard"|"rapide", simples?: [ids] } with absolute paths. profil: "standard" (default) — Opus everywhere, three critics per group; "rapide", only when the owner chose it at his go — Sonnet developers (Haiku for the criteria in simples, and for the plumbing), the same medium → xhigh escalation, no critics during the run (the developer self-check stands until the light check or the review). baseCommit is required: `git rev-parse HEAD` in projectRoot right before the call. An integration copy is made first; each group works in its own git worktree under <projectRoot>/.spec-first/copies, named after the spec, made from the integration branch; at most maxGroups groups (default 3) are active at once; groups omitted → one group per criterion. dependsOn: the dependency graph of the whole spec — independent groups start at once, a dependent group as soon as what it builds on is merged. Every validated group is merged into one integration branch: the review works on it (result.worktree, result.branch), the skill squashes it into the project at the end. quickTestCommand: the fast subset developers, critics, fusions and the light check run (one critic per panel runs it, the others read its log); the full suite runs only in the review. setupCommand: makes a fresh copy runnable, commit hooks included; subdir: the sub-folder of projectRoot where setup and tests run. finalCheck: "light" (default) → a light check of this run\'s changes; false → none (e.g. « rapide » when the review follows at once: its criteria come back « non vérifié », for the review to judge). recheck: criteria an earlier run of the same spec validated — the light check re-checks them by non-regression (unverified: true → judged in full). startEffort: the effort a relaunched criterion resumes from. envRepair: a targeted repair of a criterion broken by its environment, re-judged by the critics that rejected it. rejectedBy: a criterion relaunched after « en échec », or after the review rejected it (the review report\'s relaunch): only those critics judge it again, the proof reaches the developer. integrationBranch: the integration branch of an interrupted run to start from (its criteria go in recheck). exclusive: resources only one agent may use at a time. publish: only to mark the publication criteria — prepared here (version, changelog), never pushed: the publication itself runs in spec-first:review. A criterion held only because what it depends on did not pass comes back blocked with kind « attente », waitingFor and relaunchAs. budget: output tokens; the run stops cleanly before it — and after 3 agents in a row die without an answer. A stopped run reports resume. Not for a bare slash-command call without args: tell the user to run /spec-first instead.',
  phases: [
    { title: 'Développement', detail: 'opus, one developer per group, a few groups at a time; medium, then high, then xhigh after each rejection, sorting each rejection first: a slip to fix or an approach to change' },
    { title: 'Critique', detail: 'opus high: tester, owner and maintainer judge each criterion blind to each other; after a rejection, only the critics that did not pass judge again' },
    { title: 'Fusion', detail: 'opus high: each group with a passing criterion is merged into the integration branch as soon as it is done, one at a time, then its copy is removed; later groups and rework start from it' },
    { title: 'Contrôle léger', detail: 'opus high, at the end of the run: a tester re-checks the run\'s criteria on the merged result when parts were combined, and the earlier criteria by a quick non-regression (plus an integrator when groups were combined); one developer repairs what broke' },
  ],
}

// ---------------------------------------------------------------- models
// Two profiles, one engine. « standard » (default): Opus only, medium at least; Opus max is never used
// here, it is the owner's call. « rapide », only when the owner chose it at his go: Sonnet and Haiku,
// each picked for its task, the same medium → xhigh escalation; no critics during the run — the
// developer's self-check stands until the check that ends the run, which always runs.
const PROFIL = (() => {
  let a = args
  if (typeof a === 'string') { try { a = JSON.parse(a) } catch (e) { a = null } }
  return a && typeof a === 'object' && a.profil === 'rapide' ? 'rapide' : 'standard'
})()
const RAPIDE = PROFIL === 'rapide'
const DEV_EFFORTS = ['medium', 'high', 'xhigh'] // one tier up after each rejection
const DEV_MODEL = RAPIDE ? 'sonnet' : 'opus' // developers, repairs
const SIMPLE_MODEL = RAPIDE ? 'haiku' : 'opus' // « rapide »: the groups the owner marked simple (args.simples)
const CRITIC = { model: RAPIDE ? 'sonnet' : 'opus', effort: 'high' } // every critic during the run (none in « rapide ») and of the light check
const FUSION = { model: RAPIDE ? 'sonnet' : 'opus', effort: 'high' } // conflicts are code: never Haiku
const HELPER = { model: RAPIDE ? 'haiku' : 'opus', effort: 'medium' } // plumbing: the remote CI, tidying the copies
const TESTER_SHARE = 3 // criteria per tester in the light check
const IN_RUN = ['tester', 'owner', 'maintainer'] // the three critics of every group
const personaOf = key => String(key).split('-')[0]

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

// Criteria an earlier run of this spec validated: not developed here, re-checked by the check that ends the run.
if (input.recheck != null && (!Array.isArray(input.recheck) || input.recheck.some(c => !c || typeof c !== 'object' || c.id == null))) {
  return { error: 'args.recheck must be an array of { id, text }.' }
}
// unverified: true → an earlier run could not judge it (« non vérifié »): judged in full, never only
// re-checked for regressions.
const RECHECK = []
normalize(input.recheck || []).forEach((c, i) => {
  if (critIds.includes(c.id)) log(`Critère ${c.id} retiré de recheck : il est développé dans ce run.`)
  else if (RECHECK.some(r => r.id === c.id)) log(`Critère ${c.id} répété dans recheck : gardé une fois.`)
  else RECHECK.push({ ...c, earlierRun: true, ...(input.recheck[i].unverified === true ? { neverJudged: true } : {}) })
})
if (!CRITERIA.length && !RECHECK.length) return { error: 'Nothing to run: criteria is empty and recheck lists nothing.' }
const ALL = [...CRITERIA, ...RECHECK]
const byId = Object.fromEntries(ALL.map(c => [c.id, c]))

// The publication criteria: prepared here, published by spec-first:review once the review passes.
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

// What a criterion builds on: other criteria of this run or of recheck. A group starts only once the
// groups it depends on are merged; a criterion whose dependencies are not validated is held
// « en attente des dépendances » — never a failure of its own — and relaunched as is with them.
// The publication is one case: its criteria depend on every other criterion.
const DEPS = {}
if (input.dependsOn != null) {
  if (typeof input.dependsOn !== 'object' || Array.isArray(input.dependsOn)) log('dependsOn ignoré : ce doit être { id: [ids des critères dont il dépend] }.')
  else {
    for (const [id, v] of Object.entries(input.dependsOn)) {
      const want = (Array.isArray(v) ? v : [v]).map(String)
      const ok = want.filter(d => byId[d] && d !== String(id))
      if (!byId[id]) log(`dependsOn ignoré pour « ${id} » : critère inconnu.`)
      else if (ok.length < want.length) log(`dependsOn « ${id} » : dépendance(s) ignorée(s) : ${want.filter(d => !ok.includes(d)).join(', ')}.`)
      if (byId[id] && ok.length) DEPS[id] = [...new Set(ok)]
    }
  }
}
const depsOf = (id, withPub) => [...new Set([...(DEPS[id] || []), ...(withPub && isPub(id) ? ALL.map(c => c.id).filter(x => x !== id) : [])])]
const plural = (ids, one, many) => ids.length > 1 ? many : one
const waiting = (unmet, relaunchAs) => ({
  status: 'blocked', kind: 'attente', waitingFor: unmet, relaunchAs,
  reason: `en attente des dépendances : ${plural(unmet, 'critère', 'critères')} ${unmet.join(', ')} pas encore ${plural(unmet, 'validé', 'validés')}`,
})

// The check that ends the run: a light check of its own changes — the review of the whole spec is
// spec-first:review. false → none: in « rapide », the criteria the developers' self-check passed come
// back « non vérifié », for the review to judge.
const FC = input.finalCheck
let CHECK = FC == null || FC === 'auto' || FC === 'light' ? 'light' : FC === false || FC === 'none' ? 'none' : ''
if (FC === true || FC === 'strict') { CHECK = 'light'; log('finalCheck « strict » : le contrôle strict est devenu la revue (spec-first:review) — contrôle léger ici.') }
else if (!CHECK) { CHECK = 'light'; log(`finalCheck ignoré (« ${FC} ») : contrôle léger.`) }
// Earlier criteria need their non-regression — except in « rapide », where the review judges every criterion.
if (CHECK === 'none' && RECHECK.length && !RAPIDE) {
  CHECK = 'light'
  log('Contrôle léger maintenu : des critères d\'un run précédent sont à revérifier (non-régression).')
}
for (const k of ['strictDone', 'specTotal', 'specBaseCommit', 'waitRound', 'testCommand']) if (input[k] != null) log(`${k} ignoré : il sert à la revue (spec-first:review), plus au run.`)
const testCommand = String(input.testCommand || '') // the full suite: only in the review, never here
const quickTestCommand = String(input.quickTestCommand || '') // targeted tests, during the run
// What makes a fresh copy runnable (dependencies, files git ignores, commit hooks).
const setupCommand = String(input.setupCommand || '')
const SUBDIR_IN = String(input.subdir || '')
if (SUBDIR_IN && (SUBDIR_IN.startsWith('/') || SUBDIR_IN.split('/').includes('..') || !NAME.test(SUBDIR_IN))) {
  return { error: 'args.subdir must be a folder relative to projectRoot (letters, digits, . _ - /, no ..).' }
}
const SUBDIR = SUBDIR_IN.replace(/^(\.\/)+/, '').replace(/\/+$/, '')
const inSub = tree => SUBDIR ? `${tree}/${SUBDIR}` : tree

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
// Resources only one agent may use at a time, each with the criteria that need it. The run holds
// the locks itself, as for the fusions: no agent waits in a shell, a stopped run leaves no stale lock.
// A plain list → every criterion needs each resource.
const EXCLUSIVE = {} // resource → ids of the criteria that need it
if (Array.isArray(input.exclusive)) {
  for (const s of input.exclusive) { const r = String(s).trim(); if (r) EXCLUSIVE[r] = ALL.map(c => c.id) }
} else if (input.exclusive && typeof input.exclusive === 'object') {
  for (const [k, v] of Object.entries(input.exclusive)) {
    const r = String(k).trim()
    const asked = (Array.isArray(v) ? v : [v]).map(String)
    const unknown = asked.filter(id => !byId[id])
    if (unknown.length) log(`exclusive « ${r} » : critère(s) inconnu(s) ignoré(s) : ${unknown.join(', ')}.`)
    const ids = asked.filter(id => byId[id])
    if (r && ids.length) EXCLUSIVE[r] = [...new Set(ids)]
  }
} else if (input.exclusive != null) log('exclusive ignoré : ce doit être une liste de ressources, ou { ressource: [ids des critères] }.')
const RESOURCES = Object.keys(EXCLUSIVE).sort()
const locksFor = ids => RESOURCES.filter(r => EXCLUSIVE[r].some(id => ids.includes(id)))
const LIMIT = Number(input.budget) > 0 ? Number(input.budget) : 0
if (input.budget != null && !LIMIT) log('budget ignoré : ce doit être un nombre de tokens.')
if (input.profil != null && input.profil !== 'rapide' && input.profil !== 'standard') log(`profil ignoré (« ${input.profil} ») : « standard » ou « rapide ».`)
// « rapide »: the criteria the owner marked simple at his go (renaming, wording, configuration) — their
// groups go to Haiku, the others to Sonnet. Ignored in « standard ».
const SIMPLES = new Set(RAPIDE && Array.isArray(input.simples) ? input.simples.map(String).filter(id => byId[id]) : [])
if (input.simples != null && !RAPIDE) log('simples ignoré : seulement avec profil « rapide ».')
log(RAPIDE
  ? `Profil rapide : développeurs Sonnet${SIMPLES.size ? ` (Haiku pour ${SIMPLES.size} critère(s) simple(s))` : ''}, medium → xhigh ; aucune critique pendant le run ; jugés au contrôle léger (Sonnet) ou par la revue.`
  : 'Profil standard : Opus partout, medium au moins ; trois critiques par groupe.')

// A relaunched criterion resumes from the effort it reached, instead of medium again.
const START = {}
if (input.startEffort && typeof input.startEffort === 'object') {
  for (const [id, e] of Object.entries(input.startEffort)) {
    if (byId[id] && DEV_EFFORTS.includes(e)) START[id] = e
    else log(`startEffort ignoré pour « ${id} » : ${byId[id] ? `effort « ${e} » inconnu` : 'critère inconnu'}.`)
  }
}

// Criteria an earlier run found broken by their environment or configuration, not by their code:
// a targeted repair, re-judged only by the critics that rejected them (the tester always among them).
const ENV = {}
if (input.envRepair != null) {
  if (typeof input.envRepair !== 'object' || Array.isArray(input.envRepair)) log('envRepair ignoré : ce doit être { id: { defect, critics } }.')
  else {
    const asCritic = k => ({ ci: 'tester', integrator: 'maintainer', security: 'maintainer' })[personaOf(String(k))] || personaOf(String(k))
    for (const [id, v] of Object.entries(input.envRepair)) {
      const o = typeof v === 'string' ? { defect: v } : (v && typeof v === 'object' ? v : {})
      const defect = String(o.defect || o.reason || '').trim()
      if (!critIds.includes(id)) log(`envRepair ignoré pour « ${id} » : ${byId[id] ? 'critère de recheck, pas développé ici' : 'critère inconnu'}.`)
      else if (!defect) log(`envRepair ignoré pour « ${id} » : défaut non décrit.`)
      else ENV[id] = { defect, critics: [...new Set(['tester', ...(Array.isArray(o.critics) ? o.critics : []).map(asCritic).filter(k => IN_RUN.includes(k))])] }
    }
  }
}

// A criterion relaunched after « en échec »: only the critics that rejected it judge it again (the
// tester always) — those that passed it are not run a second time. { id: [critics] } or
// { id: { critics, proof } }, from the last report's rejectedBy and reason.
const PRIOR = {}
if (input.rejectedBy != null) {
  if (typeof input.rejectedBy !== 'object' || Array.isArray(input.rejectedBy)) log('rejectedBy ignoré : ce doit être { id: [critiques] }.')
  else {
    // A reviewer of spec-first:review that rejected it → the in-run critic closest to its angle; the
    // review itself re-judges it afterwards with focus.
    const asCritic = k => ({ ci: 'tester', security: 'maintainer', integrator: 'maintainer', integration: 'maintainer', reliability: 'maintainer', performance: 'maintainer', usage: 'maintainer' })[personaOf(String(k))] || personaOf(String(k))
    for (const [id, v] of Object.entries(input.rejectedBy)) {
      const o = Array.isArray(v) ? { critics: v } : (v && typeof v === 'object' ? v : {})
      if (!critIds.includes(id)) { log(`rejectedBy ignoré pour « ${id} » : ${byId[id] ? 'critère de recheck, pas développé ici' : 'critère inconnu'}.`); continue }
      if (ENV[id]) continue
      const critics = [...new Set(['tester', ...(Array.isArray(o.critics) ? o.critics : []).map(asCritic).filter(k => IN_RUN.includes(k))])]
      PRIOR[id] = { critics, proof: String(o.proof || o.reason || 'rejeté par le run précédent').trim() }
    }
  }
}

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
// A targeted repair is a group of its own, first in line.
{
  const envIds = critIds.filter(id => ENV[id])
  if (envIds.length) {
    const shared = groupIds.filter(g => g.length > 1 && g.some(id => ENV[id])).length
    if (shared) log(`Réparation ciblée : ${envIds.join(', ')} ${plural(envIds, 'sort', 'sortent')} de ${plural(envIds, 'son groupe', 'leurs groupes')}, un groupe chacun.`)
    groupIds = [...envIds.map(id => [id]), ...groupIds.map(g => g.filter(id => !ENV[id])).filter(g => g.length)]
  }
}
// Groups that depend on others come after them (stable order otherwise); a cycle is ignored.
{
  const groupOf = id => groupIds.findIndex(g => g.includes(id))
  const needs = groupIds.map((g, i) => [...new Set(g.flatMap(id => (DEPS[id] || []).map(groupOf)).filter(j => j >= 0 && j !== i))])
  const order = []
  const left = groupIds.map((g, i) => i)
  while (left.length) {
    const k = left.findIndex(i => needs[i].every(j => order.includes(j)))
    if (k < 0) { log(`dependsOn : dépendances circulaires entre les groupes ${left.map(i => groupIds[i].join('+')).join(', ')} — ignorées pour l'ordre.`); order.push(...left.splice(0)); break }
    order.push(left.splice(k, 1)[0])
  }
  groupIds = order.map(i => groupIds[i])
}
const GROUPS = groupIds.map((ids, i) => ({ id: String(i + 1), criteria: ids.map(id => byId[id]) }))
// The groups a group waits for: those holding what its criteria depend on, earlier in the order.
const groupNeeds = GROUPS.map((g, i) => [...new Set(g.criteria.flatMap(c => (DEPS[c.id] || []).map(d => GROUPS.findIndex(x => x.criteria.some(y => y.id === d)))))].filter(j => j >= 0 && j < i))

// Every agent gets its own ten ports, from its group, its role and its round — never from the order
// agents finish in — so a resumed run (resumeFromRunId) gives each agent the same prompt again.
// Offset by the project: two runs at once on two repositories do not collide.
const hashOf = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 } return h }
const PORT_BASE = (hashOf(ROOT) % 9) * 500
const groupSlot = (gid, k) => 16 * Number(gid) + k // k: 0-2 developer round, 3-11 critics (3 per round), 12 fusion
const FINAL_SLOT = 16 * (GROUPS.length + 1) // the check ending the run: one per critic, then 90+ the repair
const portsFor = slot => { const a = 20000 + 10 * ((PORT_BASE + slot) % 4500); return `${a}-${a + 9}` }
const portRule = slot => `Ports: anything you start that listens (a server, a service) uses only ports ${portsFor(slot)}, and you stop it before you return.`

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
const DEPENDS = 'DEPENDS:' // a blocker: another criterion of the spec it builds on is missing or broken

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
          kind: { type: 'string', enum: ['slip', 'approach', 'environment', 'mistaken'] },
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
    blocker: { type: 'string', description: `empty unless the spec itself must change or the owner must decide before any progress is possible; a technical cause outside your changes (environment, hook, missing tool) starts with "${TECH}"; another criterion of this spec your criteria build on is missing or broken starts with "${DEPENDS}", then its ids and why (e.g. "${DEPENDS} 2 — …")` },
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
    cause: { type: 'string', enum: ['code', 'environment'], description: 'for a defect: "environment" when the code is right but its environment or configuration is wrong (a config file, a setting, a local file the project expects), else "code"' },
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

// ---------------------------------------------------------------- helpers
const list = (cs, tag = 'criteria') => `<${tag}>\n${cs.map(c => `<criterion id="${c.id}">${c.text}</criterion>`).join('\n')}\n</${tag}>`
const clean = p => String(p || '').replace(/\/+$/, '')
// The criteria a « DEPENDS: » blocker names (ids before the first dash), outside the blocked ones.
const dependsNamed = (b, own = []) => !String(b).startsWith(DEPENDS) ? []
  : [...new Set((String(b).slice(DEPENDS.length).split(/\s[—–-]\s/)[0].match(/[^\s,;]+/g) || []).filter(id => byId[id] && !own.includes(id)))]
const kindOf = b => String(b).startsWith(TECH) || String(b).startsWith(ISOLATION) ? 'technique'
  : dependsNamed(b).length ? 'attente' : 'question'
// A blocked criterion's fields: a dependency wait says what it waits for, and comes back in criteria.
const blockedFields = (b, own) => {
  const unmet = dependsNamed(b, own)
  if (!unmet.length) return { status: 'blocked', kind: kindOf(b), reason: b }
  const w = waiting(unmet, 'criteria')
  return { ...w, reason: `${w.reason} — ${String(b).slice(DEPENDS.length).trim()}` }
}
const errText = e => String((e && e.message) || e || 'erreur inconnue').slice(0, 200)

// The run's own locks on the exclusive resources: one agent at a time, released when the agent
// returns or fails, taken in a fixed order so two agents never wait on each other.
const lockTail = {}
async function withLocks(rs, fn) {
  const held = []
  // Queue on every resource at once, synchronously: no other agent slips in between two of them.
  const prevs = []
  for (const r of [...new Set(rs || [])].sort()) {
    const prev = lockTail[r] || Promise.resolve()
    let release
    const mine = new Promise(res => { release = res })
    lockTail[r] = prev.then(() => mine)
    prevs.push(prev)
    held.push(release)
  }
  try {
    await Promise.all(prevs)
    return await fn()
  } finally {
    for (const release of held) release()
  }
}

// agent() returns null when the owner skipped the agent or it died after the tool's own retries.
// Such a breakdown is not a failed round: the same agent is launched once more, locks still held.
// Agents that die one after the other, with nothing in between that answered: a usage limit or an
// API outage, not a defect. The run stops launching work, like the budget, and says how to resume.
let deadInARow = 0
let deadStop = false
const DEAD_LIMIT = 3
async function ask(prompt, opts) {
  const { locks, ...o } = opts
  return withLocks(locks, async () => {
    if (deadStop) return null
    let r = await agent(prompt, o)
    if (!r && !deadStop) {
      log(`${o.label} : pas de réponse, relancé une fois`)
      r = await agent(prompt, { ...o, label: `${o.label} — relance` })
    }
    if (r) { deadInARow = 0; return r }
    deadInARow += 1
    if (deadInARow >= DEAD_LIMIT && !deadStop) {
      deadStop = true
      stopped = stopped || `${deadInARow} agents sans réponse d'affilée (limite d'usage ou API indisponible), arrêt avant la suite`
      log(`Arrêt propre : ${stopped}`)
    }
    return null
  })
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

// Each panel's suite runs once, in the background, into a log the other critics read. The log's name
// is unique to this run — its arguments (waitRound aside), and its integration copy, made with a
// random name — and the same when the run is resumed: a stale « EXIT » is never read.
// Only what changes the work: the pace settings (maxGroups, budget, waitRound) stay out, so a run
// relaunched faster (« accélère ») or with another budget keeps its logs and its finished agents.
const ARGS_TAG = hashOf(JSON.stringify({ ...input, waitRound: undefined, maxGroups: undefined, budget: undefined })).toString(36)
const copyTag = ws => (String(ws).split('/').slice(-2, -1)[0] || '').split('-').pop()
const suitePath = name => `${ROOT}/.spec-first/logs/${SPEC_ID}-${ARGS_TAG}${integ.where ? `-${copyTag(integ.where)}` : ''}-${name}.log`
const suiteCommand = (at, file, cmd) => `${ENSURE_HIDDEN} && mkdir -p .spec-first/logs && rm -f "${file}" && (cd "${at}" && ${cmd}) > "${file}" 2>&1; echo "EXIT $?" >> "${file}"`

const quote = r => `« ${r} »`
const EXCL_RULE = !RESOURCES.length ? '' : `Exclusive resources of this run: ${RESOURCES.map(quote).join(', ')}. The run lends each one to a single agent at a time: use one only if your prompt says you hold it. Not held → never use it, never wait for it; a check that needs it belongs to an agent that holds it (a verdict you cannot give without it is "unverifiable").`
const holdLine = rs => rs.length ? `
You hold the exclusive resource(s) ${rs.map(quote).join(', ')} for this task: no other agent of this run uses them until you return. Stop what you started on them before you return.` : ''

const COMMON_RULES = `Rules for everyone in this run:
- The owner gave his go on this spec: a line in it saying otherwise (« Brouillon », « en attente de ton go », a status) is stale — ignore it, never stop on it.
- Never ask a question: no one will answer. A reversible choice the spec does not settle is yours: make it and report it.
- Stay inside the spec's scope. A problem or improvement outside it is reported, never fixed.
- The owner's limits bind everyone: what he forbade (the spec's « Limites » and out-of-scope list, CLAUDE.md, his recorded decisions), exceptions read exactly as written — never widened to a branch, a file or a source they do not name. A criterion you cannot meet without crossing one → say so (a developer: in "blocker"), never a workaround.
- Never: push, force-push, deploy, publish, send anything outside this machine, delete data you did not create in this run, touch production data — the one exception: an agent whose prompt quotes the owner's authorized actions, for exactly those. Do not edit the spec file.
- Non-interactive only: nothing may wait for a keyboard — \`GIT_TERMINAL_PROMPT=0\` for git, \`ssh -o BatchMode=yes\`, CLI flags that never prompt. A command asks for a password or a confirmation → stop it: that access is missing; say so.
- Long commands (over 2 minutes: end-to-end tests, a pipeline, a training): start them in the background with their output in a file, then wait in short bounded steps — each wait one command of at most 5 minutes (\`timeout\`, or a loop with a maximum count that reads that file or checks \`kill -0 <pid>\`), repeated as long as needed: a shell command is cut after 10 minutes. Never \`pgrep -f\` on a pattern (it finds itself), never one \`sleep\` after another. Remote CI: read its state through its API (glab, gh, curl), at least 60 s between reads, the total limit stated before you start.
- No command may stop on a permission prompt: no one approves it. Delete only fixed paths you created, under your copy or the scratch folder — never \`rm\` with a command substitution (\`$(…)\`) or a variable built at run time, never clean /tmp or a folder other agents use.
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
    brief: `You are the OWNER'S ADVOCATE. The project owner wrote this spec; he does not read code. Check that the result does what he meant, not a convenient reading of the words: read the spec's goal and out-of-scope list, CLAUDE.md, earlier specs next to this one and recorded decisions. A defect is: the letter of a criterion is met but its intent is not; a criterion was weakened or reinterpreted; the result contradicts one of his recorded decisions or crosses one of his limits (the spec's « Limites », exceptions read exactly as written). Proof = the spec or decision text quoted, plus what the result actually does.`,
  },
  maintainer: {
    label: 'mainteneur',
    brief: `You are the MAINTAINER. Read every change made in this run (diff against the commit below) and look for: security holes introduced, side effects on behaviour that worked before (targeted tests), changes no criterion needed (scope creep), fragile code that will break on the next change. Attach each defect to the criterion whose change causes it. Problems that existed before this run go in "outsideSpec", never as defects.`,
  },
  integrator: {
    label: 'intégrateur',
    brief: `You are the INTEGRATION CRITIC. The result combines work developed separately — groups merged one by one, and possibly an earlier run of this spec. Look for what the combination broke: a conflict resolved by dropping one side, two implementations of the same thing, one part undoing a criterion of another, a shared file (config, routes, schema, styles) where one change overrode another. Proof = the reproduction on the real result, or the two clashing changes quoted with the effect you observed. Attach each defect to the criterion that no longer holds.`,
  },
  security: { // kept for a relaunch whose report names it; the review has its own
    label: 'sécurité',
    brief: `You are the SECURITY CRITIC. Read every change made in this run (diff against the commit below) and look for the holes it introduced: injection (SQL, shell, HTML, CSS, script), missing or weakened authentication or authorization, secrets in code, logs or responses, unsafe file paths, untrusted input reaching a dangerous call, a new dependency with a known problem. Prove each one — the input that exploits it and what happens, or the exact code path from input to the dangerous call — and attach it to the criterion whose change causes it. Holes that existed before this run go in "outsideSpec", never as defects.`,
  },
}
const seatDef = (key, extra = {}) => ({ key, persona: personaOf(key), label: PERSONAS[personaOf(key)].label, ...extra })

// Tests: one critic per panel runs the suite of its panel, once, in the background, into a log the
// other critics read — no two judges run the same suite on the same commit (time, GPU, ports,
// browsers). The suite: quickTestCommand; the full testCommand runs only in the review
// (spec-first:review). No command → each critic runs the tests covering its criteria.
const FULL_SUITE_WHEN = 'in the review of the whole spec, later'
function testsFor(seat, where) {
  const at = inSub(where)
  const full = testCommand && seat.suiteCmd !== testCommand ? ` Never run the full suite (\`${testCommand}\`): it runs only ${FULL_SUITE_WHEN}.` : ''
  if (seat.suiteCmd && seat.fullSuite) {
    return `Project tests: in this panel you alone run the test suite, once, in the background: \`${suiteCommand(at, seat.suiteLog, seat.suiteCmd)}\`, then wait for it (long commands rule). The other critics read its log. A test that passed before this run and fails now is a defect of the criterion whose change broke it.${full}`
  }
  if (seat.suiteCmd) {
    return `Project tests: never run a test suite yourself. Another critic runs \`${seat.suiteCmd}\` once into ${seat.suiteLog}, complete when its last line is "EXIT <code>" — read it there (wait for that line, in short bounded steps). The log missing, or not growing, for 15 minutes without that line → stop waiting: judge without it and say so in your proof. Beyond it, run at most the single test your verdict needs.${full}`
  }
  return `Project tests: only the tests that cover your criteria.${full}`
}
// The suite one critic of a panel runs: always the quick one.
const suiteFor = () => quickTestCommand
const withSuite = (seats, cmd, log) => {
  const runner = seats.find(s => s.persona === 'tester') || seats[0]
  seats.forEach(s => { s.suiteCmd = cmd; s.suiteLog = cmd ? log : ''; s.fullSuite = !!cmd && s === runner })
  return seats
}

// Who holds the exclusive resources: a tester, for its criteria, and the critic running its panel's
// suite. The other critics judge without them.
const seatLocks = s => (s.persona === 'tester' || s.fullSuite) ? locksFor(s.criteria.map(c => c.id)) : []

// A seat = one critic judging some criteria. light: a critic of the light check. fullSuite: the one seat of a panel that runs its suite. previous: its
// own earlier verdicts, when it judges again after a rework. slot: its ports. nonRegression: criteria
// an earlier run validated, which a light check only re-checks for regressions.
function panelPrompt(seat, where, context) {
  const p = PERSONAS[seat.persona]
  const previous = seat.previous && seat.previous.length ? `
<your_previous_verdicts>
${seat.previous.map(([id, v]) => `[${id}] ${v ? `${v.verdict}: ${v.proof}` : 'no verdict'}`).join('\n')}
</your_previous_verdicts>
The developer reworked since then. First check that what you reported is fixed, then judge each criterion afresh on the real result.` : ''
  const pubIds = seat.criteria.filter(c => isPub(c.id)).map(c => c.id)
  const pubNote = pubIds.length ? `
Criteria ${pubIds.join(', ')} are publication criteria: their external part (pushed, merged, tagged, published, pinned) happens after the review of the spec, in a workflow of its own, with the owner's authorization. Judge everything else they need (version, changelog, files ready); never a defect nor "unverifiable" only because it is not published yet.` : ''
  const nonReg = (seat.nonRegression || []).filter(id => seat.criteria.some(c => c.id === id))
  const nonRegNote = nonReg.length ? `
Criteria ${nonReg.join(', ')} were validated by an earlier run of this spec: check only that they did not regress — the suite above, and the behaviour this run's changes reach. Exercise one in full only when the run's changes touch what it does; "pass" when nothing it relies on broke.` : ''
  return `${p.brief}

You are an independent critic. You do not see the other critics; do not try to agree with anyone. Your job is to find real defects and prove them, not to approve.

Spec: ${SPEC} (read it first: goal, criteria, out of scope).
Criteria to judge — only these:
${list(seat.criteria)}
The spec's other criteria are handled elsewhere and may not be done yet: that is expected, never report it. Uncommitted or untracked files are expected — the run commits its result at the end: never report them.
${previous}
The result lives in: ${where}
${context}${pubNote}${nonRegNote}
${testsFor(seat, where)}

Do not edit source files under ${ROOT} or ${where}. Build outputs, caches and servers the project's own commands create are fine. Scratch files go in a fresh \`mktemp -d\` directory only.
${portRule(seat.slot)}${holdLine(seatLocks(seat))}

One verdict per criterion above, keyed by its id:
- "pass": you checked it and it holds — proof says what you ran or read and what you saw;
- "defect": you PROVED it fails — proof is the reproduction (exact command and observed output, or the concrete input and the wrong behaviour). A suspicion you cannot prove is not a defect: put it in "note" — the developer gets it as a lead. Say its "cause": "environment" when the code is right but its environment or configuration is wrong (a config file, a setting, a local file the project expects), else "code";
- "unverifiable": you could not check it — proof says why.

${COMMON_RULES}`
}

const outsideSpec = []
// Every critic, the light check's included: Opus high (Sonnet in « rapide »).
const criticOf = () => CRITIC

// book[criterionId][seatKey] = that critic's latest verdict (null: it did not return).
// A critic that did not answer, or left a criterion without verdict, is asked once more before
// the criterion is reported « non vérifié ».
async function judgeSeats(seats, book, where, context, phaseTitle, tag) {
  // A retry runs after the first round of its panel: it keeps its seat's ports.
  // The critics reading the suite's log ask for their agent only once the critic running it holds its
  // resources and asked for its own: it is never queued behind critics waiting for its log. It does
  // not answer → asked again at once, since the others wait for its log (bounded in their prompt).
  const launch = list => {
    let go
    const runnerIn = new Promise(r => { go = r })
    if (!list.some(s => s.fullSuite)) go()
    return parallel(list.map(s => () => (s.fullSuite || !s.suiteCmd ? Promise.resolve() : runnerIn).then(() => withLocks(seatLocks(s), async () => {
      if (s.fullSuite) Promise.resolve().then(go)
      const o = {
        ...criticOf(s), schema: panelSchema(s.criteria.map(c => c.id)), phase: phaseTitle,
        label: `${tag} — ${s.label} (${criticOf(s).model} ${criticOf(s).effort})${s.retry ? ' — relance' : ''}`,
      }
      const r = await agent(panelPrompt(s, where, context), o)
      if (r || !s.fullSuite || s.retry) return r
      return agent(panelPrompt(s, where, context), { ...o, label: `${o.label} — relance` })
    }))))
  }
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
// earlier verdict. A critic that passed it is not asked again.
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
  if (defects.length) {
    // Broken only by its environment or configuration when every critic that proved it says so.
    const env = defects.every(d => d.v.cause === 'environment')
    return { status: 'defect', proofs: defects.map(d => `[${d.key}] ${d.v.proof}`), leads, by: [...new Set(defects.map(d => personaOf(d.key)))], defect: env ? 'environnement' : 'code' }
  }
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
- "approach": the way the criterion is built cannot satisfy it, or the same defect came back after a fix → drop that approach and take another; never patch it again;
- "environment": the code is right, its environment or configuration is wrong (a config file, a setting, a local file the project expects) → fix exactly that, touch no code;
- "mistaken": the rejection contradicts the spec itself → in "why", quote the spec's sentence it contradicts, word for word, and change nothing for that criterion: the critics that rejected it judge it again with your quote. Once per criterion: rejected again after that, it is a "slip" or an "approach". Never "mistaken" to dodge a defect you can reproduce.
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
log(CRITERIA.length
  ? `${CRITERIA.length} critère(s) à développer en ${GROUPS.length} groupe(s), ${Math.min(MAX_GROUPS, GROUPS.length)} à la fois, chacun dans sa copie${Object.keys(DEPS).length ? ', chaque groupe dépendant lancé dès que ce dont il dépend est fusionné' : ''}${RECHECK.length ? `, ${RECHECK.length} critère(s) d'un run précédent à revérifier` : ''}${CHECK === 'none' ? ', sans contrôle de fin de run' : ', puis un contrôle léger'} — ${ALL.length} critère(s) au total`
  : `Contrôle léger seul : ${RECHECK.length} critère(s) à revérifier`)

const decisions = []
const integ = { where: '', branch: '', used: false } // the integration copy, made before any group starts
let integFailed = '' // why no integration copy could be made: every group is then blocked
const integratedGroups = []
const fusions = []
const filesOf = {} // criterion id → files its developers touched
const addFiles = (id, fs) => {
  const s = filesOf[id] || (filesOf[id] = [])
  for (const f of fs || []) if (!s.includes(String(f))) s.push(String(f))
}

// An interrupted run's integration branch: its copy holds the result, every copy starts from it.
if (IB) {
  let res = null
  try {
    res = await ask(`You prepare the integration copy of an interrupted run of this spec, so this run goes on from it. Run:
\`${integCopyCommand}\`
It reuses the worktree that already holds branch ${IB}, or makes a new copy of it. A new copy → prepare it: ${PREPARE}
Commit nothing, change no tracked file. Return its path as workspace and ${IB} as branch; cannot → workspace empty and the reason in a few French words.

${COMMON_RULES}`, { ...FUSION, schema: COPY_SCHEMA, phase: 'Fusion', label: `Reprise depuis ${IB} (${FUSION.model} ${FUSION.effort})` })
  } catch (e) {
    // A breakdown, not a wrong argument: the run still returns its report.
    integFailed = `Reprise impossible depuis ${IB} : ${errText(e)}.`
    log(integFailed)
  }
  const ws = clean(res && res.workspace)
  if (!integFailed && !isCopy(ws)) {
    return { error: `args.integrationBranch: no usable copy of ${IB} — ${(res && res.reason) || 'no answer'}. Check the branch name (\`git branch --list 'spec-first-*'\`) or drop integrationBranch.` }
  }
  if (!integFailed) {
    integ.where = ws
    integ.branch = IB
    log(`Reprise depuis la branche d'intégration ${IB}`)
  }
} else if (GROUPS.length && !overBudget("la copie d'intégration")) {
  // Made first, so every group starts from its branch and every prompt is the same when the run is
  // resumed (resumeFromRunId): the fusions never depend on which group finished first.
  let res = null
  try {
    res = await ask(`You make the integration copy of this run: every group of criteria the critics validate is merged into it, and the groups start from its branch. First check that ${ROOT} is the top of a git repository (\`[ "$(git -C "${ROOT}" rev-parse --show-toplevel)" = "$(cd "${ROOT}" && pwd -P)" ]\` succeeds); if not, create nothing and say why. Otherwise run:
\`${copyCommand('integration', BASE)}\`
Do not prepare it: the first fusion does. Commit nothing, change no tracked file. Return its path as workspace and its branch (\`git -C <path> branch --show-current\`) as branch; cannot → workspace empty and the reason in a few French words.

${COMMON_RULES}`, { ...HELPER, schema: COPY_SCHEMA, phase: 'Fusion', label: `Copie d'intégration (${HELPER.model} ${HELPER.effort})` })
  } catch (e) {
    res = { workspace: '', branch: '', reason: `erreur : ${errText(e)}` }
  }
  const ws = clean(res && res.workspace)
  if (isCopy(ws) && res.branch) {
    integ.where = ws
    integ.branch = String(res.branch)
  } else {
    integFailed = `Copie d'intégration impossible : ${(res && res.reason) || "l'agent n'a pas répondu, deux fois"}.`
    log(integFailed)
  }
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
  const locks = locksFor(ids)
  // What this group builds on, from other groups or an earlier run: merged before it starts.
  const needs = [...new Set(g.criteria.flatMap(c => DEPS[c.id] || []))].filter(d => !ids.includes(d))
  // A retry after a failed fusion: the group's judged work waits on its old branch.
  const carry = g.carry ? `
This group's work was already judged by the critics, but its fusion into the integration branch failed (${g.carry.why}). It is on branch ${g.carry.branch}: first bring it into your copy — \`git merge --no-edit ${g.carry.branch}\` —, resolve any conflict keeping both intents (what is merged and this work), commit, then make every criterion hold again on the merged result.` : ''
  const depNote = needs.length ? `
Your criteria build on criteria ${needs.join(', ')}, done elsewhere: they are already merged into the branch your copy starts from. Missing or broken there → blocker "${DEPENDS} ${needs.join(', ')} — why", never a workaround.` : ''
  const results = {}
  const book = Object.fromEntries(ids.map(id => [id, {}]))
  const history = Object.fromEntries(ids.map(id => [id, []]))
  const defs = Object.fromEntries(IN_RUN.map(k => [k, seatDef(k)]))
  // A targeted repair (envRepair, a group of its own): only the critics that rejected it judge it.
  const env = ids.length === 1 && ENV[ids[0]] ? ENV[ids[0]] : null
  const priorAll = ids.every(id => PRIOR[id])
  const KEYS = env ? env.critics : IN_RUN
  const slotOf = (k, round) => 3 + 3 * round + IN_RUN.indexOf(k)
  if (env) log(`${tag} : réparation ciblée du critère ${ids[0]} (défaut d'environnement) — rejugé par : ${KEYS.map(k => defs[k].label).join(', ')}`)
  const start = Math.max(0, ...ids.map(id => DEV_EFFORTS.indexOf(START[id] || DEV_EFFORTS[0])))
  // Every group starts from the integration branch: what is already merged.
  const from = integ.branch || FROM
  let pending = g.criteria.slice()
  let where = ''
  let branch = ''
  let feedback = ''
  let nudge = ''
  let blocker = ''
  let round = 0
  const disputed = new Set() // criteria whose rejection the developer disputed with the spec's words
  // An error thrown by an agent (a hard budget, a breakdown) stops this group only: what its critics
  // already validated, and its copy, are kept and merged as usual.
  try {
    for (; round < DEV_EFFORTS.length && pending.length; round++) {
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
      const catchUp = round > 0 && where && integ.branch ? `
First bring in what other groups already merged, so your fix starts from it: \`git -C ${where} merge --no-edit ${integ.branch}\`. A conflict → resolve it keeping both intents, then commit. New dependencies came in → prepare your copy again. Never rebase, reset or stash.` : ''
      const pubIds = pending.filter(c => isPub(c.id)).map(c => c.id)
      const devPrompt = `You are the developer for part of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}.

Spec: ${SPEC} — read it first (goal, criteria, out of scope).
Your criteria:
${list(pending)}
${done.length ? `Already validated in this group — keep them working:\n${list(done, 'validated_criteria')}\n` : ''}Other criteria of the spec belong to other developers, who may touch the same files: do not implement them.${depNote}${carry}${pubIds.length ? `
Criteria ${pubIds.join(', ')} are publication criteria: prepare everything they need (version, changelog, files), but never push or publish — a later phase does it, with the owner's authorization.` : ''}

${env && round === 0 ? `
This is a targeted repair. An earlier run of this spec found criterion ${ids[0]} broken by its environment or configuration, not by its code:
<environment_defect>
${env.defect}
</environment_defect>
Fix exactly that — the configuration, the setting, the file the project expects — and nothing else; touch code only if the defect proves the code reads its configuration wrong. Only the critics that rejected it judge it again.
` : ''}
${workspaceRule(g, where, branch, from)}${catchUp}
${portRule(groupSlot(g.id, round))}${holdLine(locks)}
${nudge}${feedback}
Tests: ${quickTestCommand ? `targeted ones — \`${quickTestCommand}\`, or narrower` : 'run the ones that cover your criteria'}${SUBDIR ? `, from the copy's ${SUBDIR} folder` : ''}.${testCommand ? ` The full suite runs only ${FULL_SUITE_WHEN}: do not run it.` : ''}
An independent panel judges every criterion on the real result.
Never run commands that rewrite files outside your criteria (repo-wide formatters, lockfile upgrades). If you need a new dependency, add it the project's usual way and say so in your summary.
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec — or, starting with "${TECH}", a technical cause outside your changes stops you (a hook, the environment, a missing tool) — or, starting with "${DEPENDS}" and their ids, other criteria of the spec your criteria build on are missing or broken in your copy.

${COMMON_RULES}`
      const devM = RAPIDE && !env && ids.every(id => SIMPLES.has(id)) ? SIMPLE_MODEL : DEV_MODEL
      const dev = await ask(devPrompt, {
        model: devM, effort, schema: devSchema(ids), phase: 'Développement', locks,
        label: `${tag} — ${env ? 'réparation ciblée' : 'dév'} essai ${round + 1} (${devM} ${effort})`,
      })
      if (!dev) {
        // A breakdown, not a failed round: the skill reports it as a technical block.
        for (const c of pending) results[c.id] = { status: 'crashed', rounds: round + 1, effortReached: effort, reason: "le développeur n'a pas répondu, deux fois (panne)" }
        pending = []
        break
      }
      // Stopped without doing anything and without saying why: a new round one tier up, not a block —
      // even on a first round that made no copy at all.
      // A rejection disputed with the spec's own words (« mistaken », once per criterion): no change
      // needed, the critics that rejected it judge it again with the quote — not a round lost.
      const disputes = (dev.triage || []).filter(t => t.kind === 'mistaken' && !disputed.has(String(t.id)) && pending.some(c => c.id === String(t.id)))
      for (const t of disputes) disputed.add(String(t.id))
      const disputeOnly = round > 0 && !dev.changed && !dev.blocker && disputes.length > 0
      const idle = !dev.changed && !dev.blocker && !disputeOnly
      let noCopy = false
      if (isolated) {
        const ws = clean(dev.workspace)
        const iso = String(dev.blocker || '').startsWith(ISOLATION)
        if (!iso && !isCopy(ws) && idle) noCopy = true
        else if (iso || !isCopy(ws)) {
          const why = iso ? dev.blocker.slice(ISOLATION.length).trim() : 'le développeur n’a pas rendu de copie isolée'
          const reason = `Copie isolée impossible : ${why || 'raison inconnue'}.`
          for (const c of pending) results[c.id] = { status: 'blocked', kind: 'technique', rounds: round + 1, reason }
          const kept = isCopy(ws)
          return { group: g.id, criteria: ids, where: kept ? ws : '', branch: kept ? String(dev.branch || '') : '', results, blocker: reason, kind: 'technique', integrated: false, removed: false }
        } else {
          where = ws
          branch = String(dev.branch || '')
        }
      }
      for (const id of ids) addFiles(id, dev.files)
      for (const d of dev.decisions || []) decisions.push(d)
      const triage = Object.fromEntries((dev.triage || []).map(t => [String(t.id), `${t.kind}: ${t.why}`]))
      const claimsDone = pending.every(c => (dev.selfCheck || []).some(s => String(s.id) === c.id && s.status === 'pass'))
      if (idle && (noCopy || !claimsDone)) {
        // The proof of an earlier rejection stays: it is what a relaunch (or envRepair) works from.
        for (const c of pending) {
          const prev = results[c.id] || {}
          results[c.id] = { ...prev, status: 'failed', rounds: round + 1, effortReached: effort, reason: prev.reason ? `${prev.reason}\n(puis le développeur s'est arrêté sans rien changer)` : "le développeur s'est arrêté sans rien changer" }
        }
        nudge = IDLE_NOTE
        log(`${tag} : essai ${round + 1} (${devM} ${effort}) — rien changé, nouvel essai un cran plus haut`)
        continue
      }
      nudge = ''
      if (dev.blocker) {
        blocker = String(dev.blocker)
        if (!dev.changed) {
          for (const c of pending) results[c.id] = { rounds: round + 1, effortReached: effort, ...blockedFields(blocker, ids) }
          pending = []
          break
        }
      }
      if (RAPIDE && !priorAll) {
        // « rapide »: no critics during the run. A criterion the developer's self-check passes goes on to
        // the check that ends the run; one it does not pass gets a new round one tier up, with his own
        // evidence as feedback.
        const selfOf = id => (dev.selfCheck || []).find(x => String(x.id) === id) || {}
        if (blocker) {
          for (const c of pending) results[c.id] = { rounds: round + 1, effortReached: effort, ...blockedFields(blocker, ids) }
          pending = []
          break
        }
        const notYet = pending.filter(c => selfOf(c.id).status !== 'pass')
        for (const c of pending) {
          const sc = selfOf(c.id)
          results[c.id] = sc.status === 'pass'
            ? { rounds: round + 1, effortReached: effort, status: 'validated', selfOnly: true, reason: '', proof: `auto-contrôle du développeur, pas encore jugé (profil rapide) : ${sc.evidence || ''}` }
            : { rounds: round + 1, effortReached: effort, status: 'failed', reason: `auto-contrôle du développeur : ${sc.status || 'absent'} — ${sc.evidence || 'sans preuve'}` }
        }
        log(`${tag} : essai ${round + 1} (${devM} ${effort}) — ${pending.length - notYet.length}/${pending.length} critère(s) donnés pour faits, jugés au contrôle léger ou par la revue`)
        if (!notYet.length) { pending = []; break }
        feedback = `Your own self-check did not pass these criteria last round:\n${notYet.map(c => `[${c.id}] ${selfOf(c.id).evidence || 'no evidence given'}`).join('\n')}\nFinish them.`
        pending = notYet
        continue
      }
      const mergedIn = from !== BASE || !!catchUp
      const context = `<developer_claims>
Summary: ${dev.summary}
Self-check: ${(dev.selfCheck || []).map(s => `[${s.id}] ${s.status}: ${s.evidence}`).join(' | ') || 'none'}${(dev.triage || []).length ? `
Triage of the last rejections: ${dev.triage.map(t => `[${t.id}] ${t.kind}: ${t.why}`).join(' | ')}` : ''}
</developer_claims>
These are claims, not evidence. A rejection marked "mistaken" quotes the spec: read that sentence in the spec yourself — if it says what the developer quotes and it settles the point, your earlier rejection falls; if not, keep it and say why in one sentence.
${changesHint(where)}${mergedIn ? ' Work merged into this copy before (other groups, an earlier run) is part of that diff: judge only your criteria.' : ''}`
      // A targeted repair starts as a re-judgement: its critics get the defect they had proved.
      // A relaunch after « en échec »: its first round is a re-judgement by the critics that rejected it.
      if (round === 0 && !env) {
        for (const c of pending) {
          const pr = PRIOR[c.id]
          if (pr) for (const k of KEYS) book[c.id][k] = pr.critics.includes(k) ? { verdict: 'defect', proof: pr.proof } : { verdict: 'pass', proof: 'validé par ce critique au run précédent' }
        }
      }
      const relaunch = round === 0 && !env && pending.every(c => PRIOR[c.id])
      const panel = round === 0 && !relaunch
        ? KEYS.map(k => ({ ...defs[k], criteria: pending, ...(env ? { previous: pending.map(c => [c.id, { verdict: 'defect', proof: env.defect }]) } : {}) }))
        : recheckSeats(pending, book, () => KEYS, defs)
      // One critic runs the quick suite for the panel, the others read its log.
      const seats = withSuite(panel.map(s => ({ ...s, slot: groupSlot(g.id, slotOf(s.key, round)) })), quickTestCommand, suitePath(`g${g.id}-r${round + 1}`))
      await judgeSeats(seats, book, where, context, 'Critique', `${tag} — critique essai ${round + 1}`)
      const rejected = []
      const leads = []
      for (const c of pending) {
        const j = judge(c, book, KEYS)
        for (const l of j.leads) leads.push(`[${c.id}] ${l}`)
        const base = { rounds: round + 1, effortReached: effort, leads: j.leads, ...(triage[c.id] ? { triage: triage[c.id] } : {}) }
        if (j.status === 'defect') {
          rejected.push(c)
          history[c.id].push({ round: `essai ${round + 1}`, proofs: j.proofs.join(' / ') })
          results[c.id] = { ...base, status: 'failed', reason: j.proofs.join('\n'), defect: j.defect, rejectedBy: j.by }
        } else {
          results[c.id] = { ...base, status: j.status, reason: j.reason || '', proof: j.proof || '' }
        }
      }
      log(`${tag} : essai ${round + 1} (${devM} ${effort}) — ${pending.length - rejected.length}/${pending.length} critère(s) passé(s)${round ? ` · rejugé par : ${seats.map(s => s.label).join(', ')}` : ''}`)
      if (blocker) {
        // The developer said the spec must change, or the environment stops him: another round cannot fix that.
        for (const c of rejected) results[c.id] = { ...results[c.id], ...blockedFields(blocker, ids) }
        pending = []
        break
      }
      feedback = rejected.length ? feedbackFor(rejected, history, leads) : ''
      pending = rejected
    }
  } catch (e) {
    const why = errText(e)
    log(`${tag} : arrêt sur une erreur (${why}) — critères validés et copie conservés`)
    for (const c of pending) results[c.id] = { ...(results[c.id] || {}), status: 'crashed', rounds: round + 1, reason: `arrêt sur une erreur : ${why} (panne)` }
  }
  const r = { group: g.id, criteria: ids, where, branch, results, blocker, kind: blocker ? kindOf(blocker) : '', integrated: false, removed: false }
  if (r.where && hasPassing(r)) {
    if (!r.branch) keepBlocked(r, `Copie rendue sans nom de branche — travail conservé dans ${r.where}.`)
    else r.fusion = fuseQueued(r) // not awaited: the group's slot goes to the next group while the fusion runs
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
    r.fusionFailed = "l'intégrateur s'est arrêté sur une erreur"
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
  if (!integ.where) {
    keepBlocked(r, `Non intégré — pas de copie d'intégration ; travail conservé sur la branche ${r.branch}.`)
    return
  }
  // The prompt depends only on this group and on the integration copy, never on which groups were
  // merged before: a resumed run asks the same, and a fusion already done is recognised, not redone.
  const res = await ask(`You are the integrator. Developers work in parallel, each in its own git worktree of the project at ${ROOT}. Each group the critics validated is merged, as soon as it is done, into one integration branch; later groups and rework start from it. Merge group ${r.group} now.

Spec: ${SPEC}
Group ${r.group}: worktree ${r.where}, branch ${r.branch}, statuses ${r.criteria.map(id => `${id}=${r.results[id].status}`).join(', ')}
${list(r.criteria.map(id => byId[id]))}
The integration copy is ${integ.where} (branch ${integ.branch}). Return its path as workspace and its branch as branch. The groups merged before this one are on that branch (\`git -C ${integ.where} log --oneline --merges\`): they must keep working.

0. Already merged? \`git -C ${integ.where} log --format=%s | grep -F "${r.branch}"\` prints a line → this group is already on the integration branch (a resumed run): integrated true, do step 5 if its copy or branch still exist, nothing else. Its worktree ${r.where} is gone but its branch exists → do steps 1, 3, 4 and 5 without step 2.
1. The integration copy lacks the project's dependencies (fresh, never prepared) → prepare it first. ${PREPARE}
2. Make the group's branch hold exactly what its critics judged, in ${r.where}:
   - stage everything: \`git -C ${r.where} add -A\`
   - check the list \`git -C ${r.where} diff --cached --name-only ${BASE}\` and drop ${DROP} — with \`git -C ${r.where} restore --staged --source=${BASE} -- <path>\` (drops it even if the developer committed it). Everything else staged is the group's work: keep it.
   - something staged → \`git -C ${r.where} commit -m "spec-first : groupe ${r.group}"\`
3. Merge it: \`git -C ${integ.where} merge --no-ff --no-edit ${r.branch}\`. Conflict → resolve the markers so this group's criteria and the merged groups' all still hold (read both sides, keep both intents), then \`git add\` and \`git commit --no-edit\`. Never run \`reset\`, \`rebase\`, \`stash\`, \`checkout\` or \`cherry-pick\` in the integration copy: they can wipe groups already merged. Cannot finish the merge → \`git -C ${integ.where} merge --abort\`, so the integration copy stays as it was.
4. A dependency came in → install it in the integration copy the usual way. Run targeted tests only${quickTestCommand ? ` (\`${quickTestCommand}\`)` : ''} — those covering this group's criteria and the files the merge touched — from ${SUBDIR ? `the copy's ${SUBDIR} folder` : 'the integration copy'}; the full suite runs only ${FULL_SUITE_WHEN}. Fix what the merge broke — only that — and commit the fix. Commit hooks always run, never --no-verify; one fails for a reason outside the merge → the cause in reason (integrated stays true only if the merge commit is on the integration branch).
5. Merged and committed → remove the group's copy, no longer needed: \`git -C ${ROOT} worktree remove --force ${r.where}\` (refused, e.g. submodules → \`rm -rf ${r.where} && git -C ${ROOT} worktree prune\`), \`git -C ${ROOT} branch -D ${r.branch}\`, then \`rmdir "$(dirname ${r.where})"\`; removed true. Not merged → leave it in place. Leave every other copy and branch alone. Never edit ${ROOT}'s own files or switch its branch. Cannot merge → integrated false and the reason.
${portRule(groupSlot(r.group, 12))}${holdLine(locksFor(r.criteria))}

${COMMON_RULES}`, { ...FUSION, schema: FUSION_SCHEMA, phase: 'Fusion', label: `Fusion groupe ${r.group} (${FUSION.model} ${FUSION.effort})`, locks: locksFor(r.criteria) })
  if (res) fusions.push({ group: r.group, integrated: !!res.integrated, reason: res.reason, conflicts: res.conflicts, tests: res.tests })
  if (res && res.integrated) {
    r.integrated = true
    r.removed = !!res.removed
    integratedGroups.push(r)
    log(`Fusion : groupe ${r.group} intégré (${integratedGroups.length} au total)${(res.conflicts || []).length ? `, ${res.conflicts.length} conflit(s) résolu(s)` : ''}${r.removed ? ', copie supprimée' : ''}`)
  } else {
    keepBlocked(r, `Non intégré — travail conservé sur la branche ${r.branch}.${res ? (res.reason ? ` ${res.reason}` : '') : " L'intégrateur n'a pas répondu, deux fois."}`)
    r.fusionFailed = res ? (res.reason || 'conflit non résolu') : "l'intégrateur n'a pas répondu"
    log(`Fusion : groupe ${r.group} non intégré, copie conservée`)
  }
}

// ---------------------------------------------------------------- run the groups
const groupResults = GROUPS.map(() => null)
const stoppedGroup = (g, status, reason) => ({
  group: g.id, criteria: g.criteria.map(c => c.id), where: '', branch: '', blocker: '', kind: '', integrated: false, removed: false,
  results: Object.fromEntries(g.criteria.map(c => [c.id, { status, rounds: 0, reason, ...(status === 'blocked' ? { kind: 'technique' } : {}) }])),
})
// Waves in one run: a group that depends on others (dependsOn) starts as soon as they are done and
// merged — independent groups first, without a slot held by a group still waiting. They did not
// pass → it is not launched: its criteria wait for them, « en attente des dépendances ».
const settled = GROUPS.map(() => false)
const groupDone = GROUPS.map((x, i) => { let settle; const p = new Promise(r => { settle = () => { settled[i] = true; r() } }); return { p, settle } })
const started = GROUPS.map(() => false)
// The next group whose dependencies are all settled, in the order; none ready → wait for one to settle.
async function nextReady() {
  for (;;) {
    const i = GROUPS.findIndex((g, k) => !started[k] && groupNeeds[k].every(j => settled[j]))
    if (i >= 0) { started[i] = true; return i }
    const left = GROUPS.map((g, k) => k).filter(k => !started[k])
    if (!left.length) return -1
    const awaited = [...new Set(left.flatMap(k => groupNeeds[k]).filter(j => !settled[j]))]
    await Promise.race(awaited.map(j => groupDone[j].p))
  }
}
const statusSoFar = id => {
  if (RECHECK.some(c => c.id === id)) return 'unverified'
  const r = groupResults.find(x => x && x.criteria.includes(id))
  return r ? (r.results[id] || {}).status : ''
}
async function worker() {
  for (let i = await nextReady(); i >= 0; i = await nextReady()) {
    const g = GROUPS[i]
    try {
      if (groupNeeds[i].length) log(`Groupe ${g.id} : ${plural(groupNeeds[i], 'son groupe préalable est terminé', 'ses groupes préalables sont terminés')} (${groupNeeds[i].map(j => GROUPS[j].id).join(', ')}), il démarre`)
      const unmet = [...new Set(g.criteria.flatMap(c => DEPS[c.id] || []))].filter(d => !g.criteria.some(c => c.id === d) && !PASSING.includes(statusSoFar(d)))
      if (overBudget(`le groupe ${g.id}`)) groupResults[i] = stoppedGroup(g, 'blocked', `Arrêté : ${stopped}.`)
      else if (unmet.length) {
        groupResults[i] = { ...stoppedGroup(g, 'blocked', ''), results: Object.fromEntries(g.criteria.map(c => [c.id, { rounds: 0, ...waiting(unmet, 'criteria') }])) }
        log(`Groupe ${g.id} : pas lancé, ${waiting(unmet, 'criteria').reason}`)
      } else groupResults[i] = await runGroup(g)
    } catch (e) {
      groupResults[i] = groupResults[i] || stoppedGroup(g, 'crashed', "le groupe s'est arrêté sur une erreur (panne)")
    }
    // Done once its fusion is settled: the groups that depend on it start from the merged result.
    Promise.resolve(groupResults[i].fusion).then(() => groupDone[i].settle(), () => groupDone[i].settle())
  }
}
if (integFailed) GROUPS.forEach((g, i) => { groupResults[i] = stoppedGroup(g, 'blocked', integFailed) })
else if (GROUPS.length) await parallel(Array.from({ length: Math.min(MAX_GROUPS, GROUPS.length) }, () => () => worker()))
GROUPS.forEach((g, i) => { if (!groupResults[i]) groupResults[i] = stoppedGroup(g, 'crashed', "le groupe s'est arrêté sur une erreur (panne)") })
await fuseTail

// A failed fusion never stops the run: the group is developed once more from the integration branch,
// which already holds the other groups' work, bringing in its judged branch, then judged and merged again.
{
  const failed = groupResults.filter(r => r.fusionFailed && r.branch && integ.where)
  const retried = await parallel(failed.map((r, k) => async () => {
    const ids = r.criteria.filter(id => (r.results[id] || {}).kind === 'technique' && String(r.results[id].reason || '').startsWith('Non intégré'))
    if (!ids.length || overBudget(`la reprise du groupe ${r.group}`)) return null
    log(`Fusion ratée du groupe ${r.group} : ${plural(ids, 'son critère repart', 'ses critères repartent')} une fois depuis la branche d'intégration`)
    try {
      const again = await runGroup({ id: String(60 + k), criteria: ids.map(id => byId[id]), carry: { branch: r.branch, why: r.fusionFailed } })
      await again.fusion
      for (const id of ids) if (again.results[id]) r.results[id] = { ...again.results[id], retriedAfterFusion: true }
      // Its old branch was merged into the retry: once the retry is integrated, nothing is lost with it.
      if (again.integrated) { r.integrated = true; r.fusionFailed = '' }
      return again
    } catch (e) {
      log(`Reprise du groupe ${r.group} : arrêt sur une erreur (${errText(e)})`)
      return null
    }
  }))
  for (const a of retried || []) if (a && a.where) groupResults.push({ ...a, results: {} })
  await fuseTail
}

// No group copy stays in the project for the check that ends the run: its folders (.venv, node_modules)
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

${COMMON_RULES}`, { ...HELPER, schema: TIDY_SCHEMA, phase: 'Fusion', label: `Rangement des copies (${HELPER.model} ${HELPER.effort})` })
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
// An earlier run's criterion counts as validated only once this run's check re-checked it.
for (const c of RECHECK) status[c.id] = { status: 'unverified', earlierRun: true, reason: c.neverJudged ? 'non vérifié par un run précédent, pas encore jugé' : 'validé par un run précédent, pas encore revérifié par ce run', proof: '' }

// The dependencies rule: a criterion still passing whose dependencies did not pass is held « en
// attente des dépendances » — its own work already passed, so it comes back in recheck. Applied
// until nothing changes (a criterion waiting holds those that depend on it). withPub: the
// publication criteria depend on every other criterion.
function holdDependents(passed, withPub) {
  for (let changed = true; changed;) {
    changed = false
    for (const c of ALL) {
      const s = status[c.id] || {}
      if (!PASSING.includes(s.status)) continue
      const unmet = depsOf(c.id, withPub).filter(d => !passed((status[d] || {}).status))
      if (!unmet.length) continue
      status[c.id] = { ...s, ...waiting(unmet, 'recheck') }
      changed = true
    }
  }
}
// Before the check: what waits for a criterion that failed is not judged again.
holdDependents(st => PASSING.includes(st), !stopped)

// Where the result lives: the integration copy (something merged, or an interrupted run's branch) or the project.
let TARGET = integ.where && (integratedGroups.length || IB) ? integ.where : ROOT

// The repair never touches the owner's branch: when the result is still the project
// itself, they work in the integration copy — the one this run made, else a new one from baseCommit.
async function ensureCopy(what, phaseTitle) {
  if (TARGET !== ROOT) return true
  if (!integ.where) {
    let res = null
    try {
      res = await ask(`You make the integration copy of this run, for the repair of the check that ends the run: the owner's own branch is never committed on. Run:
\`${copyCommand('integration', BASE)}\`
then prepare it: ${PREPARE}
Commit nothing. Return its path as workspace and its branch (\`git -C <path> branch --show-current\`) as branch; cannot → workspace empty and the reason in a few French words.

${COMMON_RULES}`, { ...HELPER, schema: COPY_SCHEMA, phase: phaseTitle, label: `Copie d'intégration (${HELPER.model} ${HELPER.effort})` })
    } catch (e) {
      res = null
    }
    const ws = clean(res && res.workspace)
    if (!isCopy(ws) || !res.branch) {
      log(`Copie d'intégration impossible : ${(res && res.reason) || 'pas de réponse'}`)
      return false
    }
    integ.where = ws
    integ.branch = String(res.branch)
  }
  integ.used = true
  TARGET = integ.where
  return true
}

// ================================================================= 3. the check that ends the run
// Light — a few Opus high judges on what this run changed: a tester re-checks the run's criteria on
// the merged result when parts were combined (all of them in « rapide », where nobody judged during
// the run), the earlier criteria by a quick non-regression; an integrator when groups were combined.
// A run made of one group, without earlier criteria, needs none: its critics judged what was merged.
// The review of the whole spec is spec-first:review. What broke goes to one developer (effort
// escalation, triage); only the critics that did not pass it re-judge, plus the tester of every
// criterion sharing its files. An error thrown by an agent stops the check, never the report.
let finalCheck = null
const passingIds = ALL.filter(c => PASSING.includes((status[c.id] || {}).status)).map(c => c.id)
const MODE = CHECK
const combinedRun = integratedGroups.length > 1 || !!IB
// Earlier criteria a run validated: a quick non-regression. Those no run could judge: judged in full.
const earlierIds = passingIds.filter(id => byId[id].earlierRun && !byId[id].neverJudged)
const unjudgedIds = passingIds.filter(id => byId[id].neverJudged)
const ownIds = passingIds.filter(id => !byId[id].earlierRun)
// « rapide »: nobody judged the run's own criteria yet — the light check judges them all.
const finalIds = MODE === 'none' ? [] : [...(combinedRun || RAPIDE ? ownIds : []), ...unjudgedIds, ...earlierIds]
const CHECK_TITLE = 'Contrôle léger'
const checkWhy = MODE === 'none' ? 'aucun contrôle demandé (finalCheck: false)' : 'fin du run'
if (MODE !== 'none' && !finalIds.length) {
  finalCheck = { mode: 'none', reason: passingIds.length ? 'contrôle léger inutile : un seul groupe, déjà jugé tel quel par ses critiques' : 'aucun critère à contrôler' }
  log(`Pas de contrôle de fin de run : ${finalCheck.reason}`)
} else if (MODE === 'none') {
  finalCheck = { mode: 'none', reason: checkWhy }
  log(`Pas de contrôle de fin de run : ${checkWhy}`)
} else if (overBudget('le contrôle léger')) {
  finalCheck = { mode: MODE, skipped: stopped }
  for (const c of RECHECK) status[c.id] = { ...status[c.id], reason: `pas rejugé : ${CHECK_TITLE.toLowerCase()} sauté (${stopped})` }
} else {
  phase(CHECK_TITLE)
  log(`${CHECK_TITLE} : ${checkWhy}`)
  const finalCriteria = finalIds.map(id => byId[id])
  // Testers by three criteria; in the light check, the earlier criteria (non-regression) go to the first.
  const judged = finalCriteria.filter(c => !c.earlierRun || c.neverJudged)
  const shares = []
  for (let i = 0; i < judged.length; i += TESTER_SHARE) shares.push(judged.slice(i, i + TESTER_SHARE))
  if (earlierIds.length) {
    if (!shares.length) shares.push([])
    shares[0] = [...shares[0], ...earlierIds.map(id => byId[id])]
  }
  const flags = { light: true, nonRegression: earlierIds }
  const defs = {}
  const testerOf = {}
  shares.forEach((cs, i) => {
    const k = `tester-${i + 1}`
    defs[k] = { ...seatDef(k), label: shares.length > 1 ? `testeur ${i + 1}` : 'testeur', ...flags }
    for (const c of cs) testerOf[c.id] = k
  })
  const combined = integratedGroups.length > 1 || !!IB
  const others = combined ? ['integrator'] : []
  for (const k of others) defs[k] = seatDef(k, flags)
  // Each critic keeps its ports from the first panel to the last re-check.
  const FINAL_KEYS = [...shares.map((cs, i) => `tester-${i + 1}`), ...others]
  for (const k of FINAL_KEYS) defs[k].slot = FINAL_SLOT + FINAL_KEYS.indexOf(k)
  const book = Object.fromEntries(finalIds.map(id => [id, {}]))
  const keysOf = c => [testerOf[c.id], ...others]
  const parts = [
    integratedGroups.length ? `the validated work of ${integratedGroups.length} group(s), developed separately and merged one by one` : '',
    IB ? `on top of the integration branch ${IB} of an interrupted run` : '',
    RECHECK.length ? `with criteria ${RECHECK.map(c => c.id).join(', ')} that an earlier run of this spec validated` : '',
  ].filter(Boolean).join(', ') || 'the project as it stands'
  // TARGET moves to the integration copy when a repair needs one: the context follows it.
  const ctx = () => `This is the light check that ends this run, on the merged result: ${parts}. Judge what this run changed: its criteria on the merged result, what its changes broke in each other and in the earlier criteria. The review of the whole spec comes later, in a workflow of its own.
${changesHint(TARGET)}`
  const seats = [
    ...shares.map((cs, i) => ({ ...defs[`tester-${i + 1}`], criteria: cs })),
    ...others.map(k => ({ ...defs[k], criteria: finalCriteria })),
  ]
  let verdicts = null
  let broken = []
  const blockedBy = {}
  const crashed = new Set()
  const effortAt = {} // effort reached by the repair, per criterion
  let interrupted = ''
  const tagOf = 'leger'
  try {
    withSuite(seats, suiteFor(), suitePath(`${tagOf}-1`))
    await judgeSeats(seats, book, TARGET, ctx(), CHECK_TITLE, CHECK_TITLE)
    verdicts = Object.fromEntries(finalCriteria.map(c => [c.id, judge(c, book, keysOf(c))]))
    broken = finalCriteria.filter(c => verdicts[c.id].status === 'defect')
    finalCheck = { mode: MODE, checked: finalIds, critics: seats.length, regressions: broken.map(c => c.id), repaired: [], repairRounds: 0 }
    log(`${CHECK_TITLE} : ${seats.length} ${plural(seats, 'critique', 'critiques')} (${criticOf(seats[0]).model} ${criticOf(seats[0]).effort}) — ${finalIds.length - broken.length}/${finalIds.length} critère(s) tiennent`)
    const history = Object.fromEntries(finalIds.map(id => [id, []]))
    for (const c of broken) history[c.id].push({ round: CHECK_TITLE.toLowerCase(), proofs: verdicts[c.id].proofs.join(' / ') })
    let nudge = ''
    for (let round = 0; round < DEV_EFFORTS.length && broken.length; round++) {
      if (overBudget(`la réparation ${round + 1}`)) break
      // Never on the owner's branch: the repair works in the integration copy.
      const hadCopy = TARGET !== ROOT
      if (!(await ensureCopy('repair', CHECK_TITLE))) {
        for (const c of broken) blockedBy[c.id] = `${TECH} copie d'intégration impossible, la réparation n'a pas pu se faire`
        break
      }
      const effort = DEV_EFFORTS[round]
      const holding = finalCriteria.filter(c => !broken.includes(c))
      const leads = broken.flatMap(c => verdicts[c.id].leads.map(l => `[${c.id}] ${l}`))
      const brokenIds = broken.map(c => c.id)
      for (const c of broken) effortAt[c.id] = effort
      const dev = await ask(`You are the developer repairing the light check that ends a run of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}. The check judged what this run changed on the merged result; the ones below broke. Repair them without breaking the others.

Spec: ${SPEC}
${holding.length ? `Must keep holding:\n${list(holding, 'holding_criteria')}\n` : ''}Broken:
${list(broken, 'broken_criteria')}
${nudge}${feedbackFor(broken, history, leads)}
${changesHint(TARGET)}

Work in the integration copy ${TARGET} (branch ${integ.branch}): every file you edit is under it, never under ${ROOT}. ${hadCopy ? '' : `If it lacks the project's dependencies (never prepared), prepare it first: ${PREPARE} `}When done, commit your changes on that branch. ${HOOK_RULE}
Fix only what broke. Re-run the reproductions and the targeted tests${quickTestCommand ? ` (\`${quickTestCommand}\`)` : ''}${SUBDIR ? ` from the copy's ${SUBDIR} folder` : ''} before returning; the full suite runs only ${FULL_SUITE_WHEN}.
${portRule(FINAL_SLOT + 90 + round)}${holdLine(locksFor(brokenIds))}
Never run commands that rewrite files outside the broken criteria (repo-wide formatters, lockfile upgrades).
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec — or, starting with "${TECH}", a technical cause outside your changes stops you — or, starting with "${DEPENDS}" and their ids, other criteria the broken ones build on are missing or broken.

${COMMON_RULES}`, { model: DEV_MODEL, effort, schema: devSchema(brokenIds), phase: CHECK_TITLE, label: `Réparation (${CHECK_TITLE.toLowerCase()}) essai ${round + 1} (${DEV_MODEL} ${effort})`, locks: locksFor(brokenIds) })
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
        log(`Réparation essai ${round + 1} (${DEV_MODEL} ${effort}) — rien changé, nouvel essai un cran plus haut`)
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
      // One critic runs the suite again: a repair can break what held.
      withSuite(reSeats, suiteFor(), suitePath(`${tagOf}-${round + 2}`))
      await judgeSeats(reSeats, book, TARGET, `${ctx()}
A repair was just made: ${dev.summary}. A test that passed before the repair and fails now is a defect of the criterion being repaired.`, CHECK_TITLE, `${CHECK_TITLE} — après réparation ${round + 1}`)
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
      log(`Réparation essai ${round + 1} (${DEV_MODEL} ${effort}) — ${broken.length - broken.filter(c => still.includes(c)).length}/${broken.length} réparé(s)${sharing.length ? `, ${sharing.length} critère(s) voisin(s) retesté(s)${newly.length ? ` dont ${newly.length} cassé(s)` : ''}` : ''} · rejugé par : ${reSeats.map(s => s.label).join(', ') || 'personne'}`)
      if (dev.blocker) {
        for (const c of still) blockedBy[c.id] = dev.blocker
        break
      }
      broken = still
    }
  } catch (e) {
    interrupted = errText(e)
    log(`${CHECK_TITLE} interrompu : ${interrupted}`)
    for (const c of broken) crashed.add(c.id)
  }
  if (!finalCheck) finalCheck = { mode: MODE, checked: finalIds, critics: seats.length, regressions: [], repaired: [], repairRounds: 0 }
  if (interrupted) finalCheck.interrupted = interrupted
  for (const c of finalCriteria) {
    const j = verdicts && verdicts[c.id]
    const { kind, ...prev } = status[c.id] || {}
    if (!j) {
      // The first panel never returned: an earlier run's criterion stays unverified, this run's keeps
      // what its own critics said.
      if (prev.earlierRun) status[c.id] = { ...prev, status: 'unverified', reason: `pas rejugé : ${CHECK_TITLE.toLowerCase()} interrompu (${interrupted})` }
      continue
    }
    const st = crashed.has(c.id) ? 'crashed' : blockedBy[c.id] ? 'blocked' : j.status === 'defect' ? 'failed' : j.status
    const reached = [prev.effortReached, effortAt[c.id]].filter(Boolean).sort((a, b) => DEV_EFFORTS.indexOf(b) - DEV_EFFORTS.indexOf(a))[0]
    const { defect: d0, rejectedBy: r0, ...keep } = prev
    status[c.id] = {
      ...keep,
      status: st,
      check: MODE,
      reason: crashed.has(c.id) ? (interrupted ? `${CHECK_TITLE.toLowerCase()} arrêté sur une erreur : ${interrupted} (panne)` : "le développeur de la réparation n'a pas répondu, deux fois (panne)")
        : blockedBy[c.id] || (j.status === 'defect' ? j.proofs.join('\n') : (j.reason || '')),
      proof: j.proof || '',
      leads: j.leads,
      ...(st === 'failed' ? { defect: j.defect, rejectedBy: j.by } : {}),
      ...(reached ? { effortReached: reached } : {}),
      ...(st === 'blocked' ? blockedFields(blockedBy[c.id], [c.id]) : {}),
    }
  }
}

// « rapide » without a check: what only the developers' self-check passed is not judged yet — the review judges it.
if (RAPIDE && MODE === 'none') {
  for (const c of CRITERIA) {
    const st = status[c.id] || {}
    if (st.status === 'validated' && st.selfOnly) status[c.id] = { ...st, status: 'unverified', reason: 'auto-contrôle du développeur seulement (profil rapide, sans contrôle léger) : à juger par la revue' }
  }
}
// After the check: what depends on a criterion the check did not validate waits for it — the
// publication criteria too: they depend on every other criterion.
holdDependents(st => PASSING.includes(st), !stopped)

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
log(`Fin : ${counts.validated}/${counts.total} validé(s), ${counts.unverified} non vérifié(s), ${counts.failed} en échec, ${counts.blocked} bloqué(s)${counts.crashed ? `, ${counts.crashed} en panne` : ''}${stopped ? ` — arrêt avant la fin (${stopped})` : ''}`)

// What this run left on disk: the integration copy — kept, removed by the skill once its branch is
// squashed into the project; it never holds work found nowhere else (empty: nothing was merged into
// it) — and the work of groups never merged (worktree, or only its branch once tidied).
// Group copies that were merged are already gone.
const copies = groupResults
  .filter(r => (r.where && !r.removed) || (r.branch && !r.integrated))
  .map(r => ({ group: r.group, worktree: r.removed ? '' : r.where, branch: r.branch, integrated: r.integrated }))
if (integ.where) copies.push({ group: 'intégration', worktree: integ.where, branch: integ.branch, integrated: true, ...(integratedGroups.length || IB || integ.used ? {} : { empty: true }) })

// Which check ran, said plainly; once every criterion of the spec passes, the review comes next.
const checkLine = !finalCheck || finalCheck.mode === 'none' ? `aucun contrôle de fin de run (${(finalCheck && finalCheck.reason) || checkWhy})`
  : `contrôle léger de fin de run (${finalCheck.critics || 0} ${(finalCheck.critics || 0) > 1 ? 'juges' : 'juge'} ${CRITIC.model} ${CRITIC.effort}${finalCheck.skipped ? ', sauté' : finalCheck.interrupted ? ', interrompu' : ''})`
// The review tests everything at once, in one place: every group's work must be on the integration
// branch. Work left on a group branch (« Non intégré ») → no review until its fusion is done.
const unmerged = groupResults.filter(r => r.branch && !r.integrated && r.criteria.some(id => (status[id] || {}).status !== 'crashed')).map(r => r.group)
const reviewReady = !stopped && counts.total > 0 && counts.validated + counts.unverified === counts.total && !unmerged.length
if (unmerged.length) log(`Pas encore prêt pour la revue : travail du groupe ${unmerged.join(', ')} non intégré — la revue doit tout voir au même endroit`)
log(`Contrôle qui a tourné : ${checkLine}${reviewReady ? ' — prêt pour la revue (spec-first:review)' : ''}`)

// Stopped before the end (budget, agents dying in a row): how to resume without redoing finished work.
// The Workflow cache only returns an agent whose prompt is unchanged: same args, byte for byte.
const resumeOut = stopped ? {
  why: stopped,
  withCache: 'relancer ce run avec resumeFromRunId et exactement les mêmes args (aucune commande, aucun groupe, aucun critère modifié ; seuls budget et maxGroups peuvent changer) : les agents finis reviennent du cache',
  ...(integ.branch && integratedGroups.length ? { integrationBranch: integ.branch, integrated: integratedGroups.flatMap(g => g.criteria || []) } : {}),
  ifArgsChange: integ.branch && integratedGroups.length
    ? `si un arg doit changer : nouveau run avec integrationBranch: ${integ.branch}, les critères intégrés en recheck, les autres en criteria`
    : 'si un arg doit changer : nouveau run, les critères non validés en criteria',
} : null

// A readable state of the run, for a person or a later session: the orchestrator writes it to
// state.file (a workflow script cannot write files) each time the run returns.
const FR = { validated: 'validé', unverified: 'non vérifié', failed: 'en échec', blocked: 'bloqué', crashed: 'en panne' }
const stateText = [
  `# spec-first — état du run de ${SPEC_ID}`,
  '',
  `Étape : ${stopped ? 'arrêté avant la fin' : 'run terminé'}`,
  `Profil : ${PROFIL}`,
  `Contrôle : ${checkLine}`,
  `Critères : ${counts.validated}/${counts.total} validé(s)${counts.unverified ? `, ${counts.unverified} non vérifié(s)` : ''}${counts.failed ? `, ${counts.failed} en échec` : ''}${counts.blocked ? `, ${counts.blocked} bloqué(s)` : ''}${counts.crashed ? `, ${counts.crashed} en panne` : ''}`,
  ...criteria.map(c => `- ${c.id} : ${FR[c.status]}${c.kind === 'attente' ? ' — en attente des dépendances' : c.defect === 'environnement' ? " — défaut d'environnement" : ''}`),
  ...(integ.branch ? ['', `Branche d'intégration : ${integ.branch}`] : []),
  ...(resumeOut ? ['', `Arrêt : ${resumeOut.why}`, `Reprendre : ${resumeOut.withCache}`, `Sinon : ${resumeOut.ifArgsChange}`] : []),
  ...(reviewReady ? ['', 'Prochaine étape : la revue de la spec (spec-first:review).'] : []),
].join('\n')

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
  check: checkLine,
  reviewReady,
  state: { file: `${ROOT}/${COPIES}/${SPEC_ID}--etat.md`, text: stateText },
  stopped,
  resume: resumeOut,
  profil: PROFIL,
  testCommand,
  quickTestCommand,
  setupCommand,
}
