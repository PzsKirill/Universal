import { ScrollTrigger } from '../lib/gsap'

/**
 * The WebGL canvas is fixed behind the whole page but belongs to two sections only (hero and
 * finale). Clip it to whichever of them is on screen, so it can't show through anywhere else,
 * e.g. in the side gaps of a light section that is lifting away.
 */
export function initSceneClip(canvas: HTMLCanvasElement, sections: HTMLElement[]): void {
  const update = () => {
    const height = window.innerHeight
    let top = height
    let bottom = 0
    for (const section of sections) {
      const box = section.getBoundingClientRect()
      if (box.bottom <= 0 || box.top >= height) continue
      top = Math.min(top, Math.max(box.top, 0))
      bottom = Math.max(bottom, Math.min(box.bottom, height))
    }
    canvas.style.clipPath = bottom > top ? `inset(${top}px 0 ${height - bottom}px 0)` : 'inset(50% 0 50% 0)'
  }

  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update, onRefresh: update })
  update()
}
