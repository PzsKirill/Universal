import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/martian-mono/wdth.css'
import 'lenis/dist/lenis.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/sections.css'

import type { Experience } from './experience/experience'
import { gsap, ScrollTrigger } from './lib/gsap'
import { initContactForm } from './modules/contact-form'
import { initDeepTime } from './modules/deep-time'
import { initEncodeVisuals } from './modules/encode-visual'
import { initFaq } from './modules/faq'
import { initFinale } from './modules/finale'
import { initHeader } from './modules/header'
import { initHowItWorks } from './modules/how-it-works'
import { initLifespanChart } from './modules/lifespan-chart'
import { runLoader } from './modules/loader'
import { initSceneClip } from './modules/scene-clip'
import { initAutoplayVideos } from './modules/media'
import { initRoute } from './modules/route'
import { initReveal, initVaultDrawing, initVaultParallax, playIntro } from './modules/scroll-scenes'
import { initSmoothScroll } from './modules/smooth-scroll'
import { initTransitions } from './modules/transitions'
import { initVelocityMarquees } from './modules/velocity-marquee'
import { sound } from './ui/sound'
import { initSoundUi } from './ui/sound-toggle'

/** Three.js lives in its own chunk, fetched while the loader is on screen. */
async function createExperience(): Promise<Experience | null> {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-experience]')
  if (!canvas) return null
  try {
    const { Experience } = await import('./experience/experience')
    const experience = new Experience(canvas, { onEtchTick: () => sound.tick() })
    await experience.ready
    return experience
  } catch (error) {
    console.error(error)
    document.documentElement.classList.add('no-webgl')
    return null
  }
}

async function boot() {
  const lenis = initSmoothScroll()
  lenis?.stop()
  initSoundUi()
  initHeader()

  const pendingExperience = createExperience()
  const { withSound } = await runLoader(Promise.all([document.fonts.ready, pendingExperience]))
  if (withSound) sound.enable()
  const experience = await pendingExperience

  lenis?.start()
  experience?.start()
  experience?.playIntro()
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    onUpdate: (self) => experience?.setScroll(self.progress),
  })
  // The deeper you scroll, the more muffled the sound: the descent lives in the audio.
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => sound.setDepth(self.progress) })

  // Let the plate arrive first; the words follow.
  gsap.delayedCall(0.9, playIntro)

  const canvas = document.querySelector<HTMLCanvasElement>('[data-experience]')
  const sceneSections = [...document.querySelectorAll<HTMLElement>('.hero, [data-finale]')]
  if (canvas) initSceneClip(canvas, sceneSections)

  // Pinned sections first: their pin spacing shifts every trigger below them.
  initDeepTime()
  initTransitions()
  initReveal()
  initLifespanChart()
  initEncodeVisuals()
  initHowItWorks()
  initAutoplayVideos()
  initRoute()
  initVelocityMarquees()
  initVaultParallax()
  initVaultDrawing()
  initFinale(experience)
  initFaq()
  initContactForm()
  ScrollTrigger.sort()
  ScrollTrigger.refresh()
}

boot()
