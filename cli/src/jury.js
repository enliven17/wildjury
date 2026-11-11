import { randomBytes } from 'node:crypto'
import * as P from './prompts.js'

// Labs we try to seat first, so a default jury spans different training lineages.
const LABS = ['anthropic', 'openai', 'google', 'deepseek', 'mistralai', 'xai', 'x-ai', 'qwen', 'moonshotai', 'z-ai', 'meta-llama']
const NOT_CHAT = /embed|rerank|whisper|tts|transcri|moderation|realtime|image|audio|vision|guard|voxtral|-spot$|preview|-exp/i
const SEVERITY = { high: 3, medium: 2, low: 1 }

export const vendorOf = (m) => m.owned_by || String(m.id).split(/[/:]/)[0]
// Otari reports input_price_per_million; OpenRouter-style catalogs use prompt.
const price = (m) => Number(m.pricing?.input_price_per_million ?? m.pricing?.prompt ?? m.pricing?.input ?? NaN)

/** One upper-tier chat model per lab, preferred labs first. */
export function pickJury(models, n = 5) {
  const byLab = new Map()
  for (const m of models) {
    if ((m.type && m.type !== 'chat') || NOT_CHAT.test(m.id)) continue
    const lab = vendorOf(m)
    if (!byLab.has(lab)) byLab.set(lab, [])
    byLab.get(lab).push(m)
  }
  const labs = [...byLab.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  return labs.slice(0, n).map((lab) => {
    const list = byLab.get(lab)
    const priced = list.filter((m) => price(m) > 0).sort((a, b) => price(a) - price(b))
    // ponytail: the 75th-percentile price stands in for "the lab's strong everyday model"; pass --models to choose exactly.
    return (priced.length ? priced[Math.floor((priced.length - 1) * 0.75)] : list[0]).id
  })
}
const rank = (lab) => (LABS.indexOf(lab) + 1 || 99)

/** First JSON object in a reply, tolerating code fences and chatter around it. */
export function extractJson(text) {
  if (typeof text !== 'string') return null
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

const clamp01 = (x) => (Number.isFinite(Number(x)) ? Math.min(1, Math.max(0, Number(x))) : null)

/** Largest position wins only with a strict majority of jurors who voted. */
export function tallyAsk(positions, voting) {
  const clean = (positions || [])
    .map((p) => ({ ...p, jurors: [...new Set(p.jurors || [])].filter((j) => voting.includes(j)) }))
    .filter((p) => p.jurors.length)
    .sort((a, b) => b.jurors.length - a.jurors.length)
  const top = clean[0]
  const agreement = top ? top.jurors.length / voting.length : 0
  return { positions: clean, agreement, hung: !top || top.jurors.length * 2 <= voting.length }
}

export function tallyReview(ballots) {
  const approve = ballots.filter((b) => b.verdict === 'approve').length
  const changes = ballots.length - approve
  const verdict = approve === changes ? 'hung' : approve > changes ? 'approve' : 'request_changes'
  return { verdict, approve, changes }
}

export function sortFindings(findings, voting) {
  return (findings || [])
    .map((f) => ({ ...f, jurors: [...new Set(f.jurors || [])].filter((j) => voting.includes(j)) }))
    .filter((f) => f.jurors.length)
    .sort((a, b) => b.jurors.length - a.jurors.length || (SEVERITY[b.severity] || 0) - (SEVERITY[a.severity] || 0))
}

export const newTrialId = () => `wj-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`

const text = (res) => res?.choices?.[0]?.message?.content ?? ''
const sources = (res) =>
  (res?.otari_tool_calls || []).flatMap((c) => (c.sources || c.results || []).map((s) => s.url).filter(Boolean))

async function seat(client, { model, i, n, system, user, trial, web, onDone }) {
  const t0 = Date.now()
  const juror = { id: `J${i}`, model }
  try {
    const body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.4 }
    if (web) body.tools = [{ type: 'otari_web_search', max_uses: 3 }]
    let res
    try {
      res = await client.chat(body, `${trial}/juror-${i}`)
    } catch (e) {
      // A workspace can switch web search off; answer without it rather than recuse.
      if (!(web && e.code === 'web_access_disabled')) throw e
      delete body.tools
      juror.webOff = true
      res = await client.chat(body, `${trial}/juror-${i}`)
    }
    const ballot = extractJson(text(res))
    Object.assign(juror, { ms: Date.now() - t0, usage: res.usage, sources: sources(res) })
    if (!ballot) Object.assign(juror, { recused: 'unreadable ballot' })
    else juror.ballot = { ...ballot, confidence: clamp01(ballot.confidence) }
  } catch (e) {
    Object.assign(juror, { ms: Date.now() - t0, recused: e.code === 'timeout' ? 'timed out' : `${e.code || 'error'}: ${e.message}` })
  }
  onDone?.(juror)
  return juror
}

async function foreperson(client, model, system, user, trial) {
  const res = await client.chat(
    { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0 },
    `${trial}/foreperson`,
  )
  return { parsed: extractJson(text(res)), usage: res.usage }
}

function empanel(client, { models, system, user, trial, web, onJuror }) {
  const n = models.length
  return Promise.all(models.map((model, k) => seat(client, { model, i: k + 1, n, system: system(k + 1, n), user, trial, web, onDone: onJuror })))
}

const seated = (jurors) => jurors.filter((j) => j.ballot)
// The first juror to return a ballot chairs, unless --judge names one.
const chair = (voting) => voting.reduce((a, b) => (b.ms < a.ms ? b : a)).model

export async function ask(client, { question, context = '', models, judge, web, onJuror, trial = newTrialId() }) {
  const user = context ? `${question}\n\nContext:\n${context}` : question
  const jurors = await empanel(client, { models, system: P.jurorAsk, user, trial, web, onJuror })
  const voting = seated(jurors)
  if (voting.length < 2) return { trial, kind: 'ask', question, jurors, error: 'Fewer than two jurors returned a ballot.' }
  const ballots = voting.map((j) => `${j.id} (${j.model}): ${j.ballot.answer}\nReasoning: ${j.ballot.reasoning}`).join('\n\n')
  const fp = await foreperson(client, judge || chair(voting), P.forepersonAsk, `Question: ${question}\n\n${ballots}`, trial)
  const tally = tallyAsk(fp.parsed?.positions, voting.map((j) => j.id))
  return { trial, kind: 'ask', question, jurors, foreperson: judge || chair(voting), ...tally }
}

export async function review(client, { diff, models, judge, onJuror, trial = newTrialId() }) {
  const jurors = await empanel(client, { models, system: P.jurorReview, user: `Review this diff:\n\n${diff}`, trial, onJuror })
  const voting = seated(jurors)
  if (voting.length < 2) return { trial, kind: 'review', jurors, error: 'Fewer than two jurors returned a ballot.' }
  const ids = voting.map((j) => j.id)
  const all = voting.flatMap((j) => (j.ballot.findings || []).map((f) => ({ ...f, juror: j.id })))
  let findings = []
  if (all.length) {
    const fp = await foreperson(client, judge || chair(voting), P.forepersonReview, JSON.stringify(all), trial)
    findings = sortFindings(fp.parsed?.findings, ids)
  }
  return { trial, kind: 'review', jurors, foreperson: judge || chair(voting), findings, ...tallyReview(voting.map((j) => j.ballot)) }
}
