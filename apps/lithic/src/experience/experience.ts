import { MathUtils, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'
import type { EffectComposer } from 'postprocessing'
import { gsap } from '../lib/gsap'
import { reducedMotion } from '../lib/motion'
import { createBackdrop } from './backdrop'
import { createGlassEnvironment } from './environment'
import { createPlate } from './plate'
import { createComposer } from './post'
import { createSnow } from './snow'

const FOV = 32
const PLATE_SIZE = 1.7
const BACKDROP_Z = -9

type Quality = 'high' | 'low'

export interface ExperienceEvents {
  /** Fires as the laser writes voxels, for sound. */
  onEtchTick?: () => void
}

/**
 * The hero scene: real mountain footage, and in front of it the product itself,
 * a quartz plate that turns toward the cursor and gets etched by the laser on arrival.
 */
export class Experience {
  readonly ready: Promise<void>

  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  private composer!: EffectComposer
  private quality: Quality
  private events: ExperienceEvents

  private backdrop: ReturnType<typeof createBackdrop>
  private snow: ReturnType<typeof createSnow>
  private plate!: ReturnType<typeof createPlate>

  private time = 0
  private distance = 6
  private plateHome = new Vector3()
  private pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 }
  private plateRotation = { x: 0.08, y: -0.38 }
  private intro = { dolly: 1 } // 1 = far away, 0 = resting
  private scroll = 0
  private running = false

  constructor(
    private canvas: HTMLCanvasElement,
    events: ExperienceEvents = {},
  ) {
    this.events = events
    const coarse = window.matchMedia('(pointer: coarse)').matches
    this.quality = coarse && window.innerWidth < 900 ? 'low' : 'high'

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      stencil: false,
      depth: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'high' ? 1.5 : 1.25))
    this.renderer.transmissionResolutionScale = this.quality === 'high' ? 1 : 0.5

    const small = window.innerWidth < 900
    this.backdrop = createBackdrop(
      small ? '/media/video/hero-sm.mp4' : '/media/video/hero.mp4',
      '/media/video/hero-poster.jpg',
    )
    this.snow = createSnow(this.quality === 'high' ? 700 : 300, this.renderer.getPixelRatio())
    this.ready = this.build()
  }

  private async build() {
    const { scene } = this
    this.backdrop.mesh.position.z = BACKDROP_Z
    scene.add(this.backdrop.mesh, this.snow.points)

    this.plate = createPlate(createGlassEnvironment(this.renderer), this.quality)
    scene.add(this.plate.group)

    this.composer = createComposer(this.renderer, scene, this.camera, this.quality)

    if (reducedMotion) {
      this.intro.dolly = 0
      this.plate.setEtch(1)
    } else {
      this.plate.setEtch(0)
    }

    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resize()

    // Compile every shader now, while the loader is still up, so the intro doesn't stutter.
    this.renderer.compile(scene, this.camera)
    this.tick(0, 0)
  }

  /** Camera settles in, then the laser writes the plate. */
  playIntro() {
    this.backdrop.play()
    if (reducedMotion) return
    const tl = gsap.timeline()
    tl.to(this.intro, { dolly: 0, duration: 3.6, ease: 'expo.out' }, 0)

    const etch = { value: 0 }
    let lastTick = 0
    tl.to(
      etch,
      {
        value: 1,
        duration: 3.2,
        ease: 'none',
        onUpdate: () => {
          this.plate.setEtch(etch.value)
          if (etch.value - lastTick > 0.035) {
            lastTick = etch.value
            this.events.onEtchTick?.()
          }
        },
      },
      1.2,
    )
  }

  /** 0..1 across the hero: the plate tips and sinks, the footage dims, the canvas fades out. */
  setScroll(progress: number) {
    this.scroll = progress
    this.canvas.style.opacity = String(1 - MathUtils.smoothstep(progress, 0.75, 1))
    this.backdrop.setDim(1 - progress * 0.6)
    if (progress >= 1) {
      this.stop()
      this.backdrop.pause()
    } else {
      this.backdrop.play()
      this.start()
    }
    if (reducedMotion) this.tick(0, 0)
  }

  /** Runs the render loop. With reduced motion the scene is still and renders only on change. */
  start() {
    if (this.running || document.hidden || reducedMotion) return
    this.running = true
    gsap.ticker.add(this.tick)
  }

  stop() {
    if (!this.running) return
    this.running = false
    gsap.ticker.remove(this.tick)
  }

  private tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 1 / 20)
    if (!reducedMotion) this.time += dt
    const t = this.time
    const motion = reducedMotion ? 0 : 1

    // Pointer, smoothed: heavy objects follow slowly.
    const follow = 1 - Math.exp(-dt * 2.4)
    this.pointer.smoothX += (this.pointer.x - this.pointer.smoothX) * follow
    this.pointer.smoothY += (this.pointer.y - this.pointer.smoothY) * follow
    const { smoothX: px, smoothY: py } = this.pointer
    const s = this.scroll

    // Plate: turns toward the cursor and breathes; on scroll it tips back and sinks.
    const turn = 1 - Math.exp(-dt * 3)
    const targetY = -0.38 + px * 0.45 + Math.sin(t * 0.31) * 0.06 * motion
    const targetX = 0.08 - py * 0.3 + Math.sin(t * 0.23) * 0.04 * motion
    this.plateRotation.y += (targetY - this.plateRotation.y) * turn
    this.plateRotation.x += (targetX - this.plateRotation.x) * turn
    const plate = this.plate.group
    plate.rotation.set(this.plateRotation.x - s * 0.9, this.plateRotation.y, Math.sin(t * 0.17) * 0.02 * motion)
    plate.position.set(
      this.plateHome.x,
      this.plateHome.y + Math.sin(t * 0.7) * 0.03 * motion - s * 2.2,
      this.plateHome.z - s * 1.2,
    )

    // Camera: arrives on intro, slight parallax against the footage behind.
    const d = this.intro.dolly
    this.camera.position.set(px * 0.22, py * 0.12 + d * 0.5, this.distance + d * 3)
    this.camera.lookAt(0, d * 0.2, 0)
    this.backdrop.mesh.position.x = -px * 0.35

    this.snow.update(t)
    this.plate.update(t)
    this.render()
  }

  private render() {
    this.composer?.render()
  }

  private resize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    const aspect = width / height
    this.renderer.setSize(width, height, false)
    this.composer?.setSize(width, height, false)
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()

    const tan = Math.tan(MathUtils.degToRad(FOV / 2))
    const landscape = aspect >= 1

    // Landscape: the plate sits in the right half at ~46% of the height. Portrait: centred up top.
    const heightShare = landscape ? 0.46 : 0.3
    this.distance = PLATE_SIZE / heightShare / (2 * tan)
    if (!landscape) this.distance = Math.max(this.distance, PLATE_SIZE / 0.62 / (2 * tan * aspect))

    const viewHeight = 2 * this.distance * tan
    const viewWidth = viewHeight * aspect
    this.plateHome.set(landscape ? viewWidth * 0.22 : 0, landscape ? viewHeight * 0.04 : viewHeight * 0.24, 0)

    const backdropDistance = this.distance - BACKDROP_Z
    const backdropHeight = 2 * backdropDistance * tan
    this.backdrop.cover(backdropHeight * aspect, backdropHeight)

    if (!this.running && this.plate) this.tick(0, 0)
  }

  private onPointerMove = (event: PointerEvent) => {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1)
  }

  private onVisibility = () => {
    if (document.hidden) this.stop()
    else if (this.scroll < 1) this.start()
  }
}
