"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type PanoramaViewerComponent from "@/components/gl/PanoramaViewer";
import type { PanoHandle, PanoPick, PanoView } from "@/components/gl/PanoramaViewer";
import { centres, collections, pieceBySlug } from "@/data/site";
import { centreSlug, type Tour, type TourMarker, type TourSpot } from "@/data/showrooms";

const PanoramaViewer = dynamic(() => import("@/components/gl/PanoramaViewer"), { ssr: false }) as typeof PanoramaViewerComponent;

type Pano = { file: string; title: string };
type Mode = "look" | "product" | "link";
const PANO = "/lab/360/pano/";
const uid = (kind: string) => `${kind}-${Math.random().toString(36).slice(2, 8)}`;
const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Dev-only showroom tour editor (feature 3, rich/03-showroom-virtual-tour.md). Add spots (one panorama each),
 * then click in the panorama to pin a product (picked from the catalogue) or a link to another spot, set where
 * each spot starts, save, play, and export the JSON for web/src/data/showrooms/<centre>.json.
 * Test panoramas come from the git-ignored test-assets/360; the real tour uses AQUILO's own captures.
 */
export default function TourEditor() {
  const [panos, setPanos] = useState<Pano[]>([]);
  const [tour, setTour] = useState<Tour>({ id: "demo", centre: "nagpur", title: "Nagpur showroom (test)", start: "", spots: [] });
  const [spotId, setSpotId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("look");
  const [pending, setPending] = useState<PanoPick | null>(null);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const viewer = useRef<PanoHandle>(null);
  const lastView = useRef<PanoView>({ yaw: 0, pitch: 0, fov: 75 });

  useEffect(() => {
    fetch(`${PANO}manifest.json`).then((r) => r.json()).then(setPanos).catch(() => {});
    fetch("/lab/360/tours/demo").then((r) => (r.ok ? r.json() : null)).then((t: Tour | null) => {
      if (t) { setTour(t); setSpotId(t.start || t.spots[0]?.id || null); }
    });
  }, []);

  const spot = tour.spots.find((s) => s.id === spotId) ?? null;
  const updateSpot = (patch: Partial<TourSpot>) => setTour((t) => ({ ...t, spots: t.spots.map((s) => (s.id === spotId ? { ...s, ...patch } : s)) }));
  const addSpot = (p: Pano) => {
    const id = uid("spot");
    setTour((t) => ({ ...t, start: t.start || id, spots: [...t.spots, { id, title: `Spot ${t.spots.length + 1}`, panorama: `${PANO}${p.file}`, markers: [] }] }));
    setSpotId(id);
  };
  const removeSpot = (id: string) => {
    setTour((t) => {
      const spots = t.spots.filter((s) => s.id !== id).map((s) => ({ ...s, markers: s.markers.filter((m) => m.kind !== "link" || m.to !== id) }));
      return { ...t, spots, start: t.start === id ? spots[0]?.id ?? "" : t.start };
    });
    if (spotId === id) setSpotId(null);
  };
  const addMarker = (m: TourMarker) => { if (spot) updateSpot({ markers: [...spot.markers, m] }); setPending(null); setQuery(""); };

  const pieces = useMemo(() => collections.flatMap((c) => c.pieces.map((p) => ({ p, c }))), []);
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? pieces.filter(({ p, c }) => `${p.type} ${p.code} ${c.name} ${c.finish}`.toLowerCase().includes(q)) : pieces).slice(0, 40);
  }, [query, pieces]);

  async function save() {
    setSaved("Saving…");
    const r = await fetch(`/lab/360/tours/${tour.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tour) });
    setSaved(r.ok ? `Saved ${new Date().toLocaleTimeString()}` : "Save failed");
  }
  function exportJson() {
    // Production tours point at the published images, not the dev route.
    const out = { ...tour, spots: tour.spots.map((s) => ({ ...s, panorama: `/media/showrooms/${tour.centre}/${s.id}.webp` })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${tour.centre}.json` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="grid h-dvh grid-cols-[340px_1fr] bg-onyx text-bone">
      <aside className="flex flex-col gap-6 overflow-y-auto border-r border-bone/10 p-5" data-lenis-prevent>
        <div>
          <p className="eyebrow text-champagne">Tour editor · dev only</p>
          <h1 className="display mt-2 text-3xl">Showroom tour</h1>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <label className="col-span-2 block"><span className="text-[11px] text-bone/50">Title</span>
              <input value={tour.title} onChange={(e) => setTour({ ...tour, title: e.target.value })} className="mt-1 w-full rounded-sm border border-bone/15 bg-transparent px-3 py-2 outline-none focus:border-bone/50" /></label>
            <label className="col-span-2 block"><span className="text-[11px] text-bone/50">Experience centre</span>
              <select value={tour.centre} onChange={(e) => setTour({ ...tour, centre: e.target.value })} className="mt-1 w-full rounded-sm border border-bone/15 bg-onyx px-3 py-2">
                {centres.map((c) => <option key={c.city} value={centreSlug(c.city)}>{c.city}</option>)}
              </select></label>
          </div>
        </div>

        <div>
          <h2 className="eyebrow mb-2 text-bone/60">Spots</h2>
          <ul className="space-y-1">
            {tour.spots.map((s) => (
              <li key={s.id} className={`flex items-center justify-between rounded-sm px-3 py-2 text-sm ${s.id === spotId ? "bg-bone/10" : "hover:bg-bone/5"}`}>
                <button onClick={() => setSpotId(s.id)} className="flex-1 truncate text-left">{s.title}{tour.start === s.id ? " · start" : ""}</button>
                <span className="text-[11px] text-bone/40">{s.markers.length}</span>
              </li>
            ))}
          </ul>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-bone/60">+ Add a spot from a panorama</summary>
            <ul className="mt-2 space-y-1">
              {panos.map((p) => <li key={p.file}><button onClick={() => addSpot(p)} className="w-full truncate rounded-sm px-3 py-1.5 text-left text-xs text-bone/70 hover:bg-bone/5">{p.title || p.file}</button></li>)}
            </ul>
          </details>
        </div>

        {spot && (
          <div className="space-y-3 text-sm">
            <h2 className="eyebrow text-bone/60">This spot</h2>
            <input value={spot.title} onChange={(e) => updateSpot({ title: e.target.value })} className="w-full rounded-sm border border-bone/15 bg-transparent px-3 py-2 outline-none focus:border-bone/50" />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => updateSpot({ view: { yaw: r1(lastView.current.yaw), pitch: r1(lastView.current.pitch), fov: Math.round(lastView.current.fov) } })} className="rounded-full border border-bone/20 px-3 py-1.5 text-xs hover:border-bone/60">Start view = current</button>
              <button onClick={() => setTour({ ...tour, start: spot.id })} className="rounded-full border border-bone/20 px-3 py-1.5 text-xs hover:border-bone/60">Tour starts here</button>
              <button onClick={() => removeSpot(spot.id)} className="rounded-full border border-red-400/40 px-3 py-1.5 text-xs text-red-300 hover:border-red-300">Remove spot</button>
            </div>
            <h3 className="eyebrow pt-2 text-bone/60">Markers</h3>
            <ul className="space-y-1">
              {spot.markers.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-bone/5">
                  <button onClick={() => viewer.current?.lookAt(m)} className="flex-1 truncate text-left text-xs">
                    {m.kind === "product" ? (pieceBySlug(m.slug)?.piece.type ?? m.slug) : `→ ${tour.spots.find((s) => s.id === m.to)?.title ?? m.to}`}
                    <span className="text-bone/40"> · {r1(m.yaw)}°, {r1(m.pitch)}°</span>
                  </button>
                  <button aria-label="Remove marker" onClick={() => updateSpot({ markers: spot.markers.filter((x) => x.id !== m.id) })} className="text-xs text-bone/40 hover:text-red-300">✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-bone/10 pt-4">
          <button onClick={save} disabled={!tour.spots.length} className="eyebrow rounded-full bg-bone px-5 py-2.5 text-[10px] text-onyx disabled:opacity-30">Save</button>
          <a href={`/lab/tour?id=${tour.id}${spot ? `&spot=${spot.id}` : ""}`} className="eyebrow rounded-full border border-bone/30 px-5 py-2.5 text-[10px]">Play</a>
          <button onClick={exportJson} disabled={!tour.spots.length} className="eyebrow rounded-full border border-bone/30 px-5 py-2.5 text-[10px] disabled:opacity-30">Export JSON</button>
          {saved && <span className="text-[11px] text-bone/50">{saved}</span>}
        </div>
      </aside>

      <section className="relative">
        {spot ? (
          <PanoramaViewer<TourMarker>
            className="absolute inset-0"
            src={spot.panorama}
            startView={spot.view}
            autoRotate={false}
            resetKey={0}
            handle={viewer}
            markers={spot.markers}
            onView={(v) => { lastView.current = v; }}
            onPick={(p) => { if (mode !== "look") setPending(p); }}
            renderMarker={(m) => (
              <span className={`flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] ${m.kind === "product" ? "bg-champagne text-onyx" : "border border-bone/50 bg-black/60"}`}>
                {m.kind === "product" ? `● ${pieceBySlug(m.slug)?.piece.type ?? m.slug}` : `→ ${tour.spots.find((s) => s.id === m.to)?.title ?? "?"}`}
              </span>
            )}
          />
        ) : (
          <p className="grid h-full place-items-center text-sm text-bone/50">Add a spot from a panorama to begin.</p>
        )}

        {spot && (
          <div className="absolute left-4 top-4 flex gap-1 rounded-full border border-bone/15 bg-black/50 p-1 backdrop-blur-md">
            {(["look", "product", "link"] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setPending(null); }} className={`eyebrow rounded-full px-4 py-2 text-[10px] ${mode === m ? "bg-bone text-onyx" : "text-bone/70"}`}>
                {m === "look" ? "Look" : m === "product" ? "Pin a product" : "Pin a link"}
              </button>
            ))}
          </div>
        )}
        {spot && mode !== "look" && !pending && <p className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs">Click where the {mode === "product" ? "product" : "doorway"} is</p>}

        {pending && spot && (
          <div className="absolute right-4 top-4 flex max-h-[80vh] w-80 flex-col rounded-sm border border-bone/15 bg-graphite p-4 shadow-2xl">
            <p className="text-xs text-bone/50">At {r1(pending.yaw)}°, {r1(pending.pitch)}°</p>
            {mode === "product" ? (
              <>
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the catalogue" className="mt-3 rounded-sm border border-bone/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-bone/50" />
                <ul className="mt-3 flex-1 space-y-1 overflow-y-auto" data-lenis-prevent>
                  {found.map(({ p, c }) => (
                    <li key={p.slug}>
                      <button onClick={() => addMarker({ id: uid("p"), kind: "product", slug: p.slug, yaw: r1(pending.yaw), pitch: r1(pending.pitch) })} className="flex w-full items-center gap-3 rounded-sm p-1.5 text-left hover:bg-bone/10">
                        <span className="relative size-10 shrink-0 rounded-sm bg-bone/5"><Image src={p.image} alt="" fill sizes="40px" className="cutout object-contain p-0.5" /></span>
                        <span className="min-w-0"><span className="block truncate text-xs">{p.type}</span><span className="block truncate text-[10px] text-bone/45">{p.code} · {c.name}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <ul className="mt-3 space-y-1">
                {tour.spots.filter((s) => s.id !== spot.id).map((s) => (
                  <li key={s.id}><button onClick={() => addMarker({ id: uid("l"), kind: "link", to: s.id, yaw: r1(pending.yaw), pitch: r1(pending.pitch) })} className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-bone/10">→ {s.title}</button></li>
                ))}
                {tour.spots.length < 2 && <li className="text-xs text-bone/50">Add another spot first.</li>}
              </ul>
            )}
            <button onClick={() => setPending(null)} className="mt-3 self-end text-xs text-bone/50 hover:text-bone">Cancel</button>
          </div>
        )}
      </section>
    </main>
  );
}
