"use client";

import { buffer, lineString } from "@turf/turf";
import { GeoJSON, MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import type { GisToolId, QuestionConfig } from "@/features/questions/types";

const river = lineString([
  [110.344, -7.773], [110.355, -7.783], [110.367, -7.793], [110.381, -7.808], [110.393, -7.821],
]);
const riverBuffer = buffer(river, 0.5, { units: "kilometers" });

export function MapWorkspace({ activeTool, layers }: { activeTool: GisToolId; layers: QuestionConfig["layers"] }) {
  return (
    <div className="map-shell">
      <MapContainer center={[-7.797, 110.37]} zoom={13} zoomControl={false} className="product-map">
        <ZoomControl position="bottomright" />
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <GeoJSON data={river} style={{ color: "#2a79a8", weight: 5 }} />
        {activeTool === "buffer" && riverBuffer && <GeoJSON data={riverBuffer} style={{ color: "#e6a43b", fillColor: "#f1bd5f", fillOpacity: 0.28, weight: 2 }} />}
      </MapContainer>
      <aside className="layer-list"><strong>Lapisan soal</strong>{layers.map((layer) => <label key={layer.id}><input type="checkbox" defaultChecked={layer.enabledByDefault} />{layer.label}</label>)}</aside>
      <p className="map-caption">Alat aktif: <strong>{gisToolRegistryLabel(activeTool)}</strong></p>
    </div>
  );
}

function gisToolRegistryLabel(tool: GisToolId) {
  return { pan: "Geser", zoom: "Perbesar", buffer: "Buffer 500 m", overlay: "Overlay", distance: "Ukur jarak" }[tool];
}
