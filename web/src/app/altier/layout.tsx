import type { Metadata } from "next";
import { HOUSES } from "@/data/houses";

const house = HOUSES.altier;

export const metadata: Metadata = {
  title: { default: `AQUILO ${house.name}`, template: `%s — AQUILO ${house.name}` },
  description: `AQUILO ${house.name} — ${house.tier}. Part of the AQUILO house of water.`,
};

/** House shell: scopes the house's tone so every page inside inherits its level of luxury. */
export default function HouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-house={house.key} style={{ ["--house-bg" as string]: house.tone.bg, ["--house-fg" as string]: house.tone.fg, ["--house-accent" as string]: house.tone.accent }}>
      {children}
    </div>
  );
}
