"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap, useGSAP, SplitText, onIntroDone } from "@/lib/gsap";
import { smoothScroll } from "@/lib/scroll";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrubText from "@/components/ScrubText";
import Link from "@/components/transition/TransitionLink";
import Arrow from "@/components/Arrow";
import { collections, contact, type Collection, type Piece } from "@/data/site";

/**
 * One collection: the hero piece floats in its own light and tilts with the cursor; the pieces can be
 * filtered by room and opened in a quick view; the next collection waits at the end.
 */
export default function CollectionDetail({ collection: c }: { collection: Collection }) {
  const root = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState("All");
  const [open, setOpen] = useState<Piece | null>(null);
  const areas = useMemo(() => ["All", ...Array.from(new Set(c.pieces.map((p) => p.area)))], [c]);
  const shown = area === "All" ? c.pieces : c.pieces.filter((p) => p.area === area);
  const idx = collections.findIndex((x) => x.slug === c.slug);
  const next = collections[(idx + 1) % collections.length];

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const split = SplitText.create(q(".cd-title")[0], { type: "chars", mask: "chars" });
    gsap.set(split.chars, { yPercent: 115 });
    gsap.set(q(".cd-in"), { autoAlpha: 0, y: 16 });
    gsap.set(q(".cd-piece"), { autoAlpha: 0, y: 80, scale: 0.92 });
    const off = onIntroDone(() => {
      gsap.timeline()
        .to(q(".cd-piece"), { autoAlpha: 1, y: 0, scale: 1, duration: 2.2, ease: "expo.out" }, 0)
        .to(split.chars, { yPercent: 0, duration: 1.5, stagger: 0.04, ease: "expo.out" }, 0.3)
        .to(q(".cd-in"), { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: "power3.out" }, 0.7);
    });
    gsap.to(q(".cd-name-bg"), { xPercent: -18, ease: "none", scrollTrigger: { trigger: q(".cd-hero")[0], start: "top top", end: "bottom top", scrub: true } });
    gsap.to(q(".cd-piece-wrap"), { yPercent: -18, ease: "none", scrollTrigger: { trigger: q(".cd-hero")[0], start: "top top", end: "bottom top", scrub: true } });
    return () => { off(); split.revert(); };
  }, { scope: root });

  // Re-run the card entrance whenever the room filter changes.
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    gsap.fromTo(q(".cd-card"), { y: 40, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.05, ease: "expo.out",
      scrollTrigger: { trigger: q(".cd-grid")[0], start: "top 85%" },
    });
  }, { scope: root, dependencies: [area], revertOnUpdate: true });

  // Hero piece tilts towards the cursor.
  useEffect(() => {
    const el = tilt.current;
    if (!el) return;
    const rx = gsap.quickTo(el, "rotateX", { duration: 1.2, ease: "expo.out" });
    const ry = gsap.quickTo(el, "rotateY", { duration: 1.2, ease: "expo.out" });
    const onMove = (e: PointerEvent) => {
      ry((e.clientX / window.innerWidth - 0.5) * 16);
      rx(-(e.clientY / window.innerHeight - 0.5) * 10);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Quick view: lock the page scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    smoothScroll.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => { smoothScroll.start(); window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={root} className="bg-onyx text-bone">
      <Header />
      <main>
        <section className="cd-hero relative h-[100svh] min-h-[620px] overflow-clip" style={{ background: `radial-gradient(ellipse 70% 60% at 62% 48%, ${c.tone} 0%, #070707 75%)` }}>
          <span aria-hidden className="cd-name-bg outline-type display pointer-events-none absolute left-[4vw] top-[16vh] whitespace-nowrap text-[clamp(7rem,24vw,26rem)] leading-none">{c.name}</span>
          <div className="spot absolute inset-0" />
          {c.hero && (
            <div className="cd-piece-wrap absolute inset-x-[8%] bottom-[14vh] top-[18vh] md:left-[42%] md:right-[6%]" style={{ perspective: "1200px" }}>
              <div ref={tilt} className="cd-piece relative h-full w-full will-change-transform">
                <Image src={c.hero} alt={`${c.name} by AQUILO Altier`} fill preload sizes="(min-width: 768px) 52vw, 84vw" quality={90} className="cutout object-contain" />
              </div>
            </div>
          )}
          <div className="absolute bottom-[10vh] left-[var(--gutter)] max-w-md">
            <nav aria-label="Breadcrumb" className="cd-in eyebrow mb-8 flex gap-3 text-bone/45">
              <Link href="/" className="link-u hover:text-bone">Altier</Link><span aria-hidden>/</span>
              <Link href="/collections" className="link-u hover:text-bone">Collections</Link>
            </nav>
            <p className="cd-in eyebrow mb-4" style={{ color: c.accent }}>{c.finish}</p>
            <h1 className="cd-title display text-[clamp(3.6rem,9vw,9rem)] leading-[0.9]">{c.name}</h1>
            <p className="cd-in mt-6 font-display text-2xl italic text-bone/80">{c.line}</p>
          </div>
          <p className="cd-in eyebrow absolute bottom-[var(--gutter)] right-[var(--gutter)] text-bone/45">{c.count} pieces</p>
        </section>

        <div className="bg-stone text-ink">
        <section className="px-[var(--gutter)] py-[18vh]">
          <p className="eyebrow mb-10 text-bronze">The story</p>
          <ScrubText accentClass="text-bronze" className="display max-w-[22ch] text-[clamp(2.2rem,5.4vw,5.4rem)] leading-[1.04]">{c.story}</ScrubText>
        </section>

        <section className="px-[var(--gutter)] pb-[16vh]">
          <div className="mb-12 flex flex-col justify-between gap-6 border-b border-ink/10 pb-6 md:flex-row md:items-end">
            <h2 className="display text-[clamp(2.6rem,5vw,5rem)]">The <em>pieces</em></h2>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by room">
              {areas.map((a) => (
                <button key={a} role="tab" aria-selected={area === a} onClick={() => setArea(a)}
                  className={`eyebrow rounded-full border px-5 py-2.5 transition-colors duration-500 ${area === a ? "border-ink bg-ink text-bone" : "border-ink/20 text-ink/70 hover:border-ink/60"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <ul className="cd-grid grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
            {shown.map((p) => (
              <li key={p.slug} className="cd-card">
                <button onClick={() => setOpen(p)} data-cursor="View" className="group block w-full text-left">
                  <div className="relative aspect-[4/5] overflow-clip" style={{ backgroundColor: c.paper }}>
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 55%, rgb(255 255 255 / 0.7), transparent 75%)" }} />
                    <div className="absolute inset-[12%] transition-transform duration-1000 ease-[var(--ease-lux)] group-hover:-translate-y-2 group-hover:scale-105">
                      <Image src={p.image} alt={`${p.type} ${p.code}`} fill sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw" quality={90} className="cutout-light object-contain" />
                    </div>
                    <span className="eyebrow absolute left-4 top-4 text-[10px] text-ink/45">{p.area}</span>
                  </div>
                  <p className="mt-4 font-display text-xl leading-tight">{p.type}</p>
                  <p className="mt-1 text-xs text-ink/50">{[p.code, p.size].filter(Boolean).join(", ")}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-[var(--gutter)] pb-[10vh]">
          <p className="eyebrow mb-6 text-ink/50">Other collections</p>
          <div className="flex gap-3 overflow-x-auto pb-4 [scrollbar-width:none]" data-lenis-prevent>
            {collections.filter((x) => x.slug !== c.slug).map((x) => (
              <Link key={x.slug} href={`/collections/${x.slug}`} data-cursor="View" className="group relative block aspect-[3/4] w-[46vw] shrink-0 overflow-clip md:w-[20vw]" style={{ backgroundColor: x.paper }}>
                {x.hero && (
                  <div className="absolute inset-[14%] transition-transform duration-1000 ease-[var(--ease-lux)] group-hover:scale-105">
                    <Image src={x.hero} alt="" fill sizes="20vw" quality={90} className="cutout-light object-contain" />
                  </div>
                )}
                <p className="absolute bottom-4 left-4 font-display text-2xl">{x.name}</p>
              </Link>
            ))}
          </div>
        </section>
        </div>

        <Link href={`/collections/${next.slug}`} className="group relative block overflow-clip border-t border-bone/10 px-[var(--gutter)] py-[14vh]" style={{ backgroundColor: next.tone }}>
          <p className="eyebrow mb-6 text-bone/50">Next collection</p>
          <p className="display text-[clamp(4rem,13vw,14rem)] leading-none transition-transform duration-1000 ease-[var(--ease-lux)] group-hover:translate-x-6">{next.name}</p>
          <span className="eyebrow mt-8 inline-flex items-center gap-3" style={{ color: next.accent }}>{next.finish} <Arrow /></span>
          {next.hero && (
            <div className="pointer-events-none absolute bottom-[8%] right-[6%] top-[8%] w-[30%] translate-y-6 opacity-60 transition-all duration-1000 ease-[var(--ease-lux)] group-hover:translate-y-0 group-hover:opacity-100">
              <Image src={next.hero} alt="" fill sizes="30vw" quality={90} className="cutout object-contain" />
            </div>
          )}
        </Link>
      </main>
      <Footer />

      {/* Quick view */}
      <div role="dialog" aria-modal="true" aria-label={open ? `${open.type} ${open.code}` : undefined}
        className={`fixed inset-0 z-[60] grid transition-[opacity,visibility] duration-700 md:grid-cols-[1.3fr_1fr] ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
        <button aria-label="Close" onClick={() => setOpen(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        {open && (
          <>
            <div className="relative hidden md:block" style={{ background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${c.tone}, #070707 80%)` }}>
              <div className="absolute inset-[12%]"><Image src={open.image} alt="" fill sizes="50vw" quality={90} className="cutout object-contain" /></div>
            </div>
            <aside className="relative flex flex-col justify-between bg-graphite p-[var(--gutter)] pt-[calc(var(--header-h)+4vh)]" data-lenis-prevent>
              <div>
                <div className="relative mb-8 aspect-square md:hidden"><Image src={open.image} alt="" fill sizes="90vw" quality={90} className="cutout object-contain" /></div>
                <p className="eyebrow mb-4" style={{ color: c.accent }}>{c.name} · {c.finish}</p>
                <h3 className="display text-5xl md:text-6xl">{open.type}</h3>
                <dl className="mt-10 divide-y divide-bone/10 border-y border-bone/10 text-sm">
                  {[["Product code", open.code], ["Room", open.area], ["Size", open.size], ["Finish", c.finish]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-4"><dt className="text-bone/50">{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Enquiry: ${open.type} ${open.code} (${c.name})`)}`} className="eyebrow rounded-full bg-bone px-6 py-4 text-onyx transition-colors duration-500 hover:bg-champagne">Enquire</a>
                <a href={open.source} target="_blank" rel="noreferrer" className="eyebrow rounded-full border border-bone/25 px-6 py-4 transition-colors duration-500 hover:border-bone">Specifications</a>
                <button onClick={() => setOpen(null)} className="eyebrow px-4 py-4 text-bone/60 hover:text-bone">Close</button>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
