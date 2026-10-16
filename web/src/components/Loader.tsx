"use client";

import { useRef } from "react";
import { gsap, useGSAP, INTRO_DONE, prefersReducedMotion } from "@/lib/gsap";
import { smoothScroll } from "@/lib/scroll";
import { LOGO_BOUNDS, LOGO_LETTERS, LOGO_VIEWBOX } from "@/data/logo-paths";

// Liquid fill geometry: a wave twice the wordmark width, rising from below the letters to above them.
const WAVE_W = LOGO_BOUNDS.width + 100;
const SEG = WAVE_W / 8;
const wave = (x0: number) => Array.from({ length: 8 }, (_, k) => `Q ${x0 + SEG * k + SEG / 2} ${k % 2 ? 90 : 30} ${x0 + SEG * (k + 1)} 60`).join(" ");
const WAVE_D = `M0 60 ${wave(0)} ${wave(WAVE_W)} V 900 H 0 Z`;
const WAVE_FROM = LOGO_BOUNDS.height + 10;
const WAVE_TO = -100;

const SEEN_KEY = "aquilo-intro-seen";

function finish() {
  document.documentElement.dataset.intro = "done";
  smoothScroll.start();
  window.dispatchEvent(new Event(INTRO_DONE));
}

/**
 * First-visit intro: the AQUILO wordmark rises letter by letter, fills with liquid champagne,
 * a single drop falls and the curtain lifts. Returning visitors (same session) get a short fade.
 */
export default function Loader() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch {}

    if (seen || prefersReducedMotion()) {
      gsap.to(el, { autoAlpha: 0, duration: 0.6, delay: 0.15, ease: "power2.out", onStart: finish, onComplete: () => gsap.set(el, { display: "none" }) });
      return;
    }

    const counter = { v: 0 };
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

    tl.set(q(".ld-letter"), { yPercent: 150 })
      .to(q(".ld-letter"), { yPercent: 0, duration: 1.3, stagger: 0.07 }, 0.2)
      .from(q(".ld-meta"), { autoAlpha: 0, y: 12, duration: 1, stagger: 0.1 }, 0.5)
      // Liquid fill: the wave rises inside the letterforms while drifting sideways.
      .fromTo(q(".ld-wave"), { y: WAVE_FROM }, { y: WAVE_TO, duration: 2.4, ease: "power2.inOut" }, 0.9)
      .to(q(".ld-wave-path"), { x: -WAVE_W, duration: 2.4, ease: "none", repeat: 0 }, 0.9)
      .to(counter, {
        v: 100, duration: 2.4, ease: "power2.inOut",
        onUpdate: () => {
          const n = q(".ld-count")[0];
          if (n) n.textContent = String(Math.round(counter.v)).padStart(3, "0");
        },
      }, 0.9)
      .to(q(".ld-progress"), { scaleX: 1, duration: 2.4, ease: "power2.inOut" }, 0.9)
      // A single drop falls from the wordmark…
      .fromTo(q(".ld-drop"), { autoAlpha: 0, y: 0, scaleY: 0.6 }, { autoAlpha: 1, scaleY: 1.4, y: "42vh", duration: 0.75, ease: "power3.in" }, 3.25)
      .to(q(".ld-drop"), { autoAlpha: 0, duration: 0.1 }, 4.0)
      .fromTo(q(".ld-ripple"), { scale: 0, autoAlpha: 0.9 }, { scale: 1, autoAlpha: 0, duration: 1.2, stagger: 0.12, ease: "power2.out" }, 3.98)
      // …and the curtain lifts.
      .to(q(".ld-meta, .ld-mark"), { autoAlpha: 0, y: -30, duration: 0.8, ease: "power3.in" }, 4.0)
      .to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.3, ease: "expo.inOut" }, 4.25)
      .add(() => {
        try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
        finish();
      }, 4.6)
      .set(el, { display: "none" });
  }, { scope: root });

  const [x0, y0, w, h] = LOGO_VIEWBOX.split(" ").map(Number);

  return (
    <div
      ref={root}
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-graphite text-bone"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
    >
      <div className="ld-mark relative w-[min(70vw,520px)]">
        <svg viewBox={LOGO_VIEWBOX} className="block w-full overflow-visible">
          <defs>
            <clipPath id="ld-clip">
              {LOGO_LETTERS.map((l, i) => <path key={i} d={l.d} />)}
            </clipPath>
            <linearGradient id="ld-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e6cfa4" />
              <stop offset="0.55" stopColor="#c8a97e" />
              <stop offset="1" stopColor="#8a6a40" />
            </linearGradient>
          </defs>
          {/* Letters rise inside individual masks */}
          {LOGO_LETTERS.map((l, i) => (
            <svg key={i} x={x0} y={y0} width={w} height={h} viewBox={LOGO_VIEWBOX} overflow="hidden">
              <path d={l.d} className="ld-letter" fill="currentColor" fillOpacity="0.16" fillRule="evenodd" />
            </svg>
          ))}
          {/* Liquid champagne fill clipped to the wordmark */}
          <g clipPath="url(#ld-clip)">
            <g className="ld-wave" transform={`translate(0 ${WAVE_FROM})`}>
              <path
                className="ld-wave-path"
                fill="url(#ld-gold)"
                d={WAVE_D}
              />
            </g>
          </g>
        </svg>
        <span className="ld-drop absolute left-1/2 top-full mt-2 block h-3 w-[7px] -translate-x-1/2 rounded-full bg-champagne opacity-0" />
      </div>

      <div className="pointer-events-none absolute bottom-[8vh] left-1/2 -translate-x-1/2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="ld-ripple absolute left-1/2 top-1/2 block h-[18px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-champagne/60 opacity-0" />
        ))}
      </div>

      <div className="absolute inset-x-[var(--gutter)] bottom-[var(--gutter)] flex items-end justify-between">
        <p className="ld-meta eyebrow text-bone/60">The House of Water</p>
        <div className="ld-meta flex flex-col items-end gap-3">
          <span className="ld-count font-display text-5xl leading-none tabular-nums text-bone/90 md:text-6xl">000</span>
          <span className="block h-px w-40 bg-bone/15">
            <span className="ld-progress block h-full origin-left scale-x-0 bg-champagne" />
          </span>
        </div>
        <p className="ld-meta eyebrow hidden text-bone/60 md:block">Est. 2010</p>
      </div>
    </div>
  );
}
