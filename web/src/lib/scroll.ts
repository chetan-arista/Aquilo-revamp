import type Lenis from "lenis";

let instance: Lenis | null = null;

/** Shared handle to the smooth-scroll instance (null when reduced motion disables it). */
export const smoothScroll = {
  set: (l: Lenis | null) => void (instance = l),
  stop: () => instance?.stop(),
  start: () => instance?.start(),
  scrollTo: (target: number | string | HTMLElement, opts?: { immediate?: boolean; offset?: number }) => {
    if (instance) instance.scrollTo(target, { duration: 1.6, ...opts });
    else if (typeof target === "number") window.scrollTo(0, target);
    else (typeof target === "string" ? document.querySelector(target) : target)?.scrollIntoView();
  },
};
