import { gsap } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'
import { sound } from '../ui/sound'

/** Length along `path` at which it reaches horizontal position `x` (the trail only ever climbs rightwards). */
function lengthAtX(path: SVGPathElement, total: number, x: number): number {
  let low = 0
  let high = total
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    if (path.getPointAtLength(mid).x < x) low = mid
    else high = mid
  }
  return (low + high) / 2
}

/**
 * The route profile: as the section scrolls past, the trail is drawn in laser orange,
 * a marker climbs it, and each waypoint (on the chart and in the list below) lights up when reached.
 */
export function initRoute(): void {
  const figure = document.querySelector<HTMLElement>('[data-route]')
  const done = figure?.querySelector<SVGPathElement>('[data-route-done]')
  const marker = figure?.querySelector<SVGCircleElement>('[data-route-marker]')
  if (!figure || !done || !marker) return

  const points = [...figure.querySelectorAll<SVGGElement>('[data-route-point]')]
  const stops = [...figure.querySelectorAll<HTMLElement>('[data-route-stop]')]
  const total = done.getTotalLength()
  const thresholds = points.map((point) => {
    const x = Number(point.querySelector('circle')?.getAttribute('cx') ?? 0)
    return lengthAtX(done, total, x) / total
  })

  done.style.strokeDasharray = String(total)
  let reached = -1

  const update = (progress: number) => {
    done.style.strokeDashoffset = String(total * (1 - progress))
    const tip = done.getPointAtLength(total * progress)
    marker.setAttribute('cx', String(tip.x))
    marker.setAttribute('cy', String(tip.y))

    const nowReached = thresholds.filter((t) => progress >= t - 0.002).length - 1
    if (nowReached > reached && reached >= 0) sound.tick(1.1)
    reached = nowReached
    points.forEach((point, i) => point.classList.toggle('is-reached', i <= nowReached))
    stops.forEach((stop, i) => stop.classList.toggle('is-reached', i <= nowReached))
  }

  if (reducedMotion) {
    update(1)
    return
  }

  update(0)
  const state = { progress: 0 }
  gsap.to(state, {
    progress: 1,
    ease: 'none',
    onUpdate: () => update(state.progress),
    scrollTrigger: { trigger: figure, start: 'top 75%', end: 'bottom 65%', scrub: 0.6 },
  })
}
