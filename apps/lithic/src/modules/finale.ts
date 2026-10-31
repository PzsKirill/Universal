import type { Experience } from '../experience/experience'
import { ScrollTrigger } from '../lib/gsap'
import { sound } from '../ui/sound'

const SAMPLE = 'Hello, 12026'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/**
 * The finale: the quartz plate from the hero comes back. On arrival a blank plate descends and
 * etches a sample line; the visitor writes their own, the laser etches it, and the plate is
 * sealed down into the vault. Without WebGL the form still works, the status tells the story.
 */
export function initFinale(experience: Experience | null): void {
  const section = document.querySelector<HTMLElement>('[data-finale]')
  const form = section?.querySelector<HTMLFormElement>('[data-finale-form]')
  const input = form?.querySelector<HTMLInputElement>('input')
  const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]')
  const status = section?.querySelector<HTMLElement>('[data-finale-status]')
  const again = section?.querySelector<HTMLButtonElement>('[data-finale-again]')
  if (!section || !form || !input || !submit || !status || !again) return

  const futureYear = new Date().getFullYear() + 10000
  document.querySelectorAll('[data-future-year]').forEach((el) => {
    el.textContent = String(futureYear)
  })

  let busy = false
  let plateNumber = 4213

  const setStatus = (text: string, sealed = false) => {
    status.textContent = text
    status.classList.toggle('is-sealed', sealed)
  }
  const nextPlate = () => String(++plateNumber).padStart(6, '0')
  const openingDate = () => {
    const now = new Date()
    return `${now.getDate()} ${now.toLocaleString('en-GB', { month: 'short' })} ${futureYear}`
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const p = self.progress
      experience?.setFinale(smoothstep(0, 0.3, p) * (1 - smoothstep(0.72, 1, p)))
    },
    onLeave: () => experience?.setFinale(0),
    onLeaveBack: () => experience?.setFinale(0),
  })

  // First arrival: a blank plate comes down, then the laser writes a sample line by itself.
  ScrollTrigger.create({
    trigger: section,
    start: 'top 35%',
    once: true,
    onEnter: async () => {
      if (!experience) return
      busy = true
      await experience.presentBlankPlate()
      if (!input.value) {
        setStatus('Etching a sample…')
        await experience.etchMessage(SAMPLE)
        setStatus('Your turn. Type a line and seal it.')
      }
      busy = false
    },
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (busy) return
    busy = true
    submit.disabled = true
    input.disabled = true
    const message = input.value.trim() || 'Hello from 2026'
    const plate = nextPlate()

    if (experience) {
      setStatus(`Etching plate Nº ${plate}…`)
      await experience.etchMessage(message)
      setStatus('Sealing…')
      sound.seal()
      await experience.seal()
    }
    setStatus(`Sealed · Plate Nº ${plate} · opens ${openingDate()}`, true)
    again.hidden = false
    again.focus({ preventScroll: true })
    busy = false
  })

  again.addEventListener('click', async () => {
    if (busy) return
    busy = true
    again.hidden = true
    input.value = ''
    setStatus('A new plate is ready.')
    await experience?.presentBlankPlate()
    submit.disabled = false
    input.disabled = false
    input.focus({ preventScroll: true })
    busy = false
  })
}
