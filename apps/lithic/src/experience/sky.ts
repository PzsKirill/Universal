import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from 'three'
import { palette } from './palette'

/** Polar-night dome: cold haze on the horizon, twinkling stars, a faint glow where the moon hides. */
export function createSky() {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uZenith: { value: palette.night },
      uHorizon: { value: palette.horizon },
      uHaze: { value: palette.haze },
      uMoon: { value: palette.moon },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uHaze;
      uniform vec3 uMoon;
      varying vec3 vDir;

      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;

        vec3 col = mix(uHorizon, uZenith, smoothstep(-0.02, 0.5, h));
        col += uHaze * exp(-abs(h - 0.03) * 14.0) * 0.55;

        // The moon is out of frame, top left: only its halo reaches the sky.
        vec3 moonDir = normalize(vec3(-0.55, 0.62, -0.55));
        float moon = max(dot(d, moonDir), 0.0);
        col += uMoon * pow(moon, 18.0) * 0.18;

        // Stars on a fine 3D grid; most cells are empty.
        vec3 sp = d * 230.0;
        vec3 cell = floor(sp);
        float r = hash(cell);
        float star = step(0.9955, r) * smoothstep(0.34, 0.0, length(fract(sp) - 0.5));
        float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + r * 2.5) + r * 60.0);
        col += vec3(0.86, 0.92, 1.0) * star * twinkle * smoothstep(0.03, 0.3, h) * 1.4;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  const mesh = new Mesh(new SphereGeometry(90, 48, 24), material)
  mesh.frustumCulled = false

  return {
    mesh,
    update(time: number) {
      material.uniforms.uTime.value = time
    },
  }
}
