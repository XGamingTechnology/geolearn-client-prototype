import {basemapOptions,normalizeBasemap,type BasemapId} from "@/features/questions/experience";

export type BasemapProvider="openstreetmap"|"carto"|"opentopomap"|"arcgis"|"maptiler";
export type BasemapRuntime={id:BasemapId;label:string;url:string;attribution:string;provider:BasemapProvider;maxZoom:number;fallbackFrom?:BasemapId};
export type BasemapCredentials={arcgisApiKey?:string|null;mapTilerKey?:string|null};

const STREET:BasemapRuntime={id:"street",label:"Street",provider:"openstreetmap",url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19};
const LIGHT:BasemapRuntime={id:"light",label:"Light",provider:"carto",url:"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',maxZoom:20};
const TERRAIN:BasemapRuntime={id:"terrain",label:"Terrain",provider:"opentopomap",url:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",attribution:'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',maxZoom:17};

function credential(value:string|null|undefined){return value?.trim()??"";}

/** Resolve providers without network requests so server, browser, and tests share one policy. */
export function resolveBasemap(value:unknown,credentials:BasemapCredentials={}):BasemapRuntime{
  const requested=normalizeBasemap(value);
  if(requested==="light")return LIGHT;
  if(requested==="terrain")return TERRAIN;
  if(requested!=="satellite")return STREET;
  const arcgisApiKey=credential(credentials.arcgisApiKey);
  if(arcgisApiKey)return {id:"satellite",label:"Satellite",provider:"arcgis",url:`https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/arcgis/imagery/static/tile/{z}/{y}/{x}?token=${encodeURIComponent(arcgisApiKey)}`,attribution:'Powered by <a href="https://www.esri.com/">Esri</a> | Esri, Maxar, Earthstar Geographics, and the GIS User Community',maxZoom:23};
  const mapTilerKey=credential(credentials.mapTilerKey);
  if(mapTilerKey)return {id:"satellite",label:"Satellite",provider:"maptiler",url:`https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${encodeURIComponent(mapTilerKey)}`,attribution:'&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:20};
  return {...STREET,fallbackFrom:"satellite"};
}

export function basemapAvailability(credentials:BasemapCredentials={}):Record<BasemapId,boolean>{
  return {street:true,light:true,terrain:true,satellite:Boolean(credential(credentials.arcgisApiKey)||credential(credentials.mapTilerKey))};
}

export function availableBasemapOptions(credentials:BasemapCredentials={}){
  const availability=basemapAvailability(credentials);
  return basemapOptions.map((option)=>({...option,available:availability[option.id]}));
}
