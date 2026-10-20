"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ShowroomTour from "@/components/altier/ShowroomTour";
import type { Tour } from "@/data/showrooms";

/** Plays a tour saved by the editor (test panoramas, dev only) with the real ShowroomTour component. */
export default function TourLab() {
  const params = useSearchParams();
  const id = params.get("id") ?? "demo";
  const [tour, setTour] = useState<Tour | null | "missing">(null);
  useEffect(() => {
    fetch(`/lab/360/tours/${id}`).then((r) => (r.ok ? r.json() : "missing")).then(setTour).catch(() => setTour("missing"));
  }, [id]);
  if (tour === "missing") return <main className="grid min-h-dvh place-items-center bg-onyx text-bone"><p className="text-sm">No tour named {id} yet. Make one in <a className="underline" href="/lab/360/editor">the tour editor</a>.</p></main>;
  if (!tour) return <div className="fixed inset-0 bg-onyx" />;
  return <ShowroomTour tour={tour} initialSpot={params.get("spot") ?? undefined} initialProduct={params.get("product") ?? undefined} closeHref="/lab/360/editor" />;
}
