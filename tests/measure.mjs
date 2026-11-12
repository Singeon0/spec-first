// Measures what a workflow sends to its agents on the happy path: number of agents and size of
// every prompt, per phase. Agents are fakes that answer the minimal « all good » object built
// from each call's schema. Usage: node tests/measure.mjs run|review fixtures/<args>.json [--json|--prompts]
// (--prompts: like --json, with each call's full prompt).
import { readFileSync, existsSync } from 'node:fs'

const [kind, fixture, flag] = process.argv.slice(2)
const SRC = readFileSync(new URL(`../workflows/${kind}.js`, import.meta.url), 'utf8').replace(/^export const meta/m, 'const meta')
const args = JSON.parse(readFileSync(existsSync(fixture) ? fixture : new URL(fixture, import.meta.url), 'utf8'))

let n = 0
const STR = { summary: 'done', proof: 'ran the test, it passes', tests: 'make test: ok' }
const EMPTY_OK = /^(blocker|reason|note|why|cause)$/
function fake(schema, key = '') {
  if (!schema) return null
  if (schema.enum) return schema.enum.includes('pass') ? 'pass' : schema.enum[0]
  switch (schema.type) {
    case 'object': {
      const o = {}
      for (const k of schema.required || Object.keys(schema.properties || {})) o[k] = fake((schema.properties || {})[k], k)
      return o
    }
    case 'array': return []
    case 'boolean': return !/^(blocked|crashed|unverifiable)$/.test(key)
    case 'integer': case 'number': return 0
    default:
      if (key === 'workspace') return `${args.projectRoot}/.spec-first/copies/m${++n}/wt`
      if (key === 'branch') return `spec-first-measure-${n}`
      return EMPTY_OK.test(key) ? '' : (STR[key] || 'ok')
  }
}

const calls = []
const g = globalThis
g.args = args
g.log = () => {}
g.phase = () => {}
g.agent = async (prompt, o = {}) => {
  calls.push({ label: o.label || '', phase: o.phase || '', model: o.model || '', chars: prompt.length, schema: JSON.stringify(o.schema || {}).length, ...(flag === '--prompts' && { prompt, schemaText: JSON.stringify(o.schema || {}) }) })
  return fake(o.schema)
}
g.parallel = async jobs => JSON.parse(JSON.stringify(await Promise.all(jobs.map(j => j()))))
g.pipeline = async (items, ...stages) => { const out = []; for (const it of items) { let v = it; for (const s of stages) v = await s(v); out.push(v) } return out }

let result, error
try { result = await new Function(`return (async () => {\n${SRC}\n})()`)() } catch (e) { error = String(e && e.stack || e) }

const total = calls.reduce((s, c) => s + c.chars, 0)
const byPhase = {}
for (const c of calls) { const p = byPhase[c.phase] ||= { agents: 0, chars: 0 }; p.agents++; p.chars += c.chars }
const out = { agents: calls.length, promptChars: total, approxTokens: Math.round(total / 3.5), byPhase, calls, error, resultKeys: result && Object.keys(result) }
if (flag === '--json' || flag === '--prompts') console.log(JSON.stringify(out))
else {
  console.log(`${kind} — ${calls.length} agents, ${total} chars (~${out.approxTokens} tokens)${error ? `\nERROR ${error.slice(0, 300)}` : ''}`)
  for (const [p, v] of Object.entries(byPhase)) console.log(`  ${p.padEnd(24)} ${String(v.agents).padStart(3)} agents ${String(v.chars).padStart(8)} chars`)
  for (const c of calls) console.log(`    ${String(c.chars).padStart(6)}  ${c.label}`)
  if (result) console.log('result:', JSON.stringify(result).slice(0, 400))
}
