"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import Link from "@/components/transition/TransitionLink";
import { showerModes } from "@/data/site";

/** Sticky sequence: Rain, Mist, Cascade. Each frame wipes up over the last while the word changes. */
export default function ShowerModes() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const frames = q(".sm-frame") as HTMLElement[];
    const words = q(".sm-word") as HTMLElement[];
    const lines = q(".sm-line") as HTMLElement[];
    const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: true } });
    frames.forEach((f, i) => {
      tl.fromTo(f, { scale: 1.18 }, { scale: 1, ease: "none", duration: 1 }, i);
      if (i > 0) {
        tl.fromTo(f, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.inOut", duration: 0.5 }, i - 0.25);
        tl.fromTo([words[i], lines[i]], { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.4 }, i - 0.2);
        tl.to([words[i - 1], lines[i - 1]], { yPercent: -100, autoAlpha: 0, duration: 0.4 }, i - 0.2);
      }
    });
  }, { scope: root });

  return (
    <section ref={root} id="showers" data-chapter="Showers" className="relative h-[320vh] bg-onyx text-bone">
      <div className="sticky top-0 grid h-[100svh] grid-rows-[1fr_auto] overflow-clip md:grid-cols-2 md:grid-rows-1">
        <div className="relative order-2 flex flex-col justify-end px-[var(--gutter)] pb-[10vh] md:order-1 md:justify-center md:pb-0">
          <p className="eyebrow mb-6 text-champagne">Showers</p>
          <div className="relative h-[clamp(4rem,11vw,11rem)] overflow-clip">
            {showerModes.map((r, i) => (
              <h2 key={r.key} className="sm-word display absolute inset-0 text-[clamp(4rem,11vw,11rem)]" style={{ opacity: i === 0 ? 1 : 0 }}>
                {r.word}<span className="text-champagne">.</span>
              </h2>
            ))}
          </div>
          <div className="relative mt-4 h-8 overflow-clip">
            {showerModes.map((r, i) => (
              <p key={r.key} className="sm-line display absolute inset-0 text-xl italic text-bone/75 md:text-2xl" style={{ opacity: i === 0 ? 1 : 0 }}>{r.line}</p>
            ))}
          </div>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-bone/60">
            Concealed ceiling showers with up to five functions: rain, rain curtain, spray, mist and waterfall, held at your temperature by thermostatic precision.
          </p>
          <Link href="/#rain" className="link-u eyebrow mt-8 self-start">Try them in the rain</Link>
        </div>
        <div className="relative order-1 overflow-clip md:order-2">
          {showerModes.map((r, i) => (
            <div key={r.key} className="sm-frame absolute inset-0" style={{ zIndex: i }}>
              <Image src={r.img} alt={`AQUILO ${r.word.toLowerCase()} shower`} fill sizes="(min-width: 768px) 50vw, 100vw" quality={90} className="object-cover" />
            </div>
          ))}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-onyx/40 via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}
