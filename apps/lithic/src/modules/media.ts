import { reducedMotion } from '../lib/motion'

/** Background clips ([data-autoplay]) play only while on screen, and never with reduced motion. */
export function initAutoplayVideos(): void {
  if (reducedMotion) return
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        const video = target as HTMLVideoElement
        if (isIntersecting) void video.play().catch(() => {})
        else video.pause()
      })
    },
    { rootMargin: '10% 0px' },
  )
  document.querySelectorAll<HTMLVideoElement>('video[data-autoplay]').forEach((video) => observer.observe(video))
}
