import { useRef } from 'react'
import { gsap, reducedMotion, useGSAP } from '../motion'
import Command from '../components/Command'
import { REPO } from '../links'

const COLS: [string, [string, string][]][] = [
  ['Product', [['How it works', '/#how'], ['A trial', '/#trial'], ['Built on Otari', '/#otari'], ['CI gate', '/#ci']]],
  ['Docs', [['Quickstart', '/docs#quickstart'], ['Commands', '/docs#ask'], ['How a trial runs', '/docs#trial'], ['JSON output', '/docs#json']]],
  ['Elsewhere', [['GitHub', REPO], ['Otari', 'https://otari.ai'], ['Otari docs', 'https://docs.otari.ai'], ['License', `${REPO}/blob/main/LICENSE`]]],
]

const STEPS = [
  ['Get a key', 'Sign in at otari.ai and create an API key.', 'export OTARI_API_KEY=otk_...'],
  ['Ask the jury', 'Any question, any file as context.', 'npx wildjury ask "Is this migration safe?" -f migrate.sql'],
  ['Review a change', 'Your working diff, or a branch against main.', 'npx wildjury review --base main'],
]

export default function Closing() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (reducedMotion()) return
      gsap.to('.cta-cube', { rotate: 8, y: -16, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      gsap.fromTo('.footer-giant img', { yPercent: 60 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } })
      gsap.from('.cta-cube', { scale: 0.6, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.cta', start: 'top 80%', once: true } })
    },
    { scope: root },
  )
  return (
    <section className="closing" id="start" ref={root}>
      <div className="wrap section-head">
        <h2 className="h2" data-split>
          Three commands to <em>your first verdict.</em>
        </h2>
      </div>
      <ol className="wrap steps">
        {STEPS.map(([t, b, c], i) => (
          <li key={t} data-rise>
            <span className="card-n">0{i + 1}</span>
            <h3>{t}</h3>
            <p>{b}</p>
            <Command cmd={c} />
          </li>
        ))}
      </ol>
      <div className="wrap cta">
        <div className="cta-art">
          <img className="cta-cube" src="/img/cta.png" alt="" width={1024} height={1024} loading="lazy" />
        </div>
        <div>
          <h2 className="h1" data-rise>
            Don’t trust one model.
            <br />
            <em>Call a jury.</em>
          </h2>
          <div className="hero-ctas" data-rise>
            <a className="btn btn-lime" href={REPO} target="_blank" rel="noreferrer">Star on GitHub</a>
            <a className="btn btn-ghost" href="https://otari.ai" target="_blank" rel="noreferrer">Get an Otari key</a>
          </div>
        </div>
      </div>
      <footer className="footer">
        <div className="wrap footer-top">
          <div className="footer-brand">
            <img src="/logo/wildjury-lockup.svg" alt="wildjury" height={30} />
            <p>A jury of LLMs for your code and your questions. The verdict, with the dissent left in.</p>
            <Command cmd="npx github:enliven17/wildjury --help" />
          </div>
          {COLS.map(([title, links]) => (
            <nav className="footer-col" key={title} aria-label={title}>
              <b>{title}</b>
              {links.map(([label, href]) => (
                <a key={label} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
                  {label}
                </a>
              ))}
            </nav>
          ))}
        </div>
        <div className="wrap footer-bar">
          <span className="status"><i /> v0.1.0 · MIT</span>
          <span>Runs on <a href="https://otari.ai" target="_blank" rel="noreferrer">Otari</a> by Mozilla AI</span>
        </div>
        <div className="footer-giant" aria-hidden="true">
          <img src="/logo/wildjury-wordmark.svg" alt="" />
        </div>
      </footer>
    </section>
  )
}
