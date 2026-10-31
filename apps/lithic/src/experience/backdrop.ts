import { LinearFilter, Mesh, PlaneGeometry, ShaderMaterial, type Texture, TextureLoader, VideoTexture } from 'three'

const VIDEO_ASPECT = 16 / 9

/**
 * Real footage behind the plate, on an opaque plane so the glass can refract it.
 * Graded in the shader (desaturated, cold, dark: blue hour) so any clip fits the palette.
 * Shows the poster first and swaps to the video once it actually plays.
 */
export function createBackdrop(src: string, poster: string) {
  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: null as Texture | null },
      uDim: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uDim;
      varying vec2 vUv;

      void main() {
        vec3 c = texture2D(uMap, vUv).rgb;
        c = pow(c, vec3(2.2)); // sRGB video -> linear

        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, 0.4);             // desaturate
        c *= vec3(0.74, 0.86, 1.0);           // cold
        c = pow(c, vec3(1.12)) * 0.62 * uDim; // blue hour

        // Heavier sky, lighter snow line.
        c *= mix(0.6, 1.0, smoothstep(1.0, 0.5, vUv.y));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  })

  const mesh = new Mesh(new PlaneGeometry(VIDEO_ASPECT, 1), material)

  new TextureLoader().load(poster, (texture) => {
    if (!material.uniforms.uMap.value) material.uniforms.uMap.value = texture
  })

  const video = document.createElement('video')
  video.src = src
  video.muted = true
  video.loop = true
  video.playsInline = true
  video.preload = 'auto'
  video.setAttribute('aria-hidden', 'true')

  const videoTexture = new VideoTexture(video)
  videoTexture.minFilter = LinearFilter
  videoTexture.magFilter = LinearFilter
  video.addEventListener('playing', () => {
    material.uniforms.uMap.value = videoTexture
  })

  return {
    mesh,
    play() {
      void video.play().catch(() => {
        // Autoplay refused (e.g. low-power mode): the graded poster stays.
      })
    },
    pause() {
      video.pause()
    },
    /** Scales the plane to cover a view of the given size, with a little overscan for parallax. */
    cover(viewWidth: number, viewHeight: number, overscan = 1.08) {
      const height = Math.max(viewHeight, viewWidth / VIDEO_ASPECT) * overscan
      mesh.scale.set(height, height, 1)
    },
    setDim(value: number) {
      material.uniforms.uDim.value = value
    },
  }
}
