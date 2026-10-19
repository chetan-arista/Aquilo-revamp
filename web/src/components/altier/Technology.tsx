"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import LoopVideo from "@/components/LoopVideo";
import { technologies } from "@/data/site";

/** Engineering beneath the surface: counters roll up as each row arrives. */
export default function Technology() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    (q(".tc-num") as HTMLElement[]).forEach((el) => {
      const end = Number(el.dataset.value);
      const o = { v: 0 };
      gsap.to(o, {
        v: end, duration: 2, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
        onUpdate: () => (el.textContent = String(Math.round(o.v))),
      });
    });
    gsap.from(q(".tc-row"), {
      y: 60, autoAlpha: 0, duration: 1.2, stagger: 0.12, ease: "expo.out",
      scrollTrigger: { trigger: q(".tc-list")[0], start: "top 75%" },
    });
  }, { scope: root });

  return (
    <section ref={root} id="technology" data-chapter="Technology" className="relative overflow-clip bg-onyx px-[var(--gutter)] py-[18vh] text-bone">
      <LoopVideo name="ceiling-rain" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-onyx via-onyx/60 to-onyx" />
      <div className="relative grid gap-16 md:grid-cols-[1fr_1.3fr]">
        <div className="md:sticky md:top-[20vh] md:self-start">
          <p className="eyebrow mb-6 text-champagne">Innovative Technologies</p>
          <h2 className="display text-[clamp(2.8rem,6vw,6rem)]">Engineered<br />beneath the <em>surface</em></h2>
        </div>
        <ul className="tc-list divide-y divide-bone/10 border-y border-bone/10">
          {technologies.map((t) => (
            <li key={t.title} className="tc-row grid grid-cols-[auto_1fr] items-baseline gap-8 py-10">
              <p className="display w-[3.4ch] text-[clamp(3.5rem,7vw,6.5rem)] text-champagne">
                <span className="tc-num" data-value={t.value}>{t.value}</span>
                <span className="ml-1 align-top font-sans text-sm tracking-widest">{t.unit}</span>
              </p>
              <div>
                <h3 className="font-display text-3xl">{t.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-bone/60">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
