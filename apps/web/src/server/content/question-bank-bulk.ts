import "server-only";

import type {TeacherSession} from "@/server/auth/session";
import {archivePublishedQuestion,deleteDraftQuestion,listQuestionBankPage,restoreArchivedQuestion,type QuestionBankFilter} from "./question-bank";

export type QuestionBulkAction="delete"|"archive"|"restore";
export type QuestionBulkResult={requested:number;completed:number;failed:number;errors:Array<{questionId:string;message:string}>};

const MAX_BULK_ITEMS=500;

function cleanIds(ids:unknown):string[]{
  if(!Array.isArray(ids))return [];
  return Array.from(new Set(ids.filter((id):id is string=>typeof id==="string"&&/^[0-9a-f-]{36}$/i.test(id)))).slice(0,MAX_BULK_ITEMS);
}

export function normalizeQuestionBulkFilter(value:unknown):QuestionBankFilter{
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  const source=value as Record<string,unknown>;
  const text=(key:string)=>typeof source[key]==="string"?String(source[key]).slice(0,160):undefined;
  return {
    search:text("q")??text("search"),stimulus:text("stimulus"),mode:text("mode"),response:text("response"),difficulty:text("difficulty"),
    status:text("versionStatus")??text("status"),scope:text("scope"),lifecycle:text("lifecycle"),groupId:text("groupId"),
  };
}

async function collectFilteredIds(actor:TeacherSession,filter:QuestionBankFilter):Promise<string[]>{
  const first=await listQuestionBankPage(actor,{...filter,page:1});
  if(first.total>MAX_BULK_ITEMS)throw new Error(`Bulk action maksimal ${MAX_BULK_ITEMS} soal. Persempit filter terlebih dahulu.`);
  const ids=first.items.map(item=>item.id);
  for(let page=2;page<=first.pageCount;page++){
    const next=await listQuestionBankPage(actor,{...filter,page});
    ids.push(...next.items.map(item=>item.id));
  }
  return Array.from(new Set(ids));
}

export async function runQuestionBulkAction(input:{actor:TeacherSession;action:QuestionBulkAction;ids?:unknown;selectAllFiltered?:boolean;filter?:unknown}):Promise<QuestionBulkResult>{
  const filter=normalizeQuestionBulkFilter(input.filter);
  const ids=input.selectAllFiltered?await collectFilteredIds(input.actor,filter):cleanIds(input.ids);
  if(!ids.length)throw new Error("Pilih minimal satu soal.");
  if(ids.length>MAX_BULK_ITEMS)throw new Error(`Bulk action maksimal ${MAX_BULK_ITEMS} soal.`);

  const errors:QuestionBulkResult["errors"]=[];
  let completed=0;
  for(const questionId of ids){
    try{
      if(input.action==="delete")await deleteDraftQuestion(input.actor,questionId);
      else if(input.action==="archive")await archivePublishedQuestion(input.actor,questionId);
      else await restoreArchivedQuestion(input.actor,questionId);
      completed++;
    }catch(error){
      errors.push({questionId,message:error instanceof Error?error.message:"Operasi gagal."});
    }
  }
  return {requested:ids.length,completed,failed:errors.length,errors};
}
