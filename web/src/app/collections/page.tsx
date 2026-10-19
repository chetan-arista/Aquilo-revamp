import type { Metadata } from "next";
import CollectionsIndex from "@/components/altier/CollectionsIndex";

export const metadata: Metadata = {
  title: "Collections",
  description: "The AQUILO Altier collections: Moonlight, Morandi, Champagne Gold, PEI Gold, Silk Rain, Liberty and Copper.",
};

export default function Page() {
  return <CollectionsIndex />;
}
