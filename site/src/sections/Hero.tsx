import { useEffect, useRef } from 'react'
import { gsap, reducedMotion, ScrollTrigger, SplitText, useGSAP } from '../motion'
import DotGrid from '../components/DotGrid'
import Command from '../components/Command'

// The three beats the cubes play while the hero is pinned.
const BEATS = [
  ['01', 'Empanel', 'Twelve models from different labs take their seats.'],
  ['02', 'Deliberate', 'Each one answers alone. Then the ballots land, and one dissents.'],
  ['03', 'Verdict', 'The majority becomes the verdict. The dissent stays on the record.'],
]
const beatAt = (p: number) => (p < 0.3 ? 0 : p < 0.64 ? 1 : 2)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<{ setProgress(p: number): void; play(): void; pause(): void; dispose(): void } | null>(null)
  const progress = useRef(0)

  useEffect(() => {
    let alive = true
    let io: IntersectionObserver | undefined
    // three.js loads after first paint; the headline never waits for it.
    import('../components/juryScene').then(({ createJuryScene }) => {
      if (!alive || !canvas.current) return
      const s = createJuryScene(canvas.current)
      scene.current = s
      s.setProgress(progress.current)
      gsap.to(canvas.current, { opacity: 1, duration: 1.6, ease: 'power2.out' })
      if (reducedMotion()) return
      io = new IntersectionObserver(([e]) => (e.isIntersecting ? s.play() : s.pause()))
      io.observe(canvas.current)
    })
    return () => {
      alive = false
      io?.disconnect()
      scene.current?.dispose()
      scene.current = null
    }
  }, [])

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      let beat = -1
      const setBeat = (p: number) => {
        const b = beatAt(p)
        if (b === beat) return
        beat = b
        q('[data-beat]').forEach((n) => n.classList.toggle('is-on', Number((n as HTMLElement).dataset.beat) === b))
      }
      // One live number under the scene, following the same scroll the cubes do.
      const label = q('.hb-label')[0] as HTMLElement
      const val = q('.hb-val')[0] as HTMLElement
      const read = (p: number) => {
        const seated = Math.round(clamp01(p / 0.28) * 12)
        const cast = Math.round(clamp01((p - 0.3) / 0.3) * 12)
        const fuse = clamp01((p - 0.64) / 0.3)
        const [l, v] = p < 0.3 ? ['seated', `${seated}/12`] : p < 0.64 ? ['ballots', `${cast}/12`] : ['agreement', `${Math.round(fuse * 92)}%`]
        if (label.textContent !== l) label.textContent = l
        val.textContent = v
        val.classList.toggle('amber', p >= 0.3 && p < 0.64 && cast === 12)
      }
      read(0)
      setBeat(0)

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: '+=240%',
        pin: true,
        scrub: true,
        onUpdate: (st) => {
          progress.current = st.progress
          scene.current?.setProgress(st.progress)
          root.current!.style.setProperty('--p', st.progress.toFixed(4))
          setBeat(st.progress)
          read(st.progress)
        },
      })
      if (reducedMotion()) return

      const split = SplitText.create(q('.hero-title'), { type: 'lines,words', mask: 'lines' })
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from(split.words, { yPercent: 110, duration: 1.3, stagger: 0.06, delay: 0.15 })
        .from(q('.hero-side > *'), { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.45)
        .from(q('.hero-beats, .hero-hint'), { opacity: 0, duration: 1 }, 0.9)
    },
    { scope: root },
  )

  return (
    <header className="hero" id="top" ref={root}>
      <DotGrid />
      <canvas ref={canvas} className="hero-canvas" aria-hidden="true" />
      <div className="wrap hero-top">
        <h1 className="hero-title">
          Put your code
          <br />
          on <em>trial</em>
        </h1>
        <div className="hero-side">
          <p>
            Wildjury seats models from different labs, asks each one alone, and hands you the verdict with the dissent left in.
            One Otari key. One command.
          </p>
          <div className="hero-ctas">
            <a className="btn btn-lime" href="#start">Get started</a>
            <a className="btn btn-ghost" href="#trial">See a trial</a>
          </div>
          <Command cmd="npx wildjury review" />
        </div>
      </div>
      <div className="wrap hero-beats">
        <div className="hb-copy">
          {BEATS.map(([n, t, b], i) => (
            <div className="hb-beat" key={n} data-beat={i}>
              <b>{t}</b>
              <p>{b}</p>
            </div>
          ))}
        </div>
        <div className="hb-stat">
          <span className="hb-label">seated</span>
          <span className="hb-val">0/12</span>
        </div>
        <div className="hb-line">
          <i className="hb-fill" />
          {BEATS.map(([n], i) => (
            <span key={n} data-beat={i} style={{ left: `${[0, 30, 64][i]}%` }}>{n}</span>
          ))}
        </div>
      </div>
      <span className="hero-hint">Scroll to call the jury</span>
    </header>
  )
}
