"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { useEffect, useEffectEvent, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref, type RefObject } from "react";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";

/** A direction in the panorama. yaw 0 = image centre, +90 = right; pitch +90 = straight up. Degrees. */
export type PanoLook = { yaw: number; pitch: number };
export type PanoView = PanoLook & { fov: number };
export type PanoPick = PanoLook & { u: number; v: number };
/** Something placed in the panorama: drawn as HTML (renderMarker) that follows the view. */
export type PanoMarker = PanoLook & { id: string };
/** Imperative controls (pass a ref): turn the camera smoothly to a direction, read where it looks, or capture
 *  the current frame (with everything placed in the scene) as a JPEG. */
export type PanoHandle = {
  lookAt: (target: PanoLook & { fov?: number }, seconds?: number) => void;
  getView: () => PanoView;
  capture: () => Promise<Blob | null>;
};

const MIN_FOV = 30, MAX_FOV = 100, DEFAULT_FOV = 75, ZOOM_FOV = 40;
const MAX_LAT = THREE.MathUtils.degToRad(85);
const AUTO_SPEED = 0.05; // rad/s
const IDLE_MS = 2500;
/** Radius of the panorama sphere; things placed in the room sit inside it. */
export const RADIUS = 10;

const deg = THREE.MathUtils.radToDeg, rad = THREE.MathUtils.degToRad;
const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** The point at distance r in a direction (yaw / pitch, degrees). */
export function dirOf({ yaw, pitch }: PanoLook, r: number): [number, number, number] {
  const y = rad(yaw), p = rad(pitch);
  return [r * Math.cos(p) * Math.sin(y), r * Math.sin(p), -r * Math.cos(p) * Math.cos(y)];
}

/** The direction (yaw / pitch) under a screen point, for a camera at the centre. */
export function lookAtScreen(camera: THREE.Camera, el: HTMLElement, clientX: number, clientY: number): PanoLook {
  const r = el.getBoundingClientRect();
  const d = new THREE.Vector3(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1, 0.5)
    .unproject(camera)
    .sub(camera.position)
    .normalize();
  return { yaw: deg(Math.atan2(d.x, -d.z)), pitch: deg(Math.asin(d.y)) };
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Crossfades from the current panorama (uA) to the incoming one (uB). In photo mode (uPhoto = 1) the image is a
// normal photo taken looking at yaw 0: each direction is projected into it through a pinhole camera with the
// photo's field of view (uTan = tan of the half angles); outside the photo its edge fades to dark.
const fragmentShader = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uMix;
  uniform float uPhoto;
  uniform vec2 uTan;
  varying vec2 vUv;
  vec2 photoUv(vec2 uv, out float inside) {
    float yaw = (uv.x - 0.5) * 6.2831853, pitch = (uv.y - 0.5) * 3.1415927;
    vec3 d = vec3(cos(pitch) * sin(yaw), sin(pitch), -cos(pitch) * cos(yaw));
    vec2 p = vec2(d.x, d.y) / max(-d.z, 1e-4);
    vec2 q = 0.5 + p / (2.0 * uTan);
    vec2 edge = max(abs(q - 0.5) - 0.5, 0.0);
    inside = d.z < 0.0 ? 1.0 - smoothstep(0.0, 0.06, length(edge)) : 0.0;
    return clamp(q, 0.0, 1.0);
  }
  void main() {
    vec2 uv = vUv;
    float inside = 1.0;
    if (uPhoto > 0.5) uv = photoUv(vUv, inside);
    vec4 c = mix(texture2D(uA, uv), texture2D(uB, uv), uMix);
    gl_FragColor = vec4(c.rgb * mix(0.08, 1.0, inside), 1.0);
    #include <colorspace_fragment>
  }
`;

type SphereProps = {
  src: string;
  autoRotate: boolean;
  resetKey: number;
  pins?: PanoLook[];
  /** Where the view starts for this src (on load, on resetKey and when walking to another panorama). */
  startView?: Partial<PanoView>;
  onView?: (v: PanoView) => void;
  onPick?: (p: PanoPick) => void;
  onStatus?: (s: "loading" | "ready" | "error") => void;
  handle?: Ref<PanoHandle>;
  /** Set for a normal photo (not a 2:1 panorama): its horizontal field of view in degrees. The view then stays
   *  inside the photo. */
  photoFov?: number;
  /** While true the visitor's drag does not turn the view (something in the scene is being dragged). */
  locked?: boolean;
};

/**
 * The inside of an equirectangular (2:1) panorama, plus look controls on the canvas:
 * drag with inertia, wheel / pinch / double-click zoom, arrow keys, auto-rotate after a pause,
 * and a short click that reports the yaw / pitch (and image u / v) under the pointer.
 */
function PanoSphere({ src, autoRotate, resetKey, pins = [], startView, onView, onPick, onStatus, handle, photoFov, locked }: SphereProps) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uA: { value: null as THREE.Texture | null }, uB: { value: null as THREE.Texture | null }, uMix: { value: 0 },
    uPhoto: { value: 0 }, uTan: { value: new THREE.Vector2(1, 1) },
  }), []);
  // lon / lat in radians (lon + = look right), fov in degrees; v* = inertia in rad/s.
  const view = useRef({ lon: 0, lat: 0, fov: DEFAULT_FOV, targetFov: DEFAULT_FOV, vLon: 0, vLat: 0, lastInput: 0 });
  // Photo mode: how far the view may turn and zoom out before leaving the photo (degrees; null = no limit).
  const bounds = useRef<{ h: number; v: number } | null>(null);

  const status = useEffectEvent((s: "loading" | "ready" | "error") => onStatus?.(s));
  const pick = useEffectEvent((p: PanoPick) => onPick?.(p));
  const report = useEffectEvent((v: PanoView) => onView?.(v));
  const isLocked = useEffectEvent(() => !!locked);
  const photo = useEffectEvent(() => photoFov);
  const start = useEffectEvent(() => {
    const b = bounds.current;
    return { yaw: startView?.yaw ?? 0, pitch: startView?.pitch ?? 0, fov: Math.min(startView?.fov ?? DEFAULT_FOV, b ? b.v : MAX_FOV) };
  });

  // Ease lon / lat / fov to a direction, the short way round.
  const turnTo = (target: PanoLook & { fov?: number }, seconds: number) => {
    const v = view.current;
    gsap.killTweensOf(v);
    v.vLon = v.vLat = 0;
    gsap.to(v, {
      lon: v.lon + rad(wrapDeg(target.yaw - deg(v.lon))),
      lat: rad(THREE.MathUtils.clamp(target.pitch, -deg(MAX_LAT), deg(MAX_LAT))),
      targetFov: THREE.MathUtils.clamp(target.fov ?? v.targetFov, MIN_FOV, MAX_FOV),
      duration: seconds, ease: "power3.inOut",
      onUpdate: () => { v.lastInput = performance.now(); },
    });
  };
  useImperativeHandle(handle, () => ({
    lookAt: (target, seconds = 1.1) => turnTo(target, seconds),
    getView: () => ({ yaw: wrapDeg(deg(view.current.lon)), pitch: deg(view.current.lat), fov: view.current.fov }),
    // Render one frame now and read it back before the browser clears the canvas.
    capture: () => {
      gl.render(scene, camera);
      return new Promise((resolve) => gl.domElement.toBlob(resolve, "image/jpeg", 0.92));
    },
  }));

  // Load: decode off the main thread, shrink to the GPU's limit if needed, upload, then crossfade.
  useEffect(() => {
    let cancelled = false;
    status("loading");
    (async () => {
      let bmp = await new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "flipY" }).loadAsync(src);
      const max = gl.capabilities.maxTextureSize;
      if (bmp.width > max || bmp.height > max) {
        const k = max / Math.max(bmp.width, bmp.height);
        const small = await createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * k), resizeHeight: Math.round(bmp.height * k), resizeQuality: "high" });
        bmp.close();
        bmp = small;
      }
      if (cancelled) return bmp.close();
      // A normal photo: its vertical field of view follows from the horizontal one and the photo's shape.
      const fovX = photo();
      if (fovX) {
        const tanH = Math.tan(rad(fovX) / 2), tanV = (tanH * bmp.height) / bmp.width;
        mat.current!.uniforms.uTan.value.set(tanH, tanV);
        bounds.current = { h: fovX, v: deg(2 * Math.atan(tanV)) };
      } else {
        bounds.current = null;
      }
      mat.current!.uniforms.uPhoto.value = fovX ? 1 : 0;
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
      // Walking to another panorama: during the crossfade the camera eases to the new spot's start view with a
      // small push in and back, so it feels like a step forward rather than a cut. The first load just jumps.
      const s = start();
      if (u.uA.value) {
        turnTo({ ...s, fov: s.fov * 0.88 }, 0.75);
        gsap.delayedCall(0.75, () => { view.current.targetFov = s.fov; });
      } else {
        Object.assign(view.current, { lon: rad(s.yaw), lat: rad(s.pitch), fov: s.fov, targetFov: s.fov, vLon: 0, vLat: 0, lastInput: performance.now() });
      }
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
    gsap.killTweensOf(view.current);
    const u = mat.current?.uniforms;
    if (!u) return;
    gsap.killTweensOf(u.uMix);
    disposeTex(u.uA.value);
    disposeTex(u.uB.value);
  }, []);

  // Recentre on the start view when asked (a new src is handled when its image arrives, above).
  useEffect(() => {
    if (!resetKey) return;
    turnTo(start(), 0.8);
  }, [resetKey]);

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
      gsap.killTweensOf(v); // the visitor takes over from any lookAt
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
      if (isLocked()) {
        // Something in the scene is being dragged: no turning, and the press is not a click either.
        down.moved = Infinity;
        last = { x: e.clientX, y: e.clientY, t: performance.now() };
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
      if (down.moved < 5 && performance.now() - down.t < 350 && !isLocked()) {
        const { yaw, pitch } = lookAtScreen(camera, el, e.clientX, e.clientY);
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
    // Photo mode: never zoom out past the photo or turn off its edges.
    const b = bounds.current;
    if (b) {
      const cam0 = state.camera as THREE.PerspectiveCamera;
      v.targetFov = Math.min(v.targetFov, b.v);
      const halfV = (b.v - v.fov) / 2, halfH = (b.h - v.fov * cam0.aspect) / 2;
      v.lat = THREE.MathUtils.clamp(v.lat, -rad(Math.max(halfV, 0)), rad(Math.max(halfV, 0)));
      v.lon = THREE.MathUtils.clamp(v.lon, -rad(Math.max(halfH, 0)), rad(Math.max(halfH, 0)));
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

/** Positions each marker's HTML over its direction every frame; hides markers behind the viewer. */
function MarkerTracker({ markers, elements }: { markers: PanoMarker[]; elements: RefObject<Map<string, HTMLDivElement>> }) {
  const p = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    camera.getWorldDirection(ahead);
    for (const m of markers) {
      const el = elements.current.get(m.id);
      if (!el) continue;
      p.set(...dirOf(m, 1));
      const front = p.dot(ahead) > 0.05;
      p.project(camera);
      const x = (p.x + 1) * 0.5 * size.width, y = (1 - p.y) * 0.5 * size.height;
      const show = front && x > -80 && y > -80 && x < size.width + 80 && y < size.height + 80;
      el.style.visibility = show ? "visible" : "hidden";
      if (show) el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });
  return null;
}

/**
 * A 360 panorama viewer. Markers are HTML (renderMarker), so they can be real buttons with our own design,
 * keyboard focus and labels; the showroom tour (components/altier/ShowroomTour.tsx) builds on it. Pass
 * `handle` for lookAt. See rich/03-showroom-virtual-tour.md.
 */
export default function PanoramaViewer<M extends PanoMarker = PanoMarker>({ className, markers = [], renderMarker, children, ...props }: SphereProps & {
  className?: string;
  markers?: M[];
  renderMarker?: (m: M) => ReactNode;
  /** R3F objects to place in the room (inside the sphere, camera at the centre): the try-on studio's products. */
  children?: ReactNode;
}) {
  const elements = useRef(new Map<string, HTMLDivElement>());
  return (
    // The marker overlay is placed against this box, so it must be positioned; add `relative` only when the
    // caller has not (adding it next to `absolute` would collapse the box and shrink the canvas).
    <div className={/\b(absolute|fixed|relative|sticky)\b/.test(className ?? "") ? className : `relative ${className ?? ""}`} style={{ touchAction: "none" }} data-lenis-prevent data-cursor="Drag">
      <Canvas flat dpr={[1, 2]} camera={{ position: [0, 0, 0], fov: DEFAULT_FOV, near: 0.1, far: 100 }} gl={{ antialias: true }}>
        <PanoSphere {...props} />
        {children}
        {renderMarker && <MarkerTracker markers={markers} elements={elements} />}
      </Canvas>
      {renderMarker && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {markers.map((m) => (
            <div key={m.id} className="pointer-events-auto absolute left-0 top-0" style={{ visibility: "hidden" }}
              ref={(el) => { if (el) elements.current.set(m.id, el); else elements.current.delete(m.id); }}>
              {renderMarker(m)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
