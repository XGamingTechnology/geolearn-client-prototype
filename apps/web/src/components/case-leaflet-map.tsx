"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { PathOptions } from "leaflet";
import L from "leaflet";

type Layer={
  id:string;datasetId:string;datasetVersionId:string;title:string;role:"CONTEXT"|"SOURCE"|"TARGET";
  position:number;visible:boolean;opacity:number;geometryType:string|null;featureCount:number|null;geojson:unknown;
};

function FitToVisible({layers}:{layers:Layer[]}){
  const map=useMap();
  useEffect(()=>{
    const bounds=L.latLngBounds([]);
    for(const layer of layers){
      if(!layer.visible)continue;
      const geo=L.geoJSON(layer.geojson as GeoJsonObject);
      const layerBounds=geo.getBounds();
      if(layerBounds.isValid())bounds.extend(layerBounds);
    }
    if(bounds.isValid())map.fitBounds(bounds.pad(0.12));
  },[layers,map]);
  return null;
}

function styleFor(layer:Layer):PathOptions{
  const kind=layer.geometryType??"";
  if(layer.role==="SOURCE"){
    if(kind.includes("Line"))return {color:"#2563eb",weight:4,opacity:layer.opacity};
    if(kind.includes("Polygon"))return {color:"#2563eb",fillColor:"#60a5fa",weight:2,opacity:layer.opacity,fillOpacity:.24*layer.opacity};
    return {color:"#1d4ed8",fillColor:"#3b82f6",weight:2,opacity:layer.opacity,fillOpacity:.8*layer.opacity,radius:7} as PathOptions;
  }
  if(layer.role==="TARGET"){
    if(kind.includes("Line"))return {color:"#dc2626",weight:4,opacity:layer.opacity};
    if(kind.includes("Polygon"))return {color:"#dc2626",fillColor:"#f87171",weight:2,opacity:layer.opacity,fillOpacity:.2*layer.opacity};
    return {color:"#b91c1c",fillColor:"#ef4444",weight:2,opacity:layer.opacity,fillOpacity:.8*layer.opacity,radius:7} as PathOptions;
  }
  if(kind.includes("Line"))return {color:"#64748b",weight:3,opacity:layer.opacity};
  if(kind.includes("Polygon"))return {color:"#0f766e",fillColor:"#2dd4bf",weight:2,opacity:layer.opacity,fillOpacity:.18*layer.opacity};
  return {color:"#475569",fillColor:"#94a3b8",weight:2,opacity:layer.opacity,fillOpacity:.75*layer.opacity,radius:6} as PathOptions;
}

export function CaseLeafletMap({initialLayers}:{initialLayers:Layer[]}){
  const [layers,setLayers]=useState(initialLayers);
  const visible=useMemo(()=>layers.filter((layer)=>layer.visible),[layers]);
  function toggle(id:string){
    setLayers((current)=>current.map((layer)=>layer.id===id?{...layer,visible:!layer.visible}:layer));
  }

  return (
    <div className="gis-leaflet-shell">
      <div className="case-map-layer-panel">
        <strong>Layer Case</strong>
        {layers.map((layer)=>(
          <label key={layer.id} className="case-map-layer-row">
            <input type="checkbox" checked={layer.visible} onChange={()=>toggle(layer.id)}/>
            <span>{layer.title}</span>
            <small>{layer.role}</small>
          </label>
        ))}
        {!layers.length&&<small>Belum ada dataset yang terikat ke Case ini.</small>}
      </div>
      <MapContainer center={[-2.5,118]} zoom={5} className="gis-real-map" zoomControl={false} scrollWheelZoom>
        <ZoomControl position="bottomright"/>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        <FitToVisible layers={layers}/>
        {visible.map((layer)=>(
          <GeoJSON
            key={layer.id+"-"+layer.visible}
            data={layer.geojson as GeoJsonObject}
            style={()=>styleFor(layer)}
            pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,styleFor(layer))}
          >
            <Tooltip sticky>{layer.title} · {layer.role}</Tooltip>
          </GeoJSON>
        ))}
      </MapContainer>
      {!layers.length&&<div className="gis-map-overlay">Tambahkan dataset dari Data Bank ke Case draft.</div>}
    </div>
  );
}
