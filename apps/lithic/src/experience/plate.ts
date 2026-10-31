import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  type Texture,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { palette } from './palette'

const SIZE = 1.7
const THICKNESS = 0.19
const GRID = 84
const DATA = SIZE * 0.74 // etched area, leaves a clear glass margin

type Cell = { x: number; y: number; layer: number }

/** Deterministic pseudo-random in 0..1, so the plate looks the same on every visit. */
const random = (a: number, b = 0) => {
  const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return n - Math.floor(n)
}

/**
 * What is etched: a ring-shaped primer glyph (readable without language), then lines of
 * "text" — glyphs of 3×4 voxels grouped into words, words into lines, lines into paragraphs.
 */
function buildPattern(): Cell[] {
  const cells: Cell[] = []
  const LINE = 6 // voxel rows per text line (4 glyph rows + 2 leading)
  const primer = { x: 7, y: GRID - 8, r: 6 }

  // Primer, top left.
  for (let gy = primer.y - 8; gy <= primer.y + 8; gy++) {
    for (let gx = primer.x - 8; gx <= primer.x + 8; gx++) {
      const d = Math.hypot(gx - primer.x, gy - primer.y)
      if (Math.abs(d - primer.r) < 0.6 || Math.abs(d - primer.r * 0.5) < 0.55 || d < 0.7) cells.push({ x: gx, y: gy, layer: 1 })
    }
  }

  const lines = Math.floor(GRID / LINE)
  for (let line = 0; line < lines; line++) {
    const top = GRID - 1 - line * LINE
    const indentForPrimer = top > primer.y - 9 ? 18 : 0
    const paragraphEnd = random(line, 7) > 0.78
    const length = paragraphEnd ? 0.25 + random(line, 3) * 0.45 : 0.9 + random(line, 5) * 0.1
    const endX = Math.floor(GRID * length)

    let x = indentForPrimer
    let word = 0
    while (x + 3 <= endX) {
      const glyphs = 2 + Math.floor(random(line, word) * 6)
      for (let g = 0; g < glyphs && x + 3 <= endX; g++) {
        for (let gy = 0; gy < 4; gy++) {
          for (let gx = 0; gx < 3; gx++) {
            if (random(x + gx, top - gy + line * 31) > 0.45) cells.push({ x: x + gx, y: top - gy, layer: 0 })
          }
        }
        x += 4
      }
      x += 3 // space between words
      word++
    }
  }
  return cells
}

/**
 * The quartz plate: transmissive glass with dispersion, voxels of etched data inside,
 * and a laser line that writes them in.
 */
export function createPlate(envMap: Texture, quality: 'high' | 'low') {
  const group = new Group()

  const glass = new Mesh(
    new RoundedBoxGeometry(SIZE, SIZE, THICKNESS, 8, 0.075),
    new MeshPhysicalMaterial({
      color: new Color('#ffffff'),
      transmission: 1,
      thickness: 0.9,
      roughness: 0.02,
      ior: 1.46,
      dispersion: quality === 'high' ? 1.4 : 0,
      envMap,
      envMapIntensity: 2.4,
      specularIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      attenuationColor: new Color('#eef4f8'),
      attenuationDistance: 6,
    }),
  )
  group.add(glass)

  // Edges of real crystal glow from light trapped inside; fake it with a fresnel shell.
  const rim = new Mesh(
    glass.geometry,
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uColor: { value: palette.moon.clone().multiplyScalar(0.9) } },
      vertexShader: /* glsl */ `
        varying float vFresnel;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * normal);
          vFresnel = pow(1.0 - abs(dot(n, normalize(-mv.xyz))), 3.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vFresnel;
        void main() {
          gl_FragColor = vec4(uColor * vFresnel, vFresnel);
        }
      `,
    }),
  )
  rim.scale.setScalar(1.002)
  group.add(rim)

  // --- Etched voxels -------------------------------------------------------
  const pattern = buildPattern()
  const cell = DATA / GRID
  const voxelGeometry = new BoxGeometry(cell * 0.46, cell * 0.46, 0.004)
  const order = new Float32Array(pattern.length)
  const seed = new Float32Array(pattern.length)
  const voxelMaterial = new ShaderMaterial({
    uniforms: {
      uEtch: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: palette.bone.clone().multiplyScalar(0.85) },
      uHot: { value: palette.laser.clone().multiplyScalar(7) },
    },
    vertexShader: /* glsl */ `
      attribute float aOrder;
      attribute float aSeed;
      uniform float uEtch;
      varying float vHeat;
      varying float vSeed;
      void main() {
        float written = step(aOrder, uEtch);
        float heat = written * (1.0 - smoothstep(0.0, 0.05, uEtch - aOrder));
        vHeat = heat;
        vSeed = aSeed;
        vec3 p = position * written * (1.0 + heat * 0.8);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uHot;
      uniform float uTime;
      varying float vHeat;
      varying float vSeed;
      void main() {
        float shimmer = 0.8 + 0.2 * sin(uTime * 1.7 + vSeed * 50.0);
        gl_FragColor = vec4(mix(uColor * shimmer, uHot, vHeat), 1.0);
      }
    `,
  })
  const voxels = new InstancedMesh(voxelGeometry, voxelMaterial, pattern.length)
  const dummy = new Object3D()
  pattern.forEach((p, i) => {
    const x = -DATA / 2 + (p.x + 0.5) * cell
    const y = -DATA / 2 + (p.y + 0.5) * cell
    dummy.position.set(x, y, p.layer === 0 ? -0.02 : 0.03)
    dummy.updateMatrix()
    voxels.setMatrixAt(i, dummy.matrix)
    // Etch order sweeps left to right with a slight per-row stagger, like a raster.
    order[i] = (p.x + 0.5) / GRID * 0.94 + (p.y / GRID) * 0.06
    seed[i] = random(i, 99)
  })
  voxelGeometry.setAttribute('aOrder', new InstancedBufferAttribute(order, 1))
  voxelGeometry.setAttribute('aSeed', new InstancedBufferAttribute(seed, 1))
  group.add(voxels)

  // --- Laser line that writes the voxels ----------------------------------
  const laserLine = new Mesh(
    new PlaneGeometry(0.008, DATA * 1.04),
    new MeshBasicMaterial({ color: palette.laser.clone().multiplyScalar(10), toneMapped: false }),
  )
  laserLine.position.z = 0.006
  laserLine.visible = false
  group.add(laserLine)

  return {
    group,
    /** 0..1: how much of the plate is etched. */
    setEtch(value: number) {
      voxelMaterial.uniforms.uEtch.value = value
      laserLine.visible = value > 0 && value < 1
      laserLine.position.x = -DATA / 2 + Math.min(Math.max(value, 0), 1) * DATA
    },
    update(time: number) {
      voxelMaterial.uniforms.uTime.value = time
    },
  }
}
