"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { assessmentPathStyle, assessmentPointStyle, type AssessmentLayerRole } from "@/components/assessment-map-style";

type MapLayer={
  datasetVersionId:string;
  title:string;
  role:AssessmentLayerRole;
  visible:boolean;
  opacity:number;
  geojson:GeoJsonObject;
};
type Payload={layers:MapLayer[];bbox:[number,number,number,number]|null};

export function AssessmentLeafletMap({
  attemptId,
  questionVersionId,
  analysisGeojson,
}:{
  attemptId:string;
  questionVersionId:string;
  analysisGeojson:GeoJsonObject|null;
}){
  const [payload,setPayload]=useState<Payload|null>(null);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    fetch(`/api/assessment/attempts/${attemptId}/questions/${questionVersionId}/map`,{cache:"no-store"})
      .then(async(response)=>{
        const body=await response.json();
        if(!response.ok)throw new Error(body.error??"Peta tidak tersedia");
        if(active)setPayload(body as Payload);
      })
      .catch((reason)=>{if(active)setError(reason instanceof Error?reason.message:"Peta tidak tersedia");});
    return()=>{active=false;};
  },[attemptId,questionVersionId]);

  const center=useMemo<[number,number]>(()=>{
    const bbox=payload?.bbox;
    return bbox?[(bbox[1]+bbox[3])/2,(bbox[0]+bbox[2])/2]:[-2.5,118];
  },[payload]);

  if(error)return <div className="runtime-media-shell">{error}</div>;
  if(!payload)return <div className="runtime-map-shell"><div className="map-loading">Memuat DatasetVersion dari PostGIS…</div></div>;

  return (
    <div className="runtime-leaflet-shell">
      <MapContainer key={questionVersionId} center={center} zoom={payload.bbox?11:5} className="runtime-product-map" scrollWheelZoom zoomControl={false}>
        <ZoomControl position="bottomright"/>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        {payload.layers.filter((layer)=>layer.visible).map((layer)=>(
          <GeoJSON
            key={layer.datasetVersionId}
            data={layer.geojson}
            style={assessmentPathStyle(layer.role,layer.opacity)}
            pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,assessmentPointStyle(layer.role,layer.opacity))}
          >
            <Tooltip sticky>{layer.title} · {layer.role}</Tooltip>
          </GeoJSON>
        ))}
        {analysisGeojson&&<GeoJSON data={analysisGeojson} style={{color:"#d97706",fillColor:"#f59e0b",weight:3,dashArray:"6 5",fillOpacity:.25}}><Tooltip sticky>Hasil analisis PostGIS</Tooltip></GeoJSON>}
      </MapContainer>
      <aside className="runtime-layer-list">
        <strong>DatasetVersion</strong>
        {payload.layers.map((layer)=><span key={layer.datasetVersionId}><i className={"runtime-layer-dot "+layer.role.toLowerCase()}/>{layer.title}<small>{layer.role}</small></span>)}
        {analysisGeojson&&<span><i className="runtime-layer-dot analysis"/>Hasil analisis<small>POSTGIS</small></span>}
      </aside>
    </div>
  );
}
