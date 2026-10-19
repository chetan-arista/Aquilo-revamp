"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { LOGO_DEPTH, type Cup, type LogoField } from "./logoField";
import { BILLBOARD_GLSL, DROP_FRAG, FLOOR_Y, G, LIGHT, instanced, mulberry32 } from "./waterShared";

type Uniforms = Record<string, THREE.IUniform>;

const STRONG = 1.35; // pointer speed (px per ms) that counts as a real push
const TIP_ANGLE = -2.1; // clockwise, far enough to pour the U empty

function useLetterMaterial() {
  // Soft bone stone, as the wordmark appears on the brand's dark pages; a light clearcoat for the wet sheen.
  return useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#d9d4cb", metalness: 0, roughness: 0.48, clearcoat: 0.55, clearcoatRoughness: 0.2,
  }), []);
}

function extrude(shapes: THREE.Shape[], offset?: THREE.Vector3) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth: LOGO_DEPTH, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.006, bevelSegments: 3, curveSegments: 1 });
  g.translate(-(offset?.x ?? 0), -(offset?.y ?? 0), -LOGO_DEPTH / 2);
  return g;
}

/** A thin moving film over the front faces: water from the tops runs down the letters where it rains. */
function WetFilm({ geometry, u, rainHalfWidth }: { geometry: THREE.BufferGeometry; u: Uniforms; rainHalfWidth: number }) {
  const uniforms = useMemo(() => ({ uTime: u.uTime, uHalf: { value: rainHalfWidth }, ...LIGHT }), [u, rainHalfWidth]);
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        polygonOffset
        polygonOffsetFactor={-2}
        vertexShader={`varying vec3 vN; varying vec3 vW; void main(){ vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`}
        fragmentShader={/* glsl */ `
          uniform float uTime, uHalf; uniform vec3 uKey; varying vec3 vN; varying vec3 vW;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 w = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), w.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), w.x), w.y); }
          void main(){
            if (vN.z < 0.7) discard; // front faces only
            float wet = smoothstep(uHalf + 0.1, uHalf - 0.25, abs(vW.x));
            float riv = smoothstep(0.7, 0.95, noise(vec2(vW.x * 70.0, vW.y * 3.0 + uTime * 1.8)));
            float sheen = noise(vec2(vW.x * 9.0, vW.y * 6.0 + uTime * 0.9));
            gl_FragColor = vec4(uKey, riv * 0.06 * wet * (0.6 + sheen * 0.4));
          }`}
      />
    </mesh>
  );
}

/** The fixed letters, A Q I L O. */
export function Letters({ field, u, rainHalfWidth }: { field: LogoField; u: Uniforms; rainHalfWidth: number }) {
  const mat = useLetterMaterial();
  const geos = useMemo(() => field.letters.filter((l) => l.char !== "U").map((l) => extrude(l.shapes)), [field]);
  return (
    <group>
      {geos.map((g, i) => (
        <group key={i}>
          <mesh geometry={g} material={mat} />
          <WetFilm geometry={g} u={u} rainHalfWidth={rainHalfWidth} />
        </group>
      ))}
    </group>
  );
}

/** Interior floor heights of the U as a 1 pixel high float texture (cup space: relative to the pivot). */
export function useCupFloorTexture(cup: Cup) {
  return useMemo(() => {
    const data = new Float32Array(cup.floor.length).map((_, i) => cup.floor[i] - cup.pivot.y);
    const t = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat, THREE.FloatType);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, [cup]);
}

type CupSim = { v: number; theta: number; omega: number; target: number; holdUntil: number; t: number; cool: number; spillL: number; spillR: number };

/**
 * The U as a vessel. Rain that falls inside it pools, the level rises with real volume, and once full
 * it overflows over both arms. A gentle touch rocks it and slops a little water out; a strong push
 * tips it clockwise, pours it empty and lets it spring back upright.
 */
export function UCup({ field, floorTex, driver, u, inflow }: { field: LogoField; floorTex: THREE.DataTexture; driver: RefObject<THREE.ShaderMaterial | null>; u: Uniforms; inflow: number }) {
  const { cup } = field;
  const mat = useLetterMaterial();
  const geo = useMemo(() => extrude(field.letters.find((l) => l.char === "U")!.shapes, cup.pivot), [field, cup]);
  const group = useRef<THREE.Group>(null);
  const water = useRef<THREE.ShaderMaterial>(null);
  const waterMesh = useRef<THREE.Mesh>(null);
  const spill = useRef<THREE.ShaderMaterial>(null);
  const sim = useRef<CupSim>({ v: 0, theta: 0, omega: 0, target: 0, holdUntil: 0, t: 0, cool: 0, spillL: 0, spillR: 0 });
  const pointer = useRef({ x: 0, y: 0, t: 0, v: 0 });

  // Pointer speed, measured continuously so a fast swipe is already "fast" when it reaches the U.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pointer.current;
      const dt = e.timeStamp - p.t;
      if (dt > 0 && dt < 200) p.v = p.v * 0.55 + (Math.hypot(e.clientX - p.x, e.clientY - p.y) / dt) * 0.45;
      Object.assign(p, { x: e.clientX, y: e.clientY, t: e.timeStamp });
    };
    window.addEventListener("pointermove", onMove);
    return () => { window.removeEventListener("pointermove", onMove); delete document.documentElement.dataset.cursorLabel; };
  }, []);

  const push = (strength: number) => {
    const s = sim.current;
    if (s.t < s.cool) return;
    s.cool = s.t + 0.22;
    if (strength >= STRONG) {
      s.target = TIP_ANGLE;
      s.holdUntil = s.t + 1.15;
      s.omega -= 2.5;
    } else {
      s.omega -= 0.9 + strength * 3.2; // a nudge: it rocks, and the tilt alone slops some water out
    }
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); push(pointer.current.v); };
  const onDown = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); push(STRONG + 1); };

  const waterUniforms = useMemo(() => ({
    uTime: u.uTime, ...LIGHT,
    uFloor: { value: floorTex },
    uX0: { value: cup.x0 - cup.pivot.x }, uX1: { value: cup.x1 - cup.pivot.x },
    uY0: { value: cup.floorMin - cup.pivot.y }, uLevel: { value: cup.floorMin - cup.pivot.y },
    uDepth: { value: LOGO_DEPTH * 0.94 },
  }), [u, floorTex, cup]);

  const spillGeo = useMemo(() => {
    const n = 70, a = new Float32Array(n * 2 * 4);
    const rand = mulberry32(31);
    for (let i = 0; i < n * 2; i++) a.set([i < n ? -1 : 1, rand(), rand() * 2 - 1, rand()], i * 4);
    return instanced(n * 2, { aSpill: [a, 4] });
  }, []);
  const spillUniforms = useMemo(() => ({ uTime: u.uTime, ...LIGHT, uL: { value: new THREE.Vector4() }, uR: { value: new THREE.Vector4() } }), [u]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = sim.current;
    const du = driver.current?.uniforms;
    const g = group.current, w = water.current, sp = spill.current;
    if (!du || !g || !w || !sp) return;
    s.t += dt;
    // Test hook for visual QA: window.__ucup = { fill: 1 } fills it, { push: 3 } pushes it (px/ms).
    const hook = (window as { __ucup?: { fill?: number; push?: number } }).__ucup;
    if (hook) {
      if (hook.fill !== undefined) s.v = cup.full * hook.fill;
      if (hook.push !== undefined) { s.cool = 0; push(hook.push); }
      (window as { __ucup?: unknown }).__ucup = undefined;
    }

    // Inflow: only the drops that actually land inside the U (measured by the scene), while it rains.
    s.v += inflow * du.uRain.value * dt;

    // Spring back towards upright (or towards the tipped pose while a strong push lasts).
    if (s.holdUntil && s.t > s.holdUntil) { s.target = 0; s.holdUntil = 0; }
    const acc = 26 * (s.target - s.theta) - 4.4 * s.omega;
    s.omega += acc * dt;
    s.theta += s.omega * dt;

    // Tilt lowers what the U can hold; anything above that pours over the lower arm.
    const capacity = cup.full * Math.pow(THREE.MathUtils.clamp(1 - Math.abs(s.theta) / 0.95, 0, 1), 1.6);
    let pourL = 0, pourR = 0;
    const excess = s.v - capacity;
    if (excess > 0) {
      const out = Math.min(excess, cup.full * 2.6 * dt);
      s.v -= out;
      const rate = THREE.MathUtils.clamp((out / dt / cup.full) * 6, 0, 1);
      if (Math.abs(s.theta) < 0.04) pourL = pourR = Math.max(rate, 0.35);
      else if (s.theta < 0) pourR = Math.max(rate, 0.3);
      else pourL = Math.max(rate, 0.3);
    }
    const k = Math.min(1, dt * 7);
    s.spillL += (pourL - s.spillL) * k;
    s.spillR += (pourR - s.spillR) * k;
    s.v = Math.max(0, s.v);

    const level = cup.levelFor(Math.min(s.v, cup.full));
    const hasWater = s.v > cup.full * 0.004;
    g.rotation.z = s.theta;
    w.uniforms.uLevel.value = level - cup.pivot.y;
    if (waterMesh.current) waterMesh.current.visible = hasWater;
    // The jets above the U land on its water surface instead of its floor.
    (du.uCup.value as THREE.Vector4).set(hasWater ? level : -99, s.theta, 0, 0);

    // Overflow points: the outer top corners of the arms, turned with the U.
    const c = Math.cos(s.theta), sn = Math.sin(s.theta);
    const ry = cup.rim - cup.pivot.y;
    const lx = cup.outerL - cup.pivot.x - 0.01, rx = cup.outerR - cup.pivot.x + 0.01;
    (sp.uniforms.uL.value as THREE.Vector4).set(cup.pivot.x + lx * c - ry * sn, cup.pivot.y + lx * sn + ry * c, 0, s.spillL);
    (sp.uniforms.uR.value as THREE.Vector4).set(cup.pivot.x + rx * c - ry * sn, cup.pivot.y + rx * sn + ry * c, 0, s.spillR);
  });

  return (
    <>
      <group ref={group} position={cup.pivot}>
        <mesh
          geometry={geo}
          material={mat}
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerOver={() => (document.documentElement.dataset.cursorLabel = "Push")}
          onPointerOut={() => delete document.documentElement.dataset.cursorLabel}
        />
        <WetFilm geometry={geo} u={u} rainHalfWidth={9} />
        {/* The water held inside the U */}
        <mesh ref={waterMesh} renderOrder={2} visible={false}>
          <boxGeometry args={[1, 1, 1]} />
          <shaderMaterial
            ref={water}
            uniforms={waterUniforms}
            transparent
            depthWrite={false}
            vertexShader={/* glsl */ `
              uniform float uX0, uX1, uY0, uLevel, uDepth;
              varying vec3 vCup; varying vec3 vN; varying vec3 vV;
              void main(){
                vec3 p = vec3(mix(uX0, uX1, position.x + 0.5), mix(uY0, uLevel, position.y + 0.5), position.z * uDepth);
                vCup = p;
                vN = normalize(normalMatrix * normal);
                vec4 mv = modelViewMatrix * vec4(p, 1.0); vV = normalize(-mv.xyz);
                gl_Position = projectionMatrix * mv;
              }`}
            fragmentShader={/* glsl */ `
              uniform float uTime, uX0, uX1, uY0, uLevel; uniform sampler2D uFloor; uniform vec3 uKey;
              varying vec3 vCup; varying vec3 vN; varying vec3 vV;
              float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
              void main(){
                float f = texture2D(uFloor, vec2((vCup.x - uX0) / (uX1 - uX0), 0.5)).r;
                if (vCup.y < f - 0.002) discard;
                float fres = pow(1.0 - abs(dot(vN, vV)), 2.0);
                float topFace = step(0.5, abs(vN.y));
                // Clear water: almost transparent near the surface, a little deeper and cooler below.
                float depth = clamp((uLevel - vCup.y) / max(uLevel - uY0, 0.01), 0.0, 1.0);
                vec3 deep = vec3(0.32, 0.52, 0.6), shallow = vec3(0.72, 0.86, 0.9);
                vec3 col = mix(shallow, deep, depth);
                // Rain landing on the surface: rings in a loose grid; a shimmer of caustics through the body.
                vec2 g = vCup.xz * 26.0; vec2 cell = floor(g); float h = hash(cell);
                float t = fract(uTime * (1.2 + h) + h);
                float ring = smoothstep(0.06, 0.0, abs(length(fract(g) - 0.5) - t * 0.45)) * (1.0 - t);
                float caustic = pow(0.5 + 0.5 * sin(vCup.x * 60.0 + sin(vCup.y * 40.0 + uTime * 2.0) * 2.0 + uTime), 6.0);
                float meniscus = smoothstep(0.012, 0.0, uLevel - vCup.y) * (1.0 - topFace);
                col = mix(col, uKey, clamp(fres * 0.5 + ring * topFace * 0.7 + meniscus * 0.9 + caustic * 0.12 * (1.0 - topFace), 0.0, 1.0));
                float a = mix(0.16 + depth * 0.22, 0.42, topFace) + fres * 0.18 + meniscus * 0.5 + ring * topFace * 0.3;
                gl_FragColor = vec4(col, clamp(a, 0.0, 0.85));
              }`}
          />
        </mesh>
      </group>

      {/* Overflow: drops leaving the arms' outer corners and falling to the floor */}
      <mesh geometry={spillGeo} frustumCulled={false} renderOrder={4}>
        <shaderMaterial
          ref={spill}
          uniforms={spillUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={/* glsl */ `
            uniform float uTime; uniform vec4 uL, uR;
            attribute vec4 aSpill;
            varying vec2 vUv; varying float vA; varying float vLen; varying float vDepth;
            ${BILLBOARD_GLSL}
            void main(){
              vec4 o = aSpill.x < 0.0 ? uL : uR;
              float life = mix(0.7, 1.1, aSpill.y);
              float t = fract(uTime / life + aSpill.y * 5.0) * life;
              float g = ${G.toFixed(3)};
              float drift = 0.03 + aSpill.w * 0.12 + o.w * 0.18;
              vec3 c = vec3(o.x + aSpill.x * drift * t, o.y - 0.08 * t - 0.5 * g * t * t, aSpill.z * ${(LOGO_DEPTH * 0.45).toFixed(3)});
              float speed = 0.08 + g * t;
              float size = 0.0065 * (1.0 + o.w * 1.6); // a real pour is a thicker stream
              float len = size * 2.0 + speed * 0.05;
              vec3 p = billboard(c, position.xy, size * 2.0, len);
              vA = step(fract(aSpill.y * 9.1), o.w) * step(${FLOOR_Y.toFixed(3)}, c.y) * 0.95;
              vLen = len / (size * 2.0);
              vec4 mv = viewMatrix * vec4(p, 1.0);
              vDepth = 1.0;
              vUv = uv;
              gl_Position = projectionMatrix * mv;
            }`}
          fragmentShader={DROP_FRAG}
        />
      </mesh>
    </>
  );
}

/** Water that lands on a letter does not vanish: it runs to the edge and drips off both faces. */
export function Drips({ drips, u }: { drips: Float32Array; u: Uniforms }) {
  const geo = useMemo(() => instanced(drips.length / 4, { aDrip: [drips, 4] }), [drips]);
  const uniforms = useMemo(() => ({ ...u, ...LIGHT }), [u]);
  return (
    <mesh geometry={geo} frustumCulled={false} renderOrder={4}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          uniform float uTime, uRain, uMist;
          attribute vec4 aDrip; // x, top y, face side, seed
          varying vec2 vUv; varying float vA; varying float vLen; varying float vDepth;
          ${BILLBOARD_GLSL}
          void main(){
            float period = mix(0.5, 1.25, fract(aDrip.w * 3.7));
            float t = fract(uTime / period + aDrip.w * 11.0) * period;
            float g = ${G.toFixed(3)};
            vec3 c = vec3(aDrip.x + (fract(aDrip.w * 17.0) - 0.5) * 0.02, aDrip.y - 0.004 - 0.5 * g * t * t, aDrip.z * ${(LOGO_DEPTH / 2 + 0.006).toFixed(4)});
            float speed = g * t;
            float size = 0.0055;
            float len = size * 2.0 + speed * 0.035;
            vec3 p = billboard(c, position.xy, size * 2.0, len);
            vA = step(${FLOOR_Y.toFixed(3)}, c.y) * uRain * (1.0 - uMist) * 0.85;
            vLen = len / (size * 2.0);
            vec4 mv = viewMatrix * vec4(p, 1.0);
            vDepth = smoothstep(26.0, 5.0, -mv.z);
            vUv = uv;
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={DROP_FRAG}
      />
    </mesh>
  );
}
