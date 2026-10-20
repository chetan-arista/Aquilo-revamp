"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, SplitText } from "@/lib/gsap";
import { smoothScroll } from "@/lib/scroll";
import LoopVideo from "@/components/LoopVideo";

const SPECS = [
  { k: "60 bar", v: "Pressure it withstands" },
  { k: "400,000", v: "Cartridge cycles" },
  { k: "3 or 5", v: "Outlets" },
  { k: "9 + chrome", v: "Finishes" },
];

/**
 * The GoSlide film from the AQUILO site. A silent cinemascope teaser (the title free part of the film,
 * cropped) loops in a wide frame that opens as it arrives; Play shows the full film in a cinema overlay.
 */
export default function Film() {
  const root = useRef<HTMLElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [now, setNow] = useState(0);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const title = SplitText.create(q(".fl-title")[0], { type: "lines", mask: "lines" });
    gsap.from(title.lines, { yPercent: 110, duration: 1.5, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: root.current, start: "top 65%" } });
    gsap.fromTo(q(".fl-frame"), { clipPath: "inset(18% 12% 18% 12% round 4px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
      scrollTrigger: { trigger: q(".fl-frame")[0], start: "top 90%", end: "center 55%", scrub: true },
    });
    gsap.fromTo(q(".fl-frame video"), { scale: 1.2 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: q(".fl-frame")[0], start: "top bottom", end: "bottom top", scrub: true },
    });
    gsap.from(q(".fl-spec"), { y: 30, autoAlpha: 0, duration: 1.2, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: q(".fl-specs")[0], start: "top 88%" } });
    return () => title.revert();
  }, { scope: root });

  // Cinema overlay: lock the page, play from the start, close on Escape.
  useEffect(() => {
    const v = player.current;
    if (!open || !v) return;
    smoothScroll.stop();
    v.currentTime = 0;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === " ") { e.preventDefault(); if (v.paused) v.play(); else v.pause(); }
    };
    const onTime = () => {
      if (bar.current) bar.current.style.transform = `scaleX(${v.duration ? v.currentTime / v.duration : 0})`;
      setNow(Math.floor(v.currentTime));
    };
    window.addEventListener("keydown", onKey);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.pause();
      smoothScroll.start();
      window.removeEventListener("keydown", onKey);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [open]);

  const togglePlay = () => {
    const v = player.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = player.current;
    if (!v || !v.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  };

  return (
    <section ref={root} id="film" data-chapter="Film" className="relative bg-onyx px-[var(--gutter)] py-[16vh] text-bone">
      <div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-6 text-champagne">The film · GoSlide</p>
          <h2 className="fl-title display max-w-[14ch] text-[clamp(2.8rem,6vw,6rem)]">Shower control at your <em>fingertips</em></h2>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-bone/60">
          A thermostatic slider that holds 38°C and governs every outlet with one touch: volume at any position, stepless, silent.
        </p>
      </div>

      <div className="fl-frame relative aspect-[1600/576] w-full overflow-clip bg-graphite">
        <LoopVideo name="goslide-teaser" label="GoSlide thermostatic shower controller by AQUILO" className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-onyx/50 via-transparent to-transparent" />
        <button
          onClick={() => setOpen(true)}
          data-magnetic
          data-cursor="Play"
          aria-label="Play the GoSlide film"
          className="group absolute bottom-[8%] left-[4%] flex items-center gap-4 md:bottom-[12%]"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full border border-bone/40 bg-onyx/30 backdrop-blur-md transition-colors duration-500 group-hover:border-bone group-hover:bg-bone group-hover:text-onyx md:h-20 md:w-20">
            <svg viewBox="0 0 24 24" className="ml-1 h-5 w-5" fill="currentColor" aria-hidden><path d="M7 4.5v15l12-7.5z" /></svg>
          </span>
          <span className="eyebrow">Play the film <span className="text-bone/50">0:35</span></span>
        </button>
      </div>

      <dl className="fl-specs mt-12 grid grid-cols-2 gap-8 border-t border-bone/10 pt-10 md:grid-cols-4">
        {SPECS.map((s) => (
          <div key={s.k} className="fl-spec">
            <dt className="display text-4xl text-bone md:text-5xl">{s.k}</dt>
            <dd className="eyebrow mt-3 text-bone/50">{s.v}</dd>
          </div>
        ))}
      </dl>

      {/* Cinema overlay */}
      <div role="dialog" aria-modal="true" aria-label="GoSlide film" className={`fixed inset-0 z-[70] flex flex-col bg-black transition-[opacity,visibility] duration-700 ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
        <div className="flex items-center justify-between px-[var(--gutter)] py-5 text-bone">
          <p className="eyebrow text-bone/60">AQUILO · GoSlide</p>
          <button onClick={() => setOpen(false)} className="eyebrow link-u" aria-label="Close the film">Close</button>
        </div>
        <div className="relative flex-1">
          <video
            ref={player}
            src="/media/video/goslide-film.mp4"
            poster="/media/video/goslide-film.jpg"
            playsInline
            muted={muted}
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setOpen(false)}
            onClick={togglePlay}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
        <div className="flex items-center gap-6 px-[var(--gutter)] py-6 text-bone">
          <button onClick={togglePlay} className="eyebrow w-16 text-left" aria-label={playing ? "Pause" : "Play"}>{playing ? "Pause" : "Play"}</button>
          <div onClick={seek} className="relative h-6 flex-1 cursor-pointer" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={35} aria-valuenow={now} tabIndex={0}>
            <span className="absolute inset-x-0 top-1/2 block h-px bg-bone/20" />
            <span ref={bar} className="absolute inset-x-0 top-1/2 block h-px origin-left scale-x-0 bg-champagne" />
          </div>
          <button onClick={() => setMuted((m) => !m)} className="eyebrow w-20 text-right" aria-pressed={!muted}>{muted ? "Sound off" : "Sound on"}</button>
        </div>
      </div>
    </section>
  );
}
