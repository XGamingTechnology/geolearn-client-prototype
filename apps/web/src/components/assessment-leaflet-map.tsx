"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import type { Feature, GeoJsonObject, Geometry } from "geojson";
import type { Layer } from "leaflet";
import L from "leaflet";

import { assessmentPathStyle, assessmentPointStyle } from "./assessment-map-style";

type MapLayer={
  datasetVersionId:string;
  title:string;
  role:"SOURCE"|"TARGET"|"CONTEXT";
  visible:boolean;
  opacity:number;
  geojson:GeoJsonObject;
};
type Payload={layers:MapLayer[];bbox:[number,number,number,number]|null};

function FitToData({bbox}:{bbox:Payload["bbox"]}){
  const map=useMap();
  if(!bbox)return null;
  return <button className="runtime-fit-button" type="button" onClick={(event)=>{event.stopPropagation();map.fitBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]],{padding:[24,24]});}}>Fit ke data</button>;
}

function bindSafePopup(feature:Feature<Geometry>,layer:Layer){
  const entries=Object.entries(feature.properties??{}).filter(([,value])=>value===null||["string","number","boolean"].includes(typeof value)).slice(0,12);
  if(!entries.length)return;
  const content=document.createElement("dl");content.className="runtime-feature-popup";
  for(const [key,value] of entries){
    const term=document.createElement("dt");term.textContent=key;
    const detail=document.createElement("dd");detail.textContent=value===null?"—":String(value);
    content.append(term,detail);
  }
  layer.bindPopup(content);
}

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
  const [visibility,setVisibility]=useState<Record<string,boolean>>({});

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
        <FitToData bbox={payload.bbox}/>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        {payload.layers.filter((layer)=>(visibility[layer.datasetVersionId]??layer.visible)).map((layer)=>(
          <GeoJSON
            key={layer.datasetVersionId}
            data={layer.geojson}
            style={(feature)=>feature?.geometry.type==="Point"||feature?.geometry.type==="MultiPoint"
              ?assessmentPointStyle(layer.role,layer.opacity)
              :assessmentPathStyle(layer.role,layer.opacity)}
            pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,assessmentPointStyle(layer.role,layer.opacity))}
            onEachFeature={bindSafePopup}
          >
            <Tooltip sticky>{layer.title} · {layer.role}</Tooltip>
          </GeoJSON>
        ))}
        {analysisGeojson&&<GeoJSON data={analysisGeojson} style={{color:"#d97706",fillColor:"#f59e0b",weight:3,dashArray:"6 5",fillOpacity:.25}} pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,{radius:7,color:"#d97706",fillColor:"#f59e0b",fillOpacity:.75})}><Tooltip sticky>Hasil analisis PostGIS</Tooltip></GeoJSON>}
      </MapContainer>
      <aside className="runtime-layer-list">
        <strong>DatasetVersion</strong>
        {payload.layers.map((layer)=><label key={layer.datasetVersionId}><input type="checkbox" checked={visibility[layer.datasetVersionId]??layer.visible} onChange={(event)=>setVisibility((current)=>({...current,[layer.datasetVersionId]:event.target.checked}))}/><i className={"runtime-layer-dot "+layer.role.toLowerCase()}/><span>{layer.title}</span><small>{layer.role}</small></label>)}
        {analysisGeojson&&<span><i className="runtime-layer-dot analysis"/>Hasil analisis<small>POSTGIS</small></span>}
      </aside>
    </div>
  );
}
