"use client";
import {MapContainer,TileLayer} from "react-leaflet";
import {useEffect,useState} from "react";
import {useMap} from "react-leaflet";
import type {LatLngBoundsExpression} from "leaflet";
import {leafletRasterBounds} from "@/server/data/raster-rendering";

type Bbox=[number,number,number,number];
function Fit({bbox}:{bbox:Bbox}){const map=useMap();useEffect(()=>{map.fitBounds(leafletRasterBounds(bbox) as LatLngBoundsExpression,{padding:[16,16]});},[bbox,map]);return null;}
export function RasterDatasetPreview({tileUrl,bbox,attribution}:{tileUrl:string;bbox:Bbox;attribution:string}){
  const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");
  return <div style={{height:360,borderRadius:12,overflow:"hidden",marginBottom:16,position:"relative"}} aria-busy={status==="loading"}>
    <MapContainer center={[(bbox[1]+bbox[3])/2,(bbox[0]+bbox[2])/2]} zoom={8} style={{height:"100%",width:"100%"}} scrollWheelZoom>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors"/>
      <TileLayer url={tileUrl} attribution={attribution} eventHandlers={{loading:()=>setStatus("loading"),load:()=>setStatus("ready"),tileerror:()=>setStatus("error")}}/>
      <Fit bbox={bbox}/>
    </MapContainer>
    {status!=="ready"&&<div role={status==="error"?"alert":"status"} style={{position:"absolute",zIndex:1000,left:12,bottom:12,maxWidth:"calc(100% - 24px)",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,.94)",boxShadow:"0 2px 8px rgba(0,0,0,.2)",fontSize:13}}>{status==="loading"?"Memuat tile raster…":"Tile raster gagal ditampilkan. Periksa layanan raster atau muat ulang halaman."}</div>}
  </div>;
}
