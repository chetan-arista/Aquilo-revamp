import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PanoramaLab from "@/components/lab/PanoramaLab";

export const metadata: Metadata = { title: "360 Lab", robots: { index: false, follow: false } };

// Dev-only test bench for the panorama viewer. The panoramas are third-party images used for testing only.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PanoramaLab />;
}
