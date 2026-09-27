import "server-only";
import {database} from "@/server/db";
import {AuthorizationError} from "@/server/auth/authorization";
import {hasStaffPermission} from "@/server/auth/permissions";
import type {TeacherSession} from "@/server/auth/session";
import {safeRasterKey} from "./raster-storage";

export type RasterMetadata={sourceCrs:string;sourceSrid:number|null;bboxSource:[number,number,number,number];bboxWgs84:[number,number,number,number];width:number;height:number;bandCount:number;dtypes:string[];nodata:number|null;resolution:[number,number];driver:string;isCog:boolean;rendering:{bands:number[];mode:"grayscale"|"rgb"}};
export function validateRasterMetadata(value:RasterMetadata){if(!value?.isCog||!Array.isArray(value.bboxWgs84)||value.bboxWgs84.length!==4||!value.sourceCrs||value.width<1||value.height<1||value.bandCount<1)throw new Error("Metadata raster hasil konversi tidak valid.");return value;}
export async function ingestRaster(sourceKey:string,targetKey:string){
  safeRasterKey(sourceKey,"incoming");safeRasterKey(targetKey,"cog");const url=process.env.RASTER_SERVICE_URL??"http://raster:8000";
  let response:Response;try{response=await fetch(`${url}/internal/ingest`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sourceKey,targetKey}),signal:AbortSignal.timeout(10*60*1000)});}catch{throw new Error("Layanan pemrosesan raster tidak tersedia.");}
  if(!response.ok){const body=await response.json().catch(()=>({})) as {message?:string;detail?:string};throw new Error(body.message??(typeof body.detail==="string"?body.detail:"GeoTIFF gagal dikonversi menjadi COG."));}
  return validateRasterMetadata(await response.json() as RasterMetadata);
}
function clean(value:string,max:number){return value.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max);}
export async function persistLocalRaster(input:{actor:TeacherSession;title:string;description:string;scope:string;targetKey:string;metadata:RasterMetadata;sourceLabel:string;sensor:string;acquiredAt:string;temporalLabel:string;attribution:string}){
  const scope=input.scope;if(!["SYSTEM","SCHOOL","PRIVATE"].includes(scope))throw new Error("Scope tidak valid.");if(scope==="SYSTEM"&&input.actor.role!=="SYSTEM_ADMIN")throw new AuthorizationError();if(scope==="SCHOOL"&&input.actor.role!=="SYSTEM_ADMIN"&&input.actor.role!=="SCHOOL_ADMIN"&&!await hasStaffPermission(input.actor,"CONTENT_MANAGE_SCHOOL"))throw new AuthorizationError();
  const title=clean(input.title,220);if(!title)throw new Error("Judul dataset wajib diisi.");safeRasterKey(input.targetKey,"cog");const m=validateRasterMetadata(input.metadata);
  const acquiredAt=input.acquiredAt.trim();if(acquiredAt&&!/^\d{4}-\d{2}-\d{2}$/.test(acquiredAt))throw new Error("Tanggal citra tidak valid.");
  const schema={raster:{sourceMode:"LOCAL_COG",sourceLabel:clean(input.sourceLabel,120)||null,sensor:clean(input.sensor,120)||null,acquiredAt:acquiredAt||null,temporalLabel:clean(input.temporalLabel,120)||null,sourceCrs:m.sourceCrs,sourceSrid:m.sourceSrid,width:m.width,height:m.height,bandCount:m.bandCount,dtypes:m.dtypes,nodata:m.nodata,resolution:m.resolution,bboxSrid:4326,rendering:m.rendering}};
  const client=await database().connect();try{await client.query("begin");const d=await client.query<{id:string}>(`insert into datasets(school_id,owner_teacher_id,scope,title,description,data_kind,source_type,status) values($1,$2,$3,$4,$5,'RASTER','UPLOAD','ACTIVE') returning id`,[scope==="SYSTEM"?null:input.actor.schoolId,scope==="SYSTEM"?null:input.actor.staffUserId,scope,title,clean(input.description,1000)||null]);const id=d.rows[0]?.id;if(!id)throw new Error("Dataset raster gagal dibuat.");await client.query(`insert into dataset_versions(dataset_id,version_number,format,srid,bbox,schema_json,default_style_json,storage_key,processing_status,status,created_by,published_at) values($1,1,'COG',$2,$3::jsonb,$4::jsonb,$5::jsonb,$6,'READY','PUBLISHED',$7,now())`,[id,m.sourceSrid,JSON.stringify(m.bboxWgs84),JSON.stringify(schema),JSON.stringify({opacity:1,attributionText:clean(input.attribution,300)}),input.targetKey,input.actor.staffUserId]);await client.query("commit");return id;}catch(error){await client.query("rollback");throw error;}finally{client.release();}
}
