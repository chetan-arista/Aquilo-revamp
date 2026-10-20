"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type PanoramaViewerComponent from "@/components/gl/PanoramaViewer";
import type { PanoHandle } from "@/components/gl/PanoramaViewer";
import ProductQuickView from "@/components/altier/ProductQuickView";
import Link from "@/components/transition/TransitionLink";
import { pieceBySlug } from "@/data/site";
import { centreBySlug, type Tour, type TourMarker } from "@/data/showrooms";

// Client only (WebGL); the cast keeps the viewer's marker type parameter, which dynamic() drops.
const PanoramaViewer = dynamic(() => import("@/components/gl/PanoramaViewer"), { ssr: false }) as typeof PanoramaViewerComponent;

type Resolved = TourMarker & { piece?: NonNullable<ReturnType<typeof pieceBySlug>> };

/**
 * The showroom virtual tour (feature 3, rich/03-showroom-virtual-tour.md): walk between the spots of an
 * experience centre, every product on display marked with a soft light. Hover (tap on touch) shows a card; a
 * click opens the same quick view as the collection pages. "In this room" turns the camera to each piece.
 * Built on PanoramaViewer; the tour data is data/showrooms.ts (Tour).
 */
export default function ShowroomTour({ tour, initialSpot, initialProduct, closeHref = "/visit" }: {
  tour: Tour;
  initialSpot?: string;
  initialProduct?: string;
  closeHref?: string;
}) {
  const centre = centreBySlug(tour.centre);
  const [spotId, setSpotId] = useState(() => (tour.spots.some((s) => s.id === initialSpot) ? initialSpot! : tour.start));
  const spot = tour.spots.find((s) => s.id === spotId) ?? tour.spots[0];
  const viewer = useRef<PanoHandle>(null);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<Resolved | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lastPointer = useRef<string>("mouse");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const markers = useMemo<Resolved[]>(() => spot.markers.map((m) => (m.kind === "product" ? { ...m, piece: pieceBySlug(m.slug) ?? undefined } : m)), [spot]);
  const products = markers.filter((m) => m.kind === "product" && m.piece);

  // Deep link (?product=): once the first panorama is up, turn to that product and show its card.
  const deepLinked = useRef(false);
  const onStatus = (status: "loading" | "ready" | "error") => {
    if (status !== "ready") return;
    setReady(true);
    if (deepLinked.current || !initialProduct) return;
    deepLinked.current = true;
    const m = markers.find((x) => x.kind === "product" && x.slug === initialProduct);
    if (m) { viewer.current?.lookAt({ yaw: m.yaw, pitch: m.pitch, fov: 55 }); setActive(m.id); }
  };

  // Warm the cache with the panoramas one step away, so walking there is instant.
  useEffect(() => {
    if (!ready) return;
    const next = new Set(spot.markers.flatMap((m) => (m.kind === "link" ? [tour.spots.find((s) => s.id === m.to)?.panorama] : [])).filter(Boolean) as string[]);
    next.forEach((url) => fetch(url, { priority: "low" } as RequestInit).catch(() => {}));
  }, [ready, spot, tour.spots]);

  const go = useCallback((to: string, from?: TourMarker) => {
    setActive(null);
    setTouched(true);
    // Face the doorway first, then step through.
    if (from) viewer.current?.lookAt({ yaw: from.yaw, pitch: from.pitch }, 0.45);
    window.setTimeout(() => setSpotId(to), from ? 380 : 0);
  }, []);

  const focusProduct = (m: Resolved) => {
    viewer.current?.lookAt({ yaw: m.yaw, pitch: m.pitch, fov: 55 });
    setActive(m.id);
    setListOpen(false);
  };

  const onMarker = (m: Resolved) => {
    setTouched(true);
    if (m.kind === "link") return go(m.to, m);
    // Touch: the first tap shows the card, the second opens the piece. A mouse opens at once (it hovered).
    if (lastPointer.current !== "mouse" && active !== m.id) return setActive(m.id);
    setOpen(m);
  };

  const closeQuickView = useCallback(() => setOpen(null), []);
  const directions = centre ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`AQUILO ${centre.address}`)}` : undefined;

  return (
    <div className="fixed inset-0 bg-onyx text-bone" onPointerDownCapture={(e) => { lastPointer.current = e.pointerType; }}>
      <PanoramaViewer<Resolved>
        className="absolute inset-0"
        src={spot.panorama}
        startView={spot.view}
        autoRotate={!reducedMotion && !active && !open && touched === false}
        resetKey={0}
        handle={viewer}
        markers={markers}
        onStatus={onStatus}
        onPick={() => { setActive(null); setTouched(true); }}
        renderMarker={(m) => (m.kind === "link"
          ? <LinkMarker label={m.label ?? tour.spots.find((s) => s.id === m.to)?.title ?? "Next"} onClick={() => onMarker(m)} />
          : <ProductMarker m={m} active={active === m.id} onEnter={() => lastPointer.current === "mouse" && setActive(m.id)} onLeave={() => lastPointer.current === "mouse" && setActive((a) => (a === m.id ? null : a))} onClick={() => onMarker(m)} />)}
      />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/60 to-transparent px-[var(--gutter)] pb-16 pt-6">
        <div className="pointer-events-auto">
          <p className="eyebrow text-[10px] text-champagne md:text-xs">AQUILO Experience Centre</p>
          <h1 className="display mt-2 text-[clamp(1.8rem,4vw,3rem)] leading-none">{centre?.city ?? tour.title}</h1>
          <p className="mt-2 text-sm text-bone/60">{spot.title}</p>
        </div>
        <nav className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <Link href="/visit" className="eyebrow rounded-full bg-bone px-4 py-2.5 text-[10px] text-onyx transition-colors duration-500 hover:bg-champagne md:px-5 md:py-3 md:text-xs">Book a visit</Link>
          {directions && <a href={directions} target="_blank" rel="noreferrer" className="eyebrow hidden rounded-full border border-bone/30 px-5 py-3 transition-colors duration-500 hover:border-bone md:inline-block">Directions</a>}
          <Link href={closeHref} aria-label="Close the tour" className="eyebrow rounded-full border border-bone/30 px-4 py-2.5 text-[10px] transition-colors duration-500 hover:border-bone md:py-3 md:text-xs">Close</Link>
        </nav>
      </header>

      {/* Spots */}
      {tour.spots.length > 1 && (
        <nav aria-label="Spots in this showroom" className="absolute bottom-6 left-[var(--gutter)] right-[var(--gutter)] flex gap-2 overflow-x-auto pr-28 [scrollbar-width:none] md:right-auto md:max-w-[60vw] md:flex-wrap md:overflow-visible md:pr-0" data-lenis-prevent>
          {tour.spots.map((s) => (
            <button key={s.id} onClick={() => go(s.id)} aria-current={s.id === spot.id}
              className={`eyebrow shrink-0 rounded-full border px-4 py-2.5 text-[10px] backdrop-blur-md transition-colors duration-500 ${s.id === spot.id ? "border-bone bg-bone text-onyx" : "border-bone/25 bg-black/30 hover:border-bone/70"}`}>
              {s.title}
            </button>
          ))}
        </nav>
      )}

      {/* In this room */}
      {products.length > 0 && (
        // Sits above the site's sound toggle (bottom right).
        <aside className="absolute bottom-20 right-[var(--gutter)] flex max-h-[65vh] w-[min(320px,80vw)] flex-col items-end gap-2">
          {listOpen && (
            <ul className="w-full overflow-y-auto rounded-sm border border-bone/15 bg-black/55 p-2 backdrop-blur-xl" data-lenis-prevent>
              {products.map((m) => (
                <li key={m.id}>
                  <button onClick={() => focusProduct(m)} className={`flex w-full items-center gap-3 rounded-sm p-2 text-left transition-colors hover:bg-bone/10 ${active === m.id ? "bg-bone/10" : ""}`}>
                    <span className="relative size-12 shrink-0 rounded-sm bg-bone/5"><Image src={m.piece!.piece.image} alt="" fill sizes="48px" className="cutout object-contain p-1" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{m.label ?? m.piece!.piece.type}</span>
                      <span className="block truncate text-[11px] text-bone/50">{m.piece!.collection.name} · {m.piece!.collection.finish}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}
            className="eyebrow rounded-full border border-bone/25 bg-black/40 px-5 py-3 text-[10px] backdrop-blur-md transition-colors duration-500 hover:border-bone/70">
            In this room · {products.length}
          </button>
        </aside>
      )}

      {/* First visit hint */}
      <p className={`pointer-events-none absolute bottom-40 left-1/2 w-[80vw] -translate-x-1/2 text-center text-xs text-bone/70 transition-opacity duration-1000 md:bottom-24 md:w-auto ${ready && !touched && !active ? "opacity-100" : "opacity-0"}`}>
        Drag to look around · Select a light to see the piece
      </p>
      {!ready && <p className="eyebrow pointer-events-none absolute inset-0 grid place-items-center text-bone/50">Opening the showroom</p>}

      <ProductQuickView piece={open?.piece?.piece ?? null} collection={open?.piece?.collection ?? null} onClose={closeQuickView}
        note={centre ? `On display at the ${centre.city} Experience Centre, ${spot.title.toLowerCase()}.` : undefined} />
    </div>
  );
}

function ProductMarker({ m, active, onEnter, onLeave, onClick }: { m: Resolved; active: boolean; onEnter: () => void; onLeave: () => void; onClick: () => void }) {
  const p = m.piece;
  if (!p) return null;
  const name = m.label ?? p.piece.type;
  return (
    <div className="relative -translate-x-1/2 -translate-y-1/2" onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <button onClick={onClick} onFocus={onEnter} onBlur={onLeave} aria-label={`${name}, ${p.collection.name} in ${p.collection.finish}`} data-cursor="View"
        className="group grid size-11 place-items-center rounded-full outline-none">
        <span className={`absolute size-7 rounded-full bg-champagne/40 motion-safe:animate-ping ${active ? "opacity-0" : ""}`} />
        <span className={`relative size-3.5 rounded-full border-2 border-champagne bg-bone shadow-[0_0_18px_rgba(200,169,126,0.9)] transition-transform duration-500 ${active ? "scale-125" : "group-hover:scale-125"} group-focus-visible:ring-2 group-focus-visible:ring-bone`} />
      </button>
      <div className={`pointer-events-none absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 transition-all duration-500 ${active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
        <div className="flex gap-3 rounded-sm border border-bone/15 bg-black/70 p-3 backdrop-blur-xl">
          <span className="relative size-16 shrink-0 rounded-sm bg-bone/5"><Image src={p.piece.image} alt="" fill sizes="64px" className="cutout object-contain p-1" /></span>
          <span className="min-w-0 self-center">
            <span className="block text-sm leading-tight">{name}</span>
            <span className="mt-1 block text-[11px] text-bone/55">{p.piece.code}</span>
            <span className="mt-1 block text-[11px] text-champagne">{p.collection.name} · {p.collection.finish}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function LinkMarker({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} data-cursor="Walk" aria-label={`Walk to ${label}`}
      className="eyebrow flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-bone/40 bg-black/45 px-4 py-2.5 text-[10px] backdrop-blur-md transition-colors duration-500 hover:border-bone hover:bg-black/65">
      <svg aria-hidden width="14" height="14" viewBox="0 0 14 14"><path d="M2 7h9M7.5 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
      {label}
    </button>
  );
}
