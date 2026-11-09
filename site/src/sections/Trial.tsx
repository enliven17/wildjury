import { useRef } from 'react'
import { gsap, reducedMotion, useGSAP } from '../motion'

type Juror = [model: string, vote: 'approve' | 'changes', conf: string, secs: string]
const JURORS: Juror[] = [
  ['openai/gpt-5.1', 'changes', '0.84', '3.1s'],
  ['mistralai/mistral-large-3', 'approve', '0.62', '3.4s'],
  ['anthropic/claude-sonnet-4.6', 'changes', '0.91', '4.0s'],
  ['google/gemini-3-pro', 'changes', '0.77', '4.6s'],
  ['deepseek/deepseek-v4-pro', 'changes', '0.80', '6.2s'],
]

export default function Trial() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const cmd = q('.t-cmd')[0] as HTMLElement
      const full = cmd.dataset.text!
      if (reducedMotion()) {
        cmd.textContent = full
        return
      }
      gsap.set(q('.t-line'), { opacity: 0, y: 6 })
      const typed = { n: 0 }
      const tl = gsap.timeline({ scrollTrigger: { trigger: q('.term')[0], start: 'top 70%', once: true } })
      tl.to(typed, { n: full.length, duration: 1.1, ease: 'none', onUpdate: () => (cmd.textContent = full.slice(0, Math.round(typed.n))) })
        .to(q('.t-head'), { opacity: 1, y: 0, duration: 0.4 }, '+=0.25')
        .to(q('.t-juror'), { opacity: 1, y: 0, duration: 0.35, stagger: { each: 0.32, ease: 'power1.in' } }, '+=0.3')
        .to(q('.t-verdict'), { opacity: 1, y: 0, duration: 0.5, stagger: 0.18 }, '+=0.45')
        .from(q('.t-bar i'), { scaleX: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, '<')
    },
    { scope: root },
  )

  return (
    <section className="trial" id="trial" ref={root}>
      <div className="wrap section-head">
        <h2 className="h2" data-split>
          Five opinions in the time <em>of one.</em>
        </h2>
        <p className="lede" data-rise>
          Jurors run in parallel through Otari. You see each ballot land, then the verdict, then what the minority said.
        </p>
      </div>
      <div className="wrap">
        <div className="term" data-rise>
          <div className="term-bar">
            <span />
            <span />
            <span />
            <b>~/api · zsh</b>
          </div>
          <pre className="term-body">
            <span className="t-prompt">$ </span>
            <span className="t-cmd" data-text="wildjury review --base main" />
            <span className="t-caret" />
            {'\n'}
            <span className="t-line t-head">
              {'\n  '}
              <b className="lime">WILDJURY</b> <i>review · 5 jurors · trial wj-mw9pbv5q-770d</i>
              {'\n'}
            </span>
            {JURORS.map(([m, v, c, s]) => (
              <span className="t-line t-juror" key={m}>
                {'\n  '}
                <b className="green">●</b> {m.padEnd(30)}{' '}
                {v === 'approve' ? <b className="green">approve        </b> : <b className="red">request changes</b>} <i>{c}  {s}</i>
              </span>
            ))}
            <span className="t-line t-verdict">
              {'\n\n  '}
              <b className="red">CHANGES REQUESTED</b> <i>1 approve · 4 request changes · of 5</i>
            </span>
            <span className="t-line t-verdict">
              {'\n\n  '}
              <b className="red">HIGH</b> <b>Lock released before the transaction commits</b>{'  '}
              <span className="t-bar"><i style={{ width: '60%' }} /></span> <i>3/5 jurors</i>
              {'\n       '}
              <span className="lime">src/queue.ts:42</span>
              {'\n       '}
              <i>pg_advisory_unlock runs before COMMIT, so two workers can claim the same job.</i>
            </span>
            <span className="t-line t-verdict">
              {'\n\n  '}
              <b className="amber">MED </b> <b>Retry loop never backs off on 429</b>{'  '}
              <span className="t-bar"><i style={{ width: '40%' }} /></span> <i>2/5 jurors</i>
              {'\n       '}
              <span className="lime">src/client.ts:88</span>
            </span>
            <span className="t-line t-verdict">
              {'\n\n  '}
              <b className="dim">LOW </b> <b>Missing index on jobs.status</b>{'  '}
              <span className="t-bar"><i style={{ width: '20%' }} /></span> <i>1/5 jurors</i>
              {'\n\n  '}
              <i>foreperson anthropic/claude-sonnet-4.6 · 21,480 juror tokens · see trial on otari.ai → Traces</i>
            </span>
          </pre>
        </div>
        <p className="term-note" data-rise>Example output. Model ids come from your own Otari catalog.</p>
      </div>
    </section>
  )
}
