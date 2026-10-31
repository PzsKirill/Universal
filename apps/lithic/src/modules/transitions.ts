import { ScrollTrigger } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'

const INSET = 4 // % of the width each side, at the start of a sheet's arrival
const RADIUS = 36 // px corner radius, at the start

/**
 * Strata transitions between dark and light sections. A light section (.sheet) slides in like a
 * sheet of paper laid over the night: inset from the sides with rounded top corners that open
 * out as its top reaches the top of the screen. A sheet followed by a dark section leaves the
 * same way, its bottom corners rounding off as it scrolls away.
 */
export function initTransitions(): void {
  if (reducedMotion) return

  document.querySelectorAll<HTMLElement>('.sheet').forEach((sheet) => {
    const next = sheet.nextElementSibling
    const leavesToDark = !next?.classList.contains('sheet')
    const previous = sheet.previousElementSibling
    const arrivesFromDark = !previous?.classList.contains('sheet')
    let enter = arrivesFromDark ? 0 : 1 // 0 = just arriving, 1 = settled
    let leave = 0 // 0 = in place, 1 = gone

    const render = () => {
      const top = 1 - enter
      const bottom = leavesToDark ? leave : 0
      if (top <= 0 && bottom <= 0) {
        sheet.style.clipPath = ''
        return
      }
      const side = Math.max(top, bottom) * INSET
      sheet.style.clipPath =
        `inset(0% ${side}% 0% ${side}% round ` +
        `${top * RADIUS}px ${top * RADIUS}px ${bottom * RADIUS}px ${bottom * RADIUS}px)`
    }

    if (arrivesFromDark) {
      ScrollTrigger.create({
        trigger: sheet,
        start: 'top bottom',
        end: 'top top',
        onUpdate: (self) => {
          enter = self.progress
          render()
        },
      })
    }
    if (leavesToDark && !sheet.matches('[data-deep]')) {
      ScrollTrigger.create({
        trigger: sheet,
        start: 'bottom bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          leave = self.progress
          render()
        },
      })
    }
    render()
  })
}
