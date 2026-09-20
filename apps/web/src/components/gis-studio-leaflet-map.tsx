"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Polygon, Polyline, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { LatLngExpression, PathOptions } from "leaflet";
import L from "leaflet";

type LayerStyle={
  color?:string;fillColor?:string;weight?:number;fillOpacity?:number;radius?:number;
  markerShape?:"circle"|"square"|"diamond";dashArray?:""|"8 6"|"2 6";
};
type Layer={
  id:string;datasetId:string;datasetVersionId:string;title:string;geometryType:string|null;
  featureCount:number|null;visible:boolean;opacity:number;style?:LayerStyle;geojson:GeoJsonObject;
};
export type DigitizeMode="point"|"line"|"polygon"|null;
export type DigitizeVertex=[number,number];

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
  useMapEvents({click(event){if(mode)onAddVertex([event.latlng.lng,event.latlng.lat]);}});
  return null;
}

function mergedStyle(layer:Layer){
  const style=layer.style??{};
  const kind=layer.geometryType??"";
  if(kind.includes("Line"))return {
    color:style.color??"#2563eb",weight:style.weight??4,opacity:layer.opacity,dashArray:style.dashArray||undefined,
  };
  if(kind.includes("Polygon"))return {
    color:style.color??"#0f766e",fillColor:style.fillColor??"#2dd4bf",weight:style.weight??2,
    opacity:layer.opacity,fillOpacity:(style.fillOpacity??.25)*layer.opacity,
  };
  return {
    color:style.color??"#dc2626",fillColor:style.fillColor??style.color??"#ef4444",weight:style.weight??2,
    opacity:layer.opacity,fillOpacity:.85*layer.opacity,radius:style.radius??7,
  };
}

function pointLayer(layer:Layer,latlng:L.LatLng){
  const style=mergedStyle(layer) as L.CircleMarkerOptions&{radius:number};
  const shape=layer.style?.markerShape??"circle";
  if(shape==="circle")return L.circleMarker(latlng,style);
  const size=Math.max(6,(style.radius??7)*2);
  const rotate=shape==="diamond"?"transform:rotate(45deg);":"";
  const html=`<span style="display:block;width:${size}px;height:${size}px;background:${style.fillColor};border:${style.weight}px solid ${style.color};opacity:${style.opacity};${rotate}"></span>`;
  return L.marker(latlng,{icon:L.divIcon({html,className:"geolearn-marker-shape",iconSize:[size,size],iconAnchor:[size/2,size/2]})});
}

function DigitizePreview({mode,vertices}:{mode:DigitizeMode;vertices:DigitizeVertex[]}){
  if(!mode||!vertices.length)return null;
  const latlngs=vertices.map(([lng,lat])=>[lat,lng] as LatLngExpression);
  return <>
    {mode==="line"&&vertices.length>=2&&<Polyline positions={latlngs} pathOptions={{weight:4,dashArray:"8 6"}}/>}
    {mode==="polygon"&&vertices.length===2&&<Polyline positions={latlngs} pathOptions={{weight:3,dashArray:"8 6"}}/>}
    {mode==="polygon"&&vertices.length>=3&&<Polygon positions={latlngs} pathOptions={{weight:3,fillOpacity:.2,dashArray:"8 6"}}/>}
    {vertices.map(([lng,lat],index)=><CircleMarker
      key={`${lng}-${lat}-${index}`} center={[lat,lng]} radius={index===vertices.length-1?7:5}
      pathOptions={{weight:index===vertices.length-1?3:2,fillOpacity:1}}
    ><Tooltip permanent={index===vertices.length-1} direction="top">{mode==="point"?`P${index+1}`:`V${index+1}`}</Tooltip></CircleMarker>)}
  </>;
}

export function GisStudioLeafletMap({projectId,refreshKey,digitizeMode=null,digitizeVertices=[],onAddDigitizeVertex=()=>{}}:{
  projectId:string;refreshKey:string;digitizeMode?:DigitizeMode;digitizeVertices?:DigitizeVertex[];
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

  return <div className={"gis-leaflet-shell "+(digitizeMode?"digitizing":"")}>
    <MapContainer center={[-2.5,118]} zoom={5} className="gis-real-map" zoomControl={false} scrollWheelZoom>
      <ZoomControl position="bottomright"/>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <FitToData layers={layers}/>
      <DigitizeClickHandler mode={digitizeMode} onAddVertex={onAddDigitizeVertex}/>
      {visible.map((layer)=><GeoJSON
        key={layer.id+"-"+layer.opacity+"-"+JSON.stringify(layer.style??{})}
        data={layer.geojson}
        style={()=>mergedStyle(layer) as PathOptions}
        pointToLayer={(_feature,latlng)=>pointLayer(layer,latlng)}
      ><Tooltip sticky>{layer.title}</Tooltip></GeoJSON>)}
      <DigitizePreview mode={digitizeMode} vertices={digitizeVertices}/>
    </MapContainer>
    {digitizeMode&&<div className="gis-map-overlay digitize-hint">Klik peta untuk menambah {digitizeMode==="point"?"point":"vertex"} · {digitizeVertices.length} {digitizeMode==="point"?"feature":"vertex"}</div>}
    {loading&&<div className="gis-map-overlay">Memuat GeoJSON dari PostGIS…</div>}
    {error&&<div className="gis-map-overlay error">{error}</div>}
    {!loading&&!error&&!visible.length&&!digitizeMode&&<div className="gis-map-overlay">Belum ada layer aktif. Klik <b>+ Add Layer</b> atau mulai digitize.</div>}
  </div>;
}
