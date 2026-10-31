import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing'
import { HalfFloatType, type Camera, type Scene, Vector2, type WebGLRenderer } from 'three'

/**
 * Bloom only catches what is brighter than white (laser, voxels), then film tone mapping.
 * Lens character goes in a second pass: slight colour fringing at the edges, grain, vignette.
 */
export function createComposer(renderer: WebGLRenderer, scene: Scene, camera: Camera, quality: 'high' | 'low') {
  const composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: quality === 'high' ? Math.min(4, renderer.capabilities.maxSamples) : 0,
  })
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 0.92,
    luminanceSmoothing: 0.25,
    intensity: 1.15,
    radius: 0.72,
  })
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX })
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.62 })
  composer.addPass(new EffectPass(camera, bloom, toneMapping, vignette))

  const fringe = new ChromaticAberrationEffect({
    offset: new Vector2(0.0009, 0.0006),
    radialModulation: true,
    modulationOffset: 0.35,
  })
  const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false })
  grain.blendMode.opacity.value = 0.22
  composer.addPass(new EffectPass(camera, fringe, grain))

  return composer
}
