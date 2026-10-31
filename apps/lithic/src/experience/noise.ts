/** Seeded 2D gradient noise (improved-Perlin style), roughly in -1..1. */
export function createNoise2D(seed = 1): (x: number, y: number) => number {
  const p = new Uint8Array(256).map((_, i) => i)
  let s = seed % 2147483647 || 1
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 7
    const u = h < 4 ? x : y
    const v = h < 4 ? y : x
    return (h & 1 ? -u : u) + (h & 2 ? -v : v)
  }

  return (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const X = xi & 255
    const Y = yi & 255
    const xf = x - xi
    const yf = y - yi
    const u = fade(xf)
    const v = fade(yf)
    const a = perm[X] + Y
    const b = perm[X + 1] + Y
    return lerp(
      lerp(grad(perm[a], xf, yf), grad(perm[b], xf - 1, yf), u),
      lerp(grad(perm[a + 1], xf, yf - 1), grad(perm[b + 1], xf - 1, yf - 1), u),
      v,
    )
  }
}

/** Sharp-crested fractal noise, 0..1: good for mountain ridges. */
export function ridged(noise: (x: number, y: number) => number, x: number, y: number, octaves = 5): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise(x * freq, y * freq))
    sum += n * n * amp
    norm += amp
    amp *= 0.5
    freq *= 2.05
  }
  return sum / norm
}

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}
