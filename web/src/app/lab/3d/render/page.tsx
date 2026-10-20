import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import SpinRenderer from "@/components/lab/SpinRenderer";

export const metadata: Metadata = { title: "Spin renderer", robots: { index: false, follow: false } };

// Dev-only: films a product model at fixed angles for ai/product3d/render-spin.mjs.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Suspense><SpinRenderer /></Suspense>;
}
