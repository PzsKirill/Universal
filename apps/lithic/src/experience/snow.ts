import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three'

/** Slow snowfall in a box around the camera. Near flakes are large and soft, like out-of-focus bokeh. */
export function createSnow(count: number, pixelRatio: number) {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 18
    positions[i * 3 + 1] = Math.random() * 9 - 3
    positions[i * 3 + 2] = Math.random() * 14 - 9
    seeds[i] = Math.random()
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 34 },
      uPixelRatio: { value: pixelRatio },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uSize;
      uniform float uPixelRatio;
      varying float vAlpha;

      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTime * (0.1 + aSeed * 0.16) + 3.0, 9.0) - 3.0;
        p.x = mod(p.x + uTime * 0.07 + sin(uTime * 0.35 + aSeed * 30.0) * 0.3 + 9.0, 18.0) - 9.0;
        p.z += sin(uTime * 0.27 + aSeed * 12.0) * 0.2;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPixelRatio * (0.35 + aSeed * 0.9) / -mv.z;

        float depth = -mv.z;
        vAlpha = smoothstep(16.0, 4.0, depth) * smoothstep(0.4, 1.4, depth) * (0.35 + aSeed * 0.45);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vAlpha;
        gl_FragColor = vec4(vec3(0.82, 0.87, 0.93) * a, a);
      }
    `,
  })

  const points = new Points(geometry, material)
  points.frustumCulled = false

  return {
    points,
    update(time: number) {
      material.uniforms.uTime.value = time
    },
  }
}
