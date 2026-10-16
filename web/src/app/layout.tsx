import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import Loader from "@/components/Loader";
import HouseTransition from "@/components/transition/HouseTransition";
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
  title: { default: "AQUILO — The House of Water", template: "%s — AQUILO" },
  description:
    "AQUILO, since 2010. One house, three expressions of luxury: AQUILO Sanitaryware, AQUILO Exclusive and AQUILO Altier.",
};

export const viewport: Viewport = { themeColor: "#12110f" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${instrument.variable} ${interTight.variable}`}>
      <body className="grain">
        <Loader />
        <SmoothScroll>
          <HouseTransition>{children}</HouseTransition>
        </SmoothScroll>
      </body>
    </html>
  );
}
