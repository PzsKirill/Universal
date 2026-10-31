import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type Texture,
  type WebGLRenderer,
} from 'three'
import { palette } from './palette'

/**
 * A small "light studio" baked into an environment map, used only for the glass.
 * Long cool strips give the plate its edge highlights; a thin orange strip echoes the laser.
 */
export function createGlassEnvironment(renderer: WebGLRenderer): Texture {
  const scene = new Scene()
  scene.background = palette.night.clone()

  const panel = (w: number, h: number, color: Color, strength: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: color.clone().multiplyScalar(strength), side: DoubleSide }),
    )
    mesh.position.set(x, y, z)
    mesh.lookAt(0, 0, 0)
    scene.add(mesh)
  }

  panel(9, 1.1, palette.moon, 4, -4, 6, 3) // key strip, top left
  panel(1.2, 7, palette.snow, 2.2, 6, 1, 2) // rim, right
  panel(6, 0.6, palette.snow, 1.4, 0, -2, 6) // low fill in front
  panel(0.35, 7, palette.laser, 5, -6, 0, -3) // laser rim, back left
  panel(14, 14, palette.haze, 0.6, 0, -6, 0) // floor bounce

  const pmrem = new PMREMGenerator(renderer)
  const texture = pmrem.fromScene(scene, 0.035).texture
  pmrem.dispose()
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose()
      ;(object.material as MeshBasicMaterial).dispose()
    }
  })
  return texture
}
