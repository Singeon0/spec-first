// Checks the text the workflows really send to their agents (fake agents, real kipp args) against
// three faults seen on kipp: agents digging into the hook config, refused `sleep` waits, and the
// quick test command run in a loop by a developer (wf_7fd7a879, 47 runs of `make test-unit`).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

const here = new URL('.', import.meta.url).pathname
const prompts = (kind, fixture) => {
  const m = JSON.parse(execFileSync('node', [`${here}measure.mjs`, kind, `fixtures/${fixture}`, '--prompts'], { encoding: 'utf8', maxBuffer: 1 << 26 }))
  assert.equal(m.error, undefined, m.error)
  return m.calls
}
const run = prompts('run', 'run-qualispectra-sprint6.json')
const review = prompts('review', 'review-qualispectra-sprint6.json')
const WAIT = "timeout 300 bash -c 'until <done test>; do sleep 10; done'"

test('no prompt tells agents the hooks must be set up in the copy', () => {
  for (const c of [...run, ...review]) assert.doesNotMatch(c.prompt, /hooks must run/i, c.label)
})

test('every prompt gives the one allowed wait form', () => {
  for (const c of [...run, ...review]) assert.ok(c.prompt.includes(WAIT), c.label)
})

test('developers run the quick test command once, before the commit', () => {
  const quick = JSON.parse(execFileSync('cat', [`${here}fixtures/run-qualispectra-sprint6.json`], { encoding: 'utf8' })).quickTestCommand
  assert.ok(quick, 'fixture has a quickTestCommand')
  const devs = run.filter(c => c.phase === 'Développement')
  assert.ok(devs.length > 0)
  for (const c of devs) {
    assert.ok(c.prompt.includes(`\`${quick}\` once, just before your commit — never in a loop`), c.label)
    assert.match(c.prompt, /run only the tests of what you touch/, c.label)
  }
})

test('proof fields are capped (failures seen: proofs over 2,000 chars broke the JSON)', () => {
  for (const c of [...run, ...review]) {
    for (const m of c.schemaText.matchAll(/"proof":\{"type":"string","description":"([^"]*)"/g))
      assert.match(m[1], /At most 500 characters/, c.label)
  }
})
