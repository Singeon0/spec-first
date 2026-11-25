// 1.12.0, the review made cheaper at the same panel (QualiSpectra, 10/11/2026: 138 min, 80 % of them after
// the panel; the live testers' replays after two repairs cost 16 % of the review, 25 of 35 findings were
// minor ones proven for nothing). Checks what review.js really sends:
// - every live verdict and every blocking or major defect leaves a replay script, and a path an agent
//   returned outside the replay folder never reaches a prompt;
// - after a repair: the scripts first, the browser only where the repair reaches, everything live on the
//   last round; criteria of a tester that is not re-judging go to the first one;
// - a minor finding gets no reproduction; a mistake made in several places is one finding, fixed everywhere;
// - the six reviewers share one identical prefix, their angle comes last.
// Run: node --test tests/*.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const SRC = readFileSync(new URL('../workflows/review.js', import.meta.url), 'utf8').replace(/^export const meta/m, 'const meta')

async function runReview(args, answer) {
  const calls = []
  const g = globalThis
  g.args = args
  g.log = () => {}
  g.phase = () => {}
  g.agent = async (prompt, o) => { calls.push({ label: o.label, prompt, schema: o.schema }); return answer(prompt, o) }
  g.parallel = async jobs => JSON.parse(JSON.stringify(await Promise.all(jobs.map(j => j()))))
  const r = await new Function('return (async () => {\n' + SRC + '\n})()')()
  return { r, calls }
}

const ROOT = '/tmp/sf-test'
const REPLAY = ROOT + '/.spec-first/harness/demo/replay'
const ARGS = {
  specPath: ROOT + '/docs/specs/demo.md',
  projectRoot: ROOT,
  baseCommit: 'abcdef1',
  criteria: [
    { id: '1', text: 'deleting a cube deletes its annotations' },
    { id: '2', text: 'the annotations survive a reconnection' },
    { id: '3', text: 'the panel keeps its layout on a narrow screen' },
    { id: '4', text: 'the export holds every annotation' },
  ],
  workspace: ROOT + '/.spec-first/copies/demo--integration',
  branch: 'spec-first/demo--integration',
  testCommand: 'make test',
  quickTestCommand: 'make quick',
}
const HOSTILE = '/etc/passwd; rm -rf x'

// Tester 1 holds criteria 1 and 3, tester 2 holds 2 and 4. The reliability reviewer proves one major
// defect on criterion 1; the usage reviewer reports one minor finding. The defect is fixed on round 3.
function answer(prompt, o) {
  const l = o.label
  if (l.startsWith('Testeur ')) {
    const ids = Object.keys(o.schema.properties.verdicts.properties)
    const replay = id => id === '3' ? '' : id === '4' ? HOSTILE : REPLAY + '/c' + id + '.sh'
    return { verdicts: Object.fromEntries(ids.map(id => [id, { verdict: 'pass', proof: 'journey ran', replay: replay(id) }])), findings: [], outsideSpec: [] }
  }
  if (l.startsWith('Relecteur fiabilité')) return { findings: [{ criterion: '1', kind: 'defect', severity: 'major', title: 'la suppression laisse les annotations', proof: 'repro: 3 rows left', where: 'store.py delete_cube; store.py delete_layer', replay: REPLAY + '/reliability-1.sh' }], outsideSpec: [] }
  if (l.startsWith('Relecteur usage')) return { findings: [{ criterion: '2', kind: 'defect', severity: 'minor', title: 'libellé tronqué', proof: 'ui/panel.tsx:40' }], outsideSpec: [] }
  if (l.startsWith('Relecteur ')) return { findings: [], outsideSpec: [] }
  if (l.startsWith('Fusion des doublons')) {
    const body = prompt.split('<findings>')[1].split('</findings>')[0].trim()
    return { items: body.split('\n').map(x => JSON.parse(x)).map(f => ({ ...f, from: [f.from] })) }
  }
  if (l.startsWith('Réparation essai')) return { changed: true, files: ['src/store.py', 'src/api/cubes.py'], summary: 'cascade delete', perDefect: [{ n: 1, done: true, note: '' }], decisions: [], blocker: '' }
  if (l.startsWith('Après réparation')) {
    const fixed = l.startsWith('Après réparation 3')
    const ns = [...prompt.split('<your_findings>')[1].split('</your_findings>')[0].matchAll(/\[(\d+)\] \(critère/g)].map(m => Number(m[1]))
    return { results: ns.map(n => ({ n, fixed, unverifiable: false, proof: fixed ? 'script exits 0' : 'still 3 rows' })), newDefects: [] }
  }
  return null
}

const { r, calls } = await runReview(ARGS, answer)
const by = re => calls.filter(c => re.test(c.label))
const one = re => { const cs = by(re); assert.equal(cs.length, 1, re + ': ' + cs.map(c => c.label).join(' | ')); return cs[0] }

test('the review runs to its third repair round and passes', () => {
  assert.ok(!r.error, r.error)
  assert.equal(r.repairRounds, 3)
  assert.equal(r.repaired.length, 1)
  assert.equal(r.open.length, 0)
  assert.equal(r.pass, true)
})

test('the six reviewers share one identical prefix; the angle comes last', () => {
  const rs = by(/^Relecteur /)
  assert.equal(rs.length, 6)
  const cut = rs.map(c => c.prompt.indexOf('YOUR ANGLE'))
  for (const [i, c] of rs.entries()) {
    assert.ok(cut[i] > 0, c.label)
    assert.equal(c.prompt.slice(0, cut[i]), rs[0].prompt.slice(0, cut[0]), c.label + ': prefix differs')
    assert.ok(cut[i] / c.prompt.length > 0.75, c.label + ': the shared part is ' + Math.round(100 * cut[i] / c.prompt.length) + ' %')
  }
  assert.ok(one(/^Relecteur fiabilité/).prompt.indexOf('RELIABILITY REVIEWER') > cut[1])
  assert.ok(one(/^Relecteur sécurité/).prompt.indexOf('SECURITY REVIEWER') > 0)
})

test('a minor finding gets no reproduction and is never repaired', () => {
  for (const c of by(/^Relecteur /)) assert.match(c.prompt, /a minor finding: never a reproduction, a script or a measurement/)
  for (const c of by(/^Testeur /)) assert.match(c.prompt, /a minor one → its title and the place, one line, no reproduction/)
  assert.equal(r.minor.length, 1)
  for (const c of by(/^Réparation essai/)) assert.ok(!c.prompt.includes('libellé tronqué'), 'a minor finding reached the repair')
  for (const c of by(/^Après réparation/)) assert.ok(!c.prompt.split('<your_findings>')[1].split('</your_findings>')[0].includes('libellé tronqué'), 'a minor finding was re-judged')
  assert.equal(by(/^Après réparation \d — usage/).length, 0)
})

test('the same mistake in several places is one finding, fixed everywhere in one round', () => {
  for (const c of by(/^Relecteur /)) assert.match(c.prompt, /the same mistake in several places is one finding/)
  const repair = by(/^Réparation essai 1/)[0]
  assert.match(repair.prompt, /fix every instance in this round/)
  assert.ok(repair.prompt.includes('store.py delete_cube; store.py delete_layer'), 'the places named by the reviewer reach the developer')
})

test('every live verdict and every blocking or major defect leaves a replay script', () => {
  for (const c of by(/^Testeur \d en conditions réelles/)) {
    for (const v of Object.values(c.schema.properties.verdicts.properties)) assert.ok(v.required.includes('replay'), c.label)
    assert.ok(c.prompt.includes(REPLAY + '/<name>.sh <url>'), c.label)
    assert.match(c.prompt, /named c<criterion id>\.sh/)
    assert.match(c.prompt, /never a weaker check than the one you made by hand/)
  }
  for (const c of by(/^Relecteur /)) assert.match(c.prompt, /a blocking or major defect: save its reproduction as a replay script/)
  const repair = by(/^Réparation essai 1/)[0]
  assert.ok(repair.prompt.includes('replay: ' + REPLAY + '/reliability-1.sh'))
  assert.match(repair.prompt, /never edit a replay script/)
  assert.equal(r.replayScripts, 2, 'criteria 1 and 2 have a script; 3 has none, the path given for 4 is refused')
})

test('a replay path outside the replay folder never reaches a prompt', () => {
  for (const c of calls) assert.ok(!c.prompt.includes('/etc/passwd'), c.label)
})

test('after a repair: only the sources of the defect re-judge, script first', () => {
  for (const n of [1, 2, 3]) {
    const labels = by(new RegExp('^Après réparation ' + n)).map(c => c.label.split(' — ')[1].replace(/ \(.*/, '')).sort()
    assert.deepEqual(labels, ['fiabilité', 'testeur 1'], 'round ' + n)
  }
  const rev = one(/^Après réparation 1 — fiabilité/)
  assert.ok(rev.prompt.includes('replay: ' + REPLAY + '/reliability-1.sh'))
  assert.match(rev.prompt, /A finding with a replay script: run it first/)
  assert.ok(!rev.prompt.includes('<replay>'), 'a reviewer replays no other criterion')
  // The tester of the defect's criterion also runs that criterion's own script.
  assert.ok(one(/^Après réparation 1 — testeur 1/).prompt.includes('replay script of criterion 1, to run too: ' + REPLAY + '/c1.sh'))
})

test('after a repair: the scripts first, live only where the repair reaches, everything live on the last round', () => {
  const t1 = one(/^Après réparation 1 — testeur 1/)
  const block = t1.prompt.split('<replay>')[1].split('</replay>')[0]
  // Criterion 2 belongs to tester 2, who is not re-judging: the first tester replays it.
  assert.ok(block.includes('<criterion id="2" script="' + REPLAY + '/c2.sh">'), block)
  assert.ok(block.includes('<criterion id="3">'), 'criterion 3 has no script')
  assert.ok(block.includes('<criterion id="4">'), 'the refused path leaves criterion 4 without a script')
  assert.ok(!block.includes('<criterion id="1"'), 'the criterion of the open defect is re-judged, not replayed')
  assert.match(t1.prompt, /run every script first, one command each against your instance, no browser/)
  assert.match(t1.prompt, /replay its main path live only if the repair can reach it — it changed src\/store\.py, src\/api\/cubes\.py/)
  assert.ok(!t1.prompt.includes('this is the last round'))
  assert.ok(!one(/^Après réparation 2 — testeur 1/).prompt.includes('this is the last round'))
  const t3 = one(/^Après réparation 3 — testeur 1/)
  assert.match(t3.prompt, /without a script: replay its main path live — this is the last round, every one of them/)
  assert.ok(!t3.prompt.includes('only if the repair can reach it'))
})
