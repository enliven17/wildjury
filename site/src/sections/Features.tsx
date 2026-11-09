import { useRef } from 'react'
import { gsap, reducedMotion, useGSAP } from '../motion'

const ROWS = [
  {
    img: '/img/labs.png',
    title: (
      <>
        Five labs. <em>One key.</em>
      </>
    ),
    body: 'Wildjury reads your Otari catalog and seats one everyday model from each lab. Different training, different blind spots. Pick your own with --models whenever you like.',
    points: ['One model per lab, chosen from the live catalog', 'Catalog ids, so Otari picks the provider and fails over', 'Any provider:model selector works too'],
  },
  {
    img: '/img/deliberate.png',
    title: (
      <>
        Every juror <em>votes alone.</em>
      </>
    ),
    body: 'Each model answers in private, with no view of the others. A foreperson groups ballots that agree in substance. The largest group wins only with a strict majority. Otherwise it is a hung jury, and Wildjury says so.',
    points: ['Independent ballots, run in parallel', 'Majority or hung, never a quiet average', 'Dissent printed under the verdict'],
  },
  {
    img: '/img/review.png',
    title: (
      <>
        Review that <em>shows its work.</em>
      </>
    ),
    body: 'Point it at your diff. Every juror files findings; the foreperson merges duplicates and counts who raised each one. A bug four labs agree on comes first. A hunch only one model had is still there, marked as such.',
    points: ['Findings ranked by how many jurors raised them', 'Real defects only: bugs, security, data loss', 'Exit code 1 unless the jury approves'],
  },
]

export default function Features() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (reducedMotion()) return
      gsap.utils.toArray<HTMLElement>('.feature-art img', root.current).forEach((img, i) => {
        gsap.fromTo(
          img,
          { yPercent: 10, rotate: i % 2 ? 4 : -4 },
          { yPercent: -10, rotate: i % 2 ? -4 : 4, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } },
        )
      })
    },
    { scope: root },
  )

  return (
    <section className="features" id="how" ref={root}>
      {ROWS.map((r, i) => (
        <article className={`feature wrap ${i % 2 ? 'flip' : ''}`} key={r.img}>
          <div className="feature-copy">
            <h2 className="h2" data-split>{r.title}</h2>
            <p className="lede" data-rise>{r.body}</p>
            <ul className="ticks">
              {r.points.map((p) => (
                <li key={p} data-rise>{p}</li>
              ))}
            </ul>
          </div>
          <div className="feature-art">
            <img src={r.img} alt="" loading="lazy" width={1024} height={1024} />
          </div>
        </article>
      ))}
    </section>
  )
}
