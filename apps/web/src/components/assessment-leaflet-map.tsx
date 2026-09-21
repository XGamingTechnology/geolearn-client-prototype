"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import {CircleMarker,GeoJSON,MapContainer,TileLayer,Tooltip,ZoomControl,useMap,useMapEvents} from "react-leaflet";
import type {Feature,GeoJsonObject,Geometry} from "geojson";
import type {Layer} from "leaflet";
import L from "leaflet";

import {assessmentPathStyle,assessmentPointStyle} from "./assessment-map-style";
import styles from "./assessment-map-navigation.module.css";

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
type SearchResult={id:string;label:string;lat:number;lon:number;type:string|null};
type NavTarget={lat:number;lon:number;label:string}|null;

function FitToData({bbox}:{bbox:Payload["bbox"]}){
  const map=useMap();
  if(!bbox)return null;
  return <button className="runtime-fit-button" type="button" onClick={(event)=>{event.stopPropagation();map.fitBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]],{padding:[24,24]});}}>Fit ke data</button>;
}

function NavigateToTarget({target}:{target:NavTarget}){
  const map=useMap();
  useEffect(()=>{
    if(target)map.flyTo([target.lat,target.lon],Math.max(map.getZoom(),14),{duration:.8});
  },[map,target]);
  return null;
}

function CoordinatePicker({enabled,onPick,onReadout}:{enabled:boolean;onPick:(lat:number,lon:number)=>void;onReadout:(lat:number,lon:number)=>void}){
  useMapEvents({
    mousemove(event){onReadout(event.latlng.lat,event.latlng.lng);},
    click(event){if(enabled)onPick(event.latlng.lat,event.latlng.lng);},
  });
  return null;
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

function validCoordinate(lat:number,lon:number){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;}

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
  const [searchQuery,setSearchQuery]=useState("");
  const [searchResults,setSearchResults]=useState<SearchResult[]>([]);
  const [searching,setSearching]=useState(false);
  const [searchError,setSearchError]=useState("");
  const [latInput,setLatInput]=useState("");
  const [lonInput,setLonInput]=useState("");
  const [target,setTarget]=useState<NavTarget>(null);
  const [pickMode,setPickMode]=useState(false);
  const [readout,setReadout]=useState<{lat:number;lon:number}|null>(null);

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

  async function searchPlace(event:FormEvent){
    event.preventDefault();
    const q=searchQuery.trim();
    if(q.length<2){setSearchError("Masukkan minimal 2 karakter.");return;}
    setSearching(true);setSearchError("");setSearchResults([]);
    try{
      const response=await fetch(`/api/map/search?q=${encodeURIComponent(q)}`,{cache:"no-store"});
      const body=await response.json() as {results?:SearchResult[];error?:string};
      if(!response.ok)throw new Error(body.error??"Pencarian gagal.");
      const results=body.results??[];
      setSearchResults(results);
      if(!results.length)setSearchError("Tempat tidak ditemukan.");
    }catch(reason){setSearchError(reason instanceof Error?reason.message:"Pencarian gagal.");}
    finally{setSearching(false);}
  }

  function chooseResult(result:SearchResult){
    setTarget({lat:result.lat,lon:result.lon,label:result.label});
    setLatInput(result.lat.toFixed(6));setLonInput(result.lon.toFixed(6));setSearchResults([]);
  }

  function goToCoordinate(){
    const lat=Number(latInput);const lon=Number(lonInput);
    if(!validCoordinate(lat,lon)){setSearchError("Koordinat tidak valid. Lat -90…90, lon -180…180.");return;}
    setSearchError("");setTarget({lat,lon,label:`${lat.toFixed(6)}, ${lon.toFixed(6)}`});
  }

  function pickCoordinate(lat:number,lon:number){
    setLatInput(lat.toFixed(6));setLonInput(lon.toFixed(6));
    setTarget({lat,lon,label:"Koordinat pilihan"});setPickMode(false);
  }

  if(error)return <div className="runtime-media-shell">{error}</div>;
  if(!payload)return <div className="runtime-map-shell"><div className="map-loading">Memuat DatasetVersion dari PostGIS…</div></div>;

  return (
    <div className={styles.workspace}>
      <section className={styles.toolbar} aria-label="Navigasi peta">
        <form className={styles.searchBox} onSubmit={searchPlace}>
          <label htmlFor={`place-search-${questionVersionId}`}>Cari tempat</label>
          <div className={styles.inlineControls}>
            <input id={`place-search-${questionVersionId}`} value={searchQuery} onChange={(event)=>setSearchQuery(event.target.value)} placeholder="Contoh: Pekanbaru, Riau"/>
            <button type="submit" disabled={searching}>{searching?"Mencari…":"Cari"}</button>
          </div>
          {searchResults.length>0&&<div className={styles.results}>{searchResults.map((result)=><button type="button" key={result.id} onClick={()=>chooseResult(result)}><strong>{result.label}</strong><small>{result.lat.toFixed(5)}, {result.lon.toFixed(5)}</small></button>)}</div>}
        </form>
        <div className={styles.coordinateBox}>
          <span>Koordinat</span>
          <div className={styles.coordinateInputs}><input inputMode="decimal" aria-label="Latitude" value={latInput} onChange={(event)=>setLatInput(event.target.value)} placeholder="Latitude"/><input inputMode="decimal" aria-label="Longitude" value={lonInput} onChange={(event)=>setLonInput(event.target.value)} placeholder="Longitude"/></div>
          <div className={styles.inlineControls}><button type="button" onClick={goToCoordinate}>Pergi</button><button className={pickMode?styles.activeButton:""} type="button" onClick={()=>setPickMode((value)=>!value)}>{pickMode?"Klik peta…":"Ambil dari peta"}</button></div>
        </div>
        <div className={styles.readout}><span>Pointer</span><strong>{readout?`${readout.lat.toFixed(5)}, ${readout.lon.toFixed(5)}`:"Gerakkan pointer di peta"}</strong>{target&&<small>Marker: {target.label}</small>}</div>
      </section>
      {searchError&&<div className={styles.error}>{searchError}</div>}
      <div className="runtime-leaflet-shell">
        <MapContainer key={questionVersionId} center={center} zoom={payload.bbox?11:5} className="runtime-product-map" scrollWheelZoom zoomControl={false}>
          <ZoomControl position="bottomright"/>
          <FitToData bbox={payload.bbox}/>
          <NavigateToTarget target={target}/>
          <CoordinatePicker enabled={pickMode} onPick={pickCoordinate} onReadout={(lat,lon)=>setReadout({lat,lon})}/>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {payload.layers.filter((layer)=>(visibility[layer.datasetVersionId]??layer.visible)).map((layer)=>(
            <GeoJSON key={layer.datasetVersionId} data={layer.geojson} style={(feature)=>feature?.geometry.type==="Point"||feature?.geometry.type==="MultiPoint"?assessmentPointStyle(layer.role,layer.opacity):assessmentPathStyle(layer.role,layer.opacity)} pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,assessmentPointStyle(layer.role,layer.opacity))} onEachFeature={bindSafePopup}><Tooltip sticky>{layer.title} · {layer.role}</Tooltip></GeoJSON>
          ))}
          {analyses.filter((analysis)=>analysis.geojson&&(analysisVisibility[analysis.toolId]??true)).map((analysis)=>(
            <GeoJSON key={analysis.toolId} data={analysis.geojson!} style={analysisStyle(analysis.toolId)} pointToLayer={(_feature,latlng)=>L.circleMarker(latlng,analysisPointStyle(analysis.toolId))} onEachFeature={bindSafePopup}><Tooltip sticky>{analysis.title} · hasil PostGIS</Tooltip></GeoJSON>
          ))}
          {target&&<CircleMarker center={[target.lat,target.lon]} radius={9} pathOptions={{color:"#0f172a",fillColor:"#ffffff",fillOpacity:1,weight:3}}><Tooltip permanent direction="top" offset={[0,-8]}>{target.label}</Tooltip></CircleMarker>}
        </MapContainer>
        <aside className="runtime-layer-list">
          <strong>Layer Peta</strong>
          {payload.layers.map((layer)=><label key={layer.datasetVersionId}><input type="checkbox" checked={visibility[layer.datasetVersionId]??layer.visible} onChange={(event)=>setVisibility((current)=>({...current,[layer.datasetVersionId]:event.target.checked}))}/><i className={"runtime-layer-dot "+layer.role.toLowerCase()}/><span>{layer.title}</span><small>{layer.role}</small></label>)}
          {analyses.filter((analysis)=>analysis.geojson).map((analysis)=><label key={analysis.toolId}><input type="checkbox" checked={analysisVisibility[analysis.toolId]??true} onChange={(event)=>setAnalysisVisibility((current)=>({...current,[analysis.toolId]:event.target.checked}))}/><i className="runtime-layer-dot" style={{background:analysisColor(analysis.toolId)}}/><span>Hasil {analysis.title}</span><small>POSTGIS</small></label>)}
        </aside>
      </div>
      <p className={styles.note}>Pencarian dan koordinat hanya membantu navigasi peta. Fitur ini tidak mengubah dataset, jawaban, atau analisis PostGIS.</p>
    </div>
  );
}
