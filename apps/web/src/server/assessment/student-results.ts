import {query} from "@/server/db";
import type {StudentSession} from "@/server/auth/session";

export type StudentVisibleResult={
  attemptId:string;
  assignmentTitle:string;
  quizTitle:string;
  submittedAt:Date|null;
  resultVisibility:string;
  closesAt:Date|null;
  scoreRaw:number|null;
  scoreMax:number|null;
  scoreVisible:boolean;
};

function visibleNow(resultVisibility:string,closesAt:Date|null,now:Date){
  if(resultVisibility==="HIDDEN")return false;
  if(resultVisibility==="AFTER_CLOSE")return Boolean(closesAt&&closesAt.getTime()<=now.getTime());
  return resultVisibility==="AFTER_SUBMIT";
}

export async function listStudentVisibleResults(session:StudentSession):Promise<StudentVisibleResult[]>{
  const rows=await query<Omit<StudentVisibleResult,"scoreVisible">>(
    `select at.id as "attemptId",a.title as "assignmentTitle",q.title as "quizTitle",
       at.submitted_at as "submittedAt",a.result_visibility as "resultVisibility",a.closes_at as "closesAt",
       at.score_raw::float8 as "scoreRaw",at.score_max::float8 as "scoreMax"
     from attempts at
     join assignments a on a.id=at.assignment_id
     join quiz_versions qv on qv.id=at.quiz_version_id
     join quizzes q on q.id=qv.quiz_id
     where at.student_id=$1 and at.enrollment_id=$2 and at.school_id=$3 and at.status='SUBMITTED'
     order by at.submitted_at desc`,
    [session.studentId,session.enrollmentId,session.schoolId],
  );
  const now=new Date();
  return rows.map(row=>({...row,scoreVisible:visibleNow(row.resultVisibility,row.closesAt,now)}));
}

export async function getStudentVisibleResult(session:StudentSession,attemptId:string):Promise<StudentVisibleResult|null>{
  const rows=await listStudentVisibleResults(session);
  return rows.find(row=>row.attemptId===attemptId)??null;
}
