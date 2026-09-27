"use client";
import {MapContainer,TileLayer} from "react-leaflet";
import {useEffect} from "react";
import {useMap} from "react-leaflet";
import type {LatLngBoundsExpression} from "leaflet";

type Bbox=[number,number,number,number];
function Fit({bbox}:{bbox:Bbox}){const map=useMap();useEffect(()=>{map.fitBounds([[bbox[1],bbox[0]],[bbox[3],bbox[2]]] as LatLngBoundsExpression,{padding:[16,16]});},[bbox,map]);return null;}
export function RasterDatasetPreview({tileUrl,bbox,attribution}:{tileUrl:string;bbox:Bbox;attribution:string}){return <div style={{height:360,borderRadius:12,overflow:"hidden",marginBottom:16}}><MapContainer center={[(bbox[1]+bbox[3])/2,(bbox[0]+bbox[2])/2]} zoom={8} style={{height:"100%",width:"100%"}} scrollWheelZoom><TileLayer url={tileUrl} attribution={attribution}/><Fit bbox={bbox}/></MapContainer></div>;}
