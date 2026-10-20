import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminLab from "@/components/lab/AdminLab";

export const metadata: Metadata = { title: "Store admin", robots: { index: false, follow: false } };

// Dev-only prototype of the store admin's add product flow (feature 1, rich/01-3d-product-view.md).
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AdminLab />;
}
