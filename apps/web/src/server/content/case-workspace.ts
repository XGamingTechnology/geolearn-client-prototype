import { query } from "@/server/db";
import { hasStaffPermission } from "@/server/auth/permissions";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";

type Scope="SYSTEM"|"SCHOOL"|"PRIVATE";

export type CaseWorkspaceRecord={
  id:string; title:string; description:string|null; scope:Scope; schoolId:string|null; ownerTeacherId:string|null;
  versionId:string; versionNumber:number; versionStatus:"DRAFT"|"PUBLISHED"; narrative:string|null;
};

export type CaseLayerRecord={
  id:string; datasetId:string; datasetVersionId:string; title:string; role:"CONTEXT"|"SOURCE"|"TARGET";
  position:number; visible:boolean; opacity:number; geometryType:string|null; featureCount:number|null; geojson:unknown;
};

async function canManageSchoolContent(session:TeacherSession){
  if(session.role==="SYSTEM_ADMIN"||session.role==="SCHOOL_ADMIN") return true;
  return hasStaffPermission(session,"CONTENT_MANAGE_SCHOOL");
}

export async function getCaseWorkspace(session:TeacherSession,caseId:string):Promise<CaseWorkspaceRecord|null>{
  const [row]=await query<CaseWorkspaceRecord>(
    `select c.id,c.title,c.description,c.scope,c.school_id as "schoolId",c.owner_teacher_id as "ownerTeacherId",
       cv.id as "versionId",cv.version_number as "versionNumber",cv.status as "versionStatus",cv.narrative
     from cases c join lateral (
       select * from case_versions x where x.case_id=c.id
       order by case x.status when 'DRAFT' then 0 else 1 end,x.version_number desc limit 1
     ) cv on true
     where c.id=$1 and c.status='ACTIVE' and (
       c.scope='SYSTEM' or (c.scope='SCHOOL' and c.school_id=$2) or (c.scope='PRIVATE' and c.owner_teacher_id=$3)
     )`,
    [caseId,session.schoolId,session.staffUserId],
  );
  return row??null;
}

async function requireEditableCase(session:TeacherSession,caseId:string){
  const item=await getCaseWorkspace(session,caseId);
  if(!item) throw new AuthorizationError();
  if(item.scope==="SYSTEM" && session.role!=="SYSTEM_ADMIN") throw new AuthorizationError();
  if(item.scope==="SCHOOL" && (item.schoolId!==session.schoolId || !(await canManageSchoolContent(session)))) throw new AuthorizationError();
  if(item.scope==="PRIVATE" && item.ownerTeacherId!==session.staffUserId) throw new AuthorizationError();
  if(item.versionStatus!=="DRAFT") throw new Error("Published CaseVersion is immutable");
  return item;
}

export async function listCaseLayers(session:TeacherSession,caseId:string):Promise<CaseLayerRecord[]>{
  const item=await getCaseWorkspace(session,caseId);
  if(!item) throw new AuthorizationError();
  return query<CaseLayerRecord>(
    `select cvdl.id,d.id as "datasetId",dv.id as "datasetVersionId",coalesce(cvdl.alias,d.title) as title,
       cvdl.role,cvdl.position,cvdl.visible,cvdl.opacity::float8 as opacity,
       dv.geometry_type as "geometryType",dv.feature_count as "featureCount",
       jsonb_build_object('type','FeatureCollection','features',coalesce((
         select jsonb_agg(jsonb_build_object(
           'type','Feature','id',coalesce(df.source_feature_id,df.id::text),
           'geometry',ST_AsGeoJSON(df.geom)::jsonb,'properties',df.properties
         ) order by df.source_feature_id)
         from dataset_features df where df.dataset_version_id=dv.id
       ),'[]'::jsonb)) as geojson
     from case_version_dataset_layers cvdl
     join dataset_versions dv on dv.id=cvdl.dataset_version_id and dv.status='PUBLISHED'
     join datasets d on d.id=dv.dataset_id and d.status='ACTIVE'
     where cvdl.case_version_id=$1
     order by cvdl.position`,
    [item.versionId],
  );
}

export async function listCaseBindableDatasets(session:TeacherSession,caseId:string){
  const item=await getCaseWorkspace(session,caseId);
  if(!item) throw new AuthorizationError();
  return query<{id:string;title:string;scope:Scope;versionId:string;geometryType:string|null;featureCount:number|null}>(
    `select d.id,d.title,d.scope,dv.id as "versionId",dv.geometry_type as "geometryType",dv.feature_count as "featureCount"
     from datasets d
     join lateral (
       select * from dataset_versions x where x.dataset_id=d.id and x.status='PUBLISHED'
       order by x.version_number desc limit 1
     ) dv on true
     where d.status='ACTIVE' and (
       d.scope='SYSTEM' or (d.scope='SCHOOL' and d.school_id=$1) or (d.scope='PRIVATE' and d.owner_teacher_id=$2)
     ) and (
       ($3='SYSTEM' and d.scope='SYSTEM')
       or ($3='SCHOOL' and d.scope in ('SYSTEM','SCHOOL'))
       or ($3='PRIVATE')
     )
     order by d.updated_at desc`,
    [session.schoolId,session.staffUserId,item.scope],
  );
}

export async function updateCaseNarrative(session:TeacherSession,caseId:string,narrative:string){
  const item=await requireEditableCase(session,caseId);
  await query("update case_versions set narrative=$2 where id=$1",[item.versionId,narrative.trim()||null]);
}

export async function addDatasetToCase(session:TeacherSession,caseId:string,datasetId:string,role:string){
  const item=await requireEditableCase(session,caseId);
  if(!["CONTEXT","SOURCE","TARGET"].includes(role)) throw new Error("Invalid layer role");
  const [dataset]=await query<{versionId:string;scope:Scope;schoolId:string|null;ownerTeacherId:string|null}>(
    `select dv.id as "versionId",d.scope,d.school_id as "schoolId",d.owner_teacher_id as "ownerTeacherId"
     from datasets d join lateral (
       select * from dataset_versions x where x.dataset_id=d.id and x.status='PUBLISHED'
       order by x.version_number desc limit 1
     ) dv on true where d.id=$1 and d.status='ACTIVE'`,[datasetId],
  );
  if(!dataset) throw new Error("Published dataset required");
  const accessible=dataset.scope==="SYSTEM"
    ||(dataset.scope==="SCHOOL"&&dataset.schoolId===session.schoolId)
    ||(dataset.scope==="PRIVATE"&&dataset.ownerTeacherId===session.staffUserId);
  if(!accessible) throw new AuthorizationError();
  if(item.scope==="SYSTEM"&&dataset.scope!=="SYSTEM") throw new Error("SYSTEM Case only supports SYSTEM datasets");
  if(item.scope==="SCHOOL"&&dataset.scope==="PRIVATE") throw new Error("SCHOOL Case cannot depend on PRIVATE datasets");
  const [pos]=await query<{next:number}>("select coalesce(max(position),0)+1 as next from case_version_dataset_layers where case_version_id=$1",[item.versionId]);
  await query(
    `insert into case_version_dataset_layers(case_version_id,dataset_version_id,role,position)
     values($1,$2,$3,$4) on conflict(case_version_id,dataset_version_id) do nothing`,
    [item.versionId,dataset.versionId,role,pos?.next??1],
  );
}

export async function removeCaseLayer(session:TeacherSession,caseId:string,layerId:string){
  const item=await requireEditableCase(session,caseId);
  await query("delete from case_version_dataset_layers where id=$1 and case_version_id=$2",[layerId,item.versionId]);
}
