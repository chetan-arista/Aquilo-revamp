"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";

/** A direction in the panorama. yaw 0 = image centre, +90 = right; pitch +90 = straight up. Degrees. */
export type PanoLook = { yaw: number; pitch: number };
export type PanoView = PanoLook & { fov: number };
export type PanoPick = PanoLook & { u: number; v: number };

const MIN_FOV = 30, MAX_FOV = 100, DEFAULT_FOV = 75, ZOOM_FOV = 40;
const MAX_LAT = THREE.MathUtils.degToRad(85);
const AUTO_SPEED = 0.05; // rad/s
const IDLE_MS = 2500;
const RADIUS = 10;

const deg = THREE.MathUtils.radToDeg, rad = THREE.MathUtils.degToRad;
const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

function dirOf({ yaw, pitch }: PanoLook, r: number): [number, number, number] {
  const y = rad(yaw), p = rad(pitch);
  return [r * Math.cos(p) * Math.sin(y), r * Math.sin(p), -r * Math.cos(p) * Math.cos(y)];
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Crossfades from the current panorama (uA) to the incoming one (uB).
const fragmentShader = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uMix;
  varying vec2 vUv;
  void main() {
    gl_FragColor = mix(texture2D(uA, vUv), texture2D(uB, vUv), uMix);
    #include <colorspace_fragment>
  }
`;

type SphereProps = {
  src: string;
  autoRotate: boolean;
  resetKey: number;
  pins: PanoLook[];
  onView?: (v: PanoView) => void;
  onPick?: (p: PanoPick) => void;
  onStatus?: (s: "loading" | "ready" | "error") => void;
};

/**
 * The inside of an equirectangular (2:1) panorama, plus look controls on the canvas:
 * drag with inertia, wheel / pinch / double-click zoom, arrow keys, auto-rotate after a pause,
 * and a short click that reports the yaw / pitch (and image u / v) under the pointer.
 */
function PanoSphere({ src, autoRotate, resetKey, pins, onView, onPick, onStatus }: SphereProps) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uA: { value: null as THREE.Texture | null }, uB: { value: null as THREE.Texture | null }, uMix: { value: 0 } }), []);
  // lon / lat in radians (lon + = look right), fov in degrees; v* = inertia in rad/s.
  const view = useRef({ lon: 0, lat: 0, fov: DEFAULT_FOV, targetFov: DEFAULT_FOV, vLon: 0, vLat: 0, lastInput: 0 });

  const status = useEffectEvent((s: "loading" | "ready" | "error") => onStatus?.(s));
  const pick = useEffectEvent((p: PanoPick) => onPick?.(p));
  const report = useEffectEvent((v: PanoView) => onView?.(v));

  // Load: decode off the main thread, shrink to the GPU's limit if needed, upload, then crossfade.
  useEffect(() => {
    let cancelled = false;
    status("loading");
    (async () => {
      let bmp = await new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "flipY" }).loadAsync(src);
      const max = gl.capabilities.maxTextureSize;
      if (bmp.width > max) {
        const small = await createImageBitmap(bmp, { resizeWidth: max, resizeHeight: max / 2, resizeQuality: "high" });
        bmp.close();
        bmp = small;
      }
      if (cancelled) return bmp.close();
      const tex = new THREE.Texture(bmp);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
      tex.needsUpdate = true;
      gl.initTexture(tex);

      const u = mat.current!.uniforms;
      // A fade still running from the previous switch: settle it before starting this one.
      gsap.killTweensOf(u.uMix);
      if (u.uMix.value > 0 && u.uB.value) {
        disposeTex(u.uA.value);
        u.uA.value = u.uB.value;
      }
      u.uB.value = tex;
      u.uMix.value = 0;
      gsap.to(u.uMix, {
        value: 1,
        duration: u.uA.value ? 0.9 : 0.6,
        ease: "power2.inOut",
        onComplete: () => {
          disposeTex(u.uA.value);
          u.uA.value = tex;
          u.uB.value = null;
          u.uMix.value = 0;
        },
      });
      status("ready");
    })().catch(() => !cancelled && status("error"));
    return () => { cancelled = true; };
  }, [src, gl]);

  useEffect(() => () => {
    const u = mat.current?.uniforms;
    if (!u) return;
    gsap.killTweensOf(u.uMix);
    disposeTex(u.uA.value);
    disposeTex(u.uB.value);
  }, []);

  useEffect(() => {
    Object.assign(view.current, { lon: 0, lat: 0, vLon: 0, vLat: 0, targetFov: DEFAULT_FOV, lastInput: performance.now() });
  }, [src, resetKey]);

  // Input
  useEffect(() => {
    const el = gl.domElement;
    const v = view.current;
    const pointers = new Map<number, { x: number; y: number }>();
    let down = { x: 0, y: 0, t: 0, moved: 0 };
    let pinch = { dist: 0, fov: 0 };
    let last = { x: 0, y: 0, t: 0 };
    const perPixel = () => rad(v.fov) / el.clientHeight;
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      v.vLon = v.vLat = 0;
      v.lastInput = performance.now();
      if (pointers.size === 1) {
        down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
        last = { x: e.clientX, y: e.clientY, t: performance.now() };
      } else if (pointers.size === 2) {
        pinch = { dist: spread(), fov: v.targetFov };
        down.moved = Infinity; // a pinch is never a click
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      v.lastInput = performance.now();
      if (pointers.size >= 2) {
        v.targetFov = THREE.MathUtils.clamp((pinch.fov * pinch.dist) / Math.max(spread(), 1), MIN_FOV, MAX_FOV);
        return;
      }
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      const now = performance.now(), dt = Math.max((now - last.t) / 1000, 1 / 240);
      const k = perPixel();
      // Dragging moves the picture with the pointer, so the view turns the opposite way.
      v.lon -= dx * k;
      v.lat = THREE.MathUtils.clamp(v.lat + dy * k, -MAX_LAT, MAX_LAT);
      v.vLon = THREE.MathUtils.lerp(v.vLon, (-dx * k) / dt, 0.4);
      v.vLat = THREE.MathUtils.lerp(v.vLat, (dy * k) / dt, 0.4);
      down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
      last = { x: e.clientX, y: e.clientY, t: now };
    };
    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      if (pointers.size === 1) {
        // Back from a pinch to one finger: carry on dragging from where it is, without a jump.
        const [rest] = pointers.values();
        last = { x: rest.x, y: rest.y, t: performance.now() };
        return;
      }
      if (pointers.size) return;
      if (performance.now() - last.t > 80) v.vLon = v.vLat = 0; // held still before letting go
      if (down.moved < 5 && performance.now() - down.t < 350) {
        const r = el.getBoundingClientRect();
        const d = new THREE.Vector3(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, 0.5)
          .unproject(camera)
          .sub(camera.position)
          .normalize();
        const yaw = deg(Math.atan2(d.x, -d.z)), pitch = deg(Math.asin(d.y));
        pick({ yaw, pitch, u: 0.5 + yaw / 360, v: 0.5 - pitch / 180 });
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      v.targetFov = THREE.MathUtils.clamp(v.targetFov * Math.exp(e.deltaY * 0.0012), MIN_FOV, MAX_FOV);
      v.lastInput = performance.now();
    };
    const onDouble = () => {
      v.targetFov = v.targetFov > (ZOOM_FOV + DEFAULT_FOV) / 2 ? ZOOM_FOV : DEFAULT_FOV;
      v.lastInput = performance.now();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      const step = rad(v.fov / 6);
      if (e.key === "ArrowLeft") v.lon -= step;
      else if (e.key === "ArrowRight") v.lon += step;
      else if (e.key === "ArrowUp") v.lat = Math.min(v.lat + step, MAX_LAT);
      else if (e.key === "ArrowDown") v.lat = Math.max(v.lat - step, -MAX_LAT);
      else if (e.key === "+" || e.key === "=") v.targetFov = Math.max(v.targetFov / 1.2, MIN_FOV);
      else if (e.key === "-") v.targetFov = Math.min(v.targetFov * 1.2, MAX_FOV);
      else return;
      e.preventDefault();
      v.vLon = v.vLat = 0;
      v.lastInput = performance.now();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onDouble);
    window.addEventListener("keydown", onKey);
    const tick = window.setInterval(() => report({ yaw: wrapDeg(deg(v.lon)), pitch: deg(v.lat), fov: v.fov }), 100);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onDouble);
      window.removeEventListener("keydown", onKey);
      window.clearInterval(tick);
    };
  }, [gl, camera]);

  useFrame((state, dt) => {
    const v = view.current;
    const d = Math.min(dt, 0.05);
    const idle = performance.now() - v.lastInput > IDLE_MS;
    if (Math.abs(v.vLon) + Math.abs(v.vLat) > 1e-4) {
      const decay = Math.exp(-d * 4);
      v.lon += v.vLon * d;
      v.lat = THREE.MathUtils.clamp(v.lat + v.vLat * d, -MAX_LAT, MAX_LAT);
      v.vLon *= decay;
      v.vLat *= decay;
    } else if (autoRotate && idle) {
      v.lon += AUTO_SPEED * d;
    }
    v.fov = THREE.MathUtils.damp(v.fov, v.targetFov, 10, d);

    const cam = state.camera as THREE.PerspectiveCamera;
    cam.rotation.set(v.lat, -v.lon, 0, "YXZ");
    if (Math.abs(cam.fov - v.fov) > 1e-3) {
      cam.fov = v.fov;
      cam.updateProjectionMatrix();
    }
  });

  return (
    <>
      {/* Mirrored in x so the image reads correctly from inside; turned so the image centre faces -Z. */}
      <mesh scale={[-1, 1, 1]} rotation-y={-Math.PI / 2}>
        <sphereGeometry args={[RADIUS, 128, 64]} />
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {pins.map((p, i) => (
        <Billboard key={i} position={dirOf(p, RADIUS * 0.9)}>
          <mesh renderOrder={2}>
            <ringGeometry args={[0.09, 0.13, 40]} />
            <meshBasicMaterial color="#c8a97e" depthTest={false} transparent />
          </mesh>
          <mesh renderOrder={2}>
            <circleGeometry args={[0.04, 24]} />
            <meshBasicMaterial color="#ede8df" depthTest={false} transparent />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

function disposeTex(t: THREE.Texture | null) {
  if (!t) return;
  (t.image as ImageBitmap | undefined)?.close?.();
  t.dispose();
}

export default function PanoramaViewer({ className, ...props }: SphereProps & { className?: string }) {
  return (
    <div className={className} style={{ touchAction: "none" }} data-lenis-prevent data-cursor="Drag">
      <Canvas flat dpr={[1, 2]} camera={{ position: [0, 0, 0], fov: DEFAULT_FOV, near: 0.1, far: 100 }} gl={{ antialias: true }}>
        <PanoSphere {...props} />
      </Canvas>
    </div>
  );
}
