"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText, prefersReducedMotion } from "@/lib/gsap";

/**
 * Paragraph whose words light up one by one as it scrolls through the viewport.
 * Wrap keywords in *asterisks* to set them in the house accent colour (editorial emphasis).
 */
export default function ScrubText({ children, className, accentClass = "text-champagne", as: Tag = "p" }: {
  children: string;
  className?: string;
  accentClass?: string;
  as?: "p" | "h2" | "h3";
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const split = SplitText.create(ref.current!, { type: "words" });
    gsap.fromTo(split.words, { opacity: 0.14 }, {
      opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: ref.current, start: "top 82%", end: "bottom 45%", scrub: true },
    });
    return () => split.revert();
  });
  const parts = children.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <Tag ref={ref} className={className}>
      {parts.map((p, i) => (p.startsWith("*") ? <em key={i} className={`${accentClass} not-italic`}>{p.slice(1, -1)}</em> : p))}
    </Tag>
  );
}
