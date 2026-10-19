"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { buildLogoField, colOf, LOGO_DEPTH, LOGO_W, type LogoField } from "./logoField";
import { Drips, Letters, UCup, useCupFloorTexture } from "./WaterLogo";
import { BILLBOARD_GLSL, DROP_FRAG, FLOOR_Y, G, HEAD_Y, LIGHT, NOZZLE_Y, V0, instanced, mulberry32 } from "./waterShared";

/**
 * The landing page: a round ceiling shower over the AQUILO wordmark. The letters stand in the rain as
 * a real obstacle: drops land on their tops, splash, run down their faces and drip; the U holds the
 * water that falls into it until it overflows, and tips when pushed.
 */

const RADIUS = 1.85; // rain head radius, wide enough to rain on Q, U, I and L
const Z_SPREAD = 0.22; // the column is shallow front to back, so the letters catch nearly all of it

type Drop = { x: number; z: number; seed: number; hit: number; inCup: number };

function useDrops(count: number, field: LogoField) {
  return useMemo(() => {
    const rand = mulberry32(2010);
    const out: Drop[] = [];
    const { cup, top } = field;
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(rand()) * RADIUS, a = rand() * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r * (Z_SPREAD / RADIUS);
      let hit = FLOOR_Y, inCup = 0;
      if (Math.abs(z) < LOGO_DEPTH / 2) {
        const c = colOf(x);
        if (x > cup.x0 && x < cup.x1) { hit = cup.floor[THREE.MathUtils.clamp(c - cup.firstCol, 0, cup.floor.length - 1)]; inCup = 1; }
        else if (c >= 0 && c < top.length && !Number.isNaN(top[c])) hit = top[c];
      }
      out.push({ x, z, seed: rand(), hit, inCup });
    }
    return out;
  }, [count, field]);
}

/** Every drop lands once per fall; the ones that land in the U are the only water it receives. */
function measuredInflow(drops: Drop[], full: number) {
  const fallTime = (d: number) => (-V0 + Math.sqrt(V0 * V0 + 2 * G * d)) / G;
  const landingsPerSecond = drops.filter((d) => d.inCup).reduce((s, d) => s + 1 / fallTime(NOZZLE_Y - d.hit), 0);
  // Each drop carries the same small volume, tuned so a full U takes about 26 seconds of rain.
  const perDrop = full / (26 * Math.max(landingsPerSecond, 1e-3));
  return landingsPerSecond * perDrop;
}

const COMMON = /* glsl */ `
  uniform float uTime; uniform vec4 uCup;
  const float NOZZLE_Y = ${NOZZLE_Y.toFixed(4)};
  const float FLOOR_Y = ${FLOOR_Y.toFixed(4)};
  const float V0 = ${V0.toFixed(3)};
  const float G = ${G.toFixed(3)};
  float hitY(vec2 h){ return h.y > 0.5 ? max(h.x, uCup.x) : h.x; }
  float fallTime(float d){ return (-V0 + sqrt(V0 * V0 + 2.0 * G * d)) / G; }
  ${BILLBOARD_GLSL}
`;

/** Warm streaks falling from the head, accelerating, stopped by whatever lies beneath them. */
function Rain({ drops, u, driver }: { drops: Drop[]; u: Record<string, THREE.IUniform>; driver: RefObject<THREE.ShaderMaterial | null> }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(drops.length * 3), hit = new Float32Array(drops.length * 2), meta = new Float32Array(drops.length * 2);
    const rand = mulberry32(77);
    drops.forEach((d, i) => {
      pos.set([d.x, d.z, d.seed], i * 3);
      hit.set([d.hit, d.inCup], i * 2);
      meta.set([0.0045 + rand() * 0.003, rand()], i * 2);
    });
    return instanced(drops.length, { aPos: [pos, 3], aHit: [hit, 2], aMeta: [meta, 2] });
  }, [drops]);
  const uniforms = useMemo(() => ({ ...u, uColor: { value: new THREE.Color("#f3e6cf") } }), [u]);
  return (
    <mesh geometry={geo} frustumCulled={false} renderOrder={3}>
      <shaderMaterial
        ref={driver}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          ${COMMON}
          uniform float uRain;
          attribute vec3 aPos; attribute vec2 aHit; attribute vec2 aMeta;
          varying float vA; varying vec2 vUv;
          void main(){
            float D = NOZZLE_Y - hitY(aHit);
            float T = fallTime(D);
            float t = fract(uTime / T + aPos.z * 7.0) * T;
            float fall = V0 * t + 0.5 * G * t * t;
            // A soft spray: drops drift a little as they fall, like a fine rain rather than rods.
            vec2 drift = vec2(sin(aPos.z * 61.0), cos(aPos.z * 37.0)) * 0.05 * t * t + vec2(sin(uTime * 0.7 + aPos.z * 20.0), 0.0) * 0.01 * t;
            vec3 c = vec3(aPos.x + drift.x, NOZZLE_Y - fall, aPos.y + drift.y);
            float speed = V0 + G * t;
            float len = 0.025 + speed * 0.06;
            vec3 p = billboard(c + vec3(0.0, len * 0.5, 0.0), position.xy, aMeta.x, len);
            vA = (0.16 + aMeta.y * 0.5) * smoothstep(0.0, 0.12, fall) * (1.0 - smoothstep(D - 0.03, D, fall)) * uRain;
            vUv = uv;
            gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
          }`}
        fragmentShader={/* glsl */ `
          uniform vec3 uColor; varying float vA; varying vec2 vUv;
          void main(){
            float streak = smoothstep(0.0, 1.0, vUv.y) * (1.0 - abs(vUv.x - 0.5) * 2.0);
            gl_FragColor = vec4(uColor, streak * vA);
          }`}
      />
    </mesh>
  );
}

/** Small crowns of spray where drops land: on letter tops, on the water in the U, on the floor. */
function Splashes({ drops, u }: { drops: Drop[]; u: Record<string, THREE.IUniform> }) {
  const geo = useMemo(() => {
    const rand = mulberry32(13);
    const pick = drops.filter((_, i) => i % 3 === 0);
    const pos = new Float32Array(pick.length * 3), hit = new Float32Array(pick.length * 2), sp = new Float32Array(pick.length * 4);
    pick.forEach((d, i) => {
      pos.set([d.x, d.z, d.seed], i * 3);
      hit.set([d.hit, d.inCup], i * 2);
      sp.set([rand(), rand() * Math.PI * 2, 0.3 + rand() * 0.6, 0.0035 + rand() * 0.003], i * 4);
    });
    return instanced(pick.length, { aPos: [pos, 3], aHit: [hit, 2], aSplash: [sp, 4] });
  }, [drops]);
  const uniforms = useMemo(() => ({ ...u, ...LIGHT }), [u]);
  return (
    <mesh geometry={geo} frustumCulled={false} renderOrder={4}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          ${COMMON}
          uniform float uRain;
          attribute vec3 aPos; attribute vec2 aHit; attribute vec4 aSplash;
          varying vec2 vUv; varying float vA; varying float vLen; varying float vDepth;
          void main(){
            float base = hitY(aHit);
            float life = mix(0.35, 0.6, aSplash.x);
            float ph = fract(uTime / life + aSplash.x * 7.0 + aPos.z * 3.0);
            float t = ph * life;
            float g = G * 1.8;
            vec2 dir = vec2(cos(aSplash.y), sin(aSplash.y));
            vec2 xz = aPos.xy + dir * (0.015 + t * mix(0.12, 0.3, aSplash.x));
            float y = base + aSplash.z * t - 0.5 * g * t * t;
            vec3 c = vec3(xz.x, max(y, base), xz.y);
            float speed = abs(aSplash.z - g * t);
            float len = aSplash.w * 2.0 + speed * 0.03;
            vec3 p = billboard(c, position.xy, aSplash.w * 2.0, len);
            vA = (1.0 - ph) * step(base, y) * uRain * 0.85;
            vLen = len / (aSplash.w * 2.0);
            vDepth = 1.0;
            vUv = uv;
            gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
          }`}
        fragmentShader={DROP_FRAG}
      />
    </mesh>
  );
}

/** Expanding rings where water reaches the floor; quieter in the shelter right behind the letters. */
function Ripples({ u }: { u: Record<string, THREE.IUniform> }) {
  const uniforms = useMemo(() => ({ uTime: u.uTime, uColor: { value: new THREE.Color("#c8a97e") } }), [u]);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y}>
      <circleGeometry args={[RADIUS * 1.9, 96]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={/* glsl */ `
          uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main(){
            vec2 p = (vUv - 0.5) * ${(RADIUS * 3.8).toFixed(2)};
            float acc = 0.0;
            for (int i = 0; i < 2; i++) {
              vec2 cell = floor(p * 2.2 + float(i) * 0.5);
              vec2 f = fract(p * 2.2 + float(i) * 0.5) - 0.5;
              float h = hash(cell + float(i) * 7.0);
              float t = fract(uTime * (0.55 + h * 0.5) + h);
              vec2 c = vec2(hash(cell + 1.3), hash(cell + 2.7)) - 0.5;
              float r = length(f - c * 0.5);
              acc += smoothstep(0.03, 0.0, abs(r - t * 0.42)) * (1.0 - t);
            }
            float fall = smoothstep(${(RADIUS * 1.6).toFixed(2)}, 0.4, length(p));
            // p.y here is world -z: the strip behind the front face stays mostly dry.
            float shelter = smoothstep(${(LOGO_W / 2).toFixed(2)}, ${(LOGO_W / 2 - 0.2).toFixed(2)}, abs(p.x)) * smoothstep(${(LOGO_DEPTH / 2 + 0.05).toFixed(2)}, ${(LOGO_DEPTH / 2 - 0.1).toFixed(2)}, abs(p.y));
            gl_FragColor = vec4(uColor, acc * fall * 0.42 * (1.0 - shelter * 0.85));
          }`}
      />
    </mesh>
  );
}

/** Soft light shaft under the shower head. */
function Shaft() {
  return (
    <mesh position-y={(HEAD_Y + FLOOR_Y) / 2}>
      <cylinderGeometry args={[RADIUS * 1.02, RADIUS * 1.45, HEAD_Y - FLOOR_Y, 64, 1, true]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        vertexShader={`varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`}
        fragmentShader={`varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(1.0-abs(dot(vN,vV)), 2.0); float a = (1.0-edge) * smoothstep(0.0,1.0,vUv.y) * 0.05; gl_FragColor = vec4(vec3(1.0,0.93,0.82), a); }`}
      />
    </mesh>
  );
}

function ShowerHead() {
  return (
    <group position-y={HEAD_Y}>
      <mesh>
        <cylinderGeometry args={[RADIUS + 0.06, RADIUS + 0.06, 0.05, 96]} />
        <meshPhysicalMaterial color="#e4e0d8" metalness={1} roughness={0.28} clearcoat={1} envMapIntensity={2.2} />
      </mesh>
      {/* warm light line along the underside rim */}
      <mesh position-y={-0.028} rotation-x={Math.PI / 2}>
        <torusGeometry args={[RADIUS + 0.04, 0.006, 8, 128]} />
        <meshBasicMaterial color="#f3dcb2" toneMapped={false} />
      </mesh>
      <mesh position-y={0.55}>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 24]} />
        <meshPhysicalMaterial color="#d8d6d2" metalness={1} roughness={0.15} />
      </mesh>
    </group>
  );
}

function Rig({ progress }: { progress: RefObject<number> }) {
  useFrame(({ camera, pointer, size }, dt) => {
    const p = progress.current ?? 0;
    const narrow = size.width < 768;
    const e = p * p * (3 - 2 * p);
    const tx = pointer.x * 0.3 * (1 - e * 0.5);
    const ty = 0.15 + pointer.y * 0.15 - e * 0.9;
    // Phones are narrow and the wordmark is wide: step back until the whole word fits.
    const tz = (narrow ? 17.5 : 6.4) - e * (narrow ? 6 : 2.8);
    const k = 1 - Math.pow(0.002, dt);
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;
    camera.position.z += (tz - camera.position.z) * k;
    camera.lookAt(0, (narrow ? -0.6 : 0.1) - e * 0.9, 0);
  });
  return null;
}

/** Tells the loader the first real frame has been drawn. */
function Ready() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => window.dispatchEvent(new Event("aquilo:scene-ready")));
  });
  return null;
}

function World({ mobile, progress }: { mobile: boolean; progress: RefObject<number> }) {
  const field = useMemo(() => buildLogoField(), []);
  const drops = useDrops(mobile ? 1500 : 3000, field);
  const inflow = useMemo(() => measuredInflow(drops, field.cup.full), [drops, field]);
  const floorTex = useCupFloorTexture(field.cup);
  const u = useMemo(() => ({
    uTime: { value: 0 }, uRain: { value: 1 }, uMist: { value: 0 }, uCascade: { value: 0 },
    uCup: { value: new THREE.Vector4(-99, 0, 0, 0) },
  }), []);
  const driver = useRef<THREE.ShaderMaterial>(null);
  // Water that lands on a letter runs down its face (the wet film) and drips off its lowest edge.
  const drips = useMemo(() => {
    const out: number[] = [];
    drops.filter((d) => d.hit > FLOOR_Y + 0.01 && !d.inCup).forEach((d, i) => {
      const b = field.bottom[colOf(d.x)];
      if (i % 5 === 0 && !Number.isNaN(b)) out.push(d.x, b, 1, d.seed);
    });
    return new Float32Array(out);
  }, [drops, field]);
  useFrame((_, dt) => {
    const m = driver.current;
    if (m) m.uniforms.uTime.value += Math.min(dt, 0.05);
  });
  return (
    <>
      <ShowerHead />
      <Shaft />
      <Letters field={field} u={u} rainHalfWidth={RADIUS} />
      <UCup field={field} floorTex={floorTex} driver={driver} u={u} inflow={inflow} />
      <Rain drops={drops} u={u} driver={driver} />
      <Splashes drops={drops} u={u} />
      <Drips drips={drips} u={u} />
      <Ripples u={u} />
      <Rig progress={progress} />
    </>
  );
}

export default function RainLogoScene({ progress, active = true }: { progress: RefObject<number>; active?: boolean }) {
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, mobile ? 1.5 : 1.75]}
      camera={{ position: [0, 0.15, 6.4], fov: 38 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
    >
      <ambientLight intensity={0.35} />
      {/* Front light keeps the face of the wordmark even and calm, as on the original page */}
      <directionalLight position={[0, 1.2, 8]} intensity={1.5} color="#fff4e6" />
      <spotLight position={[0, HEAD_Y + 0.3, 0.4]} angle={0.8} penumbra={0.9} intensity={30} distance={10} decay={1.5} color="#ffe6c4" target-position={[0, FLOOR_Y, 0]} />
      <Environment resolution={128}>
        <Lightformer form="ring" intensity={3} position={[0, 4, 2]} scale={4} />
        <Lightformer intensity={1.2} position={[-4, 1, 3]} scale={[4, 1, 1]} color="#f0d9b5" />
        <Lightformer intensity={0.8} position={[4, -1, 2]} scale={[3, 1, 1]} />
      </Environment>
      <World mobile={mobile} progress={progress} />
      <Ready />
    </Canvas>
  );
}
