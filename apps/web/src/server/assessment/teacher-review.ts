import {database,query} from "@/server/db";
import {AuthorizationError} from "@/server/auth/authorization";
import type {TeacherSession} from "@/server/auth/session";
import {listTeacherAssignments} from "./service";

export type TeacherReviewResponse={
  responseId:string;
  quizItemId:string;
  questionVersionId:string;
  title:string;
  spatialMode:string;
  responseType:string|null;
  responseJson:Record<string,unknown>;
  isCorrect:boolean|null;
  autoScore:number|null;
  points:number;
  finalScore:number|null;
  feedback:string|null;
  reviewedAt:Date|null;
  artifactCount:number;
  artifacts:Array<{artifactType:string;geometry:Record<string,unknown>|null;selectedFeatureIds:unknown}>;
};

export type TeacherAttemptReview={
  attemptId:string;
  assignmentId:string;
  assignmentTitle:string;
  studentName:string;
  loginId:string;
  status:string;
  scoreRaw:number|null;
  scoreMax:number|null;
  submittedAt:Date|null;
  responses:TeacherReviewResponse[];
};

async function assertTeacherAttempt(session:TeacherSession,attemptId:string){
  const [row]=await query<{attemptId:string;assignmentId:string;assignmentTitle:string;studentName:string;loginId:string;status:string;scoreRaw:number|null;scoreMax:number|null;submittedAt:Date|null}>(
    `select at.id as "attemptId",a.id as "assignmentId",a.title as "assignmentTitle",s.full_name as "studentName",
       cred.login_id as "loginId",at.status,at.score_raw::float8 as "scoreRaw",at.score_max::float8 as "scoreMax",at.submitted_at as "submittedAt"
     from attempts at
     join assignments a on a.id=at.assignment_id
     join students s on s.id=at.student_id
     join student_credentials cred on cred.student_id=s.id
     where at.id=$1`,
    [attemptId],
  );
  if(!row)throw new AuthorizationError();
  const assignments=await listTeacherAssignments(session);
  if(!assignments.some(item=>item.id===row.assignmentId))throw new AuthorizationError();
  return row;
}

export async function getTeacherAttemptReview(session:TeacherSession,attemptId:string):Promise<TeacherAttemptReview>{
  const base=await assertTeacherAttempt(session,attemptId);
  const responses=await query<TeacherReviewResponse>(
    `select r.id as "responseId",r.quiz_item_id as "quizItemId",r.question_version_id as "questionVersionId",
       q.title,qv.spatial_mode as "spatialMode",qv.response_config->>'type' as "responseType",
       r.response_json as "responseJson",r.is_correct as "isCorrect",r.score_awarded::float8 as "autoScore",
       qi.points::float8 as points,tr.final_score::float8 as "finalScore",tr.feedback,tr.reviewed_at as "reviewedAt",
       coalesce(art.artifact_count,0)::int as "artifactCount",coalesce(art.artifacts,'[]'::jsonb) as artifacts
     from responses r
     join quiz_items qi on qi.id=r.quiz_item_id
     join question_versions qv on qv.id=r.question_version_id
     join questions q on q.id=qv.question_id
     left join teacher_response_reviews tr on tr.response_id=r.id
     left join lateral (
       select count(*)::int as artifact_count,
         jsonb_agg(jsonb_build_object(
           'artifactType',rsa.artifact_type,
           'geometry',case when rsa.geom is null then null else ST_AsGeoJSON(rsa.geom)::jsonb end,
           'selectedFeatureIds',rsa.selected_feature_ids
         ) order by rsa.created_at) as artifacts
       from response_spatial_artifacts rsa where rsa.response_id=r.id
     ) art on true
     where r.attempt_id=$1
     order by qi.position`,
    [attemptId],
  );
  return {...base,responses};
}

export async function saveTeacherResponseReview(input:{
  actor:TeacherSession;
  responseId:string;
  finalScore:number;
  feedback:string;
}){
  if(!Number.isFinite(input.finalScore))throw new Error("Nilai final tidak valid.");
  const [state]=await query<{attemptId:string;points:number;autoScore:number|null;status:string}>(
    `select r.attempt_id as "attemptId",qi.points::float8 as points,r.score_awarded::float8 as "autoScore",at.status
     from responses r join quiz_items qi on qi.id=r.quiz_item_id join attempts at on at.id=r.attempt_id
     where r.id=$1`,
    [input.responseId],
  );
  if(!state)throw new Error("Response tidak ditemukan.");
  await assertTeacherAttempt(input.actor,state.attemptId);
  if(state.status!=="SUBMITTED")throw new Error("Hanya attempt yang sudah submit yang dapat direview.");
  const finalScore=Math.max(0,Math.min(state.points,input.finalScore));
  const feedback=input.feedback.trim().slice(0,5000)||null;
  const client=await database().connect();
  try{
    await client.query("begin");
    await client.query(
      `insert into teacher_response_reviews(response_id,reviewer_id,auto_score,final_score,feedback,reviewed_at,updated_at)
       values($1,$2,$3,$4,$5,now(),now())
       on conflict(response_id) do update set reviewer_id=excluded.reviewer_id,auto_score=excluded.auto_score,
         final_score=excluded.final_score,feedback=excluded.feedback,reviewed_at=now(),updated_at=now()`,
      [input.responseId,input.actor.staffUserId,state.autoScore,finalScore,feedback],
    );
    await client.query(
      `update attempts at set score_raw=(
         select coalesce(sum(coalesce(tr.final_score,r.score_awarded,0)),0)
         from responses r left join teacher_response_reviews tr on tr.response_id=r.id
         where r.attempt_id=at.id
       ) where at.id=$1`,
      [state.attemptId],
    );
    await client.query("commit");
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
  return {attemptId:state.attemptId,finalScore};
}
