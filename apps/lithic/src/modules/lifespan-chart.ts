import { gsap } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'

const MAX_YEARS = 10_000

/** Position on a log axis running from 1 to 10,000 years. */
const logScale = (years: number) => Math.log10(Math.max(years, 1)) / Math.log10(MAX_YEARS)

/**
 * The lifespan chart: bars grow from the baseline on first view (log scale),
 * and each row shows a short note on hover or keyboard focus.
 */
export function initLifespanChart(): void {
  const figure = document.querySelector<HTMLElement>('[data-lifespan]')
  const tooltip = figure?.querySelector<HTMLElement>('[data-lifespan-tooltip]')
  if (!figure || !tooltip) return

  const rows = [...figure.querySelectorAll<HTMLTableRowElement>('tr[data-years]')]
  const bars = rows
    .filter((row) => row.dataset.years !== 'open')
    .map((row) => ({
      el: row.querySelector<HTMLElement>('.lifespan__bar')!,
      target: logScale(Number(row.dataset.years)),
    }))

  if (reducedMotion) {
    bars.forEach(({ el, target }) => el.style.setProperty('--w', String(target)))
  } else {
    bars.forEach(({ el, target }) => {
      gsap.fromTo(
        el,
        { '--w': 0 },
        {
          '--w': target,
          duration: 1.6,
          ease: 'expo.out',
          scrollTrigger: { trigger: figure, start: 'top 75%', once: true },
        },
      )
    })
  }

  const show = (row: HTMLTableRowElement) => {
    tooltip.textContent = row.dataset.note ?? ''
    tooltip.hidden = false
    const figureBox = figure.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()
    tooltip.style.left = `${Math.min(rowBox.left - figureBox.left + 140, figureBox.width - 360)}px`
    tooltip.style.top = `${rowBox.bottom - figureBox.top + 4}px`
  }
  const hide = () => {
    tooltip.hidden = true
  }

  rows.forEach((row) => {
    row.tabIndex = 0
    row.addEventListener('pointerenter', () => show(row))
    row.addEventListener('pointerleave', hide)
    row.addEventListener('focus', () => show(row))
    row.addEventListener('blur', hide)
  })
}
