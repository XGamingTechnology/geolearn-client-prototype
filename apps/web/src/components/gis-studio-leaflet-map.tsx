"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Polygon, Polyline, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { LatLngExpression, PathOptions } from "leaflet";
import L from "leaflet";

type Layer={
  id:string;datasetId:string;datasetVersionId:string;title:string;geometryType:string|null;
  featureCount:number|null;visible:boolean;opacity:number;geojson:GeoJsonObject;
};
export type DigitizeMode="point"|"line"|"polygon"|null;
export type DigitizeVertex=[number,number]; // [lng, lat]

function FitToData({layers}:{layers:Layer[]}){
  const map=useMap();
  useEffect(()=>{
    const bounds=L.latLngBounds([]);
    for(const layer of layers){
      if(!layer.visible)continue;
      const geo=L.geoJSON(layer.geojson);
      const layerBounds=geo.getBounds();
      if(layerBounds.isValid())bounds.extend(layerBounds);
    }
    if(bounds.isValid())map.fitBounds(bounds.pad(0.12));
  },[layers,map]);
  return null;
}

function DigitizeClickHandler({mode,onAddVertex}:{mode:DigitizeMode;onAddVertex:(vertex:DigitizeVertex)=>void}){
  useMapEvents({
    click(event){
      if(!mode)return;
      onAddVertex([event.latlng.lng,event.latlng.lat]);
    },
  });
  return null;
}

function styleFor(layer:Layer):PathOptions{
  const kind=layer.geometryType??"";
  if(kind.includes("Line"))return {color:"#2563eb",weight:4,opacity:layer.opacity};
  if(kind.includes("Polygon"))return {color:"#0f766e",fillColor:"#2dd4bf",weight:2,opacity:layer.opacity,fillOpacity:.25*layer.opacity};
  return {color:"#dc2626",fillColor:"#ef4444",weight:2,opacity:layer.opacity,fillOpacity:.75*layer.opacity,radius:7} as PathOptions;
}

function DigitizePreview({mode,vertices}:{mode:DigitizeMode;vertices:DigitizeVertex[]}){
  if(!mode||!vertices.length)return null;
  const latlngs=vertices.map(([lng,lat])=>[lat,lng] as LatLngExpression);
  return <>
    {mode==="line"&&vertices.length>=2&&<Polyline positions={latlngs} pathOptions={{weight:4,dashArray:"8 6"}}/>}
    {mode==="polygon"&&vertices.length===2&&<Polyline positions={latlngs} pathOptions={{weight:3,dashArray:"8 6"}}/>}
    {mode==="polygon"&&vertices.length>=3&&<Polygon positions={latlngs} pathOptions={{weight:3,fillOpacity:.2,dashArray:"8 6"}}/>}
    {vertices.map(([lng,lat],index)=><CircleMarker
      key={`${lng}-${lat}-${index}`}
      center={[lat,lng]}
      radius={index===vertices.length-1?7:5}
      pathOptions={{weight:index===vertices.length-1?3:2,fillOpacity:1}}
    ><Tooltip permanent={index===vertices.length-1} direction="top">V{index+1}</Tooltip></CircleMarker>)}
  </>;
}

export function GisStudioLeafletMap({
  projectId,
  refreshKey,
  digitizeMode=null,
  digitizeVertices=[],
  onAddDigitizeVertex=()=>{},
}:{
  projectId:string;
  refreshKey:string;
  digitizeMode?:DigitizeMode;
  digitizeVertices?:DigitizeVertex[];
  onAddDigitizeVertex?:(vertex:DigitizeVertex)=>void;
}){
  const [layers,setLayers]=useState<Layer[]>([]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    fetch(`/api/gis/projects/${projectId}/map?refresh=${encodeURIComponent(refreshKey)}`,{cache:"no-store"})
      .then(async(response)=>{
        const body=await response.json();
        if(!response.ok)throw new Error(body.error??"Peta tidak tersedia");
        if(active){setError("");setLayers(Array.isArray(body.layers)?body.layers:[]);}
      })
      .catch((reason)=>{if(active)setError(reason instanceof Error?reason.message:"Peta tidak tersedia");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[projectId,refreshKey]);

  const visible=useMemo(()=>layers.filter((layer)=>layer.visible),[layers]);

  return (
    <div className={"gis-leaflet-shell "+(digitizeMode?"digitizing":"")}>
      <MapContainer center={[-2.5,118]} zoom={5} className="gis-real-map" zoomControl={false} scrollWheelZoom>
        <ZoomControl position="bottomright"/>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        <FitToData layers={layers}/>
        <DigitizeClickHandler mode={digitizeMode} onAddVertex={onAddDigitizeVertex}/>
        {visible.map((layer)=>(
          <GeoJSON
            key={layer.id+"-"+layer.opacity}
            data={layer.geojson}
            style={()=>styleFor(layer)}
            pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,styleFor(layer))}
          >
            <Tooltip sticky>{layer.title}</Tooltip>
          </GeoJSON>
        ))}
        <DigitizePreview mode={digitizeMode} vertices={digitizeVertices}/>
      </MapContainer>
      {digitizeMode&&<div className="gis-map-overlay digitize-hint">Klik peta untuk menambah vertex · {digitizeVertices.length} vertex</div>}
      {loading&&<div className="gis-map-overlay">Memuat GeoJSON dari PostGIS…</div>}
      {error&&<div className="gis-map-overlay error">{error}</div>}
      {!loading&&!error&&!visible.length&&!digitizeMode&&<div className="gis-map-overlay">Belum ada layer aktif. Klik <b>+ Add Layer</b> atau mulai digitize.</div>}
    </div>
  );
}
