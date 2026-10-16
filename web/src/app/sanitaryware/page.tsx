import type { Metadata } from "next";
import SanitarywareHome from "@/components/sanitaryware/SanitarywareHome";

export const metadata: Metadata = {
  title: { absolute: "AQUILO Sanitaryware — Luxury Bath Suites" },
  description: "AQUILO Sanitaryware — designer faucets, showers, basins and wellness, composed as one luxury bath suite.",
};

export default function Page() {
  return <SanitarywareHome />;
}
