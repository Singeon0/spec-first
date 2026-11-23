// Replays the real args of two kipp runs (QualiSpectra sprint 6: run wf_7fd7a879, review wf_592c727e)
// through measure.mjs and checks the prompts sent to the agents are no bigger, and no more numerous,
// than the baseline (fixtures/baseline-1.10.0.json) — raised only on purpose, with the reason in its note.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const here = new URL('.', import.meta.url).pathname
const base = JSON.parse(readFileSync(new URL('fixtures/baseline-1.10.0.json', import.meta.url), 'utf8'))
const measure = (kind, fixture) =>
  JSON.parse(execFileSync('node', [`${here}measure.mjs`, kind, `fixtures/${fixture}`, '--json'], { encoding: 'utf8' }))

for (const [kind, fixture] of [['run', 'run-qualispectra-sprint6.json'], ['review', 'review-qualispectra-sprint6.json']]) {
  test(`${kind}: prompts no bigger than the ${base.version} baseline`, () => {
    const m = measure(kind, fixture)
    assert.equal(m.error, undefined, m.error)
    assert.ok(m.agents <= base[kind].agents, `${m.agents} agents > ${base[kind].agents}`)
    assert.ok(m.promptChars <= base[kind].promptChars, `${m.promptChars} chars > ${base[kind].promptChars}`)
  })
}
