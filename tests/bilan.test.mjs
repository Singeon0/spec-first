// The time report (scripts/bilan.py): played on a small hand-made session folder, built in a
// temporary directory — figures checked by hand, every e-mail address masked, a missing journal
// or a truncated transcript line reported in "unread" and never fatal.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, rmSync, existsSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BILAN = new URL('../scripts/bilan.py', import.meta.url).pathname
const WF = 'wf_test0001-abc'
const T0 = Date.parse('2026-01-01T10:00:00Z')
const at = s => new Date(T0 + s * 1000).toISOString()
const ADDRESS = 'someone.private@example.com'

// one transcript line of each kind the tool reads
const user = s => ({ type: 'user', timestamp: at(s), message: { role: 'user', content: 'task' } })
const say = (s, model = 'claude-opus-test') => ({ type: 'assistant', timestamp: at(s), effort: 'high', message: { model, content: [{ type: 'text', text: 'ok' }] } })
const use = (s, id, name, input) => ({ type: 'assistant', timestamp: at(s), effort: 'high', message: { model: 'claude-opus-test', content: [{ type: 'tool_use', id, name, input }] } })
const result = (s, id, text) => ({ type: 'user', timestamp: at(s), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: text }] } })

// A reviewer (0–12 min) runs « make prepush » 10 min, the suite says 590 s.
// Tester 1 (0–30 min) is in a command 20 min. Tester 2 waits for tester 1: queued at 28 min,
// first line at 30 min 02 s, ends 10 min later. The repair (from 40 min 05 s, 10 min) runs
// « make test » 2 min — 40 tests, not the whole suite of 100 — and its transcript ends on a cut line.
const agents = {
  a1: { label: 'Relecteur un (opus high)', phase: 'Revue', queued: 0, lines: [user(0), say(30), use(60, 't1', 'Bash', { command: 'make prepush 2>&1 | tail -5' }), result(660, 't1', '=== 100 passed in 590.00s ==='), say(720)] },
  a2: { label: 'Testeur 1 (opus high)', phase: 'Revue', queued: 0, lines: [user(0), use(60, 't2', 'Bash', { command: 'sleep 1200; echo contact ' + ADDRESS }), result(1260, 't2', 'done'), say(1800)] },
  a3: { label: 'Testeur 2 (opus high)', phase: 'Revue', queued: 1680, lines: [user(1802), use(1862, 't3', 'REPL', { code: 'await sleep(300000)' }), result(2162, 't3', 'ok'), say(2402)] },
  a4: { label: 'Réparation essai 1 (opus high)', phase: 'Réparation', queued: 2405, lines: [user(2405), use(2465, 't4', 'Bash', { command: 'make test' }), result(2585, 't4', '40 passed in 100.00s'), say(3005)], cut: true },
}

function session({ journal = true, resumeBefore = null } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'sf-bilan-')))
  const s = join(dir, 'session')
  const sub = join(s, 'subagents/workflows', WF)
  mkdirSync(sub, { recursive: true })
  mkdirSync(join(s, 'workflows'), { recursive: true })
  const progress = Object.entries(agents).map(([id, a], i) => ({ type: 'workflow_agent', index: i + 1, label: a.label, phaseTitle: a.phase, agentId: id, model: 'claude-opus-test', queuedAt: T0 + a.queued * 1000, startedAt: T0 + a.queued * 1000 }))
  writeFileSync(join(s, 'workflows', WF + '.json'), JSON.stringify({ runId: WF, workflowName: 'review', status: 'completed', durationMs: 3005000, args: { testCommand: 'make prepush', quickTestCommand: 'make test' }, workflowProgress: progress }))
  if (journal) {
    const lines = [{ type: 'launched' }]
    for (const [id, a] of Object.entries(agents)) {
      if (id === resumeBefore) lines.push({ type: 'launched' })
      lines.push({ type: 'started', agentId: id, label: a.label, phase: a.phase })
    }
    writeFileSync(join(sub, 'journal.jsonl'), lines.map(l => JSON.stringify(l)).join('\n') + '\n')
  }
  for (const [id, a] of Object.entries(agents)) {
    writeFileSync(join(sub, 'agent-' + id + '.jsonl'), a.lines.map(l => JSON.stringify(l)).join('\n') + '\n')
    if (a.cut) appendFileSync(join(sub, 'agent-' + id + '.jsonl'), '{"type":"assistant","timestamp":"' + at(3600) + '","message":{"con')
  }
  return { dir, s }
}
const run = (args) => spawnSync('python3', [BILAN, ...args], { encoding: 'utf8' })
const byLabel = (r, start) => r.agents.find(a => a.label.startsWith(start))

test('figures of a hand-made workflow', () => {
  const { dir, s } = session()
  const out = join(dir, 'b.json')
  const p = run([s, WF, '--out', out])
  assert.equal(p.status, 0, p.stderr)
  const r = JSON.parse(readFileSync(out, 'utf8'))
  assert.equal(r.wall.minutes, 50.1)                       // 0 → 3005 s
  assert.equal(r.wall.legs.length, 1)
  assert.deepEqual(r.phases.map(x => [x.name, x.minutes]), [['Revue', 40], ['Réparation', 10]])
  const a1 = byLabel(r, 'Relecteur')
  assert.equal(a1.minutes, 12); assert.equal(a1.commandMinutes, 10); assert.equal(a1.modelMinutes, 2)
  assert.equal(a1.calls, 1); assert.equal(a1.model, 'claude-opus-test'); assert.equal(a1.effort, 'high')
  assert.equal(byLabel(r, 'Testeur 1').commandMinutes, 20)
  const t2 = byLabel(r, 'Testeur 2')
  assert.equal(t2.queueMinutes, 2.03)                       // queued 1680 s, first line 1802 s
  assert.equal(t2.serializedAfter, 'Testeur 1 (opus high)')
  assert.equal(t2.waitedForSiblingMinutes, 30)
  // suites: prepush timed by its own summary (590 s), make test by its call (40 tests < half of 100)
  assert.equal(r.suites.totalRuns, 2)
  assert.deepEqual(r.suites.runs.map(x => [x.matched[0], x.minutes, x.minutesFrom]), [['make prepush', 9.8, 'runner'], ['make test', 2, 'call']])
  assert.equal(r.suites.totalMinutes, 11.8)
  // concurrency: minute 0 both thinking, minute 1 both in a command; average = 3720 s of agents / 3005 s
  assert.deepEqual(r.concurrency.perMinute[0], [0, 0, 2]); assert.deepEqual(r.concurrency.perMinute[1], [1, 2, 0])
  assert.equal(r.concurrency.effectiveParallelism, 1.24); assert.equal(r.concurrency.peakActive, 2)
  // critical path: tester 1 → tester 2 → repair
  assert.deepEqual(r.criticalPath.chain.map(c => c.agent.split(' (')[0]), ['Testeur 1', 'Testeur 2', 'Réparation essai 1'])
  assert.equal(r.criticalPath.estimate, true)
  // three lines in French on stdout
  const lines = p.stdout.trim().split('\n')
  assert.equal(lines.length, 4)                             // three lines + where the report was written
  assert.match(lines[0], /^Durée totale 50 min : Revue 40 min, Réparation 10 min/)
  assert.match(lines[1], /« Testeur 2 » a attendu « Testeur 1 » 30 min/)
  assert.match(lines[2], /suites de tests complètes lancées 2 fois, 12 min/)
})

test('no e-mail address in the file or on stdout', () => {
  const { dir, s } = session()
  const p = run([s, WF])                                    // JSON on stdout
  assert.equal(p.status, 0, p.stderr)
  assert.ok(!p.stdout.includes('@example.com'), 'address leaked on stdout')
  assert.match(p.stdout, /contact <email>/)
  const out = join(dir, 'b.json')
  run([s, WF, '--out', out])
  assert.ok(!readFileSync(out, 'utf8').includes('@example.com'), 'address leaked in the file')
})

test('a truncated transcript line is reported, the agent still counted', () => {
  const { dir, s } = session()
  const out = join(dir, 'b.json')
  assert.equal(run([s, WF, '--out', out]).status, 0)
  const r = JSON.parse(readFileSync(out, 'utf8'))
  assert.ok(r.unread.some(u => /Réparation essai 1/.test(u) && /tronquée/.test(u)), JSON.stringify(r.unread))
  const rep = byLabel(r, 'Réparation')
  assert.equal(rep.minutes, 10); assert.equal(rep.badLines, 1)
})

test('a missing journal is reported and not fatal; labels come from the workflow file', () => {
  const { dir, s } = session({ journal: false })
  const out = join(dir, 'b.json')
  const p = run([s, WF, '--out', out])
  assert.equal(p.status, 0, p.stderr)
  const r = JSON.parse(readFileSync(out, 'utf8'))
  assert.ok(r.unread.some(u => /journal du workflow absent/.test(u)), JSON.stringify(r.unread))
  assert.equal(r.agents.length, 4)
  assert.equal(byLabel(r, 'Testeur 2').phase, 'Revue')
  assert.equal(r.wall.minutes, 50.1)
})

test('nothing readable at all still gives a report', () => {
  const { dir, s } = session()
  rmSync(join(s, 'subagents'), { recursive: true }); rmSync(join(s, 'workflows'), { recursive: true })
  const out = join(dir, 'b.json')
  const p = run([s, WF, '--out', out])
  assert.equal(p.status, 0, p.stderr)
  const r = JSON.parse(readFileSync(out, 'utf8'))
  assert.equal(r.agents.length, 0)
  assert.ok(r.unread.length >= 2)
  assert.equal(r.summary.length, 3)
})

test('with --project and --spec: default file, ledger counted inside the workflow window', () => {
  const { dir, s } = session()
  const root = join(dir, 'proj')
  mkdirSync(join(root, '.spec-first/ledger'), { recursive: true })
  const e = x => Math.round(T0 / 1000) + x
  writeFileSync(join(root, '.spec-first/ledger/journal.tsv'), [
    [e(60), 'run', 'full-aaaaaaaaaaaa-bbbbbbbb', 0, 590], [e(100), 'join', 'full-aaaaaaaaaaaa-bbbbbbbb', '', ''],
    [e(700), 'read', 'full-aaaaaaaaaaaa-bbbbbbbb', 0, ''], [e(2500), 'run', 'full-aaaaaaaaaaaa-bbbbbbbb', 1, 30],
    [e(-90000), 'run', 'quick-cccccccccccc-dddddddd', 0, 10],
  ].map(r => r.join('\t')).join('\n') + '\n')
  const p = run([s, WF, '--project', root, '--spec', 'my-spec'])
  assert.equal(p.status, 0, p.stderr)
  const file = join(root, '.spec-first/bilans/my-spec-' + WF + '.json')
  assert.ok(existsSync(file))
  const l = JSON.parse(readFileSync(file, 'utf8')).suites.ledger
  assert.deepEqual([l.run, l.read, l.join, l.lost, l.runMinutes], [2, 1, 1, 0, 10.3])
  assert.deepEqual(l.sameKeyRunMoreThanOnce, { 'full-aaaaaaaaaaaa-bbbbbbbb': 2 })
  assert.match(p.stdout, /registre : 2 exécutions, 1 lecture d'un résultat déjà là, 1 attente d'un run en cours/)
  assert.doesNotMatch(p.stdout, /\(s\)/)
})

test('a resumed workflow: each leg and the total', () => {
  const { dir, s } = session({ resumeBefore: 'a4' })
  const out = join(dir, 'b.json')
  assert.equal(run([s, WF, '--out', out]).status, 0)
  const r = JSON.parse(readFileSync(out, 'utf8'))
  assert.deepEqual(r.wall.legs.map(l => [l.index, l.minutes, l.agents]), [[1, 40, 3], [2, 10, 1]])
  assert.equal(r.wall.minutes, 50)                          // 40 + 10, the 5 s between legs left out
  assert.match(r.summary[0], /en 2 étapes \(40 min, 10 min\)/)
})

// A session whose only agent makes the calls given; the workflow's suite command is « node --test ».
function oneAgent(lines) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'sf-bilan-')))
  const s = join(dir, 'session')
  const sub = join(s, 'subagents/workflows', WF)
  mkdirSync(sub, { recursive: true }); mkdirSync(join(s, 'workflows'), { recursive: true })
  writeFileSync(join(s, 'workflows', WF + '.json'), JSON.stringify({ runId: WF, args: { testCommand: 'node --test', quickTestCommand: 'node --test' } }))
  writeFileSync(join(sub, 'journal.jsonl'), [{ type: 'launched' }, { type: 'started', agentId: 'x1', label: 'Agent seul', phase: 'Développement' }].map(l => JSON.stringify(l)).join('\n') + '\n')
  writeFileSync(join(sub, 'agent-x1.jsonl'), [user(0), ...lines, say(600)].map(l => JSON.stringify(l)).join('\n') + '\n')
  const out = join(dir, 'b.json')
  const p = run([s, WF, '--out', out])
  assert.equal(p.status, 0, p.stderr)
  return { r: JSON.parse(readFileSync(out, 'utf8')), stdout: p.stdout }
}
const virtual = (s, id, name, input) => ({ type: 'assistant', isVirtual: true, timestamp: at(s), message: { model: '<synthetic>', content: [{ type: 'tool_use', id, name, input }] } })

test('recording a suite command (suite set … heredoc, reset, key, list) is not a run; suite quick is', () => {
  const S = '/p/.spec-first/bin/suite'
  const { r } = oneAgent([
    use(10, 'b1', 'Bash', { command: S + " reset && " + S + " set quick <<'EOF'\nnode --test\nEOF\n" + S + " set full <<'EOF'\nnode --test\nEOF" }),
    result(12, 'b1', 'recorded quick'),
    use(20, 'b2', 'Bash', { command: "printf 'node --test' | " + S + ' set quick; ' + S + ' key quick; ' + S + ' list' }),
    result(21, 'b2', 'ok'),
    use(30, 'b3', 'Bash', { command: 'cat > notes.md <<EOF\nrun node --test\nEOF' }),
    result(31, 'b3', ''),
    use(40, 'b4', 'Bash', { command: 'cd /p && ' + S + ' quick' }),
    result(100, 'b4', 'STARTED key=quick-aaaaaaaaaaaa-bbbbbbbb in /p\nPASS key=quick-aaaaaaaaaaaa-bbbbbbbb secs=58 log=/p/x.log'),
    use(110, 'b5', 'Bash', { command: S + ' wait quick-aaaaaaaaaaaa-bbbbbbbb' }),
    result(111, 'b5', 'PASS key=quick-aaaaaaaaaaaa-bbbbbbbb secs=58'),
  ])
  assert.deepEqual(r.suites.runs.map(x => [x.matched, x.minutes]), [[['suite quick'], 1]])
})

test('in a REPL call only its shell calls count, never edit(), write(), strings or comments', () => {
  const B = '\x60'
  const readme = "await edit(W + '/README.md', '- " + B + "node --test" + B + " : les tests.', 'x')\n// then node --test\nconst doc = \"node --test\"\n"
  const targeted = "await $" + B + "cd ${W} && node --test test/api.test.js" + B
  const { r, stdout } = oneAgent([
    // no shell call at all: README text and a comment mention the command
    use(10, 'j1', 'REPL', { code: readme + "await write(W + '/a.md', 'node --test')" }),
    result(11, 'j1', 'ok'),
    // a targeted run inside a shell template, with prose around it
    use(20, 'j2', 'REPL', { code: readme + targeted }),
    result(30, 'j2', 'ok'),
    // the same call recorded with its inner tools: an Edit carrying the README text, a Bash running a targeted test
    use(40, 'j3', 'REPL', { code: readme + targeted }),
    result(50, 'j3', 'ok'),
    virtual(50, 'v1', 'Edit', { file_path: '/w/README.md', old_string: '- ' + B + 'node --test' + B + ' : les tests.', new_string: 'x' }),
    virtual(50, 'v2', 'Bash', { command: "cd '/w' && node --test test/api.test.js" }),
    // a real whole-suite run through $(…)
    use(60, 'j4', 'REPL', { code: "const r = await $('node --test 2>&1 | tail -3')" }),
    result(120, 'j4', 'ok'),
  ])
  assert.deepEqual(r.suites.runs.map(x => x.at), [at(60).replace(/\.\d+Z$/, 'Z')])
  assert.match(stdout, /suite de tests complète lancée 1 fois/)
  assert.match(stdout, /en moyenne 1,0 agent au travail/)
})
