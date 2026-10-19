"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText } from "@/lib/gsap";
import { finishes, heroModel } from "@/data/site";

const FaucetScene = dynamic(() => import("@/components/gl/FaucetScene"), { ssr: false });

/**
 * The Tap Studio: an interactive mixer over a white basin on black marble. Turn it, change its
 * finish, open the tap and watch the basin fill, overflow and drain.
 */
export default function TapStudio() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [finish, setFinish] = useState(0);
  const [flowing, setFlowing] = useState(false);
  const [visible, setVisible] = useState(false);
  const opened = useRef(false);
  const status = useRef<HTMLSpanElement>(null);
  // Written straight to the DOM: the status changes many times a second while the basin fills.
  const onStatus = useCallback((text: string) => {
    if (status.current) status.current.textContent = text;
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const title = SplitText.create(q(".ts-title")[0], { type: "lines", mask: "lines" });
    gsap.from(title.lines, {
      yPercent: 110, duration: 1.5, stagger: 0.1, ease: "expo.out",
      scrollTrigger: { trigger: root.current, start: "top 60%" },
    });
    gsap.from(q(".ts-in"), {
      autoAlpha: 0, y: 18, duration: 1.1, stagger: 0.08, ease: "power3.out",
      scrollTrigger: { trigger: root.current, start: "top 55%" },
    });
    ScrollTrigger.create({
      trigger: root.current, start: "top bottom", end: "bottom top", scrub: true,
      onUpdate: (s) => (progress.current = Math.max(0, (s.progress - 0.5) * 2)),
      // The tap opens by itself the first time the studio comes into view.
      onEnter: () => { if (!opened.current) { opened.current = true; gsap.delayedCall(1.2, () => setFlowing(true)); } },
    });
    return () => title.revert();
  }, { scope: root });

  return (
    <section ref={root} id="tap" data-chapter="The Tap" className="relative h-[100svh] min-h-[640px] overflow-clip bg-[radial-gradient(ellipse_at_68%_42%,#1d1b19_0%,#0b0b0b_58%,#070707_100%)] text-bone">
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <FaucetScene finish={finishes[finish]} flowing={flowing} progress={progress} active={visible} modelUrl={heroModel} onStatus={onStatus} />
      </div>

      {/* Phones: the copy sits over the counter, so it gets its own shade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-onyx via-onyx/85 to-transparent md:hidden" />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end px-[var(--gutter)] pb-[10vh] md:justify-center md:pb-0">
        <p className="ts-in eyebrow mb-6 text-champagne">The Tap Studio</p>
        <h2 className="ts-title display max-w-[9ch] text-[clamp(3.4rem,9vw,9.5rem)]">Water, <em>composed.</em></h2>
        <p className="ts-in mt-6 max-w-sm text-[15px] leading-relaxed text-bone/65">
          Turn the mixer, choose its finish and open the tap. Leave it running and the basin fills, then overflows across the marble.
        </p>

        <div className="ts-in pointer-events-auto mt-10 flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Finish">
            {finishes.map((f, i) => (
              <button
                key={f.name}
                role="radio"
                aria-checked={finish === i}
                aria-label={f.name}
                title={f.name}
                onClick={() => setFinish(i)}
                className={`h-7 w-7 rounded-full border transition-transform duration-500 ${finish === i ? "scale-110 border-bone" : "border-bone/20 hover:scale-110"}`}
                style={{ background: `radial-gradient(circle at 30% 30%, #fff9 0, ${f.color} 45%, ${f.color} 100%)` }}
              />
            ))}
          </div>
          <span className="eyebrow min-w-[16ch] text-bone/55">{finishes[finish].name}</span>
          <button onClick={() => setFlowing((v) => !v)} data-magnetic className="eyebrow flex items-center gap-3 rounded-full border border-bone/25 px-5 py-3 transition-colors duration-500 hover:bg-bone hover:text-onyx">
            <span className={`block h-1.5 w-1.5 rounded-full ${flowing ? "bg-sky-300" : "bg-bone/40"}`} />
            <span className="roll"><span>{flowing ? "Close the tap" : "Open the tap"}</span><span>{flowing ? "Close the tap" : "Open the tap"}</span></span>
          </button>
          <span ref={status} aria-live="polite" className="eyebrow min-w-[16ch] text-sky-200/70" />
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-[var(--gutter)] right-[var(--gutter)] hidden text-bone/40 md:block">
        <span className="eyebrow">Drag to turn the mixer</span>
      </p>
    </section>
  );
}
