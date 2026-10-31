import { gsap } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'

const numberFormat = new Intl.NumberFormat('en-US')

/**
 * Deep time: the section pins and vertical scrolling slides a row of moments sideways,
 * from 1969 back to the first farms. A counter tracks how many years ago the moment
 * in the middle of the screen was; the last card jumps forward to the year 12026.
 */
export function initDeepTime(): void {
  const section = document.querySelector<HTMLElement>('[data-deep]')
  const pin = section?.querySelector<HTMLElement>('[data-deep-pin]')
  const track = section?.querySelector<HTMLElement>('[data-deep-track]')
  const counter = section?.querySelector<HTMLElement>('[data-deep-years]')
  const bar = section?.querySelector<HTMLElement>('[data-deep-progress]')
  if (!section || !pin || !track || !counter || !bar) return

  const cards = [...track.querySelectorAll<HTMLElement>('[data-years]')]
  const years = cards.map((card) => Number(card.dataset.years))

  if (reducedMotion) {
    section.classList.add('deep--static')
    counter.textContent = numberFormat.format(years.at(-1) ?? 0)
    return
  }

  const distance = () => Math.max(track.scrollWidth - window.innerWidth, 0)

  // Scroll progress at which each card's centre crosses the centre of the screen.
  let stops: number[] = []
  const measure = () => {
    const travel = distance() || 1
    stops = cards.map((card) => (card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2) / travel)
  }

  const update = (progress: number) => {
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

  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onRefresh: (self) => {
        measure()
        update(self.progress)
      },
      onUpdate: (self) => update(self.progress),
    },
  })
}
