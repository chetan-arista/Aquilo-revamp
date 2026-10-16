"use client";

import Link from "@/components/transition/TransitionLink";
import { useRef } from "react";
import { gsap, useGSAP, SplitText, onIntroDone } from "@/lib/gsap";
import Header from "./Header";
import Arrow from "./Arrow";
import LoopVideo from "./LoopVideo";
import { businesses, contact, gatewayMenu } from "@/data/site";

/**
 * Placeholder for AQUILO Exclusive / Altier until the client supplies their content.
 * Already uses each house's tone so the luxury progression is visible end-to-end.
 */
export default function HouseTeaser({ house }: { house: "exclusive" | "altier" }) {
  const b = businesses.find((x) => x.key === house)!;
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const split = SplitText.create(q(".t-name")[0], { type: "chars", mask: "chars" });
    gsap.set(split.chars, { yPercent: 110 });
    gsap.set(q(".t-in"), { autoAlpha: 0, y: 16 });
    gsap.set(q(".t-img"), { clipPath: "inset(50% 50% 50% 50%)" });
    const off = onIntroDone(() => {
      gsap.timeline()
        .to(q(".t-img"), { clipPath: "inset(0% 0% 0% 0%)", duration: 2, ease: "expo.inOut" })
        .to(split.chars, { yPercent: 0, duration: 1.4, stagger: 0.05, ease: "expo.out" }, 0.9)
        .to(q(".t-in"), { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: "power3.out" }, 1.3);
    });
    gsap.to(q(".t-img img, .t-img video"), { scale: 1.15, duration: 14, ease: "none", repeat: -1, yoyo: true });
    return () => { off(); split.revert(); };
  }, { scope: root });

  return (
    <div ref={root} style={{ backgroundColor: b.tone.bg, color: b.tone.fg }} className="min-h-[100svh]">
      <Header site={b.name} quickLinks={businesses.filter((x) => x.key !== house).map((x) => ({ label: x.name, href: x.href }))} menu={gatewayMenu} />
      <main className="relative grid min-h-[100svh] grid-rows-[1fr_auto] overflow-clip">
        <div className="t-img absolute inset-0">
          {b.video ? (
            <LoopVideo name={b.video} className="h-full w-full object-cover opacity-55" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.image} alt="" className="h-full w-full object-cover opacity-45" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${b.tone.bg} 8%, transparent 70%)` }} />
        </div>
        <div className="relative flex flex-col justify-end px-[var(--gutter)] pb-[8vh] pt-[30vh]">
          <p className="t-in eyebrow mb-4" style={{ color: b.tone.accent }}>{b.index} — {b.tier}</p>
          <p className="t-in eyebrow mb-1 opacity-60">AQUILO</p>
          <h1 className="t-name display text-[clamp(4.5rem,16vw,17rem)]">{b.name}</h1>
          <p className="t-in mt-6 max-w-lg text-[15px] leading-relaxed opacity-75">{b.intro}</p>
        </div>
        <div className="relative flex flex-col justify-between gap-6 border-t border-current/15 px-[var(--gutter)] py-6 md:flex-row md:items-center">
          <p className="t-in eyebrow opacity-60">The collection is being composed — unveiling soon.</p>
          <div className="t-in flex gap-8">
            <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`AQUILO ${b.name} — private preview`)}`} className="eyebrow link-u">Request a private preview</a>
            <Link href="/" className="eyebrow group inline-flex items-center gap-2">
              <Arrow className="rotate-180 transition-transform group-hover:-translate-x-1" /> The AQUILO World
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
