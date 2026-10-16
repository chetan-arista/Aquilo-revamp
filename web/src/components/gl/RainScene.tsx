"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

type Progress = RefObject<number>;

const HEAD_Y = 2.15;
const FLOOR_Y = -1.75;
const RADIUS = 1.35;

/** Deterministic PRNG so the rain layout is stable across renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Thousands of instanced rain streaks animated entirely on the GPU; the cursor parts the rain. */
function Rain({ count, progress }: { count: number; progress: Progress }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { viewport, pointer } = useThree();
  const mouse = useRef(new THREE.Vector2(99, 99));

  const geometry = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(0.0065, 1, 1, 1);
    base.translate(0, -0.5, 0);
    g.index = base.index;
    g.setAttribute("position", base.getAttribute("position"));
    g.setAttribute("uv", base.getAttribute("uv"));
    const offs = new Float32Array(count * 3);
    const meta = new Float32Array(count * 3);
    const rand = mulberry32(2010);
    for (let i = 0; i < count; i++) {
      // Nozzle grid under a round head: concentric rings with slight jitter.
      const r = Math.sqrt(rand()) * RADIUS;
      const a = rand() * Math.PI * 2;
      offs[i * 3] = Math.cos(a) * r;
      offs[i * 3 + 1] = rand();
      offs[i * 3 + 2] = Math.sin(a) * r;
      meta[i * 3] = 0.75 + rand() * 0.5; // speed
      meta[i * 3 + 1] = 0.12 + rand() * 0.28; // streak length
      meta[i * 3 + 2] = rand(); // brightness seed
    }
    g.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offs, 3));
    g.setAttribute("aMeta", new THREE.InstancedBufferAttribute(meta, 3));
    g.instanceCount = count;
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(99, 99) },
      uIntensity: { value: 1 },
      uColor: { value: new THREE.Color("#f3e6cf") },
      uTop: { value: HEAD_Y - 0.04 },
      uFloor: { value: FLOOR_Y },
    }),
    [],
  );

  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uTime.value += dt;
    // Cursor in world units on the z=0 plane, eased.
    mouse.current.lerp(new THREE.Vector2((pointer.x * viewport.width) / 2, (pointer.y * viewport.height) / 2), 0.12);
    m.uniforms.uMouse.value.copy(mouse.current);
    m.uniforms.uIntensity.value = 1 + (progress.current ?? 0) * 0.6;
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          attribute vec3 aOffset; attribute vec3 aMeta;
          uniform float uTime, uTop, uFloor, uIntensity; uniform vec2 uMouse;
          varying float vFade; varying vec2 vUv; varying float vSeed;
          void main() {
            float span = uTop - uFloor;
            float fall = fract(aOffset.y - uTime * aMeta.x * 0.55 * uIntensity);
            vec3 p = vec3(aOffset.x, uFloor + fall * span, aOffset.z);
            // Part the rain around the cursor.
            vec2 d = p.xy - uMouse;
            float infl = smoothstep(0.55, 0.0, length(d));
            p.x += sign(d.x) * infl * 0.38;
            p.z += infl * 0.25;
            vec3 pos = p + vec3(position.x, position.y * aMeta.y, 0.0);
            vFade = smoothstep(0.0, 0.08, fall) * smoothstep(1.0, 0.9, fall);
            vUv = uv; vSeed = aMeta.z;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }`}
        fragmentShader={/* glsl */ `
          uniform vec3 uColor; varying float vFade; varying vec2 vUv; varying float vSeed;
          void main() {
            float streak = smoothstep(0.0, 1.0, vUv.y) * (1.0 - abs(vUv.x - 0.5) * 2.0);
            gl_FragColor = vec4(uColor, streak * vFade * (0.18 + vSeed * 0.5));
          }`}
      />
    </mesh>
  );
}

/** Expanding rings where drops land. */
function Ripples() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color("#c8a97e") } }), []);
  useFrame((_, dt) => { if (mat.current) mat.current.uniforms.uTime.value += dt; });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y}>
      <circleGeometry args={[RADIUS * 1.9, 96]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={/* glsl */ `
          uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
          void main() {
            vec2 p = (vUv - 0.5) * 6.0;
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
            float fall = smoothstep(2.9, 0.4, length(p));
            gl_FragColor = vec4(uColor, acc * fall * 0.45);
          }`}
      />
    </mesh>
  );
}

/** Soft light shaft under the shower head. */
function Shaft() {
  return (
    <mesh position-y={(HEAD_Y + FLOOR_Y) / 2}>
      <cylinderGeometry args={[RADIUS * 1.02, RADIUS * 1.5, HEAD_Y - FLOOR_Y, 64, 1, true]} />
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

function Rig({ progress }: { progress: Progress }) {
  useFrame(({ camera, pointer }) => {
    const p = progress.current ?? 0;
    const tx = pointer.x * 0.35;
    const ty = 0.15 + pointer.y * 0.18 - p * 0.6;
    const tz = 6.2 - p * 3.2;
    camera.position.x += (tx - camera.position.x) * 0.05;
    camera.position.y += (ty - camera.position.y) * 0.05;
    camera.position.z += (tz - camera.position.z) * 0.08;
    camera.lookAt(0, 0.1 - p * 0.4, 0);
  });
  return null;
}

export default function RainScene({ progress, active = true }: { progress: Progress; active?: boolean }) {
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.2, 6.2], fov: 38 }}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
    >
      <Environment resolution={128}>
        <Lightformer form="ring" intensity={3} position={[0, 4, 2]} scale={4} />
        <Lightformer intensity={1.2} position={[-4, 1, 3]} scale={[4, 1, 1]} color="#f0d9b5" />
        <Lightformer intensity={0.8} position={[4, -1, 2]} scale={[3, 1, 1]} />
      </Environment>
      <ShowerHead />
      <Shaft />
      <Rain count={mobile ? 1400 : 3200} progress={progress} />
      <Ripples />
      <Rig progress={progress} />
    </Canvas>
  );
}
