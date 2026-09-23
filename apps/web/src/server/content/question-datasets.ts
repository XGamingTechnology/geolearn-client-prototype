import { database, query } from "@/server/db";
import type { TeacherSession } from "@/server/auth/session";
import { AuthorizationError } from "@/server/auth/authorization";

export type QuestionDatasetRole="SOURCE"|"TARGET"|"CONTEXT";
export type QuestionLayerLabel={enabled:boolean;field?:string|null;minZoom?:number};
export type QuestionDatasetSelection={datasetId:string;role:QuestionDatasetRole;label?:QuestionLayerLabel};
export type QuestionDatasetBinding={
  id:string;datasetId:string;datasetVersionId:string;title:string;role:QuestionDatasetRole;
  position:number;visible:boolean;opacity:number;style:Record<string,unknown>;
};
export type QuestionDatasetOption={id:string;title:string;geometryType:string|null;fields:string[]};
type Bbox=[number,number,number,number];
type ResolvedQuestionDataset={
  datasetId:string;datasetVersionId:string;title:string;role:QuestionDatasetRole;style:Record<string,unknown>;bbox:Bbox|null;
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

function normalizedLabel(label:QuestionLayerLabel|undefined,schema:Record<string,unknown>){
  if(!label)return null;
  const enabled=label.enabled===true;
  const field=typeof label.field==="string"?label.field.trim():"";
  const rawMinZoom=Number(label.minZoom??11);
  const minZoom=Number.isFinite(rawMinZoom)?Math.min(22,Math.max(0,Math.round(rawMinZoom))):11;
  if(enabled){
    if(!field)throw new Error("Label field wajib dipilih saat label diaktifkan.");
    if(!Object.prototype.hasOwnProperty.call(schema,field))throw new Error("Label field tidak ditemukan pada schema DatasetVersion.");
  }
  return {enabled,field:enabled?field:null,minZoom};
}

async function resolveVersions(actor:TeacherSession,bindings:QuestionDatasetSelection[]):Promise<ResolvedQuestionDataset[]>{
  const clean=bindings.filter((b)=>b.datasetId).filter((b,index,array)=>array.findIndex((x)=>x.datasetId===b.datasetId)===index);
  if(!clean.length)return [];
  const rows=await query<{datasetId:string;datasetVersionId:string;title:string;schemaJson:Record<string,unknown>|null;bbox:Bbox|null}>(
    `select d.id as "datasetId",d.title,dv.id as "datasetVersionId",dv.schema_json as "schemaJson",
       case when jsonb_typeof(dv.bbox)='array' then array[
         (dv.bbox->>0)::float8,(dv.bbox->>1)::float8,(dv.bbox->>2)::float8,(dv.bbox->>3)::float8
       ] else null end as bbox
     from datasets d join lateral (
       select id,schema_json,bbox from dataset_versions x where x.dataset_id=d.id and x.status='PUBLISHED'
       order by x.version_number desc limit 1
     ) dv on true
     where d.id=any($1::uuid[]) and d.status='ACTIVE' and (
       d.scope='SYSTEM' or (d.scope='SCHOOL' and d.school_id=$2) or (d.scope='PRIVATE' and d.owner_teacher_id=$3)
     )`,
    [clean.map((b)=>b.datasetId),actor.schoolId,actor.staffUserId],
  );
  const map=new Map(rows.map((row)=>[row.datasetId,row]));
  if(clean.some((binding)=>!map.has(binding.datasetId))) throw new AuthorizationError();
  return clean.map((binding)=>{
    const version=map.get(binding.datasetId)!;
    const label=normalizedLabel(binding.label,version.schemaJson??{});
    return {
      datasetId:binding.datasetId,
      datasetVersionId:version.datasetVersionId,
      title:version.title,
      bbox:version.bbox,
      role:binding.role,
      style:label?{label}:{},
    };
  });
}

async function previewFeatureCollection(datasetVersionId:string){
  const [row]=await query<{geojson:unknown}>(
    `select jsonb_build_object('type','FeatureCollection','features',
       coalesce(jsonb_agg(jsonb_build_object(
         'type','Feature','id',coalesce(source_feature_id,id::text),
         'geometry',ST_AsGeoJSON(geom)::jsonb,'properties',properties
       ) order by source_feature_id),'[]'::jsonb)) as geojson
     from dataset_features where dataset_version_id=$1`,
    [datasetVersionId],
  );
  return row?.geojson??{type:"FeatureCollection",features:[]};
}

export async function getQuestionDatasetPreviewPayload(actor:TeacherSession,bindings:QuestionDatasetSelection[]){
  const resolved=await resolveVersions(actor,bindings);
  const layers=[];
  for(const [index,layer] of resolved.entries()){
    layers.push({
      datasetVersionId:layer.datasetVersionId,
      title:layer.title,
      role:layer.role,
      position:index+1,
      visible:true,
      opacity:1,
      bbox:layer.bbox,
      style:layer.style,
      geojson:await previewFeatureCollection(layer.datasetVersionId),
    });
  }
  const boxes=resolved.map((layer)=>layer.bbox).filter((bbox):bbox is Bbox=>Array.isArray(bbox)&&bbox.length===4);
  const bbox=boxes.length?[Math.min(...boxes.map((x)=>x[0])),Math.min(...boxes.map((x)=>x[1])),Math.max(...boxes.map((x)=>x[2])),Math.max(...boxes.map((x)=>x[3]))]:null;
  return {layers,bbox};
}

export async function listQuestionDatasetOptions(actor:TeacherSession):Promise<QuestionDatasetOption[]>{
  const rows=await query<{id:string;title:string;geometryType:string|null;schemaJson:Record<string,unknown>|null}>(
    `select d.id,d.title,dv.geometry_type as "geometryType",dv.schema_json as "schemaJson"
     from datasets d join lateral (
       select geometry_type,schema_json from dataset_versions x
       where x.dataset_id=d.id and x.status='PUBLISHED' order by x.version_number desc limit 1
     ) dv on true
     where d.status='ACTIVE' and d.data_kind='VECTOR' and (
       d.scope='SYSTEM' or (d.scope='SCHOOL' and d.school_id=$1) or (d.scope='PRIVATE' and d.owner_teacher_id=$2)
     )
     order by d.updated_at desc`,
    [actor.schoolId,actor.staffUserId],
  );
  return rows.map((row)=>({
    id:row.id,
    title:row.title,
    geometryType:row.geometryType,
    fields:Object.keys(row.schemaJson??{}).sort((a,b)=>a.localeCompare(b,"id",{sensitivity:"base"})),
  }));
}

export async function replaceQuestionDraftDatasetBindings(
  actor:TeacherSession,
  questionId:string,
  bindings:QuestionDatasetSelection[],
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
        `insert into question_version_dataset_layers(question_version_id,dataset_version_id,role,position,style_json)
         values($1,$2,$3,$4,$5::jsonb)`,
        [questionVersionId,binding.datasetVersionId,binding.role,position++,JSON.stringify(binding.style)],
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
       qdl.opacity::float8 as opacity,coalesce(qdl.style_json,'{}'::jsonb) as style
     from questions q
     join lateral (
       select id from question_versions x where x.question_id=q.id
       order by case x.status when 'DRAFT' then 0 else 1 end,x.version_number desc limit 1
     ) qv on true
     join question_version_dataset_layers qdl on qdl.question_version_id=qv.id
     join dataset_versions dv on dv.id=qdl.dataset_version_id
     join datasets d on d.id=dv.dataset_id
     where q.id=$1
     order by qdl.position`,
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
