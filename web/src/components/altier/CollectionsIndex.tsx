"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrubText from "@/components/ScrubText";
import Link from "@/components/transition/TransitionLink";
import Arrow from "@/components/Arrow";
import PageHero from "./PageHero";
import { collections, m } from "@/data/site";

/** All collections: each one a full-width chapter with its hero piece floating on its own tone. */
export default function CollectionsIndex() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    (q(".ci-row") as HTMLElement[]).forEach((row) => {
      gsap.from(row.querySelectorAll(".ci-reveal"), {
        yPercent: 110, duration: 1.3, stagger: 0.06, ease: "expo.out",
        scrollTrigger: { trigger: row, start: "top 70%" },
      });
      gsap.fromTo(row.querySelector(".ci-panel"), { clipPath: "inset(12% 12% 12% 12%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", ease: "none",
        scrollTrigger: { trigger: row, start: "top bottom", end: "center center", scrub: true },
      });
      gsap.fromTo(row.querySelector(".ci-hero"), { yPercent: 12 }, {
        yPercent: -12, ease: "none",
        scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
  }, { scope: root });

  return (
    <div ref={root} className="bg-onyx text-bone">
      <Header />
      <main>
        <PageHero eyebrow="AQUILO Altier" title="Collections" line="Seven languages of metal, each complete from basin to rain." image={m("spray-dark-2")} crumbs={[{ label: "Altier", href: "/" }, { label: "Collections" }]} />

        <div className="bg-stone text-ink">
        <section className="px-[var(--gutter)] py-[18vh]">
          <p className="eyebrow mb-10 text-bronze">Crafted heritage, contemporary luxury</p>
          <ScrubText accentClass="text-bronze" className="display max-w-[22ch] text-[clamp(2.2rem,5.4vw,5.4rem)] leading-[1.04]">
            An Altier collection is never a single tap. It is a *complete language*, carried from the basin mixer to the rain shower to the smallest hook, in one finish that *deepens with time*.
          </ScrubText>
        </section>

        <div className="space-y-[14vh] pb-[18vh]">
          {collections.map((c, i) => {
            const second = c.pieces[1]?.image;
            const flip = i % 2 === 1;
            return (
              <article key={c.slug} className="ci-row grid items-center gap-10 px-[var(--gutter)] md:grid-cols-12">
                <Link href={`/collections/${c.slug}`} data-cursor="View" className={`ci-panel group relative block aspect-[4/3] overflow-clip md:col-span-7 ${flip ? "md:order-2" : ""}`} style={{ backgroundColor: c.paper }}>
                  <span aria-hidden className="display pointer-events-none absolute -bottom-[0.18em] left-6 whitespace-nowrap text-[clamp(5rem,12vw,13rem)] leading-none text-ink/[0.07]">{c.name}</span>
                  {c.hero && (
                    <div className="ci-hero absolute inset-[10%] transition-transform duration-1000 ease-[var(--ease-lux)] group-hover:-translate-x-[8%] group-hover:scale-95">
                      <Image src={c.hero} alt={`${c.name} hero piece`} fill sizes="(min-width: 768px) 50vw, 90vw" quality={90} className="cutout-light object-contain" />
                    </div>
                  )}
                  {second && (
                    <div className="absolute inset-y-[18%] right-[6%] w-[34%] translate-x-[30%] opacity-0 transition-all duration-1000 ease-[var(--ease-lux)] group-hover:translate-x-0 group-hover:opacity-100">
                      <Image src={second} alt="" fill sizes="20vw" quality={90} className="cutout-light object-contain" />
                    </div>
                  )}
                </Link>
                <div className={`md:col-span-5 ${flip ? "md:order-1 md:pr-[4vw]" : "md:pl-[4vw]"}`}>
                  <div className="overflow-clip"><p className="ci-reveal eyebrow mb-5 text-bronze">{String(i + 1).padStart(2, "0")} · {c.finish}</p></div>
                  <div className="overflow-clip pb-2"><h2 className="ci-reveal display text-[clamp(3rem,6.5vw,6.5rem)]">{c.name}</h2></div>
                  <div className="overflow-clip"><p className="ci-reveal font-display text-2xl italic text-ink/80">{c.line}</p></div>
                  <div className="overflow-clip"><p className="ci-reveal mt-5 max-w-md text-[15px] leading-relaxed text-ink/65">{c.story}</p></div>
                  <div className="overflow-clip pt-8">
                    <Link href={`/collections/${c.slug}`} className="ci-reveal group inline-flex items-center gap-4">
                      <span className="eyebrow roll"><span>Discover {c.count} pieces</span><span>Discover {c.count} pieces</span></span>
                      <span className="grid h-11 w-11 place-items-center rounded-full border border-ink/30 transition-colors duration-500 group-hover:bg-ink group-hover:text-bone"><Arrow /></span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
