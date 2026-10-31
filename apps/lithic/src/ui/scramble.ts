import { gsap } from '../lib/gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { reducedMotion } from '../lib/motion'

gsap.registerPlugin(ScrambleTextPlugin)

const CHARS = '0123456789ABCDEF/·—'

/** Decodes a mono label character by character, like a readout settling. */
export function scramble(el: HTMLElement, delay = 0): gsap.core.Tween | null {
  const text = el.dataset.text ?? el.textContent ?? ''
  el.dataset.text = text
  if (reducedMotion) {
    el.textContent = text
    return null
  }
  el.textContent = ''
  return gsap.to(el, {
    duration: 0.5 + text.length * 0.025,
    delay,
    ease: 'none',
    scrambleText: { text, chars: CHARS, revealDelay: 0.25, speed: 0.6 },
  })
}

/** Scrambles every [data-scramble] inside `root`, staggered. */
export function scrambleAll(root: ParentNode = document, stagger = 0.08, delay = 0) {
  root.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el, i) => scramble(el, delay + i * stagger))
}
