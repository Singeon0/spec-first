// The Workflow runtime hands back the results of parallel() as copies (serialized), never the objects the
// jobs returned. review.js once recorded the judges' verdicts on those copies: a defect every judge said
// was fixed stayed open, and the review repaired it again for nothing (QualiSpectra, 10-11/11/2026).
// Run: node --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const SRC = readFileSync(new URL('../workflows/review.js', import.meta.url), 'utf8').replace(/^export const meta/m, 'const meta')

async function runReview(args, answer) {
  const labels = []
  const g = globalThis
  g.args = args
  g.log = () => {}
  g.phase = () => {}
  g.agent = async (prompt, o) => { labels.push(o.label); return answer(prompt, o) }
  // As the runtime does: the results come back as copies.
  g.parallel = async jobs => JSON.parse(JSON.stringify(await Promise.all(jobs.map(j => j()))))
  const r = await new Function(`return (async () => {\n${SRC}\n})()`)()
  return { r, labels }
}

const ARGS = {
  specPath: '/tmp/sf-test/docs/specs/demo.md',
  projectRoot: '/tmp/sf-test',
  baseCommit: 'abcdef1',
  criteria: [{ id: '1', text: 'the cube is deleted' }, { id: '2', text: 'the annotations survive a reconnection' }],
  workspace: '/tmp/sf-test/.spec-first/copies/demo--integration',
  branch: 'spec-first/demo--integration',
  focus: [
    { id: '1', reviewer: 'reliability', finding: 'deleting the cube leaves its annotations' },
    { id: '2', reviewer: 'tester', finding: 'an annotation deleted offline comes back' },
  ],
}

// Every judge answers « fixed » for each finding it is shown; nothing else answers.
const allFixed = (prompt, o) => o.label.startsWith('Rejugement')
  ? { results: [1, 2, 3].map(n => ({ n, fixed: true, unverifiable: false, proof: `fixed ${n}` })), newDefects: [] }
  : null

test('a defect every judge says is fixed counts as repaired, and no repair runs', async () => {
  const { r, labels } = await runReview(ARGS, allFixed)
  assert.ok(!r.error, r.error)
  assert.equal(r.open.length, 0, `still open: ${JSON.stringify(r.open)}`)
  assert.equal(r.repaired.length, 2)
  assert.equal(r.repairRounds, 0)
  assert.ok(!labels.some(l => /réparation/i.test(l)), `a repair ran: ${labels.join(' | ')}`)
})

test('a judge that says « not fixed » keeps the defect open', async () => {
  const notFixed = (prompt, o) => o.label.startsWith('Rejugement') && /fiabilit|reliab/i.test(o.label)
    ? { results: [1, 2, 3].map(n => ({ n, fixed: false, unverifiable: false, proof: 'still there' })), newDefects: [] }
    : allFixed(prompt, o)
  const { r } = await runReview(ARGS, notFixed)
  assert.ok(r.open.some(f => /annotations/.test(JSON.stringify(f))), `expected the reliability finding open: ${JSON.stringify(r.open)}`)
})
