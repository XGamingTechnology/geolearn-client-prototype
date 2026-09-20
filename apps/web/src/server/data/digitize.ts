import { database } from "@/server/db";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";

type Position=[number,number];
type DigitizedGeometry=
  | {type:"Point";coordinates:Position}
  | {type:"LineString";coordinates:Position[]}
  | {type:"Polygon";coordinates:Position[][]};

function validPosition(value:unknown):value is Position{
  return Array.isArray(value)
    && value.length>=2
    && typeof value[0]==="number"
    && Number.isFinite(value[0])
    && value[0]>=-180
    && value[0]<=180
    && typeof value[1]==="number"
    && Number.isFinite(value[1])
    && value[1]>=-90
    && value[1]<=90;
}

function samePosition(a:Position,b:Position){return a[0]===b[0]&&a[1]===b[1];}

function normalizeGeometry(value:unknown):DigitizedGeometry{
  if(!value||typeof value!=="object")throw new Error("Geometry tidak valid.");
  const input=value as {type?:unknown;coordinates?:unknown};
  if(input.type==="Point"){
    if(!validPosition(input.coordinates))throw new Error("Point membutuhkan satu koordinat valid.");
    return {type:"Point",coordinates:[input.coordinates[0],input.coordinates[1]]};
  }
  if(input.type==="LineString"){
    if(!Array.isArray(input.coordinates)||input.coordinates.length<2||input.coordinates.length>2000||!input.coordinates.every(validPosition)){
      throw new Error("Line membutuhkan minimal 2 vertex dan maksimal 2000 vertex.");
    }
    return {type:"LineString",coordinates:input.coordinates.map((p)=>[p[0],p[1]] as Position)};
  }
  if(input.type==="Polygon"){
    if(!Array.isArray(input.coordinates)||input.coordinates.length!==1||!Array.isArray(input.coordinates[0])){
      throw new Error("Polygon sederhana membutuhkan satu ring.");
    }
    const ring=input.coordinates[0];
    if(ring.length<3||ring.length>2000||!ring.every(validPosition))throw new Error("Polygon membutuhkan minimal 3 vertex dan maksimal 2000 vertex.");
    const normalized=ring.map((p)=>[p[0],p[1]] as Position);
    if(!samePosition(normalized[0],normalized[normalized.length-1]))normalized.push([...normalized[0]] as Position);
    if(normalized.length<4)throw new Error("Polygon membutuhkan minimal 3 vertex berbeda.");
    return {type:"Polygon",coordinates:[normalized]};
  }
  throw new Error("Tipe geometry harus Point, LineString, atau Polygon.");
}

export async function createDigitizedDataset(input:{
  actor:TeacherSession;
  projectId:string;
  title:string;
  geometry:unknown;
}):Promise<{datasetId:string;datasetVersionId:string;layerId:string}>{
  const title=input.title.trim();
  if(!title||title.length>220)throw new Error("Judul layer wajib diisi dan maksimal 220 karakter.");
  if(!input.actor.schoolId)throw new AuthorizationError();
  const geometry=normalizeGeometry(input.geometry);
  const geometryJson=JSON.stringify(geometry);

  const client=await database().connect();
  try{
    await client.query("begin");
    const project=await client.query<{id:string}>(
      `select id from gis_projects
       where id=$1 and school_id=$2 and owner_teacher_id=$3 and status='DRAFT'`,
      [input.projectId,input.actor.schoolId,input.actor.staffUserId],
    );
    if(!project.rows[0])throw new AuthorizationError();

    const validity=await client.query<{valid:boolean;empty:boolean}>(
      `select ST_IsValid(g) as valid,ST_IsEmpty(g) as empty
       from (select ST_SetSRID(ST_GeomFromGeoJSON($1),4326) as g) x`,
      [geometryJson],
    );
    if(!validity.rows[0]?.valid||validity.rows[0]?.empty)throw new Error("Geometry tidak valid. Periksa bentuk yang digambar.");

    const created=await client.query<{id:string}>(
      `insert into datasets(school_id,owner_teacher_id,scope,title,description,data_kind,source_type,status)
       values($1,$2,'PRIVATE',$3,'Dibuat melalui GIS Studio','VECTOR','DIGITIZED','ACTIVE') returning id`,
      [input.actor.schoolId,input.actor.staffUserId,title],
    );
    const datasetId=created.rows[0]?.id;
    if(!datasetId)throw new Error("Dataset gagal dibuat.");

    // Keep the version DRAFT until every mutable field (including bbox) is finalized.
    // Published DatasetVersions are protected by the immutable-version trigger.
    const version=await client.query<{id:string}>(
      `insert into dataset_versions(dataset_id,version_number,format,srid,geometry_type,feature_count,
        schema_json,default_style_json,processing_status,status,created_by)
       values($1,1,'GeoJSON',4326,$2,1,'{}'::jsonb,'{}'::jsonb,'READY','DRAFT',$3) returning id`,
      [datasetId,geometry.type,input.actor.staffUserId],
    );
    const datasetVersionId=version.rows[0]?.id;
    if(!datasetVersionId)throw new Error("DatasetVersion gagal dibuat.");

    await client.query(
      `insert into dataset_features(dataset_version_id,source_feature_id,geom,properties)
       values($1,'1',ST_SetSRID(ST_GeomFromGeoJSON($2),4326),$3::jsonb)`,
      [datasetVersionId,geometryJson,JSON.stringify({source:"GIS Studio digitize"})],
    );

    const extent=await client.query<{bbox:unknown}>(
      `select jsonb_build_array(ST_XMin(ext),ST_YMin(ext),ST_XMax(ext),ST_YMax(ext)) as bbox
       from (select ST_Extent(geom)::box2d ext from dataset_features where dataset_version_id=$1) x`,
      [datasetVersionId],
    );
    await client.query("update dataset_versions set bbox=$2::jsonb where id=$1",[
      datasetVersionId,JSON.stringify(extent.rows[0]?.bbox??null),
    ]);

    await client.query(
      "update dataset_versions set status='PUBLISHED',published_at=now() where id=$1 and status='DRAFT'",
      [datasetVersionId],
    );

    const position=await client.query<{next:number}>(
      "select coalesce(max(position),0)+1 as next from gis_project_layers where project_id=$1",
      [input.projectId],
    );
    const layer=await client.query<{id:string}>(
      `insert into gis_project_layers(project_id,dataset_version_id,position,visible,opacity)
       values($1,$2,$3,true,1) returning id`,
      [input.projectId,datasetVersionId,position.rows[0]?.next??1],
    );
    const layerId=layer.rows[0]?.id;
    if(!layerId)throw new Error("Layer GIS gagal dibuat.");

    await client.query("commit");
    return {datasetId,datasetVersionId,layerId};
  }catch(error){
    await client.query("rollback");
    throw error;
  }finally{
    client.release();
  }
}
