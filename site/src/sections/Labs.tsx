import { useRef } from 'react'
import { gsap, reducedMotion, ScrollTrigger, useGSAP } from '../motion'

const LABS = ['Anthropic', 'OpenAI', 'Google', 'DeepSeek', 'Mistral', 'Qwen', 'xAI', 'Moonshot', 'Z.ai', 'Meta']

/** Lab names drift by on their own and speed up (or reverse) with your scroll. */
export default function Labs() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (reducedMotion()) return
      const track = root.current!.querySelector('.marquee-track') as HTMLElement
      const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 })
      let settle: gsap.core.Tween | undefined
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (st) => {
          const v = gsap.utils.clamp(-6, 6, st.getVelocity() / 300)
          settle?.kill()
          loop.timeScale(v === 0 ? 1 : v)
          settle = gsap.to(loop, { timeScale: st.direction, duration: 1.2, ease: 'power2.out' })
        },
      })
    },
    { scope: root },
  )
  const row = [...LABS, ...LABS]
  return (
    <section className="labs" ref={root}>
      <p className="labs-label">Seats jurors from every lab Otari serves</p>
      <div className="marquee">
        <div className="marquee-track">
          {row.map((l, i) => (
            <span key={i}>
              {l}
              <i aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
