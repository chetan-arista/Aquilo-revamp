import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import TourLab from "@/components/lab/TourLab";

export const metadata: Metadata = { title: "Showroom tour", robots: { index: false, follow: false } };

// Dev-only player for tours made in /lab/360/editor (feature 3, rich/03-showroom-virtual-tour.md):
// /lab/tour?id=demo&spot=<spot>&product=<slug>
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Suspense fallback={<div className="fixed inset-0 bg-onyx" />}><TourLab /></Suspense>;
}
