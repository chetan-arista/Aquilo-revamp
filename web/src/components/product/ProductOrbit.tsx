"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

/**
 * Interactive 3D product (feature 1, see rich/01-3d-product-view.md): a GLB in a soft studio light,
 * orbit with inertia, slow auto rotate, contact shadow. Models with vertex colours (from
 * ai/product3d/paint.mjs) get a material that shows them.
 *
 * CAD models (ai/product3d/cad) take a `finish` (chrome, brushed nickel, matte black).
 *
 * `azimuth` (a ref, degrees) turns the model to a fixed angle instead of orbit controls; the turntable
 * renderer (ai/product3d/render-spin.mjs) uses it to film a 360 spin from the model.
 */
const FINISHES = {
  chrome: { color: "#f3f5f8", metalness: 1, roughness: 0.035, clearcoat: 0 },
  "brushed nickel": { color: "#c9c3b8", metalness: 1, roughness: 0.32, clearcoat: 0.3 },
  "matte black": { color: "#141414", metalness: 0, roughness: 0.45, clearcoat: 0.15 },
  "gloss white": { color: "#f2f1ec", metalness: 0, roughness: 0.2, clearcoat: 1 },
  "matte stone": { color: "#b9b2a6", metalness: 0, roughness: 0.6, clearcoat: 0 },
  rubber: { color: "#4f5254", metalness: 0, roughness: 0.75, clearcoat: 0 },
} as const;
export type Finish = keyof typeof FINISHES;

/** The finish a CAD part was labelled with (ai/product3d/cad/build_cad.py), from its own or a parent's name. */
function partFinish(o: THREE.Object3D | null): Finish | "main" | null {
  for (; o; o = o.parent) {
    const name = o.name.split(/[._]/)[0];
    if (name === "main") return "main";
    if (name in FINISHES) return name as Finish;
  }
  return null;
}

function Model({ url, azimuth, finish, hanging }: { url: string; azimuth?: RefObject<number | null>; finish?: Finish; hanging?: boolean }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const root = scene.clone(true);
    // CAD models carry no surface look of their own: "main" parts (and unlabelled ones) take the product's
    // finish, parts labelled with a fixed finish (nozzles = "rubber") keep it.
    const looks = new Map<Finish, THREE.Material>();
    const look = (f: Finish) => looks.get(f) ?? looks.set(f, new THREE.MeshPhysicalMaterial({ ...FINISHES[f] })).get(f)!;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const part = partFinish(m);
      if (finish) { m.material = look(part && part !== "main" ? part : finish); return; }
      // Colours painted from photos already contain the studio's light and highlights: show them as they
      // were photographed (unlit), or the scene would light them a second time and grey the whites.
      if (m.geometry.getAttribute("color")) {
        m.material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
      }
    });
    // Stand it on the floor, centred; a hanging piece (shower head) is centred in space instead.
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, hanging ? -c.y : -box.min.y, -c.z);
    const g = new THREE.Group();
    g.add(root);
    return g;
  }, [scene, finish, hanging]);
  const turn = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = azimuth?.current;
    if (turn.current && a !== null && a !== undefined) turn.current.rotation.y = THREE.MathUtils.degToRad(-a);
  });
  return <group ref={turn}><primitive object={model} /></group>;
}

const DOME_VERTEX = /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// Bright above and below, a dark band round the horizon (the crisp dark lines along a chrome body), as in the
// Blender studio (ai/product3d/cad/render_blender.py). Linear values, neutral grey: a warm studio tints chrome.
const DOME_FRAGMENT = /* glsl */ `varying vec3 vDir;
  void main() {
    float y = vDir.y;
    // A narrow band: wide enough for crisp dark lines, narrow enough that chrome stays bright from any angle.
    float v = y < -0.2 ? mix(0.55, 0.8, smoothstep(-1.0, -0.2, y))
            : y < -0.02 ? mix(0.8, 0.08, smoothstep(-0.2, -0.03, y))
            : y < 0.1 ? mix(0.08, 0.32, smoothstep(-0.02, 0.1, y))
            : mix(0.32, 1.0, smoothstep(0.1, 0.55, y));
    gl_FragColor = vec4(vec3(v), 1.0);
  }`;

/**
 * The studio a metal or glazed finish reflects (the same recipe as the Blender renders): the gradient dome, long
 * white soft boxes either side and above, and black flags in front. Chrome is only what it reflects.
 */
function ProductStudio() {
  return (
    <>
      <mesh scale={40}>
        <sphereGeometry args={[1, 48, 24]} />
        <shaderMaterial side={THREE.BackSide} vertexShader={DOME_VERTEX} fragmentShader={DOME_FRAGMENT} depthWrite={false} />
      </mesh>
      <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[6, 4, 1]} />
      <Lightformer form="rect" intensity={4} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[1.2, 7, 1]} />
      <Lightformer form="rect" intensity={3} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[1, 7, 1]} />
      <Lightformer form="rect" intensity={2} position={[0, 1.5, -6]} scale={[1, 6, 1]} />
      <Lightformer form="rect" color="#000000" intensity={1} position={[-1.4, 0.8, 6]} rotation-y={Math.PI} scale={[0.7, 8, 1]} />
      <Lightformer form="rect" color="#000000" intensity={1} position={[1.6, 0.8, 6]} rotation-y={Math.PI} scale={[0.45, 8, 1]} />
    </>
  );
}

function Ready({ onReady }: { onReady?: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => { requestAnimationFrame(() => onReady?.()); }, [gl, onReady]);
  return null;
}

export default function ProductOrbit({ url, className, background = "#f4f1ec", autoRotate = true, azimuth, onReady, finish, mount = "floor" }: {
  url: string;
  /** "floor": stands on a surface (orbit stops at the horizon, contact shadow). "hanging": wall or ceiling pieces
   *  such as shower heads, whose face is underneath: orbit all the way round, no floor, start slightly below. */
  mount?: "floor" | "hanging";
  /** Material for models without their own look (CAD); chrome reflects the studio's soft boxes. */
  finish?: Finish;
  className?: string;
  background?: string;
  autoRotate?: boolean;
  azimuth?: RefObject<number | null>;
  onReady?: () => void;
}) {
  const capture = azimuth !== undefined;
  const hanging = mount === "hanging";
  return (
    <div className={className} data-cursor="Turn" data-lenis-prevent style={{ touchAction: "none" }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: hanging ? [0, -0.7, 2.5] : [0, 0.6, 2.6], fov: 32 }}
        gl={{ antialias: true, preserveDrawingBuffer: capture }}
        onCreated={({ gl, scene }) => {
          scene.background = new THREE.Color(background);
          // Khronos PBR Neutral: made for product colour accuracy; the default ACES greys whites and dulls chrome.
          gl.toneMapping = THREE.NeutralToneMapping;
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.6} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2.2} position={[0, 4, 2]} rotation-x={Math.PI / 2} scale={[4, 4, 1]} />
          <Lightformer form="rect" intensity={1.4} position={[-4, 1, 1]} rotation-y={Math.PI / 2} scale={[2, 5, 1]} />
          <Lightformer form="rect" intensity={1} position={[4, 1, -1]} rotation-y={-Math.PI / 2} scale={[2, 5, 1]} />
          {finish && <ProductStudio />}
        </Environment>
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.25}>
            <Model url={url} azimuth={azimuth} finish={finish} hanging={hanging} />
          </Bounds>
          {!hanging && <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={4} blur={2.4} far={1.5} resolution={512} frames={capture ? Infinity : 1} />}
          <Ready onReady={onReady} />
        </Suspense>
        {!capture && <OrbitControls makeDefault enableDamping dampingFactor={0.08} autoRotate={autoRotate} autoRotateSpeed={1.2} minPolarAngle={hanging ? 0.15 : 0.3} maxPolarAngle={hanging ? Math.PI - 0.15 : Math.PI / 2} enablePan={false} />}
      </Canvas>
    </div>
  );
}
