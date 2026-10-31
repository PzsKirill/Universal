import { gsap, ScrollTrigger, SplitText } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'

/** Hero entrance after the loader: masked line reveal, then the supporting copy. */
export function playIntro(): void {
  const title = document.querySelector<HTMLElement>('[data-hero-title]')
  const fades = gsap.utils.toArray<HTMLElement>('[data-intro]')

  if (reducedMotion || !title) {
    gsap.set([title, ...fades], { autoAlpha: 1, y: 0 })
    return
  }

  gsap.set(title, { autoAlpha: 1 })
  SplitText.create(title, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'hero-line',
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.lines, { yPercent: 115, duration: 1.5, ease: 'expo.out', stagger: 0.12 }),
  })
  gsap.to(fades, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: 0.35 })
}

/** Section headings, cards and plans rise in once, as they enter the screen. */
export function initReveal(): void {
  if (reducedMotion) return
  document.documentElement.classList.add('reveal-ready')
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (elements) =>
      gsap.to(elements, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  })
}

/** The tunnel photo drifts slower than the page, so the vault feels deep. */
export function initVaultParallax(): void {
  const image = document.querySelector<HTMLElement>('[data-vault-image]')
  if (!image || reducedMotion) return
  gsap.fromTo(
    image,
    { yPercent: -6 },
    {
      yPercent: 6,
      ease: 'none',
      scrollTrigger: { trigger: image.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    },
  )
}

/** Vault cross-section draws itself as you scroll; a capsule descends the shaft to the chamber. */
export function initVaultDrawing(): void {
  const svg = document.querySelector<SVGSVGElement>('[data-vault-svg]')
  if (!svg || reducedMotion) return

  const lines = [...svg.querySelectorAll<SVGGeometryElement>('[data-draw]')]
  lines.forEach((path) => {
    const length = path.getTotalLength()
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
  })

  const fades = svg.querySelectorAll('[data-vault-fade]')
  const capsule = svg.querySelector('[data-vault-capsule]')
  const chamber = svg.querySelector('[data-vault-chamber]')

  gsap
    .timeline({
      scrollTrigger: { trigger: svg, start: 'top 80%', end: 'bottom 45%', scrub: 0.8 },
      defaults: { ease: 'none' },
    })
    .from(fades, { opacity: 0, duration: 0.3, stagger: 0.1 })
    .to(lines, { strokeDashoffset: 0, duration: 1, stagger: 0.4 }, 0)
    .from(chamber, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.3 }, 0.9)
    .to(capsule, { attr: { y: 566 }, duration: 1.2, ease: 'power1.inOut' }, 1)
}
