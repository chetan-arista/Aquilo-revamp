import type { Metadata } from "next";
import HouseTeaser from "@/components/HouseTeaser";

export const metadata: Metadata = { title: { absolute: "AQUILO Exclusive — Extra Luxury" } };

export default function Page() {
  return <HouseTeaser house="exclusive" />;
}
