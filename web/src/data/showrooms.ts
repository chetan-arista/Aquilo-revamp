import { centres } from "@/data/site";

/**
 * Showroom virtual tours (feature 3, rich/03-showroom-virtual-tour.md). One tour per experience centre: spots
 * (one 360 panorama each) linked by arrows, with markers on the products on display. Products are referred to
 * by their catalogue slug (pieceBySlug in data/site.ts), so the tour never copies product data.
 *
 * Angles follow PanoramaViewer: yaw 0 = the panorama's centre, + to the right; pitch + up; degrees.
 * Tours are authored in the dev-only editor (/lab/360/editor) and exported as JSON to data/showrooms/<centre>.json
 * once AQUILO's own panoramas are shot. None exist yet, so the live site shows no tour.
 */
export type TourMarker = { id: string; yaw: number; pitch: number; label?: string } & (
  | { kind: "product"; slug: string }
  | { kind: "link"; to: string }
);

export type TourSpot = {
  id: string;
  title: string;
  /** Equirectangular (2:1) image URL; production: /media/showrooms/<centre>/<spot>.webp */
  panorama: string;
  /** Where the visitor looks on arriving. */
  view?: { yaw: number; pitch: number; fov?: number };
  markers: TourMarker[];
};

export type Tour = { id: string; centre: string; title: string; start: string; spots: TourSpot[] };

/** URL slug for a centre: "New Delhi" → "new-delhi". */
export const centreSlug = (city: string) => city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export const centreBySlug = (slug: string) => centres.find((c) => centreSlug(c.city) === slug);

/** Published tours by centre slug. Add `import nagpur from "./showrooms/nagpur.json"` here when it exists. */
export const tours: Record<string, Tour> = {};
