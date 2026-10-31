import { BufferAttribute, Color, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three'
import { createNoise2D, ridged, smoothstep } from './noise'
import { palette } from './palette'

const WIDTH = 80
const DEPTH = 36
/** Sorvald: the peak that hides the vault, in the mountains' local space. Off to the left, clear of the plate. */
const PEAK = { x: -5.4, z: -2 }

/**
 * Faceted mountain range: ridged noise, a central peak, flat shading so every face
 * reads like a cut crystal. Snow settles on faces that look up and sit high enough.
 */
export function createMountains() {
  const noise = createNoise2D(11)
  const detail = createNoise2D(29)

  const heightAt = (x: number, z: number) => {
    const back = smoothstep(DEPTH * 0.5, -DEPTH * 0.25, z) // farther = taller
    const range = ridged(noise, x * 0.075 + 3.1, z * 0.075 - 1.7) * 4.6 * (0.25 + back)
    const dx = x - PEAK.x
    const dz = z - PEAK.z
    const peak = Math.exp(-(dx * dx) / 14 - (dz * dz) / 10) * 4.2
    const valley = Math.exp(-(x * x) / 40) * smoothstep(-2, 12, z) * 1.6 // opens toward the camera
    return range + peak - valley
  }

  // Few, large facets: it should read as cut crystal, not crumpled paper.
  let geometry = new PlaneGeometry(WIDTH, DEPTH, 84, 38)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    position.setY(i, heightAt(position.getX(i), position.getZ(i)))
  }

  geometry = geometry.toNonIndexed() as PlaneGeometry
  geometry.computeVertexNormals()

  // Colour per face: rock, or snow where the face looks up and sits high.
  const pos = geometry.attributes.position
  const nor = geometry.attributes.normal
  const colors = new Float32Array(pos.count * 3)
  const color = new Color()
  for (let i = 0; i < pos.count; i += 3) {
    const height = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3
    const up = nor.getY(i)
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const jitter = detail(x * 0.6, z * 0.6) * 0.25
    const snow = smoothstep(0.7, 0.92, up + jitter) * smoothstep(1.4, 3.2, height + jitter * 2)
    color.copy(palette.rock).lerp(palette.rockLight, smoothstep(0.3, 0.95, up) * 0.45)
    color.lerp(palette.snow, snow * 0.7)
    color.multiplyScalar(0.82 + Math.random() * 0.3) // every facet catches the light a little differently
    for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3)
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))

  const material = new MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.92,
    metalness: 0,
  })

  const mesh = new Mesh(geometry, material)
  mesh.position.set(0, -2.1, -15)

  const peakTop = new Vector3(PEAK.x, heightAt(PEAK.x, PEAK.z), PEAK.z).add(mesh.position)

  return { mesh, peakTop }
}
