// Checks the text the workflows really send to their agents (fake agents, real kipp args) against
// the faults seen on kipp: agents digging into the hook config, refused `sleep` waits, the quick
// test command run in a loop by a developer (wf_7fd7a879, 47 runs of `make test-unit`), and
// whole logs as proofs breaking the structured output. Every check runs on the happy path, on a
// run where every verdict fails once (repairs, retries), and on variants of the args.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const here = new URL('.', import.meta.url).pathname
const tmp = mkdtempSync(join(tmpdir(), 'sf-prompts-'))
const fixture = kind => JSON.parse(readFileSync(`${here}fixtures/${kind}-qualispectra-sprint6.json`, 'utf8'))
const prompts = (kind, args, ...flags) => {
  const f = join(tmp, `${kind}-${Math.random().toString(36).slice(2)}.json`)
  writeFileSync(f, JSON.stringify(args))
  const m = JSON.parse(execFileSync('node', [`${here}measure.mjs`, kind, f, '--prompts', ...flags], { encoding: 'utf8', maxBuffer: 1 << 28 }))
  assert.equal(m.error, undefined, m.error)
  return m.calls
}
const RUN = fixture('run'), REVIEW = fixture('review')
const variants = {
  'run, happy path': prompts('run', RUN),
  'run, every verdict fails once': prompts('run', RUN, '--reject'),
  'run, no quickTestCommand, subdir': prompts('run', { ...RUN, quickTestCommand: undefined, subdir: 'api' }),
  'review, happy path': prompts('review', REVIEW),
  'review, every verdict fails once': prompts('review', REVIEW, '--reject'),
  'review, no quickTestCommand, subdir': prompts('review', { ...REVIEW, quickTestCommand: undefined, subdir: 'api' }),
}
// The duplicate merger only merges text and runs no command: it is left out of the command rules.
const each = check => { for (const [v, calls] of Object.entries(variants)) { assert.ok(calls.length > 0, v); for (const c of calls) if (!c.label.startsWith('Fusion des doublons')) check(c, `${v} — ${c.label}`) } }
const WAIT = "timeout 300 bash -c 'until <done test>; do sleep 10; done'"

test('the reject variants reach the repair paths', () => {
  for (const v of ['run, every verdict fails once', 'review, every verdict fails once'])
    assert.ok(variants[v].some(c => /Réparation/.test(c.label)), v)
})

test('every prompt forbids touching the hook config, none says hooks must be set up', () => {
  each((c, at) => {
    assert.ok(c.prompt.includes('never read or change their configuration (core.hooksPath, .githooks, .git/hooks)'), at)
    assert.doesNotMatch(c.prompt, /hooks must run|pre-commit install/i, at)
  })
})

test('every prompt gives the one allowed wait form and no vague one', () => {
  each((c, at) => {
    assert.ok(c.prompt.includes(WAIT), at)
    assert.doesNotMatch(c.prompt, /bounded steps|short waits|sleep \d+ &&/i, at)
  })
})

test('developers run the quick test command once, before the commit', () => {
  for (const v of ['run, happy path', 'run, every verdict fails once']) {
    const devs = variants[v].filter(c => c.phase === 'Développement')
    assert.ok(devs.length > 0, v)
    for (const c of devs) {
      assert.ok(c.prompt.includes(`\`${RUN.quickTestCommand}\` once, just before your commit — never in a loop`), `${v} — ${c.label}`)
      assert.match(c.prompt, /run only the tests of what you touch/, c.label)
    }
  }
  for (const c of variants['run, no quickTestCommand, subdir'].filter(c => c.phase === 'Développement')) {
    assert.match(c.prompt, /run only the tests of what you touch/, c.label)
    assert.ok(c.prompt.includes("from the copy's api folder"), c.label)
    assert.doesNotMatch(c.prompt, /once, just before your commit/, c.label)
  }
})

// Every string field named proof or tests, at any depth of any schema, carries the cap.
function proofFields(schema, path = '', out = []) {
  if (!schema || typeof schema !== 'object') return out
  for (const [k, v] of Object.entries(schema.properties || {})) {
    if ((k === 'proof' || k === 'tests') && v.type === 'string') out.push([`${path}.${k}`, v.description || ''])
    proofFields(v, `${path}.${k}`, out)
  }
  if (schema.items) proofFields(schema.items, `${path}[]`, out)
  for (const v of Object.values(schema.additionalProperties && typeof schema.additionalProperties === 'object' ? { a: schema.additionalProperties } : {})) proofFields(v, `${path}{}`, out)
  return out
}

test('proof fields are capped (failures seen: proofs over 2,000 chars broke the JSON)', () => {
  let seen = 0
  each((c, at) => {
    for (const [p, d] of proofFields(JSON.parse(c.schemaText))) { seen++; assert.match(d, /At most 500 characters/, `${at} ${p}`) }
  })
  assert.ok(seen > 50, `only ${seen} proof fields checked`)
})
