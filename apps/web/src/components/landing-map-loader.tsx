"use client";

import dynamic from "next/dynamic";
import LandingMapPreview from "./landing-map-preview";

const LandingMapDemo = dynamic(
  async () => {
    const maplibregl = await import("maplibre-gl");
    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    return import("./landing-map-demo");
  },
  {
    ssr: false,
    loading: () => <LandingMapPreview />,
  },
);

export default function LandingMapLoader() {
  return <LandingMapDemo />;
}
