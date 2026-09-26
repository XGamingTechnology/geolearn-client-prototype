import {query} from "@/server/db";
import type {TeacherSession} from "@/server/auth/session";
import {AuthorizationError} from "@/server/auth/authorization";
import type {QuestionDatasetSelection} from "@/server/content/question-datasets";

type DatasetKind="VECTOR"|"RASTER"|"TABLE";

function configuredTools(activityConfig:Record<string,unknown>){
  const tools=Array.isArray(activityConfig.tools)?activityConfig.tools.filter((item):item is string=>typeof item==="string"):[];
  const required=Array.isArray(activityConfig.requiredActions)?activityConfig.requiredActions.map((item)=>item&&typeof item==="object"&&typeof (item as {tool?:unknown}).tool==="string"?(item as {tool:string}).tool:null).filter((item):item is string=>Boolean(item)):[];
  return Array.from(new Set([...tools,...required])).filter((item)=>["buffer","overlay","distance"].includes(item));
}

export async function assertQuestionDatasetCompatibility(input:{
  actor:TeacherSession;
  bindings:QuestionDatasetSelection[];
  activityConfig:Record<string,unknown>;
  responseType:string;
}){
  if(!input.bindings.length)return;
  const ids=Array.from(new Set(input.bindings.map((binding)=>binding.datasetId)));
  const rows=await query<{id:string;dataKind:DatasetKind}>(
    `select d.id,d.data_kind as "dataKind" from datasets d
     where d.id=any($1::uuid[]) and d.status='ACTIVE' and (
       d.scope='SYSTEM' or (d.scope='SCHOOL' and d.school_id=$2) or (d.scope='PRIVATE' and d.owner_teacher_id=$3)
     )`,
    [ids,input.actor.schoolId,input.actor.staffUserId],
  );
  if(rows.length!==ids.length)throw new AuthorizationError();
  const kind=new Map(rows.map((row)=>[row.id,row.dataKind]));
  const source=input.bindings.find((binding)=>binding.role==="SOURCE");
  const target=input.bindings.find((binding)=>binding.role==="TARGET");
  const tools=configuredTools(input.activityConfig);

  if(tools.length&&source&&kind.get(source.datasetId)!=="VECTOR"){
    throw new Error("Buffer, Overlay, dan Distance membutuhkan layer Utama (SOURCE) berupa vector.");
  }
  if(tools.some((tool)=>tool==="overlay"||tool==="distance")&&target&&kind.get(target.datasetId)!=="VECTOR"){
    throw new Error("Overlay dan Distance membutuhkan layer Pembanding (TARGET) berupa vector.");
  }
  if(input.responseType==="feature-select"&&!input.bindings.some((binding)=>kind.get(binding.datasetId)==="VECTOR")){
    throw new Error("Jawaban Pilih Feature membutuhkan minimal satu dataset vector.");
  }
}
