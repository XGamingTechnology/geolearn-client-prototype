import { database, query } from "@/server/db";
import { hasStaffPermission } from "@/server/auth/permissions";
import { AuthorizationError } from "@/server/auth/authorization";
import type { TeacherSession } from "@/server/auth/session";
import type { SpatialThinkingMode } from "@/features/questions/types";

export type QuestionBankFilter={
  search?:string;
  stimulus?:string;
  mode?:string;
  response?:string;
  difficulty?:string;
  status?:string;
  scope?:string;
  lifecycle?:string;
  groupId?:string;
  page?:number;
};

export type QuestionBankRow={
  id:string;
  title:string;
  subject:string|null;
  topic:string|null;
  scope:"SYSTEM"|"SCHOOL"|"PRIVATE";
  questionStatus:"ACTIVE"|"ARCHIVED";
  ownerTeacherId:string|null;
  versionId:string|null;
  versionNumber:number|null;
  spatialMode:SpatialThinkingMode|null;
  difficulty:string|null;
  prompt:string|null;
  versionStatus:"DRAFT"|"PUBLISHED"|null;
  stimulusType:string|null;
  responseType:string|null;
  hasPublished:boolean;
  groupId:string|null;
  groupTitle:string|null;
  groupStimulusType:string|null;
};

export type QuestionBankPage={
  items:QuestionBankRow[];
  total:number;
  page:number;
  pageSize:number;
  pageCount:number;
};

const PAGE_SIZE=20;
const stimulusValues=new Set(["text","image","video","webgis"]);
const responseValues=new Set(["multiple-choice","draw-point","draw-line","draw-polygon","feature-select"]);
const modeValues=new Set(["location","condition","influence","region","hierarchy","analogy","pattern","association"]);
const difficultyValues=new Set(["Mudah","Sedang","Sulit"]);
const statusValues=new Set(["DRAFT","PUBLISHED"]);
const scopeValues=new Set(["SYSTEM","SCHOOL","PRIVATE"]);
const lifecycleValues=new Set(["ACTIVE","ARCHIVED"]);

function clean(value:string|undefined,max=120){return (value??"").trim().slice(0,max);}

export async function listQuestionBankPage(session:TeacherSession,filter:QuestionBankFilter={}):Promise<QuestionBankPage>{
  if(!session.schoolId&&session.role!=="SYSTEM_ADMIN")throw new AuthorizationError();

  const requestedPage=Number.isFinite(filter.page)?Math.max(1,Math.floor(filter.page??1)):1;
  const lifecycle=filter.lifecycle&&lifecycleValues.has(filter.lifecycle)?filter.lifecycle:"ACTIVE";
  const versionStatus=filter.status&&statusValues.has(filter.status)?filter.status:"";
  const values:Array<string|number|null>=[session.schoolId,session.staffUserId];
  const conditions=[
    `q.status='${lifecycle}'`,
    `(q.scope='SYSTEM' or (q.scope='SCHOOL' and q.school_id=$1) or (q.scope='PRIVATE' and q.owner_teacher_id=$2))`,
  ];
  let versionStatusClause="";
  if(versionStatus){
    values.push(versionStatus);
    versionStatusClause=`and x.status=$${values.length}`;
  }
  const add=(sql:(placeholder:string)=>string,value:string|number)=>{
    values.push(value);
    conditions.push(sql(`$${values.length}`));
  };

  const search=clean(filter.search,160);
  if(search)add((p)=>`(q.title ilike ${p} or coalesce(q.subject,'') ilike ${p} or coalesce(q.topic,'') ilike ${p} or coalesce(qv.prompt,'') ilike ${p} or coalesce(g.title,'') ilike ${p} or coalesce(g.description,'') ilike ${p})`,`%${search}%`);
  if(filter.stimulus&&stimulusValues.has(filter.stimulus))add((p)=>`lower(coalesce(qv.stimulus_config->>'type',''))=lower(${p})`,filter.stimulus);
  if(filter.mode&&modeValues.has(filter.mode))add((p)=>`lower(coalesce(qv.spatial_mode::text,''))=lower(${p})`,filter.mode);
  if(filter.response&&responseValues.has(filter.response))add((p)=>`lower(coalesce(qv.response_config->>'type',''))=lower(${p})`,filter.response);
  if(filter.difficulty&&difficultyValues.has(filter.difficulty))add((p)=>`lower(coalesce(qv.difficulty,''))=lower(${p})`,filter.difficulty);
  if(filter.scope&&scopeValues.has(filter.scope))add((p)=>`q.scope=${p}`,filter.scope);
  const groupId=clean(filter.groupId,60);
  if(groupId)add((p)=>`q.question_group_id=${p}::uuid`,groupId);

  const versionOrder=versionStatus?"x.version_number desc":"case x.status when 'DRAFT' then 0 else 1 end,x.version_number desc";
  const fromSql=`
    from questions q
    left join question_groups g on g.id=q.question_group_id
    left join lateral (
      select * from question_versions x
      where x.question_id=q.id ${versionStatusClause}
      order by ${versionOrder}
      limit 1
    ) qv on true
    where ${conditions.join(" and ")}
      ${versionStatus?"and qv.id is not null":""}`;

  const client=await database().connect();
  try{
    const countResult=await client.query<{total:number}>(`select count(*)::int as total ${fromSql}`,values);
    const total=countResult.rows[0]?.total??0;
    const pageCount=Math.max(1,Math.ceil(total/PAGE_SIZE));
    const page=Math.min(requestedPage,pageCount);
    const listValues=[...values,PAGE_SIZE,(page-1)*PAGE_SIZE];
    const limitPlaceholder=`$${values.length+1}`;
    const offsetPlaceholder=`$${values.length+2}`;
    const listResult=await client.query<QuestionBankRow>(
      `select q.id,q.title,q.subject,q.topic,q.scope,q.status as "questionStatus",q.owner_teacher_id as "ownerTeacherId",
        qv.id as "versionId",qv.version_number as "versionNumber",qv.spatial_mode as "spatialMode",
        qv.difficulty,qv.prompt,qv.status as "versionStatus",
        qv.stimulus_config->>'type' as "stimulusType",
        qv.response_config->>'type' as "responseType",
        exists(select 1 from question_versions published where published.question_id=q.id and published.status='PUBLISHED') as "hasPublished",
        g.id as "groupId",g.title as "groupTitle",g.stimulus_type as "groupStimulusType"
       ${fromSql}
       order by coalesce(lower(g.title),''),q.updated_at desc,q.id
       limit ${limitPlaceholder} offset ${offsetPlaceholder}`,
      listValues,
    );
    return {items:listResult.rows,total,page,pageSize:PAGE_SIZE,pageCount};
  }finally{client.release();}
}

async function assertManageQuestion(session:TeacherSession,questionId:string,expectedStatus:"ACTIVE"|"ARCHIVED"){
  const [row]=await query<{id:string;schoolId:string|null;ownerTeacherId:string|null;scope:"SYSTEM"|"SCHOOL"|"PRIVATE";status:"ACTIVE"|"ARCHIVED"}>(
    `select id,school_id as "schoolId",owner_teacher_id as "ownerTeacherId",scope,status from questions where id=$1`,
    [questionId],
  );
  if(!row||row.status!==expectedStatus)throw new Error(expectedStatus==="ACTIVE"?"Question aktif tidak tersedia.":"Question arsip tidak tersedia.");
  if(row.scope==="SYSTEM"){
    if(session.role!=="SYSTEM_ADMIN")throw new AuthorizationError();
  }else if(row.scope==="SCHOOL"){
    if(row.schoolId!==session.schoolId)throw new AuthorizationError();
    const allowed=session.role==="SYSTEM_ADMIN"||session.role==="SCHOOL_ADMIN"||await hasStaffPermission(session,"CONTENT_MANAGE_SCHOOL");
    if(!allowed)throw new AuthorizationError();
  }else if(row.ownerTeacherId!==session.staffUserId)throw new AuthorizationError();
  return row;
}

export async function deleteDraftQuestion(session:TeacherSession,questionId:string){
  await assertManageQuestion(session,questionId,"ACTIVE");
  const [state]=await query<{publishedCount:number;draftCount:number}>(
    `select count(*) filter(where status='PUBLISHED')::int as "publishedCount",
            count(*) filter(where status='DRAFT')::int as "draftCount"
     from question_versions where question_id=$1`,
    [questionId],
  );
  if((state?.publishedCount??0)>0)throw new Error("Soal yang sudah pernah dipublish tidak boleh dihapus. Gunakan Archive.");
  if((state?.draftCount??0)===0)throw new Error("Draft tidak ditemukan.");
  await query("delete from questions where id=$1",[questionId]);
}

export async function archivePublishedQuestion(session:TeacherSession,questionId:string){
  await assertManageQuestion(session,questionId,"ACTIVE");
  const [state]=await query<{publishedCount:number}>(
    `select count(*) filter(where status='PUBLISHED')::int as "publishedCount" from question_versions where question_id=$1`,
    [questionId],
  );
  if((state?.publishedCount??0)===0)throw new Error("Draft yang belum dipublish sebaiknya dihapus, bukan diarsipkan.");
  await query("update questions set status='ARCHIVED',updated_at=now() where id=$1 and status='ACTIVE'",[questionId]);
}

export async function restoreArchivedQuestion(session:TeacherSession,questionId:string){
  await assertManageQuestion(session,questionId,"ARCHIVED");
  const [state]=await query<{publishedCount:number}>(
    `select count(*) filter(where status='PUBLISHED')::int as "publishedCount" from question_versions where question_id=$1`,
    [questionId],
  );
  if((state?.publishedCount??0)===0)throw new Error("Arsip tidak mempunyai QuestionVersion published yang dapat dipulihkan.");
  await query("update questions set status='ACTIVE',updated_at=now() where id=$1 and status='ARCHIVED'",[questionId]);
}
