// The suite command (scripts/suite): one ledger shared by every copy of a project. Played on a
// throwaway git repository: a result is read back instead of run again, two callers on the same
// tree share one execution, a failure stays a failure, a dirty copy is refused, a vanished run is
// reported and never restarted in silence.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync, spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, chmodSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SRC = new URL('../scripts/suite', import.meta.url).pathname
const sh = (cwd, cmd) => execFileSync('bash', ['-c', cmd], { cwd, encoding: 'utf8' })
function project() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'sf-suite-')))
  sh(root, 'git init -q . && git config user.email t@example.invalid && git config user.name t && echo /.spec-first/ >> .git/info/exclude && echo one > a.txt && git add a.txt && git commit -qm one')
  mkdirSync(join(root, '.spec-first/bin'), { recursive: true })
  const bin = join(root, '.spec-first/bin/suite')
  copyFileSync(SRC, bin); chmodSync(bin, 0o755)
  const suite = (cwd, args, opts = {}) => spawnSync(bin, args, { cwd, encoding: 'utf8', env: { ...process.env, ...opts.env }, input: opts.input })
  const set = (name, cmd) => assert.equal(suite(root, ['set', name], { input: cmd }).status, 0)
  return { root, bin, suite, set, count: () => existsSync(join(root, '.spec-first/count')) ? readFileSync(join(root, '.spec-first/count'), 'utf8').length : 0 }
}
const counted = (root, then = 'true') => 'printf x >> "' + root + '/.spec-first/count"; ' + then

test('a result is read from the ledger, never run twice on the same tree', () => {
  const p = project()
  p.set('quick', counted(p.root, 'echo all green'))
  const a = p.suite(p.root, ['quick'])
  assert.equal(a.status, 0, a.stdout + a.stderr)
  assert.match(a.stdout, /STARTED key=quick-[0-9a-f]{12}-[0-9a-f]{8}[\s\S]*PASS key=/)
  const b = p.suite(p.root, ['quick'])
  assert.equal(b.status, 0)
  assert.doesNotMatch(b.stdout, /STARTED/)
  assert.equal(p.count(), 1)
})

test('the same tree in another copy is the same result; another tree is another run', () => {
  const p = project()
  p.set('quick', counted(p.root))
  assert.equal(p.suite(p.root, ['quick']).status, 0)
  const copy = p.root + '-copy'
  sh(p.root, 'git worktree add -q "' + copy + '" -b other')
  assert.equal(p.suite(copy, ['quick']).status, 0)
  assert.equal(p.count(), 1)
  sh(copy, 'echo two > b.txt && git add b.txt && git commit -qm two')
  assert.equal(p.suite(copy, ['quick']).status, 0)
  assert.equal(p.count(), 2)
})

test('the key changes with the command, the setup, the subdir and an untracked .env', () => {
  const p = project()
  p.set('quick', 'true')
  const key = () => p.suite(p.root, ['key', 'quick']).stdout.trim()
  const seen = new Set([key()])
  p.set('quick', 'true # other'); seen.add(key())
  p.set('setup', 'make install'); seen.add(key())
  sh(p.root, 'echo .env >> .git/info/exclude && echo A=1 > .env'); seen.add(key())
  writeFileSync(join(p.root, '.env'), 'A=2\n'); seen.add(key())
  assert.equal(seen.size, 5)
  assert.equal(p.suite(p.root, ['quick']).status, 0, 'an ignored .env does not make the copy dirty')
})

test('a failure is kept as a failure, and --rerun keeps the earlier result beside the new one', () => {
  const p = project()
  p.set('full', counted(p.root, 'echo boom; exit 7'))
  const a = p.suite(p.root, ['full'])
  assert.equal(a.status, 1)
  assert.match(a.stdout, /FAIL key=\S+ exit=7[\s\S]*boom[\s\S]*EXIT 7/)
  assert.equal(p.suite(p.root, ['full']).status, 1)
  assert.equal(p.count(), 1)
  assert.equal(p.suite(p.root, ['full', '--rerun']).status, 1)
  assert.equal(p.count(), 2)
  const key = p.suite(p.root, ['key', 'full']).stdout.trim()
  assert.ok(existsSync(join(p.root, '.spec-first/ledger', key + '.result.1')))
})

test('a copy with uncommitted changes is refused', () => {
  const p = project()
  p.set('quick', counted(p.root))
  writeFileSync(join(p.root, 'a.txt'), 'changed\n')
  const a = p.suite(p.root, ['quick'])
  assert.equal(a.status, 3)
  assert.match(a.stdout, /REFUSED uncommitted changes/)
  writeFileSync(join(p.root, 'a.txt'), 'one\n')
  writeFileSync(join(p.root, 'new.txt'), 'untracked\n')
  assert.equal(p.suite(p.root, ['quick']).status, 3)
  assert.equal(p.count(), 0)
})

test('an unknown suite and a suite with no command are refused', () => {
  const p = project()
  assert.equal(p.suite(p.root, ['quick']).status, 3)
  assert.equal(p.suite(p.root, ['set', 'anything'], { input: 'true' }).status, 3)
  p.set('heavy:12', 'true')
  assert.equal(p.suite(p.root, ['heavy:12']).status, 0)
  assert.equal(p.suite(p.root, ['heavy:13']).status, 3)
})

test('two callers at once share one execution; a bounded wait says « RUNNING » and wait picks it up', async () => {
  const p = project()
  p.set('full', counted(p.root, 'sleep 6; echo done'))
  const first = spawn(p.bin, ['full'], { cwd: p.root, env: { ...process.env, SUITE_WAIT: '2' } })
  let out = ''; first.stdout.on('data', d => { out += d })
  const code = await new Promise(r => first.on('close', r))
  assert.equal(code, 2, out)
  const key = /RUNNING key=(\S+)/.exec(out)[1]
  const second = p.suite(p.root, ['full'])
  assert.match(second.stdout, /JOINED/)
  assert.equal(second.status, 0, second.stdout)
  assert.equal(p.suite(p.root, ['wait', key]).status, 0)
  assert.equal(p.count(), 1)
})

test('a run that vanished is reported lost, restarted only on --rerun', () => {
  const p = project()
  p.set('quick', counted(p.root))
  const key = p.suite(p.root, ['key', 'quick']).stdout.trim()
  mkdirSync(join(p.root, '.spec-first/ledger', key + '.lock'), { recursive: true })
  writeFileSync(join(p.root, '.spec-first/ledger', key + '.lock/pid'), '999999\n')
  const a = p.suite(p.root, ['quick'])
  assert.equal(a.status, 4, a.stdout)
  assert.match(a.stdout, /LOST key=/)
  assert.equal(p.count(), 0)
  assert.equal(p.suite(p.root, ['quick', '--rerun']).status, 0)
  assert.equal(p.count(), 1)
})

test('reset forgets every recorded command, the subdir of an earlier spec included', () => {
  const p = project()
  sh(p.root, 'mkdir api && echo x > api/marker && git add api && git commit -qm api')
  p.set('subdir', 'api')
  p.set('quick', 'test -f marker')
  assert.equal(p.suite(p.root, ['quick']).status, 0)
  assert.equal(p.suite(p.root, ['reset']).status, 0)
  assert.equal(p.suite(p.root, ['quick']).status, 3, 'no command left')
  p.set('quick', 'test -f api/marker')
  assert.equal(p.suite(p.root, ['quick']).status, 0, 'runs from the top again')
})

test('the suite runs from the recorded subdir', () => {
  const p = project()
  sh(p.root, 'mkdir api && echo x > api/marker && git add api && git commit -qm api')
  p.set('subdir', 'api')
  p.set('quick', 'test -f marker')
  assert.equal(p.suite(p.root, ['quick']).status, 0)
})
