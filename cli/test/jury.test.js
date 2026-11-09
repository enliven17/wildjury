import test from 'node:test'
import assert from 'node:assert/strict'
import { ask, extractJson, pickJury, sortFindings, tallyAsk, tallyReview } from '../src/jury.js'

test('extractJson reads fenced and chatty replies', () => {
  assert.deepEqual(extractJson('Sure!\n```json\n{"a": 1}\n```'), { a: 1 })
  assert.equal(extractJson('no json here'), null)
  assert.equal(extractJson('{broken'), null)
})

test('tallyAsk needs a strict majority', () => {
  const v = ['J1', 'J2', 'J3', 'J4']
  const win = tallyAsk([{ label: 'b', jurors: ['J4'] }, { label: 'a', jurors: ['J1', 'J2', 'J3', 'J9'] }], v)
  assert.equal(win.positions[0].label, 'a')
  assert.deepEqual(win.positions[0].jurors, ['J1', 'J2', 'J3'])
  assert.equal(win.hung, false)
  assert.equal(win.agreement, 0.75)
  assert.equal(tallyAsk([{ label: 'a', jurors: ['J1', 'J2'] }, { label: 'b', jurors: ['J3', 'J4'] }], v).hung, true)
  assert.equal(tallyAsk(null, v).hung, true)
})

test('tallyReview splits ties as hung', () => {
  assert.equal(tallyReview([{ verdict: 'approve' }, { verdict: 'request_changes' }]).verdict, 'hung')
  assert.equal(tallyReview([{ verdict: 'approve' }, { verdict: 'approve' }, { verdict: 'x' }]).verdict, 'approve')
})

test('sortFindings ranks by votes then severity', () => {
  const f = sortFindings(
    [
      { title: 'low', severity: 'high', jurors: ['J1'] },
      { title: 'top', severity: 'low', jurors: ['J1', 'J2'] },
      { title: 'ghost', severity: 'high', jurors: ['J7'] },
    ],
    ['J1', 'J2'],
  )
  assert.deepEqual(f.map((x) => x.title), ['top', 'low'])
})

test('pickJury seats one model per lab, preferred labs first, skipping non-chat', () => {
  const m = [
    { id: 'zeta/one', pricing: { prompt: '1' } },
    { id: 'openai/text-embedding-3', type: 'embedding' },
    { id: 'openai/a', pricing: { prompt: '1' } },
    { id: 'openai/b', pricing: { prompt: '2' } },
    { id: 'openai/c', pricing: { prompt: '9' } },
    { id: 'anthropic/x', pricing: { prompt: '3' } },
  ]
  assert.deepEqual(pickJury(m, 2), ['anthropic/x', 'openai/b'])
  assert.deepEqual(pickJury(m, 9), ['anthropic/x', 'openai/b', 'zeta/one'])
})

test('ask runs a full trial against a fake gateway', async () => {
  const seen = []
  const client = {
    chat: async (body, session) => {
      seen.push(session)
      if (session.endsWith('/foreperson')) return { choices: [{ message: { content: '{"positions":[{"label":"yes","jurors":["J1","J2"]}]}' } }] }
      if (body.model === 'bad') throw Object.assign(new Error('nope'), { code: 'model_not_found' })
      return { choices: [{ message: { content: '{"answer":"yes","confidence":2,"reasoning":"r"}' } }], usage: { total_tokens: 10 } }
    },
  }
  const r = await ask(client, { question: 'q?', models: ['a', 'b', 'bad'] })
  assert.equal(r.hung, false)
  assert.equal(r.jurors[0].ballot.confidence, 1)
  assert.match(r.jurors[2].recused, /model_not_found/)
  assert.ok(seen.every((s) => s.startsWith(r.trial)))
})
