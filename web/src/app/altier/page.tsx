import type { Metadata } from "next";
import HouseTeaser from "@/components/HouseTeaser";

export const metadata: Metadata = { title: { absolute: "AQUILO Altier — Ultra Luxury" } };

export default function Page() {
  return <HouseTeaser house="altier" />;
}
