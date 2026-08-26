"use client";

import { GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl } from "react-leaflet";
import type { PathOptions } from "leaflet";
import type { GisSnapshot } from "@/features/gis/types";
import type { SpatialInfluenceQuestionConfig } from "@/features/questions/types";

export function LeafletAdapter({ question, snapshot }: { question: SpatialInfluenceQuestionConfig; snapshot: GisSnapshot }) {
  const river = question.layers.find((layer) => layer.kind === "river");
  const villages = question.layers.find((layer) => layer.kind === "villages");

  return (
    <div className="map-shell">
      <MapContainer center={[-7.802, 110.372]} className="product-map" scrollWheelZoom zoom={13} zoomControl={false}>
        <ZoomControl position="bottomright" />
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {villages?.kind === "villages" && villages.data.map((village) => {
          const affected = snapshot.affectedVillageIds.includes(village.properties.id);
          const style: PathOptions = {
            color: affected ? "#ba6b12" : "#355f58",
            fillColor: affected ? "#f2ac3f" : "#d8e7e3",
            fillOpacity: affected ? 0.55 : 0.3,
            weight: affected ? 3 : 1.5,
          };
          return <GeoJSON data={village} key={`${village.properties.id}-${affected}`} style={style}><Tooltip sticky>{village.properties.name}{affected ? " · terdampak" : ""}</Tooltip></GeoJSON>;
        })}
        {river?.kind === "river" && <GeoJSON data={river.data} style={{ color: "#247caf", weight: 5 }}><Tooltip sticky>{river.label}</Tooltip></GeoJSON>}
        {snapshot.bufferFeature && <GeoJSON data={snapshot.bufferFeature} key={`buffer-${snapshot.activities.length}`} style={{ color: "#e09225", dashArray: "6 5", fillColor: "#f4bf5e", fillOpacity: 0.28, weight: 2 }}><Tooltip sticky>Zona buffer 500 m</Tooltip></GeoJSON>}
      </MapContainer>
      <aside className="layer-list">
        <strong>Layer dari Question Config</strong>
        {question.layers.map((layer) => <span key={layer.id}><i className={`layer-symbol ${layer.kind}`} />{layer.label}</span>)}
        {snapshot.bufferFeature && <span><i className="layer-symbol buffer" />Zona buffer 500 m</span>}
      </aside>
      <p className="map-caption">{snapshot.affectedVillageIds.length ? `${snapshot.affectedVillageIds.length} desa teridentifikasi terdampak` : "Gunakan alat analisis untuk menemukan desa terdampak"}</p>
    </div>
  );
}
