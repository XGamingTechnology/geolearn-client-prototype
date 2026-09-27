import "server-only";
import {createWriteStream} from "node:fs";
import {mkdir,rm} from "node:fs/promises";
import {resolve,sep} from "node:path";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";
import {randomUUID} from "node:crypto";

export const DEFAULT_RASTER_MAX_UPLOAD_BYTES=256*1024*1024;
export function rasterMaxUploadBytes(){const value=Number(process.env.RASTER_MAX_UPLOAD_BYTES??DEFAULT_RASTER_MAX_UPLOAD_BYTES);return Number.isSafeInteger(value)&&value>0?value:DEFAULT_RASTER_MAX_UPLOAD_BYTES;}
export function validateRasterUpload(file:{name:string;size:number},maximum=rasterMaxUploadBytes()){
  if(!/\.tiff?$/i.test(file.name))throw new Error("Format raster harus .tif atau .tiff.");
  if(file.size<=0)throw new Error("File raster kosong.");
  if(file.size>maximum)throw new Error(`Ukuran raster melebihi batas ${Math.round(maximum/1024/1024)} MB.`);
}
export function safeRasterKey(key:string,expected?:"incoming"|"cog"){
  if(key.includes("\\")||key.includes("..")||key.startsWith("/")||! /^(incoming|cog)\/[0-9a-f-]+\.tif$/.test(key))throw new Error("Kunci penyimpanan raster tidak aman.");
  if(expected&&!key.startsWith(expected+"/"))throw new Error("Kunci penyimpanan raster tidak aman.");
  return key;
}
export function rasterPath(key:string){
  const root=resolve(process.env.RASTER_STORAGE_PATH??"/var/lib/geolearn/raster");const path=resolve(root,safeRasterKey(key));
  if(!path.startsWith(root+sep))throw new Error("Kunci penyimpanan raster tidak aman.");return path;
}
export function createRasterKeys(){const id=randomUUID();return {sourceKey:`incoming/${id}.tif`,targetKey:`cog/${id}.tif`};}
export async function writeIncomingRaster(file:File,key:string){validateRasterUpload(file);const path=rasterPath(safeRasterKey(key,"incoming"));await mkdir(resolve(path,".."),{recursive:true});await pipeline(Readable.fromWeb(file.stream() as never),createWriteStream(path,{flags:"wx",mode:0o640}));}
export async function removeRasterFile(key:string){await rm(rasterPath(key),{force:true});}
