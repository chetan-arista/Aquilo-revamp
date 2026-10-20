import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TourEditor from "@/components/lab/TourEditor";

export const metadata: Metadata = { title: "Tour editor", robots: { index: false, follow: false } };

// Dev-only editor for showroom tours (feature 3): pin products and links on panoramas, export the tour JSON.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <TourEditor />;
}
