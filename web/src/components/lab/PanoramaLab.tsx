"use client";

import { useEffect, useRef, useState } from "react";
import PanoramaViewer, { type PanoPick, type PanoView } from "@/components/gl/PanoramaViewer";

type Entry = { file: string; title: string; owner: string; source: string; width?: number; height?: number; bytes: number };

const PANO = "/lab/360/pano/";
const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** Test bench for PanoramaViewer, fed from test-assets/360/manifest.json (written by the download script). */
export default function PanoramaLab() {
  const [list, setList] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<PanoView>({ yaw: 0, pitch: 0, fov: 75 });
  const [pins, setPins] = useState<PanoPick[]>([]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${PANO}manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((m: Entry[]) => setList(m))
      .catch(() => setFailed(true));
  }, []);

  const count = list?.length ?? 0;
  const go = (i: number) => {
    setIndex(((i % count) + count) % count);
    setPins([]);
  };

  useEffect(() => {
    if (!count) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "]" || e.key === "PageDown") go(index + 1);
      else if (e.key === "[" || e.key === "PageUp") go(index - 1);
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= count) go(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen());

  if (failed) {
    return (
      <main className="grid min-h-dvh place-items-center bg-onyx px-[var(--gutter)] text-bone">
        <p className="max-w-md text-center text-sm text-mist">
          No test panoramas found. Put them in <code className="text-bone">test-assets/360/</code> at the repo root, with a <code className="text-bone">manifest.json</code>.
        </p>
      </main>
    );
  }

  const cur = list?.[index];
  const btn = "rounded-full border border-bone/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-bone/85 transition-colors hover:border-champagne hover:text-champagne";

  return (
    <main ref={stage} className="fixed inset-0 overflow-hidden bg-onyx text-bone">
      {cur && (
        <PanoramaViewer
          className="absolute inset-0"
          src={PANO + encodeURIComponent(cur.file)}
          autoRotate={autoRotate}
          resetKey={resetKey}
          pins={pins}
          onView={setView}
          onPick={(p) => setPins((ps) => [...ps, p].slice(-12))}
          onStatus={setStatus}
        />
      )}

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-4 bg-gradient-to-b from-onyx/90 via-onyx/50 to-transparent px-[var(--gutter)] pb-14 pt-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-champagne">360 Lab</p>
          <h1 className="mt-1 font-display text-3xl leading-none md:text-4xl">{cur?.title ?? "Loading"}</h1>
          {cur && (
            <p className="mt-2 text-xs text-bone/75">
              {cur.width && cur.height ? `${cur.width} × ${cur.height}` : "size unknown"} · {(cur.bytes / 1e6).toFixed(1)} MB ·{" "}
              <a href={cur.source} target="_blank" rel="noreferrer" className="pointer-events-auto underline decoration-mist/40 underline-offset-2 hover:text-bone">
                @{cur.owner} on Panoee
              </a>
            </p>
          )}
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-bone/55">Third-party test images, dev only, never shipped</p>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => setAutoRotate((a) => !a)} aria-pressed={autoRotate}>
            Auto rotate {autoRotate ? "on" : "off"}
          </button>
          <button type="button" className={btn} onClick={() => setResetKey((k) => k + 1)}>
            Reset view
          </button>
          <button type="button" className={btn} onClick={fullscreen}>
            Fullscreen
          </button>
        </div>
      </div>

      {/* Loading / error */}
      <div
        className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-500 ${status === "ready" ? "opacity-0" : "opacity-100"}`}
        aria-live="polite"
      >
        <p className="rounded-full bg-onyx/70 px-5 py-2 text-xs uppercase tracking-[0.2em] text-bone/80 backdrop-blur">
          {status === "error" ? "Could not load this panorama" : `Loading${cur?.width ? ` ${cur.width} × ${cur.height}` : ""}`}
        </p>
      </div>

      {/* Bottom: readout, pins, scene strip. Bottom padding clears the site's sound toggle. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-onyx/90 via-onyx/50 to-transparent px-[var(--gutter)] pb-20 pt-20">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 text-xs">
          <p className="text-bone/70">Drag to look · Scroll or pinch to zoom · Double-click to zoom · Click to drop a pin · Arrow keys · [ ] or 1 to 9 to switch</p>
          <div className="pointer-events-auto text-right font-mono text-[11px] text-bone/70">
            <p>
              yaw {fmt(view.yaw)}° · pitch {fmt(view.pitch)}° · fov {fmt(view.fov)}°
            </p>
            {pins.length > 0 && (
              <p className="mt-1">
                last pin yaw {fmt(pins.at(-1)!.yaw)}° pitch {fmt(pins.at(-1)!.pitch)}° · u {pins.at(-1)!.u.toFixed(3)} v {pins.at(-1)!.v.toFixed(3)} ·{" "}
                <button type="button" className="underline underline-offset-2 hover:text-champagne" onClick={() => setPins([])}>
                  clear {pins.length}
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button type="button" className={btn} onClick={() => go(index - 1)} aria-label="Previous panorama">
            ←
          </button>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {list?.map((e, i) => (
              <button
                key={e.file}
                type="button"
                onClick={() => go(i)}
                aria-current={i === index}
                className={`shrink-0 rounded-full border px-4 py-2 text-left text-xs transition-colors ${
                  i === index ? "border-champagne bg-champagne/15 text-bone" : "border-bone/15 text-bone/60 hover:border-bone/40 hover:text-bone"
                }`}
              >
                <span className="mr-2 text-champagne/80">{i + 1}</span>
                {e.title}
              </button>
            ))}
          </div>
          <button type="button" className={btn} onClick={() => go(index + 1)} aria-label="Next panorama">
            →
          </button>
        </div>
      </div>
    </main>
  );
}
