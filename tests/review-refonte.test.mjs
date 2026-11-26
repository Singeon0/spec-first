// Refonte, étape 1 (26/11/2026), review side — notes/refonte-2026-11-26.md, sections 3.1, 3.3 and 3.5.
// Two real sessions were slow for reasons outside the models: suites re-run on the same tree, a browser listed
// as exclusive that put the two live testers in series (studio: 169 min of panel), the first tester replaying
// every criterion after each repair (re-judgements of 66 and 125 min), and the same local gate three times at
// publication (QualiSpectra: 40 + 38 + 18 min). Checks what review.js now sends:
// - one profile: every agent Opus, high at least; profil accepted and ignored;
// - a first « Préparation » agent checks the suite script and records the commands (quoted heredocs);
// - a suite agent of its own, with the panel and after every repair; nobody else runs or waits for a suite;
// - the browser is never exclusive; two to six testers on contiguous slices (or journeys), each isolated;
// - replay scripts under 120 s, never a suite inside, run together with a portable timeout;
// - after a repair only the touched slices re-judge; leads tried in parallel by the tester of their slice;
// - publication: no push of a commit the remote has, nothing local after an external wait.
// Run: node --test tests/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, chmodSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const here = new URL('.', import.meta.url).pathname
const SRC = readFileSync(new URL('../workflows/review.js', import.meta.url), 'utf8').replace(/^export const meta/m, 'const meta')
const ROOT = '/tmp/sf-test'
const BIN = ROOT + '/.spec-first/bin/suite'
const W = ROOT + '/.spec-first/copies/demo--integration'
const REPLAY = ROOT + '/.spec-first/harness/demo/replay'
const crit = n => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), text: 'criterion ' + (i + 1) }))
const base = (extra = {}) => ({ specPath: ROOT + '/docs/specs/demo.md', projectRoot: ROOT, baseCommit: 'abcdef1', criteria: crit(4), workspace: W, branch: 'spec-first/demo--integration', testCommand: 'make test', quickTestCommand: 'make quick', ...extra })

// Every agent answers « all good » unless the scenario says otherwise (answer returns undefined → default).
function standard(prompt, o) {
  const l = o.label
  if (l.startsWith('Préparation')) return { suiteReady: true, recorded: Object.fromEntries(o.schema.properties.recorded.required.map(n => [n, true])), launch: 'data', launchNote: '', reason: '', workspace: ROOT + '/.spec-first/copies/demo--revue-x/wt', branch: 'spec-first-demo--revue-x' }
  if (/suite (complète|rapide)/i.test(l)) return { verdict: 'pass', key: 'full-abc', failures: [], note: '' }
  if (/rejeux des tranches/.test(l)) return { slices: Object.fromEntries(Object.keys(o.schema.properties.slices.properties).map(n => [n, { clear: true, failing: [], why: '' }])) }
  if (l.startsWith('Testeur publication')) return { verdicts: Object.fromEntries(Object.keys(o.schema.properties.verdicts.properties).map(id => [id, { verdict: 'pass', proof: 'seen from outside' }])), findings: [], outsideSpec: [] }
  if (l.startsWith('Testeur ')) return { verdicts: Object.fromEntries(Object.keys(o.schema.properties.verdicts.properties).map(id => [id, { verdict: 'pass', proof: 'journey ran', replay: REPLAY + '/c' + id + '.sh' }])), findings: [], outsideSpec: [] }
  if (l.startsWith('Relecteur ')) return { findings: [], outsideSpec: [] }
  if (l.startsWith('Fusion des doublons')) return { items: prompt.split('<findings>')[1].split('</findings>')[0].trim().split('\n').map(x => JSON.parse(x)).map(f => ({ ...f, from: [f.from] })) }
  if (l.startsWith('Pistes')) return { results: [] }
  if (l.startsWith('Réparation essai')) return { changed: true, files: ['src/store.py'], summary: 'fixed', perDefect: [], decisions: [], blocker: '' }
  if (/^(Après réparation|Rejugement)/.test(l)) {
    const ns = [...(prompt.split('<your_findings>')[1] || '').split('</your_findings>')[0].matchAll(/\[(\d+)\] \(critère/g)].map(m => Number(m[1]))
    return { results: ns.map(n => ({ n, fixed: true, unverifiable: false, proof: 'fixed' })), newDefects: [] }
  }
  if (l.startsWith('CI : envoi')) return { started: true, ref: 'spec-first/demo', mr: 'https://git.example/mr/1', note: '' }
  if (l.startsWith('CI : lecture')) return { status: 'passed', pipeline: 'p1', check: '', defects: [], cause: '', job: '', runner: '', unblock: '' }
  if (l.startsWith('Publication essai')) return { status: 'done', steps: [{ action: 'push', outcome: 'ok' }], reason: '', cause: '', job: '', runner: '', unblock: '' }
  return null
}

async function runReview(args, answer = () => undefined) {
  const calls = [], logs = []
  const g = globalThis
  g.args = args
  g.log = m => logs.push(String(m))
  g.phase = () => {}
  g.agent = async (prompt, o) => {
    calls.push({ label: o.label, phase: o.phase, model: o.model, effort: o.effort, prompt, schema: o.schema })
    const a = answer(prompt, o)
    return a === undefined ? standard(prompt, o) : a
  }
  g.parallel = async jobs => JSON.parse(JSON.stringify(await Promise.all(jobs.map(j => j()))))
  const r = await new Function('return (async () => {\n' + SRC + '\n})()')()
  const by = re => calls.filter(c => re.test(c.label))
  const one = re => { const cs = by(re); assert.equal(cs.length, 1, re + ': ' + calls.map(c => c.label).join(' | ')); return cs[0] }
  return { r, calls, logs, by, one }
}
const measure = (...flags) => JSON.parse(execFileSync('node', [here + 'measure.mjs', 'review', 'fixtures/review-qualispectra-sprint6.json', '--json', ...flags], { encoding: 'utf8' }))

// ---------------------------------------------------------------- 3.1 one profile
test('every agent is Opus, effort high or xhigh — happy path and --reject', () => {
  for (const flags of [[], ['--reject']]) {
    const m = measure(...flags)
    assert.equal(m.error, undefined, m.error)
    assert.ok(m.calls.length >= 10, flags.join(''))
    for (const c of m.calls) {
      assert.equal(c.model, 'opus', flags.join('') + ' ' + c.label)
      assert.ok(['high', 'xhigh'].includes(c.effort), flags.join('') + ' ' + c.label + ': ' + c.effort)
    }
  }
})

test('the roles keep their effort: reviewers, testers and repair xhigh; preparation, suite, merger and helpers high', async () => {
  const lead = { criterion: '1', kind: 'lead', severity: 'major', title: 'maybe', proof: 'scenario' }
  const defect = { criterion: '3', kind: 'defect', severity: 'major', title: 'bug', proof: 'repro' }
  const { calls } = await runReview(base(), (p, o) => o.label.startsWith('Relecteur fiabilité') ? { findings: [lead, defect], outsideSpec: [] } : undefined)
  const effort = re => [...new Set(calls.filter(c => re.test(c.label)).map(c => c.effort))]
  assert.deepEqual(effort(/^(Relecteur|Testeur \d|Pistes|Réparation essai)/), ['xhigh'])
  assert.deepEqual(effort(/^Après réparation \d — (fiabilité|testeur)/), ['xhigh'])
  assert.deepEqual(effort(/^(Préparation|Suite complète|Fusion des doublons)|suite complète|rejeux/), ['high'])
})

test('profil is accepted and ignored, with one log line', async () => {
  const { r, calls, logs } = await runReview(base({ profil: 'rapide' }))
  assert.ok(!r.error, r.error)
  assert.equal(logs.filter(l => /profil « rapide » ignoré/.test(l)).length, 1)
  for (const c of calls) assert.equal(c.model, 'opus', c.label)
  assert.ok(!('profil' in r), 'the report carries no profile')
  assert.ok(!/Profil/.test(r.state.text))
})

// ---------------------------------------------------------------- 3.3 the suite script
test('the first agent checks the suite script and records every given command through a quoted heredoc', async () => {
  const { calls } = await runReview(base({ heavy: { '2': 'make e2e', '9': 'make nothing' }, setupCommand: 'uv sync', subdir: 'api' }))
  const prep = calls[0]
  assert.match(prep.label, /^Préparation — script de suite et recette de lancement \(opus high\)$/)
  assert.equal(prep.phase, 'Préparation')
  assert.ok(prep.prompt.includes('`test -x "' + BIN + '" && echo ready`'))
  assert.match(prep.prompt, /Never write, copy or fix that script yourself/)
  for (const [name, cmd] of [['full', 'make test'], ['quick', 'make quick'], ['heavy:2', 'make e2e'], ['setup', 'uv sync'], ['subdir', 'api']]) {
    assert.ok(prep.prompt.includes('"' + BIN + '" set ' + name + " <<'SPEC_FIRST_CMD'\n" + cmd + '\nSPEC_FIRST_CMD'), name)
  }
  assert.ok(!prep.prompt.includes('heavy:9'), 'a heavy command for an unknown criterion is not recorded')
  // An arg not given → nothing recorded for it.
  const bare = (await runReview(base({ quickTestCommand: undefined }))).calls[0].prompt
  assert.ok(bare.includes('" set full'))
  for (const n of ['quick', 'setup', 'subdir', 'heavy']) assert.ok(!bare.includes('" set ' + n), n)
  // A command holding the delimiter gets another one.
  const odd = (await runReview(base({ testCommand: 'echo SPEC_FIRST_CMD' }))).calls[0].prompt
  assert.ok(odd.includes("set full <<'SPEC_FIRST_CMD_X'\necho SPEC_FIRST_CMD\nSPEC_FIRST_CMD_X"), odd)
})

test('the suite script missing → the review stops at once and says to install it', async () => {
  const { r, calls } = await runReview(base(), (p, o) => o.label.startsWith('Préparation') ? { suiteReady: false, reason: 'absent' } : undefined)
  assert.equal(calls.length, 1)
  assert.equal(r.pass, false)
  assert.equal(r.install, BIN)
  assert.match(r.stopped, /script de suite absent/)
  assert.match(r.stopped, /installer/)
})

test('no workspace: the same first agent makes the review copy', async () => {
  const { r, calls } = await runReview(base({ workspace: undefined, branch: undefined }))
  assert.match(calls[0].label, /^Préparation — script de suite, copie de revue et recette de lancement/)
  assert.match(calls[0].prompt, /git worktree add/)
  assert.ok(calls[0].prompt.indexOf('test -x') < calls[0].prompt.indexOf('git worktree add'), 'the script is checked first')
  assert.equal(r.result.worktree, ROOT + '/.spec-first/copies/demo--revue-x/wt')
  assert.ok(!calls.slice(1).some(c => /^Préparation|^Copie/.test(c.label)), 'one preparation agent only')
})

test('a suite agent starts with the panel; testers neither run nor wait for the suite; nobody else runs it', async () => {
  const { r, calls, one, by } = await runReview(base())
  assert.equal(r.pass, true)
  const s = one(/^Suite complète \(opus high\)/)
  assert.equal(s.phase, 'Revue')
  assert.ok(s.prompt.includes('`cd "' + W + '" && "' + BIN + '" full`'), s.prompt)
  assert.ok(s.prompt.includes('"' + BIN + '" wait <key>'))
  assert.match(s.prompt, /never poll its log yourself/)
  assert.ok(!s.prompt.includes('LIVE TESTER'))
  for (const t of by(/^Testeur \d/)) {
    assert.match(t.prompt, /5\. Tests: never run or wait for a whole suite/, t.label)
    assert.ok(!t.prompt.includes('cd "' + W + '" && "' + BIN + '" full'), t.label)
  }
  for (const rv of by(/^Relecteur /)) assert.ok(rv.prompt.includes('cd "' + W + '" && "' + BIN + '" full` — read or joined, never a second run'), rv.label)
  // The old mechanism is gone: no log file ending with « EXIT <code> », no suite run by hand.
  for (const c of calls) {
    assert.ok(!c.prompt.includes('echo "EXIT $?"') && !/last line is "EXIT/.test(c.prompt), c.label)
    if (c.label !== s.label && !c.label.startsWith('Préparation')) assert.ok(!c.prompt.includes('" full --rerun'), c.label)
  }
  assert.deepEqual(r.suite, { name: 'full', runs: [{ stage: 'revue', verdict: 'pass', key: 'full-abc', note: '' }], block: null })
})

test('a failing test is a blocking defect of its criterion; the suite runs again after each repair, beside the re-judges', async () => {
  let round = 0
  const { r, by, one } = await runReview(base(), (p, o) => {
    if (o.label.startsWith('Suite complète')) return { verdict: 'fail', key: 'full-1', failures: [{ criterion: '2', test: 'test_export', proof: 'AssertionError: 3 != 4' }], note: '' }
    if (/^Après réparation \d — suite complète/.test(o.label)) return ++round < 2 ? { verdict: 'fail', key: 'full-2', failures: [{ criterion: '2', test: 'test_export', proof: 'still' }], note: '' } : { verdict: 'pass', key: 'full-3', failures: [], note: '' }
    return undefined
  })
  const repair = one(/^Réparation essai 1/)
  assert.ok(repair.prompt.includes('test en échec : test_export'))
  assert.match(repair.prompt, /never the full suite — it runs again after you, through the same script/)
  assert.ok(repair.prompt.includes('`cd "' + W + '" && "' + BIN + '" quick`'), 'the quick suite through the script')
  assert.deepEqual(by(/suite complète/i).map(c => c.label.replace(/ \(.*/, '')), ['Suite complète', 'Après réparation 1 — suite complète', 'Après réparation 2 — suite complète'])
  // Criterion 2's tester replays it too, beside the suite.
  assert.equal(by(/^Après réparation 1 — testeur 1/).length, 1)
  assert.deepEqual(r.suite.runs.map(x => x.verdict), ['fail', 'fail', 'pass'])
  assert.equal(r.repaired.length, 1)
  assert.equal(r.pass, true)
})

test('the suite runs again after a repair even with no failing test, and the review needs it green', async () => {
  const defect = { criterion: '1', kind: 'defect', severity: 'major', title: 'bug', proof: 'repro' }
  const { r, by } = await runReview(base(), (p, o) => o.label.startsWith('Relecteur fiabilité') ? { findings: [defect], outsideSpec: [] } : /^Après réparation 1 — suite/.test(o.label) ? { verdict: 'refused', key: '', failures: [], note: 'uncommitted changes' } : undefined)
  assert.equal(by(/^Après réparation 1 — suite complète/).length, 1)
  assert.equal(r.open.length, 0)
  assert.equal(r.pass, false, 'a refused suite is no pass')
  assert.match(r.state.text, /Suite : suite complète, refused/)
})

// ---------------------------------------------------------------- 3.5 the panel
test('the browser is never an exclusive resource; a genuine device stays', async () => {
  const { calls, logs, by } = await runReview(base({ exclusive: { 'Chrome DevTools': ['1'], navigateur: ['2'], 'browser profile': ['3'], 'gpu-box': ['1'] } }))
  assert.equal(logs.filter(l => /^exclusive : « .* » écarté — le navigateur n'est jamais exclusif/.test(l)).length, 3)
  for (const c of calls) {
    assert.ok(!/« Chrome DevTools »|« navigateur »|« browser profile »/.test(c.prompt), c.label)
  }
  const t1 = by(/^Testeur 1 /)[0], t2 = by(/^Testeur 2 /)[0]
  assert.match(t1.prompt, /You hold the exclusive resource\(s\) « gpu-box »/)
  assert.ok(!t2.prompt.includes('You hold the exclusive'), 'tester 2 holds nothing')
  const list = await runReview(base({ exclusive: ['chromatographe', 'Chromium'] }))
  assert.equal(list.logs.filter(l => /écarté/.test(l)).length, 1)
  assert.ok(list.calls.some(c => c.prompt.includes('« chromatographe »')))
})

test('one tester per slice of about eight criteria, two to six, on contiguous slices', async () => {
  for (const [n, k] of [[1, 1], [2, 2], [9, 2], [16, 2], [17, 3], [40, 5], [48, 6], [60, 6]]) {
    const { by, r } = await runReview(base({ criteria: crit(n) }))
    const ts = by(/^Testeur \d en conditions réelles/)
    assert.equal(ts.length, k, n + ' criteria')
    const slices = ts.map(t => t.schema.properties.verdicts.required)
    assert.deepEqual(slices.flat(), crit(n).map(c => c.id), n + ': contiguous, in order, each once')
    assert.ok(Math.max(...slices.map(s => s.length)) - Math.min(...slices.map(s => s.length)) <= 1, n + ': even')
    assert.deepEqual(r.journeys, slices)
  }
})

test('journeys gives the slices; a bad one is refused before any agent', async () => {
  const { by } = await runReview(base({ journeys: [['3', '1'], ['2'], ['4']] }))
  assert.deepEqual(by(/^Testeur \d en/).map(t => t.schema.properties.verdicts.required), [['3', '1'], ['2'], ['4']])
  for (const bad of [[['1', '2'], ['3', '9']], [['1', '2'], ['2', '3', '4']], [['1', '2'], ['3']], [['1'], ['2'], ['3'], ['4'], [], ['1']], 'x']) {
    const { r, calls } = await runReview(base({ journeys: bad }))
    assert.match(String(r.error), /args\.journeys/, JSON.stringify(bad))
    assert.equal(calls.length, 0)
  }
  const seven = await runReview(base({ criteria: crit(7), journeys: crit(7).map(c => [c.id]) }))
  assert.match(String(seven.r.error), /one to six slices/)
})

test('each tester has its own ports, instance and isolated context; a refused trace is tried again', async () => {
  const { by } = await runReview(base({ criteria: crit(20) }))
  const ts = by(/^Testeur \d en/)
  assert.equal(ts.length, 3)
  const ports = ts.map(t => t.prompt.match(/uses only ports (\d+-\d+)/)[1])
  const ctx = ts.map(t => t.prompt.match(/isolatedContext "([^"]+)"/)[1])
  assert.equal(new Set(ports).size, 3)
  assert.equal(new Set(ctx).size, 3)
  for (const t of ts) {
    assert.match(t.prompt, /Start your own instance of the result .* — never another tester's/)
    assert.match(t.prompt, /refused because another trace is running → do your other checks and try again 60 s later, twice; still refused → say so/)
  }
})

test('replay scripts: under 120 s, never a suite inside, run together with a timeout that works on macOS', async () => {
  const defect = { criterion: '1', kind: 'defect', severity: 'major', title: 'bug', proof: 'repro', replay: REPLAY + '/reliability-1.sh' }
  const { by, one } = await runReview(base({ heavy: { '4': 'make e2e' } }), (p, o) => o.label.startsWith('Relecteur fiabilité') ? { findings: [defect], outsideSpec: [] } : undefined)
  for (const c of [...by(/^Testeur \d/), ...by(/^Relecteur /)]) {
    assert.match(c.prompt, /Under 120 s, independent of the others/, c.label)
    assert.ok(c.prompt.includes('never a whole suite inside — not `make test`, `make quick`, `make e2e`, the suite script, a pre-push or CI command'), c.label)
  }
  const t1 = one(/^Après réparation 1 — testeur 1/)
  assert.match(t1.prompt, /a defect of the script, not of its criterion/)
  assert.match(t1.prompt, /giving this command a 300-second timeout in your shell tool/)
  const cmd = t1.prompt.match(/shell tool: `(d=\$\(mktemp -d\)[^`]+)`/)[1]
  assert.match(cmd, /xargs -P 16/)
  assert.ok(!/(^|[^-])\btimeout\b/.test(cmd.replace(/alarm/g, '')), 'no coreutils timeout (absent on macOS)')
  // Run that very command on three scripts (120 s made 1 s): a pass, a failure, one too slow.
  const dir = mkdtempSync(join(tmpdir(), 'sf-replay-'))
  const mk = (n, body) => { const f = join(dir, n); writeFileSync(f, body); chmodSync(f, 0o755); return f }
  const scripts = [mk('ok.sh', 'echo "url $1"; exit 0\n'), mk('bad.sh', 'echo "3 rows left"; exit 1\n'), mk('slow.sh', 'sleep 3\n')]
  const shell = cmd.replace('<script>…', scripts.join(' ')).replace('<url>', 'http://127.0.0.1:1').replace("' 120 @@ ", "' 1 @@ ")
  const out = execFileSync('sh', ['-c', shell], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  const code = n => Number(out.match(new RegExp('exit=(\\d+) \\S*' + n))[1])
  assert.deepEqual([code('ok.sh'), code('bad.sh'), code('slow.sh')], [0, 1, 142], out)
})

test('after a repair only the touched slices re-judge, in parallel; the others replay their scripts in one helper', async () => {
  const defect = { criterion: '1', kind: 'defect', severity: 'major', title: 'bug', proof: 'repro', replay: REPLAY + '/reliability-1.sh' }
  const args = base({ criteria: crit(6), journeys: [['1', '2'], ['3', '4'], ['5', '6']] })
  const notClear = (p, o) => o.label.startsWith('Relecteur fiabilité') ? { findings: [defect], outsideSpec: [] }
    : /rejeux des tranches/.test(o.label) ? { slices: { 2: { clear: true, failing: [], why: '' }, 3: { clear: false, failing: ['5'], why: 'c5.sh exit=1' } } } : undefined
  const { r, by, one } = await runReview(args, notClear)
  assert.equal(r.pass, true)
  const helper = one(/^Après réparation 1 — rejeux des tranches 2, 3 \(opus high\)/)
  assert.ok(helper.prompt.includes('<slice n="2">') && helper.prompt.includes('script="' + REPLAY + '/c3.sh"'))
  assert.ok(!helper.prompt.includes('<criterion id="1"'), 'the touched slice is not in the helper')
  assert.match(helper.prompt, /You judge nothing live, open no browser/)
  const testers = by(/^Après réparation 1 — testeur/).map(c => c.label.replace(/ \(.*/, ''))
  assert.deepEqual(testers.sort(), ['Après réparation 1 — testeur 1', 'Après réparation 1 — testeur 3'], 'slice 2 is clear: no tester')
  const t3 = one(/^Après réparation 1 — testeur 3/)
  assert.match(t3.prompt, /the script of 5 failed — look at it live first/)
  for (const t of by(/^Après réparation 1 — testeur/)) {
    const block = t.prompt.split('<replay>')[1].split('</replay>')[0]
    const n = Number(t.label.match(/testeur (\d)/)[1])
    for (const id of block.match(/criterion id="(\d+)"/g).map(x => x.match(/\d+/)[0])) assert.ok(args.journeys[n - 1].includes(id), t.label + ' replays ' + id)
  }
  // No answer from the helper → its slices get their testers.
  const silent = await runReview(args, (p, o) => /rejeux/.test(o.label) ? null : notClear(p, o))
  assert.deepEqual(silent.by(/^Après réparation 1 — testeur/).map(c => c.label.replace(/ \(.*/, '')).sort(), ['Après réparation 1 — testeur 1', 'Après réparation 1 — testeur 2', 'Après réparation 1 — testeur 3'])
})

test('leads are tried in parallel, each by the tester of its slice', async () => {
  const leads = [
    { criterion: '1', kind: 'lead', severity: 'major', title: 'lead on 1', proof: 's1' },
    { criterion: '4', kind: 'lead', severity: 'major', title: 'lead on 4', proof: 's4' },
    { criterion: 'general', kind: 'lead', severity: 'blocking', title: 'general lead', proof: 'sg' },
    { criterion: '2', kind: 'lead', severity: 'minor', title: 'minor lead', proof: 'sm' },
  ]
  const { by, one } = await runReview(base(), (p, o) => o.label.startsWith('Relecteur performance') ? { findings: leads, outsideSpec: [] } : o.label.startsWith('Pistes — testeur 2') ? { results: [{ n: 2, outcome: 'proven', proof: 'slow: 9 s', replay: REPLAY + '/lead-2.sh' }] } : undefined)
  assert.equal(by(/^Pistes essayées/).length, 0)
  const p1 = one(/^Pistes — testeur 1 \(opus xhigh\)/), p2 = one(/^Pistes — testeur 2 \(opus xhigh\)/)
  assert.ok(p1.prompt.includes('lead on 1') && !p1.prompt.includes('lead on 4'))
  assert.ok(p2.prompt.includes('lead on 4') && !p2.prompt.includes('lead on 1'))
  assert.equal([p1, p2].filter(p => p.prompt.includes('general lead')).length, 1, 'a general lead goes to one tester')
  assert.ok(![p1, p2].some(p => p.prompt.includes('minor lead')))
  assert.notEqual(p1.prompt.match(/isolatedContext "([^"]+)"/)[1], p2.prompt.match(/isolatedContext "([^"]+)"/)[1])
  // The proven lead is re-judged by the tester that proved it, the tester of its slice.
  assert.ok(one(/^Après réparation 1 — testeur 2/).prompt.includes('lead on 4'))
})

// ---------------------------------------------------------------- 3.5 publication
const PUB = { actions: 'push the branch, open a merge request, merge it once the CI is green', criteria: ['4'] }
test('publication: no push of a commit the remote has; efforts high, then xhigh on the retries', async () => {
  let n = 0
  const { r, by, one } = await runReview(base({ publish: PUB }), (p, o) => o.label.startsWith('Publication essai') && ++n < 3 ? { status: 'failed', steps: [], reason: 'merge refused', cause: '', job: '', runner: '', unblock: '' } : undefined)
  assert.ok(one(/^CI : envoi/).prompt.includes('Before any push, `git ls-remote` the remote branch: it already points at the commit → no push.'))
  for (const c of by(/^CI : lecture/)) assert.match(c.prompt, /not on the remote \(`git ls-remote`\) → push it again .*already there → no push/)
  const pubs = by(/^Publication essai/)
  assert.deepEqual(pubs.map(c => c.effort), ['high', 'xhigh', 'xhigh'])
  for (const c of pubs) {
    assert.equal(c.model, 'opus')
    assert.ok(c.prompt.includes('Before any push, `git ls-remote`'), c.label)
    assert.match(c.prompt, /Never run the project's tests, build or pre-push gate by hand/)
  }
  assert.equal(r.publication.done, true)
})

test('publication resumed after an external wait: nothing local runs again', async () => {
  const { by } = await runReview(base({ publish: PUB, waitRound: 1, waitAt: { 'avant publication': 1 } }))
  const pub = by(/^Publication essai 1/)[0]
  assert.match(pub.prompt, /Resumed after waiting outside \(resume 1\): first read, read-only, the state of the last step you started .* then go on with what is left — nothing local runs again: no test, no build, no push of a commit the remote already has/)
})

// ---------------------------------------------------------------- focus
test('a targeted re-review: a failing test is judged again by the suite itself; without a suite, by the tester', async () => {
  const focus = [{ id: '2', reviewer: 'suite', finding: 'test_export fails' }]
  const { r, one } = await runReview(base({ focus }))
  const s = one(/^Rejugement — suite complète/)
  assert.match(s.prompt, /for a targeted re-review/)
  assert.equal(r.open.length, 0)
  const without = await runReview(base({ focus, testCommand: undefined, quickTestCommand: undefined }))
  assert.equal(without.by(/suite/i).length, 1, 'only the preparation names the suite script')
  assert.equal(without.by(/^Rejugement — testeur 1/).length, 1)
})

// ---------------------------------------------------------------- fixes after the independent review (26/11/2026)
const defect1 = { criterion: '1', kind: 'defect', severity: 'major', title: 'bug', proof: 'repro' }
const reliability = (answer = () => undefined) => (p, o) => o.label.startsWith('Relecteur fiabilité') ? { findings: [defect1], outsideSpec: [] } : answer(p, o)
const statusOf = (r, id) => r.criteria.find(c => c.id === id)

test('1. a tester called back only to replay its slice that never answers leaves it « non vérifié », no pass', async () => {
  // Second wave: the helper finds slice 2 not clear, its tester never answers.
  const a = await runReview(base(), reliability((p, o) => /rejeux des tranches/.test(o.label) ? { slices: { 2: { clear: false, failing: ['3'], why: 'c3.sh exit=1' } } } : /^Après réparation 1 — testeur 2/.test(o.label) ? null : undefined))
  assert.equal(a.r.pass, false)
  assert.equal(statusOf(a.r, '3').status, 'unverified')
  assert.match(statusOf(a.r, '3').reason, /non rejoué/)
  assert.ok(a.r.silent.some(s => /testeur 2 \(après réparation 1\)/.test(s)), JSON.stringify(a.r.silent))
  // Last round: slice 2 holds criteria without a script, its tester never answers.
  const noScript = (p, o) => o.label.startsWith('Testeur 2 en') ? { verdicts: { 3: { verdict: 'pass', proof: 'ok', replay: '' }, 4: { verdict: 'pass', proof: 'ok', replay: '' } }, findings: [], outsideSpec: [] }
    : /^Après réparation [12] — (fiabilité|testeur 1)/.test(o.label) ? { results: [...(p.split('<your_findings>')[1] || '').split('</your_findings>')[0].matchAll(/\[(\d+)\] \(critère/g)].map(m => ({ n: Number(m[1]), fixed: false, proof: 'still' })), newDefects: [] }
      : /^Après réparation 3 — testeur 2/.test(o.label) ? null : undefined
  const b = await runReview(base(), reliability(noScript))
  assert.equal(b.r.repairRounds, 3)
  assert.equal(b.r.pass, false)
  assert.equal(statusOf(b.r, '3').status, 'unverified')
  // A later answer of the same tester replays them again: back to « validé ».
  const c = await runReview(base(), reliability((p, o) => /rejeux des tranches/.test(o.label) ? { slices: { 2: { clear: false, failing: [], why: 'reached' } } } : /^Après réparation 1 — testeur 1/.test(o.label) ? { results: [{ n: 1, fixed: false, proof: 'still' }], newDefects: [] } : /^Après réparation 1 — testeur 2/.test(o.label) ? null : undefined))
  assert.equal(c.r.repairRounds, 2)
  assert.equal(statusOf(c.r, '3').status, 'validated', 'replayed by tester 2 on round 2')
  assert.equal(c.r.pass, true)
})

test('2. the preparation resets the suite script first, and stops when a recording is missing or failed', async () => {
  const { calls } = await runReview(base({ subdir: 'api' }))
  const p = calls[0].prompt
  assert.ok(p.indexOf('"' + BIN + '" reset') > 0 && p.indexOf('"' + BIN + '" reset') < p.indexOf('" set full'), 'reset before any recording')
  assert.deepEqual(calls[0].schema.properties.recorded.required, ['reset', 'full', 'quick', 'subdir'])
  for (const [answer, what] of [[{ full: false }, /non enregistré dans le script de suite : full/], [{}, /échec d'écriture/]]) {
    const { r, calls: cs } = await runReview(base(), (pr, o) => o.label.startsWith('Préparation') ? { suiteReady: true, recorded: { reset: true, full: true, quick: true, ...answer }, launch: 'data', launchNote: '', reason: Object.keys(answer).length ? '' : "échec d'écriture" } : undefined)
    assert.equal(cs.length, 1, 'nothing after the preparation')
    assert.equal(r.stoppedKind, 'preparation')
    assert.match(r.stopped, what)
    assert.match(r.stopped, /sans resumeFromRunId/)
    assert.equal(r.pass, false)
  }
})

test('3. a suite neither green nor red: remedies in its prompt, a technical block the report states, a retry on resume', async () => {
  const s = (await runReview(base())).one(/^Suite complète/)
  assert.match(s.prompt, /rev-parse --git-path info\/exclude/)
  assert.match(s.prompt, /never commit, stash, clean, delete, or edit \.gitignore/)
  assert.match(s.prompt, /A source file left untracked, or a tracked file modified → not yours to hide/)
  assert.match(s.prompt, /then once `.*" full --rerun`/)
  const refused = { verdict: 'refused', key: '', failures: [], note: 'uncommitted changes: ?? src/new.py', unblock: 'committer src/new.py' }
  const defect = { criterion: '2', kind: 'defect', severity: 'major', title: 'bug', proof: 'repro' }
  const answer = (p, o) => /^Suite complète \(/.test(o.label) ? refused : o.label.startsWith('Relecteur fiabilité') ? { findings: [defect], outsideSpec: [] } : undefined
  const { r, by } = await runReview(base(), answer)
  assert.equal(r.pass, false)
  assert.deepEqual(r.suite.block, { stage: 'revue', verdict: 'refused', cause: 'uncommitted changes: ?? src/new.py', unblock: 'committer src/new.py', suiteRetry: 1, resume: "relancer cette revue avec resumeFromRunId, les mêmes args et suiteRetry: 1, une fois l'action faite" })
  for (const c of r.criteria) { assert.equal(c.status, 'blocked', c.id); assert.equal(c.kind, 'technique'); assert.match(c.reason, /suite complète bloquée/) }
  assert.equal(r.relaunch.length, 0)
  assert.equal(by(/^(Fusion|Pistes|Réparation essai)/).length, 0, 'the review stops at the block')
  // Resume with suiteRetry: 1 → the blocked call comes back as it was, then one more try, then the review goes on.
  const again = await runReview(base({ suiteRetry: 1 }), (p, o) => /^Suite complète — reprise 1/.test(o.label) ? undefined : answer(p, o))
  const labels = again.calls.map(c => c.label)
  const at = labels.findIndex(l => /^Suite complète \(/.test(l))
  assert.match(labels[at + 1], /^Suite complète — reprise 1 \(opus high\)/)
  assert.match(again.one(/reprise 1/).prompt, /This is try 1 after the suite was blocked by its environment \(refused: uncommitted changes: \?\? src\/new\.py\)/)
  assert.equal(again.r.suite.block, null)
  assert.equal(again.by(/^Réparation essai 1/).length, 1)
  assert.equal(again.r.pass, true)
  // Blocked after a repair: no more rounds.
  const late = await runReview(base(), (p, o) => /^Suite complète \(/.test(o.label) ? { verdict: 'fail', key: 'k', failures: [{ criterion: '2', test: 't', proof: 'x' }], note: '', unblock: '' } : /^Après réparation \d — suite/.test(o.label) ? refused : undefined)
  assert.equal(late.r.repairRounds, 1)
  assert.equal(late.r.suite.block.stage, 'après réparation 1')
  assert.equal(statusOf(late.r, '2').status, 'blocked')
})

test('4. the suite agent holds the exclusive resources: never at the same time as a tester holding one', async () => {
  const active = new Set(), clash = []
  const g = globalThis
  g.args = base({ exclusive: ['gpu-box'] }); g.log = () => {}; g.phase = () => {}
  g.parallel = async jobs => JSON.parse(JSON.stringify(await Promise.all(jobs.map(j => j()))))
  g.agent = async (prompt, o) => {
    if (/^(Suite complète|Testeur \d)/.test(o.label)) { if ([...active].length) clash.push(o.label + ' with ' + [...active].join(', ')); active.add(o.label) }
    await new Promise(r => setTimeout(r, 5))
    active.delete(o.label)
    return standard(prompt, o)
  }
  const r = await new Function('return (async () => {\n' + SRC + '\n})()')()
  assert.equal(r.pass, true)
  assert.deepEqual(clash, [])
})

test('5. a focus review runs the suite too', async () => {
  const { r, one } = await runReview(base({ focus: [{ id: '1', reviewer: 'reliability', finding: 'x breaks' }] }))
  one(/^Rejugement — suite complète/)
  assert.equal(r.suite.runs.length, 1)
  assert.equal(r.pass, true)
})

test('6. a lead whose tester never answers goes to another tester; still untried → no pass, reported', async () => {
  const lead = { criterion: '3', kind: 'lead', severity: 'blocking', title: 'XSS possible', proof: 'scenario' }
  const sec = (answer) => (p, o) => o.label.startsWith('Relecteur sécurité') ? { findings: [lead], outsideSpec: [] } : answer(p, o)
  const a = await runReview(base(), sec((p, o) => /^Pistes — testeur 2 \(/.test(o.label) ? null : undefined))
  assert.equal(a.one(/^Pistes — testeur 1, reprise/).prompt.includes('XSS possible'), true)
  assert.equal(a.r.leadsUntried.length, 1, 'the second tester answered without it')
  assert.equal(a.r.pass, false)
  const b = await runReview(base(), sec((p, o) => /^Pistes/.test(o.label) ? null : undefined))
  assert.equal(b.r.pass, false)
  assert.deepEqual(b.r.leadsUntried.map(f => f.title), ['XSS possible'])
  assert.ok(b.r.silent.includes('testeur 1 (pistes)'), JSON.stringify(b.r.silent))
  const c = await runReview(base(), sec((p, o) => /^Pistes — testeur 2 \(/.test(o.label) ? null : /^Pistes — testeur 1, reprise/.test(o.label) ? { results: [{ n: 1, outcome: 'dismissed', proof: 'escaped' }] } : undefined))
  assert.equal(c.r.leadsDismissed, 1)
  assert.equal(c.r.pass, true)
})

test('7. the replay batch kills the whole process group of a script that hangs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sf-pgrp-'))
  const hang = join(dir, 'hang.sh')
  writeFileSync(hang, 'sleep 1000 & echo $! > "' + dir + '/child.pid"; sleep 1000\n')
  const cmd = SRC.match(/const REPLAY_BATCH = `([^`]+)`/)[1].replace(/\\\\n/g, '\\n')
  const shell = cmd.replace('<script>…', hang).replace('<url>', 'http://x').replace("' 120 @@ ", "' 1 @@ ")
  const t0 = process.hrtime.bigint()
  const out = execFileSync('sh', ['-c', shell], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  assert.ok(Number(process.hrtime.bigint() - t0) / 1e9 < 10, 'stopped at its timeout')
  assert.match(out, /exit=142 /)
  const pid = Number(readFileSync(join(dir, 'child.pid'), 'utf8'))
  let alive = true
  try { process.kill(pid, 0) } catch (e) { alive = false }
  assert.equal(alive, false, 'its child is killed too')
})

test('8. call order: the suite after the testers and reviewers, after the re-judges; a missing script asks for a new review', async () => {
  const { labels } = await runReview(base(), reliability()).then(x => ({ labels: x.calls.map(c => c.label) }))
  const idx = re => labels.findIndex(l => re.test(l))
  assert.ok(idx(/^Suite complète \(/) > Math.max(idx(/^Relecteur usage/), idx(/^Testeur 2 en/)), labels.join(' | '))
  assert.ok(idx(/^Après réparation 1 — suite/) > Math.max(idx(/^Après réparation 1 — fiabilité/), idx(/^Après réparation 1 — testeur 1/)), labels.join(' | '))
  const { r } = await runReview(base(), (p, o) => o.label.startsWith('Préparation') ? { suiteReady: false, recorded: {}, launch: 'none', launchNote: '', reason: 'absent' } : undefined)
  assert.match(r.stopped, /une nouvelle revue avec les mêmes args, sans resumeFromRunId/)
})

test('9. a tester or the suite that never answered is in silent', async () => {
  const { r } = await runReview(base(), (p, o) => /^(Testeur 2 en|Suite complète)/.test(o.label) ? null : undefined)
  assert.deepEqual(r.silent.sort(), ['suite complète (revue)', 'testeur 2'])
  assert.equal(r.pass, false)
  assert.equal(statusOf(r, '3').status, 'unverified')
})

test('10. every early stop returns the whole report, with stoppedKind', async () => {
  const full = (await runReview(base())).r
  const cases = [
    [(p, o) => o.label.startsWith('Préparation') ? { suiteReady: false, recorded: {}, launch: 'none', launchNote: '', reason: 'absent' } : undefined, {}, 'suite-missing'],
    [(p, o) => o.label.startsWith('Préparation') ? null : undefined, {}, 'preparation'],
    [(p, o) => o.label.startsWith('Préparation') ? { suiteReady: true, recorded: { reset: true, full: true, quick: true }, launch: 'data', launchNote: '', reason: 'worktree refusé', workspace: '', branch: '' } : undefined, { workspace: undefined, branch: undefined }, 'copy'],
  ]
  for (const [answer, extra, kind] of cases) {
    const { r } = await runReview(base(extra), answer)
    assert.deepEqual(Object.keys(r).filter(k => k !== 'install').sort(), Object.keys(full).sort(), kind)
    assert.equal(r.stoppedKind, kind)
    assert.equal(r.pass, false)
    assert.equal('install' in r, kind === 'suite-missing', kind)
    for (const c of r.criteria) { assert.equal(c.status, 'blocked', kind); assert.equal(c.kind, 'technique') }
    assert.equal(r.counts.blocked, 4)
  }
  assert.equal(full.stoppedKind, '')
})

test('11. one launch recipe, written by the preparation; each tester its own data folder; nobody installs in the copy', async () => {
  const { calls, by } = await runReview(base({ criteria: crit(20), setupCommand: 'uv sync' }))
  const prep = calls[0].prompt
  assert.ok(prep.includes(ROOT + '/.spec-first/harness/demo/launch.sh <port> <data folder>'))
  assert.match(prep, /keeps every file the result writes while it runs \(database, uploads, caches, logs\) under <data folder>/)
  assert.match(prep, /its own checkout at the copy's commit — `git -C .* worktree add --detach <data folder>\/wt HEAD`/)
  assert.match(prep, /the recipe never installs anything in the copy/)
  const folders = by(/^Testeur \d en/).map(t => t.prompt.match(/launch\.sh <port> (\S+)`/)[1])
  assert.equal(new Set(folders).size, 3)
  for (const t of by(/^Testeur \d en/)) {
    assert.match(t.prompt, /Never install anything in the copy, never edit launch\.sh/)
    assert.ok(!t.prompt.includes('uv sync'), 'a tester never runs the setup in the shared copy')
  }
  const co = await runReview(base(), (p, o) => o.label.startsWith('Préparation') ? { suiteReady: true, recorded: Object.fromEntries(o.schema.properties.recorded.required.map(n => [n, true])), launch: 'checkout', launchNote: 'sqlite path fixed', reason: '' } : undefined)
  assert.match(co.one(/^Testeur 1 en/).prompt, /from a checkout of its own at the copy's commit/)
  const ko = await runReview(base(), (p, o) => o.label.startsWith('Préparation') ? { suiteReady: true, recorded: Object.fromEntries(o.schema.properties.recorded.required.map(n => [n, true])), launch: 'failed', launchNote: 'port fixed in code', reason: '' } : undefined)
  assert.equal(ko.r.stoppedKind, '', 'a failed recipe never stops the review')
  assert.match(ko.one(/^Testeur 1 en/).prompt, /No launch recipe could be made \(port fixed in code\)/)
})

test('12. a resumed publisher gets the check of what it waited for', async () => {
  const { by } = await runReview(base({ publish: PUB, waitRound: 1, waitAt: {}, waitCheck: 'glab mr view 12 --output json' }))
  assert.match(by(/^Publication essai 1/)[0].prompt, /first run its read-only check, `glab mr view 12 --output json`, to see whether what was awaited is finished/)
  const { r } = await runReview(base({ publish: PUB }), (p, o) => o.label.startsWith('Publication essai') ? { status: 'waiting', steps: [], reason: '', wait: { what: 'relecture humaine', where: 'https://git.example/mr/1', check: 'glab mr view 1' }, cause: '', job: '', runner: '', unblock: '' } : undefined)
  assert.equal(r.waiting.waitCheck, 'glab mr view 1')
  assert.match(r.waiting.resume, /waitCheck: "glab mr view 1"/)
})

test('the verdict line may follow a STARTED or JOINED line; a long spec name gets a hashed id', async () => {
  const { calls, r } = await runReview(base())
  for (const c of calls.filter(c => c.prompt.includes('Test suites ('))) assert.match(c.prompt, /Its verdict line is PASS, FAIL, RUNNING, REFUSED or LOST \(a STARTED or JOINED line may come first\)/)
  assert.equal(r.specId, 'demo')
  const slug = 'a-very-long-specification-name-for-the-studio-v1-review'
  const long = (await runReview(base({ specPath: ROOT + '/docs/specs/' + slug + '.md' }))).r
  const h = s => { let x = 2166136261; for (const ch of s) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619) >>> 0 } return x }
  assert.equal(long.specId, slug.slice(0, 32) + '-' + h(slug).toString(36))
  const forty = 'x'.repeat(40)
  assert.equal((await runReview(base({ specPath: ROOT + '/' + forty + '.md' }))).r.specId, forty)
})
