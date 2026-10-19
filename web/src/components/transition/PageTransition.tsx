"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { smoothScroll } from "@/lib/scroll";
import { pageLabel } from "@/data/site";

type Ctx = { go: (href: string) => void };
const TransitionContext = createContext<Ctx>({ go: () => {} });
export const usePageTransition = () => useContext(TransitionContext);

/**
 * Between pages: a graphite curtain rises, names the destination, the route changes behind it,
 * then the curtain lifts away from the top like water draining off glass.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState(() => pageLabel("/"));
  const pending = useRef<string | null>(null);
  const pendingHash = useRef<string | null>(null);
  const busy = useRef(false);

  const go = useCallback((href: string) => {
    const [path, hash] = href.split("#");
    if (busy.current) return;
    pendingHash.current = hash ?? null;
    if (prefersReducedMotion() || path === pathname) {
      router.push(href);
      return;
    }
    busy.current = true;
    pending.current = path;
    setLabel(pageLabel(path));
    smoothScroll.stop();
    const el = curtain.current!;
    const q = gsap.utils.selector(el);
    gsap.timeline()
      .set(el, { visibility: "visible" })
      .fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.inOut" })
      .fromTo(q(".pt-line"), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" }, 0.45)
      .fromTo(q(".pt-rule"), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "expo.inOut" }, 0.5)
      .add(() => router.push(href), 0.95);
  }, [pathname, router]);

  // Once the new route is in place, reset scroll and lift the curtain.
  useEffect(() => {
    if (!pending.current || pathname !== pending.current) return;
    pending.current = null;
    const el = curtain.current!;
    const q = gsap.utils.selector(el);
    smoothScroll.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    smoothScroll.start();
    requestAnimationFrame(() => ScrollTrigger.refresh());
    // A link like /#tap lands on the page, then glides to its section once the layout has settled.
    const hash = pendingHash.current;
    pendingHash.current = null;
    if (hash) setTimeout(() => smoothScroll.scrollTo(`#${hash}`, { offset: -10 }), 700);
    gsap.timeline({ delay: 0.35, onComplete: () => { busy.current = false; gsap.set(el, { visibility: "hidden" }); } })
      .to(q(".pt-line"), { yPercent: -110, duration: 0.7, stagger: 0.04, ease: "expo.in" })
      .to(q(".pt-rule"), { scaleX: 0, transformOrigin: "right", duration: 0.6, ease: "expo.in" }, 0)
      .to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, 0.4);
  }, [pathname]);

  return (
    <TransitionContext.Provider value={{ go }}>
      {children}
      <div ref={curtain} aria-hidden className="invisible fixed inset-0 z-[95] flex flex-col items-center justify-center bg-graphite text-bone" style={{ clipPath: "inset(100% 0% 0% 0%)" }}>
        <div className="overflow-clip"><p className="pt-line eyebrow text-champagne">{label.eyebrow}</p></div>
        <div className="overflow-clip pb-2"><p className="pt-line display text-[clamp(3.5rem,12vw,12rem)]">{label.title}</p></div>
        <span className="pt-rule mt-6 block h-px w-24 origin-left bg-champagne/60" />
      </div>
    </TransitionContext.Provider>
  );
}
