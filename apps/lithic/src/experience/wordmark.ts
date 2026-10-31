import { CanvasTexture, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three'

const FONT = '"Archivo Variable", "Archivo", sans-serif'

/**
 * The giant LITHIC behind the plate. Opaque (alpha-tested, not transparent) on purpose:
 * three.js only refracts opaque objects through transmissive glass.
 */
export async function createWordmark(text = 'LITHIC') {
  await document.fonts.load(`800 200px ${FONT}`)

  const canvas = document.createElement('canvas')
  canvas.width = 4096
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')

  ctx.fontStretch = 'expanded'
  ctx.font = `800 760px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const metrics = ctx.measureText(text)
  const fit = Math.min(1, (canvas.width * 0.97) / metrics.width)
  ctx.font = `800 ${Math.floor(760 * fit)}px ${FONT}`
  const m = ctx.measureText(text)
  const glyphHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
  // Outline only: thin lines show refraction and dispersion through the glass far better than a fill.
  ctx.strokeStyle = '#ece8df'
  ctx.lineWidth = 7
  ctx.lineJoin = 'miter'
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + glyphHeight / 2 - m.actualBoundingBoxDescent)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  texture.minFilter = LinearMipmapLinearFilter

  const material = new MeshBasicMaterial({
    map: texture,
    alphaTest: 0.5,
    alphaToCoverage: true,
    fog: false,
    toneMapped: false,
  })
  material.color.setScalar(0.85)

  const aspect = canvas.width / canvas.height
  const mesh = new Mesh(new PlaneGeometry(aspect, 1), material)

  return {
    mesh,
    aspect,
    /** Fits the wordmark to a share of the visible width at its distance from the camera. */
    fitWidth(visibleWidth: number, share = 0.9) {
      const width = visibleWidth * share
      mesh.scale.set(width / aspect, width / aspect, 1)
    },
    setBrightness(value: number) {
      material.color.setScalar(value)
    },
  }
}
