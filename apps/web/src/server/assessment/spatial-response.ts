import { database, query } from "@/server/db";
import type { StudentSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";
import { getAttemptRuntime } from "@/server/assessment/service";

type SpatialResponseType="draw-point"|"draw-line"|"draw-polygon"|"feature-select";

function requiredTools(activityConfig:Record<string,unknown>):string[]{
  const actions=Array.isArray(activityConfig.requiredActions)?activityConfig.requiredActions:[];
  return actions
    .map((action)=>action&&typeof action==="object"&&typeof (action as {tool?:unknown}).tool==="string"?(action as {tool:string}).tool:null)
    .filter((tool):tool is string=>Boolean(tool));
}

async function assertRequiredTools(attemptId:string,questionVersionId:string,activityConfig:Record<string,unknown>){
  const required=requiredTools(activityConfig);
  if(!required.length)return;
  const completed=await query<{tool_id:string}>(
    "select distinct tool_id from gis_activities where attempt_id=$1 and question_version_id=$2",
    [attemptId,questionVersionId],
  );
  const done=new Set(completed.map((row)=>row.tool_id));
  if(required.some((tool)=>!done.has(tool))) throw new Error("Required GIS activity is incomplete");
}

function expectedGeometryType(responseType:SpatialResponseType){
  if(responseType==="draw-point")return "Point";
  if(responseType==="draw-line")return "LineString";
  if(responseType==="draw-polygon")return "Polygon";
  return null;
}

export async function saveSpatialResponse(input:{
  session:StudentSession;
  attemptId:string;
  quizItemId:string;
  responseType:SpatialResponseType;
  geometry?:unknown;
  selectedFeatureIds?:string[];
  durationMs?:number;
}):Promise<{saved:true;pendingReview:boolean;isCorrect:boolean|null;scoreAwarded:number|null}>{
  const runtime=await getAttemptRuntime(input.session,input.attemptId);
  if(!runtime||runtime.status!=="IN_PROGRESS") throw new AuthorizationError();
  const question=runtime.questions.find((item)=>item.quizItemId===input.quizItemId);
  if(!question) throw new AuthorizationError();

  const configured=String(question.responseConfig.type??"");
  if(configured!==input.responseType) throw new Error("Response type does not match QuestionVersion");
  await assertRequiredTools(input.attemptId,question.questionVersionId,question.activityConfig);

  const [validationRow]=await query<{validation_config:{method?:string;maxDistanceMeters?:number;minOverlapRatio?:number;targetRole?:string}}>(
    "select validation_config from question_versions where id=$1 and status='PUBLISHED'",
    [question.questionVersionId],
  );
  const validation=validationRow?.validation_config??{method:"manual-review"};

  const expected=expectedGeometryType(input.responseType);
  if(expected){
    if(!input.geometry||typeof input.geometry!=="object"||(input.geometry as {type?:unknown}).type!==expected) throw new Error("Invalid geometry type");
  }else{
    const ids=[...new Set((input.selectedFeatureIds??[]).map(String).filter(Boolean))];
    if(!ids.length||ids.length>500) throw new Error("Select at least one map feature");
    input.selectedFeatureIds=ids;
  }

  let isCorrect:boolean|null=null;
  let scoreAwarded:number|null=null;
  if(expected&&validation.method==="geometry-distance"){
    const [target]=await query<{datasetVersionId:string}>(
      `select dataset_version_id as "datasetVersionId"
       from question_version_dataset_layers
       where question_version_id=$1 and role='TARGET'
       order by position limit 1`,
      [question.questionVersionId],
    );
    if(!target) throw new Error("TARGET DatasetVersion is required for geometry-distance validation");
    const maxDistanceMeters=Math.max(0,Number(validation.maxDistanceMeters??100));
    const [result]=await query<{distanceMeters:number|null}>(
      `select min(ST_Distance(ST_SetSRID(ST_GeomFromGeoJSON($1),4326)::geography,df.geom::geography))::float8 as "distanceMeters"
       from dataset_features df where df.dataset_version_id=$2`,
      [JSON.stringify(input.geometry),target.datasetVersionId],
    );
    isCorrect=result?.distanceMeters!==null&&result?.distanceMeters!==undefined&&result.distanceMeters<=maxDistanceMeters;
    scoreAwarded=isCorrect?question.points:0;
  }else if(expected&&validation.method==="geometry-overlap"){
    if(input.responseType!=="draw-polygon") throw new Error("geometry-overlap requires draw-polygon response");
    const [target]=await query<{datasetVersionId:string}>(
      `select dataset_version_id as "datasetVersionId"
       from question_version_dataset_layers
       where question_version_id=$1 and role='TARGET'
       order by position limit 1`,
      [question.questionVersionId],
    );
    if(!target) throw new Error("TARGET DatasetVersion is required for geometry-overlap validation");
    const threshold=Math.min(Math.max(Number(validation.minOverlapRatio??0.5),0),1);
    const [result]=await query<{ratio:number}>(
      `with response_geom as (
         select ST_SetSRID(ST_GeomFromGeoJSON($1),4326) as geom
       ), target_geom as (
         select ST_UnaryUnion(ST_Collect(df.geom)) as geom
         from dataset_features df where df.dataset_version_id=$2
       )
       select case
         when ST_Area(r.geom::geography)=0 then 0
         else ST_Area(ST_Intersection(r.geom,t.geom)::geography)/ST_Area(r.geom::geography)
       end::float8 as ratio
       from response_geom r cross join target_geom t`,
      [JSON.stringify(input.geometry),target.datasetVersionId],
    );
    isCorrect=(result?.ratio??0)>=threshold;
    scoreAwarded=isCorrect?question.points:0;
  }

  const client=await database().connect();
  try{
    await client.query("begin");
    const response=await client.query<{id:string}>(
      `insert into responses(attempt_id,quiz_item_id,question_version_id,response_json,is_correct,score_awarded,duration_ms,answered_at)
       values($1,$2,$3,$4::jsonb,$5,$6,$7,now())
       on conflict(attempt_id,quiz_item_id) do update
         set response_json=excluded.response_json,is_correct=excluded.is_correct,score_awarded=excluded.score_awarded,duration_ms=excluded.duration_ms,answered_at=now()
       returning id`,
      [
        input.attemptId,input.quizItemId,question.questionVersionId,
        JSON.stringify(input.responseType==="feature-select"
          ?{type:input.responseType,selectedFeatureIds:input.selectedFeatureIds}
          :{type:input.responseType,geometry:input.geometry}),
        isCorrect,scoreAwarded,Math.max(0,Math.trunc(input.durationMs??0)),
      ],
    );
    const responseId=response.rows[0]?.id;
    if(!responseId) throw new Error("Spatial response persistence failed");

    await client.query("delete from response_spatial_artifacts where response_id=$1",[responseId]);

    if(expected){
      const artifactType=input.responseType==="draw-point"?"POINT":input.responseType==="draw-line"?"LINE":"POLYGON";
      const geometryJson=JSON.stringify(input.geometry);
      const valid=await client.query<{valid:boolean}>(
        `select ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON($1),4326)) as valid`,
        [geometryJson],
      );
      if(!valid.rows[0]?.valid) throw new Error("Invalid spatial geometry");
      await client.query(
        `insert into response_spatial_artifacts(response_id,artifact_type,geom,properties)
         values($1,$2,ST_SetSRID(ST_GeomFromGeoJSON($3),4326),'{}'::jsonb)`,
        [responseId,artifactType,geometryJson],
      );
    }else{
      await client.query(
        `insert into response_spatial_artifacts(response_id,artifact_type,selected_feature_ids,properties)
         values($1,'SELECTION',$2::jsonb,'{}'::jsonb)`,
        [responseId,JSON.stringify(input.selectedFeatureIds??[])],
      );
    }

    await client.query("commit");
    return {saved:true,pendingReview:isCorrect===null,isCorrect,scoreAwarded};
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function getSavedSpatialResponses(session:StudentSession,attemptId:string){
  const runtime=await getAttemptRuntime(session,attemptId);
  if(!runtime) throw new AuthorizationError();
  const rows=await query<{
    quizItemId:string;responseType:string;geometry:unknown|null;selectedFeatureIds:string[];
  }>(
    `select r.quiz_item_id as "quizItemId",r.response_json->>'type' as "responseType",
       case when rsa.geom is not null then ST_AsGeoJSON(rsa.geom)::json else null end as geometry,
       coalesce(rsa.selected_feature_ids,'[]'::jsonb) as "selectedFeatureIds"
     from responses r
     join response_spatial_artifacts rsa on rsa.response_id=r.id
     where r.attempt_id=$1`,
    [attemptId],
  );
  return Object.fromEntries(rows.map((row)=>[row.quizItemId,{
    responseType:row.responseType,
    geometry:row.geometry,
    selectedFeatureIds:row.selectedFeatureIds,
  }]));
}
