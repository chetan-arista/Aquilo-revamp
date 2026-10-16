"use client";

import { useRef } from "react";

const GLYPHS = "AQUILO◦·—/\\#*+";

/** Label that scrambles through glyphs on hover before settling (nav micro-interaction). */
export default function ScrambleText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);

  const run = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const dur = 420;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const settled = Math.floor(p * text.length);
      el.textContent = text
        .split("")
        .map((ch, i) => (ch === " " || i < settled ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join("");
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  return (
    <span className={className} onMouseEnter={run} onFocus={run} aria-label={text}>
      <span ref={ref} aria-hidden>{text}</span>
    </span>
  );
}
