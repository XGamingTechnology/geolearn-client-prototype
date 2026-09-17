import { database, query } from "@/server/db";
import type { StudentSession, TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";
import { assertClassAccess, listClasses } from "@/server/classes/service";
import { listQuestionBank } from "@/server/content/service";

export type PublishedQuestionOption={
  questionId:string;questionVersionId:string;title:string;versionNumber:number;spatialMode:string;
  stimulusType:string|null;
};
export type QuizVersionOption={quizId:string;quizVersionId:string;title:string;versionNumber:number;itemCount:number};
export type TeacherAssignmentRow={
  id:string;title:string;classId:string;className:string;quizTitle:string;quizVersion:number;
  opensAt:Date|null;closesAt:Date|null;status:string;attemptCount:number;submittedCount:number;
};
export type StudentAssignmentRow={
  id:string;title:string;instructions:string|null;opensAt:Date|null;closesAt:Date|null;status:string;
  quizTitle:string;itemCount:number;attemptId:string|null;attemptStatus:string|null;scoreRaw:number|null;scoreMax:number|null;
  isOpen:boolean; isExpired:boolean; isScheduled:boolean;
};

type AssignmentWindow={status:string;opens_at:Date|null;closes_at:Date|null};

export function assignmentAvailability(row:AssignmentWindow,now:Date=new Date()){
  const nowMs=now.getTime();
  const isScheduled=row.status==="ACTIVE"&&Boolean(row.opens_at&&row.opens_at.getTime()>nowMs);
  const isExpired=row.status!=="ACTIVE"||Boolean(row.closes_at&&row.closes_at.getTime()<nowMs);
  return {isOpen:!isScheduled&&!isExpired,isExpired,isScheduled};
}

const ABSOLUTE_TIMESTAMP=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseAssignmentTimestamp(value:string,field:string):Date|null{
  if(!value)return null;
  if(!ABSOLUTE_TIMESTAMP.test(value))throw new Error(`Invalid ${field}: an absolute timestamp is required`);
  const parsed=new Date(value);
  if(Number.isNaN(parsed.getTime()))throw new Error(`Invalid ${field}`);
  return parsed;
}

export async function listPublishedQuestionOptions(session:TeacherSession):Promise<PublishedQuestionOption[]>{
  const visible=await listQuestionBank(session);
  const ids=visible.filter((q)=>q.versionStatus==="PUBLISHED"&&q.versionId).map((q)=>q.versionId as string);
  if(!ids.length) return [];
  return query<PublishedQuestionOption>(
    `select q.id as "questionId",qv.id as "questionVersionId",q.title,qv.version_number as "versionNumber",
       qv.spatial_mode as "spatialMode",qv.stimulus_config->>'type' as "stimulusType"
     from question_versions qv join questions q on q.id=qv.question_id
     where qv.id=any($1::uuid[]) and qv.status='PUBLISHED'
     order by lower(q.title),qv.version_number desc`,
    [ids],
  );
}

export async function createPublishedQuiz(input:{
  actor:TeacherSession;title:string;description:string;questionVersionIds:string[];
}):Promise<{quizId:string;quizVersionId:string}>{
  if(!input.actor.schoolId) throw new AuthorizationError();
  const title=input.title.trim();
  const ids=[...new Set(input.questionVersionIds.filter(Boolean))];
  if(!title||title.length>220||ids.length<1||ids.length>100) throw new Error("Quiz title and 1-100 questions required");

  const allowed=await listPublishedQuestionOptions(input.actor);
  const allowedIds=new Set(allowed.map((q)=>q.questionVersionId));
  if(ids.some((id)=>!allowedIds.has(id))) throw new AuthorizationError();

  const client=await database().connect();
  try{
    await client.query("begin");
    const quiz=await client.query<{id:string}>(
      `insert into quizzes(school_id,owner_teacher_id,scope,title,description,status)
       values($1,$2,'PRIVATE',$3,$4,'ACTIVE') returning id`,
      [input.actor.schoolId,input.actor.staffUserId,title,input.description.trim()||null],
    );
    const quizId=quiz.rows[0]?.id;if(!quizId) throw new Error("Quiz creation failed");
    const version=await client.query<{id:string}>(
      `insert into quiz_versions(quiz_id,version_number,status,created_by,published_at)
       values($1,1,'PUBLISHED',$2,now()) returning id`,
      [quizId,input.actor.staffUserId],
    );
    const quizVersionId=version.rows[0]?.id;if(!quizVersionId) throw new Error("Quiz version creation failed");
    let position=1;
    for(const questionVersionId of ids){
      await client.query(
        `insert into quiz_items(quiz_version_id,question_version_id,position,points)
         values($1,$2,$3,1)`,
        [quizVersionId,questionVersionId,position++],
      );
    }
    await client.query("commit");
    return {quizId,quizVersionId};
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function listPublishedQuizOptions(session:TeacherSession):Promise<QuizVersionOption[]>{
  if(!session.schoolId) throw new AuthorizationError();
  return query<QuizVersionOption>(
    `select q.id as "quizId",qv.id as "quizVersionId",q.title,qv.version_number as "versionNumber",
       count(qi.id)::int as "itemCount"
     from quizzes q join quiz_versions qv on qv.quiz_id=q.id and qv.status='PUBLISHED'
     left join quiz_items qi on qi.quiz_version_id=qv.id
     where q.status='ACTIVE' and (
       q.scope='SYSTEM' or (q.scope='SCHOOL' and q.school_id=$1) or (q.scope='PRIVATE' and q.owner_teacher_id=$2)
     )
     group by q.id,qv.id order by q.updated_at desc,qv.version_number desc`,
    [session.schoolId,session.staffUserId],
  );
}

export async function createAssignment(input:{
  actor:TeacherSession;classId:string;quizVersionId:string;title:string;instructions:string;
  opensAt:string;closesAt:string;attemptLimit:number;resultVisibility:string;
}):Promise<string>{
  if(!input.actor.schoolId) throw new AuthorizationError();
  const klass=await assertClassAccess(input.actor,input.classId);
  const [quiz]=await query<{id:string}>(
    `select qv.id from quiz_versions qv join quizzes q on q.id=qv.quiz_id
     where qv.id=$1 and qv.status='PUBLISHED' and q.status='ACTIVE' and (
       q.scope='SYSTEM' or (q.scope='SCHOOL' and q.school_id=$2) or (q.scope='PRIVATE' and q.owner_teacher_id=$3)
     )`,
    [input.quizVersionId,input.actor.schoolId,input.actor.staffUserId],
  );
  if(!quiz) throw new AuthorizationError();
  const title=input.title.trim();if(!title) throw new Error("Assignment title required");
  const attemptLimit=Math.min(Math.max(Math.trunc(input.attemptLimit)||1,1),10);
  const visibility=["AFTER_SUBMIT","AFTER_CLOSE","HIDDEN"].includes(input.resultVisibility)?input.resultVisibility:"AFTER_SUBMIT";
  const opensAt=parseAssignmentTimestamp(input.opensAt,"opens_at");
  const closesAt=parseAssignmentTimestamp(input.closesAt,"closes_at");
  if(opensAt&&closesAt&&closesAt<=opensAt) throw new Error("Close must be after open");
  const [row]=await query<{id:string}>(
    `insert into assignments(school_id,class_id,teacher_id,quiz_version_id,title,instructions,opens_at,closes_at,
       attempt_limit,result_visibility,status)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVE') returning id`,
    [klass.schoolId,input.classId,input.actor.staffUserId,input.quizVersionId,title,input.instructions.trim()||null,opensAt,closesAt,attemptLimit,visibility],
  );
  if(!row) throw new Error("Assignment creation failed");
  return row.id;
}

export async function listTeacherAssignments(session:TeacherSession):Promise<TeacherAssignmentRow[]>{
  if(!session.schoolId) throw new AuthorizationError();
  const classes=await listClasses(session);const classIds=classes.map((c)=>c.id);
  if(!classIds.length)return [];
  return query<TeacherAssignmentRow>(
    `select a.id,a.title,a.class_id as "classId",c.name as "className",q.title as "quizTitle",
       qv.version_number as "quizVersion",a.opens_at as "opensAt",a.closes_at as "closesAt",a.status,
       count(at.id)::int as "attemptCount",count(at.id) filter(where at.status='SUBMITTED')::int as "submittedCount"
     from assignments a join classes c on c.id=a.class_id
     join quiz_versions qv on qv.id=a.quiz_version_id
     join quizzes q on q.id=qv.quiz_id
     left join attempts at on at.assignment_id=a.id
     where a.class_id=any($1::uuid[]) and a.status<>'ARCHIVED'
     group by a.id,c.name,q.title,qv.version_number
     order by a.created_at desc`,
    [classIds],
  );
}

export async function listStudentAssignments(session:StudentSession):Promise<StudentAssignmentRow[]>{
  return query<StudentAssignmentRow>(
    `select a.id,a.title,a.instructions,a.opens_at as "opensAt",a.closes_at as "closesAt",a.status,
       q.title as "quizTitle",count(distinct qi.id)::int as "itemCount",
       last_at.id as "attemptId",last_at.status as "attemptStatus",
       last_at.score_raw::float8 as "scoreRaw",last_at.score_max::float8 as "scoreMax",
       (a.status='ACTIVE' and (a.opens_at is null or a.opens_at<=now()) and (a.closes_at is null or a.closes_at>=now())) as "isOpen",
       (a.status<>'ACTIVE' or (a.closes_at is not null and a.closes_at<now())) as "isExpired",
       (a.opens_at is not null and a.opens_at>now()) as "isScheduled"
     from assignments a
     join quiz_versions qv on qv.id=a.quiz_version_id and qv.status='PUBLISHED'
     join quizzes q on q.id=qv.quiz_id
     join quiz_items qi on qi.quiz_version_id=qv.id
     left join lateral (
       select at.id,at.status,at.score_raw,at.score_max from attempts at
       where at.assignment_id=a.id and at.student_id=$2
       order by at.attempt_number desc limit 1
     ) last_at on true
     where a.class_id=$1 and a.school_id=$3 and a.status in ('ACTIVE','CLOSED')
     group by a.id,q.title,last_at.id,last_at.status,last_at.score_raw,last_at.score_max
     order by a.closes_at nulls last,a.created_at desc`,
    [session.classId,session.studentId,session.schoolId],
  );
}

export async function startOrResumeAttempt(session:StudentSession,assignmentId:string):Promise<string>{
  const [assignment]=await query<{
    id:string;school_id:string;class_id:string;quiz_version_id:string;attempt_limit:number;status:string;opens_at:Date|null;closes_at:Date|null;
  }>(
    `select id,school_id,class_id,quiz_version_id,attempt_limit,status,opens_at,closes_at
     from assignments where id=$1`,[assignmentId],
  );
  if(!assignment||assignment.school_id!==session.schoolId||assignment.class_id!==session.classId) throw new AuthorizationError();
  if(!assignmentAvailability(assignment).isOpen) throw new Error("Assignment is not currently open");

  const [active]=await query<{id:string}>(
    `select id from attempts where assignment_id=$1 and student_id=$2 and status='IN_PROGRESS'
     order by attempt_number desc limit 1`,[assignmentId,session.studentId],
  );
  if(active)return active.id;

  const [count]=await query<{count:number}>(
    "select count(*)::int as count from attempts where assignment_id=$1 and student_id=$2",[assignmentId,session.studentId],
  );
  const next=(count?.count??0)+1;
  if(next>assignment.attempt_limit) throw new Error("Attempt limit reached");
  const [created]=await query<{id:string}>(
    `insert into attempts(school_id,assignment_id,enrollment_id,student_id,quiz_version_id,attempt_number,status)
     values($1,$2,$3,$4,$5,$6,'IN_PROGRESS') returning id`,
    [session.schoolId,assignmentId,session.enrollmentId,session.studentId,assignment.quiz_version_id,next],
  );
  if(!created) throw new Error("Attempt creation failed");
  return created.id;
}

export type AttemptQuestion={
  quizItemId:string;questionVersionId:string;position:number;points:number;title:string;spatialMode:string;prompt:string;
  stimulusConfig:Record<string,unknown>;activityConfig:Record<string,unknown>;
  responseConfig:{type?:string;answers?:Array<{id:string;label:string}>};
  feedbackConfig:{correct?:string;incorrect?:string};
};
export type AttemptRuntime={
  attemptId:string;assignmentId:string;assignmentTitle:string;quizTitle:string;attemptNumber:number;status:string;
  resultVisibility:string;questions:AttemptQuestion[];savedResponses:Record<string,{answer:string;isCorrect:boolean|null;scoreAwarded:number|null}>;
};

export async function getAttemptRuntime(session:StudentSession,attemptId:string):Promise<AttemptRuntime|null>{
  const [base]=await query<{
    attemptId:string;assignmentId:string;assignmentTitle:string;quizTitle:string;attemptNumber:number;status:string;resultVisibility:string;quizVersionId:string;
  }>(
    `select at.id as "attemptId",a.id as "assignmentId",a.title as "assignmentTitle",q.title as "quizTitle",
       at.attempt_number as "attemptNumber",at.status,a.result_visibility as "resultVisibility",at.quiz_version_id as "quizVersionId"
     from attempts at join assignments a on a.id=at.assignment_id
     join quiz_versions qv on qv.id=at.quiz_version_id join quizzes q on q.id=qv.quiz_id
     where at.id=$1 and at.student_id=$2 and at.enrollment_id=$3 and at.school_id=$4`,
    [attemptId,session.studentId,session.enrollmentId,session.schoolId],
  );
  if(!base)return null;
  const questions=await query<AttemptQuestion>(
    `select qi.id as "quizItemId",qv.id as "questionVersionId",qi.position,qi.points::float8 as points,
       q.title,qv.spatial_mode as "spatialMode",qv.prompt,qv.stimulus_config as "stimulusConfig",
       qv.activity_config as "activityConfig",qv.response_config as "responseConfig",qv.feedback_config as "feedbackConfig"
     from quiz_items qi join question_versions qv on qv.id=qi.question_version_id and qv.status='PUBLISHED'
     join questions q on q.id=qv.question_id where qi.quiz_version_id=$1 order by qi.position`,
    [base.quizVersionId],
  );
  const saved=await query<{quizItemId:string;answer:string|null;isCorrect:boolean|null;scoreAwarded:number|null}>(
    `select quiz_item_id as "quizItemId",response_json->>'answer' as answer,is_correct as "isCorrect",
       score_awarded::float8 as "scoreAwarded"
     from responses where attempt_id=$1`,
    [attemptId],
  );
  const savedResponses=Object.fromEntries(saved.filter((row)=>row.answer).map((row)=>[
    row.quizItemId,{answer:row.answer as string,isCorrect:row.isCorrect,scoreAwarded:row.scoreAwarded},
  ]));
  return {...base,questions,savedResponses};
}

function requiredTools(activityConfig:Record<string,unknown>):string[]{
  const actions=Array.isArray(activityConfig.requiredActions)?activityConfig.requiredActions:[];
  return actions.map((a)=>a&&typeof a==="object"&&typeof (a as {tool?:unknown}).tool==="string"?(a as {tool:string}).tool:null).filter((x):x is string=>Boolean(x));
}

export async function recordGisActivity(input:{
  session:StudentSession;attemptId:string;questionVersionId:string;toolId:string;actionType:string;
  parameters?:Record<string,unknown>;resultSummary?:Record<string,unknown>;
}):Promise<void>{
  const runtime=await getAttemptRuntime(input.session,input.attemptId);
  if(!runtime||runtime.status!=="IN_PROGRESS"||!runtime.questions.some((q)=>q.questionVersionId===input.questionVersionId)) throw new AuthorizationError();
  if(!input.toolId||input.toolId.length>80||!input.actionType||input.actionType.length>100) throw new Error("Invalid GIS activity");
  await query(
    `insert into gis_activities(attempt_id,question_version_id,tool_id,action_type,parameters_json,result_summary_json)
     values($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
    [input.attemptId,input.questionVersionId,input.toolId,input.actionType,JSON.stringify(input.parameters??{}),JSON.stringify(input.resultSummary??{})],
  );
}

export async function saveMultipleChoiceResponse(input:{
  session:StudentSession;attemptId:string;quizItemId:string;answer:string;durationMs?:number;
}):Promise<{isCorrect:boolean;scoreAwarded:number;feedback:string}>{
  const runtime=await getAttemptRuntime(input.session,input.attemptId);
  if(!runtime||runtime.status!=="IN_PROGRESS") throw new AuthorizationError();
  const question=runtime.questions.find((q)=>q.quizItemId===input.quizItemId);
  if(!question) throw new AuthorizationError();
  const answer=input.answer.trim().toUpperCase();
  if(!["A","B","C","D","E"].includes(answer)) throw new Error("Invalid answer");

  const [validation]=await query<{validation_config:{method?:string;correctAnswer?:string}}>(
    "select validation_config from question_versions where id=$1 and status='PUBLISHED'",[question.questionVersionId],
  );
  if(!validation||validation.validation_config?.method!=="static-answer") throw new Error("This validation method is not implemented in Slice 14");
  const required=requiredTools(question.activityConfig);
  if(required.length){
    const completed=await query<{tool_id:string}>(
      `select distinct tool_id from gis_activities where attempt_id=$1 and question_version_id=$2`,
      [input.attemptId,question.questionVersionId],
    );
    const done=new Set(completed.map((x)=>x.tool_id));
    if(required.some((tool)=>!done.has(tool))) throw new Error("Required GIS activity is incomplete");
  }

  const correct=String(validation.validation_config.correctAnswer??"").toUpperCase();
  const isCorrect=answer===correct;
  const scoreAwarded=isCorrect?question.points:0;
  await query(
    `insert into responses(attempt_id,quiz_item_id,question_version_id,response_json,is_correct,score_awarded,duration_ms,answered_at)
     values($1,$2,$3,$4::jsonb,$5,$6,$7,now())
     on conflict(attempt_id,quiz_item_id) do update
       set response_json=excluded.response_json,is_correct=excluded.is_correct,score_awarded=excluded.score_awarded,
           duration_ms=excluded.duration_ms,answered_at=now()`,
    [input.attemptId,input.quizItemId,question.questionVersionId,JSON.stringify({type:"multiple-choice",answer}),isCorrect,scoreAwarded,Math.max(0,Math.trunc(input.durationMs??0))],
  );
  return {isCorrect,scoreAwarded,feedback:isCorrect?(question.feedbackConfig.correct??""):(question.feedbackConfig.incorrect??"")};
}

export async function submitAttempt(session:StudentSession,attemptId:string):Promise<{scoreRaw:number;scoreMax:number}>{
  const runtime=await getAttemptRuntime(session,attemptId);
  if(!runtime||runtime.status!=="IN_PROGRESS") throw new AuthorizationError();
  const [totals]=await query<{answered:number;score:number;max:number}>(
    `select count(r.id)::int as answered,coalesce(sum(r.score_awarded),0)::float8 as score,
       coalesce(sum(qi.points),0)::float8 as max
     from quiz_items qi
     left join responses r on r.quiz_item_id=qi.id and r.attempt_id=$1
     where qi.quiz_version_id=(select quiz_version_id from attempts where id=$1)`,
    [attemptId],
  );
  if((totals?.answered??0)<runtime.questions.length) throw new Error("Answer all questions before submit");
  const score=totals?.score??0,max=totals?.max??0;
  await query(
    `update attempts set status='SUBMITTED',submitted_at=now(),score_raw=$2,score_max=$3
     where id=$1 and status='IN_PROGRESS'`,
    [attemptId,score,max],
  );
  return {scoreRaw:score,scoreMax:max};
}

export async function getStudentAttemptResult(session:StudentSession,attemptId:string){
  const [row]=await query<{
    id:string;assignmentTitle:string;quizTitle:string;scoreRaw:number|null;scoreMax:number|null;submittedAt:Date|null;resultVisibility:string;
  }>(
    `select at.id,a.title as "assignmentTitle",q.title as "quizTitle",at.score_raw::float8 as "scoreRaw",
       at.score_max::float8 as "scoreMax",at.submitted_at as "submittedAt",a.result_visibility as "resultVisibility"
     from attempts at join assignments a on a.id=at.assignment_id
     join quiz_versions qv on qv.id=at.quiz_version_id join quizzes q on q.id=qv.quiz_id
     where at.id=$1 and at.student_id=$2 and at.enrollment_id=$3 and at.status='SUBMITTED'`,
    [attemptId,session.studentId,session.enrollmentId],
  );
  return row??null;
}


export async function listStudentResults(session:StudentSession){
  return query<{
    attemptId:string;assignmentTitle:string;quizTitle:string;scoreRaw:number|null;scoreMax:number|null;submittedAt:Date|null;
  }>(
    `select at.id as "attemptId",a.title as "assignmentTitle",q.title as "quizTitle",
       at.score_raw::float8 as "scoreRaw",at.score_max::float8 as "scoreMax",at.submitted_at as "submittedAt"
     from attempts at join assignments a on a.id=at.assignment_id
     join quiz_versions qv on qv.id=at.quiz_version_id join quizzes q on q.id=qv.quiz_id
     where at.student_id=$1 and at.enrollment_id=$2 and at.status='SUBMITTED'
     order by at.submitted_at desc`,
    [session.studentId,session.enrollmentId],
  );
}

export async function getTeacherAssignmentResult(session:TeacherSession,assignmentId:string){
  const assignments=await listTeacherAssignments(session);
  const assignment=assignments.find((item)=>item.id===assignmentId);
  if(!assignment) throw new AuthorizationError();
  const attempts=await query<{
    attemptId:string;studentName:string;loginId:string;status:string;scoreRaw:number|null;scoreMax:number|null;submittedAt:Date|null;
  }>(
    `select at.id as "attemptId",s.full_name as "studentName",cred.login_id as "loginId",at.status,
       at.score_raw::float8 as "scoreRaw",at.score_max::float8 as "scoreMax",at.submitted_at as "submittedAt"
     from attempts at join students s on s.id=at.student_id
     join student_credentials cred on cred.student_id=s.id
     where at.assignment_id=$1 order by s.full_name,at.attempt_number desc`,
    [assignmentId],
  );
  return {assignment,attempts};
}
