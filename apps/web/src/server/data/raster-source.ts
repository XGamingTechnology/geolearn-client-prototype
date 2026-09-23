import {database,query} from "@/server/db";
import {hasStaffPermission} from "@/server/auth/permissions";
import {AuthorizationError} from "@/server/auth/authorization";
import type {TeacherSession} from "@/server/auth/session";

type Scope="SYSTEM"|"SCHOOL"|"PRIVATE";
type Bbox=[number,number,number,number];

export type RasterDatasetMetadata={
  tileUrl:string;
  bbox:Bbox|null;
  attribution:string;
  sourceLabel:string|null;
  sensor:string|null;
  acquiredAt:string|null;
  temporalLabel:string|null;
};

function scope(value:string):Scope{
  if(value!=="SYSTEM"&&value!=="SCHOOL"&&value!=="PRIVATE")throw new Error("Scope tidak valid.");
  return value;
}

async function assertScope(actor:TeacherSession,value:Scope){
  if(value==="SYSTEM"&&actor.role!=="SYSTEM_ADMIN")throw new AuthorizationError();
  if(value==="SCHOOL"){
    const allowed=actor.role==="SYSTEM_ADMIN"||actor.role==="SCHOOL_ADMIN"||await hasStaffPermission(actor,"CONTENT_MANAGE_SCHOOL");
    if(!allowed)throw new AuthorizationError();
  }
  if(value!=="SYSTEM"&&!actor.schoolId)throw new AuthorizationError();
}

function cleanText(value:string,max:number){
  const cleaned=value.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
  return cleaned.slice(0,max);
}

export function validateXyzTemplate(value:string){
  const template=value.trim();
  if(template.length<12||template.length>2048)throw new Error("URL tile raster tidak valid.");
  for(const token of ["{z}","{x}","{y}"])if(!template.includes(token))throw new Error("URL XYZ wajib memuat {z}, {x}, dan {y}.");
  const probe=template.replaceAll("{z}","0").replaceAll("{x}","0").replaceAll("{y}","0").replaceAll("{s}","a");
  let parsed:URL;
  try{parsed=new URL(probe);}catch{throw new Error("URL tile raster tidak valid.");}
  if(parsed.protocol!=="https:")throw new Error("Raster XYZ wajib menggunakan HTTPS.");
  if(parsed.username||parsed.password)throw new Error("Jangan simpan kredensial pada URL raster.");
  return template;
}

export function validateRasterBbox(values:[number,number,number,number]):Bbox{
  const [minLon,minLat,maxLon,maxLat]=values;
  if(!values.every(Number.isFinite)||minLon < -180||maxLon>180||minLat < -90||maxLat>90||minLon>=maxLon||minLat>=maxLat)throw new Error("Bounding box raster tidak valid.");
  return values;
}

function optionalDate(value:string){
  const text=value.trim();
  if(!text)return null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||Number.isNaN(Date.parse(`${text}T00:00:00Z`)))throw new Error("Tanggal citra tidak valid.");
  return text;
}

export async function registerRemoteRasterDataset(input:{
  actor:TeacherSession;
  title:string;
  description:string;
  scope:string;
  tileUrl:string;
  bbox:Bbox;
  attribution?:string;
  sourceLabel?:string;
  sensor?:string;
  acquiredAt?:string;
  temporalLabel?:string;
}){
  const dataScope=scope(input.scope);await assertScope(input.actor,dataScope);
  const title=cleanText(input.title,220);if(!title)throw new Error("Judul dataset wajib diisi.");
  const tileUrl=validateXyzTemplate(input.tileUrl);
  const bbox=validateRasterBbox(input.bbox);
  const acquiredAt=optionalDate(input.acquiredAt??"");
  const metadata={
    raster:{
      sourceMode:"REMOTE_XYZ",
      sourceLabel:cleanText(input.sourceLabel??"",120)||null,
      sensor:cleanText(input.sensor??"",120)||null,
      acquiredAt,
      temporalLabel:cleanText(input.temporalLabel??"",120)||null,
      bboxSrid:4326,
    },
  };
  const style={
    opacity:1,
    attributionText:cleanText(input.attribution??"",300),
  };

  const client=await database().connect();
  try{
    await client.query("begin");
    const dataset=await client.query<{id:string}>(
      `insert into datasets(school_id,owner_teacher_id,scope,title,description,data_kind,source_type,status)
       values($1,$2,$3,$4,$5,'RASTER','UPLOAD','ACTIVE') returning id`,
      [dataScope==="SYSTEM"?null:input.actor.schoolId,dataScope==="SYSTEM"?null:input.actor.staffUserId,dataScope,title,cleanText(input.description,1000)||null],
    );
    const datasetId=dataset.rows[0]?.id;if(!datasetId)throw new Error("Dataset raster gagal dibuat.");
    await client.query(
      `insert into dataset_versions(dataset_id,version_number,format,srid,geometry_type,feature_count,bbox,schema_json,default_style_json,storage_key,processing_status,status,created_by,published_at)
       values($1,1,'XYZ',3857,null,null,$2::jsonb,$3::jsonb,$4::jsonb,$5,'READY','PUBLISHED',$6,now())`,
      [datasetId,JSON.stringify(bbox),JSON.stringify(metadata),JSON.stringify(style),tileUrl,input.actor.staffUserId],
    );
    await client.query("commit");
    return datasetId;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function getRasterDatasetMetadata(actor:TeacherSession,datasetId:string):Promise<RasterDatasetMetadata|null>{
  const [row]=await query<{
    tileUrl:string|null;bbox:Bbox|null;schemaJson:Record<string,unknown>|null;defaultStyle:Record<string,unknown>|null;
  }>(
    `select dv.storage_key as "tileUrl",
       case when jsonb_typeof(dv.bbox)='array' then array[(dv.bbox->>0)::float8,(dv.bbox->>1)::float8,(dv.bbox->>2)::float8,(dv.bbox->>3)::float8] else null end as bbox,
       dv.schema_json as "schemaJson",dv.default_style_json as "defaultStyle"
     from datasets d join lateral (
       select * from dataset_versions x where x.dataset_id=d.id and x.status='PUBLISHED' order by x.version_number desc limit 1
     ) dv on true
     where d.id=$1 and d.status='ACTIVE' and d.data_kind='RASTER' and (
       d.scope='SYSTEM' or (d.scope='SCHOOL' and d.school_id=$2) or (d.scope='PRIVATE' and d.owner_teacher_id=$3)
     )`,
    [datasetId,actor.schoolId,actor.staffUserId],
  );
  if(!row?.tileUrl)return null;
  const raster=row.schemaJson?.raster&&typeof row.schemaJson.raster==="object"?row.schemaJson.raster as Record<string,unknown>:{};
  return {
    tileUrl:row.tileUrl,
    bbox:row.bbox,
    attribution:typeof row.defaultStyle?.attributionText==="string"?row.defaultStyle.attributionText:"",
    sourceLabel:typeof raster.sourceLabel==="string"?raster.sourceLabel:null,
    sensor:typeof raster.sensor==="string"?raster.sensor:null,
    acquiredAt:typeof raster.acquiredAt==="string"?raster.acquiredAt:null,
    temporalLabel:typeof raster.temporalLabel==="string"?raster.temporalLabel:null,
  };
}
