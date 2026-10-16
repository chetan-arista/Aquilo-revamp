"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/gsap";

/**
 * Silent ambient loop (AI motion from real product photography). Plays only while on screen,
 * falls back to its poster for reduced-motion visitors.
 */
export default function LoopVideo({ name, className, label }: { name: string; className?: string; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (prefersReducedMotion()) { v.removeAttribute("autoplay"); v.pause(); return; }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { rootMargin: "200px" });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const base = `/media/video/${name}`;
  return (
    <video
      ref={ref}
      className={className}
      poster={`${base}.jpg`}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <source src={`${base}.webm`} type="video/webm" />
      <source src={`${base}.mp4`} type="video/mp4" />
    </video>
  );
}
