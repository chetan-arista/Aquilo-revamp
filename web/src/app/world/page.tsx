import type { Metadata } from "next";
import WorldPage from "@/components/altier/WorldPage";

export const metadata: Metadata = { title: "Our World", description: "AQUILO since 2010: the story, engineering and craftsmanship behind AQUILO Altier." };

export default function Page() {
  return <WorldPage />;
}
