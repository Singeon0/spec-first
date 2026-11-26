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

// Redesign of 26/11/2026 (3.3): the quick suite runs once, at the end of the run — never by a developer.
test('developers run only the tests of what they touch, never the quick suite', () => {
  for (const v of ['run, happy path', 'run, every verdict fails once']) {
    const devs = variants[v].filter(c => c.phase === 'Développement')
    assert.ok(devs.length > 0, v)
    for (const c of devs) {
      assert.ok(!c.prompt.includes(`\`${RUN.quickTestCommand}\``), `${v} — ${c.label}`)
      assert.match(c.prompt, /run only the tests of what you touch/, c.label)
    }
  }
  for (const c of variants['run, no quickTestCommand, subdir'].filter(c => c.phase === 'Développement')) {
    assert.match(c.prompt, /run only the tests of what you touch/, c.label)
    assert.ok(c.prompt.includes("from the copy's api folder"), c.label)
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

// Token cost on kipp (1.9.2, sprint 6): every agent read the spec whole and then again in slices,
// each live tester rebuilt the server and its seeding, browsers were driven one click per turn, and
// repair developers explored for 50 turns before their first write.
const BRIEF = 'But : annoter à plusieurs. Hors périmètre : mobile. Limites : jamais la base de prod.'
test('specBrief: the agents hold the spec and do not open it; without it, one whole read', () => {
  for (const [kind, args] of [['run', RUN], ['review', REVIEW]]) for (const flags of [[], ['--reject']]) {
    const at = `${kind} ${flags.join('')}`
    const withBrief = prompts(kind, { ...args, specBrief: BRIEF }, ...flags), without = prompts(kind, args, ...flags)
    assert.ok(withBrief.filter(c => c.prompt.includes(`— do not open it`)).length >= 3, at)
    for (const c of withBrief) {
      assert.doesNotMatch(c.prompt, /read it (whole )?first|read it once/, `${at} — ${c.label}`)
      if (c.prompt.includes('— do not open it')) assert.ok(c.prompt.includes(`<spec_brief>\n${BRIEF}\n</spec_brief>`), `${at} — ${c.label}`)
    }
    assert.ok(without.filter(c => c.prompt.includes('read it once, whole, never in slices')).length >= 3, at)
    for (const c of without) assert.doesNotMatch(c.prompt, /read it (whole )?first|spec_brief/, `${at} — ${c.label}`)
  }
})

test('live testers share one launch recipe and batch their browser checks', () => {
  for (const v of ['review, happy path', 'review, every verdict fails once']) {
    const testers = variants[v].filter(c => /LIVE TESTER/.test(c.prompt))
    assert.ok(testers.length >= 2, v)
    for (const c of testers) {
      assert.match(c.prompt, /Launch recipe: \S+\/\.spec-first\/harness\/\S+\/launch\.sh <port>/, `${v} — ${c.label}`)
      assert.match(c.prompt, /One evaluate_script per check/, `${v} — ${c.label}`)
    }
  }
  assert.ok(variants['review, every verdict fails once'].some(c => /^Après réparation/.test(c.label) && c.prompt.includes('Launch recipe:')), 'the re-judging tester reuses it')
})

test('developers read a file once and keep notes for after a compaction; a finding can name its place', () => {
  const READ = 'a file is read once — never in successive slices, never twice'
  const devs = [...variants['run, every verdict fails once'].filter(c => c.phase === 'Développement'), ...variants['review, every verdict fails once'].filter(c => c.label.startsWith('Réparation essai'))]
  assert.ok(devs.length >= 2)
  for (const c of devs) {
    assert.ok(c.prompt.includes(READ), c.label)
    assert.match(c.prompt, /Keep \S+\.spec-first\/logs\/\S+ current .*after a context compaction, read it and go on/, c.label)
  }
  const repair = variants['review, every verdict fails once'].find(c => c.label.startsWith('Réparation essai'))
  assert.ok(repair.prompt.includes("Start from each defect's reproduction and place, no wider exploration."))
  const reviewer = variants['review, happy path'].find(c => c.label.startsWith('Relecteur'))
  assert.ok(JSON.parse(reviewer.schemaText).properties.findings.items.properties.where, 'findings carry "where"')
})

// Speed (24/11/2026, QualiSpectra on seglab-hsi-dev): fusions one by one made a 30-minute queue while
// developer slots sat idle; 162 of their 200 minutes of commands were tests. Since the redesign of
// 26/11/2026 a fusion runs only the tests of the files changed on both sides — never the quick suite —
// and every developer starts at high. The batch itself is played in run-redesign.test.mjs, where the
// agents' timing is controlled.
test('fusions never run the quick suite; every developer starts at high', () => {
  const calls = variants['run, happy path']
  const fusions = calls.filter(c => /^Fusion groupes? /.test(c.label))
  assert.ok(fusions.length > 0, 'a fusion')
  for (const f of fusions) {
    assert.ok(!f.prompt.includes(`\`${RUN.quickTestCommand}\``), f.label)
    assert.ok(JSON.parse(f.schemaText).properties.notIntegrated, 'notIntegrated in the fusion schema')
  }
  assert.match(calls.find(c => c.label.startsWith('Groupe 1 — dév essai 1')).label, /\(opus high\)/)
  assert.match(calls.find(c => c.label.startsWith('Groupe 4 — dév essai 1')).label, /\(opus high\)/)
})

// Verification rules (24/11/2026): a change must not weaken the tests that judge it, a flaky test is
// never worked around, and a criterion stated as a property is tried on generated inputs.
test('tests are protected: weakened tests are a defect, a flaky test is never worked around', () => {
  const WEAK = 'a test deleted, skipped or loosened (an assertion removed or widened) when no criterion asks for it'
  const FLAKY = 'never skip it, never add a sleep, never rerun it until it passes'
  const run = variants['run, every verdict fails once'], review = variants['review, every verdict fails once']
  // No maintainer critic in the run since 26/11/2026: whoever writes code there carries the rule.
  const writers = run.filter(c => c.phase === 'Développement' || c.label.startsWith('Réparation (batterie rapide)') || c.label.startsWith('Fusion groupe'))
  assert.ok(writers.some(c => c.phase === 'Fusion'), 'the fusion fixes what the merges broke: it writes code too')
  assert.ok(writers.length > 0)
  for (const c of writers) assert.ok(c.prompt.includes(WEAK), c.label)
  assert.ok(review.find(c => c.prompt.includes('INTEGRATION AND MAINTENANCE REVIEWER')).prompt.includes(WEAK))
  const devs = [...run.filter(c => c.phase === 'Développement'), ...run.filter(c => c.prompt.includes('repairing the quick suite')), ...run.filter(c => c.label.startsWith('Fusion groupe')), ...review.filter(c => c.label.startsWith('Réparation essai'))]
  assert.ok(devs.length >= 3)
  for (const c of devs) assert.ok(c.prompt.includes(FLAKY), c.label)
  const testers = run.filter(c => c.prompt.includes('You are the TESTER'))
  assert.ok(testers.length > 0)
  for (const c of testers) assert.ok(c.prompt.includes('many generated inputs, not a few chosen examples'), c.label)
})
