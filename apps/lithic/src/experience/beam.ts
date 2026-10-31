import { AdditiveBlending, CylinderGeometry, Group, Mesh, ShaderMaterial, type Vector3 } from 'three'
import { palette } from './palette'

/** The laser that marks the shaft: a thin hot core in a soft sheath, fading as it climbs into the sky. */
export function createBeam(base: Vector3, height = 46) {
  const group = new Group()
  group.position.copy(base)

  const makeLayer = (radius: number, strength: number, softness: number) => {
    const geometry = new CylinderGeometry(radius, radius, height, 16, 1, true)
    geometry.translate(0, height / 2, 0)
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uColor: { value: palette.laser.clone().multiplyScalar(strength) },
        uTime: { value: 0 },
        uPower: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vFacing;
        void main() {
          vUv = uv;
          vec3 n = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFacing = abs(dot(n, normalize(-mv.xyz)));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uPower;
        varying vec2 vUv;
        varying float vFacing;
        void main() {
          float fade = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.01, vUv.y);
          float edge = pow(vFacing, ${softness.toFixed(1)});
          float flicker = 0.9 + 0.1 * sin(uTime * 37.0) * sin(uTime * 13.0);
          float a = fade * edge * flicker * uPower;
          gl_FragColor = vec4(uColor * a, a);
        }
      `,
    })
    const mesh = new Mesh(geometry, material)
    mesh.frustumCulled = false
    group.add(mesh)
    return material
  }

  const layers = [makeLayer(0.012, 9, 1.0), makeLayer(0.09, 1.2, 3.0)]

  return {
    group,
    /** 0 = off, 1 = full power. */
    setPower(value: number) {
      layers.forEach((m) => (m.uniforms.uPower.value = value))
    },
    update(time: number) {
      layers.forEach((m) => (m.uniforms.uTime.value = time))
    },
  }
}
