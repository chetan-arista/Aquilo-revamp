import * as THREE from "three";

// ——— Shared by the shower and the AQUILO letters it falls on (1 unit ≈ 27 cm) ———
export const HEAD_Y = 2.15;
export const FLOOR_Y = -1.75;
export const NOZZLE_Y = HEAD_Y - 0.03;
// Slow-motion physics: the water still accelerates under gravity, at roughly a third of real speed.
export const V0 = 0.7;
export const G = 2.0;

/** Deterministic PRNG so layouts are stable across renders. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Instanced unit quads with per-instance attributes. */
export function instanced(count: number, attrs: Record<string, [Float32Array, number]>) {
  const g = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  g.index = base.index;
  g.setAttribute("position", base.getAttribute("position"));
  g.setAttribute("uv", base.getAttribute("uv"));
  for (const [k, [arr, size]] of Object.entries(attrs)) g.setAttribute(k, new THREE.InstancedBufferAttribute(arr, size));
  g.instanceCount = count;
  return g;
}

export const LIGHT = { uKey: { value: new THREE.Color("#fff1dc") }, uFill: { value: new THREE.Color("#9fb4c4") } };

/** Cylindrical billboard: quads stay upright and turn to face the camera. */
export const BILLBOARD_GLSL = /* glsl */ `
  vec3 billboard(vec3 c, vec2 corner, float w, float h){
    vec3 toCam = normalize(cameraPosition - c);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    return c + right * corner.x * w + vec3(0.0, 1.0, 0.0) * corner.y * h;
  }
`;

/** Droplet / streak fragment: a capsule that refracts light: bright rim, glassy core, a highlight. */
export const DROP_FRAG = /* glsl */ `
  uniform vec3 uKey, uFill;
  varying vec2 vUv; varying float vA; varying float vLen; varying float vDepth;
  void main(){
    vec2 q = vec2((vUv.x - 0.5) * 2.0, (vUv.y - 0.5) * 2.0 * vLen);
    float hy = max(vLen - 1.0, 0.0);
    float d = length(vec2(q.x, max(abs(q.y) - hy, 0.0)));
    if (d > 1.0) discard;
    float rim = smoothstep(0.45, 0.95, d);
    float lead = mix(0.45, 1.0, smoothstep(vLen, -vLen, q.y)); // the falling head of a streak is brightest
    float spec = smoothstep(0.35, 0.0, length(q - vec2(-0.3, -hy - 0.25)));
    vec3 col = mix(uFill, uKey, rim) * (0.3 + rim * 0.9) * lead + vec3(1.0) * spec * 0.8;
    float a = (0.18 + rim * 0.62 + spec * 0.4) * smoothstep(1.0, 0.8, d) * vA * vDepth;
    gl_FragColor = vec4(col, a);
  }
`;
