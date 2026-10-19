"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import Link from "@/components/transition/TransitionLink";
import { centres } from "@/data/site";

/** Experience centres: a quiet list; the showroom follows the cursor as you hover each city. */
export default function Centres({ title = true }: { title?: boolean }) {
  const [centre, setCentre] = useState<number | null>(null);
  const cursorImg = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = cursorImg.current;
    if (!el) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    gsap.to(el, { x: e.clientX - r.left, y: e.clientY - r.top, duration: 0.8, ease: "expo.out" });
  };

  return (
    <section id="visit" data-chapter="Visit" className="relative bg-stone px-[var(--gutter)] py-[16vh] text-ink" onMouseMove={onMove} onMouseLeave={() => setCentre(null)}>
      {title && (
        <>
          <p className="eyebrow mb-6 text-bronze">Experience Centres</p>
          <h2 className="display mb-14 text-[clamp(2.8rem,6vw,6rem)]">Feel the <em>water</em> in person</h2>
        </>
      )}
      <ul className="border-t border-ink/15">
        {centres.map((c, i) => (
          <li key={c.city} onMouseEnter={() => setCentre(i)} className="group grid grid-cols-1 gap-2 border-b border-ink/15 py-8 md:grid-cols-[1fr_1.2fr_auto] md:items-center">
            <p className="display text-5xl transition-transform duration-700 ease-[var(--ease-lux)] group-hover:translate-x-4 md:text-7xl">{c.city}</p>
            <p className="max-w-md text-sm leading-relaxed text-ink/60">{c.address}</p>
            <div className="flex gap-6">
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("AQUILO " + c.address)}`} target="_blank" rel="noreferrer" className="eyebrow link-u">Directions</a>
              <Link href="/visit#appointment" className="eyebrow link-u text-bronze">Book a visit</Link>
            </div>
          </li>
        ))}
      </ul>
      <div ref={cursorImg} className="pointer-events-none absolute left-0 top-0 z-10 hidden md:block">
        <div className={`relative h-[34vh] w-[26vw] -translate-x-1/2 -translate-y-1/2 overflow-clip transition-[opacity,transform] duration-500 ${centre === null ? "scale-75 opacity-0" : "scale-100 opacity-100"}`}>
          {centres.map((c, i) => (
            <Image key={c.city} src={c.image} alt="" fill sizes="26vw" quality={90} className={`object-cover ${centre === i ? "block" : "hidden"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
