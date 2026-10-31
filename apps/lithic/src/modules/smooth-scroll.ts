import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'

let lenis: Lenis | null = null

/** Weighted smooth scroll driven by the GSAP ticker so ScrollTrigger stays in sync. */
export function initSmoothScroll(): Lenis | null {
  if (reducedMotion) return null

  lenis = new Lenis({ lerp: 0.09, anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  return lenis
}

/** Scrolls to a page offset, smoothly unless the visitor prefers reduced motion. */
export function scrollToY(y: number): void {
  if (lenis) lenis.scrollTo(y, { duration: 1.4 })
  else window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' })
}
