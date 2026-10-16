"use client";

import Link from "@/components/transition/TransitionLink";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { smoothScroll } from "@/lib/scroll";
import Logo from "./Logo";
import ScrambleText from "./ScrambleText";

export type MenuGroup = {
  title: string;
  links: { label: string; href: string; meta?: string; image?: string }[];
};

type Props = {
  /** Sub-brand shown next to the logo, e.g. "Sanitaryware". */
  site?: string;
  homeHref?: string;
  quickLinks: { label: string; href: string }[];
  menu: MenuGroup[];
  /** Colour of the header while it floats transparently over the hero. */
  tone?: "light" | "dark";
};

export default function Header({ site, homeHref = "/", quickLinks, menu, tone = "light" }: Props) {
  const bar = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const tl = useRef<gsap.core.Timeline>(null);

  // Hide on scroll down, reveal (frosted) on scroll up.
  useGSAP(() => {
    const el = bar.current!;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        el.dataset.solid = y > 80 ? "true" : "false";
        if (y < 120 || self.direction === -1) gsap.to(el, { yPercent: 0, duration: 0.6, ease: "expo.out", overwrite: "auto" });
        else gsap.to(el, { yPercent: -110, duration: 0.6, ease: "expo.out", overwrite: "auto" });
      },
    });
  });

  useGSAP(() => {
    const q = gsap.utils.selector(panel);
    tl.current = gsap.timeline({ paused: true, defaults: { ease: "expo.inOut" } })
      .set(panel.current, { visibility: "visible" })
      .fromTo(panel.current, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1 })
      .from(q(".mn-item"), { yPercent: 110, duration: 1, stagger: 0.025, ease: "expo.out" }, 0.45)
      .from(q(".mn-fade"), { autoAlpha: 0, y: 16, duration: 0.8, stagger: 0.05, ease: "power3.out" }, 0.6);
  });

  useEffect(() => {
    const t = tl.current;
    if (!t) return;
    if (open) {
      smoothScroll.stop();
      t.timeScale(1).play();
    } else {
      smoothScroll.start();
      t.timeScale(1.6).reverse();
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toneClass = tone === "light" ? "text-bone" : "text-ink";

  return (
    <>
      <header
        ref={bar}
        data-solid="false"
        className={`group/h fixed inset-x-0 top-0 z-50 h-[var(--header-h)] transition-[background-color,color,backdrop-filter] duration-500 ${open ? "text-bone" : toneClass}
          data-[solid=true]:bg-ink/55 data-[solid=true]:text-bone data-[solid=true]:backdrop-blur-xl`}
      >
        <div className="mx-auto grid h-full grid-cols-[1fr_auto_1fr] items-center px-[var(--gutter)]">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-3 justify-self-start"
            aria-expanded={open}
            aria-controls="site-menu"
          >
            <span className="relative block h-[10px] w-7">
              <span className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-500 ${open ? "translate-y-[5px] rotate-45" : ""}`} />
              <span className={`absolute bottom-0 left-0 h-px bg-current transition-all duration-500 ${open ? "w-full -translate-y-[4px] -rotate-45" : "w-4"}`} />
            </span>
            <span className="eyebrow roll"><span>{open ? "Close" : "Menu"}</span><span>{open ? "Close" : "Menu"}</span></span>
          </button>

          <Link href={homeHref} className="flex flex-col items-center gap-1" aria-label="AQUILO home" onClick={() => setOpen(false)}>
            <Logo className="h-[15px] w-auto md:h-[18px]" />
            {site && <span className="eyebrow text-[9px] tracking-[0.42em] opacity-70">{site}</span>}
          </Link>

          <nav className="hidden items-center gap-8 justify-self-end md:flex" aria-label="Quick links">
            {quickLinks.map((l) => (
              <Link key={l.href} href={l.href} className="eyebrow link-u">
                <ScrambleText text={l.label} />
              </Link>
            ))}
          </nav>
          <Link href={quickLinks.at(-1)?.href ?? "#"} className="eyebrow justify-self-end md:hidden">
            {quickLinks.at(-1)?.label}
          </Link>
        </div>
      </header>

      <div
        id="site-menu"
        ref={panel}
        className="invisible fixed inset-0 z-40 overflow-y-auto bg-graphite text-bone"
        data-lenis-prevent
        style={{ clipPath: "inset(0% 0% 100% 0%)" }}
      >
        <div className="grid min-h-full grid-cols-1 gap-10 px-[var(--gutter)] pb-16 pt-[calc(var(--header-h)+5vh)] lg:grid-cols-[1.4fr_1fr]">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 xl:grid-cols-3">
            {menu.map((g) => (
              <div key={g.title}>
                <p className="mn-fade eyebrow mb-5 text-champagne">{g.title}</p>
                <ul className="space-y-1.5">
                  {g.links.map((l) => (
                    <li key={l.href + l.label} className="overflow-clip">
                      <Link
                        href={l.href}
                        onMouseEnter={() => l.image && setPreview(l.image)}
                        onClick={() => setOpen(false)}
                        className="mn-item group flex items-baseline gap-3 font-display text-2xl leading-tight text-bone/85 transition-colors hover:text-bone md:text-[1.7rem]"
                      >
                        <span className="transition-transform duration-500 group-hover:translate-x-2">{l.label}</span>
                        {l.meta && <span className="font-sans text-[10px] tracking-widest text-bone/35">{l.meta}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mn-fade relative hidden overflow-clip rounded-sm bg-smoke lg:block">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={preview} src={preview} alt="" className="absolute inset-0 h-full w-full animate-[fadein_.7s_ease] object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <Logo className="w-1/2 text-bone/10" />
              </div>
            )}
            <style>{`@keyframes fadein{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:none}}`}</style>
          </div>
        </div>
      </div>
    </>
  );
}
