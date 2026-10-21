"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Environment } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type PanoramaViewerComponent from "@/components/gl/PanoramaViewer";
import type { PanoHandle, PanoLook } from "@/components/gl/PanoramaViewer";
import { ProductStudio, type Finish } from "@/components/product/ProductOrbit";
import { DragController, PlacedCutout, PlacedModel, type Drag, type Placed } from "@/components/studio/PlacedItems";
import { collections, contact, type Collection, type Piece } from "@/data/site";
import { analyseRoom, suggestCollections, type RoomStyle, type Suggestion } from "@/lib/studio/roomStyle";

const PanoramaViewer = dynamic(() => import("@/components/gl/PanoramaViewer"), { ssr: false }) as typeof PanoramaViewerComponent;

export type SampleRoom = { name: string; src: string };
/** A product with a 3D model (feature 1). */
export type ModelProduct = { slug: string; name: string; url: string; finishes: Finish[]; arHref?: string };
type Room = { name: string; src: string; panorama: boolean; own: boolean };

const AREAS = ["Basin", "Shower", "Bath", "Accessories"] as const;
const SIZE_BY_AREA: Record<string, number> = { Basin: 0.9, Shower: 1.8, Bath: 1.3, Accessories: 0.7 };
const MAX_ITEMS = 8;
const uid = () => Math.random().toString(36).slice(2, 9);
const whatsapp = contact.phoneHref.replace(/\D/g, "");

/**
 * Try it in your room (feature 2, rich/02-room-panorama-try-on.md). The visitor brings a 360 panorama or a
 * normal photo (or picks a sample room); it opens in the panorama viewer, the studio reads the room's colours
 * and suggests collections, and the visitor places products, swaps finishes, compares before and after, saves,
 * shares or sends it to a consultant. Everything stays on the device until the visitor sends it.
 */
export default function RoomStudio({ samples, models, arHref }: { samples: SampleRoom[]; models: ModelProduct[]; arHref?: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const openFile = useCallback(async (file: File) => {
    const bmp = await createImageBitmap(file);
    const panorama = Math.abs(bmp.width / bmp.height - 2) < 0.06;
    bmp.close();
    setRoom((old) => {
      if (old?.own) URL.revokeObjectURL(old.src);
      return { name: panorama ? "Your 360 photo" : "Your photo", src: URL.createObjectURL(file), panorama, own: true };
    });
  }, []);
  if (!room) return <Start samples={samples} onFile={openFile} onSample={(s) => setRoom({ name: s.name, src: s.src, panorama: true, own: false })} arHref={arHref} hasModels={models.length > 0} />;
  return <Editor key={room.src} room={room} models={models} arHref={arHref} onNewRoom={() => setRoom((old) => { if (old?.own) URL.revokeObjectURL(old.src); return null; })} />;
}

function Start({ samples, onFile, onSample, arHref, hasModels }: { samples: SampleRoom[]; onFile: (f: File) => void; onSample: (s: SampleRoom) => void; arHref?: string; hasModels: boolean }) {
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; };
  const card = "group relative flex flex-col justify-between overflow-clip rounded-sm border border-bone/15 bg-graphite p-6 transition-colors duration-500 hover:border-bone/40";
  return (
    <main className="min-h-dvh bg-onyx px-[var(--gutter)] pb-24 pt-12 text-bone">
      <p className="eyebrow text-champagne">AQUILO Studio</p>
      <h1 className="display mt-3 max-w-3xl text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.95]">Try it in your own room</h1>
      <p className="mt-5 max-w-xl text-sm text-bone/60">Bring a photo of your washroom, place our pieces in it and try every finish. Your photo stays on your device unless you choose to send it.</p>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <label className={`${card} cursor-pointer`}>
          <span><span className="eyebrow text-champagne">1</span><span className="mt-3 block font-display text-2xl">Use your photo</span>
            <span className="mt-2 block text-sm text-bone/55">A 360 panorama (Photo Sphere, panorama mode) or a normal wide photo of the room.</span></span>
          <span className="eyebrow mt-8 inline-block self-start rounded-full bg-bone px-5 py-3 text-[10px] text-onyx">Choose a photo</span>
          <input type="file" accept="image/*" onChange={pick} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Choose a photo of your room" />
        </label>
        <label className={`${card} cursor-pointer`}>
          <span><span className="eyebrow text-champagne">2</span><span className="mt-3 block font-display text-2xl">Take one now</span>
            <span className="mt-2 block text-sm text-bone/55">On a phone: stand in the doorway and capture the basin or shower wall.</span></span>
          <span className="eyebrow mt-8 inline-block self-start rounded-full border border-bone/30 px-5 py-3 text-[10px]">Open the camera</span>
          <input type="file" accept="image/*" capture="environment" onChange={pick} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Take a photo of your room" />
        </label>
        <div className={card}>
          <span><span className="eyebrow text-champagne">3</span><span className="mt-3 block font-display text-2xl">See it live in your space</span>
            <span className="mt-2 block text-sm text-bone/55">Augmented reality on your phone: the piece at true size, through your camera. For pieces with a 3D model.</span></span>
          {arHref && hasModels ? <a href={arHref} className="eyebrow mt-8 inline-block self-start rounded-full border border-bone/30 px-5 py-3 text-[10px]">Open AR</a>
            : <span className="mt-8 text-xs text-bone/40">Coming with the 3D catalogue.</span>}
        </div>
      </div>
      {samples.length > 0 && (
        <section className="mt-16">
          <h2 className="eyebrow mb-4 text-bone/50">Or start from a sample room</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {samples.map((s) => (
              <button key={s.src} onClick={() => onSample(s)} className="group relative aspect-[2/1] overflow-clip rounded-sm bg-graphite text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt="" loading="lazy" className="size-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100" />
                <span className="absolute bottom-2 left-3 text-xs">{s.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Editor({ room, models, arHref, onNewRoom }: { room: Room; models: ModelProduct[]; arHref?: string; onNewRoom: () => void }) {
  const viewer = useRef<PanoHandle>(null);
  const dragRef = useRef<Drag>(null);
  const [items, setItems] = useState<Placed[]>([]);
  const [history, setHistory] = useState<Placed[][]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [showProducts, setShowProducts] = useState(true);
  const [photoFov, setPhotoFov] = useState(70);
  const [ready, setReady] = useState(false);
  const [style, setStyle] = useState<RoomStyle | null>(null);
  const [tab, setTab] = useState<string>("Suggested");
  const [drawer, setDrawer] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    analyseRoom(room.src, room.panorama).then((s) => alive && setStyle(s)).catch(() => {});
    return () => { alive = false; };
  }, [room]);
  const suggestions = useMemo<Suggestion[]>(() => (style ? suggestCollections(style, collections) : []), [style]);

  const commit = (next: Placed[]) => { setHistory((h) => [...h.slice(-29), items]); setItems(next); };
  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setItems(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  // New pieces go where the visitor is looking, a little below the centre of the view.
  const here = (): PanoLook => {
    const v = viewer.current?.getView() ?? { yaw: 0, pitch: 0 };
    return { yaw: v.yaw, pitch: v.pitch - 6 };
  };
  // On a phone the drawer folds away while a piece is being arranged, so the room stays in view.
  const arrange = (id: string) => { setSelected(id); if (window.innerWidth < 768) setDrawer(false); };
  const addPiece = (p: Piece) => {
    if (items.length >= MAX_ITEMS) return setNote(`Up to ${MAX_ITEMS} pieces in one room.`);
    const item: Placed = { id: uid(), kind: "cutout", slug: p.slug, image: p.image, aspect: p.w / p.h, size: SIZE_BY_AREA[p.area] ?? 1, ...here() };
    commit([...items, item]);
    arrange(item.id);
  };
  const addModel = (m: ModelProduct) => {
    if (items.length >= MAX_ITEMS) return setNote(`Up to ${MAX_ITEMS} pieces in one room.`);
    const item: Placed = { id: uid(), kind: "model", url: m.url, name: m.name, finish: m.finishes[0], finishes: m.finishes, rotation: 0, size: 1, ...here() };
    commit([...items, item]);
    arrange(item.id);
  };
  const update = (id: string, patch: Partial<Placed>, record = true) => {
    const next = items.map((x) => (x.id === id ? ({ ...x, ...patch } as Placed) : x));
    if (record) commit(next); else setItems(next);
  };
  // Pressing a piece selects it and starts a drag (the viewer stops turning; the drag is one undo step).
  const onPress = (id: string) => {
    arrange(id);
    setLocked(true);
    setHistory((h) => [...h.slice(-29), items]);
  };
  const onMove = useCallback((id: string, at: PanoLook) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...at } : x))), []);
  const onEnd = useCallback(() => setLocked(false), []);

  const current = items.find((x) => x.id === selected) ?? null;
  const pieceOf = (slug: string) => collections.flatMap((c) => c.pieces.map((p) => ({ p, c }))).find((x) => x.p.slug === slug);
  const productList = items.map((x) => (x.kind === "model" ? `${x.name} (${x.finish})` : (() => { const f = pieceOf(x.slug); return f ? `${f.p.type} ${f.p.code} (${f.c.finish})` : x.slug; })()));

  async function picture() {
    setSelected(null);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return viewer.current?.capture() ?? null;
  }
  async function save() {
    const blob = await picture();
    if (!blob) return setNote("Could not make the picture.");
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "aquilo-room.jpg" }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function share() {
    const blob = await picture();
    if (!blob) return;
    const file = new File([blob], "aquilo-room.jpg", { type: "image/jpeg" });
    const text = `My room with AQUILO: ${productList.join(", ")}`;
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "My room with AQUILO", text }).catch(() => {});
    else { await save(); setNote("Saved the picture: share it from your gallery."); }
  }
  const consultant = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello AQUILO, I tried these in my room and would like advice: ${productList.join(", ") || "(no pieces yet)"}. I will attach the picture.`)}`;

  const tabs = ["Suggested", ...AREAS, ...(models.length ? ["3D"] : [])];
  const piecesForTab: { p: Piece; c: Collection }[] = tab === "Suggested"
    ? suggestions.flatMap((s) => s.collection.pieces.slice(0, 6).map((p) => ({ p, c: s.collection })))
    : collections.flatMap((c) => c.pieces.filter((p) => p.area === tab).map((p) => ({ p, c })));

  return (
    <div className="fixed inset-0 bg-onyx text-bone">
      <PanoramaViewer
        className="absolute inset-0"
        src={room.src}
        photoFov={room.panorama ? undefined : photoFov}
        autoRotate={false}
        resetKey={0}
        handle={viewer}
        locked={locked}
        onStatus={(s) => s === "ready" && setReady(true)}
        onPick={() => setSelected(null)}
      >
        <DragController dragRef={dragRef} onMove={onMove} onEnd={onEnd} />
        {items.some((x) => x.kind === "model") && <Environment resolution={128}><ProductStudio /></Environment>}
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={1.2} />
        {showProducts && items.map((x, i) => (
          <Suspense key={x.id} fallback={null}>
            {x.kind === "cutout"
              ? <PlacedCutout item={x} order={i + 1} selected={x.id === selected} dragRef={dragRef} onPress={onPress} />
              : <PlacedModel item={x} selected={x.id === selected} dragRef={dragRef} onPress={onPress} />}
          </Suspense>
        ))}
      </PanoramaViewer>

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent px-[var(--gutter)] pb-10 pt-5">
        <div className="pointer-events-auto">
          <button onClick={onNewRoom} className="eyebrow text-[10px] text-bone/60 hover:text-bone">← New room</button>
          <p className="mt-1 font-display text-2xl">{room.name}</p>
          {style && <p className="mt-1 text-xs text-champagne">{style.label}</p>}
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {!room.panorama && (
            <label className="flex items-center gap-2 rounded-full border border-bone/20 bg-black/40 px-4 py-2 text-[11px] backdrop-blur-md">
              Lens <input type="range" min={45} max={110} value={photoFov} onChange={(e) => setPhotoFov(Number(e.target.value))} className="w-24 accent-[#c8a97e]" aria-label="How wide the photo is" />
            </label>
          )}
          <button onClick={() => setShowProducts((v) => !v)} disabled={!items.length} className="eyebrow rounded-full border border-bone/30 bg-black/40 px-3 py-2 text-[9px] backdrop-blur-md disabled:opacity-30 md:px-4 md:py-2.5 md:text-[10px]">{showProducts ? "Before" : "After"}</button>
          <button onClick={undo} disabled={!history.length} className="eyebrow rounded-full border border-bone/30 bg-black/40 px-3 py-2 text-[9px] backdrop-blur-md disabled:opacity-30 md:px-4 md:py-2.5 md:text-[10px]">Undo</button>
          <button onClick={save} disabled={!ready} className="hidden md:inline-block eyebrow rounded-full border border-bone/30 bg-black/40 px-3 py-2 text-[9px] backdrop-blur-md disabled:opacity-30 md:px-4 md:py-2.5 md:text-[10px]">Save picture</button>
          <button onClick={share} disabled={!ready} className="eyebrow rounded-full border border-bone/30 bg-black/40 px-3 py-2 text-[9px] backdrop-blur-md disabled:opacity-30 md:px-4 md:py-2.5 md:text-[10px]">Share</button>
          <a href={consultant} target="_blank" rel="noreferrer" className="eyebrow rounded-full bg-bone px-3 py-2 text-[9px] text-onyx md:px-4 md:py-2.5 md:text-[10px]">Ask a consultant</a>
        </div>
      </header>

      {/* Product drawer */}
      <aside className={`absolute bottom-0 left-0 top-auto flex max-h-[46vh] w-full flex-col border-t border-bone/10 bg-black/70 backdrop-blur-xl transition-transform duration-500 md:bottom-6 md:left-[var(--gutter)] md:top-28 md:max-h-none md:w-80 md:rounded-sm md:border ${drawer ? "" : "translate-y-[calc(100%-44px)] md:-translate-x-[calc(100%+var(--gutter))] md:translate-y-0"}`}>
        <button onClick={() => setDrawer((d) => !d)} className="eyebrow flex shrink-0 items-center justify-between px-4 py-3 text-[10px] text-bone/70">
          <span>Pieces</span><span>{drawer ? "Hide" : "Show"}</span>
        </button>
        <div className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]" data-lenis-prevent>
          {tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={`eyebrow shrink-0 rounded-full px-3 py-1.5 text-[9px] ${tab === t ? "bg-bone text-onyx" : "text-bone/60 hover:text-bone"}`}>{t}</button>)}
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4" data-lenis-prevent>
          {tab === "Suggested" && (
            <div className="mb-3 space-y-2">
              {!style && <p className="px-1 text-xs text-bone/50">Reading your room…</p>}
              {suggestions.map((s) => (
                <div key={s.collection.slug} className="rounded-sm border border-bone/10 p-3">
                  <p className="text-sm">{s.collection.name} <span className="text-bone/50">· {s.collection.finish}</span></p>
                  <p className="mt-1 text-[11px] leading-snug text-bone/55">{s.reason}</p>
                </div>
              ))}
            </div>
          )}
          {tab === "3D" ? (
            <div className="grid grid-cols-2 gap-2">
              {models.map((m) => (
                <button key={m.slug} onClick={() => addModel(m)} className="rounded-sm border border-bone/10 p-3 text-left text-xs hover:border-bone/40">
                  <span className="block">{m.name}</span><span className="mt-1 block text-[10px] text-bone/45">3D · {m.finishes.join(", ")}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {piecesForTab.map(({ p, c }) => (
                <button key={p.slug} onClick={() => addPiece(p)} title={`${p.type} ${p.code}, ${c.finish}`} className="group relative aspect-square overflow-clip rounded-sm bg-bone/5 hover:bg-bone/10">
                  <Image src={p.image} alt={`${p.type} ${p.code}`} fill sizes="90px" className="object-contain p-2 transition-transform duration-500 group-hover:scale-105" />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Selected piece */}
      {current && (
        <SelectionBar item={current} pieceOf={pieceOf} arHref={arHref} raised={drawer}
          onChange={(patch, record) => update(current.id, patch, record)}
          onRemove={() => { commit(items.filter((x) => x.id !== current.id)); setSelected(null); }}
          onDone={() => setSelected(null)} />
      )}

      {ready && !items.length && <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-5 py-2.5 text-xs backdrop-blur-md">Pick a piece, then drag it into place</p>}
      {!ready && <p className="eyebrow pointer-events-none absolute inset-0 grid place-items-center text-bone/50">Opening your room</p>}
      {note && <button onClick={() => setNote(null)} className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-bone px-5 py-2.5 text-xs text-onyx">{note}</button>}
    </div>
  );
}

function SelectionBar({ item, pieceOf, arHref, raised, onChange, onRemove, onDone }: {
  item: Placed;
  arHref?: string;
  /** The phone drawer is open below it. */
  raised: boolean;
  pieceOf: (slug: string) => { p: Piece; c: Collection } | undefined;
  onChange: (patch: Partial<Placed>, record?: boolean) => void;
  onRemove: () => void;
  onDone: () => void;
}) {
  const found = item.kind === "cutout" ? pieceOf(item.slug) : undefined;
  // "Try another colour" for a photo cut-out: the same kind of piece in the other collections' finishes (the
  // catalogue has no colour variants of one design yet; 3D models change finish on the same design).
  const others = found ? collections.flatMap((c) => c.pieces.filter((p) => p.type === found.p.type).slice(0, 1).map((p) => ({ p, c }))) : [];
  return (
    <div className={`absolute left-1/2 w-[min(640px,94vw)] -translate-x-1/2 rounded-sm border border-bone/15 bg-black/75 p-4 backdrop-blur-xl md:bottom-6 ${raised ? "bottom-[calc(46vh+12px)]" : "bottom-14"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm">{item.kind === "model" ? item.name : found ? `${found.p.type} · ${found.c.finish}` : "Piece"}</p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => onChange({ flip: !item.flip })} className="eyebrow rounded-full border border-bone/25 px-3 py-1.5 text-[9px]">Flip</button>
          <button onClick={onRemove} className="eyebrow rounded-full border border-red-300/40 px-3 py-1.5 text-[9px] text-red-200">Remove</button>
          <button onClick={onDone} className="eyebrow rounded-full bg-bone px-3 py-1.5 text-[9px] text-onyx">Done</button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-[11px] text-bone/60">Size
          <input type="range" min={0.3} max={3.5} step={0.05} value={item.size} onChange={(e) => onChange({ size: Number(e.target.value) }, false)} className="flex-1 accent-[#c8a97e]" /></label>
        {item.kind === "model" && (
          <label className="flex items-center gap-3 text-[11px] text-bone/60">Turn
            <input type="range" min={-180} max={180} step={1} value={item.rotation} onChange={(e) => onChange({ rotation: Number(e.target.value) }, false)} className="flex-1 accent-[#c8a97e]" /></label>
        )}
      </div>
      {item.kind === "model" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.finishes.map((f) => (
            <button key={f} onClick={() => onChange({ finish: f })} className={`eyebrow rounded-full border px-3 py-1.5 text-[9px] ${f === item.finish ? "border-bone bg-bone text-onyx" : "border-bone/25"}`}>{f}</button>
          ))}
          {arHref && <a href={arHref} className="eyebrow ml-auto text-[9px] text-champagne underline underline-offset-4">See it live in AR</a>}
        </div>
      ) : others.length > 1 && (
        <div className="mt-3">
          <p className="mb-2 text-[10px] text-bone/45">This kind of piece in our other finishes</p>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]" data-lenis-prevent>
            {others.map(({ p, c }) => (
              <button key={p.slug} onClick={() => onChange({ slug: p.slug, image: p.image, aspect: p.w / p.h } as Partial<Placed>)} title={`${c.name} · ${c.finish}`}
                className={`relative size-14 shrink-0 overflow-clip rounded-sm border bg-bone/5 ${item.kind === "cutout" && item.slug === p.slug ? "border-bone" : "border-bone/10 hover:border-bone/40"}`}>
                <Image src={p.image} alt={`${p.type} in ${c.finish}`} fill sizes="56px" className="object-contain p-1" />
                <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: c.accent }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
