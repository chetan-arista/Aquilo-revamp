"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

const ProductOrbit = dynamic(() => import("@/components/product/ProductOrbit"), { ssr: false });

/**
 * Full screen model at a fixed angle, driven by ai/product3d/render-spin.mjs:
 * window.__setAzimuth(deg) turns it, window.__spinReady becomes true once the model has drawn.
 */
export default function SpinRenderer() {
  const params = useSearchParams();
  const url = params.get("model") ?? "";
  const azimuth = useRef<number | null>(0);
  useEffect(() => {
    (window as { __setAzimuth?: (d: number) => void }).__setAzimuth = (d) => { azimuth.current = d; };
  }, []);
  return (
    <div className="fixed inset-0 z-[200] bg-[#f4f1ec]">
      <ProductOrbit
        url={url}
        className="h-full w-full"
        azimuth={azimuth}
        onReady={() => { (window as { __spinReady?: boolean }).__spinReady = true; }}
      />
    </div>
  );
}
