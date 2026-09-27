import {AuthorizationError} from "@/server/auth/authorization";
import type {TeacherSession} from "@/server/auth/session";
import {query} from "@/server/db";
import {mediaDeliveryUrl} from "@/server/media/storage";

export type ExactQuestionPreview={id:string;title:string;versionId:string;versionNumber:number;versionStatus:"DRAFT"|"PUBLISHED";spatialMode:string;prompt:string;stimulusType:"text"|"image"|"video"|"webgis";activityConfig:Record<string,unknown>;responseConfig:{type?:string;answers?:Array<{id:string;label:string}>};media:{id:string;title:string;source:string|null;altText:string|null;caption:string|null}|null;bindings:Array<{datasetId:string;role:"SOURCE"|"TARGET"|"CONTEXT";label?:{enabled:boolean;field:string|null;minZoom:number}}>};

export async function getExactQuestionPreview(actor:TeacherSession,questionId:string,versionId:string):Promise<ExactQuestionPreview|null>{
  const [row]=await query<Omit<ExactQuestionPreview,"media"|"bindings">&{storageKey:string|null;mediaId:string|null;mediaTitle:string|null;altText:string|null;caption:string|null;bindings:ExactQuestionPreview["bindings"]}>(
    `select q.id,q.title,qv.id as "versionId",qv.version_number as "versionNumber",qv.status as "versionStatus",qv.spatial_mode as "spatialMode",qv.prompt,
       qv.stimulus_config->>'type' as "stimulusType",qv.activity_config as "activityConfig",qv.response_config as "responseConfig",
       media.id as "mediaId",media.title as "mediaTitle",media.storage_key as "storageKey",media.alt_text as "altText",media.caption,
       coalesce(layers.bindings,'[]'::jsonb) as bindings
     from questions q join question_versions qv on qv.question_id=q.id and qv.id=$2
     left join lateral (select ma.id,ma.title,ma.storage_key,qma.alt_text,qma.caption from question_version_media_assets qma join media_assets ma on ma.id=qma.media_asset_id and ma.status='ACTIVE' where qma.question_version_id=qv.id and qma.role='STIMULUS' order by qma.position limit 1) media on true
     left join lateral (select jsonb_agg(jsonb_build_object('datasetId',dv.dataset_id,'role',qdl.role,'label',qdl.style_json->'label') order by qdl.position) bindings from question_version_dataset_layers qdl join dataset_versions dv on dv.id=qdl.dataset_version_id where qdl.question_version_id=qv.id) layers on true
     where q.id=$1 and q.status='ACTIVE' and ((q.scope='SYSTEM' and $5='SYSTEM_ADMIN') or (q.scope='SCHOOL' and q.school_id=$3) or (q.scope='PRIVATE' and q.owner_teacher_id=$4))`,
    [questionId,versionId,actor.schoolId,actor.staffUserId,actor.role],
  );
  if(!row)return null;
  return {...row,media:row.mediaId?{id:row.mediaId,title:row.mediaTitle??"Media",source:mediaDeliveryUrl(row.mediaId,row.storageKey),altText:row.altText,caption:row.caption}:null};
}

export async function assertExactQuestionPreview(actor:TeacherSession,questionId:string,versionId:string){const preview=await getExactQuestionPreview(actor,questionId,versionId);if(!preview)throw new AuthorizationError();return preview;}
