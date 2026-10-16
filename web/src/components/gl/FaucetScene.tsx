"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PresentationControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";

export type Finish = { color: string; roughness: number; metalness: number };

const SPOUT_END = new THREE.Vector3(0, 2.36, -0.04);

function useFinishMaterial(finish: Finish) {
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: finish.color, metalness: finish.metalness, roughness: finish.roughness, clearcoat: 0.6, clearcoatRoughness: 0.12 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    const c = new THREE.Color(finish.color);
    gsap.to(mat.color, { r: c.r, g: c.g, b: c.b, duration: 1.1, ease: "power3.inOut" });
    gsap.to(mat, { roughness: finish.roughness, metalness: finish.metalness, duration: 1.1, ease: "power3.inOut" });
  }, [finish, mat]);
  return mat;
}

const MODEL_HEIGHT = 3.2;
const MODEL_BODY_Z = -1.52;

/**
 * A real product reconstruction (GLB). Every mesh is re-skinned with the live finish material, so the
 * finish switcher works on any model. The model is auto-oriented from its own geometry: the spout (the
 * part of the top that reaches furthest from the body) is turned towards the basin, the body is parked
 * behind the rim, and the measured outlet position is reported so the water falls from the real spout.
 */
function ProductModel({ url, finish, onSpout }: { url: string; finish: Finish; onSpout: (v: THREE.Vector3) => void }) {
  const mat = useFinishMaterial(finish);
  const { scene } = useGLTF(url);
  const { model, spout } = useMemo(() => {
    const inner = scene.clone(true);
    inner.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = mat; });
    const points = (obj: THREE.Object3D) => {
      obj.updateMatrixWorld(true);
      const out: THREE.Vector3[] = [];
      obj.traverse((o) => {
        const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
        const pos = g?.getAttribute("position");
        if (!pos) return;
        const step = Math.max(1, Math.floor(pos.count / 4000));
        for (let k = 0; k < pos.count; k += step) out.push(new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld));
      });
      return out;
    };
    // Scale to height, then measure body centre (lower third) and spout direction (top band).
    let pts = points(inner);
    const box = new THREE.Box3().setFromPoints(pts);
    const s = MODEL_HEIGHT / Math.max(box.max.y - box.min.y, 1e-3);
    const h = box.max.y - box.min.y;
    const low = pts.filter((p) => p.y < box.min.y + 0.35 * h);
    const body = low.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(Math.max(low.length, 1));
    const top = pts.filter((p) => p.y > box.min.y + 0.8 * h);
    const tip = top.reduce((best, p) => (Math.hypot(p.x - body.x, p.z - body.z) > Math.hypot(best.x - body.x, best.z - body.z) ? p : best), top[0] ?? body);
    const yaw = Math.atan2(tip.z - body.z, tip.x - body.x) - Math.PI / 2;
    inner.scale.setScalar(s);
    inner.rotation.y = yaw;
    // Re-measure in the final orientation and place: body behind the basin rim, base on the counter.
    pts = points(inner);
    const b2 = new THREE.Box3().setFromPoints(pts);
    const low2 = pts.filter((p) => p.y < b2.min.y + 0.35 * MODEL_HEIGHT);
    const body2 = low2.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(Math.max(low2.length, 1));
    const offset = new THREE.Vector3(-body2.x, -b2.min.y, MODEL_BODY_Z - body2.z);
    const top2 = pts.filter((p) => p.y > b2.min.y + 0.75 * MODEL_HEIGHT);
    const tip2 = top2.reduce((best, p) => (p.z > best.z ? p : best), top2[0] ?? body2);
    // Outlet = underside of the spout near its tip.
    const near = top2.filter((p) => Math.hypot(p.x - tip2.x, p.z - tip2.z) < 0.12);
    const outletY = Math.min(...near.map((p) => p.y), tip2.y);
    const group = new THREE.Group();
    inner.position.copy(offset);
    group.add(inner);
    return { model: group, spout: new THREE.Vector3(tip2.x + offset.x, outletY + offset.y, tip2.z + offset.z - 0.06) };
  }, [scene, mat]);
  useEffect(() => onSpout(spout), [spout, onSpout]);
  return <primitive object={model} />;
}

/** Procedural fallback: a tall vessel mixer in the spirit of the Morandi line — pure cylinders, one arcing spout. */
function Mixer({ finish, flowing }: { finish: Finish; flowing: boolean }) {
  const mat = useFinishMaterial(finish);
  const lever = useRef<THREE.Group>(null);

  const spout = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.42, -1.25),
      new THREE.Vector3(0, 2.66, -1.0),
      new THREE.Vector3(0, 2.7, -0.5),
      new THREE.Vector3(0, 2.6, -0.15),
      new THREE.Vector3(0, 2.42, -0.04),
    ]);
    return new THREE.TubeGeometry(curve, 96, 0.072, 32, false);
  }, []);

  useEffect(() => {
    if (lever.current) gsap.to(lever.current.rotation, { x: flowing ? -0.55 : 0, duration: 1, ease: "expo.out" });
  }, [flowing]);

  return (
    <group position={[0, 0, 0]}>
      {/* flange + body */}
      <mesh material={mat} position={[0, 0.03, -1.25]} castShadow>
        <cylinderGeometry args={[0.24, 0.26, 0.06, 64]} />
      </mesh>
      <mesh material={mat} position={[0, 1.25, -1.25]} castShadow>
        <cylinderGeometry args={[0.15, 0.16, 2.44, 64]} />
      </mesh>
      <mesh material={mat} position={[0, 2.47, -1.25]}>
        <sphereGeometry args={[0.15, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={mat} geometry={spout} />
      {/* aerator */}
      <mesh material={mat} position={[0, 2.4, -0.04]}>
        <cylinderGeometry args={[0.08, 0.078, 0.06, 48]} />
      </mesh>
      <mesh position={[0, 2.368, -0.04]}>
        <cylinderGeometry args={[0.06, 0.06, 0.01, 32]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </mesh>
      {/* side lever */}
      <group ref={lever} position={[0.16, 1.95, -1.25]}>
        <mesh material={mat} rotation-z={Math.PI / 2} position-x={0.06}>
          <cylinderGeometry args={[0.075, 0.075, 0.14, 48]} />
        </mesh>
        <mesh material={mat} position={[0.13, 0.22, 0.02]} rotation-x={0.08}>
          <capsuleGeometry args={[0.022, 0.42, 8, 24]} />
        </mesh>
      </group>
    </group>
  );
}

/** Lathed ceramic vessel basin sitting on a stone counter. */
function Basin() {
  const geo = useMemo(() => {
    const pts = [
      [0, 0], [0.5, 0], [0.7, 0.04], [0.92, 0.22], [1.06, 0.55], [1.12, 0.78], [1.12, 0.82],
      [1.07, 0.82], [1.05, 0.74], [0.96, 0.48], [0.8, 0.26], [0.55, 0.14], [0, 0.12],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 128);
  }, []);
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f4f1ec" roughness={0.18} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
    </group>
  );
}

// ——— Water: one small simulation drives the stream, the filling basin, splashes and the overflow ———

/** Inner wall of the vessel basin as [height, radius] (matches the lathe profile in <Basin/>). */
const BASIN_INNER: [number, number][] = [[0.12, 0], [0.14, 0.55], [0.26, 0.8], [0.48, 0.96], [0.74, 1.05], [0.82, 1.07]];
const EMPTY_Y = 0.125;
const FULL_Y = 0.805;
const RIM_R = 1.12;

function innerRadius(y: number) {
  for (let i = 1; i < BASIN_INNER.length; i++) {
    const [y0, r0] = BASIN_INNER[i - 1], [y1, r1] = BASIN_INNER[i];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return BASIN_INNER[BASIN_INNER.length - 1][1];
}

// The level is a volume fraction: a steady tap raises the surface quickly in the narrow foot and slowly near the rim.
const VOL_STEPS = 64;
const VOL_DY = (FULL_Y - EMPTY_Y) / VOL_STEPS;
const VOL_TABLE = (() => {
  const t = [0];
  for (let i = 1; i <= VOL_STEPS; i++) {
    const r = innerRadius(EMPTY_Y + (i - 0.5) * VOL_DY);
    t.push(t[i - 1] + r * r * VOL_DY);
  }
  return t.map((v) => v / t[VOL_STEPS]);
})();

function levelToY(level: number) {
  let i = 1;
  while (i < VOL_STEPS && VOL_TABLE[i] < level) i++;
  const f = (level - VOL_TABLE[i - 1]) / Math.max(VOL_TABLE[i] - VOL_TABLE[i - 1], 1e-6);
  return EMPTY_Y + (i - 1 + THREE.MathUtils.clamp(f, 0, 1)) * VOL_DY;
}

type Sim = {
  front: number; // how far the water has travelled down from the spout (0..1.15 of the stream length)
  cut: number; // after closing: how far the falling tail has dropped (0..1.15)
  hit: number; // 0..1 — water is landing
  level: number; // 0..1 — basin fill
  over: number; // 0..1 — overflowing
  puddle: number; // 0..1 — spill spreading on the counter
  surfaceY: number;
  surfaceR: number;
};

const FILL_RATE = 1 / 12; // seconds to fill with the tap open
const DRAIN_OPEN = 1 / 90; // the waste drains slowly even while filling
const DRAIN_CLOSED = 1 / 14;

const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }`;

function useWaterSim(flowing: boolean, onStatus?: (text: string) => void) {
  const sim = useRef<Sim>({ front: 0, cut: 0, hit: 0, level: 0, over: 0, puddle: 0, surfaceY: EMPTY_Y, surfaceR: 0 });
  const label = useRef("");

  // Opening sends the water front down under gravity; closing detaches the tail from the spout.
  useEffect(() => {
    const s = sim.current;
    gsap.killTweensOf(s);
    if (flowing) {
      s.cut = 0;
      if (s.front < 1) gsap.fromTo(s, { front: 0 }, { front: 1.15, duration: 0.6, ease: "power2.in" });
    } else if (s.front > 0) {
      gsap.to(s, { cut: 1.15, duration: 0.5, ease: "power2.in", onComplete: () => { s.front = 0; s.cut = 0; } });
    }
  }, [flowing]);

  useFrame((_, rawDt) => {
    const s = sim.current;
    const dt = Math.min(rawDt, 0.05);
    const landing = s.front >= 1 && s.cut < 0.95 ? 1 : 0;
    s.hit += (landing - s.hit) * Math.min(1, dt * 8);
    s.level = THREE.MathUtils.clamp(s.level + dt * (landing ? FILL_RATE - DRAIN_OPEN : -DRAIN_CLOSED), 0, 1);
    const overTarget = s.level >= 0.999 && landing ? 1 : 0;
    s.over += (overTarget - s.over) * Math.min(1, dt * (overTarget ? 1.2 : 1.8));
    s.puddle = THREE.MathUtils.clamp(s.puddle + dt * (s.over > 0.3 ? 0.07 * s.over : -0.012), 0, 1);
    s.surfaceY = levelToY(s.level);
    s.surfaceR = innerRadius(s.surfaceY);

    if (onStatus) {
      const pct = Math.round(s.level * 100);
      const text = s.over > 0.5 ? "Basin full — overflowing" : landing ? `Filling · ${pct}%` : s.level > 0.02 ? `Draining · ${pct}%` : "";
      if (text !== label.current) { label.current = text; onStatus(text); }
    }
  });
  return sim;
}

/** Falling stream: a unit cylinder hung from the spout and stretched to the current water surface. */
function Stream({ sim, spout }: { sim: RefObject<Sim>; spout: THREE.Vector3 }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.04, 0.03, 1, 28, 64, true);
    g.translate(0, -0.5, 0); // top at the spout, extends down by scale.y
    return g;
  }, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uLen: { value: 2 }, uFront: { value: 0 }, uCut: { value: 0 } }), []);

  useFrame((_, dt) => {
    const s = sim.current, m = mesh.current, u = mat.current?.uniforms;
    if (!s || !m || !u) return;
    const len = Math.max(0.05, spout.y - s.surfaceY);
    m.scale.y = len;
    m.visible = s.front > 0.001;
    u.uTime.value += dt;
    u.uLen.value = len;
    u.uFront.value = s.front;
    u.uCut.value = s.cut;
  });

  return (
    <mesh ref={mesh} geometry={geo} position={[spout.x, spout.y, spout.z]} renderOrder={3}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={/* glsl */ `
          uniform float uTime, uLen; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main(){
            vUv = uv;
            vec3 p = position;
            // The column narrows as it accelerates, wavers near the surface and flares where it lands.
            float fall = 1.0 - uv.y;
            float flare = smoothstep(0.14, 0.0, uv.y * uLen);
            p.xz *= (1.0 - fall * 0.18) * (1.0 + sin(uv.y * uLen * 14.0 + uTime * 22.0) * 0.07 * fall) * (1.0 + flare * 0.9);
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(p, 1.0); vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          uniform float uTime, uLen, uFront, uCut; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main(){
            float y = vUv.y; // 1 = spout, 0 = surface
            float vis = smoothstep(1.0 - uFront, 1.0 - uFront + 0.05, y) * (1.0 - smoothstep(1.0 - uCut - 0.05, 1.0 - uCut, y));
            float fres = pow(1.0 - abs(dot(vN, vV)), 1.8);
            float streak = 0.5 + 0.5 * sin(vUv.x * 70.0 + sin(y * uLen * 4.0 + uTime * 2.0) * 2.5);
            float run = 0.5 + 0.5 * sin(y * uLen * 26.0 + uTime * 30.0);
            vec3 deep = vec3(0.52, 0.72, 0.87);
            vec3 hi = vec3(0.94, 0.98, 1.0);
            vec3 col = mix(deep, hi, clamp(fres * 0.85 + streak * run * 0.25, 0.0, 1.0));
            float a = (0.4 + fres * 0.5 + streak * run * 0.1) * vis;
            gl_FragColor = vec4(col, a);
          }`}
      />
    </mesh>
  );
}

/** Water surface inside the basin: rises and widens with the level, rings and foam at the impact point. */
function Surface({ sim, spout }: { sim: RefObject<Sim>; spout: THREE.Vector3 }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uLevel: { value: 0 }, uHit: { value: 0 }, uOver: { value: 0 }, uCenter: { value: new THREE.Vector2() },
  }), []);

  useFrame((_, dt) => {
    const s = sim.current, m = mesh.current, u = mat.current?.uniforms;
    if (!s || !m || !u) return;
    m.position.y = s.surfaceY;
    m.scale.setScalar(Math.max(s.surfaceR, 0.001));
    m.visible = s.level > 0.004;
    u.uTime.value += dt;
    u.uLevel.value = s.level;
    u.uHit.value = s.hit;
    u.uOver.value = s.over;
    // Circle lies in x/-z after its -90° tilt; uv covers the unit disc, scaled by the surface radius.
    u.uCenter.value.set(spout.x / (2 * s.surfaceR + 1e-3), -spout.z / (2 * s.surfaceR + 1e-3));
  });

  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} renderOrder={2}>
      <circleGeometry args={[1, 128]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={/* glsl */ `
          uniform float uTime, uLevel, uHit, uOver; uniform vec2 uCenter; varying vec2 vUv;
          ${NOISE_GLSL}
          void main(){
            vec2 p = vUv - 0.5;
            float edge = length(p) * 2.0;
            vec2 c = p - uCenter;
            float r = length(c) * 2.0;
            // Ripples run out from the impact, wobble, and die away with distance.
            float rr = r + (noise(c * 7.0 + uTime * 0.35) - 0.5) * 0.08;
            float rings = pow(0.5 + 0.5 * sin(rr * 30.0 - uTime * 6.5), 4.0) * exp(-r * 2.4) * (0.2 + 0.8 * uHit);
            float churn = noise(c * 46.0 + vec2(uTime * 3.1, -uTime * 2.3));
            float foam = smoothstep(0.16, 0.0, r) * (0.45 + 0.55 * churn) * uHit;
            // Faint caustic web from light through the moving surface.
            vec2 q = p * 9.0;
            float caustic = smoothstep(0.1, 0.0, abs(noise(q + uTime * 0.45) - noise(q * 1.07 - uTime * 0.38)));
            float swell = noise(p * 4.0 + uTime * 0.25);
            // Soft outward flow at the rim while overflowing.
            float ang = atan(p.y, p.x);
            float spill = smoothstep(0.8, 1.0, edge) * noise(vec2(ang * 9.0, edge * 10.0 - uTime * 2.4)) * uOver;
            vec3 shallow = vec3(0.8, 0.9, 0.95);
            vec3 deep = vec3(0.56, 0.74, 0.87);
            vec3 col = mix(shallow, deep, uLevel * 0.8) + (swell - 0.5) * 0.05;
            col += vec3(0.06) * smoothstep(0.25, 0.95, 1.0 - abs(p.y * 2.0 + 0.35)); // soft sky reflection band
            col = mix(col, vec3(1.0), clamp(rings * 0.45 + foam * 0.85 + spill * 0.4 + caustic * 0.14, 0.0, 1.0));
            float meniscus = smoothstep(1.0, 0.95, edge);
            float a = (0.36 + uLevel * 0.26 + rings * 0.2 + foam * 0.4) * meniscus * smoothstep(0.0, 0.05, uLevel);
            gl_FragColor = vec4(col, a);
          }`}
      />
    </mesh>
  );
}

const SPLASH_COUNT = 180;

/** Droplets bouncing up where the stream lands — off the ceramic when empty, off the water once filling. */
function Splash({ sim, spout }: { sim: RefObject<Sim>; spout: THREE.Vector3 }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(SPLASH_COUNT * 3);
    let k = 2010;
    const rand = () => (k = (k * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPLASH_COUNT * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    return g;
  }, []);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uHit: { value: 0 }, uPx: { value: 30 }, uWet: { value: 0 }, uOrigin: { value: new THREE.Vector3() },
  }), []);

  useFrame(({ size, gl }, dt) => {
    const s = sim.current, u = mat.current?.uniforms;
    if (!s || !u) return;
    u.uTime.value += dt;
    u.uHit.value = s.hit;
    u.uWet.value = Math.min(1, s.level * 4);
    u.uOrigin.value.set(spout.x, s.surfaceY + 0.005, spout.z);
    // ≈ world size → pixels for the 30° fov camera.
    u.uPx.value = size.height * gl.getPixelRatio() * 1.87 * 0.022;
  });

  return (
    <points geometry={geo} frustumCulled={false} renderOrder={4}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={/* glsl */ `
          attribute vec3 aSeed;
          uniform float uTime, uHit, uPx, uWet; uniform vec3 uOrigin;
          varying float vA;
          void main(){
            float life = 0.26 + aSeed.z * 0.3;
            float t = mod(uTime + aSeed.z * 13.7 + aSeed.x * 3.1, life);
            float ph = t / life;
            float ang = aSeed.x * 6.2832;
            // Off ceramic: low, wide skips. Off water: a taller crown of droplets that rise and fall back.
            float hs = mix(1.1, 0.42, uWet) * (0.35 + fract(aSeed.y * 7.31));
            float vs = mix(0.9, 1.5, uWet) * (0.45 + aSeed.y);
            vec3 p = uOrigin + vec3(cos(ang) * hs * t, vs * t - 7.5 * t * t, sin(ang) * hs * t);
            vA = uHit * (1.0 - ph * ph) * step(uOrigin.y - 0.002, p.y);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uPx * (0.9 + aSeed.y * 1.5) * (1.0 - ph * 0.4) / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          varying float vA;
          void main(){
            // A droplet refracts: darker blue rim, bright core and a small offset glint.
            vec2 pc = gl_PointCoord - 0.5;
            float d = length(pc);
            float a = smoothstep(0.5, 0.36, d) * vA;
            vec3 col = mix(vec3(0.36, 0.56, 0.74), vec3(0.86, 0.94, 1.0), smoothstep(0.42, 0.12, d));
            col = mix(col, vec3(1.0), smoothstep(0.14, 0.0, length(pc - vec2(-0.12, -0.12))));
            gl_FragColor = vec4(col, a * 0.95);
          }`}
      />
    </points>
  );
}

/** One splash crown: a thin water wall that bursts up around the impact, opens outward and collapses. */
function CrownRing({ sim, spout, offset }: { sim: RefObject<Sim>; spout: THREE.Vector3; offset: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(1, 1, 1, 56, 8, true);
    g.translate(0, 0.5, 0); // base at the surface, grows upward
    return g;
  }, []);
  const uniforms = useMemo(() => ({ uTime: { value: offset }, uAmp: { value: 0 } }), [offset]);

  useFrame((_, dt) => {
    const s = sim.current, m = mesh.current, u = mat.current?.uniforms;
    if (!s || !m || !u) return;
    u.uTime.value += dt;
    // Only on water: a dry ceramic bottom gives droplets, not a crown.
    u.uAmp.value = s.hit * THREE.MathUtils.smoothstep(s.level, 0.02, 0.12) * (1 - s.cut);
    m.position.set(spout.x, s.surfaceY, spout.z);
    m.visible = u.uAmp.value > 0.01;
  });

  return (
    <mesh ref={mesh} geometry={geo} renderOrder={4} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        vertexShader={/* glsl */ `
          uniform float uTime, uAmp; varying vec2 vUv; varying float vPh; varying vec3 vN; varying vec3 vV;
          const float PERIOD = 0.3;
          void main(){
            vUv = uv;
            float ph = fract(uTime / PERIOD);
            float cycle = floor(uTime / PERIOD);
            float ang = uv.x * 6.2832;
            float jag = 0.7 + 0.3 * sin(ang * 9.0 + cycle * 2.7) * sin(ang * 4.0 - cycle * 1.3);
            float h = 0.16 * uAmp * sin(3.1416 * ph) * jag;
            float r = (0.05 + 0.15 * sqrt(ph)) * (1.0 + position.y * 0.35 * ph);
            vec3 p = vec3(position.x * r, position.y * h, position.z * r);
            vPh = ph;
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(p, 1.0); vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          uniform float uAmp; varying vec2 vUv; varying float vPh; varying vec3 vN; varying vec3 vV;
          void main(){
            float fres = pow(1.0 - abs(dot(vN, vV)), 1.5);
            float rim = smoothstep(0.55, 1.0, vUv.y);
            vec3 col = mix(vec3(0.6, 0.78, 0.9), vec3(1.0), clamp(fres * 0.7 + rim * 0.5, 0.0, 1.0));
            float a = (0.22 + fres * 0.45 + rim * 0.25) * (1.0 - vPh) * uAmp * smoothstep(1.0, 0.85, vUv.y);
            gl_FragColor = vec4(col, a);
          }`}
      />
    </mesh>
  );
}

/** Overflow: water swelling over the rim and running down the outside of the bowl in uneven rivulets. */
function Overflow({ sim }: { sim: RefObject<Sim> }) {
  const group = useRef<THREE.Group>(null);
  const sheet = useRef<THREE.ShaderMaterial>(null);
  const lip = useRef<THREE.ShaderMaterial>(null);
  // A film just outside the basin's outer wall (same lathe profile, offset outward, wrapping over the lip).
  const film = useMemo(() => {
    const pts = [[0.52, 0.004], [0.712, 0.044], [0.932, 0.222], [1.072, 0.552], [1.132, 0.78], [1.134, 0.822], [1.1, 0.834], [1.068, 0.828]];
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 160);
  }, []);
  const sheetUniforms = useMemo(() => ({ uTime: { value: 0 }, uOver: { value: 0 } }), []);
  const lipUniforms = useMemo(() => ({ uTime: { value: 0 }, uOver: { value: 0 } }), []);

  useFrame((_, dt) => {
    const s = sim.current;
    if (!s || !group.current) return;
    for (const m of [sheet.current, lip.current]) {
      if (!m) continue;
      m.uniforms.uTime.value += dt;
      m.uniforms.uOver.value = s.over;
    }
    group.current.visible = s.over > 0.005;
  });

  return (
    <group ref={group}>
      <mesh geometry={film} renderOrder={3}>
        <shaderMaterial
          ref={sheet}
          uniforms={sheetUniforms}
          transparent
          depthWrite={false}
          vertexShader={`varying vec2 vUv; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vY = position.y; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`}
          fragmentShader={/* glsl */ `
            uniform float uTime, uOver; varying vec2 vUv; varying float vY; varying vec3 vN; varying vec3 vV;
            ${NOISE_GLSL}
            void main(){
              // Rivulets meander as they run down; the lip is fully wet.
              float warp = (noise(vec2(vUv.x * 7.0, vY * 2.5)) - 0.5) * 1.6;
              float riv = noise(vec2(vUv.x * 30.0 + warp, vY * 0.9 + uTime * 0.05));
              float mask = max(smoothstep(0.45, 0.72, riv), smoothstep(0.74, 0.8, vY));
              float run = 0.5 + 0.5 * sin(vY * 30.0 + uTime * 18.0 + riv * 6.0);
              float fres = pow(1.0 - abs(dot(vN, vV)), 1.4);
              // The wet front creeps down from the rim as the overflow builds.
              float front = 0.84 - uOver * 1.0;
              float reach = smoothstep(front - 0.06, front, vY);
              float a = (0.06 + mask * (0.16 + 0.2 * run + 0.28 * fres)) * uOver * reach;
              vec3 col = mix(vec3(0.58, 0.76, 0.89), vec3(1.0), clamp(0.3 * run * mask + 0.45 * fres, 0.0, 1.0));
              gl_FragColor = vec4(col, a);
            }`}
        />
      </mesh>
      <mesh position-y={0.824} rotation-x={Math.PI / 2} renderOrder={3}>
        <torusGeometry args={[RIM_R - 0.022, 0.026, 12, 160]} />
        <shaderMaterial
          ref={lip}
          uniforms={lipUniforms}
          transparent
          depthWrite={false}
          vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
          fragmentShader={/* glsl */ `
            uniform float uTime, uOver; varying vec2 vUv;
            void main(){
              float glint = pow(0.5 + 0.5 * sin(vUv.x * 18.0 + uTime * 1.6 + sin(vUv.x * 7.0 - uTime) * 1.5), 3.0) * 0.6;
              gl_FragColor = vec4(mix(vec3(0.6, 0.78, 0.91), vec3(0.95, 0.98, 1.0), glint), (0.38 + glint * 0.25) * uOver);
            }`}
        />
      </mesh>
    </group>
  );
}

/** Spill spreading across the counter around the basin, with ripples where the overflow lands. */
function Puddle({ sim }: { sim: RefObject<Sim> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPuddle: { value: 0 }, uOver: { value: 0 } }), []);
  useFrame((_, dt) => {
    const s = sim.current, u = mat.current?.uniforms;
    if (!s || !mesh.current || !u) return;
    u.uTime.value += dt;
    u.uPuddle.value = s.puddle;
    u.uOver.value = s.over;
    mesh.current.visible = s.puddle > 0.002;
  });
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} position-y={0.008} renderOrder={1}>
      <circleGeometry args={[3.2, 160]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={/* glsl */ `
          uniform float uTime, uPuddle, uOver; varying vec2 vUv;
          const float FOOT = 0.55;
          void main(){
            vec2 p = (vUv - 0.5) * 6.4;
            float d = length(p);
            float ang = atan(p.y, p.x);
            // Spreads out from the foot of the bowl, where the water running down its sides lands.
            float R = mix(0.5, 3.0, uPuddle) * (1.0 + 0.1 * sin(ang * 3.0 + 1.3) + 0.06 * sin(ang * 7.0 + 0.4) + 0.035 * sin(ang * 13.0 + 2.1));
            float inside = smoothstep(R, R - 0.05, d);
            float drip = pow(0.5 + 0.5 * sin((d - FOOT) * 40.0 - uTime * 6.0), 6.0) * smoothstep(0.7, 0.0, d - FOOT) * uOver;
            float rimLight = smoothstep(R - 0.12, R - 0.02, d) * inside;
            vec3 col = mix(vec3(0.66, 0.8, 0.9), vec3(1.0), clamp(drip * 0.6 + rimLight * 0.5, 0.0, 1.0));
            gl_FragColor = vec4(col, inside * (0.24 + drip * 0.3 + rimLight * 0.25) * smoothstep(0.0, 0.06, uPuddle));
          }`}
      />
    </mesh>
  );
}

function Water({ flowing, spout, onStatus }: { flowing: boolean; spout: THREE.Vector3; onStatus?: (text: string) => void }) {
  const sim = useWaterSim(flowing, onStatus);
  return (
    <>
      <Stream sim={sim} spout={spout} />
      <Surface sim={sim} spout={spout} />
      <Splash sim={sim} spout={spout} />
      <CrownRing sim={sim} spout={spout} offset={0} />
      <CrownRing sim={sim} spout={spout} offset={0.17} />
      <Overflow sim={sim} />
      <Puddle sim={sim} />
    </>
  );
}

function Counter() {
  return (
    <mesh position={[0, -0.13, 0.6]} receiveShadow>
      <boxGeometry args={[16, 0.26, 7]} />
      <meshStandardMaterial color="#c9ccce" roughness={0.8} />
    </mesh>
  );
}

function Rig({ progress }: { progress: RefObject<number> }) {
  useFrame(({ camera, pointer, size }) => {
    const narrow = size.width < 768;
    const p = progress.current ?? 0;
    const tx = (narrow ? 0 : -1.1) + pointer.x * 0.3;
    const ty = (narrow ? 3.6 : 3.5) + pointer.y * 0.2 + p * 1.2;
    const tz = (narrow ? 15.5 : 10.2) - p * 2;
    camera.position.x += (tx - camera.position.x) * 0.05;
    camera.position.y += (ty - camera.position.y) * 0.05;
    camera.position.z += (tz - camera.position.z) * 0.05;
    camera.lookAt(narrow ? 0 : -2.3, (narrow ? -1.1 : 0.85) + p * 0.3, -0.5);
  });
  return null;
}

export default function FaucetScene({ finish, flowing, progress, active = true, modelUrl, onStatus }: {
  finish: Finish;
  /** Receives a live status line ("Filling · 40%", "Basin full — overflowing") whenever it changes. */
  onStatus?: (text: string) => void;
  /** Optional GLB of the real product; the procedural Morandi-style mixer is used until one is supplied. */
  modelUrl?: string | null;
  flowing: boolean;
  progress: RefObject<number>;
  active?: boolean;
}) {
  const [spout, setSpout] = useState(SPOUT_END);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.6]}
      shadows={false}
      camera={{ position: [-1.1, 3.5, 10.2], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} color="#fff4e6" />
      {/* Poly Haven "Studio Small 08" (CC0) — a real softbox studio for believable metal, plus strips for crisp chrome bands */}
      <Suspense fallback={null}>
      <Environment files="/hdri/studio_small_08_1k.hdr" resolution={256} environmentIntensity={1.1}>
        <Lightformer form="rect" intensity={2.6} position={[-2.2, 1.5, 6]} scale={[0.6, 6, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[1.6, 1.5, 6]} scale={[0.35, 6, 1]} color="#fff6ea" />
        <Lightformer form="rect" intensity={2} position={[0, 5, 1]} scale={[6, 2, 1]} rotation-x={Math.PI / 2} />
      </Environment>
      </Suspense>

      <PresentationControls global={false} snap rotation={[0, -0.35, 0]} polar={[-0.08, 0.2]} azimuth={[-0.9, 0.9]}>
        <group position={[0, 0, 0]}>
          {modelUrl ? (
            <Suspense fallback={null}>
              <ProductModel url={modelUrl} finish={finish} onSpout={setSpout} />
            </Suspense>
          ) : (
            <Mixer finish={finish} flowing={flowing} />
          )}
          <Basin />
          <Water flowing={flowing} spout={spout} onStatus={onStatus} />
        </group>
      </PresentationControls>
      <Counter />
      <ContactShadows position={[0, 0.005, -0.4]} opacity={0.45} scale={8} blur={2.6} far={3} resolution={512} color="#2c3238" frames={1} />
      <Rig progress={progress} />
    </Canvas>
  );
}
