"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { basins } from "@/data/site";

/** Editorial spread of sculpted basins: images unveil upward and drift with a slow parallax. */
export default function Basins() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    (q(".bs-img") as HTMLElement[]).forEach((el) => {
      gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
      const img = el.querySelector("img");
      if (img) gsap.fromTo(img, { yPercent: -7, scale: 1.14 }, {
        yPercent: 7, scale: 1.14, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
  }, { scope: root });

  const [a, b, c] = basins;
  return (
    <section ref={root} id="basins" data-chapter="Basins" className="bg-sand px-[var(--gutter)] py-[16vh] text-ink">
      <div className="grid gap-4 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-5 md:pt-[10vh]">
          <p className="eyebrow mb-6 text-bronze">Basins</p>
          <h2 className="display text-[clamp(2.8rem,6vw,6rem)]">Sculpted in stone, concrete and <em>glass</em></h2>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink/65">Bali stone, handmade and ceramic. Table top and free standing forms that anchor the room.</p>
        </div>
        <figure className="md:col-span-4">
          <div className="bs-img relative aspect-[4/5] overflow-clip bg-clay">
            <Image src={b.image} alt={b.name} fill sizes="(min-width: 768px) 33vw, 100vw" quality={90} className="object-cover" />
          </div>
          <figcaption className="mt-4 flex justify-between text-xs text-ink/55"><span>{b.name}</span><span>{b.finish}</span></figcaption>
        </figure>
        <div className="flex flex-col gap-4 md:col-span-3 md:mt-[18vh] md:gap-6">
          {[c, a].map((x) => (
            <figure key={x.name}>
              <div className="bs-img relative aspect-square overflow-clip bg-clay">
                <Image src={x.image} alt={x.name} fill sizes="(min-width: 768px) 25vw, 100vw" quality={90} className="object-cover" />
              </div>
              <figcaption className="mt-4 flex justify-between text-xs text-ink/55"><span>{x.name}</span><span>{x.finish}</span></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
