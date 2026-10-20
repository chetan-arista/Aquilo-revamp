import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductLab from "@/components/lab/ProductLab";

export const metadata: Metadata = { title: "3D Lab", robots: { index: false, follow: false } };

// Dev-only bench for feature 1 (rich/01-3d-product-view.md): four photos → 360 spin, 3D model, video.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ProductLab />;
}
