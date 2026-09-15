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
}):Promise<{saved:true;pendingReview:true}>{
  const runtime=await getAttemptRuntime(input.session,input.attemptId);
  if(!runtime||runtime.status!=="IN_PROGRESS") throw new AuthorizationError();
  const question=runtime.questions.find((item)=>item.quizItemId===input.quizItemId);
  if(!question) throw new AuthorizationError();

  const configured=String(question.responseConfig.type??"");
  if(configured!==input.responseType) throw new Error("Response type does not match QuestionVersion");
  await assertRequiredTools(input.attemptId,question.questionVersionId,question.activityConfig);

  const expected=expectedGeometryType(input.responseType);
  if(expected){
    if(!input.geometry||typeof input.geometry!=="object"||(input.geometry as {type?:unknown}).type!==expected) throw new Error("Invalid geometry type");
  }else{
    const ids=[...new Set((input.selectedFeatureIds??[]).map(String).filter(Boolean))];
    if(!ids.length||ids.length>500) throw new Error("Select at least one map feature");
    input.selectedFeatureIds=ids;
  }

  const client=await database().connect();
  try{
    await client.query("begin");
    const response=await client.query<{id:string}>(
      `insert into responses(attempt_id,quiz_item_id,question_version_id,response_json,is_correct,score_awarded,duration_ms,answered_at)
       values($1,$2,$3,$4::jsonb,null,null,$5,now())
       on conflict(attempt_id,quiz_item_id) do update
         set response_json=excluded.response_json,is_correct=null,score_awarded=null,duration_ms=excluded.duration_ms,answered_at=now()
       returning id`,
      [
        input.attemptId,input.quizItemId,question.questionVersionId,
        JSON.stringify(input.responseType==="feature-select"
          ?{type:input.responseType,selectedFeatureIds:input.selectedFeatureIds}
          :{type:input.responseType,geometry:input.geometry}),
        Math.max(0,Math.trunc(input.durationMs??0)),
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
    return {saved:true,pendingReview:true};
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
