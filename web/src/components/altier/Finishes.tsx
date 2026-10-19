"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import Link from "@/components/transition/TransitionLink";
import { finishLine, m } from "@/data/site";

/**
 * The finish line up from the AQUILO catalogue: one mixer in six finishes. Each piece carries a
 * hotspot; hovering names the finish and links to the collection that wears it.
 */
export default function Finishes() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState<number | null>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    gsap.fromTo(q(".fn-img"), { clipPath: "inset(0% 100% 0% 0%)" }, {
      clipPath: "inset(0% 0% 0% 0%)", duration: 2.2, ease: "expo.inOut",
      scrollTrigger: { trigger: q(".fn-img")[0], start: "top 75%" },
    });
    gsap.from(q(".fn-dot"), {
      scale: 0, autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: "back.out(2)",
      scrollTrigger: { trigger: q(".fn-img")[0], start: "top 45%" },
    });
    gsap.from(q(".fn-name"), {
      yPercent: 100, autoAlpha: 0, duration: 1.1, stagger: 0.06, ease: "expo.out",
      scrollTrigger: { trigger: q(".fn-list")[0], start: "top 85%" },
    });
  }, { scope: root });

  return (
    <section ref={root} id="finishes" data-chapter="Finishes" className="bg-stone px-[var(--gutter)] py-[16vh] text-ink">
      <div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-6 text-bronze">Finishes</p>
          <h2 className="display max-w-[12ch] text-[clamp(2.8rem,6vw,6rem)]">One mixer, <em>six skins</em></h2>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-ink/65">Plated by hand and inspected under daylight, every finish is made to keep its colour through years of water.</p>
      </div>

      <div className="fn-img relative mx-auto aspect-[2481/1868] max-w-6xl">
        <Image src={m("cat-finishes")} alt="One AQUILO mixer in six finishes: chrome, gold, matt black, rose gold, copper and gun metal" fill sizes="(min-width: 1200px) 1150px, 100vw" quality={90} className="object-contain mix-blend-multiply" />
        {finishLine.map((f, i) => (
          <Link
            key={f.name}
            href={`/collections/${f.collection}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            data-cursor="See" className="fn-dot group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
            aria-label={`${f.name}: see the collection`}
          >
            <span className="relative grid h-9 w-9 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-bronze/25 [animation-duration:2.4s]" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink transition-transform duration-500 group-hover:scale-150" />
            </span>
            <span className={`eyebrow pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[10px] text-bone transition-all duration-500 ${active === i ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}`}>
              {f.name}
            </span>
          </Link>
        ))}
      </div>

      <ul className="fn-list mt-12 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-ink/10 pt-8 sm:grid-cols-3 lg:grid-cols-6">
        {finishLine.map((f, i) => (
          <li key={f.name} className="overflow-clip">
            <Link href={`/collections/${f.collection}`} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              className={`fn-name block font-display text-2xl transition-colors duration-500 ${active === i ? "text-bronze" : "text-ink/80"}`}>
              {f.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
