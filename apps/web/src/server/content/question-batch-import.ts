import "server-only";

import {gisToolIds,spatialThinkingModes,type GisToolId,type SpatialThinkingMode} from "@/features/questions/types";
import {mapExperienceIds,type MapExperience} from "@/features/questions/experience";
import type {TeacherSession} from "@/server/auth/session";
import {AuthorizationError} from "@/server/auth/authorization";
import {createQuestionDraft,type ContentScope} from "./service";

const answerIds=["A","B","C","D","E"] as const;
const stimulusTypes=["text","image","video","webgis"] as const;
const scopes=["PRIVATE","SCHOOL","SYSTEM"] as const;
const MAX_ITEMS=100;

type AnswerId=(typeof answerIds)[number];
type DraftInput=Parameters<typeof createQuestionDraft>[0];
export type BatchImportError={index:number;title:string;errors:string[]};
export type BatchImportResult={total:number;created:number;failed:number;questionIds:string[];errors:BatchImportError[]};

function object(value:unknown):Record<string,unknown>|null{return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;}
function text(value:unknown,field:string,errors:string[],options:{required?:boolean;max?:number}={}){
  if(value===undefined||value===null||value===""){if(options.required)errors.push(`${field} wajib diisi.`);return "";}
  if(typeof value!=="string"){errors.push(`${field} harus berupa teks.`);return "";}
  const result=value.trim();
  if(options.required&&!result)errors.push(`${field} wajib diisi.`);
  if(options.max&&result.length>options.max)errors.push(`${field} maksimal ${options.max} karakter.`);
  return result;
}
function enumeration<T extends readonly string[]>(value:unknown,field:string,values:T,errors:string[],fallback:T[number]):T[number]{
  if(typeof value!=="string"||!values.includes(value)){errors.push(`${field} harus salah satu dari: ${values.join(", ")}.`);return fallback;}
  return value as T[number];
}

export function parseQuestionBatchDocument(value:unknown,actor:TeacherSession):{items:Array<{index:number;input:DraftInput}>;errors:BatchImportError[];total:number}{
  const root=object(value);
  if(!root)throw new Error("Dokumen impor harus berupa objek JSON.");
  if(root.version!==1)throw new Error("version harus bernilai 1.");
  if(!Array.isArray(root.questions))throw new Error("questions harus berupa array.");
  if(root.questions.length<1||root.questions.length>MAX_ITEMS)throw new Error(`questions harus berisi 1–${MAX_ITEMS} soal.`);
  const defaultScope=root.scope===undefined?"PRIVATE":root.scope;
  const items:Array<{index:number;input:DraftInput}>=[];const failures:BatchImportError[]=[];
  root.questions.forEach((raw,index)=>{
    const errors:string[]=[];const item=object(raw);
    if(!item){failures.push({index,title:`Soal ${index+1}`,errors:["Item harus berupa objek."]});return;}
    const title=text(item.title,"title",errors,{required:true,max:220});
    const scope=enumeration(item.scope??defaultScope,"scope",scopes,errors,"PRIVATE") as ContentScope;
    const spatialMode=enumeration(item.spatialMode,"spatialMode",spatialThinkingModes,errors,"location") as SpatialThinkingMode;
    const stimulusType=enumeration(item.stimulusType??"text","stimulusType",stimulusTypes,errors,"text");
    const prompt=text(item.prompt,"prompt",errors,{required:true,max:10000});
    const answersRaw=Array.isArray(item.answers)?item.answers:null;
    const answers=answerIds.map((id,answerIndex)=>{
      const answer=answersRaw?.[answerIndex];
      if(!object(answer)||answer.id!==id){errors.push(`answers[${answerIndex}] harus memiliki id ${id}.`);return {id,label:""};}
      return {id,label:text(answer.label,`answers[${answerIndex}].label`,errors,{required:true,max:1000})};
    });
    if(!answersRaw||answersRaw.length!==5)errors.push("answers harus berisi tepat lima jawaban A–E.");
    const correctAnswer=enumeration(item.correctAnswer,"correctAnswer",answerIds,errors,"A") as AnswerId;
    const mapExperience=item.mapExperience===undefined?"standard":enumeration(item.mapExperience,"mapExperience",mapExperienceIds,errors,"standard") as MapExperience;
    const toolsRaw=item.gisTools??[];const tools:GisToolId[]=[];
    if(!Array.isArray(toolsRaw))errors.push("gisTools harus berupa array.");
    else for(const [toolIndex,tool] of toolsRaw.entries()){
      if(typeof tool!=="string"||!(gisToolIds as readonly string[]).includes(tool))errors.push(`gisTools[${toolIndex}] tidak didukung.`);
      else if(!tools.includes(tool as GisToolId))tools.push(tool as GisToolId);
    }
    const toolParameters=item.toolParameters===undefined?{}:object(item.toolParameters);
    if(!toolParameters)errors.push("toolParameters harus berupa objek.");
    const buffer=object(toolParameters?.buffer);
    if(buffer&&("distanceMeters" in buffer)){
      const distance=buffer.distanceMeters;
      if(typeof distance!=="number"||!Number.isFinite(distance)||distance<=0||distance>100000)errors.push("toolParameters.buffer.distanceMeters harus lebih dari 0 dan maksimal 100000.");
    }
    const subject=text(item.subject,"subject",errors,{max:120});const topic=text(item.topic,"topic",errors,{max:160});
    const difficulty=text(item.difficulty,"difficulty",errors,{max:60});
    const feedbackCorrect=text(item.explanation??item.feedbackCorrect,"explanation",errors,{max:10000});
    const feedbackIncorrect=text(item.feedbackIncorrect,"feedbackIncorrect",errors,{max:10000});
    if(errors.length){failures.push({index,title:title||`Soal ${index+1}`,errors});return;}
    items.push({index,input:{actor,title,scope,subject,topic,spatialMode,difficulty,prompt,stimulusType,answers,correctAnswer,
      feedbackCorrect,feedbackIncorrect,
      activityConfig:{mapExperience,tools,toolParameters:toolParameters??{},requiredActions:[]},
    }});
  });
  return {items,errors:failures,total:root.questions.length};
}

/** Each item uses createQuestionDraft's own Question + QuestionVersion transaction. */
export async function importQuestionBatch(actor:TeacherSession,document:unknown):Promise<BatchImportResult>{
  const parsed=parseQuestionBatchDocument(document,actor);const questionIds:string[]=[];const errors=[...parsed.errors];
  for(const item of parsed.items){
    try{questionIds.push(await createQuestionDraft(item.input));}
    catch(error){errors.push({index:item.index,title:item.input.title,errors:[error instanceof AuthorizationError?"Akun tidak memiliki izin untuk scope soal ini.":"Draft gagal dibuat karena kesalahan penyimpanan."]});}
  }
  errors.sort((a,b)=>a.index-b.index);
  return {total:parsed.total,created:questionIds.length,failed:errors.length,questionIds,errors};
}
