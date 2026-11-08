import { gsap, SplitText } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'
import { sound } from '../ui/sound'

/**
 * FAQ accordion on native <details>, so it stays keyboard- and screen-reader-friendly.
 * Opening eases the answer's height in and lifts its lines out of a mask one by one;
 * closing folds it shut first and only then drops the open attribute. One answer at a time.
 */
export function initFaq(): void {
  const list = document.querySelector<HTMLElement>('[data-faq]')
  if (!list) return
  const items = [...list.querySelectorAll<HTMLDetailsElement>('[data-faq-item]')]

  const parts = (item: HTMLDetailsElement) => {
    const answer = item.querySelector<HTMLElement>('[data-faq-answer]')!
    return { answer, text: answer.querySelector<HTMLElement>('p')! }
  }

  const close = (item: HTMLDetailsElement) => {
    if (!item.open) return
    const { answer } = parts(item)
    item.classList.remove('is-open')
    if (reducedMotion) {
      item.open = false
      return
    }
    gsap.killTweensOf(answer)
    gsap.to(answer, {
      height: 0,
      duration: 0.55,
      ease: 'power3.inOut',
      onComplete: () => {
        item.open = false
        gsap.set(answer, { clearProps: 'height' })
      },
    })
  }

  const open = (item: HTMLDetailsElement) => {
    const { answer, text } = parts(item)
    item.open = true
    item.classList.add('is-open')
    if (reducedMotion) return
    gsap.killTweensOf(answer)
    gsap.fromTo(answer, { height: 0 }, { height: 'auto', duration: 0.75, ease: 'expo.out' })
    // Lines rise out of their masks, like the hero title.
    SplitText.create(text, {
      type: 'lines',
      mask: 'lines',
      onSplit: (self) =>
        gsap.from(self.lines, { yPercent: 105, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.08 }),
    })
  }

  items.forEach((item) => {
    const summary = item.querySelector('summary')!
    summary.addEventListener('click', (event) => {
      event.preventDefault()
      if (item.classList.contains('is-open')) {
        close(item)
        sound.tick(0.6)
        return
      }
      items.filter((other) => other !== item).forEach(close)
      open(item)
      sound.tick(0.9)
    })
  })
}
