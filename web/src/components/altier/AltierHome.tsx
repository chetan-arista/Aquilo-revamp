"use client";

import { useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JourneyRail from "@/components/JourneyRail";
import RainHero from "./RainHero";
import Manifesto from "./Manifesto";
import TapStudio from "./TapStudio";
import CollectionsJourney from "./CollectionsJourney";
import Finishes from "./Finishes";
import ShowerModes from "./ShowerModes";
import Wellness from "./Wellness";
import Basins from "./Basins";
import Craft from "./Craft";
import Technology from "./Technology";
import Spaces from "./Spaces";
import Centres from "./Centres";

/** AQUILO Altier home: one continuous journey from the rain to the showroom. */
export default function AltierHome() {
  const root = useRef<HTMLDivElement>(null);
  return (
    <div ref={root} className="bg-onyx text-bone">
      <Header />
      <main>
        <RainHero />
        <Manifesto />
        <TapStudio />
        <CollectionsJourney />
        <Finishes />
        <ShowerModes />
        <Wellness />
        <Basins />
        <Craft />
        <Technology />
        <Spaces />
        <Centres />
      </main>
      <Footer />
      <JourneyRail scope={root} />
    </div>
  );
}
