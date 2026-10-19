"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import Image from "next/image";
import { m } from "@/data/site";

/** A framed film that opens to full bleed as the visitor scrolls into it. */
export default function Wellness() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    gsap.fromTo(q(".wl-frame"), { clipPath: "inset(16% 28% 16% 28% round 6px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
      scrollTrigger: { trigger: root.current, start: "top top", end: "+=100%", scrub: true, pin: true },
    });
    gsap.fromTo(q(".wl-media"), { scale: 1.35 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: root.current, start: "top top", end: "+=100%", scrub: true },
    });
    gsap.from(q(".wl-copy > *"), {
      yPercent: 60, autoAlpha: 0, stagger: 0.08, ease: "expo.out", duration: 1.2,
      scrollTrigger: { trigger: root.current, start: "top -55%", toggleActions: "play none none reverse" },
    });
  }, { scope: root });

  return (
    // wrapper keeps GSAP's pin-spacer out of React's child list
    <div>
      <section ref={root} id="wellness" data-chapter="Wellness" className="relative h-[100svh] overflow-clip bg-onyx text-bone">
        <p className="eyebrow absolute left-1/2 top-[8vh] -translate-x-1/2 text-bone/40">Wellness</p>
        <div className="wl-frame absolute inset-0 overflow-clip">
          <div className="wl-media absolute inset-0"><Image src={m("cat-jacuzzi-night")} alt="AQUILO whirlpool bath in a night lit suite" fill sizes="100vw" quality={90} className="object-cover" /></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/20" />
        </div>
        <div className="wl-copy absolute inset-x-[var(--gutter)] bottom-[10vh]">
          <p className="eyebrow mb-5 text-champagne">Wellness</p>
          <h2 className="display max-w-[12ch] text-[clamp(3rem,8vw,8rem)]">The ritual of <em>slowness</em></h2>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-bone/80">Free standing bathtubs, multifunction steam rooms, steam generators, outdoor spas and swim spas.</p>
        </div>
      </section>
    </div>
  );
}
