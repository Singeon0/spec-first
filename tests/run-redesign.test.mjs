// The run after the redesign of 26/11/2026 (notes/refonte-2026-11-26.md, 3.1 to 3.4, run side): one
// profile — Opus, high at least —; no panel of critics, only one tester for the socle; the quick suite
// once at the end through the suite command, never by developers or fusions; a run that resumes from
// git — an inventory first, a fixed integration branch, the criteria its trailers list skipped.
// Played with fake agents whose answers each test chooses (measure.mjs for the fixture of kipp).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const here = new URL('.', import.meta.url).pathname
const SRC = readFileSync(new URL('../workflows/run.js', import.meta.url), 'utf8').replace(/^export const meta/m, 'const meta')
const META = new Function(SRC.split('\n// ----')[0] + '\nreturn meta')()

const ROOT = '/tmp/sf-proj'
const SUITE = ROOT + '/.spec-first/bin/suite'
const BASE_ARGS = {
  specPath: ROOT + '/specs/alpha.md', projectRoot: ROOT, baseCommit: 'abcdef1234567',
  criteria: [{ id: '1', text: 'socle: a contract' }, { id: '2', text: 'uses 1' }, { id: '3', text: 'also uses 1' }, { id: '4', text: 'independent' }],
  dependsOn: { 2: ['1'], 3: ['1'] },
  quickTestCommand: 'make quick', setupCommand: 'make env',
}
const EMPTY = /^(blocker|reason|note|why|cause|setAside|preexisting)$/
function fake(schema, key, next) {
  if (!schema) return null
  if (schema.enum) return schema.enum.includes('pass') ? 'pass' : schema.enum[0]
  switch (schema.type) {
    case 'object': {
      const o = {}
      for (const k of schema.required || Object.keys(schema.properties || {})) o[k] = fake((schema.properties || {})[k], k, next)
      return o
    }
    case 'array': return []
    case 'boolean': return !/^(reused|mergeAborted)$/.test(key)
    case 'integer': case 'number': return 0
    default:
      if (key === 'workspace') return ROOT + '/.spec-first/copies/c' + next() + '/wt'
      if (key === 'branch') return 'spec-first-fake'
      return EMPTY.test(key) ? '' : 'ran it: ok'
  }
}
// answer(call) → an object to return, undefined for the default « all good » answer.
async function play(over = {}, answer = () => undefined) {
  const calls = [], logs = []
  let n = 0
  const g = globalThis
  g.args = { ...BASE_ARGS, ...over }
  g.log = m => logs.push(String(m))
  g.phase = () => {}
  g.parallel = jobs => Promise.all(jobs.map(j => j()))
  g.agent = async (prompt, o = {}) => {
    const call = { label: o.label || '', phase: o.phase || '', model: o.model, effort: o.effort, prompt }
    calls.push(call)
    const a = await answer(call, calls)
    if (a !== undefined) return a
    const v = fake(o.schema, '', () => ++n)
    if (o.phase === 'Inventaire') v.workspace = ROOT + '/.spec-first/copies/alpha--integration-x/wt'
    return v
  }
  const result = await new Function('return (async () => {\n' + SRC + '\n})()')()
  return { result, calls, logs, find: re => calls.filter(c => re.test(c.label)) }
}
const sleep = ms => new Promise(r => setTimeout(r, ms))
const devOf = (calls, id) => calls.filter(c => c.phase === 'Développement' && c.prompt.includes('<criterion id="' + id + '">'))

test('one profile: every agent is Opus, effort high or xhigh — kipp fixture, happy path and every verdict failing once', () => {
  for (const flags of [[], ['--reject']]) {
    const m = JSON.parse(execFileSync('node', [here + 'measure.mjs', 'run', 'fixtures/run-qualispectra-sprint6.json', '--json', ...flags], { encoding: 'utf8', cwd: here }))
    assert.equal(m.error, undefined, m.error)
    assert.ok(m.calls.length > 5)
    for (const c of m.calls) {
      assert.equal(c.model, 'opus', flags + ' ' + c.label)
      assert.ok(['high', 'xhigh'].includes(c.effort), flags + ' ' + c.label + ' ' + c.effort)
    }
  }
  assert.doesNotMatch(JSON.stringify(META), /Sonnet|Haiku/)
  assert.deepEqual(META.phases.map(p => p.title), ['Inventaire', 'Développement', 'Critique du socle', 'Fusion', 'Batterie rapide'])
})

test('profil, simples and finalCheck are accepted and ignored, each with a log line; no light check', async () => {
  const { calls, logs } = await play({ profil: 'rapide', simples: ['4'], finalCheck: 'light' })
  for (const c of calls) assert.ok(c.model === 'opus' && ['high', 'xhigh'].includes(c.effort), c.label)
  assert.ok(logs.some(l => l.startsWith('profil ignoré')))
  assert.ok(logs.some(l => l.startsWith('simples ignoré')))
  assert.ok(logs.some(l => l.startsWith('finalCheck ignoré')))
  assert.ok(!calls.some(c => /Contrôle léger|propriétaire|mainteneur|intégrateur/.test(c.label)))
})

test('developers start high and go xhigh after a failed self-check; a pass without its command is not done; startEffort below high is raised', async () => {
  const { calls, logs, result } = await play({ startEffort: { 2: 'medium' } }, c => {
    if (c.label.startsWith('Groupe') && c.label.includes('dév essai 1') && c.prompt.includes('<criterion id="4">')) {
      return { workspace: ROOT + '/.spec-first/copies/g4/wt', branch: 'b4', changed: true, files: ['a.py'], summary: 's', triage: [], selfCheck: { 4: { status: 'fail', evidence: 'pytest tests/test_a.py: 1 failed' } }, decisions: [], blocker: '' }
    }
    if (c.label.startsWith('Groupe') && c.label.includes('dév essai 1') && c.prompt.includes('<criterion id="2">')) {
      return { workspace: ROOT + '/.spec-first/copies/g2/wt', branch: 'b2', changed: true, files: [], summary: 's', triage: [], selfCheck: { 2: { status: 'pass', evidence: '' } }, decisions: [], blocker: '' }
    }
  })
  const d4 = devOf(calls, '4')
  assert.deepEqual(d4.map(c => c.effort), ['high', 'xhigh'])
  assert.ok(d4[1].prompt.includes('pytest tests/test_a.py: 1 failed'), 'his own evidence comes back')
  assert.deepEqual(devOf(calls, '2').map(c => c.effort), ['high', 'xhigh'])
  assert.ok(logs.some(l => l.includes('relevé à high')))
  assert.equal(result.criteria.find(c => c.id === '4').status, 'unverified')
})

test('only the socle gets a critic — one tester, Opus high, before its fusion; the others come back « non vérifié »', async () => {
  const { calls, result } = await play()
  const critics = calls.filter(c => c.phase === 'Critique du socle')
  assert.equal(critics.length, 1)
  assert.ok(critics[0].prompt.includes('<criterion id="1">') && critics[0].prompt.includes('You are the TESTER'))
  assert.deepEqual([critics[0].model, critics[0].effort], ['opus', 'high'])
  const fusion1 = calls.findIndex(c => c.phase === 'Fusion' && c.prompt.includes('Spec-First-Validated: 1"'))
  assert.ok(fusion1 > calls.indexOf(critics[0]), 'critic before the fusion')
  const st = Object.fromEntries(result.criteria.map(c => [c.id, c]))
  assert.equal(st['1'].status, 'validated')
  for (const id of ['2', '3', '4']) { assert.equal(st[id].status, 'unverified', id); assert.equal(st[id].selfOnly, true, id) }
  assert.equal(result.reviewReady, true)
  assert.ok(result.groups.find(g => g.criteria.includes('1')).socle)
})

test('a socle rejection → one more developer round in xhigh, then the critic again; a second rejection is final', async () => {
  const { calls, result } = await play({}, c => {
    if (c.phase === 'Critique du socle') return { verdicts: { 1: { verdict: 'defect', proof: 'curl /contract → 500', cause: 'code' } }, outsideSpec: [] }
  })
  const d1 = devOf(calls, '1')
  assert.deepEqual(d1.map(c => c.effort), ['high', 'xhigh'])
  assert.ok(d1[1].prompt.includes('curl /contract → 500') && d1[1].prompt.includes('"triage"'))
  assert.equal(calls.filter(c => c.phase === 'Critique du socle').length, 2)
  const st = Object.fromEntries(result.criteria.map(c => [c.id, c]))
  assert.equal(st['1'].status, 'failed')
  assert.deepEqual(st['1'].rejectedBy, ['tester'])
  for (const id of ['2', '3']) assert.equal(st[id].kind, 'attente', id)
})

test('the inventory comes first; a missing suite command stops the run at once', async () => {
  const { calls, result } = await play({}, c => {
    if (c.phase === 'Inventaire') return { suite: 'missing', recorded: [], workspace: '', branch: '', reused: false, setAside: '', integrated: [], reason: '' }
  })
  assert.equal(calls.length, 1)
  assert.match(result.stopped, /bin\/suite/)
  assert.match(result.resume.relaunch, /sans resumeFromRunId/)
  assert.equal(result.reviewReady, false)
  for (const c of result.criteria) assert.equal(c.status, 'blocked', c.id)
})

test('the inventory records only the commands given, each in a quoted heredoc, and uses the fixed integration branch', async () => {
  const full = await play({ testCommand: 'make all', heavy: { 4: 'make e2e' }, subdir: 'api' })
  const inv = full.calls[0]
  assert.equal(inv.phase, 'Inventaire')
  for (const [name, cmd] of [['quick', 'make quick'], ['full', 'make all'], ['heavy:4', 'make e2e'], ['setup', 'make env'], ['subdir', 'api']]) {
    assert.ok(inv.prompt.includes(SUITE + ' set ' + name + " <<'SPEC_FIRST_EOF'\n" + cmd + '\nSPEC_FIRST_EOF'), name)
  }
  assert.ok(inv.prompt.includes('spec-first-alpha--integration') && inv.prompt.includes('merge-base --is-ancestor abcdef1234567'))
  assert.equal(full.result.inventory.branch, 'spec-first-alpha--integration')
  const bare = await play({ quickTestCommand: undefined, setupCommand: undefined })
  assert.doesNotMatch(bare.calls[0].prompt, / set (quick|full|setup|subdir|heavy)/)
  const over = await play({ integrationBranch: 'spec-first-alpha--integration-Ab12' })
  assert.ok(over.calls[0].prompt.includes('refs/heads/spec-first-alpha--integration-Ab12'))
  assert.doesNotMatch(over.calls[0].prompt, /branch -m/)
})

test('criteria already integrated (Spec-First-Validated) are skipped, by id; one relaunched on purpose is developed again', async () => {
  const { calls, logs, result } = await play({ rejectedBy: { 4: { critics: ['owner'], proof: 'le bouton reste grisé' } } }, c => {
    if (c.phase === 'Inventaire') return { suite: 'ok', recorded: { reset: true, quick: true, setup: true }, workspace: ROOT + '/.spec-first/copies/alpha--integration-x/wt', branch: 'spec-first-alpha--integration', reused: true, setAside: '', mergeAborted: false, uncommitted: [], integrated: ['1', '4'], integratedHere: [], reason: '' }
  })
  assert.equal(devOf(calls, '1').length, 0)
  assert.ok(devOf(calls, '4')[0].prompt.includes('le bouton reste grisé'), 'the proof reaches the developer at once')
  assert.deepEqual(result.skipped, ['1'])
  const one = result.criteria.find(c => c.id === '1')
  assert.equal(one.status, 'unverified')
  assert.equal(one.alreadyIntegrated, true)
  assert.ok(logs.some(l => l.startsWith('Reprise depuis git')))
  assert.ok(devOf(calls, '2').length && devOf(calls, '3').length, 'what built on it starts at once')
  assert.equal(calls.filter(c => c.phase === 'Critique du socle').length, 0)
  assert.equal(result.result.in, 'integration')
})

test('developers never run a whole suite; a heavy criterion runs its own once; every commit carries its criterion trailer', async () => {
  const { calls } = await play({ heavy: { 4: 'make e2e' }, testCommand: 'make all' })
  const devs = calls.filter(c => c.phase === 'Développement')
  assert.ok(devs.length >= 4)
  for (const c of devs) {
    assert.match(c.prompt, /run only the tests of what you touch/)
    assert.ok(!c.prompt.includes('make quick') && !c.prompt.includes('make all'), c.label)
    assert.match(c.prompt, /--trailer "Spec-First-Criterion: \d"/)
  }
  const d4 = devOf(calls, '4')[0]
  assert.ok(d4.prompt.includes(SUITE + ' heavy:4') && /Run it once, after your last commit/.test(d4.prompt))
  for (const c of devs.filter(c => c !== d4)) assert.ok(!c.prompt.includes('heavy:'), c.label)
})

test('fusions write Spec-First-Validated, test only the files changed on both sides, never the quick suite', async () => {
  const { calls } = await play()
  const fusions = calls.filter(c => /^Fusion groupe/.test(c.label))
  assert.ok(fusions.length >= 3)
  for (const c of fusions) {
    assert.match(c.prompt, /trailer lines: "Spec-First-Validated: \d[^"]*" and "Spec-First-Run: [0-9a-z]+"/)
    assert.ok(c.prompt.includes('merge --no-ff -m "spec-first : groupe <N>" -m "$(printf \'Spec-First-Validated: <ids>\\nSpec-First-Run: '))
    assert.ok(c.prompt.includes('commit --allow-empty'))
    assert.ok(c.prompt.includes('git commit --no-edit --cleanup=strip'), 'a conflict merge keeps its trailers last')
    assert.ok(c.prompt.includes('changed on both sides'))
    assert.ok(!c.prompt.includes('make quick'), c.label)
  }
})

test('groups done during a fusion still go together in the next one', async () => {
  const { calls } = await play({ criteria: [{ id: '1', text: 'a' }, { id: '2', text: 'b' }, { id: '3', text: 'c' }], dependsOn: undefined }, async c => {
    if (c.label.startsWith('Fusion groupe 1 ')) await sleep(30)
  })
  const batch = calls.find(c => /^Fusion groupes 2, 3/.test(c.label))
  assert.ok(batch, calls.map(c => c.label).join(' | '))
  assert.ok(batch.prompt.includes('once for the whole batch'))
})

test('the quick suite runs once at the end, through the suite command; red → at most two xhigh repairs, then its criteria fail', async () => {
  const red = { status: 'fail', key: 'quick-k', output: 'FAIL key=quick-k\ntest_x: AssertionError', broken: ['4'] }
  const { calls, result } = await play({}, c => {
    if (c.phase === 'Batterie rapide' && c.label.startsWith('Batterie rapide')) return red
    if (c.label.startsWith('Réparation (batterie rapide)')) return { workspace: ROOT + '/i', branch: 'b', changed: true, files: ['x.py'], summary: 's', suite: 'fail', output: 'FAIL key=quick-k2\ntest_x: still', broken: ['4'], preexisting: '', decisions: [], blocker: '' }
  })
  const suite = calls.filter(c => c.label.startsWith('Batterie rapide ('))
  assert.equal(suite.length, 1)
  assert.equal(calls.filter(c => c.label.startsWith('Batterie rapide — relecture')).length, 2, 'read again after each repair')
  assert.ok(suite[0].prompt.includes(SUITE + ' quick') && suite[0].prompt.includes(SUITE + ' wait <key>'))
  const repairs = calls.filter(c => c.label.startsWith('Réparation (batterie rapide)'))
  assert.equal(repairs.length, 2)
  for (const r of repairs) assert.deepEqual([r.model, r.effort], ['opus', 'xhigh'])
  assert.ok(repairs[0].prompt.includes('test_x: AssertionError'))
  const four = result.criteria.find(c => c.id === '4')
  assert.equal(four.status, 'failed')
  assert.match(four.reason, /batterie rapide rouge/)
  assert.equal(result.finalCheck.status, 'fail')
  assert.deepEqual(result.finalCheck.failing, ['4'])
  assert.equal(result.finalCheck.repairs, 2)
  assert.equal(result.reviewReady, false)
  const green = await play({}, c => {
    if (c.label.startsWith('Batterie rapide — relecture')) return { status: 'pass', key: 'quick-k3', output: 'PASS key=quick-k3', broken: [] }
    if (c.label.startsWith('Batterie rapide')) return red
    if (c.label.startsWith('Réparation (batterie rapide)')) return { workspace: ROOT + '/i', branch: 'b', changed: true, files: [], summary: 's', preexisting: '', decisions: [], blocker: '' }
  })
  assert.equal(green.find(/^Réparation \(batterie rapide\)/).length, 1)
  assert.equal(green.result.finalCheck.status, 'pass')
  assert.equal(green.result.reviewReady, true)
})

test('no quickTestCommand: the end of the run says so and runs nothing in its place', async () => {
  const { calls, result } = await play({ quickTestCommand: undefined })
  assert.equal(calls.filter(c => c.phase === 'Batterie rapide').length, 0)
  assert.equal(result.finalCheck.status, 'none')
  assert.match(result.check, /pas de quickTestCommand/)
})

test('stopped on its budget: resume says to relaunch with the same args, read from git', async () => {
  let spent = 0
  globalThis.budget = { spent: () => spent, total: 10000 }
  try {
    const { result } = await play({}, () => { spent += 1500 })
    assert.match(result.stopped, /budget/)
    assert.match(result.resume.relaunch, /mêmes args/)
    assert.equal(result.resume.integrationBranch, 'spec-first-alpha--integration')
  } finally { delete globalThis.budget }
})

// ---------------------------------------------------------------- defects proved by the review of step 1

const INTEG = ROOT + '/.spec-first/copies/alpha--integration-x/wt'
const invAnswer = over => ({ suite: 'ok', recorded: { reset: true, quick: true, setup: true }, workspace: INTEG, branch: 'spec-first-alpha--integration', reused: true, setAside: '', mergeAborted: false, uncommitted: [], integrated: [], integratedHere: [], reason: '', ...over })
const sh = (cwd, cmd) => execFileSync('bash', ['-c', cmd], { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.invalid' } })

test('a criterion relaunched on purpose is skipped only on a trailer of this very run', async () => {
  const relaunch = { rejectedBy: { 4: { proof: 'le bouton reste grisé' } } }
  const earlier = await play(relaunch, c => c.phase === 'Inventaire' ? invAnswer({ integrated: ['1', '4'] }) : undefined)
  assert.ok(devOf(earlier.calls, '4').length, 'an earlier run merged the rejected version: developed again')
  assert.deepEqual(earlier.result.skipped, ['1'])
  const same = await play(relaunch, c => c.phase === 'Inventaire' ? invAnswer({ integrated: ['1', '4'], integratedHere: ['4'] }) : undefined)
  assert.equal(devOf(same.calls, '4').length, 0, 'this very run merged its rework: skipped')
  assert.deepEqual(same.result.skipped, ['1', '4'])
  const tag = same.result.inventory.runTag
  assert.ok(tag && same.calls[0].prompt.includes("--grep='^Spec-First-Run: " + tag + "$'"))
})

test('git: « already merged? » ignores an earlier run\'s trailer, the merge writes this run\'s, the inventory reads it back', async () => {
  const { calls, result } = await play({}, c => c.phase === 'Inventaire' ? invAnswer({ reused: false }) : undefined)
  const tag = result.inventory.runTag
  const fusion = calls.find(c => c.phase === 'Fusion' && c.label.startsWith('Fusion groupe'))
  const step2a = fusion.prompt.match(/\`(git -C \S+ log --format=%B \$\(git -C \S+ merge-base HEAD <br>\)\.\.HEAD \| grep '\^Spec-First-Validated:')\`/)[1]
  const merge = fusion.prompt.match(/\`(git -C \S+ merge --no-ff -m "spec-first : groupe <N>" -m "\$\(printf '[^']+'\)" <br>)\`/)[1]
  const here = calls[0].prompt.match(/\`(git -C <the copy> log --format=%B --grep='[^']+' \S+\.\.HEAD \| grep '\^Spec-First-Validated:')\`/)[1]
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'sf-run-git-')))
  sh(dir, 'git init -q p && cd p && echo a > f && git add f && git commit -qm base')
  const p = dir + '/p', integ = dir + '/integ'
  const base = sh(p, 'git rev-parse HEAD').trim()
  sh(p, 'git worktree add -q -b spec-first-alpha--integration ' + integ + ' ' + base)
  // an earlier run merged criterion 4 (another tag); the review rejected it; this run reworks it
  sh(p, 'git checkout -q -b g4 ' + base + ' && echo v1 > four && git add four && git commit -qm "dev 4" && git checkout -q -')
  sh(p, 'git -C ' + integ + ' merge -q --no-ff -m "spec-first : groupe 1" -m "$(printf \'Spec-First-Validated: 4\\nSpec-First-Run: older\')" g4')
  sh(p, 'git worktree add -q -b g4b ' + dir + '/g4b spec-first-alpha--integration && echo v2 > ' + dir + '/g4b/four && git -C ' + dir + '/g4b commit -qam "rework 4"')
  const run = cmd => sh(p, cmd.replaceAll(INTEG, integ).replaceAll('<br>', 'g4b').replaceAll('<N>', '2').replaceAll('<ids>', '4').replaceAll('<the copy>', integ).replaceAll('abcdef1234567', base) + ' || true')
  assert.equal(run(step2a).trim(), '', 'the old line does not count: the rework is merged')
  run(merge)
  assert.equal(readFileSync(integ + '/four', 'utf8').trim(), 'v2')
  assert.match(run(step2a), /^Spec-First-Validated: 4$/m, 'after the merge it is found')
  assert.equal(run(here).trim(), 'Spec-First-Validated: 4', 'the inventory reads only this run\'s line: ' + tag)
})

test('a red suite is never erased by a reading without a verdict; no verdict → no review', async () => {
  const red = { status: 'fail', key: 'k', output: 'FAIL key=k test_4', broken: ['4'] }
  const repair = { workspace: ROOT + '/i', branch: 'b', changed: true, files: ['x'], summary: 's', preexisting: '', decisions: [], blocker: '' }
  for (const [name, reread, rep] of [
    ['refused', { status: 'refused', key: 'k2', output: 'REFUSED uncommitted changes', broken: [] }, repair],
    ['lost', { status: 'lost', key: 'k2', output: 'LOST', broken: [] }, repair],
    ['silent reader', null, repair],
    ['silent repairer', red, null],
  ]) {
    const { result } = await play({}, c => {
      if (c.label.startsWith('Batterie rapide — relecture')) return reread
      if (c.label.startsWith('Batterie rapide')) return red
      if (c.label.startsWith('Réparation (batterie rapide)')) return rep
    })
    assert.equal(result.finalCheck.status, 'fail', name)
    assert.deepEqual(result.finalCheck.failing, ['4'], name)
    assert.equal(result.criteria.find(c => c.id === '4').status, 'failed', name)
    assert.equal(result.reviewReady, false, name)
  }
  for (const [name, first] of [['refused', { status: 'refused', key: 'k', output: 'REFUSED src/new.py', broken: [] }], ['lost', { status: 'lost', key: 'k', output: 'LOST', broken: [] }], ['crashed', null]]) {
    const { result } = await play({}, c => c.label.startsWith('Batterie rapide') ? first : undefined)
    assert.equal(result.finalCheck.status, name)
    assert.equal(result.reviewReady, false, name)
    assert.match(result.check, /pas de revue sans verdict/)
  }
})

test('only the high helper\'s reading counts, never the repair\'s own claim', async () => {
  const red = { status: 'fail', key: 'k', output: 'FAIL key=k test_4', broken: ['4'] }
  const { calls, result } = await play({}, c => {
    if (c.label.startsWith('Batterie rapide')) return red
    if (c.label.startsWith('Réparation (batterie rapide)')) return { workspace: ROOT + '/i', branch: 'b', changed: true, files: ['x'], summary: 's', suite: 'pass', output: 'PASS', broken: [], preexisting: '', decisions: [], blocker: '' }
  })
  const reads = calls.filter(c => c.label.startsWith('Batterie rapide — relecture'))
  assert.equal(reads.length, 2)
  for (const r of reads) assert.deepEqual([r.model, r.effort], ['opus', 'high'])
  assert.equal(result.finalCheck.status, 'fail')
  assert.equal(result.finalCheck.readings, 3)
})

test('the inventory resets the suite command first, and the run stops when a command it asked for was not recorded', async () => {
  const { calls } = await play({ testCommand: 'make all', subdir: 'api' })
  const inv = calls[0].prompt
  assert.ok(inv.indexOf(SUITE + ' reset') >= 0 && inv.indexOf(SUITE + ' reset') < inv.indexOf(SUITE + ' set quick'))
  for (const [name, rec] of [['subdir missing', { reset: true, quick: true, setup: true, full: true }], ['no reset', { quick: true, setup: true, full: true, subdir: true }], ['old array form', ['quick', 'setup', 'full', 'subdir']]]) {
    const r = await play({ testCommand: 'make all', subdir: 'api' }, c => c.phase === 'Inventaire' ? invAnswer({ recorded: rec }) : undefined)
    assert.equal(r.calls.length, 1, name)
    assert.match(r.result.stopped, /non enregistrée/, name)
    assert.match(r.result.resume.relaunch, /sans resumeFromRunId/, name)
  }
})

test('an inventory that never answers stops the run with a way back, never an args error', async () => {
  for (const over of [{}, { integrationBranch: 'spec-first-alpha--integration-Ab12' }]) {
    const { calls, result } = await play(over, c => c.phase === 'Inventaire' ? null : undefined)
    assert.equal(result.error, undefined)
    assert.equal(calls.filter(c => c.phase !== 'Inventaire').length, 0)
    assert.match(result.stopped, /inventaire n'a pas répondu/)
    assert.match(result.resume.relaunch, /mêmes args et le même baseCommit, sans resumeFromRunId/)
    assert.equal(result.reviewReady, false)
  }
})

test('a suite refused for leftovers can be cleared through info/exclude, never .gitignore; source files are reported', async () => {
  const { calls } = await play({}, c => {
    if (c.label.startsWith('Batterie rapide —')) return { status: 'pass', key: 'k', output: 'PASS', broken: [] }
    if (c.label.startsWith('Batterie rapide')) return { status: 'fail', key: 'k', output: 'FAIL', broken: ['4'] }
  })
  const readers = calls.filter(c => c.label.startsWith('Batterie rapide'))
  const repairs = calls.filter(c => c.label.startsWith('Réparation (batterie rapide)'))
  assert.ok(readers.length === 2 && repairs.length === 1)
  for (const c of [...readers, ...repairs]) {
    assert.ok(c.prompt.includes('rev-parse --git-path info/exclude'), c.label)
    assert.ok(c.prompt.includes('never .gitignore, never delete them'), c.label)
  }
  for (const c of readers) assert.match(c.prompt, /Untracked source files, or tracked files changed → never commit, hide or discard them: status refused/)
})

test('a reused integration copy is checked: a stale merge aborted, uncommitted changes stop the run', async () => {
  const { calls } = await play()
  assert.match(calls[0].prompt, /rev-parse -q --verify MERGE_HEAD/)
  assert.match(calls[0].prompt, /merge --abort\` \(the committed history stays as it is\)/)
  assert.match(calls[0].prompt, /status --porcelain/)
  const aborted = await play({}, c => c.phase === 'Inventaire' ? invAnswer({ mergeAborted: true }) : undefined)
  assert.ok(aborted.logs.some(l => l.includes('merge en cours — annulé')))
  assert.equal(aborted.result.inventory.mergeAborted, true)
  assert.equal(aborted.result.stopped, '')
  const dirty = await play({}, c => c.phase === 'Inventaire' ? invAnswer({ uncommitted: [' M src/api.py'] }) : undefined)
  assert.equal(dirty.calls.length, 1)
  assert.match(dirty.result.stopped, /non commités \( M src\/api\.py\)/)
  assert.match(dirty.result.resume.relaunch, /^commiter ou écarter/)
})

test('the fusion writes code under the test rules', async () => {
  const { calls } = await play()
  const fusions = calls.filter(c => c.phase === 'Fusion' && c.label.startsWith('Fusion'))
  assert.ok(fusions.length)
  for (const c of fusions) {
    assert.ok(c.prompt.includes('a test deleted, skipped or loosened (an assertion removed or widened) when no criterion asks for it'), c.label)
    assert.ok(c.prompt.includes('never skip it, never add a sleep, never rerun it until it passes'), c.label)
  }
})

test('a spec name longer than 40 characters keeps a short, unique id', async () => {
  const name = 'sprint7-collaboration-temps-reel-annotations-'
  const a = await play({ specPath: ROOT + '/specs/' + name + 'serveur.md' })
  const b = await play({ specPath: ROOT + '/specs/' + name + 'client.md' })
  assert.notEqual(a.result.specId, b.result.specId)
  for (const r of [a, b]) {
    assert.match(r.result.specId, /^sprint7-collaboration-temps-reel-[0-9a-z]+$/)
    assert.equal(r.result.inventory.branch, 'spec-first-' + r.result.specId + '--integration')
  }
  const short = await play({ specPath: ROOT + '/specs/alpha-beta.md' })
  assert.equal(short.result.specId, 'alpha-beta')
})

test('a group others depend on is merged alone, first', async () => {
  // 1 is the socle (2 and 3 build on it); 4 and 5 are independent. 4 merges first, slowly: 1 and 5 wait.
  const { calls } = await play({ criteria: [...BASE_ARGS.criteria, { id: '5', text: 'independent too' }], maxGroups: 3 }, async (c, all) => {
    if (c.phase === 'Fusion' && c.label.startsWith('Fusion') && !all.some(x => x !== c && x.phase === 'Fusion')) await sleep(30)
  })
  assert.ok(!calls.some(c => /relance/.test(c.label)), 'no agent failed')
  const fusions = calls.filter(c => c.phase === 'Fusion' && c.label.startsWith('Fusion'))
  const withSocle = fusions.find(c => c.prompt.includes('"Spec-First-Validated: 1"'))
  assert.ok(withSocle, fusions.map(c => c.label).join(' | '))
  assert.match(withSocle.label, /^Fusion groupe \d+ /, 'alone: ' + withSocle.label)
})

test('a stopped run says to relaunch with the same args, never resumeFromRunId', async () => {
  let spent = 0
  globalThis.budget = { spent: () => spent, total: 10000 }
  try {
    const { result } = await play({}, () => { spent += 1500 })
    assert.match(result.resume.relaunch, /sans resumeFromRunId/)
    assert.match(result.state.text, /Reprendre : .*sans resumeFromRunId/)
  } finally { delete globalThis.budget }
})
