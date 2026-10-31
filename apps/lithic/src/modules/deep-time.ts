import { gsap } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'

const numberFormat = new Intl.NumberFormat('en-US')
const FLOOD_SHARE = 0.35 // the flood takes this much extra scroll, relative to the sideways travel

/**
 * Deep time: the section pins and vertical scrolling slides a row of moments sideways,
 * from 1969 back to the first farms; a counter tracks how many years ago each one was.
 * The last card jumps forward to 12026, then its night floods out to fill the screen,
 * handing over to the dark section below without a seam.
 */
export function initDeepTime(): void {
  const section = document.querySelector<HTMLElement>('[data-deep]')
  const pin = section?.querySelector<HTMLElement>('[data-deep-pin]')
  const track = section?.querySelector<HTMLElement>('[data-deep-track]')
  const counter = section?.querySelector<HTMLElement>('[data-deep-years]')
  const bar = section?.querySelector<HTMLElement>('[data-deep-progress]')
  const final = section?.querySelector<HTMLElement>('[data-deep-final]')
  if (!section || !pin || !track || !counter || !bar || !final) return

  const cards = [...track.querySelectorAll<HTMLElement>('[data-years]')]
  const years = cards.map((card) => Number(card.dataset.years))

  if (reducedMotion) {
    section.classList.add('deep--static')
    counter.textContent = numberFormat.format(years.at(-1) ?? 0)
    return
  }

  // Measured from the last card, not scrollWidth: the card's oversized flood layer inflates scrollWidth.
  const distance = () => {
    const end = final.offsetLeft + final.offsetWidth + parseFloat(getComputedStyle(track).paddingRight)
    return Math.max(end - window.innerWidth, 0)
  }

  // Each card owns an equal slice of the travel: 57 years at the start, 10,000 at the end.
  const stops = cards.map((_, i) => i / Math.max(cards.length - 1, 1))

  const updateTravel = (progress: number) => {
    bar.style.transform = `scaleX(${progress})`
    let value = 0
    let current = 0
    for (let i = 0; i < stops.length; i++) {
      if (progress >= stops[i]) {
        current = i
        value = years[i]
      } else {
        const prev = i === 0 ? 0 : stops[i - 1]
        const from = i === 0 ? 0 : years[i - 1]
        const t = Math.min(Math.max((progress - prev) / (stops[i] - prev || 1), 0), 1)
        value = from + (years[i] - from) * t
        if (t > 0.5) current = i
        break
      }
    }
    counter.textContent = numberFormat.format(Math.round(value))
    cards.forEach((card, i) => card.classList.toggle('is-current', i === current))
  }

  /** Grows the card's night layer from the card's own box (0) to the whole viewport (1). */
  const updateFlood = (progress: number) => {
    const w = window.innerWidth * 2
    const h = window.innerHeight * 2
    const box = final.getBoundingClientRect()
    const lerp = (from: number, to: number) => from + (to - from) * progress
    final.style.setProperty('--flood-t', `${lerp(h, h - box.top)}px`)
    final.style.setProperty('--flood-l', `${lerp(w, w - box.left)}px`)
    final.style.setProperty('--flood-r', `${lerp(w, w - (window.innerWidth - box.right))}px`)
    final.style.setProperty('--flood-b', `${lerp(h, h - (window.innerHeight - box.bottom))}px`)
  }

  const flood = { progress: 0 }
  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${distance() * (1 + FLOOD_SHARE)}`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
    onUpdate: () => {
      const travel = distance() ? -Number(gsap.getProperty(track, 'x')) / distance() : 0
      updateTravel(Math.min(Math.max(travel, 0), 1))
      updateFlood(flood.progress)
    },
  })
  timeline
    .to(track, { x: () => -distance(), duration: 1 })
    .to(flood, { progress: 1, duration: FLOOD_SHARE, ease: 'power2.in' })
    .to({}, { duration: 0.08 }) // hold on full night so smoothing can't unpin over a sliver of paper

  updateTravel(0)
}
