"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import WaterContours from "@/components/gl/WaterContours";
import ScrubText from "@/components/ScrubText";

const FACTS = [
  { k: "2010", v: "The year AQUILO began" },
  { k: "7", v: "Signature collections" },
  { k: "3", v: "Experience centres" },
];

/** Statement chapter that follows the rain: words light up as the visitor reads. */
export default function Manifesto() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    gsap.from(q(".mf-fact"), {
      y: 40, autoAlpha: 0, duration: 1.4, stagger: 0.12, ease: "expo.out",
      scrollTrigger: { trigger: q(".mf-facts")[0], start: "top 85%" },
    });
  }, { scope: root });

  return (
    <section ref={root} data-chapter="Altier" className="relative overflow-clip bg-onyx px-[var(--gutter)] pb-[16vh] pt-[22vh] text-bone">
      <WaterContours color="#c9ad82" alpha={0.12} />
      <p className="eyebrow relative mb-10 text-champagne">The summit of AQUILO</p>
      <ScrubText className="display relative max-w-[21ch] text-[clamp(2.3rem,6vw,6.2rem)] leading-[1.02]">
        Since 2010 AQUILO has shaped how India meets *water*. Altier is where it becomes *architecture*: rain drawn from the ceiling, metal finished by hand and stone that holds the *light*.
      </ScrubText>
      <dl className="mf-facts relative mt-[14vh] grid gap-10 border-t border-bone/10 pt-10 sm:grid-cols-3">
        {FACTS.map((f) => (
          <div key={f.k} className="mf-fact">
            <dt className="display text-6xl text-bone md:text-7xl">{f.k}</dt>
            <dd className="eyebrow mt-3 text-bone/50">{f.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
