"use client";

import dynamic from "next/dynamic";
import Link from "@/components/transition/TransitionLink";
import JourneyRail from "@/components/JourneyRail";
import LoopVideo from "@/components/LoopVideo";
import WaterContours from "@/components/gl/WaterContours";
import { useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, onIntroDone, prefersReducedMotion } from "@/lib/gsap";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import ScrubText from "@/components/ScrubText";
import Arrow from "@/components/Arrow";
import { businesses, gatewayMenu } from "@/data/site";

const RainScene = dynamic(() => import("@/components/gl/RainScene"), { ssr: false });

export default function GatewayHome() {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [heroActive, setHeroActive] = useState(true);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const reduce = prefersReducedMotion();

    // ——— Intro (after loader) ———
    gsap.set(q(".hero-letter"), { yPercent: 120 });
    gsap.set(q(".hero-fade"), { autoAlpha: 0, y: 20 });
    const off = onIntroDone(() => {
      gsap.timeline()
        .to(q(".hero-letter"), { yPercent: 0, duration: 1.6, stagger: 0.06, ease: "expo.out" })
        .to(q(".hero-fade"), { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1, ease: "power3.out" }, 0.5);
    });

    // ——— Hero: dive into the rain ———
    ScrollTrigger.create({
      trigger: q(".hero")[0],
      start: "top top",
      end: "+=120%",
      pin: true,
      scrub: true,
      onUpdate: (s) => (progress.current = s.progress),
      onToggle: (s) => setHeroActive(s.isActive || s.progress < 1),
    });
    gsap.to(q(".hero-mark"), {
      scale: reduce ? 1 : 1.9, autoAlpha: 0, ease: "power2.in",
      scrollTrigger: { trigger: q(".hero")[0], start: "top top", end: "+=110%", scrub: true },
    });
    gsap.to(q(".hero-fade"), {
      autoAlpha: 0, y: -40, ease: "none",
      scrollTrigger: { trigger: q(".hero")[0], start: "top top", end: "+=40%", scrub: true },
    });

    // ——— Horizontal journey through the three houses ———
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const track = q(".journey-track")[0] as HTMLElement;
      const panels = q(".journey-panel") as HTMLElement[];
      const distance = () => track.scrollWidth - window.innerWidth;

      const scroll = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: q(".journey")[0],
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // Background and ink shift with each house: Luxury → Extra Luxury → Ultra Luxury.
      panels.forEach((panel) => {
        const bg = panel.dataset.bg!, fg = panel.dataset.fg!;
        ScrollTrigger.create({
          trigger: panel,
          containerAnimation: scroll,
          start: "left 55%",
          end: "right 55%",
          onToggle: (s) => s.isActive && gsap.to(q(".journey")[0], { backgroundColor: bg, color: fg, duration: 1, ease: "power2.out" }),
        });
        const img = panel.querySelector(".jp-img");
        const inner = panel.querySelector(".jp-img-inner");
        if (img) gsap.fromTo(img, { clipPath: "inset(18% 22% 18% 22%)" }, {
          clipPath: "inset(0% 0% 0% 0%)", ease: "none",
          scrollTrigger: { trigger: panel, containerAnimation: scroll, start: "left 95%", end: "left 15%", scrub: true },
        });
        if (inner) gsap.fromTo(inner, { xPercent: -12, scale: 1.25 }, {
          xPercent: 12, scale: 1.05, ease: "none",
          scrollTrigger: { trigger: panel, containerAnimation: scroll, start: "left right", end: "right left", scrub: true },
        });
        gsap.from(panel.querySelectorAll(".jp-reveal"), {
          yPercent: 110, duration: 1.2, stagger: 0.06, ease: "expo.out",
          scrollTrigger: { trigger: panel, containerAnimation: scroll, start: "left 65%", toggleActions: "play none none reverse" },
        });
      });

      gsap.to(q(".journey-progress"), {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: q(".journey")[0], start: "top top", end: () => `+=${distance()}`, scrub: true },
      });
    });

    // ——— Triptych entrance ———
    gsap.from(q(".tri-col"), {
      yPercent: 18, autoAlpha: 0, duration: 1.4, stagger: 0.12, ease: "expo.out",
      scrollTrigger: { trigger: q(".triptych")[0], start: "top 75%" },
    });

    return () => { off(); mm.revert(); };
  }, { scope: root });

  return (
    <div ref={root}>
      <Header quickLinks={[{ label: "Sanitaryware", href: "/sanitaryware" }, { label: "Exclusive", href: "/exclusive" }, { label: "Altier", href: "/altier" }]} menu={gatewayMenu} />

      <main>
        {/* ——— HERO ——— */}
        {/* wrapper keeps GSAP's pin-spacer out of React's child list */}
        <div>
        <section data-chapter="Rain" className="hero relative h-[100svh] overflow-clip bg-[radial-gradient(ellipse_at_50%_20%,#2a2722_0%,#12110f_60%)]">
          <div className="absolute inset-0">
            <RainScene progress={progress} active={heroActive} />
          </div>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[var(--gutter)]">
            <div className="hero-mark relative w-[min(86vw,1100px)] text-bone mix-blend-difference">
              <div className="flex overflow-clip">
                <HeroWordmark />
              </div>
            </div>
            <p className="hero-fade display mt-8 text-center text-2xl italic text-bone/80 md:text-4xl">
              One house. Three expressions of water.
            </p>
          </div>
          <div className="absolute inset-x-[var(--gutter)] bottom-[var(--gutter)] flex items-end justify-between text-bone/60">
            <p className="hero-fade eyebrow">Est. 2010 — India</p>
            <p className="hero-fade eyebrow flex items-center gap-3">
              <span className="block h-8 w-px origin-top animate-[drip_2.2s_ease-in-out_infinite] bg-champagne" />
              Scroll to enter
            </p>
            <p className="hero-fade eyebrow hidden md:block">Move to part the rain</p>
          </div>
          <style>{`@keyframes drip{0%{transform:scaleY(0)}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}`}</style>
        </section>
        </div>

        {/* ——— MANIFESTO ——— */}
        <section data-chapter="The House" className="relative overflow-clip bg-ink px-[var(--gutter)] py-[22vh]">
          <WaterContours color="#c8a97e" alpha={0.16} />
          <p className="eyebrow relative mb-10 text-champagne">The House of Water</p>
          <ScrubText className="display relative max-w-[22ch] text-[clamp(2.2rem,6vw,6.2rem)] leading-[1.02] text-bone">
            Since 2010, AQUILO has transformed the way India connects with *water*. Today, one house unfolds into *three worlds* — each a deeper register of *luxury*.
          </ScrubText>
        </section>

        {/* ——— HORIZONTAL JOURNEY ——— */}
        {/* wrapper keeps GSAP's pin-spacer out of React's child list */}
        <div>
        <section data-chapter="Three Houses" className="journey relative h-[100svh] overflow-clip" style={{ backgroundColor: "#12110f", color: "#ede8df" }}>
          <div className="journey-track flex h-full w-max items-stretch will-change-transform">
            <div className="flex w-[80vw] shrink-0 flex-col justify-end px-[var(--gutter)] pb-[14vh] md:w-[42vw]">
              <p className="eyebrow mb-6 opacity-60">The AQUILO World</p>
              <h2 className="display text-[clamp(3rem,8vw,8rem)]">Three<br /><em>houses</em></h2>
              <p className="mt-6 max-w-sm text-sm leading-relaxed opacity-70">Luxury, Extra Luxury, Ultra Luxury — one design language, deepening as you travel.</p>
            </div>
            {businesses.map((b) => (
              <article
                key={b.key}
                className="journey-panel grid h-full w-screen shrink-0 grid-rows-[1fr_auto] gap-6 px-[var(--gutter)] pb-[10vh] pt-[calc(var(--header-h)+4vh)] md:w-[92vw] md:grid-cols-[1fr_1.15fr] md:grid-rows-1 md:items-center md:gap-[5vw]"
                data-bg={b.tone.bg}
                data-fg={b.tone.fg}
              >
                <div className="order-2 md:order-1">
                  <div className="overflow-clip"><p className="jp-reveal eyebrow mb-5" style={{ color: b.tone.accent }}>{b.index} — {b.tier}</p></div>
                  <div className="overflow-clip"><p className="jp-reveal eyebrow mb-1 opacity-60">AQUILO</p></div>
                  <div className="overflow-clip"><h3 className="jp-reveal display text-[clamp(3.2rem,9vw,9.5rem)]">{b.name}</h3></div>
                  <div className="overflow-clip"><p className="jp-reveal mt-6 max-w-md text-[15px] leading-relaxed opacity-75">{b.intro}</p></div>
                  <div className="overflow-clip pt-8">
                    <Link href={b.href} className="jp-reveal group inline-flex items-center gap-4">
                      <span className="eyebrow roll"><span>Enter {b.name}</span><span>Enter {b.name}</span></span>
                      <span className="grid h-11 w-11 place-items-center rounded-full border border-current transition-colors duration-500 group-hover:bg-current">
                        <Arrow className="transition-colors duration-500 group-hover:text-[var(--hover)]" style={{ ["--hover" as string]: b.tone.bg }} />
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="jp-img relative order-1 h-full min-h-[34vh] overflow-clip md:order-2 md:h-[72vh]">
                  {b.video ? (
                    <LoopVideo name={b.video} label={`AQUILO ${b.name}`} className="jp-img-inner absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image} alt={`AQUILO ${b.name}`} className="jp-img-inner absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="absolute inset-x-[var(--gutter)] bottom-6 h-px bg-current/15">
            <span className="journey-progress block h-full origin-left scale-x-0 bg-current" />
          </div>
        </section>
        </div>

        {/* ——— TRIPTYCH: the three businesses side by side ——— */}
        <section data-chapter="Choose" className="triptych bg-ink px-[var(--gutter)] py-[16vh] text-bone">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="display text-[clamp(2.6rem,6vw,5.5rem)]">Choose your <em>world</em></h2>
            <p className="max-w-sm text-sm leading-relaxed opacity-60">Each house has its own site and its own level of luxury, under one AQUILO.</p>
          </div>
          <div className="flex flex-col gap-3 md:h-[78vh] md:flex-row">
            {businesses.map((b) => (
              <Link
                key={b.key}
                href={b.href}
                className="tri-col group relative flex h-[62vh] flex-col justify-between overflow-clip p-7 transition-[flex-grow] duration-700 ease-[var(--ease-lux)] md:h-auto md:flex-1 md:hover:flex-[1.7]"
                style={{ backgroundColor: b.tone.bg, color: b.tone.fg }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 transition-all duration-1000 ease-[var(--ease-lux)] group-hover:scale-100 group-hover:opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                <div className="relative flex justify-between">
                  <span className="eyebrow">{b.index}</span>
                  <span className="eyebrow" style={{ color: b.tone.accent }}>{b.tier}</span>
                </div>
                <div className="relative transition-colors duration-700 group-hover:text-bone">
                  <p className="eyebrow mb-2 opacity-70">AQUILO</p>
                  <h3 className="display text-5xl md:text-6xl">{b.name}</h3>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-0 transition-all duration-700 group-hover:opacity-90 max-md:opacity-80">{b.intro}</p>
                  <span className="eyebrow mt-6 inline-flex items-center gap-3">Visit <Arrow /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <JourneyRail scope={root} />
    </div>
  );
}

function HeroWordmark() {
  // Same traced wordmark, letters split for the entrance animation.
  return (
    <span className="relative block w-full">
      <Logo className="w-full" letterClass="hero-letter" registered={false} />
    </span>
  );
}
