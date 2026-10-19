"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, SplitText, onIntroDone } from "@/lib/gsap";
import Link from "@/components/transition/TransitionLink";
import LoopVideo from "@/components/LoopVideo";

type Props = {
  eyebrow: string;
  title: string;
  line?: string;
  image?: string;
  video?: string;
  crumbs?: { label: string; href?: string }[];
};

/**
 * Inner page opening, after tgwc1853.com: full-bleed cinematic media with a slow drift, a centred
 * serif title rising letter by letter, and a parallax exit as the page begins.
 */
export default function PageHero({ eyebrow, title, line, image, video, crumbs = [] }: Props) {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const split = SplitText.create(q(".ph-title")[0], { type: "chars", mask: "chars" });
    gsap.set(split.chars, { yPercent: 115 });
    gsap.set(q(".ph-in"), { autoAlpha: 0, y: 14 });
    gsap.set(q(".ph-media"), { scale: 1.25 });
    const off = onIntroDone(() => {
      gsap.timeline()
        .to(q(".ph-media"), { scale: 1.08, duration: 2.6, ease: "expo.out" }, 0)
        .to(split.chars, { yPercent: 0, duration: 1.6, stagger: 0.045, ease: "expo.out" }, 0.25)
        .to(q(".ph-in"), { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: "power3.out" }, 0.7);
    });
    gsap.to(q(".ph-media-wrap"), { yPercent: 22, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
    gsap.to(q(".ph-copy"), { yPercent: -35, autoAlpha: 0, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "70% top", scrub: true } });
    return () => { off(); split.revert(); };
  }, { scope: root });

  return (
    <section ref={root} className="relative h-[100svh] min-h-[560px] overflow-clip bg-onyx text-bone">
      <div className="ph-media-wrap absolute inset-0">
        <div className="ph-media absolute inset-0">
          {video ? (
            <LoopVideo name={video} className="h-full w-full object-cover" />
          ) : image ? (
            <Image src={image} alt="" fill preload sizes="100vw" quality={90} className="object-cover" />
          ) : null}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-onyx" />
      <div className="ph-copy absolute inset-0 flex flex-col items-center justify-center px-[var(--gutter)] text-center">
        <p className="ph-in eyebrow mb-6 text-champagne">{eyebrow}</p>
        <h1 className="ph-title display text-[clamp(3.6rem,11vw,11rem)] leading-[0.9]">{title}</h1>
        {line && <p className="ph-in display mt-6 max-w-2xl text-xl italic text-bone/80 md:text-2xl">{line}</p>}
      </div>
      {crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="ph-in absolute bottom-[var(--gutter)] left-[var(--gutter)]">
          <ol className="eyebrow flex gap-3 text-bone/50">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex gap-3">
                {i > 0 && <span aria-hidden>/</span>}
                {c.href ? <Link href={c.href} className="link-u hover:text-bone">{c.label}</Link> : <span className="text-bone/80">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </section>
  );
}
