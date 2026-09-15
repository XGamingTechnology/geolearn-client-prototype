import { database, query } from "@/server/db";
import type { StudentSession, TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";

export type QuestionMediaBinding={
  id:string;
  mediaAssetId:string;
  title:string;
  mediaType:"IMAGE"|"VIDEO"|"DOCUMENT"|"ILLUSTRATION";
  storageKey:string|null;
  mimeType:string|null;
  role:"STIMULUS"|"SUPPORTING";
  position:number;
  altText:string|null;
  caption:string|null;
};

async function editableVersion(actor:TeacherSession,questionId:string){
  const [row]=await query<{id:string;school_id:string|null;owner_teacher_id:string|null;scope:string}>(
    `select qv.id,q.school_id,q.owner_teacher_id,q.scope
     from questions q
     join question_versions qv on qv.question_id=q.id and qv.status='DRAFT'
     where q.id=$1 and q.status='ACTIVE'
     order by qv.version_number desc limit 1`,
    [questionId],
  );
  if(!row) throw new Error("Draft QuestionVersion not found");
  if(row.scope==="SYSTEM"&&actor.role!=="SYSTEM_ADMIN") throw new AuthorizationError();
  if(row.scope==="SCHOOL"&&row.school_id!==actor.schoolId) throw new AuthorizationError();
  if(row.scope==="PRIVATE"&&row.owner_teacher_id!==actor.staffUserId) throw new AuthorizationError();
  return row.id;
}

async function resolveMedia(actor:TeacherSession,ids:string[]){
  const clean=[...new Set(ids.filter(Boolean))];
  if(!clean.length)return [];
  const rows=await query<{id:string}>(
    `select id from media_assets
     where id=any($1::uuid[]) and status='ACTIVE' and (
       scope='SYSTEM' or (scope='SCHOOL' and school_id=$2) or (scope='PRIVATE' and owner_teacher_id=$3)
     )`,
    [clean,actor.schoolId,actor.staffUserId],
  );
  const allowed=new Set(rows.map((row)=>row.id));
  if(clean.some((id)=>!allowed.has(id))) throw new AuthorizationError();
  return clean;
}

export async function replaceQuestionDraftMediaBindings(
  actor:TeacherSession,
  questionId:string,
  bindings:Array<{mediaAssetId:string;role:"STIMULUS"|"SUPPORTING";altText?:string;caption?:string}>,
):Promise<void>{
  const questionVersionId=await editableVersion(actor,questionId);
  const ids=await resolveMedia(actor,bindings.map((b)=>b.mediaAssetId));
  const filtered=bindings.filter((b)=>ids.includes(b.mediaAssetId));

  const client=await database().connect();
  try{
    await client.query("begin");
    await client.query("delete from question_version_media_assets where question_version_id=$1",[questionVersionId]);
    let position=1;
    for(const binding of filtered){
      await client.query(
        `insert into question_version_media_assets(
          question_version_id,media_asset_id,role,position,alt_text,caption
        ) values($1,$2,$3,$4,$5,$6)`,
        [
          questionVersionId,binding.mediaAssetId,binding.role,position++,
          binding.altText?.trim()||null,binding.caption?.trim()||null,
        ],
      );
    }
    await client.query("commit");
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function listQuestionMediaBindings(
  actor:TeacherSession,
  questionId:string,
):Promise<QuestionMediaBinding[]>{
  const [question]=await query<{school_id:string|null;owner_teacher_id:string|null;scope:string}>(
    "select school_id,owner_teacher_id,scope from questions where id=$1 and status='ACTIVE'",[questionId],
  );
  if(!question) throw new Error("Question not found");
  if(question.scope==="SCHOOL"&&question.school_id!==actor.schoolId) throw new AuthorizationError();
  if(question.scope==="PRIVATE"&&question.owner_teacher_id!==actor.staffUserId) throw new AuthorizationError();

  return query<QuestionMediaBinding>(
    `select qma.id,ma.id as "mediaAssetId",ma.title,ma.media_type as "mediaType",
       ma.storage_key as "storageKey",ma.mime_type as "mimeType",qma.role,qma.position,
       qma.alt_text as "altText",qma.caption
     from question_versions qv
     join question_version_media_assets qma on qma.question_version_id=qv.id
     join media_assets ma on ma.id=qma.media_asset_id and ma.status='ACTIVE'
     where qv.question_id=$1
     order by case qv.status when 'DRAFT' then 0 else 1 end,qv.version_number desc,qma.position`,
    [questionId],
  );
}

export async function getStudentQuestionMedia(
  session:StudentSession,
  attemptId:string,
  questionVersionId:string,
):Promise<QuestionMediaBinding[]>{
  const [allowed]=await query<{id:string}>(
    `select at.id
     from attempts at
     join quiz_items qi on qi.quiz_version_id=at.quiz_version_id
     where at.id=$1 and at.student_id=$2 and at.enrollment_id=$3 and at.school_id=$4
       and qi.question_version_id=$5
     limit 1`,
    [attemptId,session.studentId,session.enrollmentId,session.schoolId,questionVersionId],
  );
  if(!allowed) throw new AuthorizationError();

  return query<QuestionMediaBinding>(
    `select qma.id,ma.id as "mediaAssetId",ma.title,ma.media_type as "mediaType",
       ma.storage_key as "storageKey",ma.mime_type as "mimeType",qma.role,qma.position,
       qma.alt_text as "altText",qma.caption
     from question_version_media_assets qma
     join media_assets ma on ma.id=qma.media_asset_id and ma.status='ACTIVE'
     where qma.question_version_id=$1
     order by qma.position`,
    [questionVersionId],
  );
}
