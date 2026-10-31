import { reducedMotion } from '../lib/motion'

const MIN_CELL = 14 // px per character cell; grows on large screens
const HEX = '0123456789ABCDEF'
const BONE = 'rgba(236, 232, 223, 0.92)'
const DIM = 'rgba(143, 138, 127, 0.38)'
const LASER = '#ff5a1f'

/**
 * Step 01 "Encode", drawn in code: raw bytes on the right, a scan line sweeping left to right,
 * and behind it the same cells turned into the dot pattern that gets etched.
 * Animates only while visible.
 */
export function initEncodeVisuals(): void {
  document.querySelectorAll<HTMLCanvasElement>('[data-encode-canvas]').forEach(setup)
}

function setup(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const layer = canvas.closest<HTMLElement>('[data-step-media]')

  let width = 0
  let height = 0
  let cell = MIN_CELL
  let cols = 0
  let rows = 0
  let chars: string[] = []
  let bits: boolean[] = []
  let visible = false
  let frame = 0
  let start = performance.now()
  let last = 0

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio, 2)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cell = Math.max(MIN_CELL, Math.round(width / 95))
    cols = Math.ceil(width / cell)
    rows = Math.ceil(height / cell)
    chars = Array.from({ length: cols * rows }, () => HEX[Math.floor(Math.random() * 16)])
    // Leave gutters every 8 columns and 5 rows so the pattern reads as blocks of data.
    bits = chars.map((_, i) => {
      const x = i % cols
      const y = Math.floor(i / cols)
      return x % 8 !== 7 && y % 5 !== 4 && Math.random() > 0.42
    })
    draw(reducedMotion ? 0.62 : 0)
  }

  const draw = (progress: number) => {
    ctx.fillStyle = '#0b0d10'
    ctx.fillRect(0, 0, width, height)
    const scanX = progress * (width + cell * 6) - cell * 3
    ctx.font = `500 ${cell * 0.62}px "Martian Mono Variable", ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < chars.length; i++) {
      const x = (i % cols) * cell + cell / 2
      const y = Math.floor(i / cols) * cell + cell / 2
      const behind = scanX - x
      if (behind > 0) {
        if (!bits[i]) continue
        ctx.fillStyle = behind < cell * 3 ? LASER : BONE
        const r = (behind < cell * 3 ? 0.19 : 0.15) * cell
        ctx.fillRect(x - r, y - r, r * 2, r * 2)
      } else {
        ctx.fillStyle = DIM
        ctx.fillText(chars[i], x, y)
      }
    }

    // The scan line.
    const glow = ctx.createLinearGradient(scanX - 40, 0, scanX, 0)
    glow.addColorStop(0, 'rgba(255, 90, 31, 0)')
    glow.addColorStop(1, 'rgba(255, 90, 31, 0.28)')
    ctx.fillStyle = glow
    ctx.fillRect(scanX - 40, 0, 40, height)
    ctx.fillStyle = LASER
    ctx.fillRect(scanX, 0, 1.5, height)
  }

  const loop = (now: number) => {
    if (!visible) return
    frame = requestAnimationFrame(loop)
    if (now - last < 33) return // ~30 fps is plenty for this, and halves the cost
    if (layer && !layer.classList.contains('is-active')) return // hidden under another chapter
    last = now
    const period = 6000
    const t = ((now - start) % period) / period
    // Sweep for 80% of the cycle, hold the finished pattern, then restart with fresh bytes.
    const progress = Math.min(t / 0.8, 1)
    if (t < 0.01 && now - start > period) {
      chars = chars.map(() => HEX[Math.floor(Math.random() * 16)])
    }
    draw(progress)
  }

  new ResizeObserver(resize).observe(canvas)
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && !reducedMotion
    cancelAnimationFrame(frame)
    if (visible) {
      start = performance.now()
      frame = requestAnimationFrame(loop)
    }
  }).observe(canvas)
}
