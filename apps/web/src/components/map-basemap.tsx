"use client";

import {useEffect} from "react";
import {TileLayer,useMap} from "react-leaflet";
import {normalizeBasemap,type BasemapId} from "@/features/questions/experience";

export type BasemapRuntime={id:BasemapId;label:string;url:string;attribution:string;maxZoom?:number;fallbackFrom?:BasemapId};
const mapTilerKey=process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim()??"";
export const satelliteBasemapAvailable=Boolean(mapTilerKey);

export function basemapRuntime(value:unknown):BasemapRuntime{
  const requested=normalizeBasemap(value);
  if(requested==="light")return {id:"light",label:"Light",url:"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",attribution:'&copy; OpenStreetMap contributors &copy; CARTO',maxZoom:20};
  if(requested==="terrain")return {id:"terrain",label:"Terrain",url:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",attribution:'Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap',maxZoom:17};
  if(requested==="satellite"&&mapTilerKey)return {id:"satellite",label:"Satellite",url:`https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${mapTilerKey}`,attribution:'&copy; MapTiler &copy; OpenStreetMap contributors',maxZoom:20};
  if(requested==="satellite")return {id:"street",label:"Street",url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",attribution:'&copy; OpenStreetMap contributors',maxZoom:19,fallbackFrom:"satellite"};
  return {id:"street",label:"Street",url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",attribution:'&copy; OpenStreetMap contributors',maxZoom:19};
}

function ResponsiveMapSize(){
  const map=useMap();
  useEffect(()=>{
    const container=map.getContainer();
    const sync=()=>map.invalidateSize({pan:false});
    const frame=requestAnimationFrame(sync);
    const observer=new ResizeObserver(()=>requestAnimationFrame(sync));
    observer.observe(container);
    window.addEventListener("orientationchange",sync);
    window.addEventListener("resize",sync);
    const timer=window.setTimeout(sync,250);
    return()=>{cancelAnimationFrame(frame);window.clearTimeout(timer);observer.disconnect();window.removeEventListener("orientationchange",sync);window.removeEventListener("resize",sync);};
  },[map]);
  return null;
}

export function GeoLearnBasemap({value}:{value:unknown}){
  const config=basemapRuntime(value);
  return <><ResponsiveMapSize/><TileLayer key={`${config.id}-${config.url}`} attribution={config.attribution} url={config.url} maxZoom={config.maxZoom}/></>;
}
