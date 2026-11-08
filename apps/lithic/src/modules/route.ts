import { gsap, ScrollTrigger } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'
import { sound } from '../ui/sound'

/*
 * The route: a topographic map of the mountain, drawn in code — hill-shaded relief and contour
 * lines from a generated height field. The section pins; scrolling flies the camera from an
 * overview down to the road end, follows the team up the switchbacks while the trail burns in
 * laser orange behind them, then pulls back to show the whole climb.
 */

const MAP_W = 4000
const MAP_H = 2600
const GRID_W = 540
const GRID_H = 351
const LEVELS = 64

type Point = { x: number; y: number }

// The trail is drawn in the middle of a larger map, clear of the text in the screen corners.
const OFFSET: Point = { x: 700, y: 300 }
const onMap = (x: number, y: number): Point => ({ x: x + OFFSET.x, y: y + OFFSET.y })

// The trail, in map units. Stops sit at knots 0, 6, 12 and 15; the rest shape the switchbacks.
const TRAIL: Point[] = [
  onMap(380, 1640),
  onMap(620, 1590),
  onMap(780, 1490),
  onMap(650, 1410),
  onMap(870, 1340),
  onMap(1070, 1300),
  onMap(1260, 1180),
  onMap(1430, 1110),
  onMap(1570, 990),
  onMap(1440, 905),
  onMap(1650, 845),
  onMap(1880, 785),
  onMap(2080, 700),
  onMap(2250, 640),
  onMap(2380, 545),
  onMap(2540, 460),
]
const STOP_KNOTS = [0, 6, 12, 15]
const PEAK: Point = onMap(2700, 330)

// What the readout shows at each stop.
const ALTITUDE = [1340, 1710, 2060, 2240]
const MINUTES = [6 * 60, 8 * 60 + 30, 10 * 60 + 45, 12 * 60 + 10]
const CELSIUS = [-9, -12, -15, -14]

// ---------------------------------------------------------------- terrain

const hash = (x: number, y: number) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const valueNoise = (x: number, y: number) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const top = hash(xi, yi) + (hash(xi + 1, yi) - hash(xi, yi)) * u
  const bottom = hash(xi, yi + 1) + (hash(xi + 1, yi + 1) - hash(xi, yi + 1)) * u
  return top + (bottom - top) * v
}

const fbm = (x: number, y: number) => {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < 5; i++) {
    sum += valueNoise(x * freq + i * 17.3, y * freq - i * 9.1) * amp
    amp *= 0.5
    freq *= 2.03
  }
  return sum / 0.97
}

const gauss = (x: number, y: number, c: Point, sigma: number) =>
  Math.exp(-((x - c.x) ** 2 + (y - c.y) ** 2) / (2 * sigma * sigma))

const distanceToSegment = (x: number, y: number, a: Point, b: Point) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t))
}

/** Land rises to the north-east, a main peak above the portal, a crest the upper trail follows. */
function heightAt(x: number, y: number): number {
  let h = 0.33 * (x / MAP_W) + 0.45 * (1 - y / MAP_H)
  h += gauss(x, y, PEAK, 520) * 0.55
  h += gauss(x, y, onMap(700, 420), 380) * 0.36
  h += gauss(x, y, onMap(1850, 1680), 430) * 0.22
  h += gauss(x, y, onMap(2950, 1450), 380) * 0.3
  h += gauss(x, y, { x: 320, y: 520 }, 460) * 0.42
  h += gauss(x, y, { x: 3760, y: 2250 }, 420) * 0.26
  h += gauss(x, y, { x: 520, y: 2300 }, 380) * 0.18
  let crest = Infinity
  for (let i = STOP_KNOTS[1]; i < TRAIL.length - 1; i++) crest = Math.min(crest, distanceToSegment(x, y, TRAIL[i], TRAIL[i + 1]))
  h += Math.exp(-(crest * crest) / (2 * 170 * 170)) * 0.1
  h -= gauss(x, y, TRAIL[0], 420) * 0.12
  h += (fbm(x / 420, y / 420) - 0.5) * 0.24
  h += (0.5 - Math.abs(valueNoise(x / 240, y / 240) - 0.5)) * 0.09
  return h
}

interface Terrain {
  relief: HTMLCanvasElement
  contours: Path2D
  majorContours: Path2D
}

/** Height field → hill-shaded relief image + contour lines (marching squares). */
function buildTerrain(): Terrain {
  const cw = MAP_W / (GRID_W - 1)
  const ch = MAP_H / (GRID_H - 1)
  const field = new Float32Array(GRID_W * GRID_H)
  let min = Infinity
  let max = -Infinity
  for (let j = 0; j < GRID_H; j++) {
    for (let i = 0; i < GRID_W; i++) {
      const h = heightAt(i * cw, j * ch)
      field[j * GRID_W + i] = h
      if (h < min) min = h
      if (h > max) max = h
    }
  }
  const at = (i: number, j: number) => field[Math.min(GRID_H - 1, Math.max(0, j)) * GRID_W + Math.min(GRID_W - 1, Math.max(0, i))]

  // Relief: light from the north-west, cold slate in the valleys, pale on the high slopes.
  const relief = document.createElement('canvas')
  relief.width = GRID_W
  relief.height = GRID_H
  const rctx = relief.getContext('2d')!
  const image = rctx.createImageData(GRID_W, GRID_H)
  const light = [-0.55, -0.6, 0.58]
  const lightLength = Math.hypot(light[0], light[1], light[2])
  for (let j = 0; j < GRID_H; j++) {
    for (let i = 0; i < GRID_W; i++) {
      const dx = (at(i + 1, j) - at(i - 1, j)) * 38
      const dy = (at(i, j + 1) - at(i, j - 1)) * 38
      const nl = Math.hypot(dx, dy, 1)
      const shade = Math.max(0, (-dx * light[0] - dy * light[1] + light[2]) / (nl * lightLength))
      const elevation = (field[j * GRID_W + i] - min) / (max - min)
      // Shaded relief, plus a little snow on the highest ground.
      const snow = Math.max(0, (elevation - 0.72) / 0.28)
      const k = shade * 0.8 + elevation * 0.25 + snow * snow * 0.5
      const p = (j * GRID_W + i) * 4
      image.data[p] = 6 + k * 52
      image.data[p + 1] = 9 + k * 62
      image.data[p + 2] = 14 + k * 76
      image.data[p + 3] = 255
    }
  }
  rctx.putImageData(image, 0, 0)

  // Contours: one Path2D for the ordinary lines, one for every fifth (index) line.
  const contours = new Path2D()
  const majorContours = new Path2D()
  const step = (max - min) / (LEVELS + 1)
  for (let j = 0; j < GRID_H - 1; j++) {
    for (let i = 0; i < GRID_W - 1; i++) {
      const a = field[j * GRID_W + i]
      const b = field[j * GRID_W + i + 1]
      const c = field[(j + 1) * GRID_W + i + 1]
      const d = field[(j + 1) * GRID_W + i]
      const lo = Math.min(a, b, c, d)
      const hi = Math.max(a, b, c, d)
      const first = Math.ceil((lo - min) / step)
      const last = Math.floor((hi - min) / step)
      for (let level = Math.max(first, 1); level <= Math.min(last, LEVELS); level++) {
        const v = min + level * step
        const x0 = i * cw
        const y0 = j * ch
        // Edge crossings: top, right, bottom, left.
        const hits: Point[] = []
        if ((a < v) !== (b < v)) hits.push({ x: x0 + ((v - a) / (b - a)) * cw, y: y0 })
        if ((b < v) !== (c < v)) hits.push({ x: x0 + cw, y: y0 + ((v - b) / (c - b)) * ch })
        if ((d < v) !== (c < v)) hits.push({ x: x0 + ((v - d) / (c - d)) * cw, y: y0 + ch })
        if ((a < v) !== (d < v)) hits.push({ x: x0, y: y0 + ((v - a) / (d - a)) * ch })
        const path = level % 5 === 0 ? majorContours : contours
        for (let k = 0; k + 1 < hits.length; k += 2) {
          path.moveTo(hits[k].x, hits[k].y)
          path.lineTo(hits[k + 1].x, hits[k + 1].y)
        }
      }
    }
  }
  return { relief, contours, majorContours }
}

// ---------------------------------------------------------------- trail geometry

interface Trail {
  points: Point[]
  lengths: number[] // cumulative
  total: number
  stops: number[] // 0..1 along the trail
}

/** Catmull-Rom through the knots, sampled densely, with arc length for even motion. */
function buildTrail(): Trail {
  const points: Point[] = []
  const knotIndex: number[] = []
  const SAMPLES = 24
  for (let k = 0; k < TRAIL.length - 1; k++) {
    const p0 = TRAIL[Math.max(k - 1, 0)]
    const p1 = TRAIL[k]
    const p2 = TRAIL[k + 1]
    const p3 = TRAIL[Math.min(k + 2, TRAIL.length - 1)]
    knotIndex[k] = points.length
    for (let s = 0; s < SAMPLES; s++) {
      const t = s / SAMPLES
      const t2 = t * t
      const t3 = t2 * t
      points.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  knotIndex[TRAIL.length - 1] = points.length
  points.push({ ...TRAIL[TRAIL.length - 1] })

  const lengths = [0]
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
  }
  const total = lengths[lengths.length - 1]
  const stops = STOP_KNOTS.map((k) => lengths[knotIndex[k]] / total)
  return { points, lengths, total, stops }
}

/** Point on the trail at fraction t of its length. */
function pointAt(trail: Trail, t: number): Point {
  const target = Math.min(Math.max(t, 0), 1) * trail.total
  let lo = 0
  let hi = trail.lengths.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (trail.lengths[mid] < target) lo = mid
    else hi = mid
  }
  const span = trail.lengths[hi] - trail.lengths[lo] || 1
  const f = (target - trail.lengths[lo]) / span
  const a = trail.points[lo]
  const b = trail.points[hi]
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
}

/** Value between stops, linear in distance walked. */
function readout(trail: Trail, values: number[], t: number) {
  const { stops } = trail
  for (let i = 0; i < stops.length - 1; i++) {
    if (t <= stops[i + 1]) {
      const f = (t - stops[i]) / (stops[i + 1] - stops[i] || 1)
      return values[i] + (values[i + 1] - values[i]) * Math.min(Math.max(f, 0), 1)
    }
  }
  return values[values.length - 1]
}

// ---------------------------------------------------------------- camera

interface View {
  x: number // map point at the anchor
  y: number
  scale: number // screen px per map unit
  ax: number // anchor on screen, px
  ay: number
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Never show past the edge of the map: zoom in until it covers the screen, then slide inside it. */
function clampView(view: View, width: number, height: number): View {
  const scale = Math.max(view.scale, width / MAP_W, height / MAP_H)
  const clampAxis = (centre: number, anchor: number, screen: number, size: number) => {
    const min = anchor / scale
    const max = size - (screen - anchor) / scale
    return Math.min(Math.max(centre, min), max)
  }
  return { ...view, scale, x: clampAxis(view.x, view.ax, width, MAP_W), y: clampAxis(view.y, view.ay, height, MAP_H) }
}

function mixView(a: View, b: View, k: number): View {
  const l = (p: number, q: number) => p + (q - p) * k
  return { x: l(a.x, b.x), y: l(a.y, b.y), scale: Math.exp(l(Math.log(a.scale), Math.log(b.scale))), ax: l(a.ax, b.ax), ay: l(a.ay, b.ay) }
}

// ---------------------------------------------------------------- section

const numberFormat = new Intl.NumberFormat('en-US')
const clock = (minutes: number) => {
  const m = Math.round(minutes)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function initRoute(): void {
  const section = document.querySelector<HTMLElement>('[data-route]')
  const pin = section?.querySelector<HTMLElement>('[data-route-pin]')
  const canvas = section?.querySelector<HTMLCanvasElement>('[data-route-map]')
  const ctx = canvas?.getContext('2d')
  if (!section || !pin || !canvas || !ctx) return

  const marker = section.querySelector<HTMLElement>('[data-route-marker]')!
  const peakLabel = section.querySelector<HTMLElement>('[data-route-peak]')!
  const labels = [...section.querySelectorAll<HTMLElement>('[data-route-label]')]
  const stops = [...section.querySelectorAll<HTMLElement>('[data-route-stop]')]
  const ticks = [...section.querySelectorAll<HTMLElement>('[data-route-tick]')]
  const altitude = section.querySelector<HTMLElement>('[data-route-alt]')!
  const time = section.querySelector<HTMLElement>('[data-route-time]')!
  const temperature = section.querySelector<HTMLElement>('[data-route-temp]')!
  const bar = section.querySelector<HTMLElement>('[data-route-progress]')!

  const trail = buildTrail()
  ticks.forEach((tick, i) => (tick.style.left = `${trail.stops[i] * 100}%`))
  let terrain: Terrain | null = null

  let width = 0
  let height = 0
  let dpr = 1
  let progress = reducedMotion ? 1 : 0
  let reached = -1
  let frame = 0

  const narrow = () => width < 700

  const overview = (): View => {
    const xs = trail.points.map((p) => p.x)
    const ys = trail.points.map((p) => p.y)
    const pad = 260
    const minX = Math.min(...xs, PEAK.x) - pad
    const maxX = Math.max(...xs, PEAK.x) + pad
    const minY = Math.min(...ys, PEAK.y) - pad
    const maxY = Math.max(...ys) + pad
    const scale = Math.min(width / (maxX - minX), (height * 0.8) / (maxY - minY))
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, scale, ax: width / 2, ay: height * 0.54 }
  }

  const follow = (t: number): View => {
    // Look a little ahead and behind so the camera glides past switchbacks instead of jerking.
    let x = 0
    let y = 0
    for (let k = -3; k <= 3; k++) {
      const p = pointAt(trail, t + k * 0.012)
      x += p.x / 7
      y += p.y / 7
    }
    const cover = Math.max(width / MAP_W, height / MAP_H)
    return { x, y, scale: cover * (narrow() ? 2.2 : 3.2), ax: width * (narrow() ? 0.5 : 0.6), ay: height * (narrow() ? 0.42 : 0.5) }
  }

  /** Scroll progress → where the team is (0..1 of the trail) and what the camera sees. */
  const phase = (p: number) => {
    if (p < 0.1) return { t: 0, view: mixView(overview(), follow(0), smooth(p / 0.1)) }
    if (p < 0.88) {
      const t = (p - 0.1) / 0.78
      return { t, view: follow(t) }
    }
    return { t: 1, view: mixView(follow(1), overview(), smooth((p - 0.88) / 0.12)) }
  }

  const toScreen = (view: View, p: Point) => ({ x: view.ax + (p.x - view.x) * view.scale, y: view.ay + (p.y - view.y) * view.scale })

  const draw = () => {
    frame = 0
    if (!terrain) return
    const { t, view: free } = phase(progress)
    const view = clampView(free, width, height)
    const s = view.scale
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#06080b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (view.ax - view.x * s), dpr * (view.ay - view.y * s))

    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(terrain.relief, 0, 0, MAP_W, MAP_H)

    ctx.lineWidth = 1 / s
    ctx.strokeStyle = 'rgba(236, 232, 223, 0.12)'
    ctx.stroke(terrain.contours)
    ctx.lineWidth = 1.5 / s
    ctx.strokeStyle = 'rgba(236, 232, 223, 0.28)'
    ctx.stroke(terrain.majorContours)

    // The trail ahead: a faint dashed line.
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    trail.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.setLineDash([2 / s, 7 / s])
    ctx.lineWidth = 2 / s
    ctx.strokeStyle = 'rgba(236, 232, 223, 0.5)'
    ctx.stroke()
    ctx.setLineDash([])

    // The trail behind: burned in, with a soft glow.
    const head = pointAt(trail, t)
    if (t > 0) {
      ctx.beginPath()
      const walked = t * trail.total
      ctx.moveTo(trail.points[0].x, trail.points[0].y)
      for (let i = 1; i < trail.points.length && trail.lengths[i] < walked; i++) ctx.lineTo(trail.points[i].x, trail.points[i].y)
      ctx.lineTo(head.x, head.y)
      ctx.strokeStyle = 'rgba(255, 90, 31, 0.22)'
      ctx.lineWidth = 12 / s
      ctx.stroke()
      ctx.strokeStyle = '#ff5a1f'
      ctx.lineWidth = 2.6 / s
      ctx.stroke()
    }

    // A headlamp: everything near the team is lit a little warmer.
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const lamp = toScreen(view, head)
    const radius = Math.min(width, height) * 0.38 * dpr
    const glow = ctx.createRadialGradient(lamp.x * dpr, lamp.y * dpr, 0, lamp.x * dpr, lamp.y * dpr, radius)
    glow.addColorStop(0, 'rgba(255, 196, 160, 0.16)')
    glow.addColorStop(1, 'rgba(255, 196, 160, 0)')
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'

    // HTML overlays follow the map.
    const place = (el: HTMLElement, p: Point) => {
      const q = toScreen(view, p)
      el.style.transform = `translate3d(${q.x}px, ${q.y}px, 0)`
    }
    place(marker, head)
    place(peakLabel, PEAK)
    labels.forEach((label, i) => place(label, TRAIL[STOP_KNOTS[i]]))

    // Readout and stops.
    altitude.textContent = numberFormat.format(Math.round(readout(trail, ALTITUDE, t) / 5) * 5)
    time.textContent = clock(readout(trail, MINUTES, t))
    temperature.textContent = `−${Math.abs(Math.round(readout(trail, CELSIUS, t)))}`
    bar.style.transform = `scaleX(${progress})`

    const now = trail.stops.filter((stop) => t >= stop - 0.001).length - 1
    if (now !== reached) {
      if (now > reached && reached >= 0) sound.tick(1.1)
      reached = now
      labels.forEach((label, i) => label.classList.toggle('is-reached', i <= now))
      ticks.forEach((tick, i) => tick.classList.toggle('is-reached', i <= now))
      stops.forEach((stop, i) => stop.classList.toggle('is-active', reducedMotion || i === Math.max(now, 0)))
    }
  }

  const request = () => {
    if (!frame) frame = requestAnimationFrame(draw)
  }

  const resize = () => {
    width = pin.clientWidth
    height = pin.clientHeight
    dpr = Math.min(window.devicePixelRatio, 1.5)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    request()
  }

  // The terrain takes a moment to build: do it shortly before the section scrolls into view.
  new IntersectionObserver(
    ([entry], observer) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      terrain = buildTerrain()
      request()
    },
    { rootMargin: '150% 0px' },
  ).observe(section)

  new ResizeObserver(resize).observe(pin)
  resize()

  if (reducedMotion) {
    section.classList.add('route--static')
    return
  }

  gsap.to(
    {},
    {
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: '+=300%',
        pin: true,
        scrub: 0.7,
        onUpdate: (self) => {
          progress = self.progress
          request()
        },
        onRefresh: (self) => {
          progress = self.progress
          request()
        },
      },
    },
  )
  ScrollTrigger.addEventListener('refreshInit', resize)
}
