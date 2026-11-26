export const meta = {
  name: 'review',
  description: 'spec-first review, once per spec, separate from the development run: six reviewers in xhigh, each with one angle (owner, reliability, security, performance, integration and maintenance, usage), reading the whole spec and every commit of it, and live testers in xhigh — one per slice of about eight criteria, two to six, in parallel, each with its own ports, its own instance of the result and data folder (from one launch recipe the preparation writes) and its own isolated browser context — who run the real result and drive it with Chrome DevTools along user journeys covering every criterion; the full suite (else the quick one) run by a suite agent of its own through the project\'s suite script, whose ledger never runs the same suite twice on one tree; duplicates merged, unproven leads tried live in parallel by the tester of their slice; one developer repairs every proven blocking or major defect in one batch, re-judged by the reviewer that raised each one, by the testers of the slices the repair touches (their replay scripts first, live where one fails or the repair reaches) while the other slices replay their scripts, and by the full suite again — three repair rounds at most; then, only if the owner authorized it with his go, the external actions he listed (push, merge request, CI, merge, tag, release), checked from outside: a commit the remote already has is never pushed again, and nothing local runs again after an external wait. Opus only: xhigh for the reviewers, testers, repair and publication tester, high for everything else',
  whenToUse: 'Called by the spec-first skill once every criterion of the spec passed the development runs (spec-first:run), or alone when the owner asks for a review. Needs <projectRoot>/.spec-first/bin/suite (the plugin\'s scripts/suite, executable): missing → the review stops at once, stoppedKind « suite-missing » and install (the path): install it, then a new review with the same args, without resumeFromRunId. Every stop returns the whole report; stoppedKind says why: budget, agents, suite-missing, preparation, copy. args: { specPath, projectRoot, baseCommit, criteria: [{ id, text }], specBrief?, workspace?, branch?, testCommand?, quickTestCommand?, heavy?: { [id]: command }, setupCommand?, subdir?, journeys?: [[ids]], exclusive?: [string] | { [resource]: [ids] }, publish?: { actions: string, criteria: [ids] }, focus?: [{ id?, reviewer, finding }], waitRound?: number, waitAt?: { [read]: number }, waitCheck?: string, suiteRetry?: number, budget?: number } with absolute paths (profil: accepted and ignored — one profile). baseCommit: the commit the spec started from (the baseCommit of its first run) — every reviewer reads the whole diff from it. criteria: every criterion of the spec. journeys: the testers\' slices, one tester each (six at most, every criterion in exactly one) — omitted → contiguous slices of about eight criteria in the order of criteria, two to six testers. exclusive: a browser is never one (dropped). workspace + branch: where the result lives — the run report\'s result.worktree and result.branch when result.in is "integration"; omitted → a review copy is made from the project\'s HEAD (commit the work first). Repairs are committed on that branch, never on the owner\'s. focus: a targeted re-review after a criterion was relaunched in a development run — only the reviewers named judge again, only those findings, plus a live replay by the testers; no full panel — the report\'s focus field gives it ready-made for every open defect. A remote pipeline, a registry, a human review still running → returns « waiting »: resume with resumeFromRunId, the same args, and waitRound, waitAt and waitCheck from the report. A suite neither green nor red after its agent\'s own remedies → suite.block (cause, unblock): once unblocked, resume with resumeFromRunId, the same args and suiteRetry from it. An agent that never answered (a reviewer, a tester, the suite) → silent: resume with resumeFromRunId and the same args. budget: output tokens, the review stops cleanly before it. Not for a bare slash-command call without args: tell the user to run /spec-first instead.',
  phases: [
    { title: 'Préparation', detail: 'one Opus high agent checks the suite script, resets it and records the test commands, makes the review copy when none is given, and writes the launch recipe every tester shares (each its own data folder, or its own checkout)' },
    { title: 'Revue', detail: 'six reviewers in xhigh, one angle each, on the whole spec and every commit; live testers in xhigh, one per slice of about eight criteria (two to six), in parallel, each in its own isolated browser context; a suite agent (high) runs the full suite once through the suite script' },
    { title: 'Pistes', detail: 'duplicates merged; unproven leads tried live in parallel, each by the tester of its slice' },
    { title: 'Réparation', detail: 'one developer repairs every proven blocking or major defect in one batch (xhigh); the reviewer that raised each one re-judges it, the testers of the touched slices replay theirs (scripts first, live where the repair reaches), the other slices replay their scripts, and the full suite runs again — three rounds at most' },
    { title: 'Publication', detail: 'only with the owner\'s authorization: the external actions he listed, never waiting on something outside the machine, never pushing a commit the remote already has, nothing local run again after an external wait; a tester in xhigh checks each publication criterion from outside' },
  ],
}

// ---------------------------------------------------------------- models
// One profile, the owner's rule since 26/11/2026: every agent Opus, high at least — never Sonnet, never
// Haiku. The « rapide » profile is gone: in the two slow sessions measured (QualiSpectra 24–26/11, studio
// 25–26/11) 71 to 83 % of agent time was commands — suites re-run, testers in series behind a browser
// lock —, not the model; speed comes from parallel work and a suite never run twice on one tree.
const M = 'opus'
const REVIEWER = { model: M, effort: 'xhigh' } // the six reviewers, the live testers, the publication tester
const MERGER = { model: M, effort: 'high' } // merges duplicate findings: reads, judges nothing
const REPAIR_EFFORTS = ['xhigh', 'xhigh', 'xhigh'] // the repair, always xhigh (never max) — three rounds at most
const HELPER = { model: M, effort: 'high' } // preparation, the suite, the replays of untouched slices, the remote CI
const PUBLISH_EFFORTS = ['high', 'xhigh', 'xhigh'] // the publisher: high, xhigh on its retries
const CI_WAIT_MIN = 60

// ---------------------------------------------------------------- args
let input = args
if (typeof input === 'string') { try { input = JSON.parse(input) } catch (e) { input = null } }
const HASH = /^[0-9a-f]{7,64}$/i
const NAME = /^[A-Za-z0-9._/-]+$/
if (!input || typeof input !== 'object' || !input.specPath || !input.projectRoot || !Array.isArray(input.criteria) || !input.criteria.length) {
  return { error: 'Missing args. Expected { specPath, projectRoot, baseCommit, criteria: [{ id, text }] } with absolute paths — criteria: every criterion of the spec.' }
}
if (!HASH.test(String(input.baseCommit || ''))) {
  return { error: 'args.baseCommit is required: the commit the spec started from (the baseCommit of its first run).' }
}
const SPEC = String(input.specPath)
const ROOT = String(input.projectRoot).replace(/\/+$/, '')
const BASE = String(input.baseCommit)
const CRITERIA = input.criteria.map((c, i) => typeof c === 'string' ? { id: String(i + 1), text: c } : { id: String(c && c.id != null ? c.id : i + 1), text: String((c && c.text) || '') })
const ids = CRITERIA.map(c => c.id)
const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
if (dup.length) return { error: `Criterion ids must be unique. Repeated: ${[...new Set(dup)].join(', ')}.` }
const byId = Object.fromEntries(CRITERIA.map(c => [c.id, c]))
const GENERAL = 'general' // a finding no single criterion carries (a security hole, a slowdown)
if (input.profil != null) log(`profil « ${input.profil} » ignoré : un seul profil, tout en Opus (high au minimum, xhigh pour la revue).`)

// The spec outside its criteria — goal, out-of-scope list, « Limites » — passed by the caller: the
// agents then hold the whole spec and never open the file. Not passed → one whole read
// (kipp, 1.9.2: every agent read it whole, then again in slices).
const BRIEF = String(input.specBrief || '').trim()
const SPEC_LINE = BRIEF ? `Spec: ${SPEC} — do not open it: its goal, out-of-scope list and « Limites » are here, its criteria below.\n<spec_brief>\n${BRIEF}\n</spec_brief>` : `Spec: ${SPEC} — read it once, whole, never in slices.`

const COPIES = '.spec-first/copies'
const WS_IN = String(input.workspace || '').replace(/\/+$/, '')
const BR_IN = String(input.branch || '')
if (WS_IN && (!WS_IN.includes(`/${COPIES}/`) || !BR_IN || !NAME.test(BR_IN) || BR_IN.startsWith('-'))) {
  return { error: `args.workspace must be a copy under ${ROOT}/${COPIES} (the run report's result.worktree), with args.branch its branch (result.branch).` }
}

let PUBLISH = null
if (input.publish != null) {
  const p = input.publish
  const pids = p && typeof p === 'object' && Array.isArray(p.criteria) ? p.criteria.map(String) : []
  if (!p || typeof p !== 'object' || !String(p.actions || '').trim() || !pids.length || pids.some(id => !byId[id])) {
    return { error: 'args.publish must be { actions: "the external actions the owner authorized, in plain words", criteria: [ids of the criteria the publication makes true] }.' }
  }
  PUBLISH = { actions: String(p.actions).trim(), ids: [...new Set(pids)] }
}

const testCommand = String(input.testCommand || '')
const quickTestCommand = String(input.quickTestCommand || '')
const setupCommand = String(input.setupCommand || '')
const SUBDIR_IN = String(input.subdir || '')
if (SUBDIR_IN && (SUBDIR_IN.startsWith('/') || SUBDIR_IN.split('/').includes('..') || !NAME.test(SUBDIR_IN))) {
  return { error: 'args.subdir must be a folder relative to projectRoot (letters, digits, . _ - /, no ..).' }
}
const SUBDIR = SUBDIR_IN.replace(/^(\.\/)+/, '').replace(/\/+$/, '')
const inSub = tree => SUBDIR ? `${tree}/${SUBDIR}` : tree

// heavy: { criterion id: command } — a criterion with a long suite of its own (an e2e run, a verification).
// Recorded in the suite script with the others: whoever needs that result reads it from the ledger.
const HEAVY = {}
if (input.heavy != null) {
  if (typeof input.heavy !== 'object' || Array.isArray(input.heavy)) return { error: 'args.heavy must be { [criterion id]: command }.' }
  for (const [k, v] of Object.entries(input.heavy)) {
    const cmd = String(v == null ? '' : v).trim()
    if (!byId[String(k)] || !cmd) { log(`heavy ignoré pour « ${k} » : ${byId[String(k)] ? 'commande vide' : 'critère inconnu'}.`); continue }
    HEAVY[String(k)] = cmd
  }
}
// The suite script (the plugin's scripts/suite, installed by the skill): one command for every suite, one
// ledger keyed by tree and command — a result already there is read, a run going on is joined, so two agents
// asking for one suite on one tree cost one run (studio, 25–26/11: `make test` grown from 32 s to 15.5 min,
// 39 launches, 454 machine-minutes; QualiSpectra: the same local gate three times at publication).
const SUITE_BIN = `${ROOT}/.spec-first/bin/suite`
const SUITE_NAME = testCommand ? 'full' : quickTestCommand ? 'quick' : '' // the review's suite: the full one, else the quick one
const SUITE_LABEL = SUITE_NAME === 'quick' ? 'suite rapide' : 'suite complète' // labels and logs
const SUITE_EN = SUITE_NAME === 'quick' ? 'quick suite' : 'full suite' // prompts
const SUITE_CMD = { ...(testCommand ? { full: testCommand } : {}), ...(quickTestCommand ? { quick: quickTestCommand } : {}), ...Object.fromEntries(Object.entries(HEAVY).map(([id, c]) => [`heavy:${id}`, c])) }
const SUITES = Object.keys(SUITE_CMD)
const shName = s => /^[A-Za-z0-9._:-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`
const suiteAt = (dir, name) => `cd "${dir}" && "${SUITE_BIN}" ${shName(name)}`

// Exclusive resources (a GPU, a device, a fixed port): only live testers and the repair use them, one
// at a time. { resource: [ids] } → a tester holds only those its criteria need; a plain list → all.
// A browser is never one: each tester has its own isolated context (studio, 25–26/11: a browser listed as
// exclusive put the two testers in series — 169 min of panel). A genuinely exclusive device stays possible.
const BROWSERISH = /browser|navigateur|\bchrom(e|ium)\b|devtools/i
const RES_MAP = {}
const addResource = (r, cids) => {
  if (!r) return
  if (BROWSERISH.test(r)) { log(`exclusive : « ${r} » écarté — le navigateur n'est jamais exclusif, chaque testeur a son contexte isolé.`); return }
  RES_MAP[r] = cids
}
if (Array.isArray(input.exclusive)) for (const r of input.exclusive.map(x => String(x).trim()).filter(Boolean)) addResource(r, ids.slice())
else if (input.exclusive && typeof input.exclusive === 'object') for (const [k, v] of Object.entries(input.exclusive)) addResource(String(k).trim(), (Array.isArray(v) ? v : [v]).map(String).filter(id => byId[id]))
const RESOURCES = Object.keys(RES_MAP).sort()
const locksFor = cids => RESOURCES.filter(r => RES_MAP[r].some(id => cids.includes(id)))
// Live testers: one per slice of about eight criteria, two to six (never more than criteria), all at once
// (QualiSpectra: tester 1 alone 83 min of panel; studio: two testers in series, 169 min). A slice is
// contiguous in the order of criteria — neighbours usually share a screen and a journey — or one of the
// caller's journeys.
let SLICES
if (input.journeys != null) {
  const js = Array.isArray(input.journeys) ? input.journeys.map(j => (Array.isArray(j) ? j : [j]).map(String)).filter(j => j.length) : []
  const flat = js.flat()
  const unknown = flat.filter(id => !byId[id])
  const twice = flat.filter((id, i) => flat.indexOf(id) !== i)
  const missing = ids.filter(id => !flat.includes(id))
  if (!js.length || js.length > 6 || unknown.length || twice.length || missing.length) {
    return { error: `args.journeys must be [[criterion ids]]: one to six slices, every criterion in exactly one.${js.length > 6 ? ` ${js.length} slices given.` : ''}${unknown.length ? ` Unknown: ${[...new Set(unknown)].join(', ')}.` : ''}${twice.length ? ` Repeated: ${[...new Set(twice)].join(', ')}.` : ''}${missing.length ? ` Missing: ${missing.join(', ')}.` : ''}` }
  }
  SLICES = js.map(j => j.map(id => byId[id]))
} else {
  const k = Math.min(CRITERIA.length, Math.max(2, Math.min(6, Math.ceil(CRITERIA.length / 8))))
  const size = Math.floor(CRITERIA.length / k)
  const extra = CRITERIA.length % k
  SLICES = []
  for (let i = 0, at = 0; i < k; i++) { const n = size + (i < extra ? 1 : 0); SLICES.push(CRITERIA.slice(at, at + n)); at += n }
}
const N_TESTERS = SLICES.length
if (input.testers != null) log('testers ignoré : un testeur par tranche d\'environ huit critères (deux à six), ou par élément de journeys.')
const WAIT_ROUND = Math.max(0, Math.floor(Number(input.waitRound) || 0))
// waitAt: { CI read name: the resume round that re-reads it live } — only the reads that were waiting
// change their prompt on a resume; every read already done comes back from cache, and so does
// everything that depends on it (the repairs above all).
const WAIT_AT = {}
if (input.waitAt && typeof input.waitAt === 'object' && !Array.isArray(input.waitAt)) for (const [k, v] of Object.entries(input.waitAt)) if (Number(v) > 0) WAIT_AT[String(k)] = Math.floor(Number(v))
const LIMIT = Number(input.budget) > 0 ? Number(input.budget) : 0
// suiteRetry: how many more tries a suite blocked by its environment (REFUSED or LOST after its agent's own
// remedies) gets on a resume — each try is a new call after the blocked one, so everything before comes
// back from cache. waitCheck: the read-only check of an external wait (the report's waiting.check).
const SUITE_RETRY = Math.max(0, Math.floor(Number(input.suiteRetry) || 0))
const WAIT_CHECK = String(input.waitCheck || '').trim()

// The six reviewers. Each reads the whole spec and every commit of it, from one angle.
const REVIEWERS = {
  owner: {
    label: 'propriétaire',
    brief: `You are the OWNER'S ADVOCATE. The project owner wrote this spec; he does not read code. Check that the result does what he meant, not a convenient reading of the words: the spec's goal, out-of-scope list and « Limites », CLAUDE.md, earlier specs next to this one and recorded decisions. A defect: the letter of a criterion is met but not its intent; a criterion weakened or reinterpreted; a recorded decision contradicted; a limit crossed (exceptions read exactly as written). Proof = the spec or decision text quoted, plus what the result actually does.`,
  },
  reliability: {
    label: 'fiabilité',
    brief: `You are the RELIABILITY REVIEWER. Look for what breaks in real use: errors swallowed or unhandled, edge and boundary values, empty or malformed input, concurrency and ordering, interrupted operations (network loss, restart, offline), resources left open, state that survives when it should not. Prove each defect: the input or sequence, and the wrong behaviour you observed (a command you ran, a targeted test you wrote in a scratch folder).`,
  },
  security: {
    label: 'sécurité',
    brief: `You are the SECURITY REVIEWER. Look for holes the spec's changes introduced: injection (SQL, shell, HTML, script), missing or weakened authentication or authorization, secrets in code, logs or responses, unsafe file paths, untrusted input reaching a dangerous call, a new dependency with a known problem. Prove each one: the input that exploits it and what happens, or the exact path from input to the dangerous call. Holes that existed before the spec go in "outsideSpec".`,
  },
  performance: {
    label: 'performance',
    brief: `You are the PERFORMANCE REVIEWER. Look for what the spec's changes made slow or heavy: work repeated in loops, queries per item, blocking calls on a hot path, unbounded memory or payloads, missing pagination or caching where the old code had it, startup or page-load regressions. Prove by measurement — time or memory before (at the base commit) and after, on the same input — never by intuition alone. A browser-side slowdown you cannot measure without the browser → a lead for the live testers, written as a scenario.`,
  },
  integration: {
    label: 'intégration et maintenance',
    brief: `You are the INTEGRATION AND MAINTENANCE REVIEWER. The result combines work developed separately, merged one by one. Look for what the combination broke (a conflict resolved by dropping one side, two implementations of the same thing, one part undoing another, a shared file where one change overrode another), side effects on behaviour that worked before, a test deleted, skipped or loosened (an assertion removed or widened) when no criterion asks for it, changes no criterion needed (scope creep), dead or duplicated code left behind, fragile code that will break on the next change. Prove each defect: the reproduction, or the clashing changes quoted with their effect.`,
  },
  usage: {
    label: 'usage',
    brief: `You are the USAGE REVIEWER: you stand for the people who use the result. An application → its users: clarity of what they see, wording, error messages, accessibility (labels, keyboard, contrast), consistency with the rest of the interface. A library or a tool → its callers: API compatibility, breaking changes, defaults, documentation and help text matching the behaviour. Prove each defect: what a user does, what they get, why it is wrong for them. Something you must see on screen → a lead for the live testers, written as a scenario.`,
  },
}
const REVIEWER_KEYS = Object.keys(REVIEWERS)
const labelOf = k => REVIEWERS[k] ? REVIEWERS[k].label : k.startsWith('tester') ? `testeur${N_TESTERS > 1 && /^tester-\d+$/.test(k) ? ` ${k.split('-')[1]}` : ''}` : k === 'ci' ? 'CI' : k === 'suite' ? SUITE_LABEL : k

// Any name a report or an agent may give a source → its key; '' when unknown.
const ALIAS = { maintainer: 'integration', mainteneur: 'integration', integrator: 'integration', 'intégrateur': 'integration', 'intégration': 'integration', proprietaire: 'owner', 'propriétaire': 'owner', fiabilite: 'reliability', 'fiabilité': 'reliability', 'sécurité': 'security', securite: 'security' }
function keyOf(name) {
  const raw = String(name || '').trim()
  const low = raw.toLowerCase().replace(/^relecteur\s+/, '').replace(/\s*\(.*$/, '').trim()
  if (REVIEWERS[low]) return low
  const byLabel = Object.entries(REVIEWERS).find(([, v]) => v.label === low)
  if (byLabel) return byLabel[0]
  if (ALIAS[low]) return ALIAS[low]
  if (low === 'ci') return 'ci'
  if (low === 'suite' || low === 'suite complète' || low === 'suite rapide') return 'suite'
  // An older report's leads tester: the leads are now tried by the tester of their slice.
  if (low === 'tester-leads') return 'tester'
  const t = low.match(/^(?:tester|testeur)(?:[\s-]*(\d+))?/)
  if (t) return t[1] && Number(t[1]) >= 1 && Number(t[1]) <= N_TESTERS ? `tester-${t[1]}` : 'tester'
  return ''
}

// focus: a targeted re-review — only the reviewers named, only their findings, plus the live testers.
const FOCUS = []
if (input.focus != null) {
  if (!Array.isArray(input.focus)) return { error: 'args.focus must be an array of { id?, reviewer, finding }.' }
  for (const f of input.focus) {
    const rk = String((f && (f.reviewer || f.critic)) || '').trim()
    let key = keyOf(rk)
    if (!key) { log(`focus ignoré : relecteur inconnu « ${rk} ».`); continue }
    // The CI is not read in a targeted re-review: its findings are replayed live by the testers. A failing
    // test is judged again by the suite itself, through its ledger (by the testers when no suite is given).
    if (key === 'ci' || (key === 'suite' && !SUITE_NAME)) key = 'tester'
    FOCUS.push({ id: f && f.id != null && byId[String(f.id)] ? String(f.id) : GENERAL, reviewer: key, finding: String((f && (f.finding || f.proof)) || '').trim() })
  }
  if (!FOCUS.length) return { error: 'args.focus lists no usable finding: each needs a reviewer (owner, reliability, security, performance, integration, usage, tester, suite) and a finding.' }
}

// ---------------------------------------------------------------- helpers
const hashOf = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 } return h }
const PORT_BASE = (hashOf(ROOT) % 9) * 500 + 250 // never the ports of a development run of the same project
const portsFor = slot => { const a = 20000 + 10 * ((PORT_BASE + slot) % 4500); return `${a}-${a + 9}` }
const portRule = slot => `Ports: anything you start that listens (a server, a service) uses only ports ${portsFor(slot)}, and you stop it before you return.`
const list = (cs, tag = 'criteria') => `<${tag}>\n${cs.map(c => `<criterion id="${c.id}">${c.text}</criterion>`).join('\n')}\n</${tag}>`
const errText = e => String((e && e.message) || e || 'erreur inconnue').slice(0, 200)
const plural = (n, one, many) => n > 1 ? many : one
const sentence = s => { const t = String(s || '').trim(); return t && !/[.!?…]$/.test(t) ? `${t}.` : t }
// The spec's id names its copies, branches and harness. A slug over 40 characters is cut to 32 plus a hash of
// the whole slug: two specs sharing their first 40 characters would otherwise share copies and branches.
// The same code in run.js.
const SLUG = (SPEC.split('/').pop() || '').replace(/\.md$/i, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
const SPEC_ID = (SLUG.length > 40 ? `${SLUG.slice(0, 32)}-${hashOf(SLUG).toString(36)}` : SLUG) || 'spec'
const ENSURE_HIDDEN = `cd "${ROOT}" && x=$(git rev-parse --git-path info/exclude) && mkdir -p "$(dirname "$x")" && { grep -qxF /.spec-first/ "$x" || echo /.spec-first/ >> "$x"; }`
const SUBMODULES = '{ [ ! -f .gitmodules ] || git submodule update --init --recursive; }'
// One launch recipe per spec, written once by the preparation — up to six testers finding it absent at once
// would each write one — and kept between rounds and reviews (kipp, 1.9.2: each tester rebuilt the server,
// its seeding and its reproduction scripts). The testers share one copy of the project: each agent that
// starts the result gets its own data folder (database, uploads, caches), or its own checkout when the app
// keeps its data inside the project folder; nobody installs anything in the shared copy.
const HARNESS = `${ROOT}/.spec-first/harness/${SPEC_ID}`
const DATA = name => `${HARNESS}/data/${name}`
let LAUNCH_MODE = 'data' // the preparation's answer: data | checkout | none | failed
let LAUNCH_NOTE = ''
const launchRule = name => LAUNCH_MODE === 'none'
  ? `Nothing to launch: the result is not a server or an app${LAUNCH_NOTE ? ` (${LAUNCH_NOTE})` : ''}; use it the way its user does, every file you make under ${DATA(name)}.`
  : LAUNCH_MODE === 'failed'
    ? `No launch recipe could be made (${LAUNCH_NOTE || 'reason unknown'}): start the result your own way, every file it writes under your data folder ${DATA(name)}, without installing anything in the copy; never write ${HARNESS}/launch.sh.`
    : `Launch recipe: \`${HARNESS}/launch.sh <port> ${DATA(name)}\` — your own instance, every file it writes in your own data folder${LAUNCH_MODE === 'checkout' ? ', from a checkout of its own at the copy\'s commit (the app keeps its data inside the project folder)' : ''}; it prints the URL. Never install anything in the copy, never edit launch.sh: it fails → start the result your own way for this task, under that data folder, and say what failed.`
// Replay scripts: a check that runs again without a model session. After a repair they run first; the
// browser opens only where one fails, or where none exists and the repair reaches (QualiSpectra,
// 10/11/2026: the testers' replays after two repairs cost 16 % of the review, 100 to 130 calls each).
// Each under 120 s and independent of the others, so the scripts of a slice run together in one command;
// never a whole suite inside — a replay running `make test` is the suite again, outside the ledger.
const REPLAY_DIR = `${HARNESS}/replay`
const NO_SUITE_IN = [testCommand, quickTestCommand, ...Object.values(HEAVY)].filter(Boolean).map(c => `\`${c}\``)
const REPLAY_RULE = `Replay scripts: ${REPLAY_DIR}/<name>.sh <url> — one check that runs again without you, against an instance launch.sh started (its URL as only argument; a CLI or a library ignores it): exit 0 when the behaviour is right, any other code when it is wrong, the decisive line printed. Under 120 s, independent of the others (they run together against one instance); never a whole suite inside — not ${NO_SUITE_IN.length ? `${NO_SUITE_IN.join(', ')}, ` : ''}the suite script, a pre-push or CI command. Built from what the project already has (API calls, its CLI, its test tools, its browser automation when it has one) — never install a tool for it, and never a weaker check than the one you made by hand.`
// The scripts of a slice in one command, in parallel, 120 s each. Portable (macOS has no `timeout`): a perl
// wrapper forks the script in a process group of its own and kills the whole group at 120 s (exit 142) — an
// alarm on bash alone left its children running. The batch can outlast the shell tool's default 2 minutes:
// the agent gives it 300 s. replayOf cannot read a script, so whoever runs one checks it against the rules:
// a script that breaks them is a defect of the script, not of its criterion.
const REPLAY_BATCH = `d=$(mktemp -d) && printf '%s\\n' <script>… | xargs -P 16 -I@@ perl -e 'my($t,$s,$u,$d)=@ARGV;(my $n=$s)=~s|.*/||;my $p=fork;if(!$p){setpgrp(0,0);open STDOUT,">","$d/$n.log";open STDERR,">&STDOUT";exec "bash",$s,$u or exit 127}setpgrp($p,$p);$SIG{ALRM}=sub{kill "KILL",-$p;waitpid($p,0);print "exit=142 $s\\n";exit 0};alarm $t;waitpid($p,0);my $c=$?&127?128+($?&127):$?>>8;print "exit=$c $s\\n"' 120 @@ <url> "$d"`
const REPLAY_RUN = `run them together first, against your instance, no browser, giving this command a 300-second timeout in your shell tool: \`${REPLAY_BATCH}\` — one line "exit=<code> <script>" each, the output in $d/<name>.log. Read each script before (grep is enough): one that breaks the replay rules — a whole suite, the suite script, a pre-push or CI command inside, or exit=142 (stopped at 120 s) — is a defect of the script, not of its criterion: rewrite it within the rules, say so, and judge that criterion live.`
// A replay path an agent returned: kept only when it is a plain file name under REPLAY_DIR.
const replayOf = p => { const s = String(p || '').trim(); return s.startsWith(`${REPLAY_DIR}/`) && /^[A-Za-z0-9._-]+$/.test(s.slice(REPLAY_DIR.length + 1)) && !s.includes('..') ? s : '' }
const PREPARE = setupCommand
  ? `run \`${setupCommand}\` from ${SUBDIR ? `its ${SUBDIR} folder` : 'its root'}.`
  : `install its dependencies the project's usual way and copy its local config (e.g. .env) from ${inSub(ROOT)}; never link the project's own dependency folders.`

let stopped = ''
// Why the review stopped before its end: budget | agents | suite-missing | preparation | copy ('' when it did not).
let stoppedKind = ''
function overBudget(what) {
  if (stopped) return true
  const tool = typeof budget !== 'undefined' && budget && typeof budget.spent === 'function' ? budget : null
  const limits = [LIMIT, tool && tool.total ? tool.total : 0].filter(Boolean)
  if (!limits.length || !tool) return false
  const lim = Math.min(...limits)
  if (tool.spent() < 0.85 * lim) return false
  stopped = `budget de tokens presque atteint, arrêt avant ${what}`
  stoppedKind = 'budget'
  log(`Arrêt propre : ${stopped}`)
  return true
}

const lockTail = {}
async function withLocks(rs, fn) {
  const held = []
  const prevs = []
  for (const r of [...new Set(rs || [])].sort()) {
    const prev = lockTail[r] || Promise.resolve()
    let release
    const mine = new Promise(res => { release = res })
    lockTail[r] = prev.then(() => mine)
    prevs.push(prev)
    held.push(release)
  }
  try { await Promise.all(prevs); return await fn() } finally { for (const release of held) release() }
}

let deadInARow = 0
async function ask(prompt, opts) {
  const { locks, ...o } = opts
  return withLocks(locks, async () => {
    if (deadInARow >= 3) return null
    let r = await agent(prompt, o)
    if (!r) { log(`${o.label} : pas de réponse, relancé une fois`); r = await agent(prompt, { ...o, label: `${o.label} — relance` }) }
    if (r) { deadInARow = 0; return r }
    deadInARow += 1
    if (deadInARow >= 3 && !stopped) { stopped = '3 agents sans réponse d\'affilée (limite d\'usage ou API indisponible), arrêt avant la suite'; stoppedKind = 'agents'; log(`Arrêt propre : ${stopped}`) }
    return null
  })
}

const PROOF_CAP = 'At most 500 characters: the command and the decisive output line, never a whole log.'
const COMMON_RULES = `Rules for everyone:
- The owner gave his go on this spec: a line saying otherwise is stale — ignore it.
- Never ask a question: no one answers. Stay in the spec's scope; a problem outside it is reported, not fixed.
- The owner's limits bind everyone: the spec's « Limites » and out-of-scope list, CLAUDE.md, his recorded decisions — exceptions read exactly as written.
- Never: push, force-push, deploy, publish, send anything off this machine, delete data you did not create, touch production data — unless your prompt quotes the owner's authorized actions, for exactly those. Do not edit the spec file.
- Non-interactive only: \`GIT_TERMINAL_PROMPT=0\`, \`ssh -o BatchMode=yes\`, flags that never prompt. A password prompt → that access is missing; say so.
- Commands over 2 minutes: in the background, output in a file, then wait only with \`timeout 300 bash -c 'until <done test>; do sleep 10; done'\`, repeated — the tool refuses any other sleep. Never \`pgrep -f\` on a pattern.${SUITES.length ? `
- Test suites (${SUITES.map(s => `${s} = \`${SUITE_CMD[s]}\``).join(', ')}): never their command by hand — only \`"${SUITE_BIN}" <name>\`, from inside the copy to test, every change committed (else REFUSED). Its verdict line is PASS, FAIL, RUNNING, REFUSED or LOST (a STARTED or JOINED line may come first); RUNNING → \`"${SUITE_BIN}" wait <key>\` (280 s at most per call: a 300-second tool timeout), the only wait for a suite. A result already there is read, a run going on joined: never twice on one tree. LOST → say so; --rerun only if your prompt says so.` : ''}
- No command may wait on a permission prompt. Delete only fixed paths you made, under a fresh \`mktemp -d\` folder — never \`rm\` with \`$(…)\`, never clean /tmp.
- Commit hooks: never read or change their configuration (core.hooksPath, .githooks, .git/hooks).
- Shared resources (database, containers): never the main project's — your own throwaway instance on your ports, stopped before you return.${RESOURCES.length ? `
- Exclusive resources: ${RESOURCES.map(r => `« ${r} »`).join(', ')}. Use one only if your prompt says you hold it.` : ''}
- Answer short: findings and proofs, no narration.`

// Chrome DevTools, shared by every live tester at once (up to six): each works in its own isolated context,
// on its own pages, always by pageId — never select_page, never another tester's page. One performance
// trace at a time in a browser: a refused one is tried again, never a reason to wait in series.
const BROWSER_RULE = name => `Browser: use the Chrome DevTools tools (load them with ToolSearch, query "chrome-devtools", if they are deferred). Other testers use the same browser at the same time: open your pages only with new_page and isolatedContext "${name}", pass that pageId on every call, never call select_page, never touch a page you did not open, close yours before you return. One evaluate_script per check — what a script can do, then every value read at once; the click and drag tools only where a real pointer matters; never one click or one snapshot per call. Prefer take_snapshot to take_screenshot (a screenshot only for what must be seen: layout, colours, images); read list_console_messages and list_network_requests for errors on every journey; a performance trace when speed is part of a criterion or of a lead — refused because another trace is running → do your other checks and try again 60 s later, twice; still refused → say so in the proof. No Chrome DevTools tools at all → say so in your proofs, and test without the browser what can be.`

// ---------------------------------------------------------------- schemas
const FINDING = {
  type: 'object',
  properties: {
    criterion: { type: 'string', enum: [...ids, GENERAL], description: `the criterion it breaks; "${GENERAL}" when no single criterion carries it` },
    kind: { type: 'string', enum: ['defect', 'lead'], description: 'defect: proven by a reproduction or a measurement; lead: a suspicion you could not prove' },
    severity: { type: 'string', enum: ['blocking', 'major', 'minor'], description: 'blocking: a criterion does not hold, data loss, a security hole; major: real harm in normal use; minor: polish, style, a rare edge case' },
    title: { type: 'string', description: 'one line, in French' },
    proof: { type: 'string', description: 'defect: the exact reproduction (command and output, or steps and observed behaviour). lead: what makes you suspect it, written as a scenario a live tester can try. minor: the place, one line, no reproduction. ' + PROOF_CAP },
    cause: { type: 'string', enum: ['code', 'environment'] },
    where: { type: 'string', description: 'defect: the file and function it sits in, when you found it — one line; the same mistake in several places: every place you saw' },
    replay: { type: 'string', description: 'blocking or major defect: the path of its replay script (exit 0 once the defect is gone); empty when none can be written, for a minor finding and for a lead' },
  },
  required: ['criterion', 'kind', 'severity', 'title', 'proof'],
}
const OUTSIDE = {
  type: 'array',
  description: 'problems that existed before this spec, in parts it does not cover, worth the owner\'s attention (security first)',
  items: { type: 'object', properties: { issue: { type: 'string' }, proof: { type: 'string', description: PROOF_CAP }, severity: { type: 'string', enum: ['low', 'medium', 'high'] } }, required: ['issue', 'proof', 'severity'] },
}
const REVIEW_SCHEMA = { type: 'object', properties: { findings: { type: 'array', items: FINDING }, outsideSpec: OUTSIDE }, required: ['findings', 'outsideSpec'] }
const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'defect', 'unverifiable'] },
    proof: { type: 'string', description: 'the journey you ran and what you observed; for a defect, the reproduction. ' + PROOF_CAP },
  },
  required: ['verdict', 'proof'],
}
// The panel's live testers also give each criterion's replay script (the publication tester does not).
const VERDICT_LIVE = {
  type: 'object',
  properties: { ...VERDICT.properties, replay: { type: 'string', description: 'pass or defect: the path of the replay script of this criterion; empty only when eyes or a real pointer alone can judge it (the proof says why), or when it is unverifiable' } },
  required: ['verdict', 'proof', 'replay'],
}
const testerSchema = (cids, live) => ({
  type: 'object',
  properties: {
    verdicts: { type: 'object', properties: Object.fromEntries(cids.map(id => [id, live ? VERDICT_LIVE : VERDICT])), required: cids, additionalProperties: false },
    findings: { type: 'array', items: FINDING, description: 'what you met beyond your criteria\' verdicts: console errors, broken flows, slowness, leads you tried' },
    outsideSpec: OUTSIDE,
  },
  required: ['verdicts', 'findings', 'outsideSpec'],
})
const MERGED_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      description: 'one entry per distinct problem, duplicates merged',
      items: {
        type: 'object',
        properties: {
          ...FINDING.properties,
          from: { type: 'array', items: { type: 'string' }, description: 'the keys of every reviewer or tester that reported it' },
        },
        required: ['criterion', 'kind', 'severity', 'title', 'proof', 'from'],
      },
    },
  },
  required: ['items'],
}
const LEADS_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: { n: { type: 'integer' }, outcome: { type: 'string', enum: ['proven', 'dismissed', 'unverifiable'] }, proof: { type: 'string', description: PROOF_CAP }, replay: { type: 'string', description: 'proven: the path of its replay script; otherwise empty' } },
        required: ['n', 'outcome', 'proof'],
      },
    },
  },
  required: ['results'],
}
const REJUDGE_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          fixed: { type: 'boolean' },
          unverifiable: { type: 'boolean', description: 'true only when you could not run the check at all: a device or a credential is missing (proof names it)' },
          proof: { type: 'string', description: 'what you ran again and what you saw. ' + PROOF_CAP },
        },
        required: ['n', 'fixed', 'proof'],
      },
    },
    newDefects: { type: 'array', items: FINDING, description: 'only what the repair itself broke, proven' },
  },
  required: ['results', 'newDefects'],
}
const REPAIR_SCHEMA = {
  type: 'object',
  properties: {
    changed: { type: 'boolean' },
    files: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string', description: 'what changed, two or three sentences' },
    perDefect: { type: 'array', items: { type: 'object', properties: { n: { type: 'integer' }, done: { type: 'boolean' }, note: { type: 'string' } }, required: ['n', 'done', 'note'] } },
    decisions: { type: 'array', items: { type: 'string' }, description: 'choices the spec did not settle that change what the owner sees, one short French sentence each; usually empty' },
    blocker: { type: 'string', description: 'empty unless the spec must change or the owner must decide; a technical cause outside your changes starts with "TECHNIQUE:"' },
  },
  required: ['changed', 'files', 'summary', 'perDefect', 'decisions', 'blocker'],
}
// Preparation: the suite script there, reset, every command recorded (each name checked off), the launch
// recipe; the review copy when none was given.
const prepSchema = (names, copy) => ({
  type: 'object',
  properties: {
    suiteReady: { type: 'boolean', description: 'the suite script is there and executable' },
    recorded: { type: 'object', properties: Object.fromEntries(names.map(n => [n, { type: 'boolean', description: `true once the suite script printed « ${n === 'reset' ? 'reset' : `recorded ${n}`} »` }])), required: names, additionalProperties: false },
    launch: { type: 'string', enum: ['data', 'checkout', 'none', 'failed'], description: 'data: the recipe gives each data folder its own files; checkout: its own checkout too; none: nothing to launch; failed: no working recipe' },
    launchNote: { type: 'string', description: 'one line: how the recipe isolates each instance, or why it failed' },
    reason: { type: 'string', description: 'the suite script or a recording failed, or the copy could not be made: what, in a few French words; otherwise empty — never for the recipe' },
    ...(copy ? { workspace: { type: 'string' }, branch: { type: 'string' } } : {}),
  },
  required: ['suiteReady', 'recorded', 'launch', 'launchNote', 'reason', ...(copy ? ['workspace', 'branch'] : [])],
})
const SUITE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail', 'refused', 'lost'], description: 'what the suite script answered last' },
    key: { type: 'string', description: 'the key the suite script printed' },
    failures: { type: 'array', items: { type: 'object', properties: { criterion: { type: 'string', enum: [...ids, GENERAL] }, test: { type: 'string', description: 'the failing test, as the runner names it' }, proof: { type: 'string', description: 'its decisive line. ' + PROOF_CAP } }, required: ['criterion', 'test', 'proof'] }, description: 'fail: each failing test and the criterion it covers' },
    note: { type: 'string', description: 'refused or lost: the reason the script gave and what you did about it; a --rerun: what changed outside the tree; otherwise empty' },
    unblock: { type: 'string', description: 'refused or lost: the one action, in plain French, that would let the suite run (untracked source files to commit or remove, a machine to restart); otherwise empty' },
  },
  required: ['verdict', 'key', 'failures', 'note', 'unblock'],
}
// The replays of the slices no tester re-judges after a repair, by one helper: their scripts, and whether the
// repair reaches them. A slice not « clear » gets its tester at once.
const replaysSchema = ns => ({
  type: 'object',
  properties: {
    slices: {
      type: 'object',
      properties: Object.fromEntries(ns.map(n => [String(n), { type: 'object', properties: { clear: { type: 'boolean', description: 'true only when every script of the slice passed and the repair reaches none of its criteria' }, failing: { type: 'array', items: { type: 'string', enum: ids }, description: 'criteria whose script failed while the script itself keeps the rules' }, why: { type: 'string', description: 'not clear: the script that failed (and whether the script itself is wrong), or the changed file and the criterion it reaches — one line' } }, required: ['clear', 'failing', 'why'] }])),
      required: ns.map(String),
      additionalProperties: false,
    },
  },
  required: ['slices'],
})
const MACHINE = {
  cause: { type: 'string' }, job: { type: 'string' }, runner: { type: 'string' }, unblock: { type: 'string', description: 'the one action that would unblock it, in plain French' },
}
const CI_KICK_SCHEMA = { type: 'object', properties: { started: { type: 'boolean' }, ref: { type: 'string' }, mr: { type: 'string' }, note: { type: 'string' } }, required: ['started', 'ref', 'mr', 'note'] }
const CI_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['passed', 'code', 'unavailable', 'running'] },
    pipeline: { type: 'string' },
    check: { type: 'string', description: 'status "running": one non-interactive read-only command printing the pipeline state' },
    defects: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, proof: { type: 'string', description: PROOF_CAP } }, required: ['id', 'proof'] } },
    ...MACHINE,
  },
  required: ['status', 'pipeline', 'check', 'defects', 'cause', 'job', 'runner', 'unblock'],
}
const PUB_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'failed', 'unavailable', 'blocked', 'waiting'] },
    steps: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, outcome: { type: 'string' } }, required: ['action', 'outcome'] } },
    reason: { type: 'string' },
    wait: { type: 'object', properties: { what: { type: 'string' }, where: { type: 'string' }, check: { type: 'string' } }, required: ['what', 'where', 'check'] },
    ...MACHINE,
  },
  required: ['status', 'steps', 'reason', 'cause', 'job', 'runner', 'unblock'],
}

// ================================================================= 0. preparation: the suite script, the copy, the launch recipe
// The first agent, before anyone runs a suite: the suite script must be there (missing → the review stops at
// once, the skill installs it). It is reset first — a subdir or a setup recorded for an earlier spec stayed in
// force, and the suite ran in …/api — then the commands are recorded once, each through a quoted heredoc so
// that no shell re-reads a command; a recording not seen is a stop, never a suite run on another command.
// The same agent makes the review copy when none is given, and the launch recipe every tester then shares.
const heredoc = (name, cmd) => { let tag = 'SPEC_FIRST_CMD'; while (cmd.includes(tag)) tag += '_X'; return `"${SUITE_BIN}" set ${shName(name)} <<'${tag}'\n${cmd}\n${tag}` }
const RECORD = [...Object.entries(SUITE_CMD), ...(setupCommand ? [['setup', setupCommand]] : []), ...(SUBDIR ? [['subdir', SUBDIR]] : [])]
const RECORD_NAMES = ['reset', ...RECORD.map(([n]) => n)]
let W = WS_IN
let BR = BR_IN
const halt = (kind, why) => { stopped = why; stoppedKind = kind; log(`Arrêt : ${why}`) }
const COPY_AT = W || '<the copy you made>'
phase('Préparation')
const prep = await ask(`You prepare this review: its suite script first${W ? '' : ', then its copy'}, then the launch recipe the live testers share. Commit nothing.
1. \`test -x "${SUITE_BIN}" && echo ready\` — no « ready » → stop here: suiteReady false, the missing path in reason. Never write, copy or fix that script yourself: the skill installs it.
2. \`"${SUITE_BIN}" reset\` — it prints « reset »: nothing an earlier spec recorded stays in force.${RECORD.length ? ` Then record the test commands of this review — each block below exactly as written, one call each (a quoted heredoc: never retype a command); each prints « recorded <name> »:
${RECORD.map(([n, c]) => '\`\`\`\n' + heredoc(n, c) + '\n\`\`\`').join('\n')}` : ''}
In "recorded", true for each line you saw printed. One missing → its output in reason, and stop there.${W ? '' : `
3. Make the review copy: the review and its repairs never touch the owner's branch. Check that ${ROOT} is the top of a git repository, then run:
\`${ENSURE_HIDDEN} && mkdir -p ${COPIES} && d=$(mktemp -d ${COPIES}/${SPEC_ID}--revue-XXXXXX) && git worktree add -b "spec-first-$(basename "$d")" "$d/wt" HEAD && cd "$d/wt" && ${SUBMODULES} && pwd\`
then prepare it: ${PREPARE}
Return its path as workspace and its branch (\`git -C <path> branch --show-current\`); cannot → workspace empty and the reason in a few French words.`}
${W ? 3 : 4}. The launch recipe ${HARNESS}/launch.sh <port> <data folder>: up to six agents run it at the same time on the one copy ${COPY_AT}, each with its own port and its own data folder.
- it exists → run it once (port ${portsFor(0).split('-')[0]}, data folder ${DATA('preparation')}), then stop what it started; it works → keep it as it is.
- absent or broken → write it: it starts the result from ${inSub(COPY_AT)} on <port> in the background, writes its pid to <data folder>/pid, keeps every file the result writes while it runs (database, uploads, caches, logs) under <data folder> — through the project's own settings: environment variables, flags, a config file written there —, seeds what the criteria need, and prints the URL. Run it once to check, then stop it.
- the result cannot keep its data outside the project folder (paths fixed in its code) → the recipe gives each data folder its own checkout at the copy's commit — \`git -C ${COPY_AT} worktree add --detach <data folder>/wt HEAD\` when absent, else \`git -C <data folder>/wt checkout --detach\` to the copy's HEAD —, prepared once (${PREPARE.replace(/\.$/, '')}), and starts from there: launch "checkout".
- the recipe never installs anything in the copy: the copy is prepared once, here.
- the result is not a server or an app (a library, a CLI) → no recipe: launch "none". No working recipe after one honest try → launch "failed", why in launchNote: the review goes on without it.
${portRule(0)}

${COMMON_RULES}`, { ...HELPER, schema: prepSchema(RECORD_NAMES, !W), phase: 'Préparation', label: `Préparation — script de suite${W ? '' : ', copie de revue'} et recette de lancement (${HELPER.model} ${HELPER.effort})` })
if (!prep) halt('preparation', "l'agent de préparation n'a pas répondu, deux fois : relancer la revue avec resumeFromRunId et les mêmes args")
else if (!prep.suiteReady) halt('suite-missing', `script de suite absent : ${SUITE_BIN} manque ou n'est pas exécutable${prep.reason ? ` (${prep.reason})` : ''} — l'installer (copie de scripts/suite du plugin, chmod +x), puis lancer une nouvelle revue avec les mêmes args, sans resumeFromRunId`)
else {
  const ws = String(prep.workspace || '').replace(/\/+$/, '')
  const copied = !W && ws.includes(`/${COPIES}/`) && !!prep.branch
  if (copied) { W = ws; BR = String(prep.branch) }
  const missing = RECORD_NAMES.filter(n => !(prep.recorded && prep.recorded[n] === true))
  const why = String(prep.reason || '').trim()
  if (!W) halt('copy', `copie de revue impossible : ${why || 'aucun chemin rendu'} — committer le travail dans ${ROOT}, ou passer workspace et branch du rapport du run`)
  else if (missing.length || why) halt('preparation', `préparation incomplète : ${[missing.length ? `non enregistré dans le script de suite : ${missing.join(', ')}` : '', why].filter(Boolean).join(' — ')} — à corriger, puis lancer une nouvelle revue avec les mêmes args, sans resumeFromRunId`)
  LAUNCH_MODE = ['data', 'checkout', 'none', 'failed'].includes(prep.launch) ? prep.launch : 'failed'
  LAUNCH_NOTE = String(prep.launchNote || '').trim().slice(0, 300)
  if (LAUNCH_MODE === 'failed') log(`Recette de lancement : aucune (${LAUNCH_NOTE || 'cause inconnue'}) — chaque testeur lance le résultat à sa façon, dans son propre dossier de données`)
}
const changes = `The whole spec's changes: \`git -C ${W} log --oneline ${BASE}..HEAD\` (every commit) and \`git -C ${W} diff ${BASE}\` (the spec file is not part of the change). Read the files around them as needed.`
if (!stopped) log(`${FOCUS.length ? 'Revue ciblée' : 'Revue'} de ${SPEC_ID} : ${FOCUS.length ? `${FOCUS.length} constat(s) à rejuger` : `${REVIEWER_KEYS.length} relecteurs et ${N_TESTERS} ${plural(N_TESTERS, 'testeur', 'testeurs')} en conditions réelles (tranches ${SLICES.map(cs => cs.map(c => c.id).join(',')).join(' · ')})${SUITE_NAME ? `, la ${SUITE_LABEL} par le script de suite` : ''}`}, ${REVIEWER.model} ${REVIEWER.effort} — ${CRITERIA.length} critère(s)`)

// ---------------------------------------------------------------- remote CI, started at once
const ci = { started: false, ref: '', mr: '', block: null, pending: null, runs: [] }
const authorized = () => `With his go on this spec, the owner authorized these external actions, and only these:
<authorized_actions>
${PUBLISH.actions}
</authorized_actions>`
// Never a push of a commit the remote already has: each push runs the pre-push hook, i.e. the local gate
// (QualiSpectra, 26/11: the same gate three times at publication, 40 + 38 + 18 min).
const NO_REPUSH = 'Before any push, `git ls-remote` the remote branch: it already points at the commit → no push.'
async function ciKick() {
  if (!PUBLISH || overBudget('le lancement de la CI')) return
  const res = await ask(`You start the remote CI now, while the review runs. ${authorized()}
Only the part that starts the CI, if those actions include it: push branch ${BR} (copy ${W}) to the remote branch the actions name (${ci.ref ? `already pushed as ${ci.ref}` : 'none named → the same name'}), and open the merge request they describe as a draft${ci.mr ? ` — it exists, ${ci.mr}` : ''} (already open → keep it). ${NO_REPUSH} glab, gh or the API, non-interactively. Never force-push, merge, tag or publish. Do not wait for the pipeline. The actions include no push → do nothing: started false.
This prompt is the exception to the « never push » rule, for that only.

${COMMON_RULES}`, { ...HELPER, schema: CI_KICK_SCHEMA, phase: 'Revue', label: `CI : envoi de la branche (${HELPER.model} ${HELPER.effort})` })
  if (res && res.started) { ci.started = true; ci.ref = String(res.ref || ci.ref); ci.mr = String(res.mr || ci.mr); log(`CI lancée${ci.mr ? ` : ${ci.mr}` : ''}`) }
}
const ciReason = b => `CI indisponible : ${b.cause || 'cause inconnue'}${b.job ? ` — job ${b.job}` : ''}${b.runner ? `, runner ${b.runner}` : ''}. Pour débloquer : ${b.unblock || 'à préciser'}.`
// Reads the pipeline of the branch's latest commit once; never waits. settle: the read right before publishing.
async function ciRead(name, settle) {
  const wr = WAIT_AT[name] || 0
  const res = await ask(`You read the remote CI of this review, once (this read: ${name}): never wait, never sleep. ${authorized()}
Branch ${BR} (copy ${W}) was pushed as ${ci.ref}${ci.mr ? `, merge request ${ci.mr}` : ''}.${wr ? ` The review stopped to let this pipeline run; this read comes on resume ${wr}.` : ''}
1. Its latest commit is not on the remote (\`git ls-remote\`) → push it again (same branch, never force); already there → no push.
2. Read that commit's pipeline once. Pending, running or not started → "running", with check = one read-only command printing its state.
3. A job failed for a machine reason (disk full, no runner, timeout, network) → retry it once, "running"; already retried → "unavailable" with cause, job, runner, unblock.
4. A job fails because of the code → "code": each failure, the criterion it hurts (ids: ${ids.join(', ')}) and the proof.
5. All green → "passed".
Never merge, tag or publish. This prompt is the exception to the « never push » rule, for that push only.

${COMMON_RULES}`, { ...HELPER, schema: CI_SCHEMA, phase: settle ? 'Publication' : 'Réparation', label: `CI : lecture, ${name}${wr ? ` — reprise ${wr}` : ''} (${HELPER.model} ${HELPER.effort})` })
  ci.runs.push({ stage: name, status: res ? res.status : 'panne', pipeline: res ? res.pipeline : '' })
  if (!res || res.status === 'unavailable') {
    ci.block = res ? { cause: res.cause, job: res.job, runner: res.runner, unblock: res.unblock } : { cause: "l'agent qui lit la CI n'a pas répondu", job: '', runner: '', unblock: 'relancer la revue' }
    log(ciReason(ci.block))
    return []
  }
  ci.block = null
  if (res.status === 'running') { ci.pending = { pipeline: String(res.pipeline || ''), check: String(res.check || '') }; ci.pendingAt = name; return [] }
  ci.pending = null
  if (res.status !== 'code') return []
  const ds = (res.defects || []).map(d => ({ criterion: byId[String(d.id)] ? String(d.id) : GENERAL, kind: 'defect', severity: 'blocking', title: `CI en échec : ${String(d.proof).slice(0, 80)}`, proof: `[CI ${res.pipeline}] ${d.proof}`, from: ['ci'] }))
  return ds.length ? ds : [{ criterion: GENERAL, kind: 'defect', severity: 'blocking', title: 'CI en échec', proof: `pipeline en échec : ${res.pipeline}`, from: ['ci'] }]
}

// ================================================================= 1. the panel
const outsideSpec = []
const decisions = []
const testerKey = i => `tester-${i + 1}`
const testerOf = {}
SLICES.forEach((cs, i) => cs.forEach(c => { testerOf[c.id] = testerKey(i) }))
const sliceOf = k => SLICES.findIndex((cs, i) => testerKey(i) === k) // tester-<n> → its slice, -1 for any other key
// The suite agent: the one agent that waits for a suite. It starts with the panel and again after each
// repair, beside the replays — the ledger makes an unchanged tree free (QualiSpectra: the first live tester
// ran and awaited the suite inside an 83-min panel; studio: 39 suite launches for one spec).
const SHORT_CRITERIA = `<criteria>\n${CRITERIA.map(c => `<criterion id="${c.id}">${c.text.length > 160 ? `${c.text.slice(0, 160)}…` : c.text}</criterion>`).join('\n')}\n</criteria>`
function suitePrompt(when, retry) {
  return `You run the ${SUITE_EN} of a spec's review ${when} and bring back its verdict — nothing else: you judge no criterion, open no browser, edit and commit nothing.${retry ? `
This is try ${retry.n} after the suite was blocked by its environment (${retry.verdict}: ${retry.cause || 'no cause given'}); the owner was told what lifts it (${retry.unblock || 'nothing named'}). Run it again as below.` : ''}
The copy to test: ${W} (branch ${BR}).
1. \`${suiteAt(W, SUITE_NAME)}\` — the suite script reads the result from its ledger when this tree was tested already, joins the run going on, or starts it. A STARTED or JOINED line may come before its verdict line.
2. RUNNING (exit 2) → \`"${SUITE_BIN}" wait <key>\`, again and again until another verdict — each call returns within 280 s (give your shell tool a 300-second timeout). Never wait any other way, never poll its log yourself.
3. PASS (exit 0) → verdict "pass". FAIL (exit 1) → verdict "fail" and each failing test — the log path is printed: grep it for the failures, never read it whole — with the criterion below it covers, or "${GENERAL}".
4. REFUSED (exit 3) because of files left in the copy: the « ?? » ones a setup, a build, a run or the suite itself left there (a virtualenv, build output, reports, caches, a database file) → hide each, as the message says, with a line in the file \`git -C ${W} rev-parse --git-path info/exclude\` names — never commit, stash, clean, delete, or edit .gitignore — then step 1 again. A source file left untracked, or a tracked file modified → not yours to hide: verdict "refused", the files in note, in unblock the action that lifts it (« committer ou retirer … »).
5. LOST (exit 4) → read the end of its log, say in note what changed outside the tree (a process killed, a machine restarted), then once \`${suiteAt(W, SUITE_NAME)} --rerun\` and steps 2 and 3. Lost again → verdict "lost", in unblock the action that would let it finish.
${SHORT_CRITERIA}

${COMMON_RULES}`
}
const suiteRuns = [] // every verdict of the review's suite, in order: the last one counts
// A suite neither PASS nor FAIL once its agent applied the script's own remedies (files left by a build hidden
// through info/exclude, one --rerun of a lost run) is a technical block: the review stops there — nothing after
// it would be kept on a resume — and says what lifts it. A resume with suiteRetry + 1 replays everything before
// from cache and tries the suite again, as a new call right after the blocked one.
let suiteBlock = null
let suiteRetries = 0
const SUITE_TITLE = SUITE_LABEL[0].toUpperCase() + SUITE_LABEL.slice(1)
async function suiteCall(when, label, phaseName) {
  const o = { ...HELPER, schema: SUITE_SCHEMA, phase: phaseName, locks: RESOURCES }
  let r = await ask(suitePrompt(when), { ...o, label: `${label} (${HELPER.model} ${HELPER.effort})` })
  while (r && (r.verdict === 'refused' || r.verdict === 'lost') && suiteRetries < SUITE_RETRY) {
    suiteRetries += 1
    r = await ask(suitePrompt(when, { n: suiteRetries, verdict: r.verdict, cause: String(r.note || ''), unblock: String(r.unblock || '') }), { ...o, label: `${label} — reprise ${suiteRetries} (${HELPER.model} ${HELPER.effort})` })
  }
  return r
}
// Who never answered, even after the retry, by role: the review cannot pass without them, and a resume
// (resumeFromRunId, the same args) asks them again. A later answer of the same role clears it.
const quiet = new Map()
// Criteria a tester was to replay after a repair but never did: « non vérifié » until a later round replays them.
const unreplayed = new Map()
const pubNote = PUBLISH ? `
Criteria ${PUBLISH.ids.join(', ')} are publication criteria: their external part (pushed, merged, tagged, published) happens after this review, with the owner's authorization. Judge everything else they need; never a defect only because it is not published yet.` : ''

// The six prompts are the same text up to « YOUR ANGLE »: the angle comes last, so what the six share
// is one identical prefix.
function reviewerPrompt(key, extra) {
  return `You are one of six independent reviewers of a spec's result, each with one angle — yours is at the end of this prompt — plus live testers who run the result in a browser. You do not see the others; do not try to agree with anyone. Find real problems from your angle and prove them — do not approve, do not summarise the work.

${SPEC_LINE}
${list(CRITERIA)}
The result lives in ${W} (branch ${BR}). ${changes}${pubNote}
Tests: ${SUITE_NAME ? `never run a whole suite: an agent of its own runs the ${SUITE_EN} through the suite script. Its result, if you need it: \`${suiteAt(W, SUITE_NAME)}\` — read or joined, never a second run; RUNNING → go on without it.` : 'none given.'} You may run single tests, scripts and measurements of your own, from a fresh \`mktemp -d\` folder.
Never use the browser tools: the live testers own the browser. Something only the browser can show → a "lead" written as a scenario they can try.
Do not edit any tracked file under ${ROOT} or ${W}.
${REPLAY_RULE}

Findings:
- "defect" only with a proof: the exact reproduction or measurement. A suspicion → "lead".
- severity: "blocking" (a criterion does not hold, data loss, a security hole), "major" (real harm in normal use), "minor" (polish, rare edge case). Be honest: minor findings are reported, never repaired by this review.
- a blocking or major defect: save its reproduction as a replay script (exit 0 once the defect is gone), its path in "replay" — the re-judgement runs it instead of redoing your work.
- a minor finding: never a reproduction, a script or a measurement for it — its title and, as proof, the place (file and line, or the screen), one line. Not sure it is minor → check just enough to decide.
- the same mistake in several places is one finding: the mistake named in its title, every place you saw in "where" — the developer then fixes them all in one round.
- attach each to the criterion it breaks, or "${GENERAL}".
- problems that existed before the spec → "outsideSpec".
No problem found from your angle → empty findings: that is a valid answer.

${COMMON_RULES}

YOUR ANGLE — ${REVIEWERS[key].label}
${REVIEWERS[key].brief}
Your replay scripts are named ${key}-<n>.sh. ${portRule(10 + REVIEWER_KEYS.indexOf(key))}${LAUNCH_MODE === 'data' || LAUNCH_MODE === 'checkout' ? ` The result running, if you need it: \`${HARNESS}/launch.sh <port> ${DATA(key)}\` — never in the copy itself.` : ''}${extra ? `\n${extra}` : ''}`
}

function testerPrompt(i, cs, extra) {
  const key = testerKey(i)
  const heavy = cs.filter(c => HEAVY[c.id]).map(c => c.id)
  return `You are LIVE TESTER ${i + 1} of ${N_TESTERS}. Run the real result and use it as its users would, to check each criterion below on the real thing — never by reading code alone.

${SPEC_LINE}
Your criteria:
${list(cs)}
${CRITERIA.length > cs.length ? `The other criteria go to another tester; you may cross them on a journey — report what you see.\n` : ''}The result lives in ${W} (branch ${BR}). ${changes}${pubNote}
${extra || ''}
How:
1. Start your own instance of the result (its server, app or tool) on your own ports — never another tester's. ${launchRule(key)}
2. Plan a few user journeys that cover every criterion of yours as one realistic use, then run them; then the edge cases: bad input, empty and boundary values, reload, back button, offline or a slow network when it matters, the exact wording of each criterion.
3. ${BROWSER_RULE(`spec-first-${key}`)}
4. Not a web interface → exercise it the way its user does: the CLI, the API calls, the library imported in a fresh environment.
5. Tests: never run or wait for a whole suite${SUITE_NAME ? ` — an agent of its own runs the ${SUITE_EN} through the suite script, and its failures reach the repair without you` : ''}; single tests of your own are fine.${heavy.length ? ` ${plural(heavy.length, 'Criterion', 'Criteria')} ${heavy.join(', ')} ${plural(heavy.length, 'has', 'have')} a heavy suite of ${plural(heavy.length, 'its', 'their')} own: only if a verdict needs its result, \`cd "${W}" && "${SUITE_BIN}" heavy:<id>\` — read from the ledger when this tree was tested already, never its command by hand.` : ''}
6. ${REPLAY_RULE} One per criterion you pass or prove broken, named c<criterion id>.sh, its path in that verdict's "replay" — written from the checks you just made, not a new exploration; eyes or a real pointer alone can judge it (a layout, a colour, a drag) → "replay" empty, and the proof says why.

Verdict per criterion: "pass" = you exercised it live and it held (proof: the journey and what you saw); "defect" = you proved it fails (proof: the steps and the observed behaviour); "unverifiable" = a device or a credential is missing (proof names it).
findings: everything else you met, with severity — console errors, failing requests, broken flows, slowness; a suspicion → "lead". A blocking or major one → its replay script too, in "replay"; a minor one → its title and the place, one line, no reproduction; the same mistake in several places → one finding, every place in "where".
Do not edit any tracked file. Scratch files in a fresh \`mktemp -d\` folder.
${portRule(20 + i)}${locksFor(cs.map(c => c.id)).length ? `
You hold the exclusive resource(s) ${locksFor(cs.map(c => c.id)).map(r => `« ${r} »`).join(', ')} for this task.` : ''}

${COMMON_RULES}`
}

// findings: every distinct problem with its source; verdicts: the testers' per criterion.
let findings = []
const verdicts = {}
const scriptOf = id => replayOf(verdicts[id] && verdicts[id].replay) // the replay script a live tester left for a criterion
let silent = [] // every agent that never answered, even after the retry (from quiet, at settle): the review cannot pass without them
// A suite verdict → its failures as findings (a failing test is a blocking defect of the criterion it covers),
// and the run kept for the report.
function suiteOutcome(stage, r) {
  const run = r ? { stage, verdict: String(r.verdict || ''), key: String(r.key || ''), note: String(r.note || '') } : { stage, verdict: 'sans réponse', key: '', note: '' }
  suiteRuns.push(run)
  log(`${SUITE_LABEL} (${stage}) : ${run.verdict === 'pass' ? 'verte' : run.verdict === 'fail' ? `en échec, ${((r && r.failures) || []).length} test(s) nommé(s)` : `${run.verdict}${run.note ? ` — ${run.note}` : ''}`}`)
  if (!r) { quiet.set('suite', `${SUITE_LABEL} (${stage})`); return [] }
  quiet.delete('suite')
  if (r.verdict === 'refused' || r.verdict === 'lost') {
    suiteBlock = { stage, verdict: r.verdict, cause: run.note || (r.verdict === 'refused' ? 'copie refusée par le script de suite' : "suite perdue en cours d'exécution"), unblock: String(r.unblock || '').trim() || 'à préciser', suiteRetry: SUITE_RETRY + 1, resume: `relancer cette revue avec resumeFromRunId, les mêmes args et suiteRetry: ${SUITE_RETRY + 1}, une fois l'action faite` }
    log(`${SUITE_LABEL} bloquée (${stage}) : ${suiteBlock.cause} — pour débloquer : ${suiteBlock.unblock}`)
    return []
  }
  suiteBlock = null
  if (r.verdict !== 'fail') return []
  const tag = `[${SUITE_LABEL}${run.key ? ` ${run.key}` : ''}]`
  const ds = (r.failures || []).map(x => ({ criterion: byId[String(x.criterion)] ? String(x.criterion) : GENERAL, kind: 'defect', severity: 'blocking', title: `test en échec : ${String(x.test || '').slice(0, 80)}`, proof: `${tag} ${x.proof}`, from: 'suite' }))
  return ds.length ? ds : [{ criterion: GENERAL, kind: 'defect', severity: 'blocking', title: `${SUITE_LABEL} en échec`, proof: `${tag} ${run.note || 'voir son journal'}`, from: 'suite' }]
}

// Leads, after the panel: each live tester tries those of its slice, all testers at once (one tester trying
// them all was one more agent in series after the panel); a general lead goes to the tester with the fewest.
function leadsPrompt(i, fs) {
  const locks = fs.some(f => !byId[f.criterion]) ? RESOURCES : locksFor(fs.map(f => f.criterion))
  return `You are LIVE TESTER ${i + 1} of ${N_TESTERS}. Reviewers of this spec suspected the problems below — on the criteria of your slice, or on none in particular — without proving them. Try each one on the real result, live, and say: "proven" (with the reproduction), "dismissed" (with what you did and saw), or "unverifiable" (why). The other testers try theirs at the same time.

Spec: ${SPEC}. The result lives in ${W} (branch ${BR}). ${changes}
<leads>
${fs.map(f => `[${f.n}] (critère ${f.criterion}, ${f.severity}) ${f.title} — ${f.proof}`).join('\n')}
</leads>
Start your own instance of the result on your own ports — never another tester's. ${launchRule(`${testerKey(i)}-pistes`)}
${BROWSER_RULE(`spec-first-${testerKey(i)}-pistes`)}
${REPLAY_RULE} A lead you prove → its replay script, named lead-<n>.sh, in "replay".
Do not edit any tracked file. ${portRule(30 + i)}${locks.length ? `
You hold the exclusive resource(s) ${locks.map(x => `« ${x} »`).join(', ')} for this task.` : ''}

${COMMON_RULES}`
}

const ciP = ciKick().catch(e => log(`CI : envoi impossible (${errText(e)})`))
if (!stopped && !FOCUS.length) {
  phase('Revue')
  // Testers, reviewers and the suite agent all at once: nobody waits for the suite but the suite agent. The
  // suite comes last in call order: a resume keeps every finished call before the first unfinished one, and
  // the suite is the longest by design.
  const jobs = [
    ...SLICES.map((cs, i) => () => ask(testerPrompt(i, cs), { ...REVIEWER, schema: testerSchema(cs.map(c => c.id), true), phase: 'Revue', locks: locksFor(cs.map(c => c.id)), label: `Testeur ${i + 1} en conditions réelles (${REVIEWER.model} ${REVIEWER.effort})` })),
    ...REVIEWER_KEYS.map(k => () => ask(reviewerPrompt(k), { ...REVIEWER, schema: REVIEW_SCHEMA, phase: 'Revue', label: `Relecteur ${REVIEWERS[k].label} (${REVIEWER.model} ${REVIEWER.effort})` })),
    ...(SUITE_NAME ? [() => suiteCall('alongside its panel', SUITE_TITLE, 'Revue')] : []),
  ]
  const out = overBudget('la revue') ? [] : await parallel(jobs)
  await ciP
  const raw = []
  SLICES.forEach((cs, i) => {
    const r = out[i]
    if (out.length && !r) quiet.set(`panel:${testerKey(i)}`, labelOf(testerKey(i)))
    if (r) { for (const o of r.outsideSpec || []) outsideSpec.push(o) }
    for (const c of cs) {
      const v = r && r.verdicts ? r.verdicts[c.id] : null
      verdicts[c.id] = v || null
      if (v && v.verdict === 'defect') raw.push({ criterion: c.id, kind: 'defect', severity: 'blocking', title: `critère ${c.id} ne tient pas`, proof: v.proof, replay: v.replay, from: testerKey(i) })
    }
    for (const f of (r && r.findings) || []) raw.push({ ...f, from: testerKey(i) })
  })
  REVIEWER_KEYS.forEach((k, j) => {
    const r = out[N_TESTERS + j]
    if (!r) { if (out.length) { quiet.set(`panel:${k}`, REVIEWERS[k].label); log(`Relecteur ${REVIEWERS[k].label} : aucune réponse`) } return }
    for (const o of r.outsideSpec || []) outsideSpec.push(o)
    for (const f of r.findings || []) raw.push({ ...f, from: k })
  })
  if (SUITE_NAME && out.length) for (const d of suiteOutcome('revue', out[N_TESTERS + REVIEWER_KEYS.length])) raw.push(d)
  log(`Revue : ${raw.filter(f => f.kind === 'defect').length} défaut(s) prouvé(s), ${raw.filter(f => f.kind === 'lead').length} piste(s)${quiet.size ? ` — sans réponse : ${[...quiet.values()].join(', ')}` : ''}`)

  // ================================================================= 2. merge duplicates, try the leads
  // A blocked suite stops the review here: nothing after it would be kept by a resume.
  phase('Pistes')
  if (raw.length > 1 && !suiteBlock && !overBudget('la fusion des doublons')) {
    const m = await ask(`You merge the findings of a review panel: six reviewers, the live testers and the test suite reported independently, so the same problem may appear several times, in other words. Merge duplicates into one entry (keep the clearest proof and its "replay" path, the highest severity, every source key in "from", every place in "where"); a defect and a lead about the same problem → one defect. Never drop, invent, re-judge or soften a finding; never change "defect" into "lead" or the reverse except when merging. Read the files only if two findings look alike and you cannot tell otherwise.

<findings>
${raw.map(f => JSON.stringify(f)).join('\n')}
</findings>

Answer with the merged list only.`, { ...MERGER, schema: MERGED_SCHEMA, phase: 'Pistes', label: `Fusion des doublons (${MERGER.model} ${MERGER.effort})` })
    findings = m && Array.isArray(m.items) && m.items.length ? m.items.map(f => ({ ...f, from: (Array.isArray(f.from) ? f.from : [f.from]).map(String) })) : raw.map(f => ({ ...f, from: [f.from] }))
  } else findings = raw.map(f => ({ ...f, from: [f.from] }))
  // Sources as keys only: a name the merger rewrote is mapped back, an unknown one dropped; none left →
  // the criterion's tester, or the integration reviewer for a general finding.
  findings = findings.map((f, i) => {
    const criterion = byId[f.criterion] ? f.criterion : GENERAL
    const from = [...new Set(f.from.map(keyOf).map(k => k === 'tester' ? (byId[criterion] ? testerOf[criterion] : testerKey(0)) : k).filter(Boolean))]
    return { ...f, criterion, replay: replayOf(f.replay), from: from.length ? from : [byId[criterion] ? testerOf[criterion] : 'integration'], n: i + 1 }
  })

  // Each tester tries the leads of its slice, all at once. A lead whose tester never answered (or skipped it)
  // goes once to the next tester; still untried → it holds the pass and is reported, never dropped.
  const leads = findings.filter(f => f.kind === 'lead' && f.severity !== 'minor')
  const tryLeads = async (assign, again) => {
    const who = assign.map((fs, i) => i).filter(i => assign[i].length)
    const outs = await parallel(who.map(i => () => ask(leadsPrompt(i, assign[i]), { ...REVIEWER, schema: LEADS_SCHEMA, phase: 'Pistes', locks: assign[i].some(f => !byId[f.criterion]) ? RESOURCES : locksFor(assign[i].map(f => f.criterion)), label: `Pistes — testeur ${i + 1}${again ? ', reprise' : ''} (${REVIEWER.model} ${REVIEWER.effort})` })))
    const untried = []
    who.forEach((i, j) => {
      const r = outs[j]
      if (!r && again) quiet.set(`leads:${testerKey(i)}`, `${labelOf(testerKey(i))} (pistes)`)
      for (const f of assign[i]) {
        const x = r && (r.results || []).find(y => Number(y.n) === f.n)
        if (!x) { untried.push([i, f]); continue }
        if (x.outcome === 'proven') { f.kind = 'defect'; f.proof = `${f.proof}\n[prouvé par le testeur ${i + 1}] ${x.proof}`; if (!f.from.includes(testerKey(i))) f.from.push(testerKey(i)); f.replay = replayOf(x.replay) || f.replay }
        else f.dismissed = `${x.outcome === 'dismissed' ? 'écartée' : 'invérifiable'} : ${x.proof}`
      }
    })
    return untried
  }
  if (leads.length && !suiteBlock && !overBudget('les pistes')) {
    const byTester = SLICES.map(() => [])
    for (const f of leads) {
      const i = byId[f.criterion] ? sliceOf(testerOf[f.criterion]) : byTester.reduce((b, fs, j) => fs.length < byTester[b].length ? j : b, 0)
      byTester[i].push(f)
    }
    const left = await tryLeads(byTester, false)
    if (left.length && !overBudget('les pistes, reprise')) {
      const again = SLICES.map(() => [])
      for (const [i, f] of left) again[(i + 1) % N_TESTERS].push(f)
      for (const [, f] of await tryLeads(again, true)) f.untried = true
    } else for (const [, f] of left) f.untried = true
    log(`Pistes : ${leads.filter(f => f.kind === 'defect').length}/${leads.length} prouvée(s) en conditions réelles${leads.some(f => f.untried) ? `, ${leads.filter(f => f.untried).length} jamais essayée(s)` : ''}`)
  }
} else if (!stopped) {
  // A targeted re-review: the findings named, judged first by their reviewer and a live replay.
  // Each finding on a criterion is also replayed live by that criterion's tester.
  findings = FOCUS.map((f, i) => ({ criterion: f.id, kind: 'defect', severity: 'blocking', title: f.finding.slice(0, 100), proof: f.finding, from: [...new Set([f.reviewer === 'tester' ? testerOf[f.id] || testerKey(0) : f.reviewer, ...(byId[f.id] ? [testerOf[f.id]] : [])])], n: i + 1, focus: true }))
  for (const c of CRITERIA) verdicts[c.id] = { verdict: 'pass', proof: 'validé par la revue précédente' }
}

// ================================================================= 3. repair in one batch, targeted re-judgement
// Only proven blocking or major defects are repaired; minor ones are reported. One developer, all of
// them at once; then each reviewer re-judges only its own findings, and the testers replay theirs.
const toFix = () => findings.filter(f => f.kind === 'defect' && f.severity !== 'minor' && !f.fixed && !f.unverifiable)
let ciWait = false // a CI verdict the review needs is still running: the review stops cleanly, « waiting »
const effortAt = {}
let repairRounds = 0
let repairBlocker = ''
const touchedFiles = []

// Re-judges: each source of the open findings, given only its own findings. In a targeted
// re-review, round 0 is a re-judgement of the findings as they stand, before any repair.
// After a repair, only the slices it touches get their tester back, all at once: a slice holding an open
// finding at once; the other slices replay their scripts in one helper, which also says whether the repair
// reaches them — a script failing or a slice reached → its tester too. No tester replays another's slice
// any more (studio, 25–26/11: re-judgements of 66 and 125 min, the first tester replaying everything).
// The suite runs again beside them, through the ledger: the last round is not known in advance, and an
// unchanged tree costs nothing.
async function rejudge(open, round, summary, files) {
  const lastRound = round >= REPAIR_EFFORTS.length
  const changed = (files || []).map(String).filter(p => /^[A-Za-z0-9._/@+ -]+$/.test(p)).slice(0, 30)
  const changedText = `${changed.length ? changed.join(', ') : 'the files its summary names'} (\`git -C ${W} log --stat -3\`)`
  const bySource = new Map()
  for (const f of open) {
    // A finding on a criterion is always replayed live by that criterion's tester, too.
    const srcs = [...new Set([...f.from, ...(byId[f.criterion] ? [testerOf[f.criterion]] : [])])]
    for (const s of srcs) {
      // A tester re-judges its own finding; on a criterion, that criterion's tester. The CI and the suite
      // judge theirs by running again.
      const k = s === 'ci' || s === 'suite' ? s : s.startsWith('tester') ? (byId[f.criterion] ? testerOf[f.criterion] : sliceOf(s) >= 0 ? s : testerKey(0)) : REVIEWERS[s] ? s : (byId[f.criterion] ? testerOf[f.criterion] : testerKey(0))
      if (!bySource.has(k)) bySource.set(k, [])
      if (!bySource.get(k).includes(f)) bySource.get(k).push(f)
    }
  }
  const ciAgain = bySource.has('ci')
  bySource.delete('ci')
  bySource.delete('suite') // the suite runs again anyway, below
  // Slices with no open finding, after a repair: their scripts first. On the last round, a slice holding a
  // criterion without a script gets its tester at once — every such criterion replayed live, as before.
  const why = {}
  const others = round > 0 ? SLICES.map((cs, i) => i).filter(i => !bySource.has(testerKey(i))) : []
  const liveLast = lastRound ? others.filter(i => SLICES[i].some(c => !scriptOf(c.id))) : []
  const toReplay = others.filter(i => !liveLast.includes(i))
  for (const i of liveLast) { bySource.set(testerKey(i), []); why[testerKey(i)] = 'this is the last repair round, and your slice holds criteria without a replay script' }
  const roster = [...bySource.keys(), 'replays', ...toReplay.map(testerKey)] // one port slot each
  const slot = k => 40 + 10 * round + Math.max(0, roster.indexOf(k))
  const stillOpen = id => open.some(f => f.criterion === id)
  const short = c => c.text.length > 160 ? `${c.text.slice(0, 160)}…` : c.text

  // After a repair, a tester also replays the criteria of its own slice that hold no open finding.
  const replayList = k => { const i = sliceOf(k); return k.startsWith('tester') && round > 0 && i >= 0 ? SLICES[i].filter(c => !stillOpen(c.id)) : [] }
  const judge = (k, fs) => {
    const isTester = k.startsWith('tester')
    const i = sliceOf(k)
    const replay = replayList(k)
    const locks = isTester ? locksFor(fs.map(f => f.criterion).concat(replay.map(c => c.id))) : []
    const prompt = `${isTester ? `You are a LIVE TESTER of this spec${i >= 0 ? `, slice ${i + 1} of ${N_TESTERS}` : ''}.` : REVIEWERS[k].brief}

${round > 0 ? `A developer just repaired defects of this spec: ${sentence(summary)}` : 'A development run reworked the criteria below since these findings were reported.'} ${fs.length ? `You reported the findings below earlier. For each one, check whether it is fixed — run your reproduction again, exactly, on the real result — and nothing else. A finding with a replay script: run it first (\`<script> <url>\`); it fails → not fixed, look no further; it passes → check once${isTester ? ', live,' : ''} what the script cannot see, then "fixed".
<your_findings>
${fs.map(f => `[${f.n}] (critère ${f.criterion}) ${f.title} — ${f.proof}${f.replay ? `\n  replay: ${f.replay}` : ''}${isTester && scriptOf(f.criterion) && scriptOf(f.criterion) !== f.replay ? `\n  replay script of criterion ${f.criterion}, to run too: ${scriptOf(f.criterion)}` : ''}${f.devNote ? `\n  The developer disputes it: ${f.devNote} — read that in the spec yourself; if the spec settles it, the finding is fixed.` : ''}`).join('\n')}
</your_findings>
A check you cannot run at all (a device or a credential missing) → "unverifiable": true, never "fixed".` : `No finding of yours is open: you are called because ${why[k] || 'the repair may reach your slice'}. "results" stays empty.`}
${replay.length ? `Check that these criteria of your slice still hold after the repair, and report a regression in newDefects:
<replay>
${replay.map(c => `<criterion id="${c.id}"${scriptOf(c.id) ? ` script="${scriptOf(c.id)}"` : ''}>${c.text}</criterion>`).join('\n')}
</replay>
- with a script: ${REPLAY_RUN} One fails → look live: a real regression → newDefects.
- without a script: ${lastRound ? 'replay its main path live — this is the last round, every one of them.' : `replay its main path live only if the repair can reach it — it changed ${changedText}; in doubt, replay.`}
` : ''}Spec: ${SPEC}. The result lives in ${W} (branch ${BR}). ${changes}
${isTester ? `Start your own instance of the result on your own ports — never another tester's. ${launchRule(`${k}-r${round}`)}
${BROWSER_RULE(`spec-first-${k}-r${round}`)}` : 'Never use the browser tools.'}
newDefects: only what the repair itself broke, proven. Never run or wait for a whole suite: it runs again beside you, through the suite script. Do not edit any tracked file. ${portRule(slot(k))}${locks.length ? `
You hold the exclusive resource(s) ${locks.map(x => `« ${x} »`).join(', ')} for this task.` : ''}

${COMMON_RULES}`
    return ask(prompt, { ...REVIEWER, schema: REJUDGE_SCHEMA, phase: 'Réparation', locks, label: `${round > 0 ? `Après réparation ${round}` : 'Rejugement'} — ${labelOf(k)} (${REVIEWER.model} ${REVIEWER.effort})` })
  }

  // parallel() hands back copies, never the jobs' own objects: the votes go on the findings themselves,
  // taken from bySource by position — a vote recorded on a copy is lost (QualiSpectra, 1.9.3).
  // Call order: the re-judges, the replays of the other slices, the testers they call back, the suite last — a
  // resume keeps every finished call before the first unfinished one, and the suite is the longest by design.
  // A focus review runs the suite too (round 0): the relaunch run's commits are tested, free when the tree did
  // not change.
  const runSuite = !!SUITE_NAME
  const first = [...bySource]
  const firstP = parallel(first.map(([k, fs]) => () => judge(k, fs)))
  const second = []
  if (toReplay.length) {
    const scripts = toReplay.flatMap(i => SLICES[i].filter(c => scriptOf(c.id))).length
    const rep = await ask(`You check, after repair ${round} of a spec's review, the slices no tester is re-judging: run their replay scripts, and say for each slice whether the repair can reach it. You judge nothing live, open no browser, edit no tracked file: a tester comes only to a slice you do not find clear.
A developer just repaired defects of this spec: ${sentence(summary)} It changed ${changedText}.
The result lives in ${W} (branch ${BR}).
<slices>
${toReplay.map(i => `<slice n="${i + 1}">\n${SLICES[i].map(c => `<criterion id="${c.id}"${scriptOf(c.id) ? ` script="${scriptOf(c.id)}"` : ''}>${short(c)}</criterion>`).join('\n')}\n</slice>`).join('\n')}
</slices>
${scripts ? `1. Start one instance of the result on your own ports. ${launchRule(`replays-r${round}`)}
2. ${REPLAY_RULE}
Read each script listed (grep is enough); one that breaks those rules is not run. Run the others together, giving this command a 300-second timeout in your shell tool: \`${REPLAY_BATCH}\` — one line "exit=<code> <script>" each, the output in $d/<name>.log; exit=142: stopped at 120 s, its whole process group killed. A script that fails, breaks the rules or was stopped → its slice is not clear; in "failing" only the criteria whose script keeps the rules and fails — a script wrong in itself is named in "why", for the slice's tester to rewrite.
3.` : '1. No script to run: no instance needed.\n2.'} For each slice: can the repair reach one of its criteria — a changed file on its path (read the diff, grep where the changed code is used)? Yes, or in doubt → not clear, "why" names the file and the criterion. A slice is clear only when every script of it passed and the repair reaches none of its criteria.
${portRule(slot('replays'))}

${COMMON_RULES}`, { ...HELPER, schema: replaysSchema(toReplay.map(i => i + 1)), phase: 'Réparation', locks: locksFor(toReplay.flatMap(i => SLICES[i].map(c => c.id))), label: `Après réparation ${round} — rejeux des tranches ${toReplay.map(i => i + 1).join(', ')} (${HELPER.model} ${HELPER.effort})` })
    for (const i of toReplay) {
      const s = rep && rep.slices ? rep.slices[String(i + 1)] : null
      const failing = s && Array.isArray(s.failing) ? s.failing.map(String).filter(id => byId[id]) : []
      // Clear: every script of the slice passed — a criterion left unreplayed by a silent tester is replayed now.
      if (s && s.clear && !failing.length) { for (const c of SLICES[i]) if (scriptOf(c.id)) unreplayed.delete(c.id); continue }
      const k = testerKey(i)
      why[k] = !s ? 'nobody could replay your slice after the repair' : `the replay of your slice after the repair was not clear: ${[failing.length ? `the script of ${failing.join(', ')} failed — look at ${plural(failing.length, 'it', 'them')} live first` : '', String(s.why || '')].filter(Boolean).join(' — ') || 'no reason given'}`
      second.push([k, []])
    }
    log(`Après réparation ${round} : tranche(s) ${toReplay.map(i => i + 1).join(', ')} rejouée(s) par leurs scripts${second.length ? `, ${second.map(([k]) => labelOf(k)).join(', ')} rappelé(s)` : ', rien de touché'}`)
  }
  const secondP = second.length ? parallel(second.map(([k, fs]) => () => judge(k, fs))) : Promise.resolve([])
  const suiteP = runSuite ? suiteCall(round > 0 ? `after its repair round ${round}` : 'for a targeted re-review', `${round > 0 ? `Après réparation ${round}` : 'Rejugement'} — ${SUITE_LABEL}`, 'Réparation') : null
  const secondOut = await secondP
  const firstOut = await firstP
  const suiteR = suiteP ? await suiteP : null

  const fresh = []
  const stage = round > 0 ? `après réparation ${round}` : 'rejugement'
  const answered = [...first.map((s, j) => [s, firstOut && firstOut[j]]), ...second.map((s, j) => [s, secondOut && secondOut[j]])]
  for (const [[k, fs], r] of answered) {
    // A tester that never answered leaves its slice unreplayed: those criteria « non vérifié », no pass —
    // even when it was called only to replay them (its task list empty).
    const rl = replayList(k)
    if (!r) {
      for (const f of fs) f.unanswered = (f.unanswered || 0) + 1
      for (const c of rl) unreplayed.set(c.id, stage)
      quiet.set(`rejudge:${k}`, `${labelOf(k)} (${stage})`)
      continue
    }
    quiet.delete(`rejudge:${k}`)
    for (const c of rl) unreplayed.delete(c.id)
    for (const x of r.results || []) {
      const f = fs.find(y => y.n === Number(x.n))
      if (!f) continue
      f.votes = f.votes || {}
      f.votes[k] = { fixed: !!x.fixed && !x.unverifiable, unverifiable: !!x.unverifiable, proof: x.proof }
    }
    for (const d of r.newDefects || []) fresh.push({ ...d, criterion: byId[d.criterion] ? d.criterion : GENERAL, replay: replayOf(d.replay), from: [k], n: findings.length + fresh.length + 1, fromRepair: round })
  }
  // The suite votes on its own findings: green → fixed; red → still open, a failure elsewhere is a new defect;
  // blocked or silent → no vote (the review stops on a block, a silent suite is asked again on resume).
  if (runSuite) {
    const mine = open.filter(f => f.from.includes('suite'))
    const ds = suiteOutcome(stage, suiteR)
    const v = suiteR && suiteR.verdict
    if (v === 'pass' || v === 'fail') for (const f of mine) { f.votes = f.votes || {}; f.votes.suite = { fixed: v === 'pass', unverifiable: false, proof: v === 'pass' ? `${SUITE_LABEL} verte` : ds.filter(d => d.criterion === f.criterion).map(d => d.proof).join(' / ') || `${SUITE_LABEL} encore en échec` } }
    else for (const f of mine) f.unanswered = (f.unanswered || 0) + 1
    for (const d of ds.filter(d => !mine.some(f => f.criterion === d.criterion))) fresh.push({ ...d, from: ['suite'], n: findings.length + fresh.length + 1, fromRepair: round })
  }
  for (const f of open) {
    const vs = Object.values(f.votes || {})
    // Fixed when every source that answered says so, and at least one answered.
    if (vs.length && vs.every(v => v.fixed)) { f.fixed = true; f.fixedProof = vs.map(v => v.proof).join(' / ') }
    // Nobody could check it (a device missing) and nobody saw it still broken: no repair can help.
    else if (vs.length && vs.some(v => v.unverifiable) && vs.every(v => v.fixed || v.unverifiable)) f.unverifiable = vs.filter(v => v.unverifiable).map(v => v.proof).join(' / ')
    else if (vs.length) f.proof = `${f.proof}\n[après ${round > 0 ? `réparation ${round}` : 'rejugement'}] ${vs.filter(v => !v.fixed).map(v => v.proof).join(' / ')}`
    delete f.votes
  }
  if (ciAgain && ci.started) {
    const ciDefects = await ciRead(`réparation ${round}`, false)
    const mine = open.filter(x => x.from.includes('ci'))
    if (ci.pending) { ciWait = true; for (const f of mine) f.ciPending = true }
    else if (!ci.block && !ciDefects.length) for (const f of mine) { f.fixed = true; f.fixedProof = 'CI verte' }
    else if (ciDefects.length) { for (const f of mine) f.proof = `${f.proof}\n[CI après réparation ${round}] ${ciDefects.map(d => d.proof).join(' / ')}`; for (const d of ciDefects.filter(d => !mine.some(f => f.criterion === d.criterion))) fresh.push({ ...d, n: findings.length + fresh.length + 1, fromRepair: round }) }
  }
  for (const d of fresh) findings.push(d)
  return fresh.length
}

try {
  if (FOCUS.length && !overBudget('le rejugement')) {
    await rejudge(toFix(), 0, '')
    log(`Rejugement ciblé : ${FOCUS.length - toFix().length}/${FOCUS.length} constat(s) réglé(s)`)
  }
  // The CI's first verdict joins the batch before the first repair.
  await ciP
  if (ci.started && !suiteBlock) for (const d of await ciRead('après la revue', false)) findings.push({ ...d, n: findings.length + 1 })
  for (let round = 0; round < REPAIR_EFFORTS.length && toFix().length; round++) {
    if (overBudget(`la réparation ${round + 1}`)) break
    // A suite blocked by its environment holds the review: nothing after it would be kept on a resume.
    if (suiteBlock) break
    // A CI still running holds its verdict: the repair waits for it (the review stops and is resumed).
    if (ciWait) break
    phase('Réparation')
    const batch = toFix()
    const effort = REPAIR_EFFORTS[round]
    const dev = await ask(`You are the developer repairing the review of a spec, round ${round + 1} of at most ${REPAIR_EFFORTS.length}. A panel (six reviewers, live testers${ci.started ? ', the CI' : ''}) proved the defects below on the result. Repair them all, at their root, without breaking any criterion.

${SPEC_LINE}
${list(CRITERIA)}
<defects>
${batch.map(f => `[${f.n}] (critère ${f.criterion}, ${f.severity}, relevé par ${f.from.map(labelOf).join(', ')}) ${f.title}${f.where ? ` — in ${f.where}` : ''}\n${f.proof}${f.replay ? `\nreplay: ${f.replay}` : ''}`).join('\n\n')}
</defects>
Work in ${W} (branch ${BR}) — every file you edit is under it, never under ${ROOT}. ${changes}
Start from each defect's reproduction and place, no wider exploration. One exception: a defect names one instance of a mistake — grep the spec's changes for the same mistake elsewhere (the places it names first) and fix every instance in this round. Reading: grep finds the place, a file is read once — never in successive slices, never twice. Keep ${ROOT}/.spec-first/logs/${SPEC_ID}-reparation-${round + 1}.md current (fixed, files changed, left to do): after a context compaction, read it and go on.
Before touching code, for each defect: a slip (fix the cause) or an approach that cannot hold (take another, never a second patch on it), or the environment (fix the configuration, no code).
Re-run each reproduction (its replay script when it names one: \`<script> <url>\`; never edit a replay script — one you judge wrong → that defect's note) and the tests of what you touched, then commit on ${BR}${quickTestCommand ? `, then the quick suite once, through the suite script: \`${suiteAt(W, 'quick')}\` (FAIL → fix, commit, call it again)` : ''}; never the full suite — it runs again after you, through the same script. Commit hooks always run, never --no-verify; one fails for a reason outside your changes → "blocker" starting with "TECHNIQUE:". A test that fails now and then: never skip it, never add a sleep, never rerun it until it passes. Find the cause; not found → leave the test as it is and say so in your summary.
Never run commands that rewrite files outside the defects (repo-wide formatters, lockfile upgrades). A defect you judge wrong → done false and, in note, the spec sentence it contradicts, quoted.
${portRule(60 + round)}${RESOURCES.length ? `
You hold the exclusive resource(s) ${RESOURCES.map(x => `« ${x} »`).join(', ')} for this task.` : ''}

${COMMON_RULES}`, { model: M, effort, schema: REPAIR_SCHEMA, phase: 'Réparation', locks: RESOURCES, label: `Réparation essai ${round + 1} (${M} ${effort})` })
    repairRounds = round + 1
    for (const f of batch) effortAt[f.n] = effort
    if (!dev) { repairBlocker = "le développeur de la réparation n'a pas répondu, deux fois (panne)"; break }
    for (const d of dev.decisions || []) decisions.push(d)
    for (const p of dev.files || []) if (!touchedFiles.includes(String(p))) touchedFiles.push(String(p))
    if (dev.blocker && !dev.changed) { repairBlocker = String(dev.blocker); break }
    // A defect the developer disputes with the spec's words: its reviewer reads them when re-judging.
    for (const x of dev.perDefect || []) { const f = batch.find(y => y.n === Number(x.n)); if (f && !x.done && String(x.note || '').trim()) f.devNote = String(x.note).trim() }
    const fresh = await rejudge(batch, round + 1, dev.summary, dev.files)
    log(`Réparation essai ${round + 1} (${M} ${effort}) — ${batch.filter(f => f.fixed).length}/${batch.length} réglé(s)${fresh ? `, ${fresh} défaut(s) causé(s) par la réparation` : ''}`)
    if (dev.blocker) { repairBlocker = String(dev.blocker); break }
  }
} catch (e) {
  repairBlocker = `revue arrêtée sur une erreur : ${errText(e)} (panne)`
  log(repairBlocker)
}

// ================================================================= criteria
// A criterion passes: its tester exercised it live and it held, and no blocking or major defect
// attached to it is still open. A general defect still open keeps the review from passing.
let open = []
let status = {}
let openGeneral = []
let reviewPass = false
// The review's suite, when it has one, must end green: a suite refused, lost or unanswered is no pass.
const lastSuite = () => suiteRuns[suiteRuns.length - 1] || null
const suiteGreen = () => !lastSuite() || lastSuite().verdict === 'pass'
function settle() {
  open = toFix()
  status = {}
  for (const c of CRITERIA) {
    const v = verdicts[c.id]
    const mine = open.filter(f => f.criterion === c.id)
    const by = [...new Set(mine.flatMap(f => f.from.map(s => s.startsWith('tester') || s === 'suite' ? 'tester' : s)))]
    const repairedHere = findings.filter(f => f.criterion === c.id && f.fixed)
    const unver = findings.filter(f => f.criterion === c.id && f.unverifiable)
    if (mine.length) {
      const st = mine.every(f => f.ciPending) ? { status: 'blocked', kind: 'externe' }
        : stopped ? { status: 'blocked', kind: 'technique', blocker: `Arrêté : ${stopped}.` }
          : !repairBlocker ? { status: 'failed' }
            : repairBlocker.includes('(panne)') ? { status: 'crashed' }
              : { status: 'blocked', kind: repairBlocker.startsWith('TECHNIQUE:') ? 'technique' : 'question', blocker: repairBlocker }
      status[c.id] = { ...st, reason: mine.map(f => `[${f.from.map(labelOf).join(', ')}] ${f.title} — ${f.proof}`).join('\n'), rejectedBy: by, effortReached: mine.map(f => effortAt[f.n]).filter(Boolean).pop() || '' }
    } else if (unver.length) status[c.id] = { status: 'unverified', reason: unver.map(f => f.unverifiable).join(' / ') }
    else if (!v && stopped) status[c.id] = { status: 'blocked', kind: 'technique', reason: `Arrêté : ${stopped}.` }
    else if (!v) status[c.id] = { status: 'unverified', reason: `aucun verdict du ${labelOf(testerOf[c.id])}` }
    else if (unreplayed.has(c.id)) status[c.id] = { status: 'unverified', reason: `${labelOf(testerOf[c.id])} sans réponse ${unreplayed.get(c.id)} : critère non rejoué après la réparation` }
    else if (v.verdict === 'unverifiable') status[c.id] = { status: 'unverified', reason: v.proof }
    else if (v.verdict === 'defect' && !repairedHere.length) status[c.id] = { status: 'failed', reason: v.proof, rejectedBy: ['tester'] }
    else status[c.id] = { status: 'validated', proof: v.verdict === 'pass' ? v.proof : `réparé : ${repairedHere.map(f => f.fixedProof).join(' / ')}` }
  }
  // A blocked suite judged nothing: every criterion it leaves unjudged is blocked by it, technically.
  if (suiteBlock) for (const c of CRITERIA) if (status[c.id].status === 'validated' || status[c.id].status === 'failed') status[c.id] = { status: 'blocked', kind: 'technique', reason: `${SUITE_LABEL} bloquée (${suiteBlock.stage}) : ${suiteBlock.cause} — pour débloquer : ${suiteBlock.unblock}${status[c.id].reason ? `\n${status[c.id].reason}` : ''}` }
  openGeneral = open.filter(f => f.criterion === GENERAL)
  silent = [...quiet.values()]
  reviewPass = !stopped && !ciWait && !silent.length && !suiteBlock && suiteGreen() && !findings.some(f => f.untried) && CRITERIA.every(c => status[c.id].status === 'validated') && !openGeneral.length
}
settle()
if (!suiteGreen() && !suiteBlock && lastSuite().verdict !== 'sans réponse') log(`Revue incomplète : la ${SUITE_LABEL} n'a pas de verdict vert (${lastSuite().verdict}${lastSuite().note ? ` — ${lastSuite().note}` : ''})`)
if (silent.length) log(`Revue incomplète : sans réponse de ${silent.join(', ')} — à reprendre (resumeFromRunId, mêmes args)`)

// ================================================================= 4. publication
let publication = null
let externalWait = ciWait ? { kind: 'ci', what: `pipeline de la CI${ci.mr ? ` de ${ci.mr}` : ''}`, where: (ci.pending && ci.pending.pipeline) || ci.mr || ci.ref, check: (ci.pending && ci.pending.check) || '' } : null
if (PUBLISH) {
  const pubCriteria = PUBLISH.ids.map(id => byId[id])
  const hold = (reason, kind) => {
    for (const c of pubCriteria) if (status[c.id].status === 'validated') status[c.id] = { ...status[c.id], status: 'blocked', kind, reason }
    publication = { done: false, rounds: 0, steps: [], reason }
    log(`Publication non lancée : ${reason}`)
  }
  const waitReason = w => `en attente externe : ${w.what}${w.where ? ` (${w.where})` : ''} — la revue reprend quand c'est fini`
  if (stopped) hold(`Arrêté : ${stopped}.`, 'technique')
  else if (externalWait) hold(waitReason(externalWait), 'externe')
  else if (suiteBlock) hold(`la ${SUITE_LABEL} est bloquée : ${suiteBlock.cause}.`, 'technique')
  else if (!reviewPass) hold(suiteGreen() ? 'la revue ne passe pas encore.' : `la ${SUITE_LABEL} n'a pas de verdict vert (${lastSuite().verdict}).`, 'attente')
  else {
    // The CI's verdict on the very commit that would be published: red → no publication, the defects open.
    let ds = []
    if (ci.started) {
      ds = await ciRead('avant publication', true)
      for (const d of ds) findings.push({ ...d, n: findings.length + 1 })
      if (ci.pending) externalWait = { kind: 'ci', what: `pipeline de la CI${ci.mr ? ` de ${ci.mr}` : ''}`, where: ci.pending.pipeline || ci.mr || ci.ref, check: ci.pending.check }
      if (ds.length) settle()
    }
    if (ci.block) hold(ciReason(ci.block), 'technique')
    else if (externalWait) hold(waitReason(externalWait), 'externe')
    else if (ds.length || !reviewPass) { reviewPass = false; hold('la CI a rejeté le résultat.', 'attente') }
    else {
      phase('Publication')
      publication = { done: false, rounds: 0, steps: [], reason: '' }
      let feedback = ''
      let last = null
      let pv = {}
      try {
        for (let round = 0; round < 3; round++) {
          if (overBudget(`la publication, essai ${round + 1}`)) { publication.reason = `Arrêté : ${stopped}.`; break }
          const effort = PUBLISH_EFFORTS[round]
          last = await ask(`You are the PUBLISHER of a spec, round ${round + 1} of at most 3. The whole spec passed its review. ${authorized()}
Apply exactly them, in their order, to the result: ${W} (branch ${BR}) — never the project at ${ROOT} itself.${ci.started ? ` The branch was pushed as ${ci.ref}${ci.mr ? `, draft merge request ${ci.mr}` : ''}: reuse them.` : ''}
Criteria the publication must make true — a tester checks them from outside once you are done:
${list(pubCriteria, 'publication_criteria')}
${feedback}
- An action needs a commit (version, changelog) → commit it there; nothing else. Hooks always run.
- glab, gh, the registry's tool or the API, non-interactively. Never force-push, never rewrite history, nothing outside the list.
- Never wait for anything outside this machine (a pipeline, a registry, a human review, a deployment): start it, return "waiting" with what, where (a URL) and one read-only check command. Already finished → go on. A machine failure (disk full, no runner) → retry once, then "unavailable" with cause, job, runner, unblock. A code failure → "failed" with the proof; never patch code here.
- An access is missing → "blocked", the access in reason. Already done by an earlier round → keep it.
- ${NO_REPUSH} Never run the project's tests, build or pre-push gate by hand: the review ran them on this commit, and a push runs its hook by itself.${WAIT_ROUND ? `
- Resumed after waiting outside (resume ${WAIT_ROUND}): first ${WAIT_CHECK ? `run its read-only check, \`${WAIT_CHECK}\`,` : 'read, read-only, the state of the last step you started (glab, gh, the registry\'s tool or the API),'} to see whether what was awaited is finished, then go on with what is left — nothing local runs again: no test, no build, no push of a commit the remote already has.` : ''}
This prompt is the exception to the « never push or publish » rule, for the actions above only.
${portRule(80 + round)}

${COMMON_RULES}`, { model: M, effort, schema: PUB_SCHEMA, phase: 'Publication', label: `Publication essai ${round + 1} (${M} ${effort})` })
          publication.rounds = round + 1
          if (!last) { publication.reason = "l'agent de publication n'a pas répondu, deux fois (panne)"; break }
          publication.steps = last.steps || []
          if (last.status === 'unavailable') { ci.block = { cause: last.cause, job: last.job, runner: last.runner, unblock: last.unblock }; publication.reason = ciReason(ci.block); break }
          if (last.status === 'blocked') { publication.reason = last.reason || 'accès manquant'; break }
          if (last.status === 'waiting') {
            const w = last.wait || {}
            externalWait = { kind: 'publication', what: String(w.what || 'une étape extérieure'), where: String(w.where || ''), check: String(w.check || '') }
            publication.reason = waitReason(externalWait)
            publication.waiting = true
            break
          }
          if (last.status !== 'done') { publication.reason = last.reason || 'publication inachevée'; feedback = `\nYour previous round did not finish: ${publication.reason}. Fix it within the authorized actions; keep what is done.\n`; continue }
          const t = await ask(`You are the PUBLICATION TESTER. The owner's authorized external actions were just applied. Check each criterion below from outside, as a user of what was published would: install from the registry into a fresh \`mktemp -d\` folder, read the merge request, its pipeline, the tag or the release through glab, gh or the API. You only look: never push, merge, tag or publish.
${authorized()}
${list(pubCriteria)}
<publisher_report>
${publication.steps.map(s => `- ${s.action}: ${s.outcome}`).join('\n') || 'none'}
</publisher_report>
These are claims, not evidence.
${portRule(85 + round)}

${COMMON_RULES}`, { ...REVIEWER, schema: testerSchema(PUBLISH.ids), phase: 'Publication', label: `Testeur publication essai ${round + 1} (${REVIEWER.model} ${REVIEWER.effort})` })
          pv = (t && t.verdicts) || {}
          const bad = pubCriteria.filter(c => !pv[c.id] || pv[c.id].verdict !== 'pass')
          log(`Publication essai ${round + 1} (${M} ${effort}) — ${pubCriteria.length - bad.length}/${pubCriteria.length} vérifié(s) de l'extérieur`)
          if (!bad.length) { publication.done = true; publication.reason = ''; break }
          publication.reason = 'le testeur publication a rejeté le résultat'
          if (bad.every(c => !pv[c.id] || pv[c.id].verdict !== 'defect')) break
          feedback = `\nThe publication tester rejected the previous round:\n${bad.map(c => `[${c.id}] ${pv[c.id].proof}`).join('\n')}\nFix what is missing within the authorized actions; keep what is done.\n`
        }
      } catch (e) {
        publication.reason = `arrêt sur une erreur : ${errText(e)} (panne)`
        last = null
        pv = {}
      }
      for (const c of pubCriteria) {
        const v = pv[c.id]
        if (publication.done) status[c.id] = { ...status[c.id], status: 'validated', proof: v.proof, published: true }
        else if (externalWait) status[c.id] = { ...status[c.id], status: 'blocked', kind: 'externe', reason: `Publication : ${publication.reason}` }
        else if (!last) status[c.id] = { ...status[c.id], status: 'crashed', reason: `Publication : ${publication.reason}` }
        else if (ci.block || stopped) status[c.id] = { ...status[c.id], status: 'blocked', kind: 'technique', reason: `Publication : ${publication.reason}` }
        else if (last.status === 'blocked') status[c.id] = { ...status[c.id], status: 'blocked', kind: 'question', reason: `Publication : ${publication.reason}` }
        else status[c.id] = { ...status[c.id], status: 'failed', reason: v ? v.proof : `Publication : ${publication.reason}`, rejectedBy: ['tester'] }
      }
    }
  }
}

// ================================================================= report
const seen = new Set()
const outside = outsideSpec.filter(o => {
  if (o.severity === 'low') return false
  const k = String(o.issue).toLowerCase().slice(0, 80)
  if (seen.has(k)) return false
  seen.add(k)
  return true
})
const criteria = CRITERIA.map(c => ({ id: c.id, text: c.text, ...status[c.id] }))
const counts = { total: criteria.length, validated: 0, unverified: 0, failed: 0, blocked: 0, crashed: 0 }
for (const c of criteria) counts[c.status] = (counts[c.status] || 0) + 1
const short = f => ({ n: f.n, criterion: f.criterion, severity: f.severity, title: f.title, by: f.from.map(labelOf), keys: f.from })
// A ready focus for a finding: its sources as keys (the CI → the live testers, who replay it).
const focusOf = f => [...new Set(f.from.map(s => s === 'ci' || s.startsWith('tester') ? 'tester' : s))].map(r => ({ ...(byId[f.criterion] ? { id: f.criterion } : {}), reviewer: r, finding: `${f.title} — ${f.proof}`.slice(0, 1500) + (f.replay ? ` [replay script: ${f.replay}]` : '') }))
const waitingOut = externalWait ? {
  kind: externalWait.kind, what: externalWait.what, where: externalWait.where, check: externalWait.check,
  limitMinutes: CI_WAIT_MIN, waitRound: WAIT_ROUND + 1,
  waitAt: externalWait.kind === 'ci' && ci.pendingAt ? { ...WAIT_AT, [ci.pendingAt]: WAIT_ROUND + 1 } : { ...WAIT_AT },
  waitCheck: externalWait.check || '',
  resume: `relancer cette revue avec resumeFromRunId, les mêmes args, waitRound: ${WAIT_ROUND + 1}, waitAt: ${JSON.stringify(externalWait.kind === 'ci' && ci.pendingAt ? { ...WAIT_AT, [ci.pendingAt]: WAIT_ROUND + 1 } : WAIT_AT)}${externalWait.check ? ` et waitCheck: ${JSON.stringify(externalWait.check)}` : ''}, une fois l'attente finie (ou après ${CI_WAIT_MIN} min)`,
} : null
// Each criterion still failing: what to relaunch in a development run, then this review with focus.
// spec-first:run has no critics of its own any more: only the proof goes back, to the developer's first round.
const relaunch = criteria.filter(c => c.status === 'failed').map(c => ({ id: c.id, rejectedBy: { proof: c.reason }, focus: open.filter(f => f.criterion === c.id).flatMap(focusOf) }))
log(`Fin de la revue : ${counts.validated}/${counts.total} validé(s)${counts.failed ? `, ${counts.failed} en échec` : ''}${counts.unverified ? `, ${counts.unverified} non vérifié(s)` : ''}${counts.blocked ? `, ${counts.blocked} bloqué(s)` : ''}${openGeneral.length ? `, ${openGeneral.length} défaut(s) général(aux) ouvert(s)` : ''} · ${findings.filter(f => f.fixed).length} défaut(s) réparé(s) en ${repairRounds} essai(s)${stopped ? ` — arrêt avant la fin (${stopped})` : ''}`)

const FR = { validated: 'validé', unverified: 'non vérifié', failed: 'en échec', blocked: 'bloqué', crashed: 'en panne' }
const stateText = [
  `# spec-first — état de la revue de ${SPEC_ID}`,
  '',
  `Étape : ${waitingOut ? 'en attente externe' : stopped ? `arrêtée avant la fin (${stopped})` : suiteBlock ? 'suite bloquée' : silent.length ? `incomplète, sans réponse de ${silent.join(', ')}` : 'revue terminée'}`,
  ...(lastSuite() ? [`Suite : ${SUITE_LABEL}, ${lastSuite().verdict}`] : []),
  ...(suiteBlock ? [`Suite bloquée : ${suiteBlock.cause} — pour débloquer : ${suiteBlock.unblock} — puis ${suiteBlock.resume}`] : []),
  `Revue : ${reviewPass ? 'passe' : 'ne passe pas'} — ${criteria.length} critère(s), ${findings.filter(f => f.fixed).length} défaut(s) réparé(s)`,
  ...criteria.map(c => `- ${c.id} : ${FR[c.status]}`),
  ...(openGeneral.length ? ['', 'Défauts généraux ouverts :', ...openGeneral.map(f => `- ${f.title}`)] : []),
  ...(waitingOut ? ['', `Attente : ${waitingOut.what}`, `Reprendre : ${waitingOut.resume}`] : []),
  '', `Branche : ${BR}`,
].join('\n')

return {
  specId: SPEC_ID,
  review: FOCUS.length ? 'ciblée' : 'complète',
  pass: reviewPass && (!PUBLISH || !!(publication && publication.done)),
  result: { in: 'integration', worktree: W, branch: BR },
  criteria,
  counts,
  // Proven blocking or major defects still open, the ones repaired, and the minor ones (reported, never repaired).
  open: open.map(short),
  // Ready-made focus for every open defect, general ones included: the args of the next targeted review.
  focus: open.filter(f => !f.ciPending).flatMap(focusOf),
  silent,
  repaired: findings.filter(f => f.fixed).map(short),
  minor: findings.filter(f => f.kind === 'defect' && f.severity === 'minor').map(short),
  leadsDismissed: findings.filter(f => f.dismissed).length,
  // Criteria a live tester left a replay script for, out of counts.total.
  replayScripts: CRITERIA.filter(c => scriptOf(c.id)).length,
  repairRounds,
  repairBlocker,
  relaunch,
  decisions: [...new Set(decisions)],
  outsideSpec: outside,
  outsideSpecMinor: outsideSpec.filter(o => o.severity === 'low').length,
  waiting: waitingOut,
  state: { file: `${ROOT}/${COPIES}/${SPEC_ID}--etat.md`, text: stateText },
  ci: PUBLISH ? { started: ci.started, branch: ci.ref, mergeRequest: ci.mr, unavailable: ci.block, pending: ci.pending, runs: ci.runs } : null,
  publication,
  stopped,
  // Why it stopped before its end: budget | agents | suite-missing | preparation | copy ('' when it did not).
  stoppedKind,
  // The suite script to install (stoppedKind « suite-missing »).
  ...(stoppedKind === 'suite-missing' ? { install: SUITE_BIN } : {}),
  // The review's suite through the suite script: every verdict in order (panel, then after each repair), and
  // its technical block when it ended neither green nor red.
  suite: SUITE_NAME ? { name: SUITE_NAME, runs: suiteRuns, block: suiteBlock } : null,
  // Leads no tester could try, even the second one: they hold the pass.
  leadsUntried: findings.filter(f => f.untried).map(short),
  // The testers' slices, one per live tester: pass them back as journeys to keep them on a later review.
  journeys: SLICES.map(cs => cs.map(c => c.id)),
}
