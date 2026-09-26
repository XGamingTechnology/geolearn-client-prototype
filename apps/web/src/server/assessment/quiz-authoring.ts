import { database,query } from "@/server/db";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";

export type QuizQuestionOption={
  questionId:string;
  questionVersionId:string;
  title:string;
  versionNumber:number;
  spatialMode:string;
  stimulusType:string|null;
  responseType:string|null;
  difficulty:string|null;
  groupId:string|null;
  groupTitle:string|null;
  groupDescription:string|null;
  groupTopic:string|null;
  groupSubject:string|null;
};

export async function listQuizQuestionOptions(session:TeacherSession):Promise<QuizQuestionOption[]>{
  if(!session.schoolId&&session.role!=="SYSTEM_ADMIN")throw new AuthorizationError();
  return query<QuizQuestionOption>(
    `select q.id as "questionId",pv.id as "questionVersionId",q.title,pv.version_number as "versionNumber",
       pv.spatial_mode as "spatialMode",pv.stimulus_config->>'type' as "stimulusType",
       pv.response_config->>'type' as "responseType",pv.difficulty,
       g.id as "groupId",g.title as "groupTitle",g.description as "groupDescription",
       g.topic as "groupTopic",g.subject as "groupSubject"
     from questions q
     join lateral (
       select * from question_versions x
       where x.question_id=q.id and x.status='PUBLISHED'
       order by x.version_number desc
       limit 1
     ) pv on true
     left join question_groups g on g.id=q.question_group_id
     where q.status='ACTIVE' and (
       q.scope='SYSTEM'
       or (q.scope='SCHOOL' and q.school_id=$1)
       or (q.scope='PRIVATE' and q.owner_teacher_id=$2)
     )
     order by coalesce(lower(g.title),'zzzzzz'),lower(q.title),pv.version_number desc`,
    [session.schoolId,session.staffUserId],
  );
}

export async function createPublishedQuizFromSelection(input:{
  actor:TeacherSession;
  title:string;
  description:string;
  questionVersionIds:string[];
}):Promise<{quizId:string;quizVersionId:string}>{
  if(!input.actor.schoolId)throw new AuthorizationError();
  const title=input.title.trim();
  const ids=[...new Set(input.questionVersionIds.filter(Boolean))];
  if(!title||title.length>220||ids.length<1||ids.length>100)throw new Error("Quiz membutuhkan judul dan 1-100 QuestionVersion.");

  const allowed=await listQuizQuestionOptions(input.actor);
  const allowedIds=new Set(allowed.map((item)=>item.questionVersionId));
  if(ids.some((id)=>!allowedIds.has(id)))throw new AuthorizationError();

  const client=await database().connect();
  try{
    await client.query("begin");
    const quiz=await client.query<{id:string}>(
      `insert into quizzes(school_id,owner_teacher_id,scope,title,description,status)
       values($1,$2,'PRIVATE',$3,$4,'ACTIVE') returning id`,
      [input.actor.schoolId,input.actor.staffUserId,title,input.description.trim()||null],
    );
    const quizId=quiz.rows[0]?.id;
    if(!quizId)throw new Error("Quiz creation failed");
    const version=await client.query<{id:string}>(
      `insert into quiz_versions(quiz_id,version_number,status,created_by,published_at)
       values($1,1,'PUBLISHED',$2,now()) returning id`,
      [quizId,input.actor.staffUserId],
    );
    const quizVersionId=version.rows[0]?.id;
    if(!quizVersionId)throw new Error("QuizVersion creation failed");
    for(let index=0;index<ids.length;index++){
      await client.query(
        `insert into quiz_items(quiz_version_id,question_version_id,position,points)
         values($1,$2,$3,1)`,
        [quizVersionId,ids[index],index+1],
      );
    }
    await client.query("commit");
    return {quizId,quizVersionId};
  }catch(error){
    await client.query("rollback");
    throw error;
  }finally{
    client.release();
  }
}
