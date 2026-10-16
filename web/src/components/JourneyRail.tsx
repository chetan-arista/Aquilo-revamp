"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { smoothScroll } from "@/lib/scroll";

/**
 * Chapter rail for the scroll journey. Reads every [data-chapter] section inside `scope`,
 * marks the one in view, shows overall progress, and lets visitors jump between chapters.
 */
export default function JourneyRail({ scope }: { scope: RefObject<HTMLElement | null> }) {
  const [chapters, setChapters] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const bar = useRef<HTMLSpanElement>(null);
  const mobileBar = useRef<HTMLSpanElement>(null);
  const sections = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const triggers: ScrollTrigger[] = [];
    // Defer so the page's own pinned sections exist first; low priority so positions include their pin spacing.
    const id = requestAnimationFrame(() => {
      const els = Array.from(scope.current?.querySelectorAll<HTMLElement>("[data-chapter]") ?? []);
      sections.current = els;
      setChapters(els.map((e) => e.dataset.chapter!));
      // Active chapter = last section whose top has passed 55% of the viewport. Reading live positions
      // (not precomputed trigger ranges) stays correct through pinned sections and their pin spacing.
      const pick = () => {
        const line = window.innerHeight * 0.55;
        let idx = 0;
        els.forEach((el, i) => { if (el.getBoundingClientRect().top <= line) idx = i; });
        setActive(idx);
      };
      pick();
      triggers.push(ScrollTrigger.create({
        start: 0, end: "max", refreshPriority: -1,
        onUpdate: (s) => {
          pick();
          if (bar.current) bar.current.style.transform = `scaleY(${s.progress})`;
          if (mobileBar.current) mobileBar.current.style.transform = `scaleX(${s.progress})`;
        },
      }));
      ScrollTrigger.refresh();
    });
    return () => { cancelAnimationFrame(id); triggers.forEach((t) => t.kill()); };
  }, [scope]);

  if (!chapters.length) return null;

  const jump = (i: number) => {
    // Pinned sections sit inside a pin-spacer; scroll to the spacer so the jump lands at the pin start.
    const el = sections.current[i];
    const target = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
    smoothScroll.scrollTo(target.getBoundingClientRect().top + window.scrollY);
  };

  return (
    <>
      <nav aria-label="Page chapters" className="pointer-events-none fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 text-white mix-blend-difference lg:block">
        <div className="relative flex flex-row-reverse gap-4">
          <span className="relative block w-px bg-white/25">
            <span ref={bar} className="absolute inset-0 origin-top bg-white" style={{ transform: "scaleY(0)" }} />
          </span>
          <ol className="pointer-events-auto flex flex-col items-end gap-3 py-1">
            {chapters.map((c, i) => (
              <li key={c}>
                <button onClick={() => jump(i)} className="group flex flex-row-reverse items-center gap-3 text-right" aria-current={i === active ? "step" : undefined}>
                  <span className={`eyebrow text-[9px] tabular-nums transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-40 group-hover:opacity-80"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`eyebrow overflow-clip whitespace-nowrap text-[9px] transition-all duration-700 ease-[var(--ease-lux)] ${i === active ? "max-w-40 opacity-100" : "max-w-0 opacity-0 group-hover:max-w-40 group-hover:opacity-60"}`}>
                    {c}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>
      {/* Mobile: thin progress line + current chapter */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-40 text-white mix-blend-difference lg:hidden">
        <p className="eyebrow mb-2 ml-[var(--gutter)] text-[9px] opacity-70">{String(active + 1).padStart(2, "0")} — {chapters[active]}</p>
        <span className="block h-px w-full bg-white/20"><span ref={mobileBar} className="block h-full origin-left bg-white" style={{ transform: "scaleX(0)" }} /></span>
      </div>
    </>
  );
}
