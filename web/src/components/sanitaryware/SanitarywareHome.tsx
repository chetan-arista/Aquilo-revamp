"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText, onIntroDone } from "@/lib/gsap";
import Header from "@/components/Header";
import JourneyRail from "@/components/JourneyRail";
import LoopVideo from "@/components/LoopVideo";
import WaterContours from "@/components/gl/WaterContours";
import Footer from "@/components/Footer";
import ScrubText from "@/components/ScrubText";
import Arrow from "@/components/Arrow";
import { centres, collections, finishes, heroModel, m, sanitarywareMenu, technologies } from "@/data/site";

const FaucetScene = dynamic(() => import("@/components/gl/FaucetScene"), { ssr: false });

const LEGACY = "https://www.aquilo.in";

const craftSteps = [
  { n: "01", t: "Brass ingot", d: "High-standard brass, chosen for strength and longevity.", img: m("craft-ingot") },
  { n: "02", t: "Sand core", d: "Cutting-edge cores define every internal waterway.", img: m("craft-core") },
  { n: "03", t: "Casting", d: "Pressure, speed and temperature, precisely controlled.", img: m("craft-casting") },
  { n: "04", t: "Machining", d: "CNC precision, then the human eye.", img: m("craft-machining") },
  { n: "05", t: "Polishing", d: "Robotic finesse meets the craftsman's hand.", img: m("craft-polishing") },
  { n: "06", t: "Plating", d: "Automated electroplating for an enduring glow.", img: m("craft-plating") },
  { n: "07", t: "Assembly", d: "Inspected, tested and sealed — nothing left unturned.", img: m("craft-assembly") },
];

const rainModes = [
  { word: "Rain", line: "Air-in droplets, full and soft.", img: m("rain-gold-1") },
  { word: "Mist", line: "A cloud of warmth that settles on the skin.", img: m("rain-gold-2") },
  { word: "Cascade", line: "A curtain of water, falling as one.", img: m("rain-gold-3") },
];

export default function SanitarywareHome() {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [finish, setFinish] = useState(0);
  const [flowing, setFlowing] = useState(false);
  const [heroActive, setHeroActive] = useState(true);
  const [centre, setCentre] = useState<number | null>(null);
  const cursorImg = useRef<HTMLDivElement>(null);
  const waterStatus = useRef<HTMLSpanElement>(null);
  // Written straight to the DOM: the status changes many times a second while the basin fills.
  const onWaterStatus = useCallback((text: string) => {
    if (waterStatus.current) waterStatus.current.textContent = text;
  }, []);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const mm = gsap.matchMedia();

    // ——— Hero entrance ———
    const title = SplitText.create(q(".hero-title")[0], { type: "lines", mask: "lines", linesClass: "split-line" });
    gsap.set(title.lines, { yPercent: 110 });
    gsap.set(q(".hero-in"), { autoAlpha: 0, y: 18 });
    const off = onIntroDone(() => {
      gsap.timeline({ delay: 0.1 })
        .to(title.lines, { yPercent: 0, duration: 1.5, stagger: 0.1, ease: "expo.out" })
        .to(q(".hero-in"), { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: "power3.out" }, 0.4)
        .add(() => setFlowing(true), 0.9);
    });

    ScrollTrigger.create({
      trigger: q(".hero")[0], start: "top top", end: "+=70%", pin: true, scrub: true,
      onUpdate: (s) => (progress.current = s.progress),
      onToggle: (s) => setHeroActive(s.isActive || s.progress < 1),
    });
    gsap.to(q(".hero-copy"), {
      yPercent: -18, autoAlpha: 0, ease: "power1.in",
      scrollTrigger: { trigger: q(".hero")[0], start: "top top", end: "+=65%", scrub: true },
    });

    // ——— Statement parallax images ———
    q(".float-img").forEach((el: HTMLElement) => {
      gsap.fromTo(el, { yPercent: Number(el.dataset.speed) * 30 }, {
        yPercent: Number(el.dataset.speed) * -30, ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
      });
    });

    // ——— Collections: horizontal journey ———
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const section = q(".collections")[0] as HTMLElement;
      const track = q(".col-track")[0] as HTMLElement;
      const distance = () => track.scrollWidth - window.innerWidth;
      const count = q(".col-panel").length;

      const scroll = gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: {
          trigger: section, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true,
          onUpdate: (s) => {
            const idx = Math.min(count, Math.max(1, Math.round(s.progress * (count - 1)) + 1));
            const n = q(".col-index")[0];
            if (n) n.textContent = String(idx).padStart(2, "0");
            gsap.set(q(".col-progress"), { scaleX: s.progress });
          },
        },
      });

      q(".col-panel").forEach((panel: HTMLElement) => {
        const product = panel.querySelector(".col-product");
        const name = panel.querySelector(".col-name");
        gsap.fromTo(product, { xPercent: 18, rotate: 4 }, {
          xPercent: -18, rotate: -4, ease: "none",
          scrollTrigger: { trigger: panel, containerAnimation: scroll, start: "left right", end: "right left", scrub: true },
        });
        gsap.fromTo(name, { xPercent: -10 }, {
          xPercent: 10, ease: "none",
          scrollTrigger: { trigger: panel, containerAnimation: scroll, start: "left right", end: "right left", scrub: true },
        });
      });
    });

    // ——— Showers: sticky crossfading sequence ———
    const frames = q(".rain-frame") as HTMLElement[];
    const words = q(".rain-word") as HTMLElement[];
    const rainTl = gsap.timeline({
      scrollTrigger: { trigger: q(".rain")[0], start: "top top", end: "bottom bottom", scrub: true },
    });
    frames.forEach((f, i) => {
      rainTl.fromTo(f, { scale: 1.18 }, { scale: 1, ease: "none", duration: 1 }, i);
      if (i > 0) {
        rainTl.fromTo(f, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.inOut", duration: 0.5 }, i - 0.25);
        rainTl.fromTo(words[i], { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.4 }, i - 0.2);
        rainTl.to(words[i - 1], { yPercent: -100, autoAlpha: 0, duration: 0.4 }, i - 0.2);
      }
    });

    // ——— Technology counters ———
    q(".tech-num").forEach((el: HTMLElement) => {
      const end = Number(el.dataset.value);
      const o = { v: 0 };
      gsap.to(o, {
        v: end, duration: 2, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
        onUpdate: () => (el.textContent = String(Math.round(o.v))),
      });
    });
    gsap.from(q(".tech-row"), {
      y: 60, autoAlpha: 0, duration: 1.2, stagger: 0.12, ease: "expo.out",
      scrollTrigger: { trigger: q(".tech-list")[0], start: "top 75%" },
    });

    // ——— Wellness: card expands to full-bleed ———
    gsap.fromTo(q(".well-frame"), { clipPath: "inset(14% 26% 14% 26% round 4px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
      scrollTrigger: { trigger: q(".wellness")[0], start: "top top", end: "+=100%", scrub: true, pin: true },
    });
    gsap.fromTo(q(".well-img"), { scale: 1.3 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: q(".wellness")[0], start: "top top", end: "+=100%", scrub: true },
    });
    gsap.from(q(".well-copy > *"), {
      yPercent: 60, autoAlpha: 0, stagger: 0.08, ease: "expo.out", duration: 1.2,
      scrollTrigger: { trigger: q(".wellness")[0], start: "top -55%", toggleActions: "play none none reverse" },
    });

    // ——— Craft & basins reveals ———
    q(".reveal-img").forEach((el: HTMLElement) => {
      gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, {
        clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
      const img = el.querySelector("img");
      if (img) gsap.fromTo(img, { yPercent: -8, scale: 1.15 }, {
        yPercent: 8, scale: 1.15, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
    gsap.from(q(".craft-step > div:last-child, .craft-step > p"), {
      y: 30, autoAlpha: 0, stagger: 0.07, duration: 1, ease: "expo.out",
      scrollTrigger: { trigger: q(".craft-steps")[0], start: "top 75%" },
    });

    return () => { off(); mm.revert(); title.revert(); };
  }, { scope: root });

  // Cursor-following preview for experience centres.
  const onVisitMove = (e: React.MouseEvent) => {
    const el = cursorImg.current;
    if (!el) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    gsap.to(el, { x: e.clientX - r.left, y: e.clientY - r.top, duration: 0.8, ease: "expo.out" });
  };

  return (
    <div ref={root} className="bg-stone text-ink">
      <Header site="Sanitaryware" homeHref="/sanitaryware" tone="dark" menu={sanitarywareMenu}
        quickLinks={[{ label: "Collections", href: "#collections" }, { label: "Wellness", href: "#wellness" }, { label: "Visit", href: "#visit" }]} />

      <main>
        {/* ——— HERO: interactive 3D mixer ——— */}
        {/* wrapper keeps GSAP's pin-spacer out of React's child list */}
        <div>
        <section data-chapter="Water" className="hero relative h-[100svh] overflow-clip bg-[radial-gradient(ellipse_at_70%_40%,#f4f5f6_0%,#dcdfe2_72%)]">
          <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
            <FaucetScene finish={finishes[finish]} flowing={flowing} progress={progress} active={heroActive} modelUrl={heroModel} onStatus={onWaterStatus} />
          </div>

          <div className="hero-copy pointer-events-none absolute inset-0 flex flex-col justify-end px-[var(--gutter)] pb-[12vh] md:justify-center md:pb-0">
            <p className="hero-in eyebrow mb-6 text-bronze">AQUILO Sanitaryware — Luxury</p>
            <h1 className="hero-title display max-w-[9ch] text-[clamp(3.6rem,10vw,10.5rem)]">Water, <em>composed.</em></h1>
            <p className="hero-in mt-6 max-w-sm text-[15px] leading-relaxed text-ink/70">
              Designer faucets, showers, basins and wellness — one complete bath suite, shaped around the way water moves.
            </p>

            <div className="hero-in pointer-events-auto mt-10 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Finish">
                {finishes.map((f, i) => (
                  <button
                    key={f.name}
                    role="radio"
                    aria-checked={finish === i}
                    aria-label={f.name}
                    title={f.name}
                    onClick={() => setFinish(i)}
                    className={`h-7 w-7 rounded-full border transition-transform duration-500 ${finish === i ? "scale-110 border-ink" : "border-ink/20 hover:scale-110"}`}
                    style={{ background: `radial-gradient(circle at 30% 30%, #fff8 0, ${f.color} 45%, ${f.color} 100%)` }}
                  />
                ))}
              </div>
              <span className="eyebrow text-ink/60">{finishes[finish].name}</span>
              <button onClick={() => setFlowing((v) => !v)} className="eyebrow group flex items-center gap-3 rounded-full border border-ink/25 px-5 py-3 transition-colors hover:bg-ink hover:text-stone">
                <span className={`block h-1.5 w-1.5 rounded-full ${flowing ? "bg-sky-500" : "bg-ink/40"}`} />
                <span className="roll"><span>{flowing ? "Close the tap" : "Open the tap"}</span><span>{flowing ? "Close the tap" : "Open the tap"}</span></span>
              </button>
              <span ref={waterStatus} aria-live="polite" className="eyebrow min-w-[14ch] text-sky-800/70" />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-[var(--gutter)] bottom-[var(--gutter)] hidden items-end justify-between text-ink/50 md:flex">
            <p className="hero-in eyebrow">Drag to turn · Morandi-inspired mixer</p>
            <p className="hero-in eyebrow">Scroll</p>
          </div>
        </section>
        </div>

        {/* ——— STATEMENT ——— */}
        <section data-chapter="Since 2010" className="relative overflow-clip px-[var(--gutter)] py-[24vh]">
          <WaterContours color="#9c7a4d" alpha={0.2} />
          <div className="float-img absolute right-[6vw] top-[8vh] hidden w-[17vw] md:block" data-speed="1.2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m("basin-blue")} alt="AQUILO designer stone basin in blue" className="aspect-[4/5] w-full object-cover" />
          </div>
          <div className="float-img absolute bottom-[6vh] left-[52vw] hidden w-[12vw] md:block" data-speed="2">
            <LoopVideo name="basin-flow" className="aspect-[3/4] w-full object-cover" />
          </div>
          <p className="eyebrow relative mb-10 text-bronze">Since 2010</p>
          <ScrubText accentClass="text-bronze" className="display relative max-w-[20ch] text-[clamp(2.2rem,5.6vw,5.8rem)] leading-[1.02]">
            An entire *bath suite*, conceived as one. Faucets, rain and mist, sculpted basins, steam and spa — environment-friendly, *endlessly considered*.
          </ScrubText>
        </section>

        {/* ——— COLLECTIONS: horizontal journey ——— */}
        {/* wrapper keeps GSAP's pin-spacer out of React's child list */}
        <div>
        <section id="collections" data-chapter="Collections" className="collections relative h-[100svh] overflow-clip bg-sand">
          <div className="absolute inset-x-[var(--gutter)] top-[calc(var(--header-h)+2vh)] z-10 flex items-center justify-between">
            <p className="eyebrow">Collections</p>
            <p className="eyebrow tabular-nums"><span className="col-index">01</span> / {String(collections.length).padStart(2, "0")}</p>
          </div>
          <div className="col-track flex h-full w-max will-change-transform">
            <div className="flex w-[86vw] shrink-0 flex-col justify-center px-[var(--gutter)] md:w-[46vw]">
              <h2 className="display text-[clamp(3.2rem,8vw,8.5rem)]">Eight<br /><em>signatures</em></h2>
              <p className="mt-8 max-w-sm text-[15px] leading-relaxed text-ink/70">
                Every AQUILO collection is a complete language — basin to shower to accessory — in up to six finishes. Choose the language; the bathroom follows.
              </p>
              <a href={`${LEGACY}/category/collections/`} className="link-u eyebrow mt-10 self-start">All collections</a>
            </div>

            {collections.map((c, i) => (
              <article key={c.name} className="col-panel relative flex h-full w-screen shrink-0 items-center md:w-[72vw]" style={{ backgroundColor: c.tone }}>
                <h3 className="col-name display pointer-events-none absolute left-[var(--gutter)] top-[22vh] whitespace-nowrap text-[clamp(4rem,13vw,14rem)] text-ink/90">
                  {c.name}
                </h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt={`${c.name} collection by AQUILO`} className="col-product cutout absolute bottom-[14vh] right-[6%] h-[48vh] w-auto max-w-[70%] object-contain md:h-[62vh]" />
                <div className="absolute bottom-[8vh] left-[var(--gutter)] max-w-xs">
                  <p className="eyebrow mb-3 text-ink/50">{String(i + 1).padStart(2, "0")} · {c.pieces} pieces</p>
                  <p className="font-display text-2xl italic leading-snug">{c.line}</p>
                  <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
                    {c.finishes.map((f) => <li key={f} className="text-xs text-ink/60">{f}</li>)}
                  </ul>
                  <a href={c.href} className="group mt-6 inline-flex items-center gap-3">
                    <span className="eyebrow roll"><span>Explore {c.name}</span><span>Explore {c.name}</span></span>
                    <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
                  </a>
                </div>
              </article>
            ))}
          </div>
          <div className="absolute inset-x-[var(--gutter)] bottom-5 h-px bg-ink/10">
            <span className="col-progress block h-full origin-left scale-x-0 bg-ink" />
          </div>
        </section>
        </div>

        {/* ——— SHOWERS: sticky sequence ——— */}
        <section data-chapter="Showers" className="rain relative h-[320vh] bg-ink text-bone">
          <div className="sticky top-0 grid h-[100svh] grid-rows-[1fr_auto] overflow-clip md:grid-cols-2 md:grid-rows-1">
            <div className="relative order-2 flex flex-col justify-end px-[var(--gutter)] pb-[10vh] md:order-1 md:justify-center md:pb-0">
              <p className="eyebrow mb-6 text-champagne">Showers</p>
              <div className="relative h-[clamp(4rem,11vw,11rem)] overflow-clip">
                {rainModes.map((r, i) => (
                  <h2 key={r.word} className="rain-word display absolute inset-0 text-[clamp(4rem,11vw,11rem)]" style={{ opacity: i === 0 ? 1 : 0 }}>
                    {r.word}<span className="text-champagne">.</span>
                  </h2>
                ))}
              </div>
              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-bone/70">
                Rain, rain curtain, spray, mist and waterfall — concealed ceiling showers with up to five functions, governed by thermostatic precision.
              </p>
              <a href={`${LEGACY}/category/showers/`} className="link-u eyebrow mt-8 self-start">Explore showers</a>
            </div>
            <div className="relative order-1 overflow-clip md:order-2">
              {rainModes.map((r, i) =>
                i === 0 ? (
                  <div key={r.word} className="rain-frame absolute inset-0" style={{ zIndex: i }}>
                    <LoopVideo name="rain-gold" label="AQUILO rain shower" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={r.word} src={r.img} alt={`AQUILO ${r.word.toLowerCase()} shower`} className="rain-frame absolute inset-0 h-full w-full object-cover" style={{ zIndex: i }} />
                ),
              )}
            </div>
          </div>
        </section>

        {/* ——— TECHNOLOGY ——— */}
        <section id="technology" data-chapter="Technology" className="relative overflow-clip bg-ink px-[var(--gutter)] py-[18vh] text-bone">
          <LoopVideo name="ceiling-rain" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="relative grid gap-16 md:grid-cols-[1fr_1.3fr]">
            <div className="md:sticky md:top-[20vh] md:self-start">
              <p className="eyebrow mb-6 text-champagne">Innovative Technologies</p>
              <h2 className="display text-[clamp(2.8rem,6vw,6rem)]">Engineered<br />beneath the <em>surface</em></h2>
            </div>
            <ul className="tech-list divide-y divide-bone/15 border-y border-bone/15">
              {technologies.map((t) => (
                <li key={t.title} className="tech-row grid grid-cols-[auto_1fr] items-baseline gap-8 py-10">
                  <p className="display w-[3.2ch] text-[clamp(3.5rem,7vw,6.5rem)] text-champagne">
                    <span className="tech-num" data-value={parseInt(t.value)}>{parseInt(t.value)}</span>
                    <span className="ml-1 align-top font-sans text-sm tracking-widest">{t.value.replace(/\d+/, "")}{t.unit}</span>
                  </p>
                  <div>
                    <h3 className="font-display text-3xl">{t.title}</h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-bone/65">{t.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ——— WELLNESS ——— */}
        {/* wrapper keeps GSAP's pin-spacer out of React's child list */}
        <div>
        <section id="wellness" data-chapter="Wellness" className="wellness relative h-[100svh] overflow-clip bg-stone">
          <div className="well-frame absolute inset-0 overflow-clip">
            <LoopVideo name="spa-sunset" label="AQUILO wellness bathtub at dusk" className="well-img absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          </div>
          <div className="well-copy absolute inset-x-[var(--gutter)] bottom-[10vh] text-bone">
            <p className="eyebrow mb-5 text-champagne">Wellness</p>
            <h2 className="display max-w-[12ch] text-[clamp(3rem,8vw,8rem)]">The ritual of <em>slowness</em></h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-bone/80">Jacuzzi bathtubs, multifunction steam rooms, steam generators, outdoor spas and swim spas.</p>
            <a href={`${LEGACY}/category/bathtub-jaccuzi/`} className="link-u eyebrow mt-8 inline-block">Discover wellness</a>
          </div>
        </section>
        </div>

        {/* ——— CRAFT ——— */}
        <section id="craft" data-chapter="Craft" className="px-[var(--gutter)] py-[18vh]">
          <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-6 text-bronze">Craftsmanship</p>
              <h2 className="display max-w-[14ch] text-[clamp(2.8rem,6vw,6rem)]">From brass ingot to <em>mirror finish</em></h2>
            </div>
            <p className="max-w-sm text-[15px] leading-relaxed text-ink/70">Seven disciplined steps stand behind every AQUILO faucet. Nothing is left unturned.</p>
          </div>
          <ol className="craft-steps grid gap-x-4 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {craftSteps.map((s, i) => (
              <li key={s.n} className={`craft-step group ${i % 4 === 1 || i % 4 === 3 ? "lg:mt-[8vh]" : ""}`}>
                <div className="reveal-img relative aspect-[4/5] overflow-clip bg-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt={s.t} className="absolute inset-0 h-full w-full object-cover grayscale-[.75] sepia-[.2] transition-[filter] duration-700 group-hover:grayscale-0 group-hover:sepia-0" />
                </div>
                <div className="mt-5 flex items-baseline gap-4">
                  <span className="eyebrow text-bronze">{s.n}</span>
                  <div>
                    <p className="font-display text-2xl">{s.t}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink/60">{s.d}</p>
                  </div>
                </div>
              </li>
            ))}
            <li className="craft-step flex items-end lg:mt-[8vh]">
              <p className="display text-[clamp(2rem,3.4vw,3.4rem)] italic text-bronze">Nothing left unturned.</p>
            </li>
          </ol>
        </section>

        {/* ——— BASINS EDITORIAL ——— */}
        <section data-chapter="Basins" className="bg-sand px-[var(--gutter)] py-[16vh]">
          <div className="grid gap-4 md:grid-cols-12 md:gap-6">
            <div className="md:col-span-5 md:pt-[10vh]">
              <p className="eyebrow mb-6 text-bronze">Basins</p>
              <h2 className="display text-[clamp(2.8rem,6vw,6rem)]">Sculpted in stone, concrete &amp; <em>glass</em></h2>
              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink/70">Bali stone, handmade and ceramic — table-top and free-standing forms that anchor the room.</p>
              <a href={`${LEGACY}/category/table-top-basins/`} className="link-u eyebrow mt-8 inline-block">Explore basins</a>
            </div>
            <div className="reveal-img relative aspect-[4/5] overflow-clip md:col-span-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m("basin-concrete")} alt="Designer concrete basin" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="flex flex-col gap-4 md:col-span-3 md:mt-[18vh] md:gap-6">
              <div className="reveal-img relative aspect-square overflow-clip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m("basin-red")} alt="Designer stone basin in red" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="reveal-img relative aspect-square overflow-clip bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m("basin-dark-rosegold")} alt="Free-standing basin in black and rose gold" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* ——— VISIT ——— */}
        <section id="visit" data-chapter="Visit" className="relative px-[var(--gutter)] py-[16vh]" onMouseMove={onVisitMove} onMouseLeave={() => setCentre(null)}>
          <p className="eyebrow mb-6 text-bronze">Experience Centres</p>
          <h2 className="display mb-14 text-[clamp(2.8rem,6vw,6rem)]">Feel the <em>water</em> in person</h2>
          <ul className="border-t border-ink/15">
            {centres.map((c, i) => (
              <li key={c.city} onMouseEnter={() => setCentre(i)} className="group grid grid-cols-1 gap-2 border-b border-ink/15 py-8 md:grid-cols-[1fr_1.2fr_auto] md:items-center">
                <p className="display text-5xl transition-transform duration-700 ease-[var(--ease-lux)] group-hover:translate-x-4 md:text-7xl">{c.city}</p>
                <p className="max-w-md text-sm leading-relaxed text-ink/60">{c.address}</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("AQUILO " + c.address)}`} target="_blank" rel="noreferrer" className="eyebrow link-u justify-self-start">Directions</a>
              </li>
            ))}
          </ul>
          <div ref={cursorImg} className="pointer-events-none absolute left-0 top-0 z-10 hidden md:block">
            <div className={`-translate-x-1/2 -translate-y-1/2 overflow-clip transition-[opacity,transform] duration-500 ${centre === null ? "scale-75 opacity-0" : "scale-100 opacity-100"}`}>
              {centres.map((c, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={c.city} src={c.image} alt="" className={`h-[34vh] w-[26vw] object-cover ${centre === i ? "block" : "hidden"}`} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer tone="dark" />
      <JourneyRail scope={root} />
    </div>
  );
}
