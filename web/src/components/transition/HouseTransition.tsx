"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { smoothScroll } from "@/lib/scroll";
import { houseForPath, type House } from "@/data/houses";

type Ctx = { go: (href: string) => void };
const TransitionContext = createContext<Ctx>({ go: () => {} });
export const useHouseTransition = () => useContext(TransitionContext);

/**
 * Journey between houses: a curtain in the destination house's tone rises, names the house,
 * the route changes behind it, then the curtain lifts away to reveal the new world.
 */
export default function HouseTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<House | null>(null);
  const pending = useRef<string | null>(null);
  const busy = useRef(false);

  const go = useCallback((href: string) => {
    const [path] = href.split("#");
    if (busy.current) return;
    if (prefersReducedMotion() || path === pathname) {
      router.push(href);
      return;
    }
    busy.current = true;
    pending.current = path;
    const house = houseForPath(path);
    setTarget(house);
    smoothScroll.stop();
    const el = curtain.current!;
    const q = gsap.utils.selector(el);
    gsap.timeline()
      .set(el, { visibility: "visible", backgroundColor: house.tone.bg, color: house.tone.fg })
      .fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.inOut" })
      .fromTo(q(".ht-line"), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" }, 0.45)
      .add(() => router.push(href), 0.95);
  }, [pathname, router]);

  // Once the new route is in place, reset scroll and lift the curtain.
  useEffect(() => {
    if (!pending.current || !pathname.startsWith(pending.current)) return;
    pending.current = null;
    const el = curtain.current!;
    const q = gsap.utils.selector(el);
    smoothScroll.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    smoothScroll.start();
    requestAnimationFrame(() => ScrollTrigger.refresh());
    gsap.timeline({ delay: 0.35, onComplete: () => { busy.current = false; gsap.set(el, { visibility: "hidden" }); } })
      .to(q(".ht-line"), { yPercent: -110, duration: 0.7, stagger: 0.04, ease: "expo.in" })
      .to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, 0.4);
  }, [pathname]);

  return (
    <TransitionContext.Provider value={{ go }}>
      {children}
      <div ref={curtain} aria-hidden className="invisible fixed inset-0 z-[95] flex flex-col items-center justify-center" style={{ clipPath: "inset(100% 0% 0% 0%)" }}>
        <div className="overflow-clip"><p className="ht-line eyebrow opacity-60">{target?.key === "aquilo" ? "Returning to" : "AQUILO"}</p></div>
        <div className="overflow-clip pb-2"><p className="ht-line display text-[clamp(3.5rem,12vw,12rem)]">{target?.key === "aquilo" ? "AQUILO" : target?.name}</p></div>
        <div className="overflow-clip"><p className="ht-line eyebrow" style={{ color: target?.tone.accent }}>{target?.tier}</p></div>
      </div>
    </TransitionContext.Provider>
  );
}
