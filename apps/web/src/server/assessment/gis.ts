import { query } from "@/server/db";
import type { StudentSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";
import {resolveRasterRuntime} from "@/server/data/raster-runtime";

type Bbox=[number,number,number,number];
export type BoundLayer={
  datasetVersionId:string;title:string;role:"SOURCE"|"TARGET"|"CONTEXT";position:number;
  visible:boolean;opacity:number;bbox:Bbox|null;style:Record<string,unknown>;
  dataKind:"VECTOR"|"RASTER"|"TABLE";format:string|null;storageKey:string|null;
  defaultStyle:Record<string,unknown>;schemaJson:Record<string,unknown>;
};
export type GisExecutionContext={activityConfig:Record<string,unknown>;layers:BoundLayer[];};

async function context(session:StudentSession,attemptId:string,questionVersionId:string):Promise<GisExecutionContext>{
  const [attempt]=await query<{status:string}>(
    `select at.status from attempts at
     join quiz_items qi on qi.quiz_version_id=at.quiz_version_id
     where at.id=$1 and at.student_id=$2 and at.enrollment_id=$3 and at.school_id=$4
       and qi.question_version_id=$5 limit 1`,
    [attemptId,session.studentId,session.enrollmentId,session.schoolId,questionVersionId],
  );
  if(!attempt) throw new AuthorizationError();

  const [question]=await query<{activityConfig:Record<string,unknown>}>(
    `select activity_config as "activityConfig" from question_versions where id=$1 and status='PUBLISHED'`,
    [questionVersionId],
  );
  if(!question) throw new Error("Published QuestionVersion not found");

  const layers=await query<BoundLayer>(
    `select qdl.dataset_version_id as "datasetVersionId",d.title,d.data_kind as "dataKind",dv.format,
       dv.storage_key as "storageKey",coalesce(dv.default_style_json,'{}'::jsonb) as "defaultStyle",
       coalesce(dv.schema_json,'{}'::jsonb) as "schemaJson",qdl.role,qdl.position,qdl.visible,
       qdl.opacity::float8 as opacity,coalesce(qdl.style_json,'{}'::jsonb) as style,
       case when jsonb_typeof(dv.bbox)='array' then array[
         (dv.bbox->>0)::float8,(dv.bbox->>1)::float8,(dv.bbox->>2)::float8,(dv.bbox->>3)::float8
       ] else null end as bbox
     from question_version_dataset_layers qdl
     join dataset_versions dv on dv.id=qdl.dataset_version_id and dv.status='PUBLISHED' and dv.processing_status='READY'
     join datasets d on d.id=dv.dataset_id and d.status='ACTIVE'
     where qdl.question_version_id=$1 order by qdl.position`,
    [questionVersionId],
  );
  return {activityConfig:question.activityConfig??{},layers};
}

async function featureCollection(datasetVersionId:string){
  const [row]=await query<{geojson:unknown}>(
    `select jsonb_build_object('type','FeatureCollection','features',
       coalesce(jsonb_agg(jsonb_build_object(
         'type','Feature','id',coalesce(source_feature_id,id::text),
         'geometry',ST_AsGeoJSON(geom)::jsonb,'properties',properties
       ) order by source_feature_id),'[]'::jsonb)) as geojson
     from dataset_features where dataset_version_id=$1`,
    [datasetVersionId],
  );
  return row?.geojson??{type:"FeatureCollection",features:[]};
}

function rasterPayload(layer:BoundLayer){
  if(layer.dataKind!=="RASTER")return null;return resolveRasterRuntime({datasetVersionId:layer.datasetVersionId,format:layer.format,storageKey:layer.storageKey,schemaJson:layer.schemaJson,defaultStyle:layer.defaultStyle});
}

export async function getAssessmentMapPayload(session:StudentSession,attemptId:string,questionVersionId:string){
  const ctx=await context(session,attemptId,questionVersionId);
  const layers=[];
  for(const layer of ctx.layers){
    if(layer.dataKind==="RASTER"&&(!layer.storageKey||(layer.format!=="XYZ"&&layer.format!=="COG")))continue;
    layers.push({
      ...layer,
      geojson:layer.dataKind==="VECTOR"?await featureCollection(layer.datasetVersionId):null,
      raster:rasterPayload(layer),
    });
  }
  const boxes=ctx.layers.map((layer)=>layer.bbox).filter((bbox):bbox is Bbox=>Array.isArray(bbox)&&bbox.length===4);
  const bbox=boxes.length?[Math.min(...boxes.map((x)=>x[0])),Math.min(...boxes.map((x)=>x[1])),Math.max(...boxes.map((x)=>x[2])),Math.max(...boxes.map((x)=>x[3]))]:null;
  return {layers,bbox};
}

function requiredActions(config:Record<string,unknown>){
  return Array.isArray(config.requiredActions)?config.requiredActions.filter((action)=>action&&typeof action==="object") as Array<{tool?:string;parameters?:Record<string,unknown>}>:[];
}
function toolConfiguration(config:Record<string,unknown>,toolId:string){
  const required=requiredActions(config).find((action)=>action.tool===toolId);
  const configuredTools=Array.isArray(config.tools)?config.tools.filter((tool):tool is string=>typeof tool==="string"):[];
  const legacyRequired=requiredActions(config).map((action)=>action.tool).filter((tool):tool is string=>Boolean(tool));
  const allowed=new Set([...configuredTools,...legacyRequired]);
  if(!allowed.has(toolId))return null;
  const toolParameters=config.toolParameters&&typeof config.toolParameters==="object"?(config.toolParameters as Record<string,unknown>)[toolId]:undefined;
  const optionalParameters=toolParameters&&typeof toolParameters==="object"?toolParameters as Record<string,unknown>:{};
  return {required:Boolean(required),parameters:required?.parameters??optionalParameters};
}
async function record(attemptId:string,questionVersionId:string,toolId:string,parameters:Record<string,unknown>,result:Record<string,unknown>){
  await query(
    `insert into gis_activities(attempt_id,question_version_id,tool_id,action_type,parameters_json,result_summary_json)
     values($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
    [attemptId,questionVersionId,toolId,toolId+"_run",JSON.stringify(parameters),JSON.stringify(result)],
  );
}
function requireVector(layer:BoundLayer|undefined,label:string,toolId:string){
  if(!layer)throw new Error(`${toolId[0].toUpperCase()+toolId.slice(1)} memerlukan layer ${label}.`);
  if(layer.dataKind!=="VECTOR")throw new Error(`${label} harus berupa dataset vector untuk analisis GIS ini.`);
  return layer;
}

export async function executeConfiguredGisTool(ctx:GisExecutionContext,toolId:string){
  const tool=toolConfiguration(ctx.activityConfig,toolId);
  if(!tool) throw new Error("Tool tidak tersedia pada konfigurasi QuestionVersion ini.");
  const source=requireVector(ctx.layers.find((layer)=>layer.role==="SOURCE"),"SOURCE",toolId);
  const targetCandidate=ctx.layers.find((layer)=>layer.role==="TARGET");

  if(toolId==="buffer"){
    const rawDistance=tool.parameters?.distanceMeters;
    const configured=Number(rawDistance??500);
    if(rawDistance!==undefined&&(!Number.isFinite(configured)||configured<=0||configured>100000))throw new Error("Jarak Buffer harus antara 1 dan 100.000 meter.");
    const distanceMeters=configured;
    const [row]=await query<{geojson:unknown;featureCount:number}>(
      `select jsonb_build_object('type','FeatureCollection','features',
         coalesce(jsonb_agg(jsonb_build_object(
           'type','Feature','id',source_feature_id,
           'geometry',ST_AsGeoJSON(ST_Buffer(geom::geography,$2)::geometry)::jsonb,
           'properties',properties || jsonb_build_object('_analysis','buffer','distanceMeters',$2)
         )),'[]'::jsonb)) as geojson,count(*)::int as "featureCount"
       from dataset_features where dataset_version_id=$1`,
      [source.datasetVersionId,distanceMeters],
    );
    const result={featureCount:row?.featureCount??0,distanceMeters,geojson:row?.geojson??{type:"FeatureCollection",features:[]}};
    return result;
  }

  if(toolId==="overlay"){
    const target=requireVector(targetCandidate,"TARGET",toolId);
    const [row]=await query<{geojson:unknown;intersectionCount:number}>(
      `select jsonb_build_object('type','FeatureCollection','features',coalesce(jsonb_agg(feature) filter(where feature is not null),'[]'::jsonb)) as geojson,count(*)::int as "intersectionCount"
       from (
         select jsonb_build_object('type','Feature','geometry',ST_AsGeoJSON(ST_Intersection(a.geom,b.geom))::jsonb,
           'properties',jsonb_build_object('_analysis','overlay','sourceId',a.source_feature_id,'targetId',b.source_feature_id)) as feature
         from dataset_features a join dataset_features b on ST_Intersects(a.geom,b.geom)
         where a.dataset_version_id=$1 and b.dataset_version_id=$2 and not ST_IsEmpty(ST_Intersection(a.geom,b.geom)) limit 1000
       ) x`,
      [source.datasetVersionId,target.datasetVersionId],
    );
    const result={intersectionCount:row?.intersectionCount??0,geojson:row?.geojson??{type:"FeatureCollection",features:[]}};
    return result;
  }

  if(toolId==="distance"){
    const target=requireVector(targetCandidate,"TARGET",toolId);
    const [row]=await query<{distanceMeters:number|null;sourceFeatureId:string|null;targetFeatureId:string|null;geojson:unknown}>(
      `select ST_Distance(a.geom::geography,b.geom::geography)::float8 as "distanceMeters",
         coalesce(a.source_feature_id,a.id::text) as "sourceFeatureId",coalesce(b.source_feature_id,b.id::text) as "targetFeatureId",
         jsonb_build_object('type','FeatureCollection','features',jsonb_build_array(jsonb_build_object(
           'type','Feature','geometry',ST_AsGeoJSON(ST_ShortestLine(a.geom,b.geom))::jsonb,
           'properties',jsonb_build_object('_analysis','distance','sourceId',coalesce(a.source_feature_id,a.id::text),'targetId',coalesce(b.source_feature_id,b.id::text),'distanceMeters',ST_Distance(a.geom::geography,b.geom::geography))))) as geojson
       from dataset_features a cross join dataset_features b
       where a.dataset_version_id=$1 and b.dataset_version_id=$2
       order by ST_Distance(a.geom::geography,b.geom::geography) limit 1`,
      [source.datasetVersionId,target.datasetVersionId],
    );
    const result={distanceMeters:row?.distanceMeters??null,sourceFeatureId:row?.sourceFeatureId??null,targetFeatureId:row?.targetFeatureId??null,geojson:row?.geojson??null};
    return result;
  }
  throw new Error("Unsupported authoritative GIS tool");
}

export async function executeAssessmentGisTool(session:StudentSession,attemptId:string,questionVersionId:string,toolId:string){
  const ctx=await context(session,attemptId,questionVersionId);
  const result=await executeConfiguredGisTool(ctx,toolId);
  const source=ctx.layers.find((layer)=>layer.role==="SOURCE")!;
  const target=ctx.layers.find((layer)=>layer.role==="TARGET");
  const summary={...result,geojson:undefined};
  const parameters=toolId==="buffer"
    ?{datasetVersionId:source.datasetVersionId,distanceMeters:(result as {distanceMeters?:number}).distanceMeters}
    :{sourceVersionId:source.datasetVersionId,targetVersionId:target?.datasetVersionId};
  await record(attemptId,questionVersionId,toolId,parameters,summary);
  return result;
}

export async function completedAssessmentGisTools(session:StudentSession,attemptId:string,questionVersionId:string):Promise<string[]>{
  await context(session,attemptId,questionVersionId);
  const rows=await query<{tool_id:string}>(
    `select distinct tool_id from gis_activities where attempt_id=$1 and question_version_id=$2 order by tool_id`,
    [attemptId,questionVersionId],
  );
  return rows.map((row)=>row.tool_id);
}
