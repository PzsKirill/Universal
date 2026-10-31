import { ScrollTrigger } from '../lib/gsap'

/** Solid background once past the hero; hides while scrolling down, returns on scroll up. */
export function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]')
  if (!header) return

  ScrollTrigger.create({
    start: () => window.innerHeight * 0.6,
    end: 'max',
    onToggle: (self) => header.classList.toggle('is-solid', self.isActive),
    onUpdate: (self) => {
      const pastHero = self.scroll() > window.innerHeight
      header.classList.toggle('is-hidden', pastHero && self.direction === 1)
    },
  })
}
