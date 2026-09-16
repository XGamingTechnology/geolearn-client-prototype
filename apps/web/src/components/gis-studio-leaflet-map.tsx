"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { LatLngBoundsExpression, PathOptions } from "leaflet";
import L from "leaflet";

type Layer={
  id:string;datasetId:string;datasetVersionId:string;title:string;geometryType:string|null;
  featureCount:number|null;visible:boolean;opacity:number;geojson:GeoJsonObject;
};

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

function styleFor(layer:Layer):PathOptions{
  const kind=layer.geometryType??"";
  if(kind.includes("Line"))return {color:"#2563eb",weight:4,opacity:layer.opacity};
  if(kind.includes("Polygon"))return {color:"#0f766e",fillColor:"#2dd4bf",weight:2,opacity:layer.opacity,fillOpacity:.25*layer.opacity};
  return {color:"#dc2626",fillColor:"#ef4444",weight:2,opacity:layer.opacity,fillOpacity:.75*layer.opacity,radius:7} as PathOptions;
}

export function GisStudioLeafletMap({projectId,refreshKey}:{projectId:string;refreshKey:string}){
  const [layers,setLayers]=useState<Layer[]>([]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    setLoading(true);setError("");
    fetch(`/api/gis/projects/${projectId}/map?refresh=${encodeURIComponent(refreshKey)}`,{cache:"no-store"})
      .then(async(response)=>{
        const body=await response.json();
        if(!response.ok)throw new Error(body.error??"Peta tidak tersedia");
        if(active)setLayers(Array.isArray(body.layers)?body.layers:[]);
      })
      .catch((reason)=>{if(active)setError(reason instanceof Error?reason.message:"Peta tidak tersedia");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[projectId,refreshKey]);

  const visible=useMemo(()=>layers.filter((layer)=>layer.visible),[layers]);

  return (
    <div className="gis-leaflet-shell">
      <MapContainer center={[-2.5,118]} zoom={5} className="gis-real-map" zoomControl={false} scrollWheelZoom>
        <ZoomControl position="bottomright"/>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        <FitToData layers={layers}/>
        {visible.map((layer)=>(
          <GeoJSON
            key={layer.id+"-"+layer.opacity}
            data={layer.geojson}
            style={()=>styleFor(layer)}
            pointToLayer={(feature,latlng)=>L.circleMarker(latlng,styleFor(layer))}
          >
            <Tooltip sticky>{layer.title}</Tooltip>
          </GeoJSON>
        ))}
      </MapContainer>
      {loading&&<div className="gis-map-overlay">Memuat GeoJSON dari PostGIS…</div>}
      {error&&<div className="gis-map-overlay error">{error}</div>}
      {!loading&&!error&&!visible.length&&<div className="gis-map-overlay">Belum ada layer aktif. Klik <b>+ Add Layer</b>.</div>}
    </div>
  );
}
