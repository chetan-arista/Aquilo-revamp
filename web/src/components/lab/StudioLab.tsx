"use client";

import { useEffect, useState } from "react";
import RoomStudio, { type ModelProduct, type SampleRoom } from "@/components/studio/RoomStudio";
import type { Finish } from "@/components/product/ProductOrbit";

/**
 * Feeds the studio with dev-only test data: the third-party panoramas in test-assets/360 as sample rooms and the
 * CAD pipeline's test products (test-assets/faucets/products) as 3D models. The live studio will use AQUILO's
 * own sample rooms and catalogue models.
 */
export default function StudioLab() {
  const [samples, setSamples] = useState<SampleRoom[] | null>(null);
  const [models, setModels] = useState<ModelProduct[]>([]);
  useEffect(() => {
    fetch("/lab/360/pano/manifest.json").then((r) => r.json())
      .then((list: { file: string; title: string }[]) => setSamples(list.slice(0, 8).map((x) => ({ name: x.title.replace(/[_-]+/g, " "), src: `/lab/360/pano/${x.file}` }))))
      .catch(() => setSamples([]));
    fetch("/lab/cad/asset/manifest.json").then((r) => r.json())
      .then((list: { slug: string; category: string; finishes: Finish[] }[]) => setModels(list.map((x) => ({ slug: x.slug, name: x.category, url: `/lab/cad/asset/${x.slug}/model-web.glb`, finishes: x.finishes }))))
      .catch(() => {});
  }, []);
  if (!samples) return <main className="min-h-dvh bg-onyx" />;
  return <RoomStudio samples={samples} models={models} arHref="/lab/studio/ar" />;
}
