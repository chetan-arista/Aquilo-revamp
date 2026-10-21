"use client";

import { useEffect, useState } from "react";
import ArViewer from "@/components/studio/ArViewer";

type Model = { slug: string; category: string; finishes: string[] };

/** Phone AR with the CAD pipeline's test products (test-assets/faucets/products, dev only). */
export default function ArLab() {
  const [models, setModels] = useState<Model[]>([]);
  const [active, setActive] = useState(0);
  const [finish, setFinish] = useState<string | null>(null);
  useEffect(() => {
    fetch("/lab/cad/asset/manifest.json").then((r) => r.json()).then(setModels).catch(() => {});
  }, []);
  const m = models[active];
  const f = finish && m?.finishes.includes(finish) ? finish : m?.finishes[0];
  return (
    <main className="flex min-h-dvh flex-col bg-onyx px-[var(--gutter)] pb-10 pt-8 text-bone">
      <a href="/lab/studio" className="eyebrow text-[10px] text-bone/50 hover:text-bone">← Studio</a>
      <p className="eyebrow mt-6 text-champagne">AQUILO Studio · AR</p>
      <h1 className="display mt-2 text-[clamp(2.2rem,6vw,4rem)] leading-none">See it in your space</h1>
      <p className="mt-3 max-w-lg text-sm text-bone/60">Choose a piece and a finish, then tap View in your space: your phone camera shows it in your room at its real size.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {models.map((x, i) => (
          <button key={x.slug} onClick={() => { setActive(i); setFinish(null); }} className={`eyebrow rounded-full border px-4 py-2 text-[10px] ${i === active ? "border-bone bg-bone text-onyx" : "border-bone/25"}`}>{x.category}</button>
        ))}
      </div>
      {m && f && (
        <>
          <ArViewer key={m.slug} src={`/lab/cad/asset/${m.slug}/model-ar.glb`} name={m.category} finish={f} className="mt-6 h-[58vh] overflow-clip rounded-sm bg-graphite" />
          <div className="mt-4 flex flex-wrap gap-2">
            {m.finishes.map((x) => (
              <button key={x} onClick={() => setFinish(x)} className={`eyebrow rounded-full border px-4 py-2 text-[10px] ${x === f ? "border-bone bg-bone text-onyx" : "border-bone/25"}`}>{x}</button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
