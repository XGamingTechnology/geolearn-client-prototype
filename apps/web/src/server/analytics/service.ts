import { query } from "@/server/db";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";
import { listClasses } from "@/server/classes/service";

export const spatialModes=[
  "location","condition","influence","region","hierarchy","analogy","pattern","association",
] as const;
export type SpatialMode=typeof spatialModes[number];

export type AssignmentAnalytics={
  assignmentId:string;title:string;className:string;
  enrolledCount:number;attemptedCount:number;submittedCount:number;
  completionRate:number;averageScore:number|null;averageDurationSeconds:number|null;
  gisRequiredCount:number;gisCompletedCount:number;gisCompletionRate:number|null;
};
export type QuestionAnalytics={
  questionVersionId:string;title:string;spatialMode:SpatialMode;
  responseCount:number;correctCount:number;accuracy:number|null;averageDurationSeconds:number|null;
};
export type StudentSkillProfile={
  studentId:string;studentName:string;loginId:string;
  modes:Array<{mode:SpatialMode;score:number;answeredCount:number;correctCount:number}>;
};

async function allowedClassIds(session:TeacherSession){
  if(!session.schoolId) throw new AuthorizationError();
  const classes=await listClasses(session);
  return classes.map((item)=>item.id);
}

export async function recomputeSpatialSkillScores(session:TeacherSession):Promise<number>{
  if(!session.schoolId) throw new AuthorizationError();
  const classIds=await allowedClassIds(session);
  if(!classIds.length)return 0;

  await query(
    `delete from spatial_skill_scores sss
     using enrollments e
     where sss.student_id=e.student_id
       and sss.school_id=$1
       and e.class_id=any($2::uuid[])`,
    [session.schoolId,classIds],
  );

  const rows=await query<{count:number}>(
    `with scored as (
       select at.student_id,a.school_id,qv.spatial_mode,
              count(r.id)::int as answered_count,
              count(r.id) filter(where r.is_correct=true)::int as correct_count,
              count(distinct at.id)::int as attempt_count,
              case when sum(qsw.weight) filter(where r.id is not null)>0
                   then 100.0*sum(case when r.is_correct=true then qsw.weight else 0 end)
                        /sum(qsw.weight) filter(where r.id is not null)
                   else 0 end as score
       from attempts at
       join assignments a on a.id=at.assignment_id
       join quiz_items qi on qi.quiz_version_id=at.quiz_version_id
       join question_versions qv on qv.id=qi.question_version_id
       join question_skill_weights qsw on qsw.question_version_id=qv.id and qsw.spatial_mode=qv.spatial_mode
       left join responses r on r.attempt_id=at.id and r.quiz_item_id=qi.id
       where a.school_id=$1 and a.class_id=any($2::uuid[]) and at.status='SUBMITTED'
       group by at.student_id,a.school_id,qv.spatial_mode
     ), inserted as (
       insert into spatial_skill_scores(student_id,school_id,spatial_mode,score,answered_count,correct_count,source_attempt_count,computed_at)
       select student_id,school_id,spatial_mode,score,answered_count,correct_count,attempt_count,now()
       from scored
       returning 1
     )
     select count(*)::int as count from inserted`,
    [session.schoolId,classIds],
  );
  return rows[0]?.count??0;
}

export async function getAssignmentAnalytics(session:TeacherSession):Promise<AssignmentAnalytics[]>{
  const classIds=await allowedClassIds(session);
  if(!classIds.length)return [];
  return query<AssignmentAnalytics>(
    `with base as (
       select a.id,a.title,c.name as class_name,
              count(distinct e.student_id) filter(where e.status='ACTIVE')::int as enrolled_count,
              count(distinct at.student_id)::int as attempted_count,
              count(distinct at.student_id) filter(where at.status='SUBMITTED')::int as submitted_count,
              avg(case when at.status='SUBMITTED' and at.score_max>0 then 100.0*at.score_raw/at.score_max end)::float8 as avg_score,
              avg(case when at.status='SUBMITTED' then extract(epoch from (at.submitted_at-at.started_at)) end)::float8 as avg_duration
       from assignments a
       join classes c on c.id=a.class_id
       left join enrollments e on e.class_id=a.class_id
       left join attempts at on at.assignment_id=a.id
       where a.class_id=any($1::uuid[]) and a.status<>'ARCHIVED'
       group by a.id,c.name
     ), gis as (
       select a.id,
              count(*) filter(where jsonb_array_length(coalesce(qv.activity_config->'requiredActions','[]'::jsonb))>0)::int as required_questions,
              count(*) filter(where jsonb_array_length(coalesce(qv.activity_config->'requiredActions','[]'::jsonb))>0
                and exists(select 1 from gis_activities ga where ga.attempt_id=at.id and ga.question_version_id=qv.id))::int as completed_questions
       from assignments a
       join attempts at on at.assignment_id=a.id and at.status='SUBMITTED'
       join quiz_items qi on qi.quiz_version_id=at.quiz_version_id
       join question_versions qv on qv.id=qi.question_version_id
       where a.class_id=any($1::uuid[])
       group by a.id
     )
     select b.id as "assignmentId",b.title,b.class_name as "className",
       b.enrolled_count as "enrolledCount",b.attempted_count as "attemptedCount",b.submitted_count as "submittedCount",
       case when b.enrolled_count>0 then 100.0*b.submitted_count/b.enrolled_count else 0 end::float8 as "completionRate",
       b.avg_score as "averageScore",b.avg_duration as "averageDurationSeconds",
       coalesce(g.required_questions,0) as "gisRequiredCount",coalesce(g.completed_questions,0) as "gisCompletedCount",
       case when coalesce(g.required_questions,0)>0 then 100.0*g.completed_questions/g.required_questions else null end::float8 as "gisCompletionRate"
     from base b left join gis g on g.id=b.id order by b.title`,
    [classIds],
  );
}

export async function getQuestionAnalytics(session:TeacherSession):Promise<QuestionAnalytics[]>{
  const classIds=await allowedClassIds(session);
  if(!classIds.length)return [];
  return query<QuestionAnalytics>(
    `select qv.id as "questionVersionId",q.title,qv.spatial_mode as "spatialMode",
       count(r.id)::int as "responseCount",
       count(r.id) filter(where r.is_correct=true)::int as "correctCount",
       case when count(r.id)>0 then 100.0*count(r.id) filter(where r.is_correct=true)/count(r.id) else null end::float8 as accuracy,
       avg(r.duration_ms)::float8/1000.0 as "averageDurationSeconds"
     from assignments a
     join attempts at on at.assignment_id=a.id and at.status='SUBMITTED'
     join responses r on r.attempt_id=at.id
     join question_versions qv on qv.id=r.question_version_id
     join questions q on q.id=qv.question_id
     where a.class_id=any($1::uuid[])
     group by qv.id,q.title,qv.spatial_mode
     order by qv.spatial_mode,q.title`,
    [classIds],
  );
}

export async function getStudentSkillProfiles(session:TeacherSession):Promise<StudentSkillProfile[]>{
  if(!session.schoolId) throw new AuthorizationError();
  await recomputeSpatialSkillScores(session);
  const classIds=await allowedClassIds(session);
  if(!classIds.length)return [];
  const rows=await query<{
    studentId:string;studentName:string;studentSortName:string;loginId:string;mode:SpatialMode;score:number;answeredCount:number;correctCount:number;
  }>(
    `select distinct s.id as "studentId",s.full_name as "studentName",lower(s.full_name) as "studentSortName",sc.login_id as "loginId",
       sss.spatial_mode as mode,sss.score::float8 as score,sss.answered_count as "answeredCount",sss.correct_count as "correctCount"
     from spatial_skill_scores sss
     join students s on s.id=sss.student_id and s.school_id=sss.school_id
     join student_credentials sc on sc.student_id=s.id
     join enrollments e on e.student_id=s.id and e.class_id=any($2::uuid[])
     where sss.school_id=$1
     order by "studentSortName",mode`,
    [session.schoolId,classIds],
  );
  const grouped=new Map<string,StudentSkillProfile>();
  for(const row of rows){
    const current=grouped.get(row.studentId)??{studentId:row.studentId,studentName:row.studentName,loginId:row.loginId,modes:[]};
    current.modes.push({mode:row.mode,score:row.score,answeredCount:row.answeredCount,correctCount:row.correctCount});
    grouped.set(row.studentId,current);
  }
  return [...grouped.values()];
}
