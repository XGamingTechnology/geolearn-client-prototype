import { query } from "@/server/db";
import type { StudentSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";

type BoundLayer={
  datasetVersionId:string;title:string;role:"SOURCE"|"TARGET"|"CONTEXT";position:number;
  visible:boolean;opacity:number;bbox:[number,number,number,number]|null;style:Record<string,unknown>;
};
type AttemptQuestionContext={
  activityConfig:Record<string,unknown>;
  layers:BoundLayer[];
};

async function context(session:StudentSession,attemptId:string,questionVersionId:string):Promise<AttemptQuestionContext>{
  const [attempt]=await query<{status:string}>(
    `select at.status from attempts at
     join quiz_items qi on qi.quiz_version_id=at.quiz_version_id
     where at.id=$1 and at.student_id=$2 and at.enrollment_id=$3 and at.school_id=$4
       and qi.question_version_id=$5 limit 1`,
    [attemptId,session.studentId,session.enrollmentId,session.schoolId,questionVersionId],
  );
  if(!attempt) throw new AuthorizationError();

  const [question]=await query<{activityConfig:Record<string,unknown>}>(
    `select activity_config as "activityConfig" from question_versions
     where id=$1 and status='PUBLISHED'`,
    [questionVersionId],
  );
  if(!question) throw new Error("Published QuestionVersion not found");

  const layers=await query<BoundLayer>(
    `select qdl.dataset_version_id as "datasetVersionId",d.title,qdl.role,qdl.position,qdl.visible,
       qdl.opacity::float8 as opacity,coalesce(qdl.style_json,'{}'::jsonb) as style,
       case when jsonb_typeof(dv.bbox)='array' then array[
         (dv.bbox->>0)::float8,(dv.bbox->>1)::float8,(dv.bbox->>2)::float8,(dv.bbox->>3)::float8
       ] else null end as bbox
     from question_version_dataset_layers qdl
     join dataset_versions dv on dv.id=qdl.dataset_version_id and dv.status='PUBLISHED'
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

export async function getAssessmentMapPayload(session:StudentSession,attemptId:string,questionVersionId:string){
  const ctx=await context(session,attemptId,questionVersionId);
  const layers=[];
  for(const layer of ctx.layers){
    layers.push({...layer,geojson:await featureCollection(layer.datasetVersionId)});
  }
  const boxes=ctx.layers.map((layer)=>layer.bbox).filter((bbox):bbox is [number,number,number,number]=>Array.isArray(bbox)&&bbox.length===4);
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

export async function executeAssessmentGisTool(session:StudentSession,attemptId:string,questionVersionId:string,toolId:string){
  const ctx=await context(session,attemptId,questionVersionId);
  const tool=toolConfiguration(ctx.activityConfig,toolId);
  if(!tool) throw new Error("Tool is not allowed by this QuestionVersion");
  const source=ctx.layers.find((layer)=>layer.role==="SOURCE");
  const target=ctx.layers.find((layer)=>layer.role==="TARGET");
  if(!source) throw new Error("SOURCE DatasetVersion is not bound");

  if(toolId==="buffer"){
    const configured=Number(tool.parameters?.distanceMeters??500);
    const distanceMeters=Number.isFinite(configured)&&configured>0&&configured<=100000?configured:500;
    const [row]=await query<{geojson:unknown;featureCount:number}>(
      `select jsonb_build_object('type','FeatureCollection','features',
         coalesce(jsonb_agg(jsonb_build_object(
           'type','Feature','id',source_feature_id,
           'geometry',ST_AsGeoJSON(ST_Buffer(geom::geography,$2)::geometry)::jsonb,
           'properties',properties || jsonb_build_object('_analysis','buffer','distanceMeters',$2)
         )),'[]'::jsonb)) as geojson,
         count(*)::int as "featureCount"
       from dataset_features where dataset_version_id=$1`,
      [source.datasetVersionId,distanceMeters],
    );
    const result={featureCount:row?.featureCount??0,distanceMeters,geojson:row?.geojson??{type:"FeatureCollection",features:[]}};
    await record(attemptId,questionVersionId,toolId,{datasetVersionId:source.datasetVersionId,distanceMeters},{featureCount:result.featureCount,distanceMeters});
    return result;
  }

  if(toolId==="overlay"){
    if(!target) throw new Error("TARGET DatasetVersion is required for Overlay");
    const [row]=await query<{geojson:unknown;intersectionCount:number}>(
      `select jsonb_build_object('type','FeatureCollection','features',
         coalesce(jsonb_agg(feature) filter(where feature is not null),'[]'::jsonb)) as geojson,
         count(*)::int as "intersectionCount"
       from (
         select jsonb_build_object(
           'type','Feature','geometry',ST_AsGeoJSON(ST_Intersection(a.geom,b.geom))::jsonb,
           'properties',jsonb_build_object('_analysis','overlay','sourceId',a.source_feature_id,'targetId',b.source_feature_id)
         ) as feature
         from dataset_features a join dataset_features b on ST_Intersects(a.geom,b.geom)
         where a.dataset_version_id=$1 and b.dataset_version_id=$2 and not ST_IsEmpty(ST_Intersection(a.geom,b.geom))
         limit 1000
       ) x`,
      [source.datasetVersionId,target.datasetVersionId],
    );
    const result={intersectionCount:row?.intersectionCount??0,geojson:row?.geojson??{type:"FeatureCollection",features:[]}};
    await record(attemptId,questionVersionId,toolId,{sourceVersionId:source.datasetVersionId,targetVersionId:target.datasetVersionId},{intersectionCount:result.intersectionCount});
    return result;
  }

  if(toolId==="distance"){
    if(!target) throw new Error("TARGET DatasetVersion is required for Distance");
    const [row]=await query<{distanceMeters:number|null;sourceFeatureId:string|null;targetFeatureId:string|null;geojson:unknown}>(
      `select
         ST_Distance(a.geom::geography,b.geom::geography)::float8 as "distanceMeters",
         coalesce(a.source_feature_id,a.id::text) as "sourceFeatureId",
         coalesce(b.source_feature_id,b.id::text) as "targetFeatureId",
         jsonb_build_object('type','FeatureCollection','features',jsonb_build_array(
           jsonb_build_object(
             'type','Feature',
             'geometry',ST_AsGeoJSON(ST_ShortestLine(a.geom,b.geom))::jsonb,
             'properties',jsonb_build_object(
               '_analysis','distance',
               'sourceId',coalesce(a.source_feature_id,a.id::text),
               'targetId',coalesce(b.source_feature_id,b.id::text),
               'distanceMeters',ST_Distance(a.geom::geography,b.geom::geography)
             )
           )
         )) as geojson
       from dataset_features a cross join dataset_features b
       where a.dataset_version_id=$1 and b.dataset_version_id=$2
       order by ST_Distance(a.geom::geography,b.geom::geography)
       limit 1`,
      [source.datasetVersionId,target.datasetVersionId],
    );
    const result={
      distanceMeters:row?.distanceMeters??null,
      sourceFeatureId:row?.sourceFeatureId??null,
      targetFeatureId:row?.targetFeatureId??null,
      geojson:row?.geojson??null,
    };
    await record(attemptId,questionVersionId,toolId,{sourceVersionId:source.datasetVersionId,targetVersionId:target.datasetVersionId},{distanceMeters:result.distanceMeters,sourceFeatureId:result.sourceFeatureId,targetFeatureId:result.targetFeatureId});
    return result;
  }

  throw new Error("Unsupported authoritative GIS tool");
}

export async function completedAssessmentGisTools(session:StudentSession,attemptId:string,questionVersionId:string):Promise<string[]>{
  await context(session,attemptId,questionVersionId);
  const rows=await query<{tool_id:string}>(
    `select distinct tool_id from gis_activities where attempt_id=$1 and question_version_id=$2 order by tool_id`,
    [attemptId,questionVersionId],
  );
  return rows.map((row)=>row.tool_id);
}
