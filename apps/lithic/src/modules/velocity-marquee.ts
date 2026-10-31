import { gsap, ScrollTrigger } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'

const BASE_SPEED = 55 // px per second when the page is still

/**
 * A marquee that answers the scroll: it drifts slowly on its own, speeds up while the page
 * scrolls, follows the scroll direction, and slows to a crawl under the pointer.
 */
export function initVelocityMarquees(): void {
  document.querySelectorAll<HTMLElement>('[data-velocity-marquee]').forEach((root) => {
    const track = root.querySelector<HTMLElement>('[data-marquee-track]')
    if (!track) return

    // A copy right after the original lets the strip wrap without a gap.
    const copy = track.cloneNode(true) as HTMLElement
    copy.removeAttribute('data-marquee-track')
    copy.setAttribute('aria-hidden', 'true')
    root.append(copy)
    if (reducedMotion) return

    let x = 0
    let boost = 0
    let direction = -1
    let visible = false
    const pace = { value: 1 } // eased down to a crawl while hovered

    ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        boost = Math.max(boost, Math.min(Math.abs(self.getVelocity()) * 0.35, 1400))
        direction = self.direction === 1 ? -1 : 1
      },
    })

    root.addEventListener('pointerenter', () => gsap.to(pace, { value: 0.15, duration: 0.8, ease: 'power2.out' }))
    root.addEventListener('pointerleave', () => gsap.to(pace, { value: 1, duration: 0.8, ease: 'power2.inOut' }))

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    }).observe(root)

    gsap.ticker.add((_time, deltaMs) => {
      if (!visible) return
      const dt = Math.min(deltaMs, 50) / 1000
      boost *= Math.exp(-dt * 3) // the push from scrolling fades within about a second
      x += direction * (BASE_SPEED + boost) * pace.value * dt
      x = gsap.utils.wrap(-track.offsetWidth, 0, x)
      track.style.transform = `translate3d(${x}px, 0, 0)`
      copy.style.transform = `translate3d(${x}px, 0, 0)`
    })
  })
}
