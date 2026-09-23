"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import LandingMapPreview from "./landing-map-preview";
import styles from "./landing-map-demo.module.css";

type BasemapKey = "light" | "streets" | "dark";
type DemoLayerKey = "schools" | "river" | "buffer" | "relation";

const LIGHT_STYLE: StyleSpecification = {
  version: 8,
  name: "GeoLearn Light",
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#e9f3f7" } }],
};

const BASEMAPS: Record<BasemapKey, { label: string; style: string | StyleSpecification }> = {
  light: { label: "Light", style: LIGHT_STYLE },
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
      properties: { name: "SDN Cawang 01", status: "Di dalam radius 500 m", distance: "± 60 m" },
      geometry: { type: "Point", coordinates: [106.8612, -6.256] },
    },
    {
      type: "Feature",
      properties: { name: "SDN Kebon Baru 11", status: "Di dalam radius 500 m", distance: "± 160 m" },
      geometry: { type: "Point", coordinates: [106.8623, -6.2336] },
    },
    {
      type: "Feature",
      properties: { name: "SDN Bukit Duri 01", status: "Di dalam radius 500 m", distance: "± 350 m" },
      geometry: { type: "Point", coordinates: [106.8586, -6.2225] },
    },
    {
      type: "Feature",
      properties: { name: "SDN Cililitan 03 Pagi", status: "Di luar radius 500 m", distance: "± 520 m" },
      geometry: { type: "Point", coordinates: [106.8547, -6.2653] },
    },
    {
      type: "Feature",
      properties: { name: "SDN Cawang 04", status: "Di luar radius 500 m", distance: "± 720 m" },
      geometry: { type: "Point", coordinates: [106.868, -6.2505] },
    },
  ],
};

const RIVER: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Sungai Ciliwung", note: "Geometri demo disederhanakan" },
      geometry: {
        type: "LineString",
        coordinates: [
          [106.857952, -6.276],
          [106.860367, -6.258125],
          [106.864536, -6.228269],
          [106.857703, -6.212717],
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
          [106.85589, -6.257519], [106.855892, -6.257499], [106.859885, -6.228914],
          [106.853567, -6.214536], [106.853186, -6.212814], [106.853493, -6.211077],
          [106.854441, -6.20959], [106.855885, -6.208578], [106.857606, -6.208197],
          [106.859341, -6.208504], [106.860828, -6.209452], [106.861838, -6.210897],
          [106.868671, -6.22645], [106.86901, -6.228895], [106.864842, -6.258741],
          [106.862429, -6.276606], [106.861857, -6.278274], [106.86069, -6.279596],
          [106.859106, -6.280371], [106.857347, -6.28048], [106.855679, -6.279907],
          [106.854358, -6.27874], [106.853584, -6.277155], [106.853475, -6.275394],
          [106.85589, -6.257519],
        ]],
      },
    },
  ],
};

const RELATIONS: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { school: "SDN Cawang 01" }, geometry: { type: "LineString", coordinates: [[106.8612, -6.256], [106.860674, -6.255926]] } },
    { type: "Feature", properties: { school: "SDN Kebon Baru 11" }, geometry: { type: "LineString", coordinates: [[106.8623, -6.2336], [106.863763, -6.233805]] } },
    { type: "Feature", properties: { school: "SDN Bukit Duri 01" }, geometry: { type: "LineString", coordinates: [[106.8586, -6.2225], [106.86145, -6.221246]] } },
    { type: "Feature", properties: { school: "SDN Cililitan 03 Pagi" }, geometry: { type: "LineString", coordinates: [[106.8547, -6.2653], [106.859313, -6.265924]] } },
    { type: "Feature", properties: { school: "SDN Cawang 04" }, geometry: { type: "LineString", coordinates: [[106.868, -6.2505], [106.861557, -6.249599]] } },
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

  if (!map.getLayer("demo-buffer-fill")) map.addLayer({
    id: "demo-buffer-fill", type: "fill", source: "demo-buffer",
    layout: { visibility: visible.buffer ? "visible" : "none" },
    paint: { "fill-color": "#1687df", "fill-opacity": 0.14 },
  });
  if (!map.getLayer("demo-buffer-line")) map.addLayer({
    id: "demo-buffer-line", type: "line", source: "demo-buffer",
    layout: { visibility: visible.buffer ? "visible" : "none" },
    paint: { "line-color": "#1687df", "line-width": 2, "line-dasharray": [2, 2] },
  });
  if (!map.getLayer("demo-river")) map.addLayer({
    id: "demo-river", type: "line", source: "demo-river",
    layout: { visibility: visible.river ? "visible" : "none" },
    paint: { "line-color": "#13a6c7", "line-width": 5, "line-opacity": 0.95 },
  });
  if (!map.getLayer("demo-relations")) map.addLayer({
    id: "demo-relations", type: "line", source: "demo-relations",
    layout: { visibility: visible.relation ? "visible" : "none" },
    paint: { "line-color": "#36596f", "line-width": 1.7, "line-dasharray": [2, 2], "line-opacity": 0.72 },
  });
  if (!map.getLayer("demo-schools")) map.addLayer({
    id: "demo-schools", type: "circle", source: "demo-schools",
    layout: { visibility: visible.schools ? "visible" : "none" },
    paint: {
      "circle-radius": 8,
      "circle-color": ["match", ["get", "status"], "Di dalam radius 500 m", "#0b8c9a", "#d85c6f"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  });
  if (!map.getLayer("demo-school-labels")) map.addLayer({
    id: "demo-school-labels", type: "symbol", source: "demo-schools", minzoom: 11.6,
    layout: {
      visibility: visible.schools ? "visible" : "none",
      "text-field": ["get", "name"], "text-size": 11, "text-offset": [0, 1.35], "text-anchor": "top",
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
  const [mapReady, setMapReady] = useState(false);
  const [styleLoading, setStyleLoading] = useState(false);

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapNode.current,
      style: LIGHT_STYLE,
      center: [106.861, -6.244],
      zoom: 12.35,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    const onStyleLoad = () => {
      addDemoData(map, visibleRef.current);
      setStyleLoading(false);
      setMapReady(true);
    };
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
        .setHTML(`<strong>${name}</strong><span>${status}</span><small>${distance} dari geometri demo Sungai Ciliwung</small>`)
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
    if (!map || next === basemap) return;
    setBasemap(next);
    setStyleLoading(next !== "light");
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
      {!mapReady && <LandingMapPreview compact />}
      <div ref={mapNode} className={`${styles.map} ${mapReady ? styles.mapReady : ""}`} />

      <div className={styles.basemapControl} aria-label="Pilih basemap">
        {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
          <button
            type="button"
            key={key}
            className={basemap === key ? styles.activeBasemap : undefined}
            onClick={() => changeBasemap(key)}
            aria-pressed={basemap === key}
            title={key === "light" ? "Mode lokal cepat" : `OpenFreeMap ${BASEMAPS[key].label}`}
          >
            {BASEMAPS[key].label}
          </button>
        ))}
      </div>

      <div className={styles.layerControl} aria-label="Layer demo">
        <span className={styles.controlLabel}>Layer</span>
        {([
          ["schools", "Sekolah"], ["river", "Ciliwung"], ["buffer", "Buffer 500 m"], ["relation", "Relasi"],
        ] as [DemoLayerKey, string][]).map(([key, label]) => (
          <label key={key} className={styles.layerRow}>
            <input type="checkbox" checked={visible[key]} onChange={() => toggleLayer(key)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className={styles.questionCard}>
        <span className={styles.questionEyebrow}>Case Jakarta · Sungai Ciliwung</span>
        <strong>Sekolah mana yang berada dalam radius 500 m dari Sungai Ciliwung?</strong>
        <span className={styles.questionHint}>Klik titik sekolah untuk melihat jarak. Geometri sungai disederhanakan untuk demo landing page.</span>
      </div>

      {styleLoading && <div className={styles.styleNotice}><span className={styles.loadingPulse} />Memuat basemap…</div>}
      <div className={styles.demoBadge}>Demo WebGIS · snapshot ringan</div>
    </div>
  );
}
