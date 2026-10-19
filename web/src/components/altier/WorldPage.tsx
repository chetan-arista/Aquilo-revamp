"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JourneyRail from "@/components/JourneyRail";
import ScrubText from "@/components/ScrubText";
import PageHero from "./PageHero";
import Technology from "./Technology";
import Craft from "./Craft";
import Spaces from "./Spaces";
import { m, presence } from "@/data/site";

const chapters = [
  { year: "2010", title: "A house of water", body: "AQUILO began in Nagpur with a simple conviction: that water deserves design. Faucets, showers and basins were drawn as one language rather than a catalogue.", image: m("columns") },
  { year: "Today", title: "One complete bath suite", body: "Faucets, rain and mist, sculpted basins, steam and spa. Every piece is conceived together, environment friendly and endlessly considered.", image: m("cat-jacuzzi-night-2") },
  { year: "Altier", title: "The summit", body: "Altier gathers the most precious finishes of the house, rose gold, champagne, steel and copper, and presents them as architecture.", image: m("cat-finishes") },
];

/** Our World: the story of the house, its engineering and its craft. */
export default function WorldPage() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    (q(".wd-ch") as HTMLElement[]).forEach((el) => {
      gsap.fromTo(el.querySelector(".wd-img"), { clipPath: "inset(0% 50% 0% 50%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", duration: 1.8, ease: "expo.inOut",
        scrollTrigger: { trigger: el, start: "top 75%" },
      });
      gsap.from(el.querySelectorAll(".wd-reveal"), {
        yPercent: 110, duration: 1.2, stagger: 0.07, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 70%" },
      });
    });
    gsap.from(q(".wd-state"), {
      autoAlpha: 0, y: 24, duration: 1, stagger: 0.05, ease: "expo.out",
      scrollTrigger: { trigger: q(".wd-states")[0], start: "top 80%" },
    });
  }, { scope: root });

  return (
    <div ref={root} className="bg-onyx text-bone">
      <Header />
      <main>
        <PageHero eyebrow="Our World" title="Since 2010" line="The story of a house that treats water as architecture." image={m("columns")} crumbs={[{ label: "Altier", href: "/" }, { label: "Our World" }]} />

        <div className="bg-stone text-ink">
        <section data-chapter="Story" className="px-[var(--gutter)] py-[18vh]">
          <p className="eyebrow mb-10 text-bronze">Excellence since 2010</p>
          <ScrubText accentClass="text-bronze" className="display max-w-[22ch] text-[clamp(2.2rem,5.4vw,5.4rem)] leading-[1.04]">
            AQUILO has transformed the way India connects with *water*. Precision, aesthetics and innovation, shaped into rituals that begin and end every *day*.
          </ScrubText>
        </section>

        <div className="space-y-[16vh] pb-[16vh]">
          {chapters.map((c, i) => (
            <article key={c.year} data-chapter={c.title} className="wd-ch grid items-end gap-10 px-[var(--gutter)] md:grid-cols-12">
              <div className={`wd-img relative aspect-[16/10] overflow-clip md:col-span-7 ${i % 2 ? "md:order-2" : ""}`}>
                <Image src={c.image} alt={c.title} fill sizes="(min-width: 768px) 58vw, 100vw" quality={90} className="object-cover" />
              </div>
              <div className={`md:col-span-5 ${i % 2 ? "md:order-1" : "md:pl-[3vw]"}`}>
                <div className="overflow-clip"><p className="wd-reveal display text-7xl text-bronze md:text-8xl">{c.year}</p></div>
                <div className="overflow-clip"><h2 className="wd-reveal display mt-4 text-4xl md:text-5xl">{c.title}</h2></div>
                <div className="overflow-clip"><p className="wd-reveal mt-5 max-w-md text-[15px] leading-relaxed text-ink/65">{c.body}</p></div>
              </div>
            </article>
          ))}
        </div>
        </div>

        <Technology />
        <Craft />

        <section data-chapter="Presence" className="bg-sand px-[var(--gutter)] py-[16vh] text-ink">
          <p className="eyebrow mb-6 text-bronze">Presence</p>
          <h2 className="display mb-12 text-[clamp(2.6rem,6vw,5.5rem)]">Across <em>twelve</em> states</h2>
          <ul className="wd-states grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ink/10 pt-10 md:grid-cols-4">
            {presence.map((s) => <li key={s} className="wd-state font-display text-2xl text-ink/80 md:text-3xl">{s}</li>)}
          </ul>
        </section>

        <Spaces />
      </main>
      <Footer />
      <JourneyRail scope={root} />
    </div>
  );
}
