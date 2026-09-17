"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import type { Feature, GeoJsonObject, Geometry } from "geojson";
import type { Layer } from "leaflet";
import L from "leaflet";

import { assessmentPathStyle, assessmentPointStyle } from "./assessment-map-style";

type SpatialType="draw-point"|"draw-line"|"draw-polygon"|"feature-select";
type MapLayer={
  datasetVersionId:string;
  title:string;
  role:"SOURCE"|"TARGET"|"CONTEXT";
  visible:boolean;
  opacity:number;
  geojson:GeoJsonObject;
};
type Payload={layers:MapLayer[];bbox:[number,number,number,number]|null};

function DrawClicks({enabled,onCoordinate}:{enabled:boolean;onCoordinate:(coordinate:[number,number])=>void}){
  useMapEvents({
    click(event){
      if(enabled)onCoordinate([event.latlng.lng,event.latlng.lat]);
    },
  });
  return null;
}

function FitToData({bbox}:{bbox:Payload["bbox"]}){
  const map=useMap();
  if(!bbox)return null;
  return <button className="runtime-fit-button" type="button" onClick={(event)=>{event.stopPropagation();map.fitBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]],{padding:[24,24]});}}>Fit ke data</button>;
}

function bindSafePopup(feature:Feature<Geometry>,layer:Layer){
  const properties=feature.properties??{};
  const entries=Object.entries(properties).filter(([,value])=>value===null||["string","number","boolean"].includes(typeof value)).slice(0,12);
  if(!entries.length)return;
  const content=document.createElement("dl");
  content.className="runtime-feature-popup";
  for(const [key,value] of entries){
    const term=document.createElement("dt");term.textContent=key;
    const detail=document.createElement("dd");detail.textContent=value===null?"—":String(value);
    content.append(term,detail);
  }
  layer.bindPopup(content);
}

function draftGeometry(type:SpatialType,coordinates:Array<[number,number]>):Geometry|null{
  if(type==="draw-point"&&coordinates.length>=1)return {type:"Point",coordinates:coordinates[coordinates.length-1]};
  if(type==="draw-line"&&coordinates.length>=2)return {type:"LineString",coordinates};
  if(type==="draw-polygon"&&coordinates.length>=3)return {type:"Polygon",coordinates:[[...coordinates,coordinates[0]]]};
  return null;
}

export function AssessmentSpatialResponseMap({
  attemptId,
  questionVersionId,
  quizItemId,
  responseType,
  initialGeometry,
  initialSelectedFeatureIds,
  durationMs,
  onDirtyChange,
  onSaved,
}:{
  attemptId:string;
  questionVersionId:string;
  quizItemId:string;
  responseType:SpatialType;
  initialGeometry?:Geometry|null;
  initialSelectedFeatureIds?:string[];
  durationMs:()=>number;
  onDirtyChange:(dirty:boolean)=>void;
  onSaved:(value:{responseType:string;geometry:GeoJsonObject|null;selectedFeatureIds:string[]})=>void;
}){
  const [payload,setPayload]=useState<Payload|null>(null);
  const [coordinates,setCoordinates]=useState<Array<[number,number]>>(()=>{
    if(!initialGeometry)return [];
    if(initialGeometry.type==="Point")return [initialGeometry.coordinates as [number,number]];
    if(initialGeometry.type==="LineString")return initialGeometry.coordinates as Array<[number,number]>;
    if(initialGeometry.type==="Polygon"){
      const ring=(initialGeometry.coordinates[0]??[]) as Array<[number,number]>;
      return ring.length>1?ring.slice(0,-1):ring;
    }
    return [];
  });
  const [selected,setSelected]=useState<string[]>(initialSelectedFeatureIds??[]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
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
  const geometry=draftGeometry(responseType,coordinates);
  const valid=responseType==="feature-select"?selected.length>0:Boolean(geometry);

  function addCoordinate(coordinate:[number,number]){
    setError("");
    onDirtyChange(true);
    if(responseType==="draw-point")setCoordinates([coordinate]);
    else setCoordinates((current)=>[...current,coordinate]);
  }

  function toggleFeature(id:string){
    onDirtyChange(true);
    setSelected((current)=>current.includes(id)?current.filter((value)=>value!==id):[...current,id]);
  }

  function onEachFeature(feature:Feature<Geometry>,layer:Layer){
    bindSafePopup(feature,layer);
    if(responseType!=="feature-select")return;
    const id=feature.id==null?null:String(feature.id);
    if(!id)return;
    layer.on("click",()=>toggleFeature(id));
  }

  async function save(){
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/assessment/attempts/${attemptId}/spatial-responses`,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          quizItemId,responseType,
          geometry:responseType==="feature-select"?undefined:geometry,
          selectedFeatureIds:responseType==="feature-select"?selected:undefined,
          durationMs:durationMs(),
        }),
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body.error??"Respons spasial gagal disimpan.");
      onDirtyChange(false);
      onSaved({
        responseType,
        geometry:responseType==="feature-select"?null:geometry,
        selectedFeatureIds:responseType==="feature-select"?selected:[],
      });
    }catch(reason){setError(reason instanceof Error?reason.message:"Respons spasial gagal disimpan.");}
    finally{setBusy(false);}
  }

  if(!payload)return <div className="runtime-map-shell"><div className="map-loading">Memuat peta untuk respons spasial…</div></div>;

  return (
    <div className="spatial-response-block">
      <div className="runtime-leaflet-shell">
        <MapContainer center={center} zoom={payload.bbox?11:5} className="runtime-product-map" scrollWheelZoom zoomControl={false}>
          <ZoomControl position="bottomright"/>
          <FitToData bbox={payload.bbox}/>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          <DrawClicks enabled={responseType!=="feature-select"} onCoordinate={addCoordinate}/>
          {payload.layers.filter((item)=>(visibility[item.datasetVersionId]??item.visible)).map((item)=>(
            <GeoJSON
              key={item.datasetVersionId+"-"+selected.join(",")}
              data={item.geojson}
              onEachFeature={onEachFeature}
              pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,assessmentPointStyle(item.role,item.opacity))}
              style={(feature)=>{
                const id=feature?.id==null?"":String(feature.id);
                if(responseType==="feature-select"&&selected.includes(id)){
                  return {color:"#dc2626",fillColor:"#f87171",weight:4,fillOpacity:.38};
                }
                return feature?.geometry.type==="Point"||feature?.geometry.type==="MultiPoint"
                  ?assessmentPointStyle(item.role,item.opacity)
                  :assessmentPathStyle(item.role,item.opacity);
              }}
            >
              <Tooltip sticky>{item.title} · {item.role}</Tooltip>
            </GeoJSON>
          ))}
          {geometry&&<GeoJSON data={{type:"Feature",properties:{},geometry} as Feature<Geometry>} style={{color:"#dc2626",fillColor:"#f87171",weight:4,fillOpacity:.28}} pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,{radius:7,color:"#dc2626",fillColor:"#f87171",weight:4,fillOpacity:.75})}><Tooltip sticky>Respons siswa</Tooltip></GeoJSON>}
        </MapContainer>
        <aside className="runtime-layer-list">
          <strong>Layer peta</strong>
          {payload.layers.map((layer)=><label key={layer.datasetVersionId}><input type="checkbox" checked={visibility[layer.datasetVersionId]??layer.visible} onChange={(event)=>setVisibility((current)=>({...current,[layer.datasetVersionId]:event.target.checked}))}/><i className={"runtime-layer-dot "+layer.role.toLowerCase()}/><span>{layer.title}</span><small>{layer.role}</small></label>)}
        </aside>
      </div>

      <div className="spatial-response-toolbar">
        <div>
          <strong>{responseType==="feature-select"?"Pilih feature pada peta":"Klik peta untuk menggambar"}</strong>
          <small>{responseType==="draw-point"?"1 titik":responseType==="draw-line"?"Minimal 2 vertex":responseType==="draw-polygon"?"Minimal 3 vertex":"Bisa memilih lebih dari satu feature"}</small>
        </div>
        <span>{responseType==="feature-select"?selected.length:coordinates.length} {responseType==="feature-select"?"selected":"vertex"}</span>
        {responseType!=="feature-select"&&<button className="button button-secondary" type="button" onClick={()=>{setCoordinates((current)=>current.slice(0,-1));onDirtyChange(true);}} disabled={busy||coordinates.length===0}>Urungkan vertex</button>}
        <button className="button button-secondary" type="button" onClick={()=>{setCoordinates([]);setSelected([]);onDirtyChange(true);}} disabled={busy}>Reset</button>
        <button className="button" type="button" onClick={save} disabled={!valid||busy}>{busy?"Menyimpan…":"Simpan Respons Spasial"}</button>
      </div>
      {error&&<p className="auth-error">{error}</p>}
    </div>
  );
}
