/**
 * The AQUILO ecosystem: one domain, a gateway and three houses.
 * Canonical URLs are sub-paths (aquilo.in/sanitaryware). Sub-domains (sanitaryware.aquilo.in)
 * are also served — see src/proxy.ts — so either structure can be chosen at launch.
 */
export type HouseKey = "aquilo" | "sanitaryware" | "exclusive" | "altier";

export type House = {
  key: HouseKey;
  name: string;
  tier: string;
  path: string;
  tone: { bg: string; fg: string; accent: string };
};

export const HOUSES: Record<HouseKey, House> = {
  aquilo: { key: "aquilo", name: "AQUILO", tier: "The House of Water", path: "/", tone: { bg: "#12110f", fg: "#ede8df", accent: "#c8a97e" } },
  sanitaryware: { key: "sanitaryware", name: "Sanitaryware", tier: "Luxury", path: "/sanitaryware", tone: { bg: "#e9e3d9", fg: "#12110f", accent: "#9c7a4d" } },
  exclusive: { key: "exclusive", name: "Exclusive", tier: "Extra Luxury", path: "/exclusive", tone: { bg: "#2b231d", fg: "#ede8df", accent: "#c8a97e" } },
  altier: { key: "altier", name: "Altier", tier: "Ultra Luxury", path: "/altier", tone: { bg: "#0a0a0a", fg: "#ede8df", accent: "#9a9a98" } },
};

export const SUBSITES = ["sanitaryware", "exclusive", "altier"] as const;

/** Which house a pathname belongs to. */
export function houseForPath(pathname: string): House {
  const seg = pathname.split("/")[1] as HouseKey;
  return HOUSES[seg] && seg !== "aquilo" ? HOUSES[seg] : HOUSES.aquilo;
}
