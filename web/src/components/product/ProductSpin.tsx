"use client";

import { useEffect, useRef, useState } from "react";

const usable = (img: HTMLImageElement | undefined): img is HTMLImageElement => !!img?.complete && !!img.naturalWidth;

/** Draws frame a, with frame b cross-faded over it by mix (0..1), so a slow turn has no visible steps. */
function paint(c: HTMLCanvasElement | null, a: HTMLImageElement | undefined, b?: HTMLImageElement, mix = 0) {
  if (!c || !usable(a)) return;
  if (c.width !== a.naturalWidth) { c.width = a.naturalWidth; c.height = a.naturalHeight; }
  const g = c.getContext("2d")!;
  g.globalAlpha = 1;
  g.drawImage(a, 0, 0);
  if (mix > 0.01 && usable(b)) { g.globalAlpha = mix; g.drawImage(b, 0, 0); g.globalAlpha = 1; }
}

/**
 * 360 product spin from an image sequence (feature 1, see rich/01-3d-product-view.md).
 * Hover plays the turn at a calm viewing pace (one turn in `turnSeconds`, easing in and out); drag scrubs it
 * (with a little inertia on release); arrow keys step it. Frames are drawn to a canvas once they are preloaded,
 * neighbouring frames cross-faded, so a slow turn stays smooth and scrubbing never flickers.
 */
export default function ProductSpin({ frames, alt, className, autoplay = "hover", turnSeconds = 6 }: {
  frames: string[];
  alt: string;
  className?: string;
  /** "hover" plays while the pointer is over it; "always" keeps turning; "none" only drags. */
  autoplay?: "hover" | "always" | "none";
  /** Seconds for one full turn while playing (6 s reads as a natural turntable; use 144 frames for 24 fps). */
  turnSeconds?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const images = useRef<HTMLImageElement[]>([]);
  const state = useRef({ frame: 0, playing: autoplay === "always", speed: 0, dragX: null as number | null, velocity: 0, last: 0 });
  const [loaded, setLoaded] = useState(0);

  // Preload every frame; draw the first one as soon as it arrives.
  useEffect(() => {
    let alive = true;
    images.current = frames.map((src, i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { if (!alive) return; setLoaded((n) => n + 1); if (i === 0) paint(canvas.current, img); };
      img.src = src;
      return img;
    });
    return () => { alive = false; };
  }, [frames]);

  // Playback and inertia
  useEffect(() => {
    let raf = 0;
    const s = state.current;
    const tick = (t: number) => {
      const dt = s.last ? Math.min((t - s.last) / 1000, 0.1) : 0;
      s.last = t;
      const n = frames.length;
      // Ease towards the playing speed (or to a stop) instead of jumping.
      s.speed += ((s.playing && s.dragX === null ? n / turnSeconds : 0) - s.speed) * (1 - Math.exp(-dt * 3));
      if (s.dragX === null) {
        if (Math.abs(s.velocity) > 0.5) { s.frame += s.velocity * dt; s.velocity *= Math.exp(-dt * 3); }
        else s.frame += s.speed * dt;
      }
      const at = ((s.frame % n) + n) % n, f = Math.floor(at);
      paint(canvas.current, images.current[f], images.current[(f + 1) % n], at - f);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, turnSeconds]);

  const perPixel = () => frames.length / Math.max(canvas.current?.clientWidth ?? 600, 1); // one full turn across the width
  const ready = loaded >= frames.length;

  return (
    <div
      className={`relative select-none ${className ?? ""}`}
      style={{ touchAction: "pan-y" }}
      data-cursor="Turn"
      tabIndex={0}
      role="img"
      aria-label={`${alt}, 360 degree view. Drag or use the arrow keys to turn.`}
      onPointerEnter={() => { if (autoplay === "hover") state.current.playing = true; }}
      onPointerLeave={() => { if (autoplay === "hover") state.current.playing = false; }}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); state.current.dragX = e.clientX; state.current.velocity = 0; }}
      onPointerMove={(e) => {
        const s = state.current;
        if (s.dragX === null) return;
        const d = (e.clientX - s.dragX) * perPixel();
        s.frame -= d;
        s.velocity = -d * 60;
        s.dragX = e.clientX;
      }}
      onPointerUp={() => { state.current.dragX = null; }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") { state.current.frame = Math.round(state.current.frame) - 1; e.preventDefault(); }
        if (e.key === "ArrowRight") { state.current.frame = Math.round(state.current.frame) + 1; e.preventDefault(); }
      }}
    >
      <canvas ref={canvas} className="block h-full w-full object-contain" />
      {!ready && (
        <span className="pointer-events-none absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.2em] text-current opacity-50">
          {Math.round((loaded / frames.length) * 100)}%
        </span>
      )}
    </div>
  );
}
