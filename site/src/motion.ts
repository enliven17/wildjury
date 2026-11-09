import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)
ScrollTrigger.config({ ignoreMobileResize: true })

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export let lenis: Lenis | null = null

/** One Lenis instance on GSAP's ticker, so smooth scroll and ScrollTrigger share a clock. */
export function startSmoothScroll() {
  if (lenis || reducedMotion()) return
  lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.85, touchMultiplier: 1.4 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis?.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}

export function scrollToHash(hash: string) {
  const el = document.querySelector(hash) as HTMLElement | null
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: -64 })
  else el.scrollIntoView()
}

export { gsap, ScrollTrigger, SplitText, useGSAP }
