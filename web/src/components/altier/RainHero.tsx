"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, SplitText, onIntroDone } from "@/lib/gsap";
import { brand } from "@/data/site";

const RainLogoScene = dynamic(() => import("@/components/gl/RainLogoScene"), { ssr: false });

/**
 * Home hero, as on the original landing page: a round ceiling shower raining onto the AQUILO wordmark.
 * The letters are a real obstacle in the rain and the U holds the water that falls into it. Scrolling
 * follows the water down and dissolves into the next chapter, so the shower never stops on screen.
 */
export default function RainHero() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [visible, setVisible] = useState(true);

  // Render the 3D scene whenever any part of the hero is on screen (not just while it is pinned).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const word = SplitText.create(q(".rh-word")[0], { type: "chars", mask: "chars" });
    gsap.set(word.chars, { yPercent: 115 });
    gsap.set(q(".rh-in"), { autoAlpha: 0, y: 16 });
    const off = onIntroDone(() => {
      gsap.timeline({ delay: 0.3 })
        .to(word.chars, { yPercent: 0, duration: 1.6, stagger: 0.08, ease: "expo.out" })
        .to(q(".rh-in"), { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1, ease: "power3.out" }, 0.4);
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: root.current, start: "top top", end: "+=130%", pin: true, scrub: true,
        onUpdate: (s) => (progress.current = s.progress),
      },
    })
      .to(q(".rh-copy, .rh-bar"), { autoAlpha: 0, y: -30, ease: "power1.in", duration: 0.35 }, 0)
      // A soft dissolve into the next chapter instead of a hard edge.
      .fromTo(q(".rh-fade"), { autoAlpha: 0 }, { autoAlpha: 1, ease: "power1.in", duration: 0.3 }, 0.7);

    return () => { off(); word.revert(); };
  }, { scope: root });

  return (
    // wrapper keeps GSAP's pin-spacer out of React's child list
    <div>
      <section ref={root} id="rain" data-chapter="Rain" data-scene className="relative h-[100svh] overflow-clip bg-[radial-gradient(ellipse_at_50%_20%,#2a2722_0%,#12110f_60%)]">
        <div className="absolute inset-0">
          <RainLogoScene progress={progress} active={visible} />
        </div>

        <h1 className="sr-only">AQUILO Altier</h1>
        <div className="rh-copy pointer-events-none absolute inset-x-0 bottom-[17vh] flex flex-col items-center px-[var(--gutter)] text-center">
          <p aria-hidden className="rh-word display pl-[0.62em] text-[clamp(1.3rem,2.2vw,2.1rem)] tracking-[0.62em] text-bone/90">ALTIER</p>
          <p className="rh-in display mt-4 text-xl italic text-bone/75 md:text-3xl">{brand.line}</p>
        </div>

        <div className="rh-bar absolute inset-x-[var(--gutter)] bottom-[calc(var(--gutter)+18px)] flex items-end justify-center text-bone/60 md:bottom-[var(--gutter)] md:justify-between">
          <p className="rh-in eyebrow hidden md:block">Since 2010, India</p>
          <p className="rh-in eyebrow flex items-center gap-3">
            <span className="block h-8 w-px origin-top animate-[drip_2.2s_ease-in-out_infinite] bg-champagne" />
            Scroll to enter
          </p>
          <span className="hidden w-24 md:block" />
        </div>
        <div className="rh-fade pointer-events-none absolute inset-0 bg-onyx opacity-0" />
        <style>{`@keyframes drip{0%{transform:scaleY(0)}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}`}</style>
      </section>
    </div>
  );
}
