import { gsap } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'
import { scramble } from '../ui/scramble'

export interface EnterChoice {
  withSound: boolean
}

/**
 * The laser writes the wordmark while the scene compiles behind it; then the visitor
 * chooses to enter with or without sound (the click also unlocks Web Audio).
 */
export async function runLoader(ready: Promise<unknown>): Promise<EnterChoice> {
  const root = document.querySelector<HTMLElement>('[data-loader]')
  const count = root?.querySelector<HTMLElement>('[data-loader-count]')
  const bar = root?.querySelector<HTMLElement>('[data-loader-bar]')
  const title = root?.querySelector<HTMLElement>('[data-loader-title]')
  const laser = root?.querySelector<HTMLElement>('[data-loader-laser]')
  const status = root?.querySelector<HTMLElement>('[data-loader-status]')
  const enter = root?.querySelector<HTMLElement>('[data-loader-enter]')
  if (!root || !count || !bar || !title || !laser || !status || !enter) {
    await ready
    return { withSound: false }
  }

  const progress = { value: 0 }
  const render = () => {
    const p = progress.value
    count.textContent = String(Math.round(p)).padStart(3, '0')
    bar.style.transform = `scaleX(${p / 100})`
    title.style.clipPath = `inset(0 ${100 - p}% 0 0)`
    laser.style.left = `${p}%`
  }
  render()

  await gsap.to(progress, {
    value: 100,
    duration: reducedMotion ? 0.3 : 2.4,
    ease: 'power2.inOut',
    onUpdate: render,
  })
  await ready

  gsap.to(laser, { autoAlpha: 0, duration: 0.4 })
  status.dataset.text = 'Ready'
  scramble(status)
  enter.hidden = false
  gsap.fromTo(enter, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out' })
  enter.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })

  const withSound = await new Promise<boolean>((resolve) => {
    enter.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-enter]')
      if (button) resolve(button.dataset.enter === 'sound')
    })
  })

  void gsap
    .timeline({ onComplete: () => root.remove() })
    .to(enter, { autoAlpha: 0, duration: 0.3 })
    .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: reducedMotion ? 0.2 : 1.2, ease: 'expo.inOut' }, 0.1)

  return { withSound }
}
