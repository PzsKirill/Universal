import { gsap, ScrollTrigger } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'

interface Dot {
  x: number
  y: number
}

const DEFAULT_TEXT = 'Hello, 12026'
const BONE = '#ece8df'
const LASER = '#ff5a1f'

/** "Write ahead": the visitor's message is sampled into a dot matrix and etched by a moving laser head. */
export function initMessagePlate(): void {
  const form = document.querySelector<HTMLFormElement>('[data-message-form]')
  const canvas = document.querySelector<HTMLCanvasElement>('[data-message-canvas]')
  const status = document.querySelector<HTMLElement>('[data-message-status]')
  const plateId = document.querySelector<HTMLElement>('[data-plate-id]')
  const ctx = canvas?.getContext('2d')
  if (!form || !canvas || !status || !ctx) return

  const futureYear = new Date().getFullYear() + 10000
  document.querySelectorAll('[data-future-year]').forEach((el) => {
    el.textContent = String(futureYear)
  })

  let width = 0
  let height = 0
  let step = 5 // distance between etched voxels, CSS pixels; finer on small plates
  let maxLine = 16 // characters per line before wrapping; fewer on narrow plates
  let text = DEFAULT_TEXT
  let dots: Dot[] = []
  const laser = { x: Infinity, active: false }
  let etching: gsap.core.Tween | null = null

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2)
    width = canvas!.clientWidth
    height = canvas!.clientHeight
    canvas!.width = Math.round(width * dpr)
    canvas!.height = Math.round(height * dpr)
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    step = Math.min(5, Math.max(3, width / 120))
    maxLine = width < 500 ? 8 : 16
    dots = sample(text)
    draw()
  }

  function wrap(message: string): string[] {
    const lines: string[] = []
    let line = ''
    for (const word of message.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (candidate.length > maxLine && line) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) lines.push(line)
    return lines.slice(0, 3)
  }

  /** Renders the text off-screen and keeps every grid point that lands inside a glyph. */
  function sample(message: string): Dot[] {
    if (!width || !height) return []
    const off = document.createElement('canvas')
    off.width = Math.ceil(width)
    off.height = Math.ceil(height)
    const o = off.getContext('2d', { willReadFrequently: true })
    if (!o) return []

    const lines = wrap(message.toUpperCase())
    const lineHeight = 1.15
    let size = Math.min(height / (lines.length * lineHeight) * 0.78, 140)
    const setFont = () => {
      o.font = `600 ${size}px "Martian Mono Variable", ui-monospace, monospace`
    }
    setFont()
    while (size > 12 && Math.max(...lines.map((l) => o.measureText(l).width)) > width * 0.86) {
      size -= 2
      setFont()
    }

    o.fillStyle = '#fff'
    o.textAlign = 'center'
    o.textBaseline = 'middle'
    const top = height / 2 - ((lines.length - 1) * size * lineHeight) / 2
    lines.forEach((line, i) => o.fillText(line, width / 2, top + i * size * lineHeight))

    const data = o.getImageData(0, 0, off.width, off.height).data
    const result: Dot[] = []
    for (let y = step / 2; y < height; y += step) {
      for (let x = step / 2; x < width; x += step) {
        const alpha = data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3]
        if (alpha > 110) result.push({ x, y })
      }
    }
    return result
  }

  function draw() {
    ctx!.clearRect(0, 0, width, height)

    // Unwritten quartz: a faint grid of empty voxel sites.
    ctx!.fillStyle = 'rgba(236, 232, 223, 0.07)'
    for (let y = step / 2; y < height; y += step * 2) {
      for (let x = step / 2; x < width; x += step * 2) ctx!.fillRect(x - 0.5, y - 0.5, 1, 1)
    }

    // Written voxels: hot (laser colour) right behind the head, cooling to bone.
    const hot = step * 0.64
    const cold = step * 0.44
    for (const dot of dots) {
      const behind = laser.x - dot.x
      if (behind < 0) continue
      if (laser.active && behind < 40) {
        ctx!.fillStyle = LASER
        ctx!.fillRect(dot.x - hot / 2, dot.y - hot / 2, hot, hot)
      } else {
        ctx!.fillStyle = BONE
        ctx!.fillRect(dot.x - cold / 2, dot.y - cold / 2, cold, cold)
      }
    }

    // The laser head itself.
    if (laser.active) {
      const glow = ctx!.createLinearGradient(laser.x - 24, 0, laser.x + 6, 0)
      glow.addColorStop(0, 'rgba(255, 90, 31, 0)')
      glow.addColorStop(1, 'rgba(255, 90, 31, 0.35)')
      ctx!.fillStyle = glow
      ctx!.fillRect(laser.x - 24, 0, 30, height)
      ctx!.fillStyle = LASER
      ctx!.fillRect(laser.x, 0, 1.5, height)
    }
  }

  function etch(message: string) {
    text = message
    dots = sample(text)
    etching?.kill()
    if (plateId) plateId.textContent = String(Math.floor(Math.random() * 999999) + 1).padStart(6, '0')
    status!.classList.remove('is-sealed')

    const finish = () => {
      laser.active = false
      laser.x = Infinity
      draw()
      status!.textContent = `Sealed · retrieval window opens ${formatFutureDate()}`
      status!.classList.add('is-sealed')
    }

    if (reducedMotion || !dots.length) {
      finish()
      return
    }

    const xs = dots.map((d) => d.x)
    laser.active = true
    laser.x = Math.min(...xs) - 10
    status!.textContent = 'Etching…'
    etching = gsap.to(laser, {
      x: Math.max(...xs) + 10,
      duration: 2.6,
      ease: 'none',
      onUpdate: draw,
      onComplete: finish,
    })
  }

  function formatFutureDate(): string {
    const now = new Date()
    const month = now.toLocaleString('en-GB', { month: 'short' })
    return `${now.getDate()} ${month} ${futureYear}`
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const input = form.elements.namedItem('message') as HTMLInputElement | null
    const value = input?.value.trim()
    etch(value || DEFAULT_TEXT)
  })

  new ResizeObserver(() => {
    if (!etching?.isActive()) resize()
  }).observe(canvas)

  // Etch a sample message the first time the plate comes into view.
  laser.x = -Infinity
  resize()
  ScrollTrigger.create({ trigger: canvas, start: 'top 75%', once: true, onEnter: () => etch(DEFAULT_TEXT) })
}
