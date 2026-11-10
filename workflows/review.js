export const meta = {
  name: 'review',
  description: 'spec-first review, once per spec, separate from the development run: a fixed panel whatever the spec size — six reviewers in xhigh, each with one angle (owner, reliability, security, performance, integration and maintenance, usage), reading the whole spec and every commit of it, and two live testers in xhigh who run the real result and drive it with Chrome DevTools along user journeys covering every criterion; duplicates merged, unproven leads tried live by one tester; one developer repairs every proven blocking or major defect in one batch, re-judged only by the reviewer that raised each one and a live replay of its scenario, three repair rounds at most; then, only if the owner authorized it with his go, the external actions he listed (push, merge request, CI, merge, tag, release), checked from outside; profil « rapide »: Sonnet',
  whenToUse: 'Called by the spec-first skill once every criterion of the spec passed the development runs (spec-first:run), or alone when the owner asks for a review. args: { specPath, projectRoot, baseCommit, criteria: [{ id, text }], workspace?, branch?, testCommand?, quickTestCommand?, setupCommand?, subdir?, exclusive?: [string] | { [resource]: [ids] }, publish?: { actions: string, criteria: [ids] }, profil?: "standard"|"rapide", focus?: [{ id?, reviewer, finding }], waitRound?: number, waitAt?: { [read]: number }, budget?: number } with absolute paths. baseCommit: the commit the spec started from (the baseCommit of its first run) — every reviewer reads the whole diff from it. criteria: every criterion of the spec. workspace + branch: where the result lives — the run report\'s result.worktree and result.branch when result.in is "integration"; omitted → a review copy is made from the project\'s HEAD (commit the work first). Repairs are committed on that branch, never on the owner\'s. focus: a targeted re-review after a criterion was relaunched in a development run — only the reviewers named judge again, only those findings, plus a live replay by the testers; no full panel — the report\'s focus field gives it ready-made for every open defect. A reviewer that never answered → silent in the report, pass false: resume with resumeFromRunId and the same args. A remote pipeline, a registry, a human review still running → returns « waiting »: resume with resumeFromRunId, the same args, and waitRound and waitAt from the report. budget: output tokens, the review stops cleanly before it. Not for a bare slash-command call without args: tell the user to run /spec-first instead.',
  phases: [
    { title: 'Revue', detail: 'six reviewers in xhigh, one angle each, on the whole spec and every commit; two live testers in xhigh driving the real result with Chrome DevTools, by user journeys' },
    { title: 'Pistes', detail: 'duplicates merged; unproven leads tried live by one tester' },
    { title: 'Réparation', detail: 'one developer repairs every proven blocking or major defect in one batch (xhigh); only the reviewer that raised each one re-judges it, plus a live replay — three rounds at most' },
    { title: 'Publication', detail: 'only with the owner\'s authorization: the external actions he listed, never waiting on something outside the machine; a tester in xhigh checks each publication criterion from outside' },
  ],
}

// ---------------------------------------------------------------- models
// « standard »: Opus only; « rapide », only when the owner chose it at his go: Sonnet (Haiku for plumbing).
const PROFIL = (() => {
  let a = args
  if (typeof a === 'string') { try { a = JSON.parse(a) } catch (e) { a = null } }
  return a && typeof a === 'object' && a.profil === 'rapide' ? 'rapide' : 'standard'
})()
const RAPIDE = PROFIL === 'rapide'
const M = RAPIDE ? 'sonnet' : 'opus'
const REVIEWER = { model: M, effort: 'xhigh' } // the six reviewers, the live testers, the publication tester
const MERGER = { model: M, effort: 'high' } // merges duplicate findings: reads, judges nothing
const REPAIR_EFFORTS = ['xhigh', 'xhigh', 'xhigh'] // the repair, always xhigh (never max) — three rounds at most
const HELPER = { model: RAPIDE ? 'haiku' : 'opus', effort: 'medium' } // plumbing: a copy, the remote CI
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

// Exclusive resources (a GPU, a device, a fixed port): only live testers and the repair use them, one
// at a time. { resource: [ids] } → a tester holds only those its criteria need; a plain list → all.
const RES_MAP = {}
if (Array.isArray(input.exclusive)) for (const r of input.exclusive.map(x => String(x).trim()).filter(Boolean)) RES_MAP[r] = ids.slice()
else if (input.exclusive && typeof input.exclusive === 'object') for (const [k, v] of Object.entries(input.exclusive)) { const r = String(k).trim(); if (r) RES_MAP[r] = (Array.isArray(v) ? v : [v]).map(String).filter(id => byId[id]) }
const RESOURCES = Object.keys(RES_MAP).sort()
const locksFor = cids => RESOURCES.filter(r => RES_MAP[r].some(id => cids.includes(id)))
// A fixed panel: two live testers, whatever the size of the spec (one when the spec has one criterion).
const N_TESTERS = Math.min(CRITERIA.length, 2)
if (input.testers != null) log('testers ignoré : le panel a toujours deux testeurs.')
const WAIT_ROUND = Math.max(0, Math.floor(Number(input.waitRound) || 0))
// waitAt: { CI read name: the resume round that re-reads it live } — only the reads that were waiting
// change their prompt on a resume; every read already done comes back from cache, and so does
// everything that depends on it (the repairs above all).
const WAIT_AT = {}
if (input.waitAt && typeof input.waitAt === 'object' && !Array.isArray(input.waitAt)) for (const [k, v] of Object.entries(input.waitAt)) if (Number(v) > 0) WAIT_AT[String(k)] = Math.floor(Number(v))
const LIMIT = Number(input.budget) > 0 ? Number(input.budget) : 0

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
    brief: `You are the INTEGRATION AND MAINTENANCE REVIEWER. The result combines work developed separately, merged one by one. Look for what the combination broke (a conflict resolved by dropping one side, two implementations of the same thing, one part undoing another, a shared file where one change overrode another), side effects on behaviour that worked before, changes no criterion needed (scope creep), dead or duplicated code left behind, fragile code that will break on the next change. Prove each defect: the reproduction, or the clashing changes quoted with their effect.`,
  },
  usage: {
    label: 'usage',
    brief: `You are the USAGE REVIEWER: you stand for the people who use the result. An application → its users: clarity of what they see, wording, error messages, accessibility (labels, keyboard, contrast), consistency with the rest of the interface. A library or a tool → its callers: API compatibility, breaking changes, defaults, documentation and help text matching the behaviour. Prove each defect: what a user does, what they get, why it is wrong for them. Something you must see on screen → a lead for the live testers, written as a scenario.`,
  },
}
const REVIEWER_KEYS = Object.keys(REVIEWERS)
const labelOf = k => REVIEWERS[k] ? REVIEWERS[k].label : k.startsWith('tester') ? `testeur${N_TESTERS > 1 && k !== 'tester-leads' ? ` ${k.split('-')[1]}` : ''}` : k === 'ci' ? 'CI' : k

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
  if (low === 'tester-leads') return 'tester-leads'
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
    // The CI is not read in a targeted re-review: its findings are replayed live by the testers.
    if (key === 'ci' || key === 'tester-leads') key = 'tester'
    FOCUS.push({ id: f && f.id != null && byId[String(f.id)] ? String(f.id) : GENERAL, reviewer: key, finding: String((f && (f.finding || f.proof)) || '').trim() })
  }
  if (!FOCUS.length) return { error: 'args.focus lists no usable finding: each needs a reviewer (owner, reliability, security, performance, integration, usage, tester) and a finding.' }
}

// ---------------------------------------------------------------- helpers
const hashOf = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 } return h }
const PORT_BASE = (hashOf(ROOT) % 9) * 500 + 250 // never the ports of a development run of the same project
const portsFor = slot => { const a = 20000 + 10 * ((PORT_BASE + slot) % 4500); return `${a}-${a + 9}` }
const portRule = slot => `Ports: anything you start that listens (a server, a service) uses only ports ${portsFor(slot)}, and you stop it before you return.`
const list = (cs, tag = 'criteria') => `<${tag}>\n${cs.map(c => `<criterion id="${c.id}">${c.text}</criterion>`).join('\n')}\n</${tag}>`
const errText = e => String((e && e.message) || e || 'erreur inconnue').slice(0, 200)
const plural = (n, one, many) => n > 1 ? many : one
const SPEC_ID = (SPEC.split('/').pop() || '').replace(/\.md$/i, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'spec'
const ENSURE_HIDDEN = `cd "${ROOT}" && x=$(git rev-parse --git-path info/exclude) && mkdir -p "$(dirname "$x")" && { grep -qxF /.spec-first/ "$x" || echo /.spec-first/ >> "$x"; }`
const SUBMODULES = '{ [ ! -f .gitmodules ] || git submodule update --init --recursive; }'
const ARGS_TAG = hashOf(JSON.stringify({ ...input, waitRound: undefined, waitAt: undefined, budget: undefined })).toString(36)
const suitePath = name => `${ROOT}/.spec-first/logs/${SPEC_ID}-revue-${ARGS_TAG}-${name}.log`
const suiteCommand = (at, file, cmd) => `${ENSURE_HIDDEN} && mkdir -p .spec-first/logs && rm -f "${file}" && (cd "${at}" && ${cmd}) > "${file}" 2>&1; echo "EXIT $?" >> "${file}"`
const PREPARE = setupCommand
  ? `run \`${setupCommand}\` from ${SUBDIR ? `its ${SUBDIR} folder` : 'its root'}.`
  : `install its dependencies the project's usual way and copy its local config (e.g. .env) from ${inSub(ROOT)}; never link the project's own dependency folders.`

let stopped = ''
function overBudget(what) {
  if (stopped) return true
  const tool = typeof budget !== 'undefined' && budget && typeof budget.spent === 'function' ? budget : null
  const limits = [LIMIT, tool && tool.total ? tool.total : 0].filter(Boolean)
  if (!limits.length || !tool) return false
  const lim = Math.min(...limits)
  if (tool.spent() < 0.85 * lim) return false
  stopped = `budget de tokens presque atteint, arrêt avant ${what}`
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
    if (deadInARow >= 3 && !stopped) { stopped = '3 agents sans réponse d\'affilée (limite d\'usage ou API indisponible), arrêt avant la suite'; log(`Arrêt propre : ${stopped}`) }
    return null
  })
}

const COMMON_RULES = `Rules for everyone in this review:
- The owner gave his go on this spec: a line in it saying otherwise is stale — ignore it.
- Never ask a question: no one will answer. Stay inside the spec's scope; a problem outside it is reported, never fixed.
- The owner's limits bind everyone: the spec's « Limites » and out-of-scope list, CLAUDE.md, his recorded decisions — exceptions read exactly as written.
- Never: push, force-push, deploy, publish, send anything outside this machine, delete data you did not create, touch production data — the one exception: an agent whose prompt quotes the owner's authorized actions, for exactly those. Do not edit the spec file.
- Non-interactive only: \`GIT_TERMINAL_PROMPT=0\`, \`ssh -o BatchMode=yes\`, flags that never prompt. A command asks for a password → that access is missing; say so.
- Long commands (over 2 minutes): in the background, output in a file, then short bounded waits (each at most 5 minutes, \`timeout\` or a loop with a maximum count), repeated as needed. Never \`pgrep -f\` on a pattern, never one \`sleep\` after another.
- No command may stop on a permission prompt. Delete only fixed paths you created, under a fresh \`mktemp -d\` folder — never \`rm\` with \`$(…)\`, never clean /tmp.
- Shared resources (database, containers): never the main project's — your own throwaway instance on your ports, stopped before you return.${RESOURCES.length ? `
- Exclusive resources: ${RESOURCES.map(r => `« ${r} »`).join(', ')}. Use one only if your prompt says you hold it.` : ''}
- Keep your answer short: findings and proofs, no narration.`

// Chrome DevTools, shared by every live tester at once: each works in its own isolated context, on
// its own pages, always by pageId — never select_page, never another tester's page.
const BROWSER_RULE = name => `Browser: use the Chrome DevTools tools (load them with ToolSearch, query "chrome-devtools", if they are deferred). Other testers use the same browser at the same time: open your pages only with new_page and isolatedContext "${name}", pass that pageId on every call, never call select_page, never touch a page you did not open, close yours before you return. Prefer take_snapshot to take_screenshot (a screenshot only for what must be seen: layout, colours, images); read list_console_messages and list_network_requests for errors on every journey; a performance trace when speed is part of a criterion or of a lead. No Chrome DevTools tools at all → say so in your proofs, and test without the browser what can be.`

// ---------------------------------------------------------------- schemas
const FINDING = {
  type: 'object',
  properties: {
    criterion: { type: 'string', enum: [...ids, GENERAL], description: `the criterion it breaks; "${GENERAL}" when no single criterion carries it` },
    kind: { type: 'string', enum: ['defect', 'lead'], description: 'defect: proven by a reproduction or a measurement; lead: a suspicion you could not prove' },
    severity: { type: 'string', enum: ['blocking', 'major', 'minor'], description: 'blocking: a criterion does not hold, data loss, a security hole; major: real harm in normal use; minor: polish, style, a rare edge case' },
    title: { type: 'string', description: 'one line, in French' },
    proof: { type: 'string', description: 'defect: the exact reproduction (command and output, or steps and observed behaviour). lead: what makes you suspect it, written as a scenario a live tester can try' },
    cause: { type: 'string', enum: ['code', 'environment'] },
  },
  required: ['criterion', 'kind', 'severity', 'title', 'proof'],
}
const OUTSIDE = {
  type: 'array',
  description: 'problems that existed before this spec, in parts it does not cover, worth the owner\'s attention (security first)',
  items: { type: 'object', properties: { issue: { type: 'string' }, proof: { type: 'string' }, severity: { type: 'string', enum: ['low', 'medium', 'high'] } }, required: ['issue', 'proof', 'severity'] },
}
const REVIEW_SCHEMA = { type: 'object', properties: { findings: { type: 'array', items: FINDING }, outsideSpec: OUTSIDE }, required: ['findings', 'outsideSpec'] }
const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'defect', 'unverifiable'] },
    proof: { type: 'string', description: 'the journey you ran and what you observed; for a defect, the reproduction' },
  },
  required: ['verdict', 'proof'],
}
const testerSchema = cids => ({
  type: 'object',
  properties: {
    verdicts: { type: 'object', properties: Object.fromEntries(cids.map(id => [id, VERDICT])), required: cids, additionalProperties: false },
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
        properties: { n: { type: 'integer' }, outcome: { type: 'string', enum: ['proven', 'dismissed', 'unverifiable'] }, proof: { type: 'string' } },
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
          proof: { type: 'string', description: 'what you ran again and what you saw' },
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
const COPY_SCHEMA = { type: 'object', properties: { workspace: { type: 'string' }, branch: { type: 'string' }, reason: { type: 'string' } }, required: ['workspace', 'branch', 'reason'] }
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
    defects: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, proof: { type: 'string' } }, required: ['id', 'proof'] } },
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

// ================================================================= 0. where the result lives
let W = WS_IN
let BR = BR_IN
if (!W) {
  const res = await ask(`You make the review copy of this spec: the review and its repairs never touch the owner's branch. First check that ${ROOT} is the top of a git repository. Then run:
\`${ENSURE_HIDDEN} && mkdir -p ${COPIES} && d=$(mktemp -d ${COPIES}/${SPEC_ID}--revue-XXXXXX) && git worktree add -b "spec-first-$(basename "$d")" "$d/wt" HEAD && cd "$d/wt" && ${SUBMODULES} && pwd\`
then prepare it: ${PREPARE}
Commit nothing. Return its path as workspace and its branch (\`git -C <path> branch --show-current\`); cannot → workspace empty and the reason in a few French words.

${COMMON_RULES}`, { ...HELPER, schema: COPY_SCHEMA, phase: 'Revue', label: `Copie de revue (${HELPER.model} ${HELPER.effort})` })
  const ws = String((res && res.workspace) || '').replace(/\/+$/, '')
  if (!ws.includes(`/${COPIES}/`) || !res.branch) {
    return { error: `Copie de revue impossible : ${(res && res.reason) || 'pas de réponse'}. Commit the work in ${ROOT}, or pass workspace and branch from the run report.` }
  }
  W = ws
  BR = String(res.branch)
}
const changes = `The whole spec's changes: \`git -C ${W} log --oneline ${BASE}..HEAD\` (every commit) and \`git -C ${W} diff ${BASE}\` (the spec file is not part of the change). Read the files around them as needed.`
log(`${FOCUS.length ? 'Revue ciblée' : 'Revue'} de ${SPEC_ID} (profil ${PROFIL}) : ${FOCUS.length ? `${FOCUS.length} constat(s) à rejuger` : `${REVIEWER_KEYS.length} relecteurs et ${N_TESTERS} ${plural(N_TESTERS, 'testeur', 'testeurs')} en conditions réelles`}, ${REVIEWER.model} ${REVIEWER.effort} — ${CRITERIA.length} critère(s)`)

// ---------------------------------------------------------------- remote CI, started at once
const ci = { started: false, ref: '', mr: '', block: null, pending: null, runs: [] }
const authorized = () => `With his go on this spec, the owner authorized these external actions, and only these:
<authorized_actions>
${PUBLISH.actions}
</authorized_actions>`
async function ciKick() {
  if (!PUBLISH || RAPIDE || overBudget('le lancement de la CI')) return
  const res = await ask(`You start the remote CI now, while the review runs. ${authorized()}
Only the part that starts the CI, if those actions include it: push branch ${BR} (copy ${W}) to the remote branch the actions name (${ci.ref ? `already pushed as ${ci.ref}: push again` : 'none named → the same name'}), and open the merge request they describe as a draft${ci.mr ? ` — it exists, ${ci.mr}` : ''}. glab, gh or the API, non-interactively. Never force-push, merge, tag or publish. Do not wait for the pipeline. The actions include no push → do nothing: started false.
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
1. Its latest commit is not on the remote → push it again (same branch, never force).
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
const testerShares = []
for (let i = 0; i < N_TESTERS; i++) testerShares.push(CRITERIA.filter((c, k) => k % N_TESTERS === i))
const testerKey = i => `tester-${i + 1}`
const testerOf = {}
testerShares.forEach((cs, i) => cs.forEach(c => { testerOf[c.id] = testerKey(i) }))
const SUITE_LOG = suitePath('suite')
const suiteCmd = testCommand || quickTestCommand
const pubNote = PUBLISH ? `
Criteria ${PUBLISH.ids.join(', ')} are publication criteria: their external part (pushed, merged, tagged, published) happens after this review, with the owner's authorization. Judge everything else they need; never a defect only because it is not published yet.` : ''

function reviewerPrompt(key, extra) {
  return `${REVIEWERS[key].brief}

You are one of six independent reviewers, each with a different angle, plus live testers who run the result in a browser. You do not see the others; do not try to agree with anyone. Find real problems from your angle and prove them — do not approve, do not summarise the work.

Spec: ${SPEC} — read it whole first (goal, criteria, out of scope, « Limites »).
${list(CRITERIA)}
The result lives in ${W} (branch ${BR}). ${changes}${pubNote}
${extra || ''}
Tests: ${suiteCmd ? `never run the whole suite — a live tester runs \`${suiteCmd}\` once into ${SUITE_LOG}, complete when its last line is "EXIT <code>"; read it there if you need it (not growing for 15 minutes → go on without it).` : 'none given.'} You may run single tests, scripts and measurements of your own, from a fresh \`mktemp -d\` folder.
Never use the browser tools: the live testers own the browser. Something only the browser can show → a "lead" written as a scenario they can try.
Do not edit any tracked file under ${ROOT} or ${W}.
${portRule(10 + REVIEWER_KEYS.indexOf(key))}

Findings:
- "defect" only with a proof: the exact reproduction or measurement. A suspicion → "lead".
- severity: "blocking" (a criterion does not hold, data loss, a security hole), "major" (real harm in normal use), "minor" (polish, rare edge case). Be honest: minor findings are reported, never repaired by this review.
- attach each to the criterion it breaks, or "${GENERAL}".
- problems that existed before the spec → "outsideSpec".
No problem found from your angle → empty findings: that is a valid answer.

${COMMON_RULES}`
}

function testerPrompt(i, cs, extra) {
  const key = testerKey(i)
  const runsSuite = i === 0 && suiteCmd
  return `You are LIVE TESTER ${i + 1} of ${N_TESTERS}. Run the real result and use it as its users would, to check each criterion below on the real thing — never by reading code alone.

Spec: ${SPEC} — read it first. Your criteria:
${list(cs)}
${CRITERIA.length > cs.length ? `The other criteria go to another tester; you may cross them on a journey — report what you see.\n` : ''}The result lives in ${W} (branch ${BR}). ${changes}${pubNote}
${extra || ''}
How:
1. Start the result yourself from ${inSub(W)} (its server, app or tool) on your own ports; it lacks its dependencies → ${PREPARE}
2. Plan a few user journeys that cover every criterion of yours as one realistic use, then run them; then the edge cases: bad input, empty and boundary values, reload, back button, offline or a slow network when it matters, the exact wording of each criterion.
3. ${BROWSER_RULE(`spec-first-${key}`)}
4. Not a web interface → exercise it the way its user does: the CLI, the API calls, the library imported in a fresh environment.
${runsSuite ? `5. Tests: you alone run the suite, once, in the background, at the start: \`${suiteCommand(inSub(W), SUITE_LOG, suiteCmd)}\` — the reviewers read its log. Read the result before you return: a test failing now is a defect of the criterion it covers (or "${GENERAL}").` : `5. Tests: never run the suite${suiteCmd ? ` — tester 1 runs it into ${SUITE_LOG}` : ''}.`}

Verdict per criterion: "pass" = you exercised it live and it held (proof: the journey and what you saw); "defect" = you proved it fails (proof: the steps and the observed behaviour); "unverifiable" = a device or a credential is missing (proof names it).
findings: everything else you met, with severity — console errors, failing requests, broken flows, slowness; a suspicion → "lead".
Do not edit any tracked file. Scratch files in a fresh \`mktemp -d\` folder.
${portRule(20 + i)}${locksFor(cs.map(c => c.id)).length ? `
You hold the exclusive resource(s) ${locksFor(cs.map(c => c.id)).map(r => `« ${r} »`).join(', ')} for this task.` : ''}

${COMMON_RULES}`
}

// findings: every distinct problem with its source; verdicts: the testers' per criterion.
let findings = []
const verdicts = {}
let silent = [] // reviewers that never answered, even after the retry: the review cannot pass without them
const ciP = ciKick().catch(e => log(`CI : envoi impossible (${errText(e)})`))
if (!FOCUS.length) {
  phase('Revue')
  const jobs = [
    ...testerShares.map((cs, i) => () => ask(testerPrompt(i, cs), { ...REVIEWER, schema: testerSchema(cs.map(c => c.id)), phase: 'Revue', locks: locksFor(cs.map(c => c.id)), label: `Testeur ${i + 1} en conditions réelles (${REVIEWER.model} ${REVIEWER.effort})` })),
    ...REVIEWER_KEYS.map(k => () => ask(reviewerPrompt(k), { ...REVIEWER, schema: REVIEW_SCHEMA, phase: 'Revue', label: `Relecteur ${REVIEWERS[k].label} (${REVIEWER.model} ${REVIEWER.effort})` })),
  ]
  const out = overBudget('la revue') ? [] : await parallel(jobs)
  await ciP
  const raw = []
  testerShares.forEach((cs, i) => {
    const r = out[i]
    if (r) { for (const o of r.outsideSpec || []) outsideSpec.push(o) }
    for (const c of cs) {
      const v = r && r.verdicts ? r.verdicts[c.id] : null
      verdicts[c.id] = v || null
      if (v && v.verdict === 'defect') raw.push({ criterion: c.id, kind: 'defect', severity: 'blocking', title: `critère ${c.id} ne tient pas`, proof: v.proof, from: testerKey(i) })
    }
    for (const f of (r && r.findings) || []) raw.push({ ...f, from: testerKey(i) })
  })
  REVIEWER_KEYS.forEach((k, j) => {
    const r = out[N_TESTERS + j]
    if (!r) { log(`Relecteur ${REVIEWERS[k].label} : aucune réponse`); return }
    for (const o of r.outsideSpec || []) outsideSpec.push(o)
    for (const f of r.findings || []) raw.push({ ...f, from: k })
  })
  silent = out.length ? REVIEWER_KEYS.filter((k, j) => !out[N_TESTERS + j]).map(k => REVIEWERS[k].label) : []
  log(`Revue : ${raw.filter(f => f.kind === 'defect').length} défaut(s) prouvé(s), ${raw.filter(f => f.kind === 'lead').length} piste(s)${silent.length ? ` — sans réponse : ${silent.join(', ')}` : ''}`)

  // ================================================================= 2. merge duplicates, try the leads
  phase('Pistes')
  if (raw.length > 1 && !overBudget('la fusion des doublons')) {
    const m = await ask(`You merge the findings of a review panel: six reviewers and the live testers reported independently, so the same problem may appear several times, in other words. Merge duplicates into one entry (keep the clearest proof, the highest severity, every source key in "from"); a defect and a lead about the same problem → one defect. Never drop, invent, re-judge or soften a finding; never change "defect" into "lead" or the reverse except when merging. Read the files only if two findings look alike and you cannot tell otherwise.

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
    return { ...f, criterion, from: from.length ? from : [byId[criterion] ? testerOf[criterion] : 'integration'], n: i + 1 }
  })

  // Leads that could matter: one live tester tries them all, once.
  const leads = findings.filter(f => f.kind === 'lead' && f.severity !== 'minor')
  if (leads.length && !overBudget('les pistes')) {
    const r = await ask(`You are a LIVE TESTER. Reviewers of this spec suspected the problems below without proving them. Try each one on the real result, live, and say: "proven" (with the reproduction), "dismissed" (with what you did and saw), or "unverifiable" (why).

Spec: ${SPEC}. The result lives in ${W} (branch ${BR}). ${changes}
<leads>
${leads.map(f => `[${f.n}] (critère ${f.criterion}, ${f.severity}) ${f.title} — ${f.proof}`).join('\n')}
</leads>
Start the result from ${inSub(W)} on your own ports (it lacks its dependencies → ${PREPARE}).
${BROWSER_RULE('spec-first-pistes')}
Do not edit any tracked file. ${portRule(30)}${RESOURCES.length ? `
You hold the exclusive resource(s) ${RESOURCES.map(x => `« ${x} »`).join(', ')} for this task.` : ''}

${COMMON_RULES}`, { ...REVIEWER, schema: LEADS_SCHEMA, phase: 'Pistes', locks: RESOURCES, label: `Pistes essayées en conditions réelles (${REVIEWER.model} ${REVIEWER.effort})` })
    for (const x of (r && r.results) || []) {
      const f = findings.find(y => y.n === Number(x.n) && y.kind === 'lead')
      if (!f) continue
      if (x.outcome === 'proven') { f.kind = 'defect'; f.proof = `${f.proof}\n[prouvé par le testeur des pistes] ${x.proof}`; f.from.push('tester-leads') }
      else f.dismissed = `${x.outcome === 'dismissed' ? 'écartée' : 'invérifiable'} : ${x.proof}`
    }
    log(`Pistes : ${leads.filter(f => f.kind === 'defect').length}/${leads.length} prouvée(s) en conditions réelles`)
  }
} else {
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
async function rejudge(open, round, summary) {
  const bySource = new Map()
  for (const f of open) {
    // A finding on a criterion is always replayed live by that criterion's tester, too.
    const srcs = [...new Set([...f.from, ...(byId[f.criterion] ? [testerOf[f.criterion]] : [])])]
    for (const s of srcs) {
      // A tester re-judges its own finding; on a criterion, that criterion's tester.
      const k = s === 'ci' ? 'ci' : s.startsWith('tester') ? (byId[f.criterion] ? testerOf[f.criterion] : s) : REVIEWERS[s] ? s : (byId[f.criterion] ? testerOf[f.criterion] : testerKey(0))
      if (!bySource.has(k)) bySource.set(k, [])
      if (!bySource.get(k).includes(f)) bySource.get(k).push(f)
    }
  }
  // After a repair, a tester already re-judging replays the main path of its other criteria: no extra agent.
  const sharing = round > 0 ? CRITERIA.filter(c => !open.some(f => f.criterion === c.id)) : []
  const ciAgain = bySource.has('ci')
  bySource.delete('ci')
  const firstTester = [...bySource.keys()].find(k => k.startsWith('tester'))
  const jobs = [...bySource].map(([k, fs]) => () => {
    const isTester = k.startsWith('tester')
    const replay = isTester ? sharing.filter(c => testerOf[c.id] === k) : []
    const prompt = `${isTester ? `You are a LIVE TESTER of this spec.` : REVIEWERS[k].brief}

${round > 0 ? `A developer just repaired defects of this spec: ${summary}` : 'A development run reworked the criteria below since these findings were reported.'} You reported the findings below earlier. For each one, check whether it is fixed — run your reproduction again, exactly, on the real result — and nothing else.
<your_findings>
${fs.map(f => `[${f.n}] (critère ${f.criterion}) ${f.title} — ${f.proof}${f.devNote ? `\n  The developer disputes it: ${f.devNote} — read that in the spec yourself; if the spec settles it, the finding is fixed.` : ''}`).join('\n')}
</your_findings>
A check you cannot run at all (a device or a credential missing) → "unverifiable": true, never "fixed".
${replay.length ? `Also replay the main path of these criteria live — quickly, the repair may have touched them — and report a regression in newDefects:\n${list(replay, 'replay')}\n` : ''}Spec: ${SPEC}. The result lives in ${W} (branch ${BR}). ${changes}
${isTester ? `Start the result from ${inSub(W)} on your own ports (it lacks its dependencies → ${PREPARE}).
${BROWSER_RULE(`spec-first-${k}-r${round}`)}` : 'Never use the browser tools.'}
${isTester && round > 0 && k === firstTester && testCommand ? `The repair is done: run the full suite once, in the background, \`${suiteCommand(inSub(W), suitePath(`apres-reparation-${round}`), testCommand)}\`, and read it before you return — a test failing now is in newDefects.\n` : ''}newDefects: only what the repair itself broke, proven. Do not edit any tracked file. ${portRule(40 + 10 * round + [...bySource.keys()].indexOf(k))}${isTester && RESOURCES.length ? `
You hold the exclusive resource(s) ${RESOURCES.map(x => `« ${x} »`).join(', ')} for this task.` : ''}

${COMMON_RULES}`
    return ask(prompt, { ...REVIEWER, schema: REJUDGE_SCHEMA, phase: 'Réparation', locks: isTester ? locksFor(fs.map(f => f.criterion).concat(replay.map(c => c.id))) : [], label: `${round > 0 ? `Après réparation ${round}` : 'Rejugement'} — ${labelOf(k)} (${REVIEWER.model} ${REVIEWER.effort})` })
      .then(r => ({ k, fs, r }))
  })
  const outs = await parallel(jobs)
  const fresh = []
  for (const o of outs) {
    if (!o) continue
    if (!o.r) { for (const f of o.fs) f.unanswered = (f.unanswered || 0) + 1; continue }
    for (const x of o.r.results || []) {
      const f = o.fs.find(y => y.n === Number(x.n))
      if (!f) continue
      f.votes = f.votes || {}
      f.votes[o.k] = { fixed: !!x.fixed && !x.unverifiable, unverifiable: !!x.unverifiable, proof: x.proof }
    }
    for (const d of o.r.newDefects || []) fresh.push({ ...d, criterion: byId[d.criterion] ? d.criterion : GENERAL, from: [o.k], n: findings.length + fresh.length + 1, fromRepair: round })
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
  if (ci.started) for (const d of await ciRead('après la revue', false)) findings.push({ ...d, n: findings.length + 1 })
  for (let round = 0; round < REPAIR_EFFORTS.length && toFix().length; round++) {
    if (overBudget(`la réparation ${round + 1}`)) break
    // A CI still running holds its verdict: the repair waits for it (the review stops and is resumed).
    if (ciWait) break
    phase('Réparation')
    const batch = toFix()
    const effort = REPAIR_EFFORTS[round]
    const dev = await ask(`You are the developer repairing the review of a spec, round ${round + 1} of at most ${REPAIR_EFFORTS.length}. A panel (six reviewers, live testers${ci.started ? ', the CI' : ''}) proved the defects below on the result. Repair them all, at their root, without breaking any criterion.

Spec: ${SPEC} — read it first.
${list(CRITERIA)}
<defects>
${batch.map(f => `[${f.n}] (critère ${f.criterion}, ${f.severity}, relevé par ${f.from.map(labelOf).join(', ')}) ${f.title}\n${f.proof}`).join('\n\n')}
</defects>
Work in ${W} (branch ${BR}) — every file you edit is under it, never under ${ROOT}. ${changes}
Before touching code, for each defect: a slip (fix the cause) or an approach that cannot hold (take another, never a second patch on it), or the environment (fix the configuration, no code).
Re-run each reproduction and the targeted tests${quickTestCommand ? ` (\`${quickTestCommand}\`)` : ''}${SUBDIR ? ` from ${SUBDIR}` : ''} before returning; never the full suite. Then commit on ${BR}. Commit hooks always run, never --no-verify; one fails for a reason outside your changes → "blocker" starting with "TECHNIQUE:".
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
    const fresh = await rejudge(batch, round + 1, dev.summary)
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
function settle() {
  open = toFix()
  status = {}
  for (const c of CRITERIA) {
    const v = verdicts[c.id]
    const mine = open.filter(f => f.criterion === c.id)
    const by = [...new Set(mine.flatMap(f => f.from.map(s => s.startsWith('tester') ? 'tester' : s)))]
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
    else if (!v) status[c.id] = { status: 'unverified', reason: `aucun verdict du ${labelOf(testerOf[c.id])}` }
    else if (v.verdict === 'unverifiable') status[c.id] = { status: 'unverified', reason: v.proof }
    else if (v.verdict === 'defect' && !repairedHere.length) status[c.id] = { status: 'failed', reason: v.proof, rejectedBy: ['tester'] }
    else status[c.id] = { status: 'validated', proof: v.verdict === 'pass' ? v.proof : `réparé : ${repairedHere.map(f => f.fixedProof).join(' / ')}` }
  }
  openGeneral = open.filter(f => f.criterion === GENERAL)
  reviewPass = !stopped && !ciWait && !silent.length && CRITERIA.every(c => status[c.id].status === 'validated') && !openGeneral.length
}
settle()
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
  else if (!reviewPass) hold('la revue ne passe pas encore.', 'attente')
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
          const effort = ['medium', 'high', 'xhigh'][round]
          last = await ask(`You are the PUBLISHER of a spec, round ${round + 1} of at most 3. The whole spec passed its review. ${authorized()}
Apply exactly them, in their order, to the result: ${W} (branch ${BR}) — never the project at ${ROOT} itself.${ci.started ? ` The branch was pushed as ${ci.ref}${ci.mr ? `, draft merge request ${ci.mr}` : ''}: reuse them.` : ''}
Criteria the publication must make true — a tester checks them from outside once you are done:
${list(pubCriteria, 'publication_criteria')}
${feedback}
- An action needs a commit (version, changelog) → commit it there; nothing else. Hooks always run.
- glab, gh, the registry's tool or the API, non-interactively. Never force-push, never rewrite history, nothing outside the list.
- Never wait for anything outside this machine (a pipeline, a registry, a human review, a deployment): start it, return "waiting" with what, where (a URL) and one read-only check command. Already finished → go on. A machine failure (disk full, no runner) → retry once, then "unavailable" with cause, job, runner, unblock. A code failure → "failed" with the proof; never patch code here.
- An access is missing → "blocked", the access in reason. Already done by an earlier round → keep it.${WAIT_ROUND ? `
- Resumed after waiting outside (resume ${WAIT_ROUND}): first look at what was awaited, then go on.` : ''}
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
const focusOf = f => [...new Set(f.from.map(s => s === 'ci' || s.startsWith('tester') ? 'tester' : s))].map(r => ({ ...(byId[f.criterion] ? { id: f.criterion } : {}), reviewer: r, finding: `${f.title} — ${f.proof}`.slice(0, 1500) }))
const waitingOut = externalWait ? {
  kind: externalWait.kind, what: externalWait.what, where: externalWait.where, check: externalWait.check,
  limitMinutes: CI_WAIT_MIN, waitRound: WAIT_ROUND + 1,
  waitAt: externalWait.kind === 'ci' && ci.pendingAt ? { ...WAIT_AT, [ci.pendingAt]: WAIT_ROUND + 1 } : { ...WAIT_AT },
  resume: `relancer cette revue avec resumeFromRunId, les mêmes args, waitRound: ${WAIT_ROUND + 1} et waitAt: ${JSON.stringify(externalWait.kind === 'ci' && ci.pendingAt ? { ...WAIT_AT, [ci.pendingAt]: WAIT_ROUND + 1 } : WAIT_AT)}, une fois l'attente finie (ou après ${CI_WAIT_MIN} min)`,
} : null
// Each criterion still failing: what to relaunch in a development run, then this review with focus.
// The in-run critics of spec-first:run are tester, owner and maintainer: every other reviewer maps to the maintainer.
const inRun = k => k === 'tester' || k === 'owner' ? k : 'maintainer'
const relaunch = criteria.filter(c => c.status === 'failed').map(c => ({ id: c.id, rejectedBy: { critics: [...new Set((c.rejectedBy || []).map(inRun))], proof: c.reason }, focus: open.filter(f => f.criterion === c.id).flatMap(focusOf) }))
log(`Fin de la revue : ${counts.validated}/${counts.total} validé(s)${counts.failed ? `, ${counts.failed} en échec` : ''}${counts.unverified ? `, ${counts.unverified} non vérifié(s)` : ''}${counts.blocked ? `, ${counts.blocked} bloqué(s)` : ''}${openGeneral.length ? `, ${openGeneral.length} défaut(s) général(aux) ouvert(s)` : ''} · ${findings.filter(f => f.fixed).length} défaut(s) réparé(s) en ${repairRounds} essai(s)${stopped ? ` — arrêt avant la fin (${stopped})` : ''}`)

const FR = { validated: 'validé', unverified: 'non vérifié', failed: 'en échec', blocked: 'bloqué', crashed: 'en panne' }
const stateText = [
  `# spec-first — état de la revue de ${SPEC_ID}`,
  '',
  `Étape : ${waitingOut ? 'en attente externe' : stopped ? 'arrêtée avant la fin' : silent.length ? `incomplète, sans réponse de ${silent.join(', ')}` : 'revue terminée'}`,
  `Profil : ${PROFIL}`,
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
  profil: PROFIL,
}
