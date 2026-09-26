import { database } from "@/server/db";
import { hasStaffPermission } from "@/server/auth/permissions";
import { AuthorizationError } from "@/server/auth/authorization";
import type { TeacherSession } from "@/server/auth/session";
import type { ImportedVector } from "@/server/data/vector-import";

type Scope="SYSTEM"|"SCHOOL"|"PRIVATE";
type GeoJsonFeature={type:"Feature";id?:string|number;geometry:{type:string;coordinates:unknown}|null;properties?:Record<string,unknown>|null};
type FeatureCollection={type:"FeatureCollection";features:GeoJsonFeature[]};

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

function geometryType(features:GeoJsonFeature[]){
  const values=[...new Set(features.map((feature)=>feature.geometry?.type).filter(Boolean))] as string[];
  return values.length===1?values[0]:"Geometry";
}

function schema(features:GeoJsonFeature[]){
  const result:Record<string,string>={};
  for(const feature of features.slice(0,100)){
    for(const [key,value] of Object.entries(feature.properties??{})){
      const type=value===null?"null":Array.isArray(value)?"array":typeof value;
      result[key]=result[key]&&result[key]!==type?"mixed":type;
    }
  }
  return result;
}

export async function persistImportedVector(input:{
  actor:TeacherSession;
  title:string;
  description:string;
  scope:string;
  imported:ImportedVector;
}){
  const dataScope=scope(input.scope);await assertScope(input.actor,dataScope);
  const title=input.title.trim();
  if(!title||title.length>220)throw new Error("Judul dataset tidak valid.");
  const collection=input.imported.geojson as FeatureCollection;
  if(!collection.features.length||collection.features.length>5000)throw new Error("Jumlah feature tidak valid.");

  const client=await database().connect();
  try{
    await client.query("begin");
    const dataset=await client.query<{id:string}>(
      `insert into datasets(school_id,owner_teacher_id,scope,title,description,data_kind,source_type,status)
       values($1,$2,$3,$4,$5,'VECTOR','UPLOAD','ACTIVE') returning id`,
      [dataScope==="SYSTEM"?null:input.actor.schoolId,dataScope==="SYSTEM"?null:input.actor.staffUserId,dataScope,title,input.description.trim()||null],
    );
    const datasetId=dataset.rows[0]?.id;if(!datasetId)throw new Error("Dataset gagal dibuat.");
    const version=await client.query<{id:string}>(
      `insert into dataset_versions(dataset_id,version_number,format,srid,geometry_type,feature_count,schema_json,processing_status,status,created_by)
       values($1,1,$2,$3,$4,$5,$6::jsonb,'DRAFT','DRAFT',$7) returning id`,
      [datasetId,input.imported.format,input.imported.srid,geometryType(collection.features),collection.features.length,JSON.stringify(schema(collection.features)),input.actor.staffUserId],
    );
    const versionId=version.rows[0]?.id;if(!versionId)throw new Error("DatasetVersion gagal dibuat.");

    let index=0;
    for(const feature of collection.features){
      if(!feature.geometry)throw new Error("Semua feature wajib memiliki geometry.");
      const geometryJson=JSON.stringify(feature.geometry);
      const properties=JSON.stringify(feature.properties??{});
      const sourceFeatureId=feature.id!==undefined?String(feature.id):String(++index);
      await client.query(
        `insert into dataset_features(dataset_version_id,source_feature_id,geom,properties)
         values($1,$2,ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($3),4326)),$4::jsonb)`,
        [versionId,sourceFeatureId,geometryJson,properties],
      );
    }

    const invalid=await client.query<{count:number}>(
      `select count(*)::int as count from dataset_features where dataset_version_id=$1 and (ST_IsEmpty(geom) or not ST_IsValid(geom))`,
      [versionId],
    );
    if((invalid.rows[0]?.count??0)>0)throw new Error("Dataset mengandung geometry invalid/empty.");

    const extent=await client.query<{bbox:unknown}>(
      `select jsonb_build_array(ST_XMin(ext),ST_YMin(ext),ST_XMax(ext),ST_YMax(ext)) as bbox
       from (select ST_Extent(geom)::box2d ext from dataset_features where dataset_version_id=$1) x`,
      [versionId],
    );
    await client.query(
      `update dataset_versions set bbox=$2::jsonb,processing_status='READY',status='PUBLISHED',published_at=now() where id=$1`,
      [versionId,JSON.stringify(extent.rows[0]?.bbox??null)],
    );
    await client.query("commit");
    return datasetId;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}
