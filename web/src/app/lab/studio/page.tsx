import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudioLab from "@/components/lab/StudioLab";

export const metadata: Metadata = { title: "Studio", robots: { index: false, follow: false } };

// Dev-only bench for feature 2, try it in your room (rich/02-room-panorama-try-on.md).
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StudioLab />;
}
