"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import ProductSpin from "@/components/product/ProductSpin";
import type { Finish } from "@/components/product/ProductOrbit";

const ProductOrbit = dynamic(() => import("@/components/product/ProductOrbit"), { ssr: false });

type Product = { slug: string; category: string; name: string; finishes: Finish[]; mount?: "floor" | "hanging"; photos: { name: string; note: string }[] };
type Fit = { template: string; iou: Record<string, number>; summary: string };
type Cad = { volumeCm3: number; sizeMm: [number, number, number]; details?: string[]; sizeNote?: string; parts: string[] };
type Spin = { frames: number; turnSeconds: number };
type Score = { views: { name: string; iou: number }[]; mean: number };

const A = "/lab/cad/asset/";
const pad = (i: number) => String(i).padStart(3, "0");

/**
 * Feature 1, CAD route bench (rich/01-3d-product-view.md): a product photographed from only a few angles
 * becomes a measured template, a CAD solid (STEP) and a Blender Cycles 360, with no 3D or turntable source.
 * Test data: third-party marketplace photos in the git-ignored test-assets/faucets folder; dev only.
 */
export default function CadLab() {
  const [list, setList] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    fetch(`${A}manifest.json`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setList).catch(() => setFailed(true));
  }, []);

  if (failed) return <main className="grid min-h-dvh place-items-center bg-stone text-ink"><p className="text-sm">No products in <code>test-assets/faucets/products/</code>. Run ai/product3d/cad/pipeline.mjs first.</p></main>;
  if (!list) return <main className="min-h-dvh bg-stone" />;
  const p = list[active];
  return (
    <main className="min-h-dvh bg-stone px-[var(--gutter)] pb-24 pt-10 text-ink">
      <header className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow text-bronze">CAD Lab · Feature 1</p>
          <h1 className="display mt-3 text-[clamp(2.4rem,5vw,4.5rem)]">A few photos to CAD and 360</h1>
          <p className="mt-3 max-w-xl text-sm text-ink/60">Products with no 3D model and no turntable, only ordinary catalogue photos: one template per product type, the same pipeline for all. Third-party test photos, dev only and never shipped.</p>
        </div>
        {list.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {list.map((x, i) => (
              <button key={x.slug} onClick={() => setActive(i)} className={`eyebrow rounded-full border px-5 py-2.5 ${i === active ? "border-ink bg-ink text-bone" : "border-ink/20 hover:border-ink/60"}`}>{x.category}</button>
            ))}
          </div>
        )}
      </header>
      <CadBench key={p.slug} p={p} />
    </main>
  );
}

function CadBench({ p }: { p: Product }) {
  const [fit, setFit] = useState<Fit | null>(null);
  const [cad, setCad] = useState<Cad | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [spin, setSpin] = useState<Spin | null>(null);
  const [finish, setFinish] = useState<Finish>(p.finishes[0]);
  useEffect(() => {
    const json = (f: string) => fetch(`${A}${p.slug}/${f}`).then((r) => (r.ok ? r.json() : null));
    json("fit.json").then(setFit);
    json("cad.json").then(setCad);
    json("score.json").then(setScore);
    json("spin.json").then(setSpin);
  }, [p.slug]);
  const frames = useMemo(() => Array.from({ length: spin?.frames ?? 0 }, (_, i) => `${A}${p.slug}/cad-spin-web/${pad(i)}.webp`), [p.slug, spin]);
  const hasSpin = !!spin;
  const card = "relative overflow-clip rounded-sm bg-white";
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  return (
    <div className="space-y-14">
      <section>
        <h2 className="eyebrow mb-4 text-ink/60">1 · Input: {p.photos.length === 1 ? "one catalogue photo" : `${p.photos.length} catalogue photos`} (no back, no top)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {p.photos.map((v) => (
            <figure key={v.name} className={card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${A}${p.slug}/${v.name}.png`} alt={`${p.name}, ${v.name}`} className="aspect-square w-full object-contain" />
              <figcaption className="absolute inset-x-3 bottom-3 text-[11px] text-ink/50">{v.note}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink/50">{p.name}</p>
      </section>

      <section>
        <h2 className="eyebrow mb-4 text-ink/60">2 · Fitted: the {fit?.template.replace(/-/g, " ") ?? ""} template against the photos</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {Object.keys(fit?.iou ?? {}).map((v) => (
            <figure key={v} className={card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${A}${p.slug}/fit-${v}.png`} alt={`Fit against the ${v} photo`} className="aspect-square w-full object-contain" />
              <figcaption className="eyebrow absolute left-3 top-3 text-[10px] text-ink/50">{v} · grey both, green photo only, red model only</figcaption>
            </figure>
          ))}
        </div>
        {fit && <p className="mt-3 text-xs text-ink/50">{fit.summary}</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="eyebrow mb-4 text-ink/60">3 · CAD solid (build123d, exported as STEP and GLB)</h2>
          <ProductOrbit url={`${A}${p.slug}/model-web.glb`} finish={finish} mount={p.mount} className={`${card} aspect-square`} background="#ffffff" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {p.finishes.map((f) => (
              <button key={f} onClick={() => setFinish(f)} className={`eyebrow rounded-full border px-4 py-2 text-[10px] ${f === finish ? "border-ink bg-ink text-bone" : "border-ink/20 hover:border-ink/60"}`}>{f}</button>
            ))}
            <a href={`${A}${p.slug}/model.step`} className="eyebrow ml-auto text-[10px] underline underline-offset-4">Download STEP</a>
          </div>
          {cad && (
            <p className="mt-3 text-xs text-ink/50">
              {cad.sizeMm.map((v) => v.toFixed(0)).join(" × ")} mm, {cad.volumeCm3.toFixed(0)} cm³ solid, {cad.parts.length} part{cad.parts.length > 1 ? "s" : ""}. {cad.details?.join(", ")}.
              {cad.sizeNote ? ` Size: ${cad.sizeNote}.` : ""}
            </p>
          )}
        </div>
        <div>
          <h2 className="eyebrow mb-4 text-ink/60">4 · 360 rendered in Blender Cycles from the CAD solid</h2>
          {hasSpin ? <ProductSpin frames={frames} turnSeconds={spin.turnSeconds} alt={`${p.name}, 360`} className={`${card} aspect-square`} /> : <p className={`${card} grid aspect-square place-items-center text-xs text-ink/40`}>Run ai/product3d/cad/render_blender.py</p>}
          {score && <p className="mt-3 text-xs text-ink/50">Rendered outline against the photos: {score.views.map((v) => `${v.name} ${pct(v.iou)}`).join(", ")}.</p>}
        </div>
      </section>

      {hasSpin && (
        <section>
          <h2 className="eyebrow mb-4 text-ink/60">5 · Video loop (MP4 / WebM from the same frames)</h2>
          <video className={`${card} aspect-[16/9] w-full object-contain`} autoPlay muted loop playsInline poster={`${A}${p.slug}/cad-spin-web/000.webp`}>
            <source src={`${A}${p.slug}/cad-spin.webm`} type="video/webm" />
            <source src={`${A}${p.slug}/cad-spin.mp4`} type="video/mp4" />
          </video>
        </section>
      )}
    </div>
  );
}
