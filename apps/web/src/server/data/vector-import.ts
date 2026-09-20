import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { kml } from "@tmcw/togeojson";
import shp from "shpjs";

type GeoJsonFeatureCollection={type:"FeatureCollection";features:unknown[]};

export type ImportedVector={
  format:"GeoJSON"|"KML"|"KMZ"|"Shapefile";
  srid:number;
  geojson:GeoJsonFeatureCollection;
};

const MAX_UNCOMPRESSED=50*1024*1024;
const MAX_ARCHIVE_ENTRIES=100;

function asFeatureCollection(value:unknown):GeoJsonFeatureCollection{
  if(!value||typeof value!=="object"||(value as {type?:unknown}).type!=="FeatureCollection"){
    throw new Error("Hasil import bukan GeoJSON FeatureCollection.");
  }
  const features=(value as {features?:unknown}).features;
  if(!Array.isArray(features)||features.length===0)throw new Error("Dataset tidak memiliki feature.");
  if(features.length>5000)throw new Error("Maksimal 5000 feature per upload.");
  return value as GeoJsonFeatureCollection;
}

function safeArchivePath(name:string){
  const normalized=name.replace(/\\/g,"/");
  if(normalized.startsWith("/")||normalized.split("/").some((part)=>part===".."))throw new Error("Archive memiliki path tidak aman.");
}

async function readZip(buffer:ArrayBuffer){
  const zip=await JSZip.loadAsync(buffer,{checkCRC32:true});
  const entries=Object.values(zip.files).filter((entry)=>!entry.dir);
  if(entries.length===0||entries.length>MAX_ARCHIVE_ENTRIES)throw new Error("Jumlah file dalam archive tidak valid.");
  let total=0;
  for(const entry of entries){
    safeArchivePath(entry.name);
    const size=(entry as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize??0;
    total+=size;
    if(total>MAX_UNCOMPRESSED)throw new Error("Archive terlalu besar setelah diekstrak.");
  }
  return {zip,entries};
}

function parseKmlText(text:string):GeoJsonFeatureCollection{
  if(text.length>MAX_UNCOMPRESSED)throw new Error("KML terlalu besar.");
  const document=new DOMParser().parseFromString(text,"text/xml");
  const parseError=document.getElementsByTagName("parsererror");
  if(parseError.length)throw new Error("KML tidak valid.");
  return asFeatureCollection(kml(document));
}

async function parseKmz(buffer:ArrayBuffer):Promise<GeoJsonFeatureCollection>{
  const {entries}=await readZip(buffer);
  const kmlEntries=entries.filter((entry)=>entry.name.toLowerCase().endsWith(".kml"));
  if(kmlEntries.length!==1)throw new Error("KMZ harus berisi tepat satu file KML utama.");
  return parseKmlText(await kmlEntries[0].async("text"));
}

async function parseShapefileZip(buffer:ArrayBuffer):Promise<GeoJsonFeatureCollection>{
  const {entries}=await readZip(buffer);
  const allowed=new Set([".shp",".shx",".dbf",".prj",".cpg"]);
  for(const entry of entries){
    const lower=entry.name.toLowerCase();
    const dot=lower.lastIndexOf(".");
    const extension=dot>=0?lower.slice(dot):"";
    if(extension&&!allowed.has(extension))throw new Error(`File ${entry.name} tidak didukung dalam ZIP Shapefile.`);
  }
  const baseNames=new Map<string,Set<string>>();
  for(const entry of entries){
    const lower=entry.name.toLowerCase();
    const match=lower.match(/^(.*)\.(shp|shx|dbf|prj|cpg)$/);
    if(!match)continue;
    const set=baseNames.get(match[1])??new Set<string>();
    set.add(match[2]);baseNames.set(match[1],set);
  }
  const complete=[...baseNames.entries()].filter(([,parts])=>parts.has("shp")&&parts.has("shx")&&parts.has("dbf"));
  if(complete.length!==1)throw new Error("ZIP harus berisi tepat satu Shapefile lengkap (.shp + .shx + .dbf).");
  const parts=complete[0][1];
  if(!parts.has("prj"))throw new Error("Shapefile wajib menyertakan .prj agar CRS dapat ditentukan dengan aman.");
  const converted=await shp(buffer);
  if(Array.isArray(converted)){
    if(converted.length!==1)throw new Error("Archive berisi lebih dari satu layer Shapefile.");
    return asFeatureCollection(converted[0]);
  }
  return asFeatureCollection(converted);
}

export async function parseVectorUpload(file:File):Promise<ImportedVector>{
  const name=file.name.toLowerCase();
  if(file.size===0)throw new Error("File kosong.");
  if(file.size>20*1024*1024)throw new Error("Ukuran file maksimal 20 MB.");

  if(name.endsWith(".geojson")||name.endsWith(".json")){
    let parsed:unknown;
    try{parsed=JSON.parse(await file.text());}catch{throw new Error("GeoJSON/JSON tidak valid.");}
    return {format:"GeoJSON",srid:4326,geojson:asFeatureCollection(parsed)};
  }
  if(name.endsWith(".kml")){
    return {format:"KML",srid:4326,geojson:parseKmlText(await file.text())};
  }
  const buffer=await file.arrayBuffer();
  if(name.endsWith(".kmz")){
    return {format:"KMZ",srid:4326,geojson:await parseKmz(buffer)};
  }
  if(name.endsWith(".zip")){
    return {format:"Shapefile",srid:4326,geojson:await parseShapefileZip(buffer)};
  }
  throw new Error("Format belum didukung. Gunakan GeoJSON, KML, KMZ, atau ZIP Shapefile.");
}
