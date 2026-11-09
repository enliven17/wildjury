import { useRef } from 'react'
import { gsap, reducedMotion, useGSAP } from '../motion'

// A skyline of trials: each bar is one trial's agreement. Amber bars are hung juries.
const BARS = Array.from({ length: 48 }, (_, i) => {
  const v = 0.35 + 0.6 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43))
  return { h: v, hung: v < 0.42 }
})

export default function Agreement() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      if (reducedMotion()) return
      gsap.from(q('.bar'), {
        scaleY: 0,
        ease: 'none',
        stagger: { each: 0.02, from: 'random' },
        scrollTrigger: { trigger: q('.skyline')[0], start: 'top 95%', end: 'bottom 60%', scrub: 0.6 },
      })
      const n = { v: 0 }
      gsap.to(n, {
        v: 80,
        duration: 1.6,
        ease: 'expo.out',
        scrollTrigger: { trigger: q('.big-num')[0], start: 'top 85%', once: true },
        onUpdate: () => ((q('.big-num b')[0] as HTMLElement).textContent = String(Math.round(n.v))),
      })
    },
    { scope: root },
  )

  return (
    <section className="agreement" ref={root}>
      <div className="wrap agreement-head">
        <div>
          <h2 className="h2" data-split>
            Know how sure <em>the room is.</em>
          </h2>
        </div>
        <div className="big-num" data-rise>
          <b>80</b>%<span>4 of 5 jurors agree</span>
        </div>
      </div>
      <div className="skyline" aria-hidden="true">
        {BARS.map((b, i) => (
          <i key={i} className={`bar ${b.hung ? 'hung' : ''}`} style={{ height: `${b.h * 100}%` }} />
        ))}
      </div>
      <div className="wrap legend" data-rise>
        <span><i className="sw" /> majority verdict</span>
        <span><i className="sw hung" /> hung jury, no majority</span>
      </div>
    </section>
  )
}
