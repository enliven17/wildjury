#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { createClient, OtariError, VERSION } from '../src/otari.js'
import { ask, newTrialId, pickJury, review, vendorOf } from '../src/jury.js'
import * as R from '../src/render.js'

const HELP = `
  ${R.bold(R.lime('wildjury'))} ${R.dim(VERSION)}  A jury of LLMs from different labs, through one Otari key.

  ${R.bold('Usage')}
    wildjury ask "question" [-f file ...] [--web]   Ask the jury; get a verdict and the dissent
    wildjury review [--base main | -]               Jury review of your git diff (exit 1 unless approved)
    wildjury models                                 Models your key can seat, and the default jury

  ${R.bold('Options')}
    -m, --models a,b,c   Jurors (catalog ids or provider:model). Default: one model per lab
    -n, --jurors 5       Size of the default jury
    -j, --judge model    Foreperson who groups the ballots. Default: first juror to answer
    -f, --file path      Attach a file as context to ask (repeatable)
        --base ref       Review the diff from ref to HEAD instead of your working changes
        --web            Let jurors search the web (Otari built-in web search)
        --json           Print the full trial as JSON
    -h, --help

  ${R.bold('Env')}  OTARI_API_KEY (required) · OTARI_BASE_URL · WILDJURY_MODELS
`

const MAX_INPUT = 80_000

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

function gitDiff(base) {
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 32 << 20 })
  if (base) return git('diff', `${base}...HEAD`)
  return git('diff', '--staged') || git('diff', 'HEAD')
}

const clip = (s) => (s.length > MAX_INPUT ? s.slice(0, MAX_INPUT) + `\n\n[truncated at ${MAX_INPUT} characters]` : s)

async function jury(client, opts) {
  const list = opts.models || process.env.WILDJURY_MODELS
  if (list) return list.split(',').map((s) => s.trim()).filter(Boolean)
  return pickJury(await client.models(), Number(opts.jurors) || 5)
}

async function main() {
  const { values: o, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      models: { type: 'string', short: 'm' },
      jurors: { type: 'string', short: 'n' },
      judge: { type: 'string', short: 'j' },
      file: { type: 'string', short: 'f', multiple: true },
      base: { type: 'string' },
      web: { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })
  const [cmd, ...rest] = positionals
  if (o.version) return console.log(VERSION)
  if (o.help || !cmd) return console.log(HELP)

  const client = createClient()
  const live = !o.json
  const trial = newTrialId()
  const onJuror = live ? (j) => console.log(R.jurorLine(j)) : undefined

  if (cmd === 'models') {
    const all = await client.models()
    const seat = new Set(pickJury(all, Number(o.jurors) || 5))
    if (o.json) return console.log(JSON.stringify(all, null, 2))
    const labs = Map.groupBy(all, vendorOf)
    for (const [lab, ms] of [...labs].sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`\n  ${R.bold(lab)}`)
      for (const m of ms) console.log(`    ${seat.has(m.id) ? R.lime('●') : R.dim('·')} ${m.id}`)
    }
    return console.log(R.dim(`\n  ● default jury · ${all.length} models\n`))
  }

  if (cmd === 'ask') {
    let question = rest.join(' ').trim()
    if (!question || question === '-') question = readStdin().trim()
    if (!question) throw new OtariError(0, 'usage', 'Give a question: wildjury ask "..."')
    const context = (o.file || []).map((f) => `--- ${f}\n${readFileSync(f, 'utf8')}`).join('\n\n')
    const models = await jury(client, o)
    if (live) console.log(R.header('ask', models.length, trial))
    const r = await ask(client, { question, context: clip(context), models, judge: o.judge, web: o.web, onJuror, trial })
    return console.log(o.json ? JSON.stringify(r, null, 2) : R.askVerdict(r))
  }

  if (cmd === 'review') {
    const diff = rest[0] === '-' ? readStdin() : gitDiff(o.base)
    if (!diff.trim()) throw new OtariError(0, 'usage', 'Nothing to review: no changes found.')
    const models = await jury(client, o)
    if (live) console.log(R.header('review', models.length, trial))
    const r = await review(client, { diff: clip(diff), models, judge: o.judge, onJuror, trial })
    console.log(o.json ? JSON.stringify(r, null, 2) : R.reviewVerdict(r))
    process.exitCode = r.verdict === 'approve' ? 0 : 1
    return
  }

  throw new OtariError(0, 'usage', `Unknown command "${cmd}". Run wildjury --help.`)
}

main().catch((e) => {
  const hint = e.status === 401 ? ' Check OTARI_API_KEY.' : e.status === 402 || e.code === 'budget_exceeded' ? ' Top up or raise the budget on otari.ai.' : ''
  const retry = e.retryAfter ? ` Retry after ${e.retryAfter}s.` : ''
  console.error(`\n  ${R.red('error')} ${e.message}${hint}${retry}\n`)
  process.exitCode = 3
})
