import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";

export type RasterRuntimeInput={datasetVersionId:string;format:string|null;storageKey:string|null;schemaJson:Record<string,unknown>;defaultStyle:Record<string,unknown>};
function secret(){const value=process.env.RASTER_TILE_SIGNING_SECRET;if(!value||value.length<32)throw new Error("RASTER_TILE_SIGNING_SECRET belum dikonfigurasi dengan aman.");return value;}
function signature(id:string,expires:number){return createHmac("sha256",secret()).update(`${id}:${expires}`).digest("hex");}
export function createSignedRasterTileTemplate(id:string,expires=Math.floor(Date.now()/1000)+12*60*60){return `/api/raster/${encodeURIComponent(id)}/tiles/{z}/{x}/{y}.png?expires=${expires}&sig=${signature(id,expires)}`;}
export function verifyRasterTileSignature(id:string,expiresText:string|null,supplied:string|null,now=Math.floor(Date.now()/1000)){
  const expires=Number(expiresText);if(!Number.isSafeInteger(expires)||expires<=now||!supplied||!/^[a-f0-9]{64}$/.test(supplied))return false;
  const expected=signature(id,expires);return timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(supplied,"hex"));
}
export function resolveRasterRuntime(input:RasterRuntimeInput){
  if(!input.storageKey)return null;const raster=input.schemaJson.raster&&typeof input.schemaJson.raster==="object"?input.schemaJson.raster as Record<string,unknown>:{};
  const tileUrl=input.format==="XYZ"?input.storageKey:input.format==="COG"?createSignedRasterTileTemplate(input.datasetVersionId):null;if(!tileUrl)return null;
  return {tileUrl,attribution:typeof input.defaultStyle.attributionText==="string"?input.defaultStyle.attributionText:"",sensor:typeof raster.sensor==="string"?raster.sensor:null,acquiredAt:typeof raster.acquiredAt==="string"?raster.acquiredAt:null,temporalLabel:typeof raster.temporalLabel==="string"?raster.temporalLabel:null,sourceLabel:typeof raster.sourceLabel==="string"?raster.sourceLabel:null};
}
