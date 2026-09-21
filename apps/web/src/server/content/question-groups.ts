import { query } from "@/server/db";
import { hasStaffPermission } from "@/server/auth/permissions";
import { AuthorizationError } from "@/server/auth/authorization";
import type { TeacherSession } from "@/server/auth/session";
import type { ContentScope } from "@/server/content/service";

export type QuestionGroupOption={
  id:string;
  title:string;
  description:string|null;
  subject:string|null;
  topic:string|null;
  stimulusType:"text"|"image"|"video"|"webgis";
  scope:ContentScope;
  ownerTeacherId:string|null;
};

export type QuestionGroupCard=QuestionGroupOption&{
  questionCount:number;
  publishedCount:number;
  draftCount:number;
};

function validateScope(value:string):ContentScope{
  if(value!=="SYSTEM"&&value!=="SCHOOL"&&value!=="PRIVATE")throw new Error("Scope tidak valid.");
  return value;
}

async function assertScopeWrite(session:TeacherSession,scope:ContentScope){
  if(scope==="SYSTEM"&&session.role!=="SYSTEM_ADMIN")throw new AuthorizationError();
  if(scope!=="SYSTEM"&&!session.schoolId)throw new AuthorizationError();
  if(scope==="SCHOOL"){
    const allowed=session.role==="SYSTEM_ADMIN"||session.role==="SCHOOL_ADMIN"||await hasStaffPermission(session,"CONTENT_MANAGE_SCHOOL");
    if(!allowed)throw new AuthorizationError();
  }
}

export async function listQuestionGroups(session:TeacherSession):Promise<QuestionGroupOption[]>{
  if(!session.schoolId&&session.role!=="SYSTEM_ADMIN")throw new AuthorizationError();
  return query<QuestionGroupOption>(
    `select id,title,description,subject,topic,stimulus_type as "stimulusType",scope,owner_teacher_id as "ownerTeacherId"
     from question_groups
     where status='ACTIVE' and (
       scope='SYSTEM'
       or (scope='SCHOOL' and school_id=$1)
       or (scope='PRIVATE' and owner_teacher_id=$2)
     )
     order by lower(title),created_at desc`,
    [session.schoolId,session.staffUserId],
  );
}

export async function listQuestionGroupCards(session:TeacherSession):Promise<QuestionGroupCard[]>{
  if(!session.schoolId&&session.role!=="SYSTEM_ADMIN")throw new AuthorizationError();
  return query<QuestionGroupCard>(
    `select g.id,g.title,g.description,g.subject,g.topic,g.stimulus_type as "stimulusType",g.scope,
       g.owner_teacher_id as "ownerTeacherId",
       count(distinct q.id)::int as "questionCount",
       count(distinct q.id) filter(where exists(select 1 from question_versions pv where pv.question_id=q.id and pv.status='PUBLISHED'))::int as "publishedCount",
       count(distinct q.id) filter(where exists(select 1 from question_versions dv where dv.question_id=q.id and dv.status='DRAFT'))::int as "draftCount"
     from question_groups g
     left join questions q on q.question_group_id=g.id and q.status='ACTIVE'
     where g.status='ACTIVE' and (
       g.scope='SYSTEM'
       or (g.scope='SCHOOL' and g.school_id=$1)
       or (g.scope='PRIVATE' and g.owner_teacher_id=$2)
     )
     group by g.id
     order by lower(g.title),g.created_at desc`,
    [session.schoolId,session.staffUserId],
  );
}

export async function createQuestionGroup(input:{
  actor:TeacherSession;
  title:string;
  description:string;
  subject:string;
  topic:string;
  stimulusType:string;
  scope:string;
}){
  const scope=validateScope(input.scope);
  await assertScopeWrite(input.actor,scope);
  const title=input.title.trim();
  if(!title||title.length>220)throw new Error("Judul Stimulus Set wajib diisi.");
  const stimulusType=["text","image","video","webgis"].includes(input.stimulusType)?input.stimulusType:"text";
  const [row]=await query<{id:string}>(
    `insert into question_groups(school_id,owner_teacher_id,scope,title,description,subject,topic,stimulus_type,status)
     values($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE') returning id`,
    [
      scope==="SYSTEM"?null:input.actor.schoolId,
      scope==="SYSTEM"?null:input.actor.staffUserId,
      scope,title,input.description.trim()||null,input.subject.trim()||null,input.topic.trim()||null,stimulusType,
    ],
  );
  if(!row)throw new Error("Stimulus Set gagal dibuat.");
  return row.id;
}

export async function resolveQuestionGroupForCreate(session:TeacherSession,groupId:string,scope:ContentScope){
  if(!groupId)return null;
  const [row]=await query<QuestionGroupOption & {schoolId:string|null}>(
    `select id,title,description,subject,topic,stimulus_type as "stimulusType",scope,
       owner_teacher_id as "ownerTeacherId",school_id as "schoolId"
     from question_groups where id=$1 and status='ACTIVE'`,
    [groupId],
  );
  if(!row)throw new Error("Stimulus Set tidak tersedia.");
  if(row.scope!==scope)throw new Error("Scope soal harus sama dengan Stimulus Set.");
  if(row.scope==="SYSTEM"){
    if(session.role!=="SYSTEM_ADMIN")throw new AuthorizationError();
  }else if(row.scope==="SCHOOL"){
    if(row.schoolId!==session.schoolId)throw new AuthorizationError();
  }else if(row.ownerTeacherId!==session.staffUserId)throw new AuthorizationError();
  return row;
}

export async function attachQuestionToGroup(input:{
  actor:TeacherSession;
  questionId:string;
  groupId:string;
  questionScope:ContentScope;
  stimulusType:string;
}){
  const group=await resolveQuestionGroupForCreate(input.actor,input.groupId,input.questionScope);
  if(!group)return;
  if(group.stimulusType!==input.stimulusType)throw new Error("Stimulus soal harus sama dengan Stimulus Set.");
  const result=await query<{id:string}>(
    `update questions set question_group_id=$2,updated_at=now()
     where id=$1 and status='ACTIVE' returning id`,
    [input.questionId,input.groupId],
  );
  if(!result[0])throw new Error("Soal gagal ditambahkan ke Stimulus Set.");
}
