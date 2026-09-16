import { database, query } from "@/server/db";
import { hasStaffPermission } from "@/server/auth/permissions";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";

export type DataScope = "SYSTEM"|"SCHOOL"|"PRIVATE";
export type DatasetRecord = {
  id:string; title:string; description:string|null; scope:DataScope; ownerTeacherId:string|null;
  dataKind:"VECTOR"|"RASTER"|"TABLE"; sourceType:"UPLOAD"|"DIGITIZED"|"GENERATED"|"SYSTEM";
  versionId:string|null; versionNumber:number|null; format:string|null; srid:number|null;
  geometryType:string|null; featureCount:number|null; processingStatus:string|null; versionStatus:string|null;
};
export type DatasetFeaturePreview = { id:string; sourceFeatureId:string|null; properties:Record<string,unknown>; geometry:unknown };

async function canManageSchoolData(session:TeacherSession){
  if(session.role==="SYSTEM_ADMIN"||session.role==="SCHOOL_ADMIN") return true;
  return hasStaffPermission(session,"CONTENT_MANAGE_SCHOOL");
}
function validateScope(value:string):DataScope{
  if(value!=="SYSTEM"&&value!=="SCHOOL"&&value!=="PRIVATE") throw new Error("Invalid scope");
  return value;
}
async function assertScopeWrite(session:TeacherSession,scope:DataScope){
  if(scope==="SYSTEM" && session.role!=="SYSTEM_ADMIN") throw new AuthorizationError();
  if(scope==="SCHOOL" && !(await canManageSchoolData(session))) throw new AuthorizationError();
  if(scope!=="SYSTEM" && !session.schoolId) throw new AuthorizationError();
}

export async function listDatasets(session:TeacherSession):Promise<DatasetRecord[]>{
  return query<DatasetRecord>(
    `select d.id,d.title,d.description,d.scope,d.owner_teacher_id as "ownerTeacherId",
       d.data_kind as "dataKind",d.source_type as "sourceType",
       dv.id as "versionId",dv.version_number as "versionNumber",dv.format,dv.srid,
       dv.geometry_type as "geometryType",dv.feature_count as "featureCount",
       dv.processing_status as "processingStatus",dv.status as "versionStatus"
     from datasets d
     left join lateral (
       select * from dataset_versions x where x.dataset_id=d.id
       order by case x.status when 'DRAFT' then 0 else 1 end,x.version_number desc limit 1
     ) dv on true
     where d.status='ACTIVE' and (
       d.scope='SYSTEM'
       or (d.scope='SCHOOL' and d.school_id=$1)
       or (d.scope='PRIVATE' and d.owner_teacher_id=$2)
     )
     order by d.updated_at desc`,
    [session.schoolId,session.staffUserId],
  );
}

export async function getDataset(session:TeacherSession,datasetId:string):Promise<DatasetRecord|null>{
  const [row]=await query<DatasetRecord>(
    `select d.id,d.title,d.description,d.scope,d.owner_teacher_id as "ownerTeacherId",
       d.data_kind as "dataKind",d.source_type as "sourceType",
       dv.id as "versionId",dv.version_number as "versionNumber",dv.format,dv.srid,
       dv.geometry_type as "geometryType",dv.feature_count as "featureCount",
       dv.processing_status as "processingStatus",dv.status as "versionStatus"
     from datasets d
     join lateral (
       select * from dataset_versions x where x.dataset_id=d.id
       order by case x.status when 'DRAFT' then 0 else 1 end,x.version_number desc limit 1
     ) dv on true
     where d.id=$1 and d.status='ACTIVE' and (
       d.scope='SYSTEM'
       or (d.scope='SCHOOL' and d.school_id=$2)
       or (d.scope='PRIVATE' and d.owner_teacher_id=$3)
     )`,
    [datasetId,session.schoolId,session.staffUserId],
  );
  return row??null;
}

type GeoJsonFeature = {
  type:"Feature";
  id?:string|number;
  geometry:{type:string;coordinates:unknown}|null;
  properties?:Record<string,unknown>|null;
};
type GeoJsonFeatureCollection = { type:"FeatureCollection"; features:GeoJsonFeature[] };

function assertGeoJsonCollection(value:unknown):asserts value is GeoJsonFeatureCollection{
  if(!value||typeof value!=="object"||(value as {type?:unknown}).type!=="FeatureCollection") throw new Error("GeoJSON must be a FeatureCollection");
  const features=(value as {features?:unknown}).features;
  if(!Array.isArray(features)||features.length===0) throw new Error("GeoJSON contains no features");
  if(features.length>5000) throw new Error("Initial upload limit is 5000 features");
  for(const feature of features){
    if(!feature||typeof feature!=="object"||(feature as {type?:unknown}).type!=="Feature") throw new Error("Invalid GeoJSON feature");
    const geometry=(feature as {geometry?:unknown}).geometry;
    if(!geometry||typeof geometry!=="object"||typeof (geometry as {type?:unknown}).type!=="string") throw new Error("Every feature must have geometry");
  }
}

function inferSchema(features:GeoJsonFeature[]):Record<string,string>{
  const schema:Record<string,string>={};
  for(const feature of features.slice(0,100)){
    for(const [key,value] of Object.entries(feature.properties??{})){
      const type=value===null?"null":Array.isArray(value)?"array":typeof value;
      schema[key]=schema[key]&&schema[key]!==type?"mixed":type;
    }
  }
  return schema;
}

function geometryType(features:GeoJsonFeature[]):string{
  const types=[...new Set(features.map((feature)=>feature.geometry?.type).filter(Boolean))] as string[];
  return types.length===1?types[0]:"Geometry";
}

export async function uploadGeoJsonDataset(input:{
  actor:TeacherSession;title:string;description:string;scope:string;geojson:unknown;
}):Promise<string>{
  const scope=validateScope(input.scope); await assertScopeWrite(input.actor,scope);
  assertGeoJsonCollection(input.geojson);
  const title=input.title.trim();
  if(!title||title.length>220) throw new Error("Invalid title");

  const client=await database().connect();
  try{
    await client.query("begin");
    const created=await client.query<{id:string}>(
      `insert into datasets(school_id,owner_teacher_id,scope,title,description,data_kind,source_type,status)
       values($1,$2,$3,$4,$5,'VECTOR','UPLOAD','ACTIVE') returning id`,
      [scope==="SYSTEM"?null:input.actor.schoolId,scope==="SYSTEM"?null:input.actor.staffUserId,scope,title,input.description.trim()||null],
    );
    const datasetId=created.rows[0]?.id;if(!datasetId) throw new Error("Dataset creation failed");
    const version=await client.query<{id:string}>(
      `insert into dataset_versions(dataset_id,version_number,format,srid,geometry_type,feature_count,
       schema_json,processing_status,status,created_by)
       values($1,1,'GeoJSON',4326,$2,$3,$4::jsonb,'DRAFT','DRAFT',$5) returning id`,
      [datasetId,geometryType(input.geojson.features),input.geojson.features.length,JSON.stringify(inferSchema(input.geojson.features)),input.actor.staffUserId],
    );
    const versionId=version.rows[0]?.id;if(!versionId) throw new Error("Dataset version creation failed");

    let index=0;
    for(const feature of input.geojson.features){
      const geometryJson=JSON.stringify(feature.geometry);
      const properties=JSON.stringify(feature.properties??{});
      const sourceFeatureId=feature.id!==undefined?String(feature.id):String(++index);
      await client.query(
        `insert into dataset_features(dataset_version_id,source_feature_id,geom,properties)
         values($1,$2,ST_SetSRID(ST_GeomFromGeoJSON($3),4326),$4::jsonb)`,
        [versionId,sourceFeatureId,geometryJson,properties],
      );
    }

    const extent=await client.query<{bbox:unknown}>(
      `select jsonb_build_array(ST_XMin(ext),ST_YMin(ext),ST_XMax(ext),ST_YMax(ext)) as bbox
       from (select ST_Extent(geom)::box2d ext from dataset_features where dataset_version_id=$1) x`,
      [versionId],
    );
    await client.query(
      `update dataset_versions set bbox=$2::jsonb,processing_status='READY',status='PUBLISHED',published_at=now()
       where id=$1`,
      [versionId,JSON.stringify(extent.rows[0]?.bbox??null)],
    );
    await client.query("commit");
    return datasetId;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function listFeaturePreview(session:TeacherSession,datasetId:string,limit=50):Promise<DatasetFeaturePreview[]>{
  const dataset=await getDataset(session,datasetId);
  if(!dataset?.versionId) throw new Error("Dataset not found");
  return query<DatasetFeaturePreview>(
    `select id,source_feature_id as "sourceFeatureId",properties,ST_AsGeoJSON(geom)::json as geometry
     from dataset_features where dataset_version_id=$1 order by source_feature_id nulls last limit $2`,
    [dataset.versionId,Math.min(Math.max(limit,1),100)],
  );
}

export async function datasetAsFeatureCollection(session:TeacherSession,datasetId:string){
  const dataset=await getDataset(session,datasetId);
  if(!dataset?.versionId) throw new Error("Dataset not found");
  const [row]=await query<{geojson:unknown}>(
    `select jsonb_build_object('type','FeatureCollection','features',
       coalesce(jsonb_agg(jsonb_build_object(
         'type','Feature','id',coalesce(source_feature_id,id::text),
         'geometry',ST_AsGeoJSON(geom)::jsonb,'properties',properties
       ) order by source_feature_id),'[]'::jsonb)) as geojson
     from dataset_features where dataset_version_id=$1`,
    [dataset.versionId],
  );
  return row?.geojson??{type:"FeatureCollection",features:[]};
}

export type GisProjectRecord={id:string;title:string;description:string|null;mapView:Record<string,unknown>};
export type GisProjectLayer={id:string;datasetId:string;datasetVersionId:string;title:string;geometryType:string|null;featureCount:number|null;visible:boolean;opacity:number;style:Record<string,unknown>;alias:string|null};

export async function getOrCreateDefaultProject(session:TeacherSession):Promise<GisProjectRecord>{
  if(!session.schoolId) throw new AuthorizationError();
  const [existing]=await query<GisProjectRecord>(
    `select id,title,description,map_view as "mapView" from gis_projects
     where owner_teacher_id=$1 and status='DRAFT' order by updated_at desc limit 1`,[session.staffUserId],
  );
  if(existing) return existing;
  const [created]=await query<GisProjectRecord>(
    `insert into gis_projects(school_id,owner_teacher_id,title,description)
     values($1,$2,'GIS Studio Project','Draft workspace') returning id,title,description,map_view as "mapView"`,
    [session.schoolId,session.staffUserId],
  );
  if(!created) throw new Error("Project creation failed");
  return created;
}

export async function listProjectLayers(session:TeacherSession,projectId:string):Promise<GisProjectLayer[]>{
  const [project]=await query<{school_id:string;owner_teacher_id:string}>("select school_id,owner_teacher_id from gis_projects where id=$1 and status='DRAFT'",[projectId]);
  if(!project||project.school_id!==session.schoolId||project.owner_teacher_id!==session.staffUserId) throw new AuthorizationError();
  return query<GisProjectLayer>(
    `select gpl.id,d.id as "datasetId",dv.id as "datasetVersionId",coalesce(gpl.alias,d.title) as title,
       dv.geometry_type as "geometryType",dv.feature_count as "featureCount",gpl.visible,gpl.opacity::float8 as opacity,
       gpl.style_json as style,gpl.alias
     from gis_project_layers gpl
     join dataset_versions dv on dv.id=gpl.dataset_version_id and dv.status='PUBLISHED'
     join datasets d on d.id=dv.dataset_id
     where gpl.project_id=$1 order by gpl.position`,
    [projectId],
  );
}

export async function addDatasetToProject(session:TeacherSession,projectId:string,datasetId:string):Promise<void>{
  const project=await getOrCreateDefaultProject(session);
  if(project.id!==projectId) throw new AuthorizationError();
  const dataset=await getDataset(session,datasetId);
  if(!dataset?.versionId||dataset.versionStatus!=="PUBLISHED") throw new Error("Published dataset version required");
  const [pos]=await query<{next:number}>("select coalesce(max(position),0)+1 as next from gis_project_layers where project_id=$1",[projectId]);
  await query(
    `insert into gis_project_layers(project_id,dataset_version_id,position)
     values($1,$2,$3) on conflict(project_id,dataset_version_id) do nothing`,
    [projectId,dataset.versionId,pos?.next??1],
  );
}

export async function updateProjectLayer(session:TeacherSession,projectId:string,layerId:string,input:{visible?:boolean;opacity?:number}):Promise<void>{
  const project=await getOrCreateDefaultProject(session); if(project.id!==projectId) throw new AuthorizationError();
  const opacity=input.opacity===undefined?null:Math.max(0,Math.min(1,input.opacity));
  await query(
    `update gis_project_layers set visible=coalesce($3,visible),opacity=coalesce($4,opacity)
     where id=$2 and project_id=$1`,
    [projectId,layerId,input.visible??null,opacity],
  );
}

export async function runBufferAnalysis(session:TeacherSession,projectId:string,datasetVersionId:string,distanceMeters:number):Promise<{featureCount:number}>{
  const project=await getOrCreateDefaultProject(session); if(project.id!==projectId) throw new AuthorizationError();
  if(!Number.isFinite(distanceMeters)||distanceMeters<=0||distanceMeters>100000) throw new Error("Invalid buffer distance");
  const [allowed]=await query<{id:string}>(
    `select dv.id from dataset_versions dv join datasets d on d.id=dv.dataset_id
     where dv.id=$1 and dv.status='PUBLISHED' and (
       d.scope='SYSTEM' or (d.scope='SCHOOL' and d.school_id=$2) or (d.scope='PRIVATE' and d.owner_teacher_id=$3)
     )`,
    [datasetVersionId,session.schoolId,session.staffUserId],
  );
  if(!allowed) throw new AuthorizationError();
  const [summary]=await query<{count:number}>(
    `select count(*)::int as count from (
       select ST_Buffer(geom::geography,$2)::geometry as geom
       from dataset_features where dataset_version_id=$1
     ) x where not ST_IsEmpty(geom)`,
    [datasetVersionId,distanceMeters],
  );
  await query(
    `insert into gis_analysis_runs(project_id,actor_staff_user_id,tool_id,parameters_json,result_summary_json)
     values($1,$2,'buffer',$3::jsonb,$4::jsonb)`,
    [projectId,session.staffUserId,JSON.stringify({datasetVersionId,distanceMeters}),JSON.stringify({featureCount:summary?.count??0})],
  );
  return {featureCount:summary?.count??0};
}

export async function runDistanceAnalysis(session:TeacherSession,projectId:string,aVersionId:string,bVersionId:string):Promise<{distanceMeters:number|null}>{
  const project=await getOrCreateDefaultProject(session); if(project.id!==projectId) throw new AuthorizationError();
  const [summary]=await query<{distance:number|null}>(
    `select min(ST_Distance(a.geom::geography,b.geom::geography))::float8 as distance
     from dataset_features a cross join dataset_features b
     where a.dataset_version_id=$1 and b.dataset_version_id=$2`,
    [aVersionId,bVersionId],
  );
  const distance=summary?.distance??null;
  await query(
    `insert into gis_analysis_runs(project_id,actor_staff_user_id,tool_id,parameters_json,result_summary_json)
     values($1,$2,'distance',$3::jsonb,$4::jsonb)`,
    [projectId,session.staffUserId,JSON.stringify({aVersionId,bVersionId}),JSON.stringify({distanceMeters:distance})],
  );
  return {distanceMeters:distance};
}


export async function runOverlayAnalysis(session:TeacherSession,projectId:string,aVersionId:string,bVersionId:string):Promise<{intersectionCount:number}>{
  const project=await getOrCreateDefaultProject(session); if(project.id!==projectId) throw new AuthorizationError();
  const [summary]=await query<{count:number}>(
    `select count(*)::int as count
     from dataset_features a join dataset_features b
       on ST_Intersects(a.geom,b.geom)
     where a.dataset_version_id=$1 and b.dataset_version_id=$2`,
    [aVersionId,bVersionId],
  );
  const count=summary?.count??0;
  await query(
    `insert into gis_analysis_runs(project_id,actor_staff_user_id,tool_id,parameters_json,result_summary_json)
     values($1,$2,'overlay',$3::jsonb,$4::jsonb)`,
    [projectId,session.staffUserId,JSON.stringify({aVersionId,bVersionId}),JSON.stringify({intersectionCount:count})],
  );
  return {intersectionCount:count};
}


export type GisProjectMapLayer = GisProjectLayer & { geojson:unknown };
export type GisProjectMapPayload = { layers:GisProjectMapLayer[]; bbox:[number,number,number,number]|null };

export async function getProjectMapPayload(session:TeacherSession,projectId:string):Promise<GisProjectMapPayload>{
  const layers=await listProjectLayers(session,projectId);
  const payloadLayers:GisProjectMapLayer[]=[];
  for(const layer of layers){
    const [row]=await query<{geojson:unknown}>(
      `select jsonb_build_object(
         'type','FeatureCollection',
         'features',coalesce(jsonb_agg(jsonb_build_object(
           'type','Feature',
           'id',coalesce(source_feature_id,id::text),
           'geometry',ST_AsGeoJSON(geom)::jsonb,
           'properties',properties
         ) order by source_feature_id),'[]'::jsonb)
       ) as geojson
       from dataset_features
       where dataset_version_id=$1`,
      [layer.datasetVersionId],
    );
    payloadLayers.push({...layer,geojson:row?.geojson??{type:"FeatureCollection",features:[]}});
  }

  if(!layers.length)return {layers:payloadLayers,bbox:null};

  const [extent]=await query<{bbox:[number,number,number,number]|null}>(
    `select case when ext is null then null else array[
       ST_XMin(ext),ST_YMin(ext),ST_XMax(ext),ST_YMax(ext)
     ]::float8[] end as bbox
     from (
       select ST_Extent(geom)::box2d ext
       from dataset_features
       where dataset_version_id=any($1::uuid[])
     ) x`,
    [layers.map((layer)=>layer.datasetVersionId)],
  );
  return {layers:payloadLayers,bbox:extent?.bbox??null};
}
