"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { dirOf, lookAtScreen, type PanoLook } from "@/components/gl/PanoramaViewer";
import { FINISHES, partFinish, type Finish } from "@/components/product/ProductOrbit";

/**
 * What the try-on studio places in a room (feature 2, rich/02-room-panorama-try-on.md). The camera sits at the
 * panorama's centre, so a quad facing the centre is tangent to the room: a catalogue cut-out on it has the
 * right perspective. A 3D model (feature 1's CAD route) sits at the same spot and can turn and change finish.
 */
export type Placed = PanoLook & { id: string; size: number; flip?: boolean } & (
  | { kind: "cutout"; slug: string; image: string; aspect: number }
  | { kind: "model"; url: string; name: string; finish: Finish; finishes: Finish[]; rotation: number }
);

/** Distance from the camera (the panorama sphere has radius 10): close enough to sit in front of the walls. */
const DISTANCE = 6;

export type Drag = { id: string; dYaw: number; dPitch: number } | null;

/** Pressing an item: select it and start dragging, keeping the grab point under the pointer. */
function usePress(item: Placed, dragRef: RefObject<Drag>, onPress: (id: string) => void) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  return (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const at = lookAtScreen(camera, gl.domElement, e.clientX, e.clientY);
    dragRef.current = { id: item.id, dYaw: item.yaw - at.yaw, dPitch: item.pitch - at.pitch };
    onPress(item.id);
  };
}

/** A soft round shadow, made once. */
function useShadowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(0,0,0,0.55)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Frame({ w, h, visible }: { w: number; h: number; visible: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const x = w / 2 + 0.04, y = h / 2 + 0.04;
    g.setAttribute("position", new THREE.Float32BufferAttribute([-x, -y, 0, x, -y, 0, x, y, 0, -x, y, 0], 3));
    return g;
  }, [w, h]);
  return (
    <lineLoop geometry={geometry} visible={visible} renderOrder={999}>
      <lineBasicMaterial color="#ede8df" transparent opacity={0.85} depthTest={false} />
    </lineLoop>
  );
}

export function PlacedCutout({ item, order, selected, dragRef, onPress }: { item: Extract<Placed, { kind: "cutout" }>; order: number; selected: boolean; dragRef: RefObject<Drag>; onPress: (id: string) => void }) {
  const texture = useTexture(item.image, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
  const shadow = useShadowTexture();
  const press = usePress(item, dragRef, onPress);
  const h = item.size, w = item.size * item.aspect;
  const position = useMemo(() => new THREE.Vector3(...dirOf(item, DISTANCE)), [item]);
  return (
    <group position={position} onUpdate={(g) => g.lookAt(0, 0, 0)}>
      {/* Contact shadow at the foot of the piece. */}
      <mesh position={[0, -h * 0.47, -0.01]} scale={[w * 1.5, h * 0.12, 1]} renderOrder={order * 3}>
        <planeGeometry />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh scale={[item.flip ? -w : w, h, 1]} onPointerDown={press} renderOrder={order * 3 + 1}>
        <planeGeometry />
        <meshBasicMaterial map={texture} transparent alphaTest={0.02} side={THREE.DoubleSide} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <Frame w={w} h={h} visible={selected} />
    </group>
  );
}

export function PlacedModel({ item, selected, dragRef, onPress }: { item: Extract<Placed, { kind: "model" }>; selected: boolean; dragRef: RefObject<Drag>; onPress: (id: string) => void }) {
  const { scene } = useGLTF(item.url);
  const press = usePress(item, dragRef, onPress);
  // Normalised: 1 unit tall, standing on its own base, centred on its axis; then scaled to the item's size.
  const { model, height } = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    root.position.set(-c.x, -c.y, -c.z);
    const g = new THREE.Group();
    g.add(root);
    return { model: g, height: s.y || 1 };
  }, [scene]);
  // The chosen finish on every "main" part; fixed parts (nozzles) keep theirs.
  useEffect(() => {
    const looks = new Map<Finish, THREE.Material>();
    const look = (f: Finish) => looks.get(f) ?? looks.set(f, new THREE.MeshPhysicalMaterial({ ...FINISHES[f] })).get(f)!;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const part = partFinish(m);
      m.material = look(part && part !== "main" ? part : item.finish);
    });
    return () => looks.forEach((m) => m.dispose());
  }, [model, item.finish]);
  const shadow = useShadowTexture();
  const position = useMemo(() => new THREE.Vector3(...dirOf(item, DISTANCE * 0.9)), [item]);
  const k = item.size / height;
  return (
    <group position={position} onUpdate={(g) => g.lookAt(0, 0, 0)}>
      <mesh position={[0, -item.size * 0.48, -0.3]} scale={[item.size * 1.3, item.size * 0.14, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group rotation-y={THREE.MathUtils.degToRad(item.rotation)} scale={k} onPointerDown={press}>
        <primitive object={model} />
      </group>
      <Frame w={item.size * 1.1} h={item.size * 1.05} visible={selected} />
    </group>
  );
}

/** Moves the dragged item with the pointer (window events, so it keeps up off the item too). */
export function DragController({ dragRef, onMove, onEnd }: { dragRef: RefObject<Drag>; onMove: (id: string, at: PanoLook) => void; onEnd: () => void }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const at = lookAtScreen(camera, gl.domElement, e.clientX, e.clientY);
      onMove(d.id, { yaw: at.yaw + d.dYaw, pitch: THREE.MathUtils.clamp(at.pitch + d.dPitch, -80, 80) });
    };
    const up = () => { if (dragRef.current) { dragRef.current = null; onEnd(); } };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [camera, gl, dragRef, onMove, onEnd]);
  return null;
}
