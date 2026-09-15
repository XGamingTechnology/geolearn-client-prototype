import { database, query } from "@/server/db";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";

export type QuestionDatasetRole="SOURCE"|"TARGET"|"CONTEXT";
export type QuestionDatasetBinding={
  id:string;datasetId:string;datasetVersionId:string;title:string;role:QuestionDatasetRole;
  position:number;visible:boolean;opacity:number;
};

async function editableVersion(actor:TeacherSession,questionId:string){
  const [row]=await query<{id:string;school_id:string|null;owner_teacher_id:string|null;scope:string}>(
    `select qv.id,q.school_id,q.owner_teacher_id,q.scope
     from questions q join question_versions qv on qv.question_id=q.id and qv.status='DRAFT'
     where q.id=$1 and q.status='ACTIVE' order by qv.version_number desc limit 1`,
    [questionId],
  );
  if(!row) throw new Error("Draft QuestionVersion not found");
  if(row.scope==="SYSTEM"&&actor.role!=="SYSTEM_ADMIN") throw new AuthorizationError();
  if(row.scope==="SCHOOL"&&row.school_id!==actor.schoolId) throw new AuthorizationError();
  if(row.scope==="PRIVATE"&&row.owner_teacher_id!==actor.staffUserId) throw new AuthorizationError();
  return row.id;
}

async function resolveVersions(actor:TeacherSession,bindings:Array<{datasetId:string;role:QuestionDatasetRole}>){
  const clean=bindings.filter((b)=>b.datasetId).filter((b,index,array)=>array.findIndex((x)=>x.datasetId===b.datasetId)===index);
  if(!clean.length)return [];
  const rows=await query<{datasetId:string;datasetVersionId:string}>(
    `select d.id as "datasetId",dv.id as "datasetVersionId"
     from datasets d join lateral (
       select id from dataset_versions x where x.dataset_id=d.id and x.status='PUBLISHED'
       order by x.version_number desc limit 1
     ) dv on true
     where d.id=any($1::uuid[]) and d.status='ACTIVE' and (
       d.scope='SYSTEM' or (d.scope='SCHOOL' and d.school_id=$2) or (d.scope='PRIVATE' and d.owner_teacher_id=$3)
     )`,
    [clean.map((b)=>b.datasetId),actor.schoolId,actor.staffUserId],
  );
  const map=new Map(rows.map((row)=>[row.datasetId,row.datasetVersionId]));
  if(clean.some((binding)=>!map.has(binding.datasetId))) throw new AuthorizationError();
  return clean.map((binding)=>({datasetVersionId:map.get(binding.datasetId) as string,role:binding.role}));
}

export async function replaceQuestionDraftDatasetBindings(
  actor:TeacherSession,
  questionId:string,
  bindings:Array<{datasetId:string;role:QuestionDatasetRole}>,
):Promise<void>{
  const questionVersionId=await editableVersion(actor,questionId);
  const resolved=await resolveVersions(actor,bindings);
  const client=await database().connect();
  try{
    await client.query("begin");
    await client.query("delete from question_version_dataset_layers where question_version_id=$1",[questionVersionId]);
    let position=1;
    for(const binding of resolved){
      await client.query(
        `insert into question_version_dataset_layers(question_version_id,dataset_version_id,role,position)
         values($1,$2,$3,$4)`,
        [questionVersionId,binding.datasetVersionId,binding.role,position++],
      );
    }
    await client.query("commit");
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function listQuestionDatasetBindings(
  actor:TeacherSession,
  questionId:string,
):Promise<QuestionDatasetBinding[]>{
  const [question]=await query<{school_id:string|null;owner_teacher_id:string|null;scope:string}>(
    "select school_id,owner_teacher_id,scope from questions where id=$1 and status='ACTIVE'",[questionId],
  );
  if(!question) throw new Error("Question not found");
  if(question.scope==="SCHOOL"&&question.school_id!==actor.schoolId) throw new AuthorizationError();
  if(question.scope==="PRIVATE"&&question.owner_teacher_id!==actor.staffUserId) throw new AuthorizationError();
  return query<QuestionDatasetBinding>(
    `select qdl.id,d.id as "datasetId",dv.id as "datasetVersionId",d.title,qdl.role,qdl.position,qdl.visible,
       qdl.opacity::float8 as opacity
     from question_versions qv
     join question_version_dataset_layers qdl on qdl.question_version_id=qv.id
     join dataset_versions dv on dv.id=qdl.dataset_version_id
     join datasets d on d.id=dv.dataset_id
     where qv.question_id=$1
     order by case qv.status when 'DRAFT' then 0 else 1 end,qv.version_number desc,qdl.position`,
    [questionId],
  );
}

export async function copyQuestionDatasetBindings(sourceVersionId:string,targetVersionId:string):Promise<void>{
  await query(
    `insert into question_version_dataset_layers(question_version_id,dataset_version_id,role,position,visible,opacity,style_json,alias)
     select $2,dataset_version_id,role,position,visible,opacity,style_json,alias
     from question_version_dataset_layers where question_version_id=$1`,
    [sourceVersionId,targetVersionId],
  );
}
