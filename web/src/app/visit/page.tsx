import type { Metadata } from "next";
import VisitPage from "@/components/altier/VisitPage";

export const metadata: Metadata = { title: "Visit", description: "AQUILO experience centres in New Delhi, Mumbai and Nagpur. Book a private appointment." };

export default function Page() {
  return <VisitPage />;
}
