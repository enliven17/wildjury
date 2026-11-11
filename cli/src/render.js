const tty = process.stdout.isTTY && !process.env.NO_COLOR
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s))
export const dim = c(2)
export const bold = c(1)
export const green = c('38;5;156')
export const lime = c('38;5;191')
export const red = c('38;5;210')
export const amber = c('38;5;222')

const pad = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n))
const secs = (ms) => (ms == null ? '' : `${(ms / 1000).toFixed(1)}s`)
const pct = (x) => `${Math.round(x * 100)}%`
const wrap = (s, width = 78, indent = '  ') => {
  const out = []
  let line = ''
  for (const w of String(s).split(/\s+/)) {
    if ((line + ' ' + w).trim().length > width) {
      out.push(line)
      line = w
    } else line = (line + ' ' + w).trim()
  }
  if (line) out.push(line)
  return out.map((l) => indent + l).join('\n')
}

export const header = (kind, n, trial) =>
  `\n  ${bold(lime('WILDJURY'))}  ${dim(`${kind} · ${n} jurors · trial ${trial ?? '…'}`)}\n`

export function jurorLine(j) {
  if (j.recused) return `  ${dim('○')} ${pad(j.model, 34)} ${amber('recused')} ${dim(j.recused)}`
  const b = j.ballot
  const say = b.answer ?? (b.verdict === 'approve' ? green('approve') : red('request changes'))
  const conf = b.confidence == null ? '    ' : dim(b.confidence.toFixed(2))
  return `  ${green('●')} ${pad(j.model, 34)} ${pad(String(say), 44)} ${conf} ${dim(secs(j.ms))}`
}

export function askVerdict(r) {
  const out = ['']
  if (r.error) return `\n  ${red(r.error)}\n`
  const [top, ...rest] = r.positions
  if (r.hung) out.push(`  ${bold(amber('HUNG JURY'))}  ${dim('no position won a majority')}`)
  else out.push(`  ${bold(lime('VERDICT'))}  ${bold(top.label)}  ${dim(`${top.jurors.length}/${r.jurors.filter((j) => j.ballot).length} agree · ${pct(r.agreement)}`)}`)
  if (top?.summary) out.push(dim(wrap(top.summary, 78, '           ')))
  for (const p of r.hung ? r.positions : rest) out.push(`\n  ${amber(r.hung ? 'POSITION' : 'DISSENT ')} ${p.label}  ${dim(p.jurors.join(' '))}`, dim(wrap(p.summary || '', 78, '           ')))
  if (r.jurors.some((j) => j.webOff)) out.push(`
  ${amber('NOTE')}     ${dim('Web search is off for this Otari workspace; jurors answered without it. Turn it on under Tools on otari.ai.')}`)
  const src = [...new Set(r.jurors.flatMap((j) => j.sources || []))]
  if (src.length) out.push(`\n  ${dim('SOURCES')}`, ...src.slice(0, 8).map((u) => dim(`  · ${u}`)))
  return out.join('\n') + footer(r)
}

const SEV = { high: red('HIGH'), medium: amber('MED '), low: dim('LOW ') }
export function reviewVerdict(r) {
  if (r.error) return `\n  ${red(r.error)}\n`
  const n = r.approve + r.changes
  const head =
    r.verdict === 'approve' ? bold(green('APPROVED')) : r.verdict === 'hung' ? bold(amber('HUNG JURY')) : bold(red('CHANGES REQUESTED'))
  const out = ['', `  ${head}  ${dim(`${r.approve} approve · ${r.changes} request changes · of ${n}`)}`]
  for (const f of r.findings) {
    const where = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : ''
    out.push(`\n  ${SEV[f.severity] || SEV.low} ${bold(f.title)}  ${dim(`${f.jurors.length}/${n} jurors`)}`)
    if (where) out.push(`       ${lime(where)}`)
    out.push(dim(wrap(f.detail || '', 74, '       ')))
  }
  if (!r.findings.length) out.push(dim('\n  No findings.'))
  return out.join('\n') + footer(r)
}

function footer(r) {
  const tokens = r.jurors.reduce((s, j) => s + (j.usage?.total_tokens || 0), 0)
  return '\n\n' + dim(`  foreperson ${r.foreperson} · ${tokens.toLocaleString('en-US')} juror tokens · see trial ${r.trial} on otari.ai → Traces`) + '\n'
}
