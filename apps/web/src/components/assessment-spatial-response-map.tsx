"use client";

import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, Tooltip, ZoomControl, useMapEvents } from "react-leaflet";
import type { Feature, GeoJsonObject, Geometry } from "geojson";
import type { Layer, PathOptions } from "leaflet";

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

const styles:Record<MapLayer["role"],PathOptions>={
  SOURCE:{color:"#2563eb",fillColor:"#60a5fa",weight:3,fillOpacity:.25},
  TARGET:{color:"#0f766e",fillColor:"#2dd4bf",weight:2,fillOpacity:.22},
  CONTEXT:{color:"#64748b",fillColor:"#cbd5e1",weight:1.5,fillOpacity:.16},
};

function DrawClicks({enabled,onCoordinate}:{enabled:boolean;onCoordinate:(coordinate:[number,number])=>void}){
  useMapEvents({
    click(event){
      if(enabled)onCoordinate([event.latlng.lng,event.latlng.lat]);
    },
  });
  return null;
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
  onSaved,
}:{
  attemptId:string;
  questionVersionId:string;
  quizItemId:string;
  responseType:SpatialType;
  initialGeometry?:Geometry|null;
  initialSelectedFeatureIds?:string[];
  onSaved:()=>void;
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
    if(responseType==="draw-point")setCoordinates([coordinate]);
    else setCoordinates((current)=>[...current,coordinate]);
  }

  function toggleFeature(id:string){
    setSelected((current)=>current.includes(id)?current.filter((value)=>value!==id):[...current,id]);
  }

  function onEachFeature(feature:Feature<Geometry>,layer:Layer){
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
          durationMs:0,
        }),
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body.error??"Respons spasial gagal disimpan.");
      onSaved();
    }catch(reason){setError(reason instanceof Error?reason.message:"Respons spasial gagal disimpan.");}
    finally{setBusy(false);}
  }

  if(!payload)return <div className="runtime-map-shell"><div className="map-loading">Memuat peta untuk respons spasial…</div></div>;

  return (
    <div className="spatial-response-block">
      <div className="runtime-leaflet-shell">
        <MapContainer center={center} zoom={payload.bbox?11:5} className="runtime-product-map" scrollWheelZoom zoomControl={false}>
          <ZoomControl position="bottomright"/>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          <DrawClicks enabled={responseType!=="feature-select"} onCoordinate={addCoordinate}/>
          {payload.layers.filter((item)=>item.visible).map((item)=>(
            <GeoJSON
              key={item.datasetVersionId+"-"+selected.join(",")}
              data={item.geojson}
              onEachFeature={onEachFeature}
              style={(feature)=>{
                const id=feature?.id==null?"":String(feature.id);
                if(responseType==="feature-select"&&selected.includes(id)){
                  return {color:"#dc2626",fillColor:"#f87171",weight:4,fillOpacity:.38};
                }
                return {...styles[item.role],opacity:item.opacity,fillOpacity:(styles[item.role].fillOpacity??.2)*item.opacity};
              }}
            >
              <Tooltip sticky>{item.title} · {item.role}</Tooltip>
            </GeoJSON>
          ))}
          {geometry&&<GeoJSON data={{type:"Feature",properties:{},geometry} as Feature<Geometry>} style={{color:"#dc2626",fillColor:"#f87171",weight:4,fillOpacity:.28}}><Tooltip sticky>Respons siswa</Tooltip></GeoJSON>}
        </MapContainer>
      </div>

      <div className="spatial-response-toolbar">
        <div>
          <strong>{responseType==="feature-select"?"Pilih feature pada peta":"Klik peta untuk menggambar"}</strong>
          <small>{responseType==="draw-point"?"1 titik":responseType==="draw-line"?"Minimal 2 vertex":responseType==="draw-polygon"?"Minimal 3 vertex":"Bisa memilih lebih dari satu feature"}</small>
        </div>
        <span>{responseType==="feature-select"?selected.length:coordinates.length} {responseType==="feature-select"?"selected":"vertex"}</span>
        <button className="button button-secondary" type="button" onClick={()=>{setCoordinates([]);setSelected([]);}} disabled={busy}>Reset</button>
        <button className="button" type="button" onClick={save} disabled={!valid||busy}>{busy?"Menyimpan…":"Simpan Respons Spasial"}</button>
      </div>
      {error&&<p className="auth-error">{error}</p>}
    </div>
  );
}
