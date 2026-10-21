import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArLab from "@/components/lab/ArLab";

export const metadata: Metadata = { title: "See it in your space", robots: { index: false, follow: false } };

// Dev-only bench for phone AR (feature 2, Phase C) with the CAD pipeline's test models.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ArLab />;
}
