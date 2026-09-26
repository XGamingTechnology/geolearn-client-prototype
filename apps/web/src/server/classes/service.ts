import { randomInt } from "node:crypto";
import { database, query } from "@/server/db";
import { hashPin } from "@/server/auth/password";
import { getStaffPermissions } from "@/server/auth/permissions";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError, assertTeacherSchool } from "@/server/auth/authorization";

export type ClassRecord = {
  id:string; schoolId:string; teacherId:string; teacherName:string; name:string;
  gradeLevel:string|null; academicYear:string|null; semester:string|null;
  classCode:string; status:"ACTIVE"|"DISABLED"|"ARCHIVED"; studentCount:number;
};

export type EnrolledStudent = {
  enrollmentId:string; studentId:string; loginId:string; fullName:string;
  studentStatus:"ACTIVE"|"DISABLED"|"ARCHIVED";
  credentialStatus:"ACTIVE"|"DISABLED";
  lastLoginAt:Date|null;
};

async function canManageAllClasses(session:TeacherSession):Promise<boolean>{
  if(session.role==="SYSTEM_ADMIN"||session.role==="SCHOOL_ADMIN") return true;
  return (await getStaffPermissions(session.staffUserId)).includes("CLASS_MANAGE_ALL");
}

export async function assertClassAccess(session:TeacherSession,classId:string):Promise<ClassRecord>{
  const [record]=await query<ClassRecord>(
    `select c.id,c.school_id as "schoolId",c.teacher_id as "teacherId",
       coalesce(tp.display_name,su.email) as "teacherName",c.name,c.grade_level as "gradeLevel",
       c.academic_year as "academicYear",c.semester,c.class_code as "classCode",c.status,
       count(e.id) filter (where e.status='ACTIVE')::int as "studentCount"
     from classes c
     join staff_users su on su.id=c.teacher_id
     left join teacher_profiles tp on tp.staff_user_id=su.id
     left join enrollments e on e.class_id=c.id
     where c.id=$1
     group by c.id,tp.display_name,su.email`,
    [classId],
  );
  if(!record) throw new Error("Class not found");
  assertTeacherSchool(session,record.schoolId);
  if(record.teacherId!==session.staffUserId && !(await canManageAllClasses(session))) throw new AuthorizationError();
  return record;
}

export async function listClasses(session:TeacherSession):Promise<ClassRecord[]>{
  if(!session.schoolId && session.role!=="SYSTEM_ADMIN") throw new AuthorizationError();
  const all=await canManageAllClasses(session);
  return query<ClassRecord>(
    `select c.id,c.school_id as "schoolId",c.teacher_id as "teacherId",
       coalesce(tp.display_name,su.email) as "teacherName",c.name,c.grade_level as "gradeLevel",
       c.academic_year as "academicYear",c.semester,c.class_code as "classCode",c.status,
       count(e.id) filter (where e.status='ACTIVE')::int as "studentCount"
     from classes c
     join staff_users su on su.id=c.teacher_id
     left join teacher_profiles tp on tp.staff_user_id=su.id
     left join enrollments e on e.class_id=c.id
     where c.school_id=$1 and ($2::boolean or c.teacher_id=$3)
     group by c.id,tp.display_name,su.email
     order by c.status='ACTIVE' desc,c.created_at desc`,
    [session.schoolId,all,session.staffUserId],
  );
}

function normalizeSegment(value:string):string{
  return value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,5)||"CLS";
}
function randomCode(length=4):string{
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length},()=>alphabet[randomInt(0,alphabet.length)]).join("");
}

async function generateClassCode(gradeLevel:string|null,name:string):Promise<string>{
  const prefix=normalizeSegment(gradeLevel||name);
  for(let i=0;i<12;i++){
    const code=`GL-${prefix}-${randomCode(4)}`;
    const [exists]=await query<{exists:boolean}>("select exists(select 1 from classes where lower(class_code)=lower($1)) as exists",[code]);
    if(!exists?.exists) return code;
  }
  throw new Error("Unable to generate unique class code");
}

export async function createClass(input:{actor:TeacherSession;name:string;gradeLevel:string;academicYear:string;semester:string;}):Promise<string>{
  if(!input.actor.schoolId) throw new AuthorizationError();
  const name=input.name.trim();
  if(!name||name.length>160) throw new Error("Invalid class name");
  const classCode=await generateClassCode(input.gradeLevel.trim()||null,name);
  const [row]=await query<{id:string}>(
    `insert into classes(school_id,teacher_id,name,grade_level,academic_year,semester,class_code,status)
     values($1,$2,$3,$4,$5,$6,$7,'ACTIVE') returning id`,
    [input.actor.schoolId,input.actor.staffUserId,name,input.gradeLevel.trim()||null,input.academicYear.trim()||null,input.semester.trim()||null,classCode],
  );
  if(!row) throw new Error("Class creation failed");
  return row.id;
}

export async function updateClass(input:{actor:TeacherSession;classId:string;name:string;gradeLevel:string;academicYear:string;semester:string;status:string;}):Promise<void>{
  const record=await assertClassAccess(input.actor,input.classId);
  if(!["ACTIVE","DISABLED","ARCHIVED"].includes(input.status)) throw new Error("Invalid class status");
  const name=input.name.trim();
  if(!name) throw new Error("Class name required");
  await query(
    `update classes set name=$2,grade_level=$3,academic_year=$4,semester=$5,status=$6,updated_at=now()
     where id=$1 and school_id=$7`,
    [input.classId,name,input.gradeLevel.trim()||null,input.academicYear.trim()||null,input.semester.trim()||null,input.status,record.schoolId],
  );
}

export async function listEnrolledStudents(session:TeacherSession,classId:string):Promise<EnrolledStudent[]>{
  await assertClassAccess(session,classId);
  return query<EnrolledStudent>(
    `select e.id as "enrollmentId",s.id as "studentId",cred.login_id as "loginId",s.full_name as "fullName",
       s.status as "studentStatus",cred.status as "credentialStatus",cred.last_login_at as "lastLoginAt"
     from enrollments e
     join students s on s.id=e.student_id and s.school_id=e.school_id
     join student_credentials cred on cred.student_id=s.id and cred.school_id=e.school_id
     where e.class_id=$1 and e.status='ACTIVE'
     order by lower(s.full_name)`,
    [classId],
  );
}

async function generateStudentId(schoolId:string,gradeLevel:string|null):Promise<string>{
  const prefix=normalizeSegment(gradeLevel||"S");
  const [row]=await query<{count:number}>("select count(*)::int as count from students where school_id=$1",[schoolId]);
  let next=(row?.count??0)+1;
  for(let i=0;i<50;i++,next++){
    const loginId=`GL-${prefix}-${String(next).padStart(3,"0")}`;
    const [exists]=await query<{exists:boolean}>(
      "select exists(select 1 from student_credentials where school_id=$1 and lower(login_id)=lower($2)) as exists",
      [schoolId,loginId],
    );
    if(!exists?.exists) return loginId;
  }
  throw new Error("Unable to generate student ID");
}

function generatePin():string{
  return String(randomInt(100000,1000000));
}

export async function addStudentToClass(input:{actor:TeacherSession;classId:string;fullName:string;requestedLoginId?:string|null;}):Promise<{studentId:string;loginId:string;initialPin:string}>{
  const klass=await assertClassAccess(input.actor,input.classId);
  const fullName=input.fullName.trim();
  if(!fullName||fullName.length>180) throw new Error("Invalid student name");
  const loginId=input.requestedLoginId?.trim()||await generateStudentId(klass.schoolId,klass.gradeLevel);
  if(loginId.length>128) throw new Error("Student ID too long");
  const pin=generatePin();
  const pinHash=await hashPin(pin);
  const client=await database().connect();
  try{
    await client.query("begin");
    const created=await client.query<{id:string}>(
      `insert into students(school_id,student_number,full_name,status)
       values($1,$2,$3,'ACTIVE') returning id`,
      [klass.schoolId,loginId,fullName],
    );
    const studentId=created.rows[0]?.id;
    if(!studentId) throw new Error("Student creation failed");
    await client.query(
      `insert into student_credentials(student_id,school_id,login_id,pin_hash,status,must_change_pin)
       values($1,$2,$3,$4,'ACTIVE',false)`,
      [studentId,klass.schoolId,loginId,pinHash],
    );
    await client.query(
      `insert into enrollments(school_id,class_id,student_id,status)
       values($1,$2,$3,'ACTIVE')`,
      [klass.schoolId,input.classId,studentId],
    );
    await client.query(
      `insert into account_admin_events(school_id,actor_staff_user_id,target_type,target_id,action,details_json)
       values($1,$2,'STUDENT',$3,'CREATE',$4::jsonb)`,
      [klass.schoolId,input.actor.staffUserId,studentId,JSON.stringify({classId:input.classId,loginId})],
    );
    await client.query("commit");
    return {studentId,loginId,initialPin:pin};
  }catch(error){
    await client.query("rollback");
    throw error;
  }finally{
    client.release();
  }
}

export async function resetStudentPinForClass(input:{actor:TeacherSession;classId:string;studentId:string;}):Promise<string>{
  const klass=await assertClassAccess(input.actor,input.classId);
  const [member]=await query<{student_id:string}>(
    "select student_id from enrollments where class_id=$1 and student_id=$2 and status='ACTIVE'",
    [input.classId,input.studentId],
  );
  if(!member) throw new Error("Student is not actively enrolled in this class");
  const pin=generatePin();
  const pinHash=await hashPin(pin);
  await query(
    `update student_credentials set pin_hash=$3,credential_version=credential_version+1,
      last_reset_at=now(),status='ACTIVE',updated_at=now() where student_id=$1 and school_id=$2`,
    [input.studentId,klass.schoolId,pinHash],
  );
  await query("update auth_sessions set revoked_at=coalesce(revoked_at,now()) where student_id=$1",[input.studentId]);
  await query(
    `insert into account_admin_events(school_id,actor_staff_user_id,target_type,target_id,action,details_json)
     values($1,$2,'STUDENT',$3,'RESET_PIN',$4::jsonb)`,
    [klass.schoolId,input.actor.staffUserId,input.studentId,JSON.stringify({classId:input.classId})],
  );
  return pin;
}

export async function setStudentCredentialStatus(input:{actor:TeacherSession;classId:string;studentId:string;enabled:boolean;}):Promise<void>{
  const klass=await assertClassAccess(input.actor,input.classId);
  const [member]=await query<{student_id:string}>(
    "select student_id from enrollments where class_id=$1 and student_id=$2 and status='ACTIVE'",
    [input.classId,input.studentId],
  );
  if(!member) throw new Error("Student is not actively enrolled in this class");
  await query(
    `update student_credentials set status=$3,credential_version=credential_version+1,updated_at=now()
     where student_id=$1 and school_id=$2`,
    [input.studentId,klass.schoolId,input.enabled?"ACTIVE":"DISABLED"],
  );
  await query("update auth_sessions set revoked_at=coalesce(revoked_at,now()) where student_id=$1",[input.studentId]);
  await query(
    `insert into account_admin_events(school_id,actor_staff_user_id,target_type,target_id,action,details_json)
     values($1,$2,'STUDENT',$3,$4,$5::jsonb)`,
    [klass.schoolId,input.actor.staffUserId,input.studentId,input.enabled?"ENABLE":"DISABLE",JSON.stringify({classId:input.classId})],
  );
}

export async function archiveEnrollment(input:{actor:TeacherSession;classId:string;studentId:string;}):Promise<void>{
  await assertClassAccess(input.actor,input.classId);
  await query(
    `update enrollments set status='INACTIVE',left_at=now(),updated_at=now()
     where class_id=$1 and student_id=$2 and status='ACTIVE'`,
    [input.classId,input.studentId],
  );
}
