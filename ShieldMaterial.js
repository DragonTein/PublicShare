// shield-material.js
// Three.js ShaderMaterial port of Babylon.js "Shield" node material.
// Usage: import { createShieldMaterial } from './shield-material.js';
// Then update material.uniforms.uTime.value each frame.

import * as THREE from 'three';

export const shieldVertexShader = /* glsl */`
  // --- Morph target declarations (attributes + uniform array) ---
  #include <morphtarget_pars_vertex>

  varying vec3 vLocalPos;

  void main() {
    // 1. Start from the base position
    #include <begin_vertex>          // sets: vec3 transformed = vec3( position );

    // 2. Apply morph target offsets to `transformed`
    #include <morphtarget_vertex>    // modifies `transformed` using morphTargetInfluences

    // 3. Use the morphed position for the local position varying
    vLocalPos = transformed;

    // 4. Use the morphed position for the final projection
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

export const shieldFragmentShader = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform vec4 uColorA;
  uniform vec4 uColorB;
  varying vec3 vLocalPos;

  // Babylon.WorleyNoise3DBlock
  vec3 hash33(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123);
  }

  float worleyNoise3D(vec3 p, float jitter) {
    vec3 id = floor(p);
    vec3 f = fract(p);
    float minDist = 10000.0;
    for (int x = -1; x <= 1; ++x) {
      for (int y = -1; y <= 1; ++y) {
        for (int z = -1; z <= 1; ++z) {
          vec3 offset = vec3(float(x), float(y), float(z));
          vec3 h = hash33(id + offset);
          vec3 cellPoint = offset + h * jitter;
          minDist = min(minDist, length(cellPoint - f));
        }
      }
    }
    return minDist;
  }

  void main() {
    // p = vec2(position.z, position.y) * 4.0
    vec2 p = vec2(vLocalPos.z, vLocalPos.y) * 4.0;

    // time * 0.2
    float tz = uTime * 0.2;

    // seed = vec3(p.x * 0.5, p.y * 0.5, time * 0.2)
    vec2 seedXY = p * 0.5;
    vec3 seed = vec3(seedXY.x, seedXY.y, tz);

    // Worley noise
    float worley = worleyNoise3D(seed, 0.0);
    vec2 noiseTerm = worley * vec2(0.2);

    // ring mask
    float ringDist = distance(vec2(0.0), p);
    float ring = clamp(ringDist * 2.0, 0.0, 1.0);
    ring = pow(ring, 3.0);

    // combine
    vec2 combined = p + ring * noiseTerm;
    float dist = distance(vec2(0.0), combined);

    // animated wave
    float wave = sin(uTime * -6.0 + dist);
    float gradient = wave * wave;

    // final color
    vec4 color = mix(uColorA, uColorB, gradient);
    gl_FragColor = color;
  }
`;

/**
 * Creates a new Three.js ShaderMaterial replicating the Babylon Shield material.
 * @param {Object} [options]
 * @param {THREE.Vector4} [options.colorA] - left color of the lerp
 * @param {THREE.Vector4} [options.colorB] - right color of the lerp
 * @returns {THREE.ShaderMaterial}
 */
export function createShieldMaterial(options = {}) {
  const colorA = options.colorA ?? new THREE.Vector4(0.0, 0.5254901960784314, 1.0, 0.0);
  const colorB = options.colorB ?? new THREE.Vector4(0.0, 0.7647058823529411, 1.0, 1.0);

  return new THREE.ShaderMaterial({
    vertexShader: shieldVertexShader,
    fragmentShader: shieldFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: colorA },
      uColorB: { value: colorB },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    // IMPORTANT: tell Three.js this material supports morph targets
    morphTargets: true,
  });
}
