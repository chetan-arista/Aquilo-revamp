"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * Site-wide finishing touches:
 * - a fine custom cursor that grows over interactive things and can carry a label
 *   (`data-cursor="View"` on an element, or `<html data-cursor-label>` set by the 3D scene);
 * - magnetic buttons (`data-magnetic`) that lean towards the cursor;
 * - an optional ambient sound of rain, generated in the browser (no audio files), off by default.
 */
export default function LuxuryLayer() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();
  const [sound, setSound] = useState(false);
  const audio = useRef<{ ctx: AudioContext; master: GainNode; timer: number } | null>(null);

  // Cursor
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || prefersReducedMotion()) return;
    const r = ring.current!, d = dot.current!, l = label.current!;
    document.documentElement.classList.add("lux-cursor");
    const rx = gsap.quickTo(r, "x", { duration: 0.55, ease: "expo.out" }), ry = gsap.quickTo(r, "y", { duration: 0.55, ease: "expo.out" });
    const dx = gsap.quickTo(d, "x", { duration: 0.08 }), dy = gsap.quickTo(d, "y", { duration: 0.08 });
    let shown = false;
    const setState = (target: Element | null) => {
      const host = target?.closest<HTMLElement>("[data-cursor]");
      const text = host?.dataset.cursor ?? document.documentElement.dataset.cursorLabel ?? "";
      const interactive = !!target?.closest("a, button, [role=radio], [role=tab], input, select, textarea, label");
      l.textContent = text;
      gsap.to(r, { scale: text ? 2.3 : interactive ? 1.6 : 1, backgroundColor: text ? "rgba(237,232,223,0.92)" : "rgba(237,232,223,0)", duration: 0.45, ease: "expo.out", overwrite: "auto" });
      gsap.to(l, { autoAlpha: text ? 1 : 0, duration: 0.3 });
      gsap.to(d, { scale: text || interactive ? 0 : 1, duration: 0.3 });
    };
    const onMove = (e: PointerEvent) => {
      if (!shown) { gsap.to([r, d], { autoAlpha: 1, duration: 0.4 }); shown = true; }
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
      setState(e.target as Element);
    };
    const onLeave = () => { gsap.to([r, d], { autoAlpha: 0, duration: 0.3 }); shown = false; };
    const labelWatch = new MutationObserver(() => setState(document.elementFromPoint(gsap.getProperty(d, "x") as number, gsap.getProperty(d, "y") as number)));
    labelWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-cursor-label"] });
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.documentElement.classList.remove("lux-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      labelWatch.disconnect();
    };
  }, []);

  // Magnetic buttons, re-bound on every page.
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || prefersReducedMotion()) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
    const offs = els.map((el) => {
      const move = (e: PointerEvent) => {
        const b = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - (b.left + b.width / 2)) * 0.3, y: (e.clientY - (b.top + b.height / 2)) * 0.3, duration: 0.6, ease: "expo.out" });
      };
      const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
    });
    return () => offs.forEach((f) => f());
  }, [pathname]);

  // Ambient rain: filtered noise for the shower, low noise for the room, and the odd drop.
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    if (next && !audio.current) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const data = noise.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1; // pink-ish noise (Paul Kellet's filter)
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
        data[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
      }
      const layer = (freq: number, q: number, gain: number) => {
        const src = ctx.createBufferSource();
        src.buffer = noise; src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain(); g.gain.value = gain;
        src.connect(f).connect(g).connect(master);
        src.start(0, Math.random() * 2);
      };
      layer(2400, 0.5, 0.9); // the shower
      layer(420, 0.7, 0.5); // the room
      const drip = () => {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
        o.frequency.setValueAtTime(1400 + Math.random() * 1400, t);
        o.frequency.exponentialRampToValueAtTime(500, t + 0.12);
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g).connect(master);
        o.start(t); o.stop(t + 0.18);
        audio.current!.timer = window.setTimeout(drip, 350 + Math.random() * 1300);
      };
      audio.current = { ctx, master, timer: 0 };
      drip();
    }
    const a = audio.current;
    if (!a) return;
    if (next) a.ctx.resume();
    a.master.gain.cancelScheduledValues(a.ctx.currentTime);
    a.master.gain.linearRampToValueAtTime(next ? 0.55 : 0, a.ctx.currentTime + 1.2);
  };
  useEffect(() => () => { if (audio.current) { clearTimeout(audio.current.timer); audio.current.ctx.close(); } }, []);

  return (
    <>
      <div ref={ring} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[120] -ml-[18px] -mt-[18px] grid h-9 w-9 place-items-center rounded-full border border-bone/70 opacity-0 mix-blend-difference">
        <span ref={label} className="eyebrow scale-[0.43] whitespace-nowrap text-[11px] text-onyx opacity-0" />
      </div>
      <div ref={dot} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[120] -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-bone opacity-0 mix-blend-difference" />
      <button
        onClick={toggleSound}
        aria-pressed={sound}
        aria-label={sound ? "Turn the sound of rain off" : "Turn the sound of rain on"}
        data-magnetic
        className="eyebrow fixed bottom-[var(--gutter)] right-[var(--gutter)] z-40 hidden items-center gap-3 text-white mix-blend-difference lg:flex"
      >
        <span className="flex h-3 items-end gap-[2px]">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`block w-px bg-current ${sound ? "animate-[eq_1s_ease-in-out_infinite]" : "h-[3px]"}`} style={{ animationDelay: `${i * 0.15}s`, height: sound ? undefined : 3 }} />
          ))}
        </span>
        Sound {sound ? "on" : "off"}
      </button>
      <style>{`@keyframes eq{0%,100%{height:3px}50%{height:12px}}`}</style>
    </>
  );
}
