import { sound } from './sound'

/** Header toggle, plus a soft tick when hovering anything interactive. */
export function initSoundUi(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-sound-toggle]')
  const label = button?.querySelector<HTMLElement>('[data-sound-label]')
  if (button && label) {
    button.addEventListener('click', () => sound.toggle())
    sound.onChange((enabled) => {
      button.setAttribute('aria-pressed', String(enabled))
      button.classList.toggle('is-on', enabled)
      label.textContent = enabled ? 'Sound on' : 'Sound off'
    })
  }

  document.addEventListener('pointerover', (event) => {
    const target = event.target as Element
    const interactive = target.closest('a, button')
    const from = (event.relatedTarget as Element | null)?.closest('a, button')
    if (interactive && interactive !== from) sound.tick(0.55)
  })
}
