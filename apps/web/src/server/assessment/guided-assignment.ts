import {database} from "@/server/db";
import type {TeacherSession} from "@/server/auth/session";
import {AuthorizationError} from "@/server/auth/authorization";
import {assertClassAccess} from "@/server/classes/service";
import {parseAssignmentTimestamp} from "@/server/assessment/service";
import {listQuizQuestionOptions} from "@/server/assessment/quiz-authoring";

export async function createGuidedAssignment(input:{
  actor:TeacherSession;
  title:string;
  instructions:string;
  classId:string;
  questionVersionIds:string[];
  opensAt:string;
  closesAt:string;
  attemptLimit:number;
  resultVisibility:string;
}):Promise<{assignmentId:string;quizVersionId:string}> {
  if(!input.actor.schoolId)throw new AuthorizationError();

  const title=input.title.trim();
  if(!title||title.length>220)throw new Error("Judul penugasan wajib diisi.");

  const ids=[...new Set(input.questionVersionIds.filter(Boolean))];
  if(ids.length<1||ids.length>100)throw new Error("Pilih 1-100 soal.");

  const [klass,allowedQuestions]=await Promise.all([
    assertClassAccess(input.actor,input.classId),
    listQuizQuestionOptions(input.actor),
  ]);
  const allowedIds=new Set(allowedQuestions.map((item)=>item.questionVersionId));
  if(ids.some((id)=>!allowedIds.has(id)))throw new AuthorizationError();

  const opensAt=parseAssignmentTimestamp(input.opensAt,"opens_at");
  const closesAt=parseAssignmentTimestamp(input.closesAt,"closes_at");
  if(opensAt&&closesAt&&closesAt<=opensAt)throw new Error("Waktu tutup harus setelah waktu buka.");

  const attemptLimit=Math.min(Math.max(Math.trunc(input.attemptLimit)||1,1),10);
  const resultVisibility=["AFTER_SUBMIT","AFTER_CLOSE","HIDDEN"].includes(input.resultVisibility)
    ?input.resultVisibility
    :"AFTER_SUBMIT";
  const instructions=input.instructions.trim();

  const client=await database().connect();
  try{
    await client.query("begin");

    const quiz=await client.query<{id:string}>(
      `insert into quizzes(school_id,owner_teacher_id,scope,title,description,status)
       values($1,$2,'PRIVATE',$3,$4,'ACTIVE') returning id`,
      [input.actor.schoolId,input.actor.staffUserId,title,instructions||null],
    );
    const quizId=quiz.rows[0]?.id;
    if(!quizId)throw new Error("Quiz internal gagal dibuat.");

    const version=await client.query<{id:string}>(
      `insert into quiz_versions(quiz_id,version_number,status,created_by,published_at)
       values($1,1,'PUBLISHED',$2,now()) returning id`,
      [quizId,input.actor.staffUserId],
    );
    const quizVersionId=version.rows[0]?.id;
    if(!quizVersionId)throw new Error("QuizVersion gagal dibuat.");

    for(let index=0;index<ids.length;index++){
      await client.query(
        `insert into quiz_items(quiz_version_id,question_version_id,position,points)
         values($1,$2,$3,1)`,
        [quizVersionId,ids[index],index+1],
      );
    }

    const assignment=await client.query<{id:string}>(
      `insert into assignments(school_id,class_id,teacher_id,quiz_version_id,title,instructions,opens_at,closes_at,
         attempt_limit,result_visibility,status)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVE') returning id`,
      [klass.schoolId,input.classId,input.actor.staffUserId,quizVersionId,title,instructions||null,opensAt,closesAt,attemptLimit,resultVisibility],
    );
    const assignmentId=assignment.rows[0]?.id;
    if(!assignmentId)throw new Error("Assignment gagal dibuat.");

    await client.query("commit");
    return {assignmentId,quizVersionId};
  }catch(error){
    await client.query("rollback");
    throw error;
  }finally{
    client.release();
  }
}
