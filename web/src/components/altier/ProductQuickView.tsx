"use client";

import Image from "next/image";
import { useEffect } from "react";
import { smoothScroll } from "@/lib/scroll";
import { contact, type Collection, type Piece } from "@/data/site";

/**
 * The product quick view, shared by the collection pages and the showroom tour: the piece in its collection's
 * light, its details, Enquire and Specifications. Locks the page scroll while open and closes on Escape.
 * `note` adds one line above the details (the tour says where the piece is on display).
 */
export default function ProductQuickView({ piece, collection: c, onClose, note }: {
  piece: Piece | null;
  collection: Collection | null;
  onClose: () => void;
  note?: string;
}) {
  const open = !!piece && !!c;

  useEffect(() => {
    if (!open) return;
    smoothScroll.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { smoothScroll.start(); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={open ? `${piece.type} ${piece.code}` : undefined}
      className={`fixed inset-0 z-[60] grid transition-[opacity,visibility] duration-700 md:grid-cols-[1.3fr_1fr] ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      {open && (
        <>
          <div className="relative hidden md:block" style={{ background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${c.tone}, #070707 80%)` }}>
            <div className="absolute inset-[12%]"><Image src={piece.image} alt="" fill sizes="50vw" quality={90} className="cutout object-contain" /></div>
          </div>
          <aside className="relative flex flex-col justify-between bg-graphite p-[var(--gutter)] pt-[calc(var(--header-h)+4vh)] text-bone" data-lenis-prevent>
            <div>
              <div className="relative mb-8 aspect-square md:hidden"><Image src={piece.image} alt="" fill sizes="90vw" quality={90} className="cutout object-contain" /></div>
              <p className="eyebrow mb-4" style={{ color: c.accent }}>{c.name} · {c.finish}</p>
              <h3 className="display text-5xl md:text-6xl">{piece.type}</h3>
              {note && <p className="mt-4 text-sm text-bone/60">{note}</p>}
              <dl className="mt-10 divide-y divide-bone/10 border-y border-bone/10 text-sm">
                {[["Product code", piece.code], ["Room", piece.area], ["Size", piece.size], ["Finish", c.finish]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-4"><dt className="text-bone/50">{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Enquiry: ${piece.type} ${piece.code} (${c.name})`)}`} className="eyebrow rounded-full bg-bone px-6 py-4 text-onyx transition-colors duration-500 hover:bg-champagne">Enquire</a>
              <a href={piece.source} target="_blank" rel="noreferrer" className="eyebrow rounded-full border border-bone/25 px-6 py-4 transition-colors duration-500 hover:border-bone">Specifications</a>
              <button onClick={onClose} className="eyebrow px-4 py-4 text-bone/60 hover:text-bone">Close</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
