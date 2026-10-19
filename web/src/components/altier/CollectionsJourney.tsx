"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import Link from "@/components/transition/TransitionLink";
import Arrow from "@/components/Arrow";
import { collections } from "@/data/site";

/**
 * Horizontal journey through the collections, on warm paper: each panel takes the collection's paper
 * tone, its name runs large behind the hero piece, and the piece drifts against the scroll.
 */
export default function CollectionsJourney() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const track = q(".cj-track")[0] as HTMLElement;
      const panels = q(".cj-panel") as HTMLElement[];
      const distance = () => track.scrollWidth - window.innerWidth;
      const scroll = gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: {
          trigger: root.current, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true,
          onUpdate: (s) => {
            const idx = Math.min(panels.length, Math.max(1, Math.round(s.progress * (panels.length - 1)) + 1));
            const n = q(".cj-index")[0];
            if (n) n.textContent = String(idx).padStart(2, "0");
            gsap.set(q(".cj-progress"), { scaleX: s.progress });
          },
        },
      });
      panels.forEach((panel) => {
        gsap.fromTo(panel.querySelector(".cj-piece"), { xPercent: 18, rotate: 4 }, {
          xPercent: -18, rotate: -4, ease: "none",
          scrollTrigger: { trigger: panel, containerAnimation: scroll, start: "left right", end: "right left", scrub: true },
        });
        gsap.fromTo(panel.querySelector(".cj-name"), { xPercent: -10 }, {
          xPercent: 10, ease: "none",
          scrollTrigger: { trigger: panel, containerAnimation: scroll, start: "left right", end: "right left", scrub: true },
        });
        gsap.from(panel.querySelectorAll(".cj-reveal"), {
          yPercent: 110, duration: 1.2, stagger: 0.06, ease: "expo.out",
          scrollTrigger: { trigger: panel, containerAnimation: scroll, start: "left 60%", toggleActions: "play none none reverse" },
        });
      });
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    // wrapper keeps GSAP's pin-spacer out of React's child list
    <div>
      <section ref={root} id="collections" data-chapter="Collections" className="relative h-[100svh] overflow-clip bg-sand text-ink">
        <div className="absolute inset-x-[var(--gutter)] top-[calc(var(--header-h)+2vh)] z-10 flex items-center justify-between">
          <p className="eyebrow">Collections</p>
          <p className="eyebrow tabular-nums"><span className="cj-index">01</span> / {String(collections.length).padStart(2, "0")}</p>
        </div>
        <div className="cj-track flex h-full w-max will-change-transform">
          <div className="flex w-[86vw] shrink-0 flex-col justify-center px-[var(--gutter)] md:w-[46vw]">
            <h2 className="display text-[clamp(3.2rem,8vw,8.5rem)]">Seven<br /><em>signatures</em></h2>
            <p className="mt-8 max-w-sm text-[15px] leading-relaxed text-ink/70">
              Every Altier collection is a complete language, from basin mixer to rain shower to the smallest accessory, in one considered finish.
            </p>
            <Link href="/collections" className="link-u eyebrow mt-10 self-start">All collections</Link>
          </div>

          {collections.map((c, i) => (
            <article key={c.slug} className="cj-panel relative flex h-full w-screen shrink-0 items-center overflow-clip md:w-[72vw]" style={{ backgroundColor: c.paper }}>
              <h3 aria-hidden className="cj-name display pointer-events-none absolute left-[var(--gutter)] top-[22vh] whitespace-nowrap text-[clamp(4rem,13vw,14rem)] text-ink/90">
                {c.name}
              </h3>
              {c.hero && (
                <div className="cj-piece absolute right-[6%] top-[30vh] h-[34vh] w-[66%] md:bottom-[14vh] md:top-auto md:h-[60vh] md:w-[42%]">
                  <Image src={c.hero} alt={`${c.name} by AQUILO Altier`} fill sizes="(min-width: 768px) 32vw, 66vw" quality={90} className="cutout-light object-contain object-bottom" />
                </div>
              )}
              <div className="absolute bottom-[8vh] left-[var(--gutter)] max-w-xs">
                <div className="overflow-clip"><p className="cj-reveal eyebrow mb-3 text-ink/50">{String(i + 1).padStart(2, "0")} · {c.count} pieces</p></div>
                <div className="overflow-clip"><p className="cj-reveal font-display text-2xl italic leading-snug">{c.line}</p></div>
                <div className="overflow-clip"><p className="cj-reveal mt-3 text-xs text-ink/60">{c.finish}</p></div>
                <div className="overflow-clip pt-6">
                  <Link href={`/collections/${c.slug}`} className="cj-reveal group inline-flex items-center gap-3">
                    <span className="eyebrow roll"><span>Explore {c.name}</span><span>Explore {c.name}</span></span>
                    <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="absolute inset-x-[var(--gutter)] bottom-5 h-px bg-ink/10">
          <span className="cj-progress block h-full origin-left scale-x-0 bg-ink" />
        </div>
      </section>
    </div>
  );
}
