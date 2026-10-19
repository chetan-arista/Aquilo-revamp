"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import Link from "@/components/transition/TransitionLink";
import Arrow from "@/components/Arrow";
import { spaces } from "@/data/site";

/** Three spaces side by side; the one under the cursor opens wider and comes into full light. */
export default function Spaces() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    gsap.from(q(".sp-col"), {
      yPercent: 16, autoAlpha: 0, duration: 1.4, stagger: 0.12, ease: "expo.out",
      scrollTrigger: { trigger: root.current, start: "top 75%" },
    });
  }, { scope: root });

  return (
    <section ref={root} data-chapter="Spaces" className="bg-onyx px-[var(--gutter)] py-[16vh] text-bone">
      <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <h2 className="display text-[clamp(2.6rem,6vw,5.5rem)]">One house, <em>three rooms</em></h2>
        <p className="max-w-sm text-sm leading-relaxed text-bone/55">Shower, basin and bath, composed in one finish and one language.</p>
      </div>
      <div className="flex flex-col gap-3 md:h-[78vh] md:flex-row">
        {spaces.map((s, i) => (
          <Link
            key={s.key}
            href={s.href}
            data-cursor="Enter"
            className="sp-col group relative flex h-[62vh] flex-col justify-between overflow-clip bg-graphite p-7 transition-[flex-grow] duration-700 ease-[var(--ease-lux)] md:h-auto md:flex-1 md:hover:flex-[1.8]"
          >
            <Image src={s.image} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" quality={90}
              className="scale-110 object-cover opacity-40 transition-all duration-1000 ease-[var(--ease-lux)] group-hover:scale-100 group-hover:opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" />
            <span className="eyebrow relative text-bone/60">{String(i + 1).padStart(2, "0")}</span>
            <div className="relative">
              <h3 className="display text-5xl md:text-6xl">{s.name}</h3>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-bone/80 opacity-80 transition-opacity duration-700 md:opacity-0 md:group-hover:opacity-90">{s.line}</p>
              <span className="eyebrow mt-6 inline-flex items-center gap-3">Enter <Arrow /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
