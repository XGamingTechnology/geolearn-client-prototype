import "server-only";

import {gisToolIds,spatialThinkingModes,type GisToolId,type SpatialThinkingMode} from "@/features/questions/types";
import {mapExperienceIds,type MapExperience} from "@/features/questions/experience";
import type {TeacherSession} from "@/server/auth/session";
import {AuthorizationError} from "@/server/auth/authorization";
import {createQuestionDraft,type ContentScope} from "./service";
import {attachQuestionToGroup,createQuestionGroup} from "./question-groups";

const answerIds=["A","B","C","D","E"] as const;
const stimulusTypes=["text","image","video","webgis"] as const;
const scopes=["PRIVATE","SCHOOL","SYSTEM"] as const;
const MAX_ITEMS=100;
const MAX_GROUPS=100;

type AnswerId=(typeof answerIds)[number];
type StimulusType=(typeof stimulusTypes)[number];
type DraftInput=Parameters<typeof createQuestionDraft>[0];
type GroupDefinition={key:string;title:string;description:string;subject:string;topic:string;scope:ContentScope;spatialMode:SpatialThinkingMode|null;stimulusType:StimulusType|null};
type ParsedItem={index:number;input:DraftInput;groupKey:string};
export type BatchImportError={index:number;title:string;errors:string[]};
export type BatchImportResult={total:number;created:number;failed:number;groupsCreated:number;questionIds:string[];groupIds:string[];errors:BatchImportError[]};

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
function parseGroups(root:Record<string,unknown>,version:number,defaultScope:unknown):GroupDefinition[]{
  if(version===1)return [];
  const field=version===2?"stimulusSets":"questionGroups";
  const raw=root[field]??[];
  if(!Array.isArray(raw))throw new Error(`${field} harus berupa array.`);
  if(raw.length>MAX_GROUPS)throw new Error(`${field} maksimal ${MAX_GROUPS} kelompok.`);
  const definitions:GroupDefinition[]=[];const keys=new Set<string>();const errors:string[]=[];
  raw.forEach((entry,index)=>{
    const item=object(entry);if(!item){errors.push(`${field}[${index}] harus berupa objek.`);return;}
    const itemErrors:string[]=[];
    const key=text(item.key,`${field}[${index}].key`,itemErrors,{required:true,max:80});
    if(key&&!/^[a-z0-9][a-z0-9-_]*$/i.test(key))itemErrors.push(`${field}[${index}].key hanya boleh huruf, angka, - dan _.`);
    if(key&&keys.has(key))itemErrors.push(`${field}[${index}].key duplikat: ${key}.`);
    const title=text(item.title,`${field}[${index}].title`,itemErrors,{required:true,max:220});
    const description=text(item.description,`${field}[${index}].description`,itemErrors,{max:10000});
    const subject=text(item.subject,`${field}[${index}].subject`,itemErrors,{max:120});
    const topic=text(item.topic,`${field}[${index}].topic`,itemErrors,{max:160});
    const scope=enumeration(item.scope??defaultScope,`${field}[${index}].scope`,scopes,itemErrors,"PRIVATE") as ContentScope;
    const spatialMode=version===3?enumeration(item.spatialMode,`${field}[${index}].spatialMode`,spatialThinkingModes,itemErrors,"location") as SpatialThinkingMode:null;
    const stimulusType=version===2?enumeration(item.stimulusType,`${field}[${index}].stimulusType`,stimulusTypes,itemErrors,"text") as StimulusType:null;
    if(itemErrors.length){errors.push(...itemErrors);return;}
    keys.add(key);definitions.push({key,title,description,subject,topic,scope,spatialMode,stimulusType});
  });
  if(errors.length)throw new Error(`Definisi kelompok tidak valid: ${errors.join(" ")}`);
  return definitions;
}

export function parseQuestionBatchDocument(value:unknown,actor:TeacherSession):{items:ParsedItem[];groups:GroupDefinition[];errors:BatchImportError[];total:number;version:number}{
  const root=object(value);
  if(!root)throw new Error("Dokumen impor harus berupa objek JSON.");
  const version=root.version;
  if(version!==1&&version!==2&&version!==3)throw new Error("version harus bernilai 1, 2, atau 3.");
  if(!Array.isArray(root.questions))throw new Error("questions harus berupa array.");
  if(root.questions.length<1||root.questions.length>MAX_ITEMS)throw new Error(`questions harus berisi 1–${MAX_ITEMS} soal.`);
  const defaultScope=root.scope===undefined?"PRIVATE":root.scope;
  const groups=parseGroups(root,version,defaultScope);
  const groupByKey=new Map(groups.map(group=>[group.key,group]));
  const items:ParsedItem[]=[];const failures:BatchImportError[]=[];
  root.questions.forEach((raw,index)=>{
    const errors:string[]=[];const item=object(raw);
    if(!item){failures.push({index,title:`Soal ${index+1}`,errors:["Item harus berupa objek."]});return;}
    const title=text(item.title,"title",errors,{required:true,max:220});
    const scope=enumeration(item.scope??defaultScope,"scope",scopes,errors,"PRIVATE") as ContentScope;
    const spatialMode=enumeration(item.spatialMode,"spatialMode",spatialThinkingModes,errors,"location") as SpatialThinkingMode;
    const stimulusType=enumeration(item.stimulusType??"text","stimulusType",stimulusTypes,errors,"text") as StimulusType;
    const groupKey=version>=2?text(item.groupKey,"groupKey",errors,{max:80}):"";
    if(groupKey){
      const group=groupByKey.get(groupKey);
      if(!group)errors.push(`groupKey tidak ditemukan: ${groupKey}.`);
      else{
        if(group.scope!==scope)errors.push("scope soal harus sama dengan scope kelompok.");
        if(version===2&&group.stimulusType!==stimulusType)errors.push("stimulusType soal harus sama dengan Stimulus Set.");
        if(version===3&&group.spatialMode!==spatialMode)errors.push("spatialMode soal harus sama dengan kelompok Spatial Thinking.");
      }
    }
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
    items.push({index,groupKey,input:{actor,title,scope,subject,topic,spatialMode,difficulty,prompt,stimulusType,answers,correctAnswer,
      feedbackCorrect,feedbackIncorrect,activityConfig:{mapExperience,tools,toolParameters:toolParameters??{},requiredActions:[]}}});
  });
  return {items,groups,errors:failures,total:root.questions.length,version};
}

export async function importQuestionBatch(actor:TeacherSession,document:unknown):Promise<BatchImportResult>{
  const parsed=parseQuestionBatchDocument(document,actor);const questionIds:string[]=[];const groupIds:string[]=[];const errors=[...parsed.errors];
  const groupIdByKey=new Map<string,string>();const failedGroupKeys=new Set<string>();
  for(const group of parsed.groups){
    try{
      const id=await createQuestionGroup({actor,title:group.title,description:group.description,subject:group.subject,topic:group.topic,spatialMode:group.spatialMode??undefined,stimulusType:group.stimulusType??undefined,scope:group.scope});
      groupIds.push(id);groupIdByKey.set(group.key,id);
    }catch{failedGroupKeys.add(group.key);}
  }
  for(const item of parsed.items){
    if(item.groupKey&&failedGroupKeys.has(item.groupKey)){
      errors.push({index:item.index,title:item.input.title,errors:[`Kelompok '${item.groupKey}' gagal dibuat sehingga draft tidak dibuat.`]});continue;
    }
    try{
      const questionId=await createQuestionDraft(item.input);
      if(item.groupKey){
        const groupId=groupIdByKey.get(item.groupKey);
        if(!groupId)throw new Error("Kelompok tidak tersedia setelah dibuat.");
        await attachQuestionToGroup({actor,questionId,groupId,questionScope:item.input.scope as ContentScope,spatialMode:item.input.spatialMode,stimulusType:item.input.stimulusType});
      }
      questionIds.push(questionId);
    }catch(error){errors.push({index:item.index,title:item.input.title,errors:[error instanceof AuthorizationError?"Akun tidak memiliki izin untuk scope soal ini.":"Draft gagal dibuat atau dikelompokkan karena kesalahan penyimpanan."]});}
  }
  errors.sort((a,b)=>a.index-b.index);
  return {total:parsed.total,created:questionIds.length,failed:errors.length,groupsCreated:groupIds.length,questionIds,groupIds,errors};
}
