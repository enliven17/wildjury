import { useEffect, useState } from 'react'
import { gsap, reducedMotion, ScrollTrigger, scrollToHash, SplitText, startSmoothScroll, useGSAP } from './motion'
import Hero from './sections/Hero'
import Labs from './sections/Labs'
import Features from './sections/Features'
import Trial from './sections/Trial'
import Otari from './sections/Otari'
import Agreement from './sections/Agreement'
import Gate from './sections/Gate'
import Closing from './sections/Closing'
import { REPO } from './links'


export default function App() {
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    startSmoothScroll()
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]')
      if (!a) return
      e.preventDefault()
      scrollToHash(a.getAttribute('href')!)
    }
    document.addEventListener('click', onClick)
    document.fonts.ready.then(() => ScrollTrigger.refresh())
    return () => document.removeEventListener('click', onClick)
  }, [])

  useGSAP(() => {
    ScrollTrigger.create({ start: 12, end: 'max', onToggle: (st) => document.documentElement.classList.toggle('scrolled', st.isActive) })
    if (reducedMotion()) return
    ScrollTrigger.batch('[data-rise]', {
      start: 'top 88%',
      once: true,
      onEnter: (els) => gsap.from(els, { y: 36, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }),
    })
    // Headlines light up word by word as you scroll through them.
    gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
      const { words } = SplitText.create(el, { type: 'words' })
      gsap.fromTo(words, { opacity: 0.12, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.12, ease: 'none', scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 45%', scrub: 0.6 } })
    })
    // Bento tiles tip up out of the page in a wave.
    ScrollTrigger.batch('[data-tile]', {
      start: 'top 90%',
      once: true,
      onEnter: (els) => gsap.from(els, { y: 70, rotateX: -18, opacity: 0, transformPerspective: 900, transformOrigin: '50% 100%', duration: 1.3, ease: 'expo.out', stagger: 0.09 }),
    })
  })

  return (
    <>
      <nav className="nav">
        <div className="nav-bar">
          <a href="#top" className="brand">
            <img src="/logo/wildjury-lockup-paper.svg" alt="wildjury" height={26} />
          </a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#trial">Trial</a>
            <a href="#otari">Otari</a>
            <a href="#ci">CI</a>
            <a href="/docs">Docs</a>
          </div>
          <div className="nav-end">
            <a className="nav-ghost" href={REPO} target="_blank" rel="noreferrer">GitHub</a>
            <a className="btn btn-lime btn-sm" href="#start">Get started</a>
            <button className="nav-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <span />
              <span />
            </button>
          </div>
        </div>
        {menu && (
          <div className="nav-panel" onClick={() => setMenu(false)}>
            <a href="#how">How it works</a>
            <a href="#trial">Trial</a>
            <a href="#otari">Otari</a>
            <a href="#ci">CI</a>
            <a href="/docs">Docs</a>
            <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
          </div>
        )}
      </nav>
      <main>
        <Hero />
        <Labs />
        <Features />
        <Trial />
        <Otari />
        <Agreement />
        <Gate />
        <Closing />
      </main>
    </>
  )
}
