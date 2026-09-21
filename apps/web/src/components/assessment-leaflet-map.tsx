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
type AnalysisLayer={toolId:string;title:string;geojson:GeoJsonObject|null};
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

function analysisStyle(toolId:string):L.PathOptions{
  if(toolId==="buffer")return {color:"#d97706",fillColor:"#f59e0b",weight:3,dashArray:"7 5",fillOpacity:.22};
  if(toolId==="overlay")return {color:"#7c3aed",fillColor:"#8b5cf6",weight:4,fillOpacity:.38};
  return {color:"#db2777",weight:4,dashArray:"10 6",fillOpacity:.08};
}

function analysisPointStyle(toolId:string){
  const style=analysisStyle(toolId);
  return {radius:8,color:String(style.color),fillColor:String(style.fillColor??style.color),fillOpacity:.85,weight:3};
}

function analysisColor(toolId:string){
  if(toolId==="buffer")return "#d97706";
  if(toolId==="overlay")return "#7c3aed";
  return "#db2777";
}

export function AssessmentLeafletMap({
  attemptId,
  questionVersionId,
  analyses,
}:{
  attemptId:string;
  questionVersionId:string;
  analyses:AnalysisLayer[];
}){
  const [payload,setPayload]=useState<Payload|null>(null);
  const [error,setError]=useState("");
  const [visibility,setVisibility]=useState<Record<string,boolean>>({});
  const [analysisVisibility,setAnalysisVisibility]=useState<Record<string,boolean>>({});

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
        {analyses.filter((analysis)=>analysis.geojson&&(analysisVisibility[analysis.toolId]??true)).map((analysis)=>(
          <GeoJSON key={analysis.toolId} data={analysis.geojson!} style={analysisStyle(analysis.toolId)} pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,analysisPointStyle(analysis.toolId))} onEachFeature={bindSafePopup}>
            <Tooltip sticky>{analysis.title} · hasil PostGIS</Tooltip>
          </GeoJSON>
        ))}
      </MapContainer>
      <aside className="runtime-layer-list">
        <strong>Layer Peta</strong>
        {payload.layers.map((layer)=><label key={layer.datasetVersionId}><input type="checkbox" checked={visibility[layer.datasetVersionId]??layer.visible} onChange={(event)=>setVisibility((current)=>({...current,[layer.datasetVersionId]:event.target.checked}))}/><i className={"runtime-layer-dot "+layer.role.toLowerCase()}/><span>{layer.title}</span><small>{layer.role}</small></label>)}
        {analyses.filter((analysis)=>analysis.geojson).map((analysis)=><label key={analysis.toolId}><input type="checkbox" checked={analysisVisibility[analysis.toolId]??true} onChange={(event)=>setAnalysisVisibility((current)=>({...current,[analysis.toolId]:event.target.checked}))}/><i className="runtime-layer-dot" style={{background:analysisColor(analysis.toolId)}}/><span>Hasil {analysis.title}</span><small>POSTGIS</small></label>)}
      </aside>
    </div>
  );
}
