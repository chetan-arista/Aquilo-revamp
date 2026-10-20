"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import ProductSpin from "@/components/product/ProductSpin";

const ProductOrbit = dynamic(() => import("@/components/product/ProductOrbit"), { ssr: false });

type Product = { slug: string; item_id: string; name: string; frames: number; frame_size: string };
type ModelInfo = { triangles: number; vertices: number; orientation: { score: number }; seenByPhotos: number };
type MeshInfo = { seconds: number; space: string };

const A = "/lab/3d/asset/";
const VIEWS = ["front", "right", "back", "left"];
const pad = (i: number) => String(i).padStart(2, "0");

/**
 * Feature 1 bench (rich/01-3d-product-view.md). For each test product it compares the routes side by side:
 * the four input photos, the real 72 frame turntable, the AI model built from the four photos, the spin
 * and the video filmed from that model, and the dataset's reference model.
 * Test data: Amazon Berkeley Objects (CC BY 4.0), from the git-ignored test-assets/abo folder; dev only.
 */
export default function ProductLab() {
  const [list, setList] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    fetch(`${A}manifest.json`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setList).catch(() => setFailed(true));
  }, []);

  if (failed) return <main className="grid min-h-dvh place-items-center bg-stone text-ink"><p className="text-sm">No test products in <code>test-assets/abo/products/</code>. Run the ai/product3d scripts first.</p></main>;
  if (!list) return <main className="min-h-dvh bg-stone" />;
  const p = list[active];
  return (
    <main className="min-h-dvh bg-stone px-[var(--gutter)] pb-24 pt-10 text-ink">
      <header className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow text-bronze">3D Lab · Feature 1</p>
          <h1 className="display mt-3 text-[clamp(2.4rem,5vw,4.5rem)]">Four photos to 360 and 3D</h1>
          <p className="mt-3 max-w-xl text-sm text-ink/60">Test products from the Amazon Berkeley Objects dataset (CC BY 4.0), dev only and never shipped. Inputs are frames 0, 18, 36 and 54 (front, right, back, left) of each turntable.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {list.map((x, i) => (
            <button key={x.slug} onClick={() => setActive(i)} className={`eyebrow rounded-full border px-5 py-2.5 ${i === active ? "border-ink bg-ink text-bone" : "border-ink/20 hover:border-ink/60"}`}>{x.slug.replace(/-/g, " ")}</button>
          ))}
        </div>
      </header>
      <ProductBench key={p.slug} p={p} />
    </main>
  );
}

function ProductBench({ p }: { p: Product }) {
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [mesh, setMesh] = useState<MeshInfo | null>(null);
  const [hasAiSpin, setHasAiSpin] = useState(false);
  useEffect(() => {
    fetch(`${A}${p.slug}/model.json`).then((r) => (r.ok ? r.json() : null)).then(setModel);
    fetch(`${A}${p.slug}/mesh.json`).then((r) => (r.ok ? r.json() : null)).then(setMesh);
    fetch(`${A}${p.slug}/ai-spin/00.webp`, { method: "HEAD" }).then((r) => setHasAiSpin(r.ok));
  }, [p.slug]);
  const realFrames = useMemo(() => Array.from({ length: p.frames }, (_, i) => `${A}${p.slug}/spin-web/${pad(i)}.webp`), [p]);
  const aiFrames = useMemo(() => Array.from({ length: 72 }, (_, i) => `${A}${p.slug}/ai-spin/${pad(i)}.webp`), [p]);

  const card = "relative overflow-clip rounded-sm bg-white";
  return (
    <div className="space-y-14">
      <section>
        <h2 className="eyebrow mb-4 text-ink/60">1 · Input: four photos</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {VIEWS.map((v) => (
            <figure key={v} className={card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${A}${p.slug}/${v}.png`} alt={`${p.name}, ${v}`} className="aspect-square w-full object-contain" />
              <figcaption className="eyebrow absolute left-3 top-3 text-[10px] text-ink/50">{v}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink/50">{p.name}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="eyebrow mb-4 text-ink/60">2 · Real turntable: 72 photos (route A1, no AI)</h2>
          <ProductSpin frames={realFrames} alt={p.name} className={`${card} aspect-square`} />
          <p className="mt-3 text-xs text-ink/50">Hover to play, drag to turn, arrow keys to step. What a studio turntable shoot gives us.</p>
        </div>
        <div>
          <h2 className="eyebrow mb-4 text-ink/60">3 · AI 3D model from the four photos (Hunyuan3D-2mv + photo paint)</h2>
          <ProductOrbit url={`${A}${p.slug}/model.glb`} className={`${card} aspect-square`} background="#ffffff" />
          <p className="mt-3 text-xs text-ink/50">
            {mesh ? `Generated on ${mesh.space} in ${mesh.seconds} s. ` : ""}
            {model ? `${model.triangles.toLocaleString()} triangles, silhouette match ${(model.orientation.score * 100).toFixed(0)}%, ${(model.seenByPhotos * 100).toFixed(0)}% of the surface coloured straight from the photos.` : ""}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="eyebrow mb-4 text-ink/60">4 · AI 360: filmed from the AI model</h2>
          {hasAiSpin ? <ProductSpin frames={aiFrames} alt={`${p.name} (AI)`} className={`${card} aspect-square`} /> : <p className={`${card} grid aspect-square place-items-center text-xs text-ink/40`}>Run ai/product3d/render-spin.mjs</p>}
        </div>
        <div>
          <h2 className="eyebrow mb-4 text-ink/60">5 · AI video loop (MP4 / WebM from the same frames)</h2>
          {hasAiSpin ? (
            <video className={`${card} aspect-square w-full object-contain`} autoPlay muted loop playsInline poster={`${A}${p.slug}/ai-spin/00.webp`}>
              <source src={`${A}${p.slug}/ai-spin.webm`} type="video/webm" />
              <source src={`${A}${p.slug}/ai-spin.mp4`} type="video/mp4" />
            </video>
          ) : <p className={`${card} grid aspect-square place-items-center text-xs text-ink/40`}>Run ai/product3d/render-spin.mjs</p>}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-4 text-ink/60">6 · Reference: the dataset&apos;s own 3D model (what CAD files give us)</h2>
        <ProductOrbit url={`${A}${p.slug}/reference.glb`} className={`${card} aspect-[16/9]`} background="#ffffff" />
      </section>
    </div>
  );
}
