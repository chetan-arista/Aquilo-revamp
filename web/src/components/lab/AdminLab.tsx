"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Finish } from "@/components/product/ProductOrbit";
import type { ProductSummary, Status, Template } from "@/lib/labProducts";

const ProductOrbit = dynamic(() => import("@/components/product/ProductOrbit"), { ssr: false });

const API = "/lab/admin/api";
const ASSET = "/lab/cad/asset/";
const STATE_LABEL: Record<Status["state"], string> = {
  processing: "Processing", review: "Ready for review", queued: "Waiting for the renderer", rendering: "Rendering 360",
  published: "Published", failed: "Failed", rejected: "Needs new photos",
};
const pct = (v: number) => `${Math.round(v * 100)}%`;
const seconds = (a?: string, b?: string) => (a && b ? Math.max(0, (Date.parse(b) - Date.parse(a)) / 1000) : null);
const minutes = (s: number) => (s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);

/**
 * Dev-only admin flow for feature 1 (rich/01-3d-product-view.md): a store admin adds a product with one to three
 * photos and one real size; the CAD pipeline (ai/product3d/cad) processes it in about 30 s; the admin reviews the
 * fit and the 3D model, approves, and the Blender 360 renders and publishes it to /lab/cad.
 * Prototype only: no login, no database; the real admin panel adds those.
 */
export default function AdminLab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(() => fetch(`${API}/products`).then((r) => r.json()).then(setProducts).catch(() => {}), []);
  useEffect(() => {
    fetch(`${API}/templates`).then((r) => r.json()).then(setTemplates).catch(() => {});
    refresh();
  }, [refresh]);
  // Poll while anything is moving.
  const busy = products?.some((p) => p.status && ["processing", "queued", "rendering"].includes(p.status.state));
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [busy, refresh]);

  const product = products?.find((p) => p.slug === selected) ?? null;
  return (
    <main className="min-h-dvh bg-stone px-[var(--gutter)] pb-24 pt-10 text-ink">
      <header className="mb-10">
        <p className="eyebrow text-bronze">Store admin · prototype</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,5vw,4.5rem)]">Add a product</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink/60">
          Details go live at once. From one to three ordinary photos and one real size, the 3D model is ready to review in about
          half a minute; after approval the photoreal 360 renders and publishes. Dev only: no login, no database yet.
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-2">
          <button onClick={() => setSelected(null)} className={`w-full rounded-sm border px-4 py-3 text-left text-sm ${selected === null ? "border-ink bg-ink text-bone" : "border-ink/20 hover:border-ink/60"}`}>
            + New product
          </button>
          {products?.map((p) => (
            <button key={p.slug} onClick={() => setSelected(p.slug)} className={`w-full rounded-sm border px-4 py-3 text-left ${selected === p.slug ? "border-ink bg-white" : "border-ink/10 bg-white/50 hover:border-ink/40"}`}>
              <span className="block truncate text-sm">{p.name}</span>
              <span className="mt-1 flex items-center gap-2 text-[11px] text-ink/50">
                <StateDot state={p.status?.state ?? "published"} />
                {p.category} · {p.status ? STATE_LABEL[p.status.state] : "Published"}
                {p.status?.state === "rendering" && p.status.render ? ` ${pct(p.renderedFrames / p.status.render.frames)}` : ""}
              </span>
            </button>
          ))}
        </aside>
        <section className="min-w-0">
          {product ? <ProductPanel key={product.slug} p={product} onChange={refresh} />
            : <NewProduct templates={templates} onCreated={(slug) => { refresh().then(() => setSelected(slug)); }} />}
        </section>
      </div>
    </main>
  );
}

function StateDot({ state }: { state: Status["state"] }) {
  const color = { processing: "bg-bronze animate-pulse", queued: "bg-ink/30", rendering: "bg-bronze animate-pulse", review: "bg-amber-500", published: "bg-emerald-600", failed: "bg-red-600", rejected: "bg-red-400" }[state];
  return <span className={`inline-block size-2 shrink-0 rounded-full ${color}`} />;
}

function NewProduct({ templates, onCreated }: { templates: Template[]; onCreated: (slug: string) => void }) {
  const [key, setKey] = useState<string | null>(null);
  const template = templates.find((t) => t.key === key) ?? null;
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [finishes, setFinishes] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const previews = useMemo(() => Object.fromEntries(Object.entries(photos).map(([k, f]) => [k, URL.createObjectURL(f)])), [photos]);
  useEffect(() => () => Object.values(previews).forEach(URL.revokeObjectURL), [previews]);

  const pick = (t: Template) => { setKey(t.key); setSize(String(t.size.default)); setFinishes(t.finishes); setPhotos({}); setError(null); };
  const missing = template?.views.filter((v) => v.required && !photos[v.name]) ?? [];
  const ready = !!template && name.trim() && Number(size) > 0 && finishes.length > 0 && missing.length === 0;

  async function submit() {
    if (!template || !ready) return;
    setSending(true); setError(null);
    const form = new FormData();
    form.set("name", name.trim()); form.set("template", template.key); form.set("size", size);
    finishes.forEach((f) => form.append("finishes", f));
    Object.entries(photos).forEach(([view, file]) => form.set(`photo:${view}`, file));
    const r = await fetch(`${API}/products`, { method: "POST", body: form });
    const body = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) { setError(body.error ?? "Something went wrong."); return; }
    onCreated(body.slug);
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="eyebrow mb-4 text-ink/60">1 · Product type</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {templates.map((t) => (
            <button key={t.key} onClick={() => pick(t)} className={`rounded-sm border p-4 text-left ${key === t.key ? "border-ink bg-white" : "border-ink/15 bg-white/60 hover:border-ink/50"}`}>
              <span className="block text-sm">{t.label}</span>
              <span className="mt-1 block text-xs text-ink/50">{t.description}</span>
              <span className="mt-2 block text-[11px] text-ink/40">{t.views.filter((v) => v.required).length === 1 ? "One photo" : `${t.views.filter((v) => v.required).length} photos`} · about {minutes(144 * t.secondsPerFrame)} to render</span>
            </button>
          ))}
        </div>
      </div>

      {template && (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow mb-2 block text-ink/60">2 · Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morandi basin mixer" className="w-full rounded-sm border border-ink/20 bg-white px-4 py-3 text-sm outline-none focus:border-ink" />
            </label>
            <label className="block">
              <span className="eyebrow mb-2 block text-ink/60">3 · {template.size.label}</span>
              <input value={size} onChange={(e) => setSize(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="w-full rounded-sm border border-ink/20 bg-white px-4 py-3 text-sm outline-none focus:border-ink" />
              <span className="mt-1 block text-[11px] text-ink/40">The one real size the photos cannot give; everything else is measured from them.</span>
            </label>
          </div>

          <div>
            <span className="eyebrow mb-3 block text-ink/60">4 · Finishes offered</span>
            <div className="flex flex-wrap gap-2">
              {template.finishes.map((f) => {
                const on = finishes.includes(f);
                return <button key={f} onClick={() => setFinishes(on ? finishes.filter((x) => x !== f) : [...finishes, f])} className={`eyebrow rounded-full border px-4 py-2 text-[10px] ${on ? "border-ink bg-ink text-bone" : "border-ink/20 hover:border-ink/60"}`}>{f}</button>;
              })}
            </div>
            <span className="mt-2 block text-[11px] text-ink/40">One 3D model serves every finish; the first one is used for the 360.</span>
          </div>

          <div>
            <span className="eyebrow mb-3 block text-ink/60">5 · Photos (white background, the whole product in frame)</span>
            <div className="grid gap-3 sm:grid-cols-3">
              {template.views.map((v) => (
                <label key={v.name} className="relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-clip rounded-sm border border-dashed border-ink/25 bg-white text-center hover:border-ink/60">
                  {previews[v.name] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previews[v.name]} alt={v.label} className="absolute inset-0 size-full object-contain" />
                  ) : (
                    <span className="px-6 text-[11px] text-ink/40">{v.required ? "Required" : "Optional"} · click or drop a photo</span>
                  )}
                  <span className="eyebrow absolute left-2 top-2 rounded-full bg-white/80 px-2 py-1 text-[9px] text-ink/60">{v.label}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotos({ ...photos, [v.name]: f }); }} />
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button disabled={!ready || sending} onClick={submit} className="eyebrow rounded-full bg-ink px-6 py-3 text-bone disabled:opacity-30">
              {sending ? "Uploading" : "Create product"}
            </button>
            <span className="text-xs text-ink/50">
              {error ?? (missing.length ? `Still needed: ${missing.map((v) => v.label.toLowerCase()).join(", ")}.` : !name.trim() ? "Give it a name." : "Details are saved at once; the 3D model follows in about 30 s.")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function ProductPanel({ p, onChange }: { p: ProductSummary; onChange: () => void }) {
  const s = p.status;
  const [finish, setFinish] = useState<Finish>((p.finishes[0] ?? "chrome") as Finish);
  const [error, setError] = useState<string | null>(null);
  const v = encodeURIComponent(s?.updatedAt ?? "");
  const act = async (action: string) => {
    setError(null);
    const r = await fetch(`${API}/products/${p.slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (!r.ok) setError((await r.json().catch(() => ({}))).error ?? "Something went wrong.");
    onChange();
  };
  const processed = !s || s.steps.find((x) => x.key === "score")?.state === "done";
  const renderStep = s?.steps.find((x) => x.key === "render");
  const frames = s?.render?.frames ?? 144;
  const left = s?.state === "rendering" ? (frames - p.renderedFrames) * p.secondsPerFrame : frames * p.secondsPerFrame;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ink/50">{p.category}</p>
          <h2 className="display mt-2 text-3xl">{p.name}</h2>
        </div>
        <span className="flex items-center gap-2 text-sm"><StateDot state={s?.state ?? "published"} />{s ? STATE_LABEL[s.state] : "Published"}</span>
      </div>

      {s && (
        <ol className="grid gap-2 sm:grid-cols-4">
          {s.steps.map((x) => {
            const t = seconds(x.startedAt, x.endedAt ?? (x.state === "running" ? new Date().toISOString() : undefined));
            return (
              <li key={x.key} className={`rounded-sm border px-3 py-2 text-xs ${x.state === "done" ? "border-emerald-600/30 bg-white" : x.state === "running" ? "border-bronze bg-white" : x.state === "failed" ? "border-red-600/50 bg-white" : "border-ink/10 text-ink/40"}`}>
                <span className="block">{x.label}</span>
                <span className="text-[10px] text-ink/45">
                  {x.state === "running" && x.key === "render" ? `${p.renderedFrames} of ${frames} frames · about ${minutes(left)} left`
                    : x.state === "running" ? "working…" : x.state === "done" && t !== null ? minutes(t) : x.state}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {s?.error && <p className="rounded-sm border border-red-600/30 bg-white px-4 py-3 text-sm text-red-700">{s.error}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {processed && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="eyebrow mb-3 text-ink/60">The fit against the photos</h3>
            <div className="grid grid-cols-2 gap-2">
              {p.views.map((view) => (
                <figure key={view} className="relative overflow-clip rounded-sm bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ASSET}${p.slug}/fit-${view}.png?v=${v}`} alt={`Fit against the ${view} photo`} className="aspect-square w-full object-contain" />
                  <figcaption className="eyebrow absolute left-2 top-2 text-[9px] text-ink/50">{view}</figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink/50">Grey: model and photo agree. Green: only in the photo. Red: only in the model.</p>
            {s?.score !== undefined && (
              <p className={`mt-3 text-sm ${s.needsAttention ? "text-red-700" : "text-ink/70"}`}>
                Outline match {pct(s.score)}. {s.needsAttention ? "Below 85%: check the overlay closely, or retake the photo on a plain white background." : "Good match."}
              </p>
            )}
          </div>
          <div>
            <h3 className="eyebrow mb-3 text-ink/60">The 3D model (live on the site after approval)</h3>
            <ProductOrbit url={`${ASSET}${p.slug}/model-web.glb?v=${v}`} finish={finish} mount={p.mount === "hanging" ? "hanging" : "floor"} className="aspect-square overflow-clip rounded-sm bg-white" background="#ffffff" />
            <div className="mt-3 flex flex-wrap gap-2">
              {p.finishes.map((f) => (
                <button key={f} onClick={() => setFinish(f as Finish)} className={`eyebrow rounded-full border px-4 py-2 text-[10px] ${f === finish ? "border-ink bg-ink text-bone" : "border-ink/20 hover:border-ink/60"}`}>{f}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {s?.state === "review" && (
        <div className="flex flex-wrap items-center gap-4 rounded-sm border border-ink/15 bg-white px-5 py-4">
          <button onClick={() => act("approve")} className="eyebrow rounded-full bg-ink px-6 py-3 text-bone">Approve and render the 360</button>
          <button onClick={() => act("reject")} className="eyebrow rounded-full border border-ink/30 px-6 py-3">Reject, retake photos</button>
          <span className="text-xs text-ink/50">The 360 takes about {minutes(frames * p.secondsPerFrame)} on this computer ({frames} frames), one product at a time.</span>
        </div>
      )}
      {s && ["failed", "rejected"].includes(s.state) && (
        <button onClick={() => act("retry")} className="eyebrow rounded-full border border-ink/30 px-6 py-3">Run again</button>
      )}
      {(!s || s.state === "published") && (
        <a href="/lab/cad" className="eyebrow inline-block rounded-full bg-ink px-6 py-3 text-bone">See it in the CAD lab</a>
      )}
      {renderStep?.state === "done" && s?.state !== "published" && <p className="text-xs text-ink/50">Making the web frames and video…</p>}
    </div>
  );
}
