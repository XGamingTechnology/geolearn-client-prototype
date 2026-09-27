"use client";

import {useEffect} from "react";
import {TileLayer,useMap} from "react-leaflet";
import {type BasemapId} from "@/features/questions/experience";
import {availableBasemapOptions,basemapAvailability,resolveBasemap,type BasemapRuntime} from "@/features/maps/basemap-provider";
import styles from "./map-basemap.module.css";

export type {BasemapRuntime} from "@/features/maps/basemap-provider";
const cartoApiKey=process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim()??"";
const arcgisApiKey=process.env.NEXT_PUBLIC_ARCGIS_API_KEY?.trim()??"";
const mapTilerKey=process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim()??"";
const credentials={cartoApiKey,arcgisApiKey,mapTilerKey};
export const basemapProviderAvailability=basemapAvailability(credentials);
export const satelliteBasemapAvailable=basemapProviderAvailability.satellite;

export function basemapRuntime(value:unknown):BasemapRuntime{
  return resolveBasemap(value,credentials);
}

export function BasemapSwitcher({value,onChange}:{value:BasemapId;onChange:(value:BasemapId)=>void}){
  return <div className={styles.options}>{availableBasemapOptions(credentials).map((option)=><button key={option.id} type="button" disabled={!option.available} aria-pressed={option.available&&value===option.id} onClick={()=>onChange(option.id)}><strong>{option.label}</strong><span>{option.available?option.description:option.id==="light"?"Provider Light belum dikonfigurasi":"Provider belum dikonfigurasi"}</span></button>)}</div>;
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
