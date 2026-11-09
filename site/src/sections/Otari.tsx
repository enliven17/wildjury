import type { ComponentType, CSSProperties, PointerEvent } from 'react'
import { IllosApiGateway } from '../illos/api-gateway'
import { IllosToolCalls } from '../illos/tool-calls'
import { IllosSearch } from '../illos/search'
import { IllosCostMeter } from '../illos/cost-meter'
import { IllosFailover } from '../illos/failover'

type Card = { n: string; t: string; b: string; Art?: ComponentType<{ className?: string; style?: CSSProperties }>; wide?: boolean }
const CARDS: Card[] = [
  { n: '01', t: 'One key, every lab', b: 'A single otk_ key reaches Anthropic, OpenAI, Google, DeepSeek, Mistral and the open-weight models your workspace allows. No per-provider accounts.', Art: IllosApiGateway, wide: true },
  { n: '02', t: 'A trace per juror', b: 'Every juror and the foreperson send their own Otari-Conversation-Id. Open Traces and read the trial ballot by ballot.', Art: IllosToolCalls },
  { n: '03', t: 'Web search on the bench', b: 'Pass --web and jurors check the record with Otari’s built-in search. Sources print under the verdict.', Art: IllosSearch },
  { n: '04', t: 'Budgets that hold', b: 'Set a ceiling on otari.ai. When a trial would cross it, Otari refuses and Wildjury tells you when to retry.', Art: IllosCostMeter, wide: true },
  { n: '05', t: 'Failover for free', b: 'Jurors are named by catalog id, so Otari picks the provider and moves to the next when a call fails.', Art: IllosFailover },
  { n: '06', t: 'Open all the way down', b: 'Wildjury is MIT. Otari is open source. Point it at your own gateway and nothing else changes.', wide: true },
]

// The spotlight follows the pointer inside each card.
const track = (e: PointerEvent<HTMLElement>) => {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export default function Otari() {
  return (
    <section className="otari" id="otari">
      <div className="wrap section-head">
        <h2 className="h2" data-split>
          The gateway is <em>the courtroom.</em>
        </h2>
        <p className="lede" data-rise>
          Wildjury is a few hundred lines of Node with no dependencies. Otari does the heavy lifting: the catalog, the routing,
          the traces, the bill.
        </p>
      </div>
      <div className="wrap">
        <div className="bento">
          {CARDS.map(({ n, t, b, Art, wide }) => (
            <article className={`tile ${wide ? 'wide' : ''}`} key={n} onPointerMove={track} data-tile>
              <div className="tile-art">
                {Art ? (
                  <Art className="illo" />
                ) : (
                  <pre className="tile-code">
                    <span className="dim"># your own Otari, same jury</span>
                    {'\n'}
                    <span className="lime">export</span> OTARI_BASE_URL=https://otari.internal/api/v1
                    {'\n'}
                    <span className="lime">npx</span> wildjury review --base main
                  </pre>
                )}
              </div>
              <div className="tile-copy">
                <span className="card-n">{n}</span>
                <h3>{t}</h3>
                <p>{b}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
