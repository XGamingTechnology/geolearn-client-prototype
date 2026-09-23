"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./landing-map-demo.module.css";

type BasemapKey = "light" | "streets" | "dark";
type DemoLayerKey = "schools" | "river" | "buffer" | "relation";

const BASEMAPS: Record<BasemapKey, { label: string; style: string }> = {
  light: { label: "Light", style: "https://tiles.openfreemap.org/styles/positron" },
  streets: { label: "Streets", style: "https://tiles.openfreemap.org/styles/liberty" },
  dark: { label: "Dark", style: "https://tiles.openfreemap.org/styles/dark" },
};

const INITIAL_VISIBILITY: Record<DemoLayerKey, boolean> = {
  schools: true,
  river: true,
  buffer: true,
  relation: true,
};

const SCHOOLS: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "SMA Cendekia", status: "Di dalam radius 500 m", distance: "± 310 m" },
      geometry: { type: "Point", coordinates: [110.3671, -7.7975] },
    },
    {
      type: "Feature",
      properties: { name: "SMP Tunas Bangsa", status: "Di luar radius 500 m", distance: "± 760 m" },
      geometry: { type: "Point", coordinates: [110.3775, -7.793] },
    },
    {
      type: "Feature",
      properties: { name: "SD Harapan", status: "Di dalam radius 500 m", distance: "± 420 m" },
      geometry: { type: "Point", coordinates: [110.3604, -7.8042] },
    },
  ],
};

const RIVER: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Sungai Contoh" },
      geometry: {
        type: "LineString",
        coordinates: [
          [110.351, -7.789],
          [110.357, -7.794],
          [110.363, -7.798],
          [110.369, -7.802],
          [110.375, -7.808],
          [110.383, -7.812],
        ],
      },
    },
  ],
};

const BUFFER: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { distance: "500 m" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [110.348, -7.785],
          [110.354, -7.787],
          [110.361, -7.792],
          [110.368, -7.796],
          [110.376, -7.802],
          [110.386, -7.807],
          [110.387, -7.814],
          [110.381, -7.817],
          [110.372, -7.812],
          [110.365, -7.807],
          [110.357, -7.802],
          [110.349, -7.796],
          [110.348, -7.785],
        ]],
      },
    },
  ],
};

const RELATIONS: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { school: "SMA Cendekia" },
      geometry: { type: "LineString", coordinates: [[110.3671, -7.7975], [110.3652, -7.7994]] },
    },
    {
      type: "Feature",
      properties: { school: "SD Harapan" },
      geometry: { type: "LineString", coordinates: [[110.3604, -7.8042], [110.364, -7.799]] },
    },
  ],
};

const layerIds: Record<DemoLayerKey, string[]> = {
  schools: ["demo-schools", "demo-school-labels"],
  river: ["demo-river"],
  buffer: ["demo-buffer-fill", "demo-buffer-line"],
  relation: ["demo-relations"],
};

function addDemoData(map: MapLibreMap, visible: Record<DemoLayerKey, boolean>) {
  if (!map.getSource("demo-schools")) map.addSource("demo-schools", { type: "geojson", data: SCHOOLS });
  if (!map.getSource("demo-river")) map.addSource("demo-river", { type: "geojson", data: RIVER });
  if (!map.getSource("demo-buffer")) map.addSource("demo-buffer", { type: "geojson", data: BUFFER });
  if (!map.getSource("demo-relations")) map.addSource("demo-relations", { type: "geojson", data: RELATIONS });

  map.addLayer({
    id: "demo-buffer-fill",
    type: "fill",
    source: "demo-buffer",
    layout: { visibility: visible.buffer ? "visible" : "none" },
    paint: { "fill-color": "#1687df", "fill-opacity": 0.15 },
  });
  map.addLayer({
    id: "demo-buffer-line",
    type: "line",
    source: "demo-buffer",
    layout: { visibility: visible.buffer ? "visible" : "none" },
    paint: { "line-color": "#1687df", "line-width": 2, "line-dasharray": [2, 2] },
  });
  map.addLayer({
    id: "demo-river",
    type: "line",
    source: "demo-river",
    layout: { visibility: visible.river ? "visible" : "none" },
    paint: { "line-color": "#14a6c7", "line-width": 5, "line-opacity": 0.9 },
  });
  map.addLayer({
    id: "demo-relations",
    type: "line",
    source: "demo-relations",
    layout: { visibility: visible.relation ? "visible" : "none" },
    paint: { "line-color": "#284d67", "line-width": 2, "line-dasharray": [2, 2] },
  });
  map.addLayer({
    id: "demo-schools",
    type: "circle",
    source: "demo-schools",
    layout: { visibility: visible.schools ? "visible" : "none" },
    paint: {
      "circle-radius": 8,
      "circle-color": ["match", ["get", "status"], "Di dalam radius 500 m", "#0b8c9a", "#dd5f72"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  });
  map.addLayer({
    id: "demo-school-labels",
    type: "symbol",
    source: "demo-schools",
    minzoom: 12,
    layout: {
      visibility: visible.schools ? "visible" : "none",
      "text-field": ["get", "name"],
      "text-size": 11,
      "text-offset": [0, 1.35],
      "text-anchor": "top",
    },
    paint: { "text-color": "#173b59", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
  });
}

export default function LandingMapDemo() {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const visibleRef = useRef<Record<DemoLayerKey, boolean>>({ ...INITIAL_VISIBILITY });
  const [basemap, setBasemap] = useState<BasemapKey>("light");
  const [visible, setVisible] = useState<Record<DemoLayerKey, boolean>>({ ...INITIAL_VISIBILITY });

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapNode.current,
      style: BASEMAPS.light.style,
      center: [110.367, -7.8],
      zoom: 12.9,
      attributionControl: true,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    const onStyleLoad = () => addDemoData(map, visibleRef.current);
    map.on("style.load", onStyleLoad);

    const onClick = (event: maplibregl.MapMouseEvent) => {
      if (!map.getLayer("demo-schools")) return;
      const features = map.queryRenderedFeatures(event.point, { layers: ["demo-schools"] });
      const feature = features[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      const name = String(feature.properties?.name ?? "Sekolah");
      const status = String(feature.properties?.status ?? "");
      const distance = String(feature.properties?.distance ?? "");
      new maplibregl.Popup({ offset: 14, closeButton: false })
        .setLngLat([lng, lat])
        .setHTML(`<strong>${name}</strong><span>${status}</span><small>${distance} dari sungai</small>`)
        .addTo(map);
    };

    const onMouseMove = (event: maplibregl.MapMouseEvent) => {
      if (!map.getLayer("demo-schools")) return;
      const hit = map.queryRenderedFeatures(event.point, { layers: ["demo-schools"] }).length > 0;
      map.getCanvas().style.cursor = hit ? "pointer" : "grab";
    };

    map.on("click", onClick);
    map.on("mousemove", onMouseMove);

    return () => {
      map.off("style.load", onStyleLoad);
      map.off("click", onClick);
      map.off("mousemove", onMouseMove);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function changeBasemap(next: BasemapKey) {
    const map = mapRef.current;
    setBasemap(next);
    if (!map || next === basemap) return;
    map.setStyle(BASEMAPS[next].style);
  }

  function toggleLayer(key: DemoLayerKey) {
    const nextVisible = { ...visibleRef.current, [key]: !visibleRef.current[key] };
    visibleRef.current = nextVisible;
    setVisible(nextVisible);
    const map = mapRef.current;
    if (!map) return;
    for (const id of layerIds[key]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", nextVisible[key] ? "visible" : "none");
    }
  }

  return (
    <div className={styles.shell} aria-label="Demo WebGIS interaktif GeoLearn">
      <div ref={mapNode} className={styles.map} />

      <div className={styles.basemapControl} aria-label="Pilih basemap">
        {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
          <button
            type="button"
            key={key}
            className={basemap === key ? styles.activeBasemap : undefined}
            onClick={() => changeBasemap(key)}
            aria-pressed={basemap === key}
            title={key === "streets" ? "OpenFreeMap Liberty" : undefined}
          >
            {BASEMAPS[key].label}
          </button>
        ))}
      </div>

      <div className={styles.layerControl} aria-label="Layer demo">
        <span className={styles.controlLabel}>Layer</span>
        {([
          ["schools", "Sekolah"],
          ["river", "Sungai"],
          ["buffer", "Buffer 500 m"],
          ["relation", "Relasi"],
        ] as [DemoLayerKey, string][]).map(([key, label]) => (
          <label key={key} className={styles.layerRow}>
            <input type="checkbox" checked={visible[key]} onChange={() => toggleLayer(key)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className={styles.questionCard}>
        <span className={styles.questionEyebrow}>Contoh pertanyaan</span>
        <strong>Sekolah mana yang berada dalam radius 500 m dari sungai?</strong>
        <span className={styles.questionHint}>Geser peta, zoom, ubah layer, lalu klik titik sekolah.</span>
      </div>

      <div className={styles.demoBadge}>Demo WebGIS</div>
    </div>
  );
}
