import { gsap } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'
import { sound } from './sound'

// One bar per layer of the soundscape: drone, its overtones, wind, laser clicks.
const BANDS = [
  [40, 120],
  [120, 400],
  [400, 1500],
  [1500, 6000],
] as const
const REST = 0.27 // bar height when silent, as a share of the full 11px

/** Header toggle with a meter that follows the real audio, plus a soft tick on hover. */
export function initSoundUi(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-sound-toggle]')
  const label = button?.querySelector<HTMLElement>('[data-sound-label]')
  const bars = [...(button?.querySelectorAll<HTMLElement>('.sound-toggle__bars i') ?? [])]
  if (button && label) {
    button.addEventListener('click', () => sound.toggle())
    sound.onChange((enabled) => {
      button.setAttribute('aria-pressed', String(enabled))
      button.classList.toggle('is-on', enabled)
      label.textContent = enabled ? 'Sound on' : 'Sound off'
    })
  }

  // Meter: rises quickly, falls slowly, like a VU needle, so it reads the sound instead of bouncing.
  const raw = BANDS.map(() => 0)
  const shown = BANDS.map(() => 0)
  gsap.ticker.add((_time, deltaMs) => {
    if (!bars.length || reducedMotion) return
    sound.levels(BANDS, raw)
    const dt = Math.min(deltaMs, 50) / 1000
    bars.forEach((bar, i) => {
      const target = Math.min(raw[i] * 1.15, 1)
      const rate = target > shown[i] ? 14 : 2.5
      shown[i] += (target - shown[i]) * (1 - Math.exp(-dt * rate))
      bar.style.transform = `scaleY(${REST + (1 - REST) * shown[i]})`
    })
  })

  document.addEventListener('pointerover', (event) => {
    const target = event.target as Element
    const interactive = target.closest('a, button')
    const from = (event.relatedTarget as Element | null)?.closest('a, button')
    if (interactive && interactive !== from) sound.tick(0.55)
  })
}
