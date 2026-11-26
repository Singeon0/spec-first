export const meta = {
  name: 'run',
  description: 'spec-first development run, one profile: every agent Opus, effort high at least. It opens with an inventory: the suite command checked, emptied of earlier settings and given this run\'s test commands; the integration branch spec-first-<specId>--integration made or found again (a merge left half done in it aborted, uncommitted changes stop the run), and the criteria its Spec-First-Validated trailers show already integrated skipped. Then small groups of criteria, a few at a time, each developed in its own copy (high, xhigh after a rejection or a failed self-check), a group starting as soon as what it depends on is merged; the developer\'s own check stands (the command he ran and its decisive output) — except for the socle, a group at least two others depend on, which one Opus high tester critic judges before its fusion. Each finished group merged at once into the integration branch (only the tests of the files changed on both sides; a group others depend on merged alone), its copy then removed. The run ends with the quick suite once on the integration branch, through the suite command; red → a targeted repair, twice at most, the verdict read again each time by a high helper. Criteria no critic judged come back « non vérifié »: the review of the whole spec (spec-first:review, a separate workflow) judges them all, then publishes.',
  whenToUse: 'Called by the spec-first skill after the owner gave his go on a spec; spec-first:review follows once every criterion passes. Before the call, the skill copies the plugin\'s scripts/suite to <projectRoot>/.spec-first/bin/suite (executable): missing → the run stops at once, stopped says so. args: { specPath, projectRoot, baseCommit, criteria: [{ id, text }], specBrief?, groups?: [[ids]], quickTestCommand?, testCommand?, heavy?: { [id]: command }, setupCommand?, subdir?, recheck?: [{ id, text }], startEffort?: { [id]: "high"|"xhigh" }, envRepair?: { [id]: { defect } }, rejectedBy?: { [id]: { proof } }, integrationBranch?, maxGroups?: number, exclusive?: { [resource]: [ids] } | [string], publish?: { actions: string, criteria: [ids] }, dependsOn?: { [id]: [ids] }, budget?: number } with absolute paths. Accepted and ignored, each with a log line: profil, simples, finalCheck (one profile; no light check). baseCommit is required: `git rev-parse HEAD` in projectRoot right before the call. The first agent records the commands in the suite command (quick = quickTestCommand, full = testCommand, heavy:<id>, setup, subdir) and makes or finds the integration branch spec-first-<specId>--integration: a relaunch with the same args (same baseCommit) skips the criteria already merged into it, read from git, never from the Workflow cache; a branch of that name that does not contain baseCommit is an earlier run\'s: renamed aside, never deleted. Each group works in its own git worktree under <projectRoot>/.spec-first/copies, made from the integration branch; at most maxGroups groups (default 3) are active at once; groups omitted → one group per criterion. dependsOn: the dependency graph of the whole spec — independent groups start at once, a dependent group as soon as what it builds on is merged; a group at least two others depend on is the socle: one tester critic before its fusion. Every finished group is merged into the integration branch: the review works on it (result.worktree, result.branch), the skill squashes it into the project at the end. quickTestCommand: the fast subset, run once at the end of the run on the integration branch (never by developers or fusions); not given → no end-of-run suite, and nothing in its place. testCommand: the full suite, recorded only — it runs in the review. heavy: a criterion\'s own slow suite, run once by its developer at his last commit, read from the ledger by the others. setupCommand: makes a fresh copy runnable, commit hooks included; subdir: the sub-folder of projectRoot where setup and tests run. recheck: criteria an earlier run of the same spec validated — not developed, back « non vérifié » for the review. startEffort: the effort a relaunched criterion resumes from (below high → high). envRepair: a targeted repair of a criterion broken by its environment or configuration (critics ignored). rejectedBy: a criterion relaunched after « en échec » or after the review rejected it: the proof reaches its developer on his first round (critics ignored); skipped as already integrated only on a merge of this very run (its Spec-First-Run line: the same args). integrationBranch: overrides the fixed name (an older run\'s branch to go on from). exclusive: resources only one agent may use at a time. publish: only to mark the publication criteria — prepared here (version, changelog), never pushed: the publication itself runs in spec-first:review. A criterion held only because what it depends on did not pass comes back blocked with kind « attente », waitingFor and relaunchAs. budget: output tokens; the run stops cleanly before it — and after 3 agents in a row die without an answer. A stopped run reports resume: relaunch with the same args and the same baseCommit, never with resumeFromRunId. Not for a bare slash-command call without args: tell the user to run /spec-first instead.',
  phases: [
    { title: 'Inventaire', detail: 'opus high, always the first agent: checks the suite command, resets it and records the test commands in it, makes or finds the integration branch spec-first-<specId>--integration (a merge left half done in a reused copy aborted), and lists the criteria already integrated on it, which the run skips' },
    { title: 'Développement', detail: 'opus, one developer per group, a few groups at a time; high, then xhigh after a rejection or a failed self-check; only the tests of what he touches, a heavy suite once at his last commit; his self-check — the command and its decisive output — stands' },
    { title: 'Critique du socle', detail: 'opus high: one tester critic, only for a group at least two others depend on, before its fusion; a rejection → one more developer round in xhigh, then the critic again' },
    { title: 'Fusion', detail: 'opus high: each finished group merged into the integration branch as soon as it is done, one fusion at a time — the groups done meanwhile go together in the next one —, a group others depend on merged alone, first; its criteria written in a Spec-First-Validated line beside the run\'s Spec-First-Run line, only the tests of the files changed on both sides, then its copy removed; later groups and rework start from it' },
    { title: 'Batterie rapide', detail: 'opus high: the quick suite once on the integration branch at the end of the run, through the suite command; red → a targeted repair by an opus xhigh developer given the failing output, twice at most, the verdict read again after each by an opus high helper (only that reading counts), then the criteria it comes from are reported « en échec »' },
  ],
}

// ---------------------------------------------------------------- models
// One profile (the owner's decision, 26/11/2026): every agent Opus, effort high at least — never Sonnet,
// never Haiku, never Opus max (his call). Two measured sessions (QualiSpectra 24-26/11, studio 25-26/11)
// spent 71 to 83 % of agent time in commands — suites re-run on the same tree, fusion queues, three
// critics per criterion — not in the model: speed comes from running less, not from a lighter model.
const DEV_EFFORTS = ['high', 'xhigh', 'xhigh'] // a developer's rounds: high first, xhigh after a rejection or a failed self-check
const DEV_MODEL = 'opus' // developers
const CRITIC = { model: 'opus', effort: 'high' } // the socle's tester critic, the only critic of the run
const FUSION = { model: 'opus', effort: 'high' } // conflicts are code
const HELPER = { model: 'opus', effort: 'high' } // the inventory, tidying the copies, the end-of-run suite
const REPAIR = { model: DEV_MODEL, effort: 'xhigh' } // the repair of a red quick suite: already one failure deep
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
// The spec outside its criteria — goal, out-of-scope list, « Limites » — passed by the caller: the
// agents then hold the whole spec and never open the file. Not passed → one whole read
// (kipp, 1.9.2: every agent read it whole, then again in slices).
const BRIEF = String(input.specBrief || '').trim()
const SPEC_LINE = BRIEF ? `Spec: ${SPEC} — do not open it: its goal, out-of-scope list and « Limites » are here, its criteria below.\n<spec_brief>\n${BRIEF}\n</spec_brief>` : `Spec: ${SPEC} — read it once, whole, never in slices.`
const normalize = cs => cs.map((c, i) =>
  typeof c === 'string' ? { id: String(i + 1), text: c } : { id: String(c && c.id != null ? c.id : i + 1), text: String((c && c.text) || '') })
const CRITERIA = normalize(input.criteria || [])
const critIds = CRITERIA.map(c => c.id)
const dupIds = critIds.filter((id, i) => critIds.indexOf(id) !== i)
if (dupIds.length) return { error: `Criterion ids must be unique. Repeated: ${[...new Set(dupIds)].join(', ')}.` }
// Criteria an earlier run of this spec validated: not developed here. They come back « non vérifié »:
// the review judges every criterion; the quick suite that ends the run is their non-regression.
if (input.recheck != null && (!Array.isArray(input.recheck) || input.recheck.some(c => !c || typeof c !== 'object' || c.id == null))) {
  return { error: 'args.recheck must be an array of { id, text }.' }
}
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
// Gone with the one profile and the light check (26/11/2026): accepted so an older call still runs, each
// with a line saying why it changes nothing.
if (input.profil != null) log(`profil ignoré (« ${input.profil} ») : un seul profil — Opus partout, high au moins.`)
if (input.simples != null) log('simples ignoré : un seul profil — Opus partout, high au moins.')
if (input.finalCheck != null) log(`finalCheck ignoré (« ${input.finalCheck} ») : plus de contrôle léger — la batterie rapide tourne une fois en fin de run, la revue juge chaque critère.`)
for (const k of ['strictDone', 'specTotal', 'specBaseCommit', 'waitRound']) if (input[k] != null) log(`${k} ignoré : il sert à la revue (spec-first:review), plus au run.`)
const testCommand = String(input.testCommand || '') // the full suite: recorded for the review, never run here
const quickTestCommand = String(input.quickTestCommand || '') // the fast subset: once, at the end of the run
// What makes a fresh copy runnable (dependencies, files git ignores, commit hooks).
const setupCommand = String(input.setupCommand || '')
const SUBDIR_IN = String(input.subdir || '')
if (SUBDIR_IN && (SUBDIR_IN.startsWith('/') || SUBDIR_IN.split('/').includes('..') || !NAME.test(SUBDIR_IN))) {
  return { error: 'args.subdir must be a folder relative to projectRoot (letters, digits, . _ - /, no ..).' }
}
const SUBDIR = SUBDIR_IN.replace(/^(\.\/)+/, '').replace(/\/+$/, '')
const inSub = tree => SUBDIR ? `${tree}/${SUBDIR}` : tree

// The integration branch has a fixed name, so a relaunch finds it again and reads from git what is
// already merged (QualiSpectra, 24-26/11: resumed from the Workflow cache, 8 agents of 53 came back and
// 17 groups already merged were redone, ≈ 65 min). integrationBranch overrides it: an older run's branch.
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
log('Profil unique : Opus partout — développeurs high puis xhigh, critique du socle, fusions et assistants high.')

// A criterion's own slow suite (end-to-end, a training check): { id: command }. Its developer runs it
// once, at his last commit; the fusion never; the socle critic reads its result from the ledger. Measured
// (QualiSpectra): one heavy criterion cost 67 min in development, 30 in fusion, 39 in the light check —
// the same suite on nearly the same tree, three times.
const HEAVY = {}
if (input.heavy != null) {
  if (typeof input.heavy !== 'object' || Array.isArray(input.heavy)) log('heavy ignoré : ce doit être { id: commande }.')
  else {
    for (const [id, v] of Object.entries(input.heavy)) {
      const cmd = typeof v === 'string' ? v.trim() : ''
      if (!byId[id]) log(`heavy ignoré pour « ${id} » : critère inconnu.`)
      else if (!/^[A-Za-z0-9._-]+$/.test(id)) log(`heavy ignoré pour « ${id} » : identifiant inutilisable dans un nom de suite (lettres, chiffres, . _ -).`)
      else if (!cmd) log(`heavy ignoré pour « ${id} » : commande vide.`)
      else HEAVY[id] = cmd
    }
  }
}

// A relaunched criterion resumes from the effort it reached; high at least (one profile).
const START = {}
const RAISED = { low: 'high', medium: 'high', high: 'high', xhigh: 'xhigh' }
if (input.startEffort && typeof input.startEffort === 'object') {
  for (const [id, e] of Object.entries(input.startEffort)) {
    if (!byId[id] || !RAISED[e]) { log(`startEffort ignoré pour « ${id} » : ${byId[id] ? `effort « ${e} » inconnu` : 'critère inconnu'}.`); continue }
    START[id] = RAISED[e]
    if (RAISED[e] !== e) log(`startEffort « ${e} » pour ${id} : relevé à high (high au moins).`)
  }
}

// Criteria an earlier run found broken by their environment or configuration, not by their code: a
// targeted repair, a group of its own. Its critics no longer re-judge it during the run: the review does.
const ENV = {}
if (input.envRepair != null) {
  if (typeof input.envRepair !== 'object' || Array.isArray(input.envRepair)) log('envRepair ignoré : ce doit être { id: { defect } }.')
  else {
    let critics = false
    for (const [id, v] of Object.entries(input.envRepair)) {
      const o = typeof v === 'string' ? { defect: v } : (v && typeof v === 'object' ? v : {})
      const defect = String(o.defect || o.reason || '').trim()
      if (o.critics != null) critics = true
      if (!critIds.includes(id)) log(`envRepair ignoré pour « ${id} » : ${byId[id] ? 'critère de recheck, pas développé ici' : 'critère inconnu'}.`)
      else if (!defect) log(`envRepair ignoré pour « ${id} » : défaut non décrit.`)
      else ENV[id] = { defect }
    }
    if (critics) log('envRepair : critics ignoré — plus de critiques pendant le run (sauf le socle), la revue rejuge.')
  }
}

// A criterion relaunched after « en échec », or after the review rejected it: the proof reaches its
// developer on his first round. The critics it names are ignored — none re-judge it during the run.
// { id: { proof } }; the older forms { id: [critics] } and { id: { critics, proof } } are read the same.
const PRIOR = {}
if (input.rejectedBy != null) {
  if (typeof input.rejectedBy !== 'object' || Array.isArray(input.rejectedBy)) log('rejectedBy ignoré : ce doit être { id: { proof } }.')
  else {
    let critics = false
    for (const [id, v] of Object.entries(input.rejectedBy)) {
      const o = Array.isArray(v) ? { critics: v } : (v && typeof v === 'object' ? v : {})
      if (o.critics != null) critics = true
      if (!critIds.includes(id)) { log(`rejectedBy ignoré pour « ${id} » : ${byId[id] ? 'critère de recheck, pas développé ici' : 'critère inconnu'}.`); continue }
      if (ENV[id]) continue
      PRIOR[id] = { proof: String(o.proof || o.reason || 'rejeté par le run précédent, sans preuve transmise').trim() }
    }
    if (critics) log('rejectedBy : seule la preuve sert — plus de critiques qui rejugent pendant le run (sauf le socle).')
  }
}

// Groups come from the orchestrator, cut fine: one group per criterion unless two cannot be checked
// apart. Groups may touch the same files: the fusion resolves the conflicts. Checked here, before any
// agent; formed once the inventory said which criteria are already integrated.
let RAW_GROUPS = null
if (input.groups != null && CRITERIA.length) {
  if (!Array.isArray(input.groups) || !input.groups.every(g => Array.isArray(g))) {
    return { error: 'args.groups must be an array of arrays of criterion ids.' }
  }
  const recheckIds = RECHECK.map(c => c.id)
  const raw = input.groups.map(g => g.map(String))
  const dropped = raw.flat().filter(id => recheckIds.includes(id))
  if (dropped.length) log(`Retiré(s) des groupes, déjà dans recheck : ${[...new Set(dropped)].join(', ')}.`)
  RAW_GROUPS = raw.map(g => g.filter(id => !recheckIds.includes(id))).filter(g => g.length)
  const flat = RAW_GROUPS.flat()
  const unknown = flat.filter(id => !critIds.includes(id))
  const twice = flat.filter((id, i) => flat.indexOf(id) !== i)
  if (unknown.length || twice.length) {
    return { error: `args.groups must list each criterion id of this run once.${unknown.length ? ` Unknown: ${unknown.join(', ')}.` : ''}${twice.length ? ` Repeated: ${[...new Set(twice)].join(', ')}.` : ''}` }
  }
}

// Every agent gets its own ten ports, from its group, its role and its round — never from the order
// agents finish in — so a resumed run (resumeFromRunId) gives each agent the same prompt again.
// Offset by the project: two runs at once on two repositories do not collide.
const hashOf = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 } return h }
const PORT_BASE = (hashOf(ROOT) % 9) * 500
const groupSlot = (gid, k) => 16 * Number(gid) + k // k: 0-2 developer round, 3-5 the socle critic of that round, 12 fusion
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
const DECISIONS_RULE = 'choices the spec did not settle that change what the owner can see or use, one short sentence each, in French, in plain words (what the result does, not how; no file or library names). Not what you did not do, and not problems outside the spec — the review reports those. Usually empty.'
const TECH = 'TECHNIQUE:'
const PROOF_CAP = 'At most 500 characters: the command and the decisive output line, never a whole log.'
const ISOLATION = 'ISOLATION:'
const DEPENDS = 'DEPENDS:' // a blocker: another criterion of the spec it builds on is missing or broken
const BLOCKER_RULE = `empty unless the spec itself must change or the owner must decide before any progress is possible; a technical cause outside your changes (environment, hook, missing tool) starts with "${TECH}"; another criterion of this spec your criteria build on is missing or broken starts with "${DEPENDS}", then its ids and why (e.g. "${DEPENDS} 2 — …")`

const SELF_CHECK = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['pass', 'fail', 'not run'] },
    evidence: { type: 'string', description: 'the command you ran and its decisive output line, quoted; "not run": what is out of your reach. ' + PROOF_CAP },
  },
  required: ['status', 'evidence'],
}
// checked: the criteria of this round — each must get its self-check.
const devSchema = (ids, checked = ids) => ({
  type: 'object',
  properties: {
    workspace: { type: 'string', description: 'absolute path of the tree you worked in (`git rev-parse --show-toplevel` run there)' },
    branch: { type: 'string', description: 'current branch of that tree' },
    changed: { type: 'boolean', description: 'true if you modified or created any file' },
    files: { type: 'array', items: { type: 'string' }, description: 'every file you created, modified or deleted in this round, relative to your workspace' },
    summary: { type: 'string', description: 'what the result now does, in two or three sentences' },
    triage: {
      type: 'array',
      description: 'empty unless your prompt gives you rejections to sort; then one entry per rejected criterion, sorted before touching the code',
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
    // Keyed by criterion id, every pending id required: a developer cannot skip one — his check stands.
    selfCheck: {
      type: 'object',
      description: 'one entry per criterion, keyed by its id: what you ran to prove it on the real result — it stands as the run\'s check',
      properties: Object.fromEntries(checked.map(id => [id, SELF_CHECK])),
      required: checked,
      additionalProperties: false,
    },
    decisions: { type: 'array', items: { type: 'string' }, description: DECISIONS_RULE },
    blocker: { type: 'string', description: BLOCKER_RULE },
  },
  required: ['workspace', 'branch', 'changed', 'files', 'summary', 'triage', 'selfCheck', 'decisions', 'blocker'],
})

// Verdicts are keyed by criterion id and every id is required: a critic cannot skip a criterion.
const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'defect', 'unverifiable'] },
    proof: { type: 'string', description: 'what you ran or read and what you observed; for a defect, the reproduction. ' + PROOF_CAP },
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
          proof: { type: 'string', description: PROOF_CAP },
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
    integrated: { type: 'boolean', description: 'true if every group of this fusion is now committed on the integration branch, with its Spec-First-Validated trailer' },
    notIntegrated: { type: 'array', items: { type: 'object', properties: { group: { type: 'string' }, reason: { type: 'string', description: 'why not, in a few French words' } }, required: ['group', 'reason'] }, description: 'the groups of this fusion not merged; empty if integrated' },
    removed: { type: 'boolean', description: 'true if the copy and branch of every merged group were then removed' },
    reason: { type: 'string', description: 'empty if integrated; otherwise why not, in a few French words' },
    conflicts: { type: 'array', items: { type: 'string' }, description: 'each conflict and how it was resolved, in plain words' },
    tests: { type: 'string', description: 'the tests run for the files merged with a conflict or changed on both sides, and their outcome; "none" when there was no such file. ' + PROOF_CAP },
  },
  required: ['workspace', 'branch', 'integrated', 'notIntegrated', 'removed', 'reason', 'conflicts', 'tests'],
}

// recorded is keyed by name, every name required: the run checks that each one it asked for was recorded.
const inventorySchema = names => ({
  type: 'object',
  properties: {
    suite: { type: 'string', enum: ['ok', 'missing'], description: '"missing" when the suite command is absent or not executable' },
    recorded: {
      type: 'object',
      description: 'true for reset once it printed « reset », and for each name once it printed « recorded <name> »',
      properties: Object.fromEntries(['reset', ...names].map(n => [n, { type: 'boolean' }])),
      required: ['reset', ...names],
      additionalProperties: false,
    },
    workspace: { type: 'string', description: 'absolute path of the integration copy; empty if none' },
    branch: { type: 'string', description: 'the integration branch' },
    reused: { type: 'boolean', description: 'true if the integration branch existed before this run (and was kept)' },
    setAside: { type: 'string', description: 'the new name of an earlier run\'s integration branch you renamed aside; empty if none' },
    mergeAborted: { type: 'boolean', description: 'true if you aborted a merge an interrupted fusion left half done in the reused copy' },
    uncommitted: { type: 'array', items: { type: 'string' }, description: 'the reused copy\'s `git status --porcelain` lines that are not untracked (« ?? »), as printed; empty if none' },
    integrated: { type: 'array', items: { type: 'string' }, description: 'every criterion id found in a Spec-First-Validated trailer on the integration branch since the run\'s commit' },
    integratedHere: { type: 'array', items: { type: 'string' }, description: 'the ids of the Spec-First-Validated lines whose commit also carries this run\'s Spec-First-Run line' },
    reason: { type: 'string', description: 'empty if done; otherwise why not, in a few French words' },
  },
  required: ['suite', 'recorded', 'workspace', 'branch', 'reused', 'setAside', 'mergeAborted', 'uncommitted', 'integrated', 'integratedHere', 'reason'],
})

const idsItem = ids => ids.length ? { type: 'string', enum: ids } : { type: 'string' }
const SUITE_STATUS = ['pass', 'fail', 'refused', 'lost']
const suiteSchema = ids => ({
  type: 'object',
  properties: {
    status: { type: 'string', enum: SUITE_STATUS, description: 'what the suite command\'s verdict line says' },
    key: { type: 'string', description: 'the ledger key it printed' },
    output: { type: 'string', description: 'its verdict line and, when red, the failing tests with their decisive error lines. ' + PROOF_CAP },
    broken: { type: 'array', items: idsItem(ids), description: 'red: the criteria whose changes the failing tests exercise; empty when green or when you cannot tie the failure to one' },
  },
  required: ['status', 'key', 'output', 'broken'],
})
// The repair's own reading of the suite is not asked: only the high helper's reading counts.
const repairSchema = () => ({
  type: 'object',
  properties: {
    workspace: { type: 'string', description: 'absolute path of the integration copy you worked in' },
    branch: { type: 'string', description: 'its branch' },
    changed: { type: 'boolean', description: 'true if you modified or created any file' },
    files: { type: 'array', items: { type: 'string' }, description: 'every file you created, modified or deleted, relative to the copy' },
    summary: { type: 'string', description: 'what you found and changed, in two or three sentences' },
    preexisting: { type: 'string', description: 'failures that fail the same way on the run\'s starting commit — not this run\'s — in one sentence; empty if none' },
    decisions: { type: 'array', items: { type: 'string' }, description: DECISIONS_RULE },
    blocker: { type: 'string', description: BLOCKER_RULE },
  },
  required: ['workspace', 'branch', 'changed', 'files', 'summary', 'preexisting', 'decisions', 'blocker'],
})

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
// The spec's slug, whole up to 40 characters; longer → its first 32 and a hash of the whole: two specs
// sharing their first 40 characters must never share an integration branch (the second would skip its
// criteria on the first one's trailers). The same code in review.js.
const SPEC_SLUG = (SPEC.split('/').pop() || '').replace(/\.md$/i, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'spec'
const SPEC_ID = SPEC_SLUG.length > 40 ? `${SPEC_SLUG.slice(0, 32)}-${hashOf(SPEC_SLUG).toString(36)}` : SPEC_SLUG
const COPIES = '.spec-first/copies'
const ENSURE_HIDDEN = `cd "${ROOT}" && x=$(git rev-parse --git-path info/exclude) && mkdir -p "$(dirname "$x")" && { grep -qxF /.spec-first/ "$x" || echo /.spec-first/ >> "$x"; }`
const SUBMODULES = '{ [ ! -f .gitmodules ] || git submodule update --init --recursive; }'
const copyCommand = (kind, from) => `${ENSURE_HIDDEN} && mkdir -p ${COPIES} && d=$(mktemp -d ${COPIES}/${SPEC_ID}--${kind}-XXXXXX) && git worktree add -b "spec-first-$(basename "$d")" "$d/wt" ${from} && cd "$d/wt" && ${SUBMODULES} && pwd`
// The integration branch: a fixed name (or the integrationBranch override). Its copy is the worktree
// already holding it, else a new one — on the branch when it exists, else on a new branch from baseCommit.
const INTEG_BRANCH = IB || `spec-first-${SPEC_ID}--integration`
const integCopyCommand = `${ENSURE_HIDDEN} && w=$(git worktree list --porcelain | awk -v b="refs/heads/${INTEG_BRANCH}" '/^worktree /{p=substr($0,10)} $0=="branch "b{print p}') && if [ -n "$w" ]; then cd "$w"; else mkdir -p ${COPIES} && d=$(mktemp -d ${COPIES}/${SPEC_ID}--integration-XXXXXX) && if git show-ref --verify --quiet refs/heads/${INTEG_BRANCH}; then git worktree add "$d/wt" ${INTEG_BRANCH}; else git worktree add -b ${INTEG_BRANCH} "$d/wt" ${BASE}; fi && cd "$d/wt" && ${SUBMODULES}; fi && pwd`
const isCopy = ws => !!ws && ws !== ROOT && ws.includes(`/${COPIES}/`)
const PREPARE = `${setupCommand
  ? `Prepare it right after creating it: run \`${setupCommand}\` from ${SUBDIR ? `its ${SUBDIR} folder` : 'its root'}.`
  : `If the project needs what git ignores to run, install its dependencies in the copy the project's usual way and copy its local config (e.g. .env) from ${inSub(ROOT)}.`} Never link the project's own dependency folders (.venv, node_modules): the tests would run the project's code, not the copy's. A copy holds tracked files only; never commit what you add to prepare it.`
// What a fusion may drop from a group's work: this list only, everything else is the group's work.
const DROP = `only these, when ${BASE} did not track them: local config copied in (.env, .env.local, .env.*.local), dependency folders (.venv, venv, node_modules), caches (__pycache__, *.pyc, .pytest_cache, .mypy_cache, .ruff_cache, .cache), build outputs (dist, build, .next, coverage), .DS_Store`

// What changed in a tree since the run started.
const changesHint = tree => `Changes of this run: \`git -C ${tree} diff ${BASE}\` (the commit the run started from), plus the files \`git -C ${tree} status --porcelain\` lists as untracked (??). The spec file is not part of the change.`

// What a developer keeps for after a context compaction: named after his criteria — group numbers
// change from one run to the next — and after what changes the work in the run's args (the pace
// settings maxGroups, budget, waitRound stay out).
const ARGS_TAG = hashOf(JSON.stringify({ ...input, waitRound: undefined, maxGroups: undefined, budget: undefined })).toString(36)
const notesPath = ids => `${ROOT}/.spec-first/logs/${SPEC_ID}-${ARGS_TAG}-c${ids.map(id => String(id).replace(/[^A-Za-z0-9._-]/g, '_')).join('-')}-notes.md`

// Every whole suite goes through one command and its ledger (scripts/suite, installed by the skill):
// a result already there for the same tree is read, a suite already running is joined. Measured
// (studio, 25-26/11): `make test` launched 39 times, 454 machine-minutes, mostly on trees that barely
// differed. Its first agent records the commands; the others only ask for a suite by name.
const SUITE = `${ROOT}/.spec-first/bin/suite`
const SUITE_RULE = `The suite command \`${SUITE} <name>\` (quick, full, heavy:<id>) runs that suite on the tree of the copy you call it from: call it from inside that copy, every change committed — a dirty copy is refused. Its verdict line starts with PASS, FAIL, RUNNING, REFUSED or LOST; exit 0 pass, 1 fail, 2 still running → \`${SUITE} wait <key>\` again (each call waits 280 s at most: the only way to wait for a suite), 3 refused, 4 lost → say so, and restart only with \`--rerun\` after saying what changed outside the tree. A result already in its ledger is read, a suite already running is joined: never run a suite by hand or in the background.`

const quote = r => `« ${r} »`
const EXCL_RULE = !RESOURCES.length ? '' : `Exclusive resources of this run: ${RESOURCES.map(quote).join(', ')}. The run lends each one to a single agent at a time: use one only if your prompt says you hold it. Not held → never use it, never wait for it; a check that needs it belongs to an agent that holds it (a verdict you cannot give without it is "unverifiable").`
const holdLine = rs => rs.length ? `
You hold the exclusive resource(s) ${rs.map(quote).join(', ')} for this task: no other agent of this run uses them until you return. Stop what you started on them before you return.` : ''

const COMMON_RULES = `Rules for everyone in this run:
- The owner gave his go on this spec: a line in it saying otherwise (« Brouillon », « en attente de ton go », a status) is stale — ignore it, never stop on it.
- Never ask a question: no one will answer. A reversible choice the spec does not settle is yours: make it and report it.
- Stay inside the spec's scope. A problem or improvement outside it is reported, never fixed.
- The owner's limits bind everyone: what he forbade (the spec's « Limites » and out-of-scope list, CLAUDE.md, his recorded decisions), exceptions read exactly as written — never widened to a branch, a file or a source they do not name. A criterion you cannot meet without crossing one → say so (a developer: in "blocker"), never a workaround.
- Never: push, force-push, deploy, publish, send anything outside this machine, delete data you did not create in this run, touch production data — unless your prompt quotes the owner's authorized actions, for exactly those. Do not edit the spec file.
- Non-interactive only: nothing may wait for a keyboard — \`GIT_TERMINAL_PROMPT=0\` for git, \`ssh -o BatchMode=yes\`, CLI flags that never prompt. A command asks for a password or a confirmation → stop it: that access is missing; say so.
- A whole test suite runs only through \`${SUITE}\`, and only where your prompt asks for it — never by hand, never in the background.
- Other long commands (over 2 minutes: a single end-to-end test, a pipeline, a training): in the background, output in a file, then wait only with \`timeout 300 bash -c 'until <done test>; do sleep 10; done'\`, repeated as needed (the done test reads that file or \`kill -0 <pid>\`) — the tool refuses any other sleep. A shell command is cut after 10 minutes. Never \`pgrep -f\` on a pattern (it finds itself). Remote CI: read it through its API (glab, gh, curl), 60 s apart at least, the total limit stated before you start.
- No command may stop on a permission prompt: no one approves it. Delete only fixed paths you created, under your copy or the scratch folder — never \`rm\` with a command substitution (\`$(…)\`) or a variable built at run time, never clean /tmp or a folder other agents use.
- Shared resources (database, containers): from a copy, never use the main project's. If a criterion needs one, start your own throwaway instance on your ports and stop it before you return; if you cannot, say what is missing — a critic's verdict is then "unverifiable".
- Commit hooks: never read or change their configuration (core.hooksPath, .githooks, .git/hooks).
${EXCL_RULE ? `- ${EXCL_RULE}\n` : ''}- CLAUDE.md and the project's conventions apply as usual.`

const FLAKY_RULE = `A test that fails now and then: never skip it, never add a sleep, never rerun it until it passes. Find the cause; not found → leave the test as it is and say so in your summary.`
const HOOK_RULE = `Commit hooks always run: never bypass them (--no-verify). A hook fails because of your changes → fix the cause. It fails for a reason outside your changes → a "${TECH}" blocker, the cause in a few French words.`
// No maintainer reads the diff during the run any more: the rule that protected the tests (1.10.0) now
// reaches whoever writes code, and the review's maintenance reviewer still checks it.
const WEAK_RULE = 'Never leave a test deleted, skipped or loosened (an assertion removed or widened) when no criterion asks for it: it is a defect, never a way to make a check pass.'
// What a relaunched run, or a person, reads in git: which criteria a commit serves.
const trailerRule = ids => `Every commit you make ends with one trailer line per criterion it serves: \`git commit -m "<subject>" ${ids.map(id => `--trailer "Spec-First-Criterion: ${id}"`).join(' ')}\` (only the ids it serves; a git without --trailer: those lines as the message's last paragraph).`

// ---------------------------------------------------------------- the socle's critic
// No panel of three critics per round any more (owner's decision, 26/11/2026): in the two measured
// sessions the panels' suites and queues, not their judgement, made the time, and the review judges every
// criterion anyway. One exception, the socle — a group at least HUB others depend on: a defect there
// costs every later group (studio: 47 criteria of 50 built on it), so one tester runs its criteria on the
// developer's copy before its fusion.
const TESTER = {
  label: 'testeur',
  brief: `You are the TESTER. Run the real result and try to break each criterion: main path, edge cases, bad input, empty and boundary values, the criterion's exact wording — build, run, call or open it, as its "observable" says. "pass" means you exercised it on the real result and it held; reading code is not enough. A criterion stated as a property (a round trip, an invariant, the same effect when run twice, the same output as the old code) → many generated inputs, not a few chosen examples. A result that took hours (a trained model): measure what was produced and check its origin (log, weights, config) — redo it only if that proof is doubtful. Visual or interactive criteria: check them on screen, as the owner would, with the screenshot and browser tools (ToolSearch if deferred). "unverifiable" only when a device or a credential is missing — the proof names it.`,
}

// The socle critic's tests: those of its criteria, run directly; a heavy suite is read from the ledger,
// where its developer's run of this very tree already is.
const criticTests = (cs, where) => {
  const heavy = cs.filter(c => HEAVY[c.id]).map(c => c.id)
  return `Project tests: only the tests that cover your criteria, run directly — never a whole suite: the quick suite runs once at the end of the run, the full one in the review.${heavy.length ? ` ${heavy.map(id => `Criterion ${id} has a heavy suite: \`cd ${where} && ${SUITE} heavy:${id}\` gives its developer's result for this very tree from the ledger — read it there, never run that suite another way.`).join(' ')} ${SUITE_RULE}` : ''}`
}

// previous: the critic's own earlier verdicts, when it judges again after a rework. slot: its ports.
function criticPrompt(seat, where, context) {
  const previous = seat.previous && seat.previous.length ? `
<your_previous_verdicts>
${seat.previous.map(([id, v]) => `[${id}] ${v ? `${v.verdict}: ${v.proof}` : 'no verdict'}`).join('\n')}
</your_previous_verdicts>
The developer reworked since then. First check that what you reported is fixed, then judge each criterion afresh on the real result.` : ''
  const pubIds = seat.criteria.filter(c => isPub(c.id)).map(c => c.id)
  const pubNote = pubIds.length ? `
Criteria ${pubIds.join(', ')} are publication criteria: their external part (pushed, merged, tagged, published, pinned) happens after the review of the spec, in a workflow of its own, with the owner's authorization. Judge everything else they need (version, changelog, files ready); never a defect nor "unverifiable" only because it is not published yet.` : ''
  return `${TESTER.brief}

You are an independent critic, the only one of this run: other groups build on these criteria, so a defect you let through costs every one of them. Your job is to find real defects and prove them, not to approve.

${SPEC_LINE}
Criteria to judge — only these:
${list(seat.criteria)}
The spec's other criteria are handled elsewhere and may not be done yet: that is expected, never report it.
${previous}
The result lives in: ${where}, committed by its developer.
${context}${pubNote}
${criticTests(seat.criteria, where)}

Do not edit source files under ${ROOT} or ${where}. Build outputs, caches and servers the project's own commands create are fine. Scratch files go in a fresh \`mktemp -d\` directory only.
${portRule(seat.slot)}${holdLine(locksFor(seat.criteria.map(c => c.id)))}

One verdict per criterion above, keyed by its id:
- "pass": you checked it and it holds — proof says what you ran or read and what you saw;
- "defect": you PROVED it fails — proof is the reproduction (exact command and observed output, or the concrete input and the wrong behaviour). A suspicion you cannot prove is not a defect: put it in "note" — the developer gets it as a lead. Say its "cause": "environment" when the code is right but its environment or configuration is wrong (a config file, a setting, a local file the project expects), else "code";
- "unverifiable": you could not check it — proof says why.

${COMMON_RULES}`
}

const outsideSpec = []

// book[criterionId].tester = the critic's latest verdict (null: it did not return). Criteria left
// without a verdict are asked once more, those only, before they come back « non vérifié ».
async function judgeSocle(seat, book, where, context, tag) {
  const once = async (s, again) => {
    const ids = s.criteria.map(c => c.id)
    const r = await ask(criticPrompt(s, where, context), {
      ...CRITIC, schema: panelSchema(ids), phase: 'Critique du socle', locks: locksFor(ids),
      label: `${tag} — ${TESTER.label} (${CRITIC.model} ${CRITIC.effort})${again ? ' — relance' : ''}`,
    })
    if (r) for (const o of r.outsideSpec || []) outsideSpec.push(o)
    for (const c of s.criteria) book[c.id].tester = r && r.verdicts && typeof r.verdicts === 'object' ? r.verdicts[c.id] || null : null
  }
  await once(seat, false)
  const missing = seat.criteria.filter(c => !book[c.id].tester)
  if (missing.length && !deadStop) {
    log(`${tag} : pas de verdict pour ${missing.map(c => c.id).join(', ')} — redemandé une fois`)
    await once({ ...seat, criteria: missing, previous: (seat.previous || []).filter(([id]) => missing.some(c => c.id === id)) }, true)
  }
}

// A criterion passes the socle only if its tester verified it; a proven defect rejects it. Notes are
// leads, never defects: they travel to the next round and to the report.
function judge(c, book) {
  const v = book[c.id].tester || null
  const leads = v && String(v.note || '').trim() ? [`[testeur] ${v.note}`] : []
  if (!v) return { status: 'unverified', reason: 'aucun verdict du critique du socle (redemandé une fois)', leads }
  if (v.verdict === 'defect' && String(v.proof || '').trim()) {
    return { status: 'defect', proofs: [`[testeur] ${v.proof}`], leads, by: ['tester'], defect: v.cause === 'environment' ? 'environnement' : 'code' }
  }
  if (v.verdict !== 'pass') return { status: 'unverified', reason: v.proof, leads }
  return { status: 'validated', proof: v.proof, leads }
}

// The developer's next round after a rejection — the socle critic's, or an earlier run's or the
// review's (rejectedBy): every proof so far, the leads, and the sort to make first.
function feedbackFor(rejected, history, leads, head) {
  return `
${head}
<rejection_proofs>
${rejected.map(c => history[c.id].map(h => `[${c.id}] ${h.round}: ${h.proofs}`).join('\n')).join('\n')}
</rejection_proofs>${leads.length ? `
<critic_leads>
Unproven suspicions, not defects: check them while you work.
${leads.join('\n')}
</critic_leads>` : ''}
Before touching the code, sort each rejection and report it in "triage":
- "slip": the approach holds, a detail is wrong → fix the cause at its root, not the symptom;
- "approach": the way the criterion is built cannot satisfy it, or the same defect came back after a fix → drop that approach and take another; never patch it again;
- "environment": the code is right, its environment or configuration is wrong (a config file, a setting, a local file the project expects) → fix exactly that, touch no code;
- "mistaken": the rejection contradicts the spec itself → in "why", quote the spec's sentence it contradicts, word for word, and change nothing for that criterion: whoever rejected it judges it again with your quote. Once per criterion: rejected again after that, it is a "slip" or an "approach". Never "mistaken" to dodge a defect you can reproduce.
A criterion rejected twice for the same reason is always "approach".
`
}
// The developer's next round after his own self-check did not pass: his evidence, to finish from.
const selfFeedback = rows => `
Your own self-check did not pass these criteria last round — finish them:
${rows.map(([id, s]) => `[${id}] ${s.status || 'absent'}: ${s.evidence || 'no evidence given'}`).join('\n')}
`
const IDLE_NOTE = `
Your previous round changed nothing and returned no blocker, yet these criteria are not done. Do the work now; if something truly stops you, say it in "blocker".
`

// ================================================================= 0. the inventory
// Always the first agent, so the Workflow cache (positional) finds it first on a resume: it checks the
// suite command, records this run's commands in it, makes or finds the integration branch, and reads on
// it — from git, not from the cache — which criteria an earlier attempt already merged: those are skipped.
const PASSING = ['validated', 'unverified']
const decisions = []
const integ = { where: '', branch: '', reused: false, setAside: '', mergeAborted: false, uncommitted: [] } // the integration copy, before any group starts
let integFailed = '' // why no integration copy could be made: every group is then blocked
let suiteMissing = false
const SKIPPED = [] // criteria of this run already merged into the integration branch (Spec-First-Validated)
const RECORD = [
  ['quick', quickTestCommand], ['full', testCommand],
  ...Object.entries(HEAVY).map(([id, cmd]) => [`heavy:${id}`, cmd]),
  ['setup', setupCommand], ['subdir', SUBDIR],
].filter(([, cmd]) => String(cmd).trim())
const HEREDOC = 'SPEC_FIRST_EOF'
// What a fusion of this very run writes beside Spec-First-Validated: a relaunch with the same args finds
// its own merges again, while a criterion relaunched on purpose (rejectedBy, envRepair) is not skipped on
// the trailer of the run that merged its rejected version.
const RUN_LINE = `Spec-First-Run: ${ARGS_TAG}`
if (!overBudget("l'inventaire")) {
  let inv = null
  let invError = ''
  try {
    inv = await ask(`You take the inventory that opens a development run of this spec, in three steps. Change no tracked file of ${ROOT}, commit nothing.

1. The suite command: \`[ -x ${SUITE} ]\`. It fails → stop here, create nothing, record nothing: suite "missing", every other field empty or false. It succeeds → suite "ok", then forget every command an earlier workflow recorded — a setting of another spec must never stay in force — and record this run's, each exactly as written (a quoted heredoc: nothing in it is expanded):
\`\`\`
${SUITE} reset${RECORD.map(([name, cmd]) => `\n${SUITE} set ${name} <<'${HEREDOC}'\n${cmd}\n${HEREDOC}`).join('')}
\`\`\`
recorded: reset true once it printed « reset »${RECORD.length ? ', and each name true once it printed « recorded <name> »' : ''}.
2. The integration branch ${INTEG_BRANCH}: every finished group of this run is merged into it and every group starts from it; ${IB ? "the skill named it: an earlier run's branch to go on from" : 'its name is fixed, so a relaunched run finds it again'}. First check that ${ROOT} is the top of a git repository (\`[ "$(git -C "${ROOT}" rev-parse --show-toplevel)" = "$(cd "${ROOT}" && pwd -P)" ]\` succeeds); if not, create nothing: workspace empty, the reason in a few French words. Then:
   a. \`git -C ${ROOT} worktree prune\`. ${IB ? `The branch must exist (\`git -C ${ROOT} show-ref --verify --quiet refs/heads/${IB}\`); it does not → create nothing: workspace empty, the reason.` : `The branch exists (\`git -C ${ROOT} show-ref --verify --quiet refs/heads/${INTEG_BRANCH}\`) but does not contain this run's commit (\`git -C ${ROOT} merge-base --is-ancestor ${BASE} ${INTEG_BRANCH}\` fails) → it is an earlier run's, already brought into the project: set it aside, never delete it — \`git -C ${ROOT} branch -m ${INTEG_BRANCH} ${INTEG_BRANCH}-$(git -C ${ROOT} rev-parse --short ${INTEG_BRANCH})\` (its copy, if any, follows it); setAside: that new name. Then go on as if it did not exist.`}
   b. Its copy: \`${integCopyCommand}\` — the worktree already holding the branch, else a new one${IB ? '' : `, the branch made from commit ${BASE} when it does not exist`}. Do not prepare it: the first fusion does. reused: true when the branch existed before this run${IB ? '' : ' and was not set aside'}.
   c. Reused → check the copy before anything is merged into it. \`git -C <the copy> rev-parse -q --verify MERGE_HEAD\` prints a hash → a merge an interrupted fusion left half done: \`git -C <the copy> merge --abort\` (the committed history stays as it is); mergeAborted: true. Then \`git -C <the copy> status --porcelain\`: every line not starting with « ?? » goes in uncommitted, as printed — never commit, stash or discard it. Untracked files stay as they are.
3. What is already integrated: \`git -C <the copy> log --format=%B ${BASE}..HEAD | grep '^Spec-First-Validated:'\` — each line lists criterion ids a fusion of this spec merged into the branch (only the fusions write it). integrated: every id found, once each; none → empty. integratedHere: the ids of the lines a fusion of this very run wrote — \`git -C <the copy> log --format=%B --grep='^${RUN_LINE}$' ${BASE}..HEAD | grep '^Spec-First-Validated:'\`; none → empty.

Return the copy as workspace and ${INTEG_BRANCH} as branch.

${COMMON_RULES}`, { ...HELPER, schema: inventorySchema(RECORD.map(([name]) => name)), phase: 'Inventaire', label: `Inventaire (${HELPER.model} ${HELPER.effort})` })
  } catch (e) {
    invError = errText(e)
  }
  const ws = clean(inv && inv.workspace)
  const rec = inv && inv.recorded
  const wasRecorded = name => !!rec && (Array.isArray(rec) ? rec.map(String).includes(name) : typeof rec === 'object' && rec[name] === true)
  if (!inv) {
    // No answer (twice), or an error: a breakdown, never a wrong argument — the run stops with a way back.
    stopped = stopped || `l'inventaire n'a pas répondu${invError ? ` (${invError})` : ', deux fois'}`
    integFailed = `Arrêté : ${stopped}.`
    log(`Arrêt : ${stopped}`)
  } else if (inv.suite === 'missing') {
    suiteMissing = true
    stopped = `commande de suites absente : ${SUITE} manque ou n'est pas exécutable — la skill l'installe (scripts/suite du plugin, exécutable)`
    integFailed = `Arrêté : ${stopped}.`
    log(`Arrêt : ${stopped}`)
  } else if (!isCopy(ws)) {
    // Only an inventory that answered can say the override names no usable branch.
    if (IB) return { error: `args.integrationBranch: no usable copy of ${IB} — ${inv.reason || 'no reason given'}. Check the branch name (\`git branch --list 'spec-first-*'\`) or drop integrationBranch.` }
    integFailed = `Copie d'intégration impossible : ${inv.reason || 'raison inconnue'}.`
    log(integFailed)
  } else {
    integ.where = ws
    integ.branch = INTEG_BRANCH
    integ.reused = !!inv.reused
    integ.setAside = IB ? '' : String(inv.setAside || '').trim()
    integ.mergeAborted = integ.reused && inv.mergeAborted === true
    integ.uncommitted = integ.reused ? (inv.uncommitted || []).map(String).filter(l => l.trim()) : []
    if (integ.setAside) log(`Branche ${INTEG_BRANCH} d'un run précédent (sans le commit ${BASE.slice(0, 7)}) mise de côté sous ${integ.setAside}`)
    log(`Branche d'intégration ${INTEG_BRANCH} ${integ.reused ? 'reprise' : 'créée'} : ${ws}`)
    if (integ.mergeAborted) log('Copie d\'intégration reprise : une fusion interrompue y avait laissé un merge en cours — annulé, historique commité intact')
    // A command not recorded leaves the previous one in force (another spec's subdir or setup): stop.
    const notRecorded = ['reset', ...RECORD.map(([name]) => name)].filter(name => !wasRecorded(name))
    if (notRecorded.length) {
      stopped = `commande(s) de suites non enregistrée(s) : ${notRecorded.join(', ')} — un réglage précédent resterait en vigueur`
      integFailed = `Arrêté : ${stopped}.`
      log(`Arrêt : ${stopped}`)
    } else if (integ.uncommitted.length) {
      // Work an interrupted agent left uncommitted: never merged over, never thrown away by the run.
      stopped = `la copie d'intégration ${ws} garde des changements non commités (${integ.uncommitted.slice(0, 5).join(' ; ')}${integ.uncommitted.length > 5 ? ' ; …' : ''}) — à commiter ou à écarter avant de relancer`
      integFailed = `Arrêté : ${stopped}.`
      log(`Arrêt : ${stopped}`)
    }
  }
  if (integ.where && !integFailed) {
    // Read by criterion id: group numbers change from one run to the next. A criterion relaunched on
    // purpose (rejectedBy, envRepair) is skipped only on a trailer of this very run: an earlier run's
    // trailer is the version that was rejected.
    const found = new Set((inv.integrated || []).map(String))
    const here = new Set((inv.integratedHere || []).map(String))
    for (const id of critIds) {
      if (!found.has(id) && !here.has(id)) continue
      if ((PRIOR[id] || ENV[id]) && !here.has(id)) log(`Critère ${id} : déjà intégré sur ${INTEG_BRANCH} par un run précédent, mais relancé (${PRIOR[id] ? 'rejectedBy' : 'envRepair'}) : développé de nouveau.`)
      else SKIPPED.push(id)
    }
    if (SKIPPED.length) log(`Reprise depuis git : ${SKIPPED.length} critère(s) déjà intégré(s) sur ${INTEG_BRANCH} (Spec-First-Validated), sauté(s) : ${SKIPPED.join(', ')}`)
  }
} else integFailed = `Arrêté : ${stopped}.`

// ================================================================= 1. groups, a few at a time
// Without groups, one group per criterion; the criteria already integrated are left out.
const DEV = CRITERIA.filter(c => !SKIPPED.includes(c.id))
const devIds = DEV.map(c => c.id)
let groupIds = DEV.map(c => [c.id])
if (RAW_GROUPS) {
  groupIds = RAW_GROUPS.map(g => g.filter(id => devIds.includes(id))).filter(g => g.length)
  const flat = groupIds.flat()
  const missing = devIds.filter(id => !flat.includes(id))
  if (missing.length) {
    log(`Absent(s) des groupes, un groupe chacun : ${missing.join(', ')}.`)
    for (const id of missing) groupIds.push([id])
  }
  const big = groupIds.filter(g => g.length > 3).length
  if (big) log(`${big} groupe(s) de plus de 3 critères : plus lents à aboutir.`)
}
// A targeted repair is a group of its own, first in line.
{
  const envIds = devIds.filter(id => ENV[id])
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
// How many groups wait on each group, directly or not. Those go first — at a free slot, in the fusion
// queue — and a group at least HUB others wait for is the socle: one tester critic before its fusion.
const HUB = 2
const DOWNSTREAM = Object.fromEntries(GROUPS.map((g, i) => {
  const seen = new Set(), stack = [i]
  while (stack.length) { const j = stack.pop(); GROUPS.forEach((x, k) => { if (groupNeeds[k].includes(j) && !seen.has(k)) { seen.add(k); stack.push(k) } }) }
  return [g.id, seen.size]
}))
const FINAL_SLOT = 16 * (GROUPS.length + 1) // the end-of-run suite, then its repairs

const integratedGroups = []
const fusions = []
const filesOf = {} // criterion id → files its developers touched
const addFiles = (id, fs) => {
  const s = filesOf[id] || (filesOf[id] = [])
  for (const f of fs || []) if (!s.includes(String(f))) s.push(String(f))
}
const SOCLES = GROUPS.filter(g => (DOWNSTREAM[g.id] || 0) >= HUB).length
log(DEV.length
  ? `${DEV.length} critère(s) à développer en ${GROUPS.length} groupe(s), ${Math.min(MAX_GROUPS, GROUPS.length)} à la fois, chacun dans sa copie${Object.keys(DEPS).length ? ', chaque groupe dépendant lancé dès que ce dont il dépend est fusionné' : ''}${SOCLES ? `, ${SOCLES} groupe(s) socle jugé(s) par un critique testeur` : ''}${RECHECK.length ? `, ${RECHECK.length} critère(s) d'un run précédent` : ''}${SKIPPED.length ? `, ${SKIPPED.length} déjà intégré(s)` : ''}, puis ${quickTestCommand ? 'la batterie rapide une fois' : 'aucune batterie rapide (pas de quickTestCommand)'} — ${ALL.length} critère(s) au total`
  : `Rien à développer : ${RECHECK.length + SKIPPED.length} critère(s) déjà faits, puis ${quickTestCommand ? 'la batterie rapide une fois' : 'aucune batterie rapide (pas de quickTestCommand)'}`)

function workspaceRule(g, where, branch, from, ids) {
  if (where) {
    return `Your workspace is your copy ${where} (branch ${branch}), made in an earlier round. Every file you edit must be under it, never under ${ROOT}. Read the spec at ${SPEC}. When done, commit all your changes on that branch. ${trailerRule(ids)} ${HOOK_RULE} ${FLAKY_RULE}`
  }
  return `Other developers work on other criteria at the same time, so you work in your own copy of the project. First check that one can be made: ${ROOT} is the top of a git repository (\`[ "$(git -C "${ROOT}" rev-parse --show-toplevel)" = "$(cd "${ROOT}" && pwd -P)" ]\` succeeds). If not, change nothing, create nothing, and return a blocker starting with "${ISOLATION}" and the reason in a few French words.
Otherwise create your copy from ${from === BASE ? `commit ${BASE}` : `branch ${from} (what is already merged)`}, whatever the branch the project is on — uncommitted changes in ${ROOT} are not part of it:
\`${copyCommand(`g${g.id}`, from)}\`
Work only in that copy: every file you edit must be under it, never under ${ROOT}. Read the spec at ${SPEC}: your copy may lack it or hold an older version.
${PREPARE}
When done, commit all your changes on that branch (it is temporary: the run merges it, then removes the copy). ${trailerRule(ids)} ${HOOK_RULE} ${FLAKY_RULE} Return that copy as workspace and its branch as branch, even if you changed nothing. These checks and this copy are plumbing: never mention them in decisions.`
}

const hasPassing = r => r.criteria.some(id => PASSING.includes((r.results[id] || {}).status))
const keepBlocked = (r, reason) => {
  for (const id of r.criteria) {
    if (PASSING.includes((r.results[id] || {}).status)) r.results[id] = { ...r.results[id], status: 'blocked', kind: 'technique', reason }
  }
}

// A developer's self-check of one criterion: keyed by id (an older array form is read too).
const selfCheckOf = (dev, id) => {
  const sc = dev && dev.selfCheck
  const s = Array.isArray(sc) ? sc.find(x => x && String(x.id) === id) : sc && typeof sc === 'object' ? sc[id] : null
  return s && typeof s === 'object' ? s : {}
}

async function runGroup(g) {
  const tag = `Groupe ${g.id}`
  const ids = g.criteria.map(c => c.id)
  const locks = locksFor(ids)
  // What this group builds on, from other groups or an earlier run: merged before it starts.
  const needs = [...new Set(g.criteria.flatMap(c => DEPS[c.id] || []))].filter(d => !ids.includes(d))
  // A retry after a failed fusion: the group's work waits on its old branch.
  const carry = g.carry ? `
This group's work was already developed, but its fusion into the integration branch failed (${g.carry.why}). It is on branch ${g.carry.branch}: first bring it into your copy — \`git merge --no-edit ${g.carry.branch}\` —, resolve any conflict keeping both intents (what is merged and this work), commit, then make every criterion hold again on the merged result.` : ''
  const depNote = needs.length ? `
Your criteria build on criteria ${needs.join(', ')}, done elsewhere: they are already merged into the branch your copy starts from. Missing or broken there → blocker "${DEPENDS} ${needs.join(', ')} — why", never a workaround.` : ''
  const results = {}
  const book = Object.fromEntries(ids.map(id => [id, {}])) // the socle critic's verdicts
  const history = Object.fromEntries(ids.map(id => [id, []]))
  // A targeted repair (envRepair, a group of its own).
  const env = ids.length === 1 && ENV[ids[0]] ? ENV[ids[0]] : null
  if (env) log(`${tag} : réparation ciblée du critère ${ids[0]} (défaut d'environnement)`)
  const socle = !g.carry && (DOWNSTREAM[g.id] || 0) >= HUB
  if (socle) log(`${tag} : socle — ${DOWNSTREAM[g.id]} groupes en dépendent, un critique testeur le juge avant sa fusion`)
  const start = Math.max(0, ...ids.map(id => DEV_EFFORTS.indexOf(START[id] || DEV_EFFORTS[0])))
  // Every group starts from the integration branch: what is already merged.
  const from = integ.branch || FROM
  let pending = g.criteria.slice()
  let where = ''
  let branch = ''
  let nudge = ''
  let blocker = ''
  let round = 0
  const disputed = new Set() // criteria whose rejection the developer disputed with the spec's words
  const rejections = {} // id → how many times the socle critic rejected it: the second one is final
  // A relaunched criterion (rejectedBy): the proof of its earlier rejection reaches its developer at once.
  const priorIds = ids.filter(id => PRIOR[id])
  for (const id of priorIds) history[id].push({ round: 'run précédent ou revue', proofs: PRIOR[id].proof })
  let feedback = priorIds.length ? feedbackFor(priorIds.map(id => byId[id]), history, [], 'An earlier run, or the review of the spec, rejected these criteria: the proof below is what to fix.') : ''
  // An error thrown by an agent (a hard budget, a breakdown) stops this group only: what already
  // passed, and its copy, are kept and merged as usual.
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
      const heavyIds = pending.filter(c => HEAVY[c.id]).map(c => c.id)
      const judgedBy = socle
        ? 'other groups build on these criteria: before they are merged, one tester critic runs them on your copy and tries to break them.'
        : 'no critic judges your work during the run — your self-check stands until the review of the whole spec, which judges every criterion on the real result.'
      const devPrompt = `You are the developer for part of a spec, round ${round + 1} of at most ${DEV_EFFORTS.length}.

${SPEC_LINE}
Your criteria:
${list(pending)}
${done.length ? `Already done in this group — keep them working:\n${list(done, 'validated_criteria')}\n` : ''}Other criteria of the spec belong to other developers, who may touch the same files: do not implement them.${depNote}${carry}${pubIds.length ? `
Criteria ${pubIds.join(', ')} are publication criteria: prepare everything they need (version, changelog, files), but never push or publish — a later phase does it, with the owner's authorization.` : ''}
${env && round === 0 ? `
This is a targeted repair. An earlier run of this spec found criterion ${ids[0]} broken by its environment or configuration, not by its code:
<environment_defect>
${env.defect}
</environment_defect>
Fix exactly that — the configuration, the setting, the file the project expects — and nothing else; touch code only if the defect proves the code reads its configuration wrong.
` : ''}
${workspaceRule(g, where, branch, from, ids)}${catchUp}
${portRule(groupSlot(g.id, round))}${holdLine(locks)}
${nudge}${feedback}
Tests${SUBDIR ? ` (from the copy's ${SUBDIR} folder)` : ''}: while you work, run only the tests of what you touch (one file, one test), directly — never a whole suite: the quick suite runs once at the end of the run, the full one in the review.${heavyIds.length ? `
Heavy suite: ${heavyIds.map(id => `criterion ${id} has its own, \`${SUITE} heavy:${id}\``).join('; ')}. Run it once, after your last commit of this round, from inside your copy, and quote its verdict line (PASS or FAIL key=…) in that criterion's evidence — never in a loop, never another way. ${SUITE_RULE}` : ''}
Self-check — ${judgedBy} For each criterion, run what proves it on the real result, as its words say (build, run, call or open it), and quote in its evidence the command and its decisive output line: "pass" without them counts as not done. "not run" only when what it needs is out of your reach (a device, a credential): name it. ${WEAK_RULE}
Reading: grep finds the place, a file is read once — never in successive slices, never twice. Keep ${notesPath(ids)} current (decisions, files changed, left to do): after a context compaction, read it and go on.
Never run commands that rewrite files outside your criteria (repo-wide formatters, lockfile upgrades). If you need a new dependency, add it the project's usual way and say so in your summary.
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec — or, starting with "${TECH}", a technical cause outside your changes stops you (a hook, the environment, a missing tool) — or, starting with "${DEPENDS}" and their ids, other criteria of the spec your criteria build on are missing or broken in your copy.

${COMMON_RULES}`
      const dev = await ask(devPrompt, {
        model: DEV_MODEL, effort, schema: devSchema(ids, pending.map(c => c.id)), phase: 'Développement', locks,
        label: `${tag} — ${env ? 'réparation ciblée' : 'dév'} essai ${round + 1} (${DEV_MODEL} ${effort})`,
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
      // needed, the critic judges it again with the quote — not a round lost.
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
      const selfOf = id => selfCheckOf(dev, id)
      // A self-check stands when it says « pass » and quotes what was run, or « not run » and names what
      // is out of reach; « fail », or nothing quoted, is not done.
      const stands = c => { const s = selfOf(c.id); return (s.status === 'pass' || s.status === 'not run') && !!String(s.evidence || '').trim() }
      if (idle && (noCopy || !pending.every(stands))) {
        // The proof of an earlier rejection stays: it is what a relaunch (or envRepair) works from.
        for (const c of pending) {
          const prev = results[c.id] || {}
          results[c.id] = { ...prev, status: 'failed', rounds: round + 1, effortReached: effort, reason: prev.reason ? `${prev.reason}\n(puis le développeur s'est arrêté sans rien changer)` : "le développeur s'est arrêté sans rien changer" }
        }
        nudge = IDLE_NOTE
        log(`${tag} : essai ${round + 1} (${DEV_MODEL} ${effort}) — rien changé, nouvel essai un cran plus haut`)
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
      const base = c => ({ rounds: round + 1, effortReached: effort, ...(triage[c.id] ? { triage: triage[c.id] } : {}) })
      const notDone = pending.filter(c => !stands(c))
      const claimed = pending.filter(c => stands(c))
      for (const c of notDone) {
        const s = selfOf(c.id)
        results[c.id] = { ...base(c), status: 'failed', reason: `auto-contrôle du développeur : ${s.status || 'absent'} — ${s.evidence || 'sans preuve'}`, rejectedBy: ['auto-contrôle'] }
      }
      const rejected = []
      const leads = []
      if (socle && claimed.length) {
        const mergedIn = from !== BASE || !!catchUp
        const context = `<developer_claims>
Summary: ${dev.summary}
Self-check: ${pending.map(c => [c.id, selfOf(c.id)]).filter(([, s]) => s.status).map(([id, s]) => `[${id}] ${s.status}: ${s.evidence}`).join(' | ') || 'none'}${(dev.triage || []).length ? `
Triage of the last rejections: ${dev.triage.map(t => `[${t.id}] ${t.kind}: ${t.why}`).join(' | ')}` : ''}
</developer_claims>
These are claims, not evidence. A rejection marked "mistaken" quotes the spec: read that sentence in the spec yourself — if it says what the developer quotes and it settles the point, your earlier rejection falls; if not, keep it and say why in one sentence.
${changesHint(where)}${mergedIn ? ' Work merged into this copy before (other groups, an earlier run) is part of that diff: judge only your criteria.' : ''}`
        const seat = { criteria: claimed, previous: claimed.filter(c => book[c.id].tester).map(c => [c.id, book[c.id].tester]), slot: groupSlot(g.id, 3 + round) }
        await judgeSocle(seat, book, where, context, `${tag} — critique du socle essai ${round + 1}`)
        for (const c of claimed) {
          const j = judge(c, book)
          for (const l of j.leads) leads.push(`[${c.id}] ${l}`)
          if (j.status === 'defect') {
            rejections[c.id] = (rejections[c.id] || 0) + 1
            history[c.id].push({ round: `essai ${round + 1}`, proofs: j.proofs.join(' / ') })
            results[c.id] = { ...base(c), status: 'failed', reason: j.proofs.join('\n'), defect: j.defect, rejectedBy: j.by, leads: j.leads }
            // A rejection → one more round (xhigh), then the critic again; a second rejection is final.
            if (rejections[c.id] < 2) rejected.push(c)
          } else {
            results[c.id] = { ...base(c), status: j.status, reason: j.reason || '', proof: j.proof || '', leads: j.leads }
          }
        }
      } else {
        for (const c of claimed) {
          const s = selfOf(c.id)
          results[c.id] = s.status === 'pass'
            ? { ...base(c), status: 'unverified', selfOnly: true, reason: 'auto-contrôle du développeur seulement : la revue le juge', proof: `auto-contrôle du développeur : ${s.evidence}` }
            : { ...base(c), status: 'unverified', selfOnly: true, reason: `auto-contrôle impossible : ${s.evidence} — la revue le juge`, proof: '' }
        }
      }
      const passed = claimed.filter(c => PASSING.includes(results[c.id].status)).length
      log(`${tag} : essai ${round + 1} (${DEV_MODEL} ${effort}) — ${claimed.length}/${pending.length} critère(s) donné(s) pour faits par le développeur${socle && claimed.length ? `, ${passed}/${claimed.length} passé(s) au critique du socle` : ''}`)
      const again = g.criteria.filter(c => rejected.includes(c) || notDone.includes(c))
      if (blocker) {
        // The developer said the spec must change, or the environment stops him: another round cannot fix that.
        for (const c of again) results[c.id] = { ...results[c.id], ...blockedFields(blocker, ids) }
        pending = []
        break
      }
      feedback = (rejected.length ? feedbackFor(rejected, history, leads, 'The tester critic rejected the previous round.') : '')
        + (notDone.length ? selfFeedback(notDone.map(c => [c.id, selfOf(c.id)])) : '')
      pending = again
    }
  } catch (e) {
    const why = errText(e)
    log(`${tag} : arrêt sur une erreur (${why}) — critères passés et copie conservés`)
    for (const c of pending) results[c.id] = { ...(results[c.id] || {}), status: 'crashed', rounds: round + 1, reason: `arrêt sur une erreur : ${why} (panne)` }
  }
  const r = { group: g.id, criteria: ids, where, branch, results, blocker, kind: blocker ? kindOf(blocker) : '', integrated: false, removed: false }
  if (r.where && hasPassing(r)) {
    if (!r.branch) keepBlocked(r, `Copie rendue sans nom de branche — travail conservé dans ${r.where}.`)
    else r.fusion = fuseQueued(r) // not awaited: the group's slot goes to the next group while the fusion runs
  }
  return r
}

// ================================================================= 2. fusion, in batches
// A group with a criterion that passed (its developer's check, or the socle critic) is merged as soon as
// it is done, into one integration branch, one fusion at a time; later groups and rework start from it.
// The groups that finish while a fusion runs wait, then go together in the next one (at most FUSE_BATCH).
// The groups others wait for go first. The fusion runs only the tests of the files changed on both sides
// or merged with a conflict — never the quick suite (QualiSpectra: 52 fusions, 162 of their 200 minutes
// of commands in tests): it runs once, at the end of the run. It writes the merged criteria in a
// Spec-First-Validated trailer, which a relaunched run reads; it drops only the closed list DROP, then
// removes the merged copies. A fusion that fails is a technical block.
const FUSE_BATCH = 4
const fuseWaiting = []
let fusing = null
function fuseQueued(r) {
  return new Promise(done => {
    fuseWaiting.push({ r, done })
    if (!fusing) fusing = pumpFusions()
  })
}
async function pumpFusions() {
  while (fuseWaiting.length) {
    // Stable sort: the groups most others wait for first, the others in the order they finished. A group
    // others depend on is merged alone: with no suite per batch any more, a batch only makes the groups
    // waiting on it wait for its companions too.
    const order = fuseWaiting.map((x, k) => [x, k]).sort((a, b) => (DOWNSTREAM[b[0].r.group] || 0) - (DOWNSTREAM[a[0].r.group] || 0) || a[1] - b[1])
    const batch = ((DOWNSTREAM[order[0][0].r.group] || 0) > 0 ? order.slice(0, 1) : order.slice(0, FUSE_BATCH)).map(x => x[0])
    for (const x of batch) fuseWaiting.splice(fuseWaiting.indexOf(x), 1)
    try {
      await fuse(batch.map(x => x.r))
    } catch (e) {
      for (const { r } of batch) {
        if (r.integrated) continue
        keepBlocked(r, `Non intégré — la fusion s'est arrêtée sur une erreur ; travail conservé sur la branche ${r.branch}.`)
        r.fusionFailed = "l'intégrateur s'est arrêté sur une erreur"
        log(`Fusion : groupe ${r.group} non intégré (erreur)`)
      }
    }
    for (const x of batch) x.done()
  }
  fusing = null
}
// Settled once nothing waits and nothing merges.
async function fusionsDone() { while (fusing) await fusing }

async function fuse(rs) {
  if (overBudget(`la fusion ${plural(rs, 'du groupe', 'des groupes')} ${rs.map(r => r.group).join(', ')}`)) {
    for (const r of rs) keepBlocked(r, `Non intégré — ${stopped} ; travail conservé sur la branche ${r.branch}.`)
    return
  }
  if (!integ.where) {
    for (const r of rs) keepBlocked(r, `Non intégré — pas de copie d'intégration ; travail conservé sur la branche ${r.branch}.`)
    return
  }
  // The prompt depends only on these groups and on the integration copy, never on which groups were
  // merged before: a resumed run that forms the same batch asks the same, and a merge already done is
  // recognised by its trailer (step 2a), not redone.
  const names = rs.map(r => r.group).join(', ')
  const many = rs.length > 1
  const locks = locksFor(rs.flatMap(r => r.criteria))
  const okIds = r => r.criteria.filter(id => PASSING.includes((r.results[id] || {}).status))
  const W = integ.where
  const res = await ask(`You are the integrator. Developers work in parallel, each in its own git worktree of the project at ${ROOT}. Each finished group is merged into one integration branch; later groups and rework start from it. ${many ? `Merge groups ${names} now, one after the other, in this order.` : `Merge group ${names} now.`}

Spec: ${SPEC}
${rs.map(r => `Group ${r.group}: worktree ${r.where}, branch ${r.branch}, statuses ${r.criteria.map(id => `${id}=${r.results[id].status}`).join(', ')}; its trailer lines: "Spec-First-Validated: ${okIds(r).join(', ')}" and "${RUN_LINE}"
${list(r.criteria.map(id => byId[id]))}`).join('\n')}
The integration copy is ${W} (branch ${integ.branch}). Return its path as workspace and its branch as branch. The groups merged before are on that branch: they must keep working.

1. The integration copy lacks the project's dependencies (fresh, never prepared) → prepare it first. ${PREPARE}
2. For each group${many ? ', in the order above' : ''} (<wt> its worktree, <br> its branch, <N> its number, <ids> the ids of its Spec-First-Validated line):
   a. Already merged? Look only after the group's fork point — an older line for the same id is an earlier run's, whose work this group redoes: \`git -C ${W} log --format=%B $(git -C ${W} merge-base HEAD <br>)..HEAD | grep '^Spec-First-Validated:'\` lists every one of <ids> → it is on the integration branch already (a resumed run): nothing to merge, only step 4 if its copy still exists. Its branch is gone → merged only if \`git -C ${W} log --format=%B --grep='^${RUN_LINE}$' ${BASE}..HEAD | grep '^Spec-First-Validated:'\` lists every one of <ids>; otherwise it is not merged: notIntegrated, « branche disparue ». Its worktree is gone but its branch exists → skip b.
   b. Make its branch hold exactly what was developed, in <wt>: stage everything (\`git -C <wt> add -A\`), check the list \`git -C <wt> diff --cached --name-only ${BASE}\` and drop ${DROP} — with \`git -C <wt> restore --staged --source=${BASE} -- <path>\` (drops it even if the developer committed it). Everything else staged is the group's work: keep it. Something staged → \`git -C <wt> commit -m "spec-first : groupe <N>"\` with one \`--trailer "Spec-First-Criterion: <id>"\` per criterion of the group.
   c. Note the files both sides changed: \`git -C ${W} diff --name-only $(git -C ${W} merge-base HEAD <br>) HEAD\` and the same with <br> in place of the last HEAD — the files in both lists. Then merge: \`git -C ${W} merge --no-ff -m "spec-first : groupe <N>" -m "$(printf 'Spec-First-Validated: <ids>\\n${RUN_LINE}')" <br>\` — one merge commit per group, its message ending with those two trailer lines: you alone write them, and a relaunched run skips the criteria they list. « Already up to date » → nothing to merge: \`git -C ${W} commit --allow-empty -m "spec-first : groupe <N>" -m "$(printf 'Spec-First-Validated: <ids>\\n${RUN_LINE}')"\`, and no test for this group. Conflict → resolve the markers so this group's criteria and those of every group merged before it${many ? ' (in this batch too)' : ''} all still hold (read both sides, keep both intents), then \`git add\` and \`git commit --no-edit --cleanup=strip\` (the conflict notes git adds would otherwise end the message) — it keeps its trailer lines: check them with \`git -C ${W} log -1 --format=%B\`. Never run \`reset\`, \`rebase\`, \`stash\`, \`checkout\` or \`cherry-pick\` in the integration copy: they can wipe groups already merged. Cannot finish the merge → \`git -C ${W} merge --abort\`, so the integration copy stays as it was${many ? ', list the group in notIntegrated with the reason, and go on with the next' : ''}.
3. A dependency came in → install it in the integration copy the usual way. Tests: only those covering the files merged with a conflict or changed on both sides (step c)${many ? ', once for the whole batch' : ''}, run directly from ${SUBDIR ? `the copy's ${SUBDIR} folder` : 'the integration copy'}; no such file → no test. Never a whole suite: the quick suite runs once, at the end of the run, the full one in the review. Fix what the merges broke — only that — and commit the fix. ${WEAK_RULE} ${FLAKY_RULE} Commit hooks always run, never --no-verify; one fails for a reason outside the merges → the cause in reason (a group stays merged only if its merge commit is on the integration branch).
4. Each group merged and committed → remove its copy, no longer needed: \`git -C ${ROOT} worktree remove --force <wt>\` (refused, e.g. submodules → \`rm -rf <wt> && git -C ${ROOT} worktree prune\`), \`git -C ${ROOT} branch -D <br>\`, then \`rmdir "$(dirname <wt>)"\`. removed: true when every merged group's copy is gone. A group not merged → leave its copy in place. Leave every other copy and branch alone. Never edit ${ROOT}'s own files or switch its branch.
integrated: true only if every group above is on the integration branch with its trailer lines; a group that is not → in notIntegrated, with why (integrated false).
${portRule(groupSlot(rs[0].group, 12))}${holdLine(locks)}

${COMMON_RULES}`, { ...FUSION, schema: FUSION_SCHEMA, phase: 'Fusion', label: `Fusion ${plural(rs, 'groupe', 'groupes')} ${names} (${FUSION.model} ${FUSION.effort})`, locks })
  const notIn = new Map(((res && res.notIntegrated) || []).map(x => [String(x.group), x.reason || '']))
  for (const r of rs) {
    // integrated false with no group named: none is taken as merged.
    const ok = !!res && (res.integrated || (notIn.size > 0 && !notIn.has(r.group)))
    const why = notIn.get(r.group) || (res && res.reason) || ''
    if (res) fusions.push({ group: r.group, ...(many && { batch: names }), integrated: ok, reason: ok ? '' : why, conflicts: res.conflicts, tests: res.tests })
    if (ok) {
      r.integrated = true
      r.removed = !!res.removed
      integratedGroups.push(r)
      log(`Fusion : groupe ${r.group} intégré${many ? ` (lot ${names})` : ''} (${integratedGroups.length} au total)${(res.conflicts || []).length ? `, ${res.conflicts.length} conflit(s) résolu(s) dans la fusion` : ''}${r.removed ? ', copie supprimée' : ''}`)
    } else {
      keepBlocked(r, `Non intégré — travail conservé sur la branche ${r.branch}.${res ? (why ? ` ${why}` : '') : " L'intégrateur n'a pas répondu, deux fois."}`)
      r.fusionFailed = res ? (why || 'conflit non résolu') : "l'intégrateur n'a pas répondu"
      log(`Fusion : groupe ${r.group} non intégré, copie conservée`)
    }
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
// The next group whose dependencies are all settled; none ready → wait for one to settle.
async function nextReady() {
  for (;;) {
    // Among the ready groups, the one most others wait for; ties keep the order.
    const ready = GROUPS.map((g, k) => k).filter(k => !started[k] && groupNeeds[k].every(j => settled[j]))
    if (ready.length) { const i = ready.reduce((a, k) => DOWNSTREAM[GROUPS[k].id] > DOWNSTREAM[GROUPS[a].id] ? k : a); started[i] = true; return i }
    const left = GROUPS.map((g, k) => k).filter(k => !started[k])
    if (!left.length) return -1
    const awaited = [...new Set(left.flatMap(k => groupNeeds[k]).filter(j => !settled[j]))]
    await Promise.race(awaited.map(j => groupDone[j].p))
  }
}
const statusSoFar = id => {
  if (RECHECK.some(c => c.id === id) || SKIPPED.includes(id)) return 'unverified'
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
await fusionsDone()

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
  await fusionsDone()
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
// Earlier criteria come back « non vérifié »: the review judges every criterion.
for (const c of RECHECK) status[c.id] = { status: 'unverified', earlierRun: true, reason: c.neverJudged ? 'non vérifié par un run précédent : la revue le juge' : 'validé par un run précédent : la revue le juge', proof: '' }
for (const id of SKIPPED) status[id] = { status: 'unverified', alreadyIntegrated: true, reason: `déjà intégré sur ${INTEG_BRANCH} (Spec-First-Validated), sauté par ce run : la revue le juge`, proof: '' }

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
// Before the suite: what waits for a criterion that failed is not counted as passing.
holdDependents(st => PASSING.includes(st), !stopped)

// ================================================================= 3. the quick suite, once, at the end
// Measured (studio, 25-26/11): the full browser suite launched 39 times, 454 machine-minutes; QualiSpectra:
// the light check alone, 52 minutes. Now the quick suite runs once, on the integration branch, after
// every fusion, through the suite command (a result already in the ledger for that tree is read). Red →
// a targeted repair (xhigh, given the failing output), then the suite read again, twice at most; still
// red → the criteria it comes from are reported « en échec ». No quickTestCommand → nothing in its place.
// Only a reading by the high helper is a verdict — never the repair's own claim —, and a reading that
// gives none (refused, lost, no answer) never erases a red one; without a verdict, no review.
const SUITE_TITLE = 'Batterie rapide'
const MAX_SUITE_REPAIRS = 2
const NO_VERDICT = ['refused', 'lost', 'crashed']
let finalCheck = null
const passingAt = () => ALL.filter(c => PASSING.includes((status[c.id] || {}).status))
const onBranch = integratedGroups.length > 0 || !!IB || integ.reused || SKIPPED.length > 0 || RECHECK.length > 0
let suiteBlocker = ''
if (!quickTestCommand) finalCheck = { status: 'none', command: '', reason: 'pas de quickTestCommand : aucune batterie rapide en fin de run, rien à la place' }
else if (!integ.where) finalCheck = { status: 'none', command: quickTestCommand, reason: "pas de copie d'intégration" }
else if (!onBranch) finalCheck = { status: 'none', command: quickTestCommand, reason: "rien d'intégré : aucune batterie à passer" }
else if (overBudget('la batterie rapide')) finalCheck = { status: 'skipped', command: quickTestCommand, reason: stopped }
else {
  const W = integ.where
  const inRun = passingAt()
  const runIds = inRun.map(c => c.id)
  const fileMap = runIds.filter(id => (filesOf[id] || []).length).map(id => `[${id}] ${filesOf[id].slice(0, 40).join(', ')}`).join('\n')
  const filesBlock = fileMap ? `
<files_touched>
${fileMap}
</files_touched>` : ''
  // A suite refused for leftovers of the setup, a build or the tests (test-results/, .coverage): hidden
  // locally, the way the suite command's own message says — never .gitignore, never deleted.
  const HIDE_LEFTOVERS = `REFUSED for untracked files that are not source — what the setup, a build or the tests leave behind (test-results/, .coverage, caches) → hide them locally: append their paths, one per line, to the file \`git -C ${W} rev-parse --git-path info/exclude\` prints — never .gitignore, never delete them —, then \`${SUITE} quick\` again.`
  finalCheck = { status: '', command: quickTestCommand, reason: '', output: '', key: '', repairs: 0, readings: 0, failing: [], preexisting: '' }
  // One reading of the suite by the high helper: the first, or the one after repair n (the same tree is
  // read from the ledger, a new one runs once).
  const readSuite = n => ask(`${n ? `A developer just made repair ${n} of the quick suite of this run, on its integration branch: read the suite's verdict again — only your reading counts.` : 'You run the quick suite of this run, once, on its integration branch: every group is merged, no other agent of the run works now.'}

Integration copy: ${W} (branch ${integ.branch}).
1. It lacks the project's dependencies (fresh, never prepared) → prepare it first. ${PREPARE}
2. \`cd ${W} && ${SUITE} quick\` — it runs \`${quickTestCommand}\` there, or reads its result when the ledger already holds this tree. Exit 2 → \`${SUITE} wait <key>\` again until it ends. ${HIDE_LEFTOVERS} Untracked source files, or tracked files changed → never commit, hide or discard them: status refused, listed in output.
3. status: pass, fail, refused or lost, as its verdict line says; key: the key it printed; output: that line and, when red, the failing tests with their decisive error lines.
Red → broken: the criteria below whose changes the failing tests exercise (the files each one's developers touched are listed); none you can tie → empty. Fix nothing: a developer repairs what is red.
${list(inRun.map(c => ({ id: c.id, text: c.text.length > 160 ? `${c.text.slice(0, 160)}…` : c.text })))}${filesBlock}
${SUITE_RULE}
${portRule(FINAL_SLOT)}${holdLine(RESOURCES)}

${COMMON_RULES}`, { ...HELPER, schema: suiteSchema(runIds), phase: SUITE_TITLE, label: n ? `${SUITE_TITLE} — relecture ${n} (${HELPER.model} ${HELPER.effort})` : `${SUITE_TITLE} (${HELPER.model} ${HELPER.effort})`, locks: RESOURCES })
  const res = await readSuite(0)
  finalCheck.readings = 1
  if (!res) {
    finalCheck.status = 'crashed'
    finalCheck.reason = "l'agent de la batterie rapide n'a pas répondu, deux fois"
  } else {
    finalCheck.status = SUITE_STATUS.includes(res.status) ? res.status : 'lost'
    finalCheck.output = String(res.output || '')
    finalCheck.key = String(res.key || '')
    let broken = (res.broken || []).map(String).filter(id => runIds.includes(id))
    let nudge = ''
    log(`${SUITE_TITLE} : ${finalCheck.status === 'pass' ? 'verte' : finalCheck.status === 'fail' ? 'rouge' : finalCheck.status}${broken.length ? ` — liée à ${broken.join(', ')}` : ''}`)
    while (finalCheck.status === 'fail' && finalCheck.repairs < MAX_SUITE_REPAIRS) {
      if (overBudget(`la réparation ${finalCheck.repairs + 1} de la batterie rapide`)) break
      const n = finalCheck.repairs + 1
      const rep = await ask(`You are the developer repairing the quick suite that ends a run of a spec, repair ${n} of at most ${MAX_SUITE_REPAIRS}. Every group of the run is merged into the integration copy ${W} (branch ${integ.branch}); the quick suite is red there:
<suite_output>
${finalCheck.output}
</suite_output>${broken.length ? `
It was tied to criteria ${broken.join(', ')}.` : ''}

${SPEC_LINE}
Merged on this branch — every one must keep holding:
${list(inRun)}${filesBlock}
${changesHint(W)}
${nudge}
1. Start from the failing tests and their errors; no wider exploration. A test that fails the same way on the run's starting commit ${BASE} is not this run's doing: check that single test in a throwaway worktree of it (\`git -C ${ROOT} worktree add --detach <a fresh mktemp -d>/base ${BASE}\`, prepared like a copy, then \`git -C ${ROOT} worktree remove --force\` on it) — never fix it, describe it in "preexisting".
2. Fix what this run broke — only that — in ${W}, and commit it on ${integ.branch}, with one \`Spec-First-Criterion: <id>\` trailer line per criterion the fix serves. ${HOOK_RULE} ${FLAKY_RULE} ${WEAK_RULE}
3. Then \`cd ${W} && ${SUITE} quick\` once (exit 2 → \`${SUITE} wait <key>\`) to see where you stand; the run reads the verdict again itself, and only that reading counts. A suite ${HIDE_LEFTOVERS} Your own changes: commit them.
${SUITE_RULE}
Reading: grep finds the place, a file is read once — never in successive slices, never twice.
${portRule(FINAL_SLOT + n)}${holdLine(RESOURCES)}
Never run commands that rewrite files outside what broke (repo-wide formatters, lockfile upgrades).
"blocker" stays empty unless you cannot make any progress without the owner changing or clarifying the spec — or, starting with "${TECH}", a technical cause outside your changes stops you.

${COMMON_RULES}`, { ...REPAIR, schema: repairSchema(), phase: SUITE_TITLE, label: `Réparation (batterie rapide) essai ${n} (${REPAIR.model} ${REPAIR.effort})`, locks: RESOURCES })
      finalCheck.repairs = n
      // No answer: the red verdict, and what it is tied to, stand.
      if (!rep) { finalCheck.reason = "le développeur de la réparation n'a pas répondu, deux fois (panne)"; break }
      for (const d of rep.decisions || []) decisions.push(d)
      for (const id of broken) addFiles(id, rep.files)
      if (rep.blocker && !rep.changed) { suiteBlocker = String(rep.blocker); break }
      const pre = String(rep.preexisting || '').trim()
      if (!rep.changed && !pre) {
        nudge = IDLE_NOTE
        log(`Réparation de la batterie rapide essai ${n} — rien changé, nouvel essai`)
        continue
      }
      nudge = ''
      finalCheck.preexisting = pre
      if (!rep.changed) {
        // Nothing changed, every failure already there at the start: not this run's — nothing tied to it.
        broken = []
        log(`Réparation de la batterie rapide essai ${n} — les échecs existaient déjà au départ, rien à réparer`)
        break
      }
      const again = await readSuite(n)
      finalCheck.readings += 1
      if (!again || !['pass', 'fail'].includes(again.status)) {
        finalCheck.reason = again ? `relecture après la réparation ${n} sans verdict (${again.status}) : ${String(again.output || '').slice(0, 300)}` : `relecture après la réparation ${n} sans réponse`
        log(`${SUITE_TITLE} : ${finalCheck.reason} — la batterie reste rouge`)
        break
      }
      finalCheck.status = again.status
      finalCheck.output = String(again.output || '')
      finalCheck.key = String(again.key || '')
      broken = again.status === 'fail' ? (again.broken || []).map(String).filter(id => runIds.includes(id)) : []
      log(`Réparation de la batterie rapide essai ${n} (${REPAIR.model} ${REPAIR.effort}) — relue : ${again.status === 'pass' ? 'verte' : 'encore rouge'}${pre ? ' — des échecs existaient déjà au départ' : ''}`)
      if (rep.blocker) { suiteBlocker = String(rep.blocker); break }
      // Red only from failures already there when the run started: not this run's to fix.
      if (finalCheck.status === 'fail' && pre && !broken.length) break
    }
    if (finalCheck.preexisting) outsideSpec.push({ issue: `batterie rapide : ${finalCheck.preexisting}`, proof: finalCheck.output.slice(0, 500), severity: 'medium' })
    // Still red: the criteria it comes from are « en échec » (or blocked, when the repair said why).
    if (finalCheck.status === 'fail' && broken.length) {
      finalCheck.failing = broken
      for (const id of broken) {
        const prev = status[id] || {}
        status[id] = suiteBlocker
          ? { ...prev, ...blockedFields(suiteBlocker, [id]) }
          : { ...prev, status: 'failed', reason: `batterie rapide rouge en fin de run, après ${finalCheck.repairs} réparation(s) : ${finalCheck.output}`, defect: 'code', rejectedBy: ['batterie rapide'], effortReached: 'xhigh' }
      }
    }
    finalCheck.unattributed = finalCheck.status === 'fail' && !broken.length && !finalCheck.preexisting
  }
}
// After the suite: what depends on a criterion that did not pass waits for it — the publication
// criteria too: they depend on every other criterion.
holdDependents(st => PASSING.includes(st), !stopped)

// Where the result lives: the integration copy (something of this spec on its branch) or the project.
const holdsWork = integratedGroups.length > 0 || !!IB || integ.reused || SKIPPED.length > 0 || (finalCheck.repairs || 0) > 0
const TARGET = integ.where && holdsWork ? integ.where : ROOT

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
// squashed into the project; it never holds work found nowhere else (empty: nothing of this spec on it)
// — and the work of groups never merged (worktree, or only its branch once tidied).
// Group copies that were merged are already gone.
const copies = groupResults
  .filter(r => (r.where && !r.removed) || (r.branch && !r.integrated))
  .map(r => ({ group: r.group, worktree: r.removed ? '' : r.where, branch: r.branch, integrated: r.integrated }))
if (integ.where) copies.push({ group: 'intégration', worktree: integ.where, branch: integ.branch, integrated: true, ...(holdsWork ? {} : { empty: true }) })

// Which check ended the run, said plainly; once every criterion of the spec passes, the review comes next.
const FC_WORDS = { pass: 'verte', fail: 'rouge', refused: 'refusée (copie non commitée)', lost: 'perdue (processus disparu)', crashed: 'en panne', skipped: 'sautée' }
const checkLine = finalCheck.status === 'none' ? `aucune batterie rapide (${finalCheck.reason})`
  : `batterie rapide de fin de run (${finalCheck.command}) ${FC_WORDS[finalCheck.status] || finalCheck.status}${finalCheck.repairs ? ` après ${finalCheck.repairs} réparation(s)` : ''}${finalCheck.status === 'fail' ? (finalCheck.failing.length ? ` — en échec : ${finalCheck.failing.join(', ')}` : finalCheck.preexisting ? ' — échecs déjà présents au départ, hors du run' : ' — non rattachée à un critère : la revue la reprend') : ''}${NO_VERDICT.includes(finalCheck.status) ? ' — pas de revue sans verdict de la batterie' : ''}${finalCheck.reason && finalCheck.status !== 'none' ? ` (${finalCheck.reason})` : ''}`
// The review tests everything at once, in one place: every group's work must be on the integration
// branch. Work left on a group branch (« Non intégré ») → no review until its fusion is done.
const unmerged = groupResults.filter(r => r.branch && !r.integrated && r.criteria.some(id => (status[id] || {}).status !== 'crashed')).map(r => r.group)
// A suite that gave no verdict (refused, lost, its agent silent) is no ground for a review.
const reviewReady = !stopped && counts.total > 0 && counts.validated + counts.unverified === counts.total && !unmerged.length && !NO_VERDICT.includes(finalCheck.status)
if (unmerged.length) log(`Pas encore prêt pour la revue : travail du groupe ${unmerged.join(', ')} non intégré — la revue doit tout voir au même endroit`)
log(`Contrôle qui a tourné : ${checkLine}${reviewReady ? ' — prêt pour la revue (spec-first:review)' : ''}`)

// Stopped before the end (budget, agents dying in a row, no suite command): how to go on without
// redoing finished work. Read from git: the inventory of the next run finds the integration branch and
// skips what its trailers list; only work never merged is redone.
const integratedIds = [...new Set([...SKIPPED, ...integratedGroups.flatMap(r => r.criteria.filter(id => PASSING.includes((r.results[id] || {}).status)))])]
const resumeOut = stopped ? {
  why: stopped,
  // Never resumeFromRunId: the cache would give back the inventory's earlier answer.
  relaunch: `${suiteMissing ? `installer la commande de suites (scripts/suite du plugin → ${SUITE}, exécutable), puis ` : integ.uncommitted.length ? 'commiter ou écarter les changements non commités de la copie d\'intégration, puis ' : ''}relancer ce run avec les mêmes args et le même baseCommit, sans resumeFromRunId : l'inventaire retrouve ${integ.branch || INTEG_BRANCH} et saute les critères que ses trailers Spec-First-Validated donnent intégrés — seul le travail jamais fusionné est refait`,
  integrationBranch: integ.branch || INTEG_BRANCH,
  integrated: integratedIds,
} : null

// A readable state of the run, for a person or a later session: the orchestrator writes it to
// state.file (a workflow script cannot write files) each time the run returns.
const FR = { validated: 'validé', unverified: 'non vérifié', failed: 'en échec', blocked: 'bloqué', crashed: 'en panne' }
const stateText = [
  `# spec-first — état du run de ${SPEC_ID}`,
  '',
  `Étape : ${stopped ? 'arrêté avant la fin' : 'run terminé'}`,
  `Commit de départ (baseCommit) : ${BASE}`,
  `Contrôle : ${checkLine}`,
  `Critères : ${counts.validated}/${counts.total} validé(s)${counts.unverified ? `, ${counts.unverified} non vérifié(s)` : ''}${counts.failed ? `, ${counts.failed} en échec` : ''}${counts.blocked ? `, ${counts.blocked} bloqué(s)` : ''}${counts.crashed ? `, ${counts.crashed} en panne` : ''}`,
  ...criteria.map(c => `- ${c.id} : ${FR[c.status]}${c.kind === 'attente' ? ' — en attente des dépendances' : c.defect === 'environnement' ? " — défaut d'environnement" : c.alreadyIntegrated ? ' — déjà intégré, sauté' : ''}`),
  ...(integ.branch ? ['', `Branche d'intégration : ${integ.branch}`] : []),
  ...(resumeOut ? ['', `Arrêt : ${resumeOut.why}`, `Reprendre : ${resumeOut.relaunch}`] : []),
  ...(reviewReady ? ['', 'Prochaine étape : la revue de la spec (spec-first:review).'] : []),
].join('\n')

return {
  specId: SPEC_ID,
  baseCommit: BASE,
  // Where the result is: in the project's working tree, uncommitted, or on the integration branch,
  // which the skill squashes into the project (`git merge --squash`) before the « spec » commit.
  result: TARGET === ROOT ? { in: 'project', path: ROOT } : { in: 'integration', worktree: integ.where, branch: integ.branch },
  // What the inventory found: the branch (fixed name, or the override), reused or made, an earlier
  // run's branch set aside, and the criteria skipped because a fusion had already validated them.
  inventory: { branch: integ.branch || INTEG_BRANCH, worktree: integ.where, reused: integ.reused, setAside: integ.setAside, mergeAborted: integ.mergeAborted, uncommitted: integ.uncommitted, suiteMissing, runTag: ARGS_TAG },
  skipped: SKIPPED,
  groups: groupResults.map(r => ({ id: r.group, criteria: r.criteria, integrated: r.integrated, ...((DOWNSTREAM[r.group] || 0) >= HUB ? { socle: true } : {}) })),
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
  testCommand,
  quickTestCommand,
  setupCommand,
  heavy: HEAVY,
}
