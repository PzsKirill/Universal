import { ScrollTrigger } from '../lib/gsap'
import { sound } from '../ui/sound'
import { scrollToY } from './smooth-scroll'

/**
 * Full-screen chapters: the stage stays pinned while the page scrolls through four steps.
 * Scroll position picks the active step (media + text) and fills its bar in the progress nav;
 * clicking a chapter scrolls to it. Only the active step's video plays.
 */
export function initHowItWorks(): void {
  const track = document.querySelector<HTMLElement>('[data-how-track]')
  if (!track) return

  const steps = [...track.querySelectorAll<HTMLElement>('[data-step]')]
  const media = [...track.querySelectorAll<HTMLElement>('[data-step-media]')]
  const buttons = [...track.querySelectorAll<HTMLButtonElement>('[data-step-go]')]
  const bars = buttons.map((button) => button.querySelector<HTMLElement>('[data-step-bar]'))
  const count = steps.length

  let active = -1
  let inView = false

  const syncVideos = () => {
    media.forEach((layer, i) => {
      const video = layer.querySelector('video')
      if (!video) return
      if (inView && i === active) void video.play().catch(() => {})
      else video.pause()
    })
  }

  const setActive = (index: number) => {
    if (index === active) return
    active = index
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index))
    media.forEach((layer, i) => layer.classList.toggle('is-active', i === index))
    buttons.forEach((button, i) => {
      button.classList.toggle('is-active', i === index)
      if (i === index) button.setAttribute('aria-current', 'step')
      else button.removeAttribute('aria-current')
    })
    syncVideos()
    if (inView) sound.tick(0.7)
  }

  const trigger = ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const position = self.progress * count
      bars.forEach((bar, i) => {
        if (bar) bar.style.transform = `scaleX(${Math.min(Math.max(position - i, 0), 1)})`
      })
      setActive(Math.min(count - 1, Math.floor(position)))
    },
    onToggle: (self) => {
      inView = self.isActive
      syncVideos()
    },
  })

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => {
      const span = trigger.end - trigger.start
      scrollToY(trigger.start + span * ((i + 0.02) / count))
    })
  })

  setActive(0)
}
