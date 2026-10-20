import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CadLab from "@/components/lab/CadLab";

export const metadata: Metadata = { title: "CAD Lab", robots: { index: false, follow: false } };

// Dev-only bench for the CAD route of feature 1 (rich/01-3d-product-view.md): a few photos → measured
// template → CAD solid (STEP) → Blender Cycles 360.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CadLab />;
}
