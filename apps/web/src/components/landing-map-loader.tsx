"use client";

import dynamic from "next/dynamic";
import LandingMapPreview from "./landing-map-preview";

const LandingMapDemo = dynamic(() => import("./landing-map-demo"), {
  ssr: false,
  loading: () => <LandingMapPreview />,
});

export default function LandingMapLoader() {
  return <LandingMapDemo />;
}
