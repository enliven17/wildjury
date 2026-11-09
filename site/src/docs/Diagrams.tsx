// Animated SVG diagrams for the docs. Motion is CSS only (dash offsets and pulses), so it costs nothing to idle.

const JURORS = ['anthropic/…', 'openai/…', 'google/…', 'deepseek/…', 'mistralai/…']

/** CLI → Otari → one model per lab → foreperson → tally. */
export function TrialFlow() {
  const ys = [40, 92, 144, 196, 248]
  return (
    <svg className="dg" viewBox="0 0 760 290" role="img" aria-label="A trial: the CLI sends five private ballots through Otari, a foreperson groups them, code tallies the verdict.">
      <g className="dg-node">
        <rect x="10" y="118" width="110" height="52" rx="10" />
        <text x="65" y="141">wildjury</text>
        <text x="65" y="158" className="dg-sub">ask · review</text>
      </g>
      <g className="dg-node dg-otari">
        <rect x="170" y="20" width="120" height="250" rx="12" />
        <text x="230" y="140">Otari</text>
        <text x="230" y="158" className="dg-sub">one key</text>
      </g>
      <path className="dg-wire" d="M120 144 H170" />
      {ys.map((y, i) => (
        <g key={y}>
          <path className="dg-wire dg-flow" style={{ animationDelay: `${i * 0.18}s` }} d={`M290 ${y + 4} H350`} />
          <g className={`dg-node dg-juror ${i === 4 ? 'dg-dissent' : ''}`} style={{ animationDelay: `${0.6 + i * 0.25}s` }}>
            <rect x="350" y={y - 16} width="130" height="40" rx="8" />
            <text x="415" y={y + 8}>{JURORS[i]}</text>
          </g>
          <path className="dg-wire dg-flow" style={{ animationDelay: `${1.2 + i * 0.18}s` }} d={`M480 ${y + 4} C 520 ${y + 4}, 520 144, 560 144`} />
        </g>
      ))}
      <g className="dg-node">
        <rect x="560" y="118" width="90" height="52" rx="10" />
        <text x="605" y="141">foreperson</text>
        <text x="605" y="158" className="dg-sub">groups</text>
      </g>
      <path className="dg-wire dg-flow" style={{ animationDelay: '2.2s' }} d="M650 144 H680" />
      <g className="dg-node dg-verdict">
        <rect x="680" y="112" width="72" height="64" rx="10" />
        <text x="716" y="140">tally</text>
        <text x="716" y="158" className="dg-sub">4/5</text>
      </g>
    </svg>
  )
}

/** Five ballots of findings become one ranked list with vote counts. */
export function ReviewMerge() {
  const raw = [
    [0, 'lock released early'], [0, 'retry has no backoff'], [1, 'lock freed pre-commit'], [2, 'unlock before COMMIT'],
    [3, 'no backoff on 429'], [4, 'index on jobs.status'],
  ] as const
  return (
    <svg className="dg" viewBox="0 0 760 250" role="img" aria-label="Review: duplicate findings from different jurors merge into one finding with a vote count.">
      {raw.map(([j, t], i) => (
        <g key={i} className="dg-node dg-chip" style={{ animationDelay: `${i * 0.15}s` }}>
          <rect x="10" y={14 + i * 38} width="250" height="30" rx="7" />
          <text x="22" y={34 + i * 38} className="dg-left">
            <tspan className="dg-tag">J{j + 1}</tspan> {t}
          </text>
        </g>
      ))}
      {[0, 2, 3].map((i) => <path key={i} className="dg-wire dg-flow" d={`M260 ${29 + i * 38} C 360 ${29 + i * 38}, 360 60, 460 60`} />)}
      {[1, 4].map((i) => <path key={i} className="dg-wire dg-flow" d={`M260 ${29 + i * 38} C 360 ${29 + i * 38}, 360 128, 460 128`} />)}
      <path className="dg-wire dg-flow" d="M260 219 C 360 219, 360 196, 460 196" />
      {[
        [60, 'HIGH', 'Lock released before commit', '3/5', 1],
        [128, 'MED', 'Retry never backs off on 429', '2/5', 0.66],
        [196, 'LOW', 'Missing index on jobs.status', '1/5', 0.33],
      ].map(([y, sev, t, v, w], k) => (
        <g key={k} className="dg-node dg-out" style={{ animationDelay: `${1 + k * 0.2}s` }}>
          <rect x="460" y={(y as number) - 24} width="290" height="48" rx="9" />
          <text x="474" y={(y as number) - 3} className={`dg-left dg-sev-${String(sev).toLowerCase()}`}>{sev}</text>
          <text x="514" y={(y as number) - 3} className="dg-left">{t}</text>
          <rect x="474" y={(y as number) + 7} width="200" height="5" rx="2.5" className="dg-track" />
          <rect x="474" y={(y as number) + 7} width={200 * (w as number)} height="5" rx="2.5" className="dg-bar" />
          <text x="738" y={(y as number) + 12} className="dg-right">{v}</text>
        </g>
      ))}
    </svg>
  )
}

/** Majority or hung: the tally rule, drawn. */
export function Tally() {
  const cells = (n: number, agree: number, y: number, label: string, hung: boolean) => (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} className={`dg-seat ${i < agree ? 'on' : hung ? 'alt' : 'off'}`} x={20 + i * 34} y={y} width="26" height="26" rx="6" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
      <text x={20 + n * 34 + 16} y={y + 18} className={`dg-left ${hung ? 'dg-sev-med' : 'dg-sev-ok'}`}>{label}</text>
    </g>
  )
  return (
    <svg className="dg" viewBox="0 0 760 130" role="img" aria-label="Three of five agreeing is a verdict. Two against two is a hung jury.">
      {cells(5, 3, 20, '3 of 5 · verdict', false)}
      {cells(4, 2, 76, '2 vs 2 · hung jury', true)}
    </svg>
  )
}
