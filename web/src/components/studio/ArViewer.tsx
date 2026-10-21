"use client";

import Script from "next/script";
import { createElement, useEffect, useRef, useState } from "react";

/**
 * "See it in your space": a product's 3D model at true size through the phone's camera (feature 2, Phase C).
 * Uses Google's <model-viewer> (self-hosted in public/vendor): Scene Viewer or WebXR on Android, Quick Look on
 * iPhone (it builds the USDZ itself from the shown model, finish included). The model must be an uncompressed
 * GLB in metres with materials named by part (model-ar.glb from ai/product3d/cad/optimize-glb.mjs), so the
 * finish can change on the "main" material before the visitor opens AR.
 */
const SCRIPT = "/vendor/model-viewer/4.3.1/model-viewer.min.js";

/** Linear base colour, metallic, roughness: the same finishes as ProductOrbit and the AR export. */
const PBR: Record<string, [[number, number, number], number, number]> = {
  "chrome": [[0.89, 0.9, 0.93], 1, 0.04], "brushed nickel": [[0.58, 0.53, 0.47], 1, 0.32],
  "matte black": [[0.012, 0.012, 0.012], 0, 0.45], "gloss white": [[0.86, 0.86, 0.83], 0, 0.15],
  "matte stone": [[0.48, 0.44, 0.38], 0, 0.6],
};

type ModelViewerElement = HTMLElement & {
  canActivateAR?: boolean;
  activateAR?: () => Promise<void>;
  model?: { getMaterialByName: (name: string) => { pbrMetallicRoughness: { setBaseColorFactor: (c: number[]) => void; setMetallicFactor: (v: number) => void; setRoughnessFactor: (v: number) => void } } | null };
};

export default function ArViewer({ src, name, finish, className }: { src: string; name: string; finish: string; className?: string }) {
  const ref = useRef<ModelViewerElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [canAr, setCanAr] = useState<boolean | null>(null);

  // Apply the finish to the "main" material whenever the model or the finish changes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const m = el.model?.getMaterialByName("main");
      const pbr = PBR[finish];
      if (!m || !pbr) return;
      m.pbrMetallicRoughness.setBaseColorFactor([...pbr[0], 1]);
      m.pbrMetallicRoughness.setMetallicFactor(pbr[1]);
      m.pbrMetallicRoughness.setRoughnessFactor(pbr[2]);
    };
    const onLoad = () => { setLoaded(true); setCanAr(!!el.canActivateAR); apply(); };
    el.addEventListener("load", onLoad);
    if (el.model) onLoad();
    return () => el.removeEventListener("load", onLoad);
  }, [finish, src]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <Script type="module" src={SCRIPT} strategy="afterInteractive" />
      {createElement("model-viewer", {
        ref, src, alt: `${name}, 3D model`, ar: "", "ar-modes": "webxr scene-viewer quick-look", "ar-scale": "fixed",
        "camera-controls": "", "touch-action": "pan-y", "shadow-intensity": "1", "environment-image": "neutral",
        exposure: "1.05", "interaction-prompt": "none", style: { position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent" },
      },
        // model-viewer shows this only where AR is available (a phone with Scene Viewer, WebXR or Quick Look).
        <button key="ar" slot="ar-button" className="eyebrow absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-bone px-6 py-3 text-[10px] text-onyx">View in your space</button>,
      )}
      {!loaded && <p className="eyebrow pointer-events-none absolute inset-0 grid place-items-center text-[10px] text-bone/40">Loading the model</p>}
      {loaded && canAr === false && (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-bone/50">AR opens on a phone: open this page on your phone to place it in your room at true size.</p>
      )}
    </div>
  );
}
