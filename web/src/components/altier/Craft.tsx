"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { craftSteps } from "@/data/site";

/**
 * Seven steps from brass ingot to mirror finish, set as one strip on warm stone. The process photos
 * are small originals, so they are shown at a size that keeps them crisp.
 */
export default function Craft() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    gsap.from(q(".cr-step"), {
      y: 50, autoAlpha: 0, duration: 1.3, stagger: 0.08, ease: "expo.out",
      scrollTrigger: { trigger: q(".cr-steps")[0], start: "top 78%" },
    });
    gsap.fromTo(q(".cr-line"), { scaleX: 0 }, {
      scaleX: 1, ease: "none",
      scrollTrigger: { trigger: q(".cr-steps")[0], start: "top 80%", end: "bottom 40%", scrub: true },
    });
  }, { scope: root });

  return (
    <section ref={root} id="craft" data-chapter="Craft" className="bg-stone px-[var(--gutter)] py-[18vh] text-ink">
      <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-6 text-bronze">Craftsmanship</p>
          <h2 className="display max-w-[14ch] text-[clamp(2.8rem,6vw,6rem)]">From brass ingot to <em>mirror finish</em></h2>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-ink/65">Seven disciplined steps stand behind every AQUILO faucet. Nothing is left unturned.</p>
      </div>
      <div className="relative">
        <span className="cr-line absolute inset-x-0 top-[18px] hidden h-px origin-left bg-ink/20 lg:block" />
        <ol className="cr-steps grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 lg:grid-cols-7">
          {craftSteps.map((s) => (
            <li key={s.n} className="cr-step group">
              <span className="relative z-10 mb-6 grid h-9 w-9 place-items-center rounded-full border border-ink/25 bg-stone font-display text-sm">{Number(s.n)}</span>
              <div className="relative aspect-[3/4] max-w-[200px] overflow-clip bg-clay">
                <Image src={s.img} alt={s.t} fill sizes="200px" quality={90}
                  className="object-cover grayscale-[.85] sepia-[.15] transition-[filter,transform] duration-1000 ease-[var(--ease-lux)] group-hover:scale-105 group-hover:grayscale-0 group-hover:sepia-0" />
              </div>
              <p className="mt-5 font-display text-2xl">{s.t}</p>
              <p className="mt-1 max-w-[22ch] text-xs leading-relaxed text-ink/60">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
      <p className="display mt-16 text-[clamp(2rem,3.4vw,3.4rem)] italic text-bronze">Nothing left unturned.</p>
    </section>
  );
}
