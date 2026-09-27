import {AuthorizationError} from "@/server/auth/authorization";
import type {TeacherSession} from "@/server/auth/session";
import {query} from "@/server/db";
import {executeConfiguredGisTool,type BoundLayer,type GisExecutionContext} from "@/server/assessment/gis";

async function previewContext(actor:TeacherSession,questionId:string,versionId?:string):Promise<GisExecutionContext>{
  const [question]=await query<{id:string;activityConfig:Record<string,unknown>}>(
    `select qv.id,qv.activity_config as "activityConfig"
     from questions q join question_versions qv on qv.question_id=q.id and (($5::uuid is not null and qv.id=$5::uuid) or ($5::uuid is null and qv.status='DRAFT'))
     where q.id=$1 and q.status='ACTIVE'
       and ((q.scope='SYSTEM' and $4='SYSTEM_ADMIN')
         or (q.scope='SCHOOL' and q.school_id=$2)
         or (q.scope='PRIVATE' and q.owner_teacher_id=$3))
     order by qv.version_number desc limit 1`,
    [questionId,actor.schoolId,actor.staffUserId,actor.role,versionId??null],
  );
  if(!question)throw new AuthorizationError();
  const layers=await query<BoundLayer>(
    `select qdl.dataset_version_id as "datasetVersionId",d.title,d.data_kind as "dataKind",dv.format,
       dv.storage_key as "storageKey",coalesce(dv.default_style_json,'{}'::jsonb) as "defaultStyle",
       coalesce(dv.schema_json,'{}'::jsonb) as "schemaJson",qdl.role,qdl.position,qdl.visible,
       qdl.opacity::float8 as opacity,coalesce(qdl.style_json,'{}'::jsonb) as style,
       case when jsonb_typeof(dv.bbox)='array' then array[(dv.bbox->>0)::float8,(dv.bbox->>1)::float8,(dv.bbox->>2)::float8,(dv.bbox->>3)::float8] else null end as bbox
     from question_version_dataset_layers qdl
     join dataset_versions dv on dv.id=qdl.dataset_version_id and dv.status='PUBLISHED'
     join datasets d on d.id=dv.dataset_id and d.status='ACTIVE'
     where qdl.question_version_id=$1 order by qdl.position`,
    [question.id],
  );
  return {activityConfig:question.activityConfig??{},layers};
}

/** Read-only teacher sandbox: deliberately has no Attempt/GIS Activity persistence dependency. */
export async function executeQuestionPreviewGis(actor:TeacherSession,questionId:string,toolId:string,versionId?:string){
  return executeConfiguredGisTool(await previewContext(actor,questionId,versionId),toolId);
}
