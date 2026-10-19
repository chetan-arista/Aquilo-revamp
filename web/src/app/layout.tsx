import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import Loader from "@/components/Loader";
import LuxuryLayer from "@/components/LuxuryLayer";
import PageTransition from "@/components/transition/PageTransition";
import "./globals.css";

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: { default: "AQUILO Altier | Ultra Luxury Bath", template: "%s | AQUILO Altier" },
  description:
    "AQUILO Altier, the ultra luxury house of AQUILO. Rain showers, mixers, basins and wellness in rose gold, champagne, steel and copper.",
};

export const viewport: Viewport = { themeColor: "#070707" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${instrument.variable} ${interTight.variable}`}>
      <body className="grain">
        <Loader />
        <LuxuryLayer />
        <SmoothScroll>
          <PageTransition>{children}</PageTransition>
        </SmoothScroll>
      </body>
    </html>
  );
}
