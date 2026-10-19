"use client";

import { useRef } from "react";
import { gsap, useGSAP, INTRO_DONE, prefersReducedMotion } from "@/lib/gsap";
import { smoothScroll } from "@/lib/scroll";
import { LOGO_BOUNDS, LOGO_LETTERS, LOGO_VIEWBOX } from "@/data/logo-paths";

const SEEN_KEY = "aquilo-intro-seen";
const SCENE_READY = "aquilo:scene-ready";
const MIN_INTRO = 3.6; // seconds before the curtain may part
const MAX_WAIT = 9; // never hold a visitor longer than this

function finish() {
  document.documentElement.dataset.intro = "done";
  smoothScroll.start();
  window.dispatchEvent(new Event(INTRO_DONE));
}

/**
 * First visit intro. A single thread of water falls through the dark and lands; from its ripple the
 * AQUILO wordmark draws itself in light, fills with liquid metal and ALTIER settles beneath it.
 * The counter follows real loading (fonts and the first frame of the 3D shower). Then the screen
 * parts like water to reveal the rain already falling. Returning visitors get a short fade.
 */
export default function Loader() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch {}

    if (seen || prefersReducedMotion()) {
      gsap.timeline({ onComplete: () => gsap.set(el, { display: "none" }) })
        .set(q(".ld-fill"), { fillOpacity: 1 })
        .set(q(".ld-word"), { autoAlpha: 1 })
        .to(el, { autoAlpha: 0, duration: 0.7, delay: 0.25, ease: "power2.out", onStart: finish });
      return;
    }

    // Test hook: window.__introScale = 8 plays the intro eight times slower (used for visual QA captures).
    const slow = (window as { __introScale?: number }).__introScale;
    if (slow) gsap.globalTimeline.timeScale(1 / slow);

    // Real readiness: fonts, plus the 3D scene's first frame when the page has one.
    let fontsReady = false, sceneReady = !document.querySelector("[data-scene]");
    document.fonts?.ready.then(() => (fontsReady = true));
    const onScene = () => (sceneReady = true);
    window.addEventListener(SCENE_READY, onScene);
    const started = performance.now();
    const ready = () => (fontsReady && sceneReady) || (performance.now() - started) / 1000 > MAX_WAIT;

    // Prepare the line drawing of every letter.
    const strokes = Array.from(el.querySelectorAll<SVGPathElement>(".ld-stroke"));
    strokes.forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, strokeOpacity: 1 });
    });

    const counter = { v: 0 };
    const setCount = () => {
      const n = q(".ld-count")[0];
      if (n) n.textContent = String(Math.round(counter.v)).padStart(3, "0");
    };

    const intro = gsap.timeline({ defaults: { ease: "expo.out" } })
      // 1. A thread of water falls to the centre, its bright head leading.
      .fromTo(q(".ld-thread"), { scaleY: 0 }, { scaleY: 1, duration: 1.0, ease: "power2.in" }, 0.25)
      .fromTo(q(".ld-head"), { y: "-50vh", autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.0, ease: "power2.in" }, 0.25)
      // 2. It lands: the thread drains away and rings spread across the surface.
      .to(q(".ld-thread"), { scaleY: 0, transformOrigin: "bottom", duration: 0.5, ease: "power2.in" }, 1.25)
      .to(q(".ld-head"), { autoAlpha: 0, scale: 2.5, duration: 0.35, ease: "power2.out" }, 1.25)
      .fromTo(q(".ld-ring"), { scale: 0.05, autoAlpha: 0.9 }, { scale: 1, autoAlpha: 0, duration: 2.2, stagger: 0.22, ease: "power2.out" }, 1.25)
      // 3. The wordmark draws itself in light, then fills with liquid metal.
      .to(strokes, { strokeDashoffset: 0, duration: 1.6, stagger: 0.09, ease: "power2.inOut" }, 1.35)
      .to(q(".ld-fill"), { fillOpacity: 1, duration: 1.2, stagger: 0.07, ease: "power2.out" }, 2.4)
      .to(strokes, { strokeOpacity: 0, duration: 1, ease: "power2.out" }, 2.8)
      .fromTo(q(".ld-shine"), { attr: { x1: -400, x2: 0 } }, { attr: { x1: LOGO_BOUNDS.width + 200, x2: LOGO_BOUNDS.width + 600 }, duration: 1.8, ease: "power2.inOut" }, 2.5)
      // 4. ALTIER settles beneath, letter by letter.
      .fromTo(q(".ld-word span"), { autoAlpha: 0, filter: "blur(8px)", letterSpacing: "1.4em" }, { autoAlpha: 1, filter: "blur(0px)", letterSpacing: "0.62em", duration: 1.6, stagger: 0.06 }, 2.7)
      .from(q(".ld-meta"), { autoAlpha: 0, y: 12, duration: 1, stagger: 0.1 }, 0.6);

    // Counter: eases towards 90 on its own, the last stretch only once everything is ready.
    gsap.to(counter, { v: 90, duration: MIN_INTRO, ease: "power1.inOut", onUpdate: setCount });

    let exiting = false;
    const exit = () => {
      if (exiting) return;
      exiting = true;
      gsap.ticker.remove(check);
      window.removeEventListener(SCENE_READY, onScene);
      gsap.timeline()
        .to(counter, { v: 100, duration: 0.6, ease: "power2.out", onUpdate: setCount })
        .to(q(".ld-progress"), { scaleX: 1, duration: 0.6, ease: "power2.out" }, 0)
        .to(q(".ld-mark, .ld-word, .ld-meta"), { autoAlpha: 0, y: -24, duration: 0.8, stagger: 0.05, ease: "power3.in" }, 0.45)
        // The screen parts along the waterline.
        .to(q(".ld-top"), { yPercent: -100, duration: 1.4, ease: "expo.inOut" }, 0.9)
        .to(q(".ld-bottom"), { yPercent: 100, duration: 1.4, ease: "expo.inOut" }, 0.9)
        .to(q(".ld-seam"), { scaleX: 1, autoAlpha: 0, duration: 1.2, ease: "expo.out" }, 0.85)
        .add(() => {
          try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
          finish();
        }, 1.2)
        .set(el, { display: "none" });
    };
    const check = () => {
      gsap.set(q(".ld-progress"), { scaleX: counter.v / 100 });
      if (intro.time() >= MIN_INTRO && ready()) exit();
    };
    gsap.ticker.add(check);

    return () => {
      gsap.ticker.remove(check);
      window.removeEventListener(SCENE_READY, onScene);
    };
  }, { scope: root });

  return (
    <div ref={root} aria-hidden className="fixed inset-0 z-[100] text-bone">
      {/* Two halves of the curtain; they part at the end. */}
      <div className="ld-top absolute inset-x-0 top-0 h-1/2 bg-onyx" />
      <div className="ld-bottom absolute inset-x-0 bottom-0 h-1/2 bg-onyx" />
      <span className="ld-seam absolute inset-x-0 top-1/2 block h-px origin-center scale-x-0 bg-champagne/70" />

      {/* The falling thread and its landing */}
      <div className="pointer-events-none absolute inset-0">
        <span className="ld-thread absolute left-1/2 top-0 block h-1/2 w-px origin-top -translate-x-1/2 scale-y-0 bg-gradient-to-b from-transparent via-bone/40 to-bone/90" />
        <span className="ld-head absolute left-1/2 top-1/2 block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone opacity-0 shadow-[0_0_18px_4px_rgba(255,240,215,0.65)]" />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="ld-ring absolute left-1/2 top-1/2 block h-[16vw] w-[72vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-champagne/40 opacity-0" />
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="ld-mark relative w-[min(72vw,560px)]">
          <svg viewBox={LOGO_VIEWBOX} className="block w-full overflow-visible">
            <defs>
              <linearGradient id="ld-metal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f4e6c8" />
                <stop offset="0.5" stopColor="#c9ad82" />
                <stop offset="1" stopColor="#8d7149" />
              </linearGradient>
              <linearGradient id="ld-shine-grad" className="ld-shine" gradientUnits="userSpaceOnUse" x1="-400" y1="0" x2="0" y2="0">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {LOGO_LETTERS.map((l, i) => (
              <g key={i}>
                <path d={l.d} className="ld-fill" fill="url(#ld-metal)" fillOpacity="0" fillRule="evenodd" />
                <path d={l.d} className="ld-fill" fill="url(#ld-shine-grad)" fillOpacity="0" fillRule="evenodd" style={{ mixBlendMode: "overlay" }} />
                <path d={l.d} className="ld-stroke" fill="none" stroke="#e8d3ad" strokeWidth="1.2" strokeOpacity="0" vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>
        </div>
        <p className="ld-word eyebrow mt-8 flex text-[13px] text-bone/85 md:text-[15px]" style={{ letterSpacing: "0.62em" }}>
          {"ALTIER".split("").map((c, i) => <span key={i} className="opacity-0">{c}</span>)}
        </p>
      </div>

      <div className="absolute inset-x-[var(--gutter)] bottom-[var(--gutter)] flex items-end justify-between">
        <div className="ld-meta">
          <p className="eyebrow text-bone/55">Ultra Luxury</p>
          <p className="eyebrow mt-2 text-bone/35">Since 2010</p>
        </div>
        <div className="ld-meta flex flex-col items-end gap-3">
          <span className="ld-count font-display text-5xl leading-none tabular-nums text-bone/90 md:text-6xl">000</span>
          <span className="block h-px w-40 bg-bone/15">
            <span className="ld-progress block h-full origin-left scale-x-0 bg-champagne" />
          </span>
        </div>
      </div>
    </div>
  );
}
